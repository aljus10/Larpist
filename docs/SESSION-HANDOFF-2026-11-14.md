# EarthTune Studio session handoff

November 14, 2026 · `mics-dev` · Base commit `53fbeaa`

## Temperature archive through 2025

- History, the observatory chart and timeline, and the jukebox use 46 annual NASA GISS GISTEMP v4 observations from 1980 through 2025. The `J-D` values are in °C relative to the 1951–1980 average. The anomaly is +1.28 °C in 2024 and +1.19 °C in 2025. The existing pitch mapping plays 2025 slightly lower than 2024 and displays 451 Hz for 2025. [Bundled CSV](../data/GLB.Ts+dSST.csv)
- The 2025 regional map and selected-area grid use January–December means from the NASA GISS 2° × 2° land–ocean grid. Each cell requires at least seven valid months. The map palette clips at ±2 °C and the numeric grid retains the full anomaly range. Historical maps use NASA SVS #5450 running means, so comparisons involving 2025 span different aggregation windows. [Data notes](DATA-NOTES.md)
- Frame Scan, regional Compare A/B, and the studio globe can use the 2025 map. The initial History-only implementation guarded the duplicate placeholder. The final implementation replaces that placeholder with the GISS-derived asset and keeps availability handling for unsupported years. Rainfall playback ends in 2024 and the manifest marks the duplicate 2026 temperature frame non-playable.
- NASA GISS GISTEMP v4 and NASA’s Scientific Visualization Studio are credited in the interface and supporting documentation. Observatory labels and controls follow the selected track’s available years.

## Workbench improvements

- **Method & Sources.** Moved the NASA CSV and SVS Archive links directly below their card headings and made the embedded panel scrollable so the source text and Live Frame Ledger remain reachable.
- **Flat Map.** Preserved the button label and allowed the toolbar to wrap at narrow widths.
- **Quiz & Proof.** The initial free-form A/B exercise evolved into ten questions with preset year pairs and latitude bands. Use **Compare A/B** for custom year-pair comparisons. Quiz maps highlight the active band, share a legend, and support Play A, Play B, and Play A → B. The active map is highlighted during playback.
- The first quiz answer counts toward the score. Immediate proof shows the correct answer, the measured warm- or cool-colored shares of valid pixels, and percentage-point differences or changes. Grading uses the same one-decimal precision as the displayed shares. Questions 9 and 10 include evidence for two bands. Results support review, replay and retake. Missing or invalid frames trigger nearby-year recovery when possible, and the results list unavailable questions.
- **Header.** Replaced the striped mark with a transparent crop of the supplied cyan globe, headphones, and waveform icon. The workbench uses a 36 px desktop mark and 30 px mobile mark with preserved proportions and empty alt text beside the visible title. The brand link returns to the workbench. [Icon](../assets/earthtune-icon.png)

## Files changed

| Area | Files |
| --- | --- |
| Data and assets | `data/GLB.Ts+dSST.csv`, `data/manifest.json`, `js/data.js`, `js/regional-data.js`, `assets/eic/2025.webp`, `assets/earthtune-icon.png` |
| Studio and observatory | `index.html`, `observatory.html`, `js/studio.js`, `js/core/JukeboxStore.js`, `js/components/DeskWorkbenchBridge.js` |
| Workbench | `monitor-workbench/app.js`, `monitor-workbench/index.html`, `monitor-workbench/styles.css` |
| Documentation | `README.md`, `DESIGN.md`, `docs/DATA-NOTES.md`, this handoff |

## Studio launch follow-up

- The main 3D studio now preloads the cyan globe icon and displays it in the header at 36 px on desktop and 30 px on mobile. The existing home link retains its accessible name.
- On a normal launch, the icon pops in over a navy backdrop with a cyan glow. “EarthTune Studio” and “NASA Space Apps Challenge” appear beneath it, then fade as the icon lands on the measured header position. The final setting is 0.5× speed, about 2.4 seconds. Reduced-motion preferences and direct desk or globe links use a 180 ms fade. Pointer or keyboard input, resizing, or an animation failure dismisses the intro and leaves the header usable.
- The follow-up changes `index.html` and `css/studio.css` and adds `js/studio-launch.js`. The six `jmo-skills` installed during the session are local Codex tools. EarthTune runs independently of them.
- Local Edge checks verified the completed desktop animation, keyboard interruption at mobile width, reduced motion, and a direct globe link. Each case restored the visible header icon.

## Run and verify

From the repository root, run `node tools/server.mjs 8765` or launch `START-WINDOWS.cmd`. Open `http://127.0.0.1:8765/` for the studio, `/monitor-workbench/` for standalone workbench testing, and `/observatory.html` for the observatory. The app serves static files directly and has no `package.json` or npm build step.

- Session checks compared all 46 annual values with the NASA CSV. Local Edge smoke tests covered historical playback, 2024/2025 switching, the 2025 map and regional audio, and the embedded jukebox.
- Workbench Edge checks covered source-link and ledger reachability at 960 × 540 and 390 × 844, Flat Map label fit from 280 to 960 px, and icon alignment and brand navigation on desktop and mobile.
- Quiz checks covered desktop and mobile layouts, correct, incorrect and tied answers, playback, score review and practice, and missing-frame recovery.
- Handoff verification reran `node --check` on the changed JavaScript files and local server, and `git diff --check`. The browser results above come from the implementation sessions.

## Open follow-ups

- The prerecorded welcome narration and matching captions still describe the original 1980–2024 release. Update both together if the greeting should describe the current archive.
- Manual listening on speakers or headphones and touch and 3D checks on a physical mobile device remain open. Verification was local. The production deployment was outside the session’s verification.
