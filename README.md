# EarthTune Studio

**Hear geographic patterns that a global average can hide.**

**EarthTune Studio** is an interactive 3D Night Observatory and NASA Earth Information Center (EIC) sonification workbench built for the **NASA Space Apps Challenge — The Earth Information Jukebox**. It translates 46 years of NASA surface temperature anomalies (`1980–2025`) into deterministic, inspectable sound and synchronized 3D holographic visuals.

---

## Quick Start (Local Development)

### Option 1 — One-Click Windows Launcher
1. Clone or extract this repository.
2. Double-click **`START-WINDOWS.cmd`** (requires [Node.js](https://nodejs.org/) installed on `PATH`).
3. Your browser will open **`http://127.0.0.1:8765/`** automatically.

### Option 2 — Terminal (Windows / macOS / Linux)
```bash
node tools/server.mjs 8765
```
Then open **`http://127.0.0.1:8765/`** in your browser.
*(Do not open `index.html` via `file://` — ES modules and WebGL textures require a local HTTP server. No `npm install` or external dependencies are needed.)*

---

## Core Experience (`Learn → Scan → Compare → Explain`)

1. **Interactive 3D Night Observatory (`index.html` & `js/studio.js`)**
   - **Left Workstation Desk:** Houses the live 16:9 **EarthTune Studio Monitor Workbench** bathed in warm-amber architectural downlighting.
   - **Right Hologram Desk:** Projects a 3-layer **3D Hologram Earth Globe** (NASA Blue Marble base + dynamic 1980–2025 temperature anomaly heatmaps + crisp vector political country borders) with full 2-axis drag inspection (horizontal spin + polar tilt) and synchronized 3D latitude scan rings.
   - **Welcome Guide Narration:** Cartesia Skylar greeting with automatic playback when the browser allows it and synchronized subtitles.

2. **Monitor Workbench (`monitor-workbench/`)**
   - **`1 · History` (1980–2025):** Scrub or play annual global temperature anomalies in °C relative to 1951–1980, including `+1.28 °C` in 2024 and `+1.19 °C` in 2025 mapped to pitch (`150–850 Hz`), synchronized live with the 3D Hologram Globe.
   - **`2 · Frame Scan` (5 Latitude Bands):** Samples map pixels across five geographic bands (`Arctic 60°–90°N`, `N. Mid 30°–60°N`, `Tropics 30°S–30°N`, `S. Mid 30°–60°S`, `Antarctic 60°–90°S`) into **Cooler (`196–204 Hz`)**, **Baseline (`330 Hz`)**, and **Warmer (`540–660 Hz`)** category coverage.
   - **`3 · Quiz & Proof`:** Compare two map frames in each of ten questions, switch latitude bands and listen, then check the warm- or cool-colored pixel shares behind the answer. Review the evidence and replay the comparisons after seeing your score.
   - **`2 · Compare A/B` & `3 · Method & Sources`:** Side-by-side acoustic and numerical comparison for any two years and latitude bands, plus full provenance and a copyable Live Frame Ledger.

3. **Responsive Mobile Route (`≤ 760px`)**
   - On mobile viewports (e.g., `390×844`), the 3D Hologram Earth Globe renders in the top studio banner while the full Monitor Workbench docks into an unclipped, touch-friendly 2D layout directly below it.

---

## Meet the Team (NASA Space Apps Challenge)

**EarthTune Studio** was created by a dedicated team of six:

1. **Al Justin** — *3D & Web Development* (3D studio scene, spatial layout, and interactive web interface)
2. **Harvey** — *Audio & Sonification* (Audio synthesizer and latitude temperature pitch mapping)
3. **Micah** — *Frontend & UI* (Monitor workbench layout, responsive controls, and interface accessibility)
4. **Roger** — *Testing & Coordination* (Application testing, design feedback, and team project support)
5. **Kenneth** — *Earth Data & Research* (NASA temperature data review, latitude bands, and reference notes)
6. **Eddie** — *QA & Content* (Interactive listening questions, explanations, and quality assurance)

*Explore the team roster directly in the 3D studio by clicking the desk keycap or via the workbench interface.*

---

## Scientific Scope & Limitations

- **Playable Archive:** `1980–2025` for temperature, with annual GISTEMP v4 values relative to the `1951–1980` baseline.
- **Designed Sonification:** Pixel color classification communicates visual category share (`Cooler`, `Baseline`, `Warmer`) within each latitude band rather than raw physical sensor inversion.

---

## Project Structure

- `index.html`, `css/studio.css`, `js/studio.js` — 3D Night Observatory room, camera controller, 3-layer Hologram Earth Globe, and responsive mobile dock.
- `monitor-workbench/index.html`, `styles.css`, `app.js` — Embedded NASA EIC sonification workbench, pixel analyzer, Web Audio synthesizer, A/B comparator, and Quiz & Proof receipt.
- `assets/models/studio_room.glb` — Custom-authored 3D studio architectural model.
- `assets/eic/1980.webp` … `2024.webp` — NASA SVS #5450 temperature maps. The 2025 map is rendered from the NASA GISS annualized regional grid.
- `assets/world-borders-clean.svg` — High-contrast equirectangular political country borders and coastlines overlay.
- `tools/server.mjs` — Zero-dependency Node.js static HTTP server.

---

## Credits & Data Provenance

- **Temperature Anomaly Visualizations:** [NASA Scientific Visualization Studio (SVS #5450)](https://svs.gsfc.nasa.gov/5450/) — data provided by Robert B. Schmunk, NASA/GSFC GISS.
- **Global Surface Temperature Dataset:** [NASA GISS Surface Temperature Analysis (GISTEMP v4)](https://data.giss.nasa.gov/gistemp/).
- **Base Earth Imagery:** NASA Visible Earth (*Blue Marble Next Generation*).
- **Open-Source Libraries & Fonts:** Three.js `0.160.0` (MIT), TopoJSON Client (ISC), DM Sans & Instrument Serif (SIL Open Font License).
