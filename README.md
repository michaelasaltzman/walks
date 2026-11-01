# Walks

Code and data for the interactive map on [michaelsaltzman.com/walks](https://michaelsaltzman.com/walks).

- `data.js` — the map data: route lines, days, elevation, In Situ recordings, CDN¹ dispatches and photo pins. Generated from the "Walks — data" Google Sheet and the Gaia GPX tracks. Don't edit by hand; rebuild it.
- `app.js` — the map itself. It draws into `<div id="walks-app"></div>` and reads `window.WALKS_DATA`.
- `walks.css` — the map's styles. The live copy is in Pika's Custom CSS; this file is kept in step with it so the map can move to another platform.

Served by GitHub Pages at https://michaelasaltzman.github.io/walks/
