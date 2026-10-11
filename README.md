# ORBIT — World Time Observatory

A responsive, browser-based world clock experience with an interactive 3D globe, country selection, city and timezone search, a persistent city collection, a precision countdown timer, a monotonic stopwatch with lap analysis, and foreground-mode alarms.

## Run it locally

The app is a static web application. Because the globe, geography, fonts, and photo search use remote resources, serve the folder over HTTP instead of opening `index.html` directly as a `file://` URL.

```bash
cd world-observatory
python3 -m http.server 8000
```

Then open <http://localhost:8000> in a current browser. Internet access is required for the full globe renderer, map data, web fonts, timezone directory refresh, and Wikimedia photo lookup. If optional sources fail, the timer, stopwatch, local browser timezone support, saved UI preferences, and other independent screens remain usable where the browser supports them.

## What is implemented

- **World globe:** Three-dimensional Earth visualization with Natural Earth country polygons, pointer-based polygon selection, country highlighting, search-to-focus, zoom/reset controls, the calculated subsolar point, and an approximate solar terminator.
- **Time zones:** City clocks use IANA timezone identifiers through the browser's `Intl` implementation, not fixed UTC-offset arithmetic. The app loads `zone1970.tab` (then `zone.tab` as fallback) to expand representative timezone locations and country timezone options. City/country names and timezone rules remain separate concepts.
- **Destination visuals:** The app looks for a matching city/cityscape photograph through Wikimedia Commons, displays its source and a contributor credit when a match loads, and falls back to an explicitly labeled illustration when it cannot validate a result.
- **City collection:** Save/remove supported cities and timezone reference points, compare local time and date, and export preferences, favorites, and alarm data as JSON.
- **Timer:** Countdown from a target timestamp, pause/resume/reset, presets, editable duration, radial progress, and one completion event per run.
- **Stopwatch:** Uses `performance.now()` for elapsed timing, stores lap splits and totals, identifies faster/slower laps, and exports a CSV.
- **Alarms:** Create/edit/delete/enable, repeating weekdays, labels, sound options, snooze/dismiss, and browser notifications when permitted.
- **Preferences:** 12/24-hour clock, seconds, reduced motion, alert sound, and local data export/reset.

## Data and platform notes

- Country boundaries use Natural Earth 1:50m country data where that source is reachable, with a lower-resolution fallback. Natural Earth documents its country data as a de-facto boundary depiction and lists 258 map units at 1:50m; country and territorial boundary definitions can be disputed. See <https://www.naturalearthdata.com/downloads/50m-cultural-vectors/> and <https://github.com/nvkelso/natural-earth-vector>.
- Timezone reference points are sourced from the IANA tz database tables in <https://github.com/eggert/tz>. These are **representative geographic points, not timezone-boundary polygons**. The UI does not pretend that country borders are timezone borders. Actual displayed times use the browser's installed timezone database, which can lag the latest political changes until the browser/runtime updates.
- The city catalog includes a curated set of capitals/major cities plus timezone reference points. It is not a global geocoder and does not claim to include a verified skyline photograph for every country or city.
- Wikimedia Commons photo discovery is network-dependent and not every search yields a validated, location-specific image. When no defensible title match loads, the UI says the visual is illustrative instead of silently assigning an unrelated photograph. Open each image's source link for file/license details.
- Browser alarms are **foreground-only best effort**. They cannot guarantee native alarm reliability after the browser is closed, the page is suspended, or the operating system restricts background activity. Browser notifications require permission and vary by platform.
- Sunrise/sunset and solar-subpoint visuals use astronomical calculations approximations, not a live weather feed. No live weather is claimed.

## Automated logic tests

Run the pure timing/geographic-directory helper tests with Node.js:

```bash
node --check app.js
node --test tests/core.test.cjs
```

The tests cover half-/quarter-hour timezone offsets, date-specific daylight-saving transitions, local date rendering, countdown target-time math, timer formatting, stopwatch lap splits, solar position bounds, and timezone table parsing.

## Verification status

JavaScript syntax checks and the automated helper tests were run. The available browser test runner rejected local HTTP and `file://` navigation with an environment-level `ERR_BLOCKED_BY_ADMINISTRATOR`, so I could not perform a truthful end-to-end screenshot/interaction review in that runner. Open the app locally using the instructions above to review live WebGL rendering and remote asset availability on your target device.
