# Earthtone Studio · v0.1.0

An original 3D listening room, a three-button jukebox, a connected Earth monitor and a permanent information frame. Local prototype released 8 November 2026. This package does not publish anything online.

## Start on Windows

1. Extract the entire ZIP. Keep the folders together.
2. Double-click `START-WINDOWS.cmd`. Node.js must be installed and available on PATH.
3. The launcher opens `http://127.0.0.1:8765/`. Keep its terminal open while using the studio. Close it to stop the server.

Do not double-click `index.html`: 3D module files require a local HTTP server. No npm install, account, API key or paid service is required. Images, fonts, code and data are bundled. External source links and optional browser speech services may require internet access.

If port 8765 is occupied, close the previous server or run `node tools/server.mjs 8766` in this folder and open `http://127.0.0.1:8766/` manually. Any static HTTP server can serve this directory.

## Use the studio

- **Jukebox:** choose Temperature or Rainfall, then Play track. The knob button mutes sound. Track 03 is unavailable pending a supported dataset.
- **Earth monitor:** select it to focus. Listen shows the map and sound timeline. Explore also opens guide, evidence and source panels. Choose **Try a listening lesson** for the predict/listen/explain activity.
- **Globe / Flat Map:** drag the globe, scrub years or enter geographic bounds. Regions use rectangular bounds, not country-boundary selection.
- **Information frame:** select it to read the same permanent print. Its content does not change with the data track.
- **Back to studio** or **Escape:** return to the overview. The footer provides keyboard-accessible object controls. **Motion off** disables camera parallax and transitions; the OS reduced-motion preference is honored by default.
- **Open explorer / Full view:** opens the full observatory. On narrow screens the monitor moves below the 3D overview for readable touch controls.

Sound starts after a user action. Browser sound settings can still block it. Speech synthesis and microphone support vary by browser; neither is required for the data tracks.

## Scope and data limits

The playable archive is **1980–2024**. Inherited 2025–2026 maps and regional grids repeat 2024, so v0.1 excludes those years from playback. Original data files remain in the source snapshot for inspection; they do not extend the playable record.

Temperature values map to pitch; rainfall values shape synthesized rain. This is designed sonification, not recorded planetary audio. NASA temperature visuals use a regional running mean; a map pixel is not the same summary as an annual global value. Regional provenance, aggregation and rain acoustics need a full scientific audit before a competition submission. See `docs/DATA-NOTES.md`.

Dr. Jo is a fictional, scripted guide inspired by Joanne Simpson's work, not the scientist herself. No live LLM, forecast model, solar track, country report, premium female narration or future-temperature projection is connected. The system speech voice depends on the device.

This is an independent prototype, not an official NASA product or an assertion of hackathon eligibility. Preserve the release date and disclose pre-event work when checking competition rules.

## Source files

- `index.html`, `js/studio.js`, `css/studio.css`: entry and original procedural 3D scene.
- `observatory.html`, `css/observatory.css`: full data/audio/learning experience.
- `css/studio-embed.css`: monitor presentation of the same observatory.
- `js/learning-layout.js`: learning controller. In the development checkout, `python tools/build-site.py` synchronizes it into `observatory.html`; it does not overwrite the studio entry.
- `data/manifest.json`: inherited numerical/frame source metadata.
- `tools/server.mjs`: dependency-free local static server.

The ZIP is a runnable source distribution. Packaging tools and reference-analysis notes remain in the development checkout. Captured Shopify code/assets are never distributed or executed.

## Credits

- Temperature visuals: [NASA SVS, Global Temperature Anomalies](https://svs.gsfc.nasa.gov/5450/). NASA's Scientific Visualization Studio; data provided by Robert B. Schmunk, NASA/GSFC GISS.
- Global-temperature snapshot: [NASA GISS GISTEMP v4](https://data.giss.nasa.gov/gistemp/). See the bundled manifest for retrieval date and frame indices.
- Earth texture: bundled NASA Blue Marble map from the existing project.
- Three.js **0.160.0**: MIT. `vendor/THREE-LICENSE.txt`.
- Lucide **0.468.0**: ISC. `vendor/LUCIDE-LICENSE.txt`.
- DM Sans and Instrument Serif: Open Font License. Licenses in `assets/fonts/`.
- TopoJSON client: ISC. `vendor/TOPOJSON-LICENSE.txt`.

Studio geometry and interaction code are original Earthtone Studio work. Shopify's BFCM experience informed the interaction direction only.
