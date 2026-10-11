/* ORBIT timing core — pure helpers shared by the UI and automated tests. */
(function attachOrbitCore(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.OrbitCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createOrbitCore() {
  'use strict';

  function formatParts(timestamp, timeZone) {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date(timestamp)).reduce((out, part) => {
      out[part.type] = part.value;
      return out;
    }, {});
  }

  function formatClock(timestamp, timeZone, { seconds = true, format = '24' } = {}) {
    try {
      return new Intl.DateTimeFormat('en-US', {
        timeZone, hour: '2-digit', minute: '2-digit',
        ...(seconds ? { second: '2-digit' } : {}), hour12: format === '12'
      }).format(new Date(timestamp));
    } catch {
      return '—:—';
    }
  }

  function formatDate(timestamp, timeZone, { weekday = true } = {}) {
    try {
      return new Intl.DateTimeFormat('en-US', {
        timeZone, ...(weekday ? { weekday: 'long' } : {}),
        month: 'long', day: 'numeric', year: 'numeric'
      }).format(new Date(timestamp));
    } catch {
      return 'Timezone unavailable';
    }
  }

  function offsetMinutes(timestamp, timeZone) {
    const p = formatParts(timestamp, timeZone);
    const utcAsLocal = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
    return Math.round((utcAsLocal - timestamp) / 60000);
  }

  function offsetLabel(timestamp, timeZone) {
    try {
      const value = offsetMinutes(timestamp, timeZone);
      if (value === 0) return 'UTC +00:00';
      const sign = value < 0 ? '-' : '+';
      const magnitude = Math.abs(value);
      return `UTC ${sign}${String(Math.floor(magnitude / 60)).padStart(2, '0')}:${String(magnitude % 60).padStart(2, '0')}`;
    } catch {
      return 'UTC unknown';
    }
  }

  function getLocalHour(timestamp, timeZone) {
    const parts = formatParts(timestamp, timeZone);
    return Number(parts.hour) + Number(parts.minute) / 60;
  }

  function isValidTimezone(timeZone) {
    try { new Intl.DateTimeFormat('en', { timeZone }); return true; }
    catch { return false; }
  }

  function durationParts(milliseconds) {
    const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
    return {
      h: Math.floor(seconds / 3600),
      m: Math.floor((seconds % 3600) / 60),
      s: seconds % 60,
      secs: seconds
    };
  }

  function formatDuration(milliseconds, { centis = false, forceHours = false } = {}) {
    milliseconds = Math.max(0, milliseconds);
    if (centis) {
      const total = Math.floor(milliseconds / 10);
      const cs = total % 100;
      const seconds = Math.floor(total / 100);
      const s = seconds % 60;
      const m = Math.floor(seconds / 60) % 60;
      const h = Math.floor(seconds / 3600);
      return h > 0
        ? `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`
        : `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
    }
    const p = durationParts(milliseconds);
    return p.h > 0 || forceHours
      ? `${String(p.h).padStart(2, '0')}:${String(p.m).padStart(2, '0')}:${String(p.s).padStart(2, '0')}`
      : `${String(p.m).padStart(2, '0')}:${String(p.s).padStart(2, '0')}`;
  }

  function remainingUntil(targetTimestamp, nowTimestamp = Date.now()) {
    return Math.max(0, targetTimestamp - nowTimestamp);
  }

  function calculateLap(totalElapsed, previousTotal, previousLapSplit = null) {
    const split = Math.max(0, totalElapsed - previousTotal);
    return {
      split,
      total: Math.max(0, totalElapsed),
      delta: previousLapSplit === null ? null : split - previousLapSplit
    };
  }

  function parseZoneTab(text) {
    const records = [];
    const parseCoordinate = (value) => {
      const m = /^([+-])(\d{2})(\d{2})(\d{2})?([+-])(\d{3})(\d{2})(\d{2})?$/.exec(value.trim());
      if (!m) return null;
      const lat = (m[1] === '-' ? -1 : 1) * (Number(m[2]) + Number(m[3]) / 60 + Number(m[4] || 0) / 3600);
      const lng = (m[5] === '-' ? -1 : 1) * (Number(m[6]) + Number(m[7]) / 60 + Number(m[8] || 0) / 3600);
      return { lat, lng };
    };
    for (const line of String(text || '').split(/\r?\n/)) {
      if (!line.trim() || line.startsWith('#')) continue;
      const [codes, coordinateText, timeZone, comment = ''] = line.split('\t');
      if (!codes || !coordinateText || !timeZone) continue;
      const coords = parseCoordinate(coordinateText);
      if (!coords || !/^[A-Za-z_+-]+(?:\/[A-Za-z0-9_+.-]+)*$/.test(timeZone)) continue;
      for (const cc of codes.split(',')) {
        records.push({ cc, ...coords, tz: timeZone, comment: comment.trim() });
      }
    }
    return records;
  }

  function solarPosition(timestamp = Date.now()) {
    const d = new Date(timestamp);
    const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
    const thisDay = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    const dayOfYear = Math.floor((thisDay - yearStart) / 86400000) + 1;
    const yearLength = (Date.UTC(d.getUTCFullYear() + 1, 0, 1) - yearStart) / 86400000;
    const utcHour = d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600;
    const gamma = 2 * Math.PI / yearLength * (dayOfYear - 1 + (utcHour - 12) / 24);
    const declination = .006918 - .399912 * Math.cos(gamma) + .070257 * Math.sin(gamma)
      - .006758 * Math.cos(2 * gamma) + .000907 * Math.sin(2 * gamma)
      - .002697 * Math.cos(3 * gamma) + .00148 * Math.sin(3 * gamma);
    const equationOfTime = 229.18 * (.000075 + .001868 * Math.cos(gamma) - .032077 * Math.sin(gamma)
      - .014615 * Math.cos(2 * gamma) - .040849 * Math.sin(2 * gamma));
    const utcMinutes = d.getUTCHours() * 60 + d.getUTCMinutes() + d.getUTCSeconds() / 60;
    let longitude = (720 - utcMinutes - equationOfTime) / 4;
    longitude = ((longitude + 180) % 360 + 360) % 360 - 180;
    return { lat: declination * 180 / Math.PI, lng: longitude };
  }

  return Object.freeze({ formatParts, formatClock, formatDate, offsetMinutes, offsetLabel, getLocalHour,
    isValidTimezone, durationParts, formatDuration, remainingUntil, calculateLap, solarPosition, parseZoneTab });
});
