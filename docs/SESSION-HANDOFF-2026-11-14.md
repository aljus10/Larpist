# EarthTune Studio session handoff

November 14, 2026 · `mics-dev` · Base commit `53fbeaa`

## Temperature archive through 2025

- History, the observatory chart and timeline, and the jukebox use 46 annual NASA GISS GISTEMP v4 observations from 1980 through 2025. The `J-D` values are in °C relative to the 1951–1980 average. The anomaly is +1.28 °C in 2024 and +1.19 °C in 2025. The existing pitch mapping plays 2025 slightly lower than 2024 and displays 451 Hz for 2025. [Bundled CSV](../data/GLB.Ts+dSST.csv)
- The 2025 regional map and selected-area grid use January–December means from the NASA GISS 2° × 2° land–ocean grid. Each cell requires at least seven valid months. The map palette clips at ±2 °C and the numeric grid retains the full anomaly range. Historical maps use NASA SVS #5450 running means, so comparisons involving 2025 span different aggregation windows. [Data notes](DATA-NOTES.md)
- Frame Scan, regional Compare A/B, and the studio globe can use the 2025 map. The initial History-only implementation guarded the duplicate placeholder. The final implementation replaces that placeholder with the GISS-derived asset and keeps availability handling for unsupported years. Rainfall playback ends in 2024 and the manifest marks the duplicate 2026 temperature frame non-playable.
- NASA GISS GISTEMP v4 and NASA’s Scientific Visualization Studio are credited in the interface and supporting documentation. Observatory labels and controls follow the selected track’s available years.

## Workbench improvements

- **Method & Sources.** Moved the NASA links directly below their card headings and made the embedded panel scrollable. The panel now cites NASA Scientific Visualization Studio’s *Global Temperature Anomalies from 1880 to 2025* (SVS ID 5603). It distinguishes the visualization’s 1880–2025 span from EarthTune’s 1980–2025 range, credits NASA GISS GISTEMP v4 for numeric data, and preserves the provenance of the bundled maps. Methods explain the 1951–1980 baseline, annual anomalies mapped to pitch, and latitude-band color shares mapped to sound durations. [NASA SVS 5603](https://svs.gsfc.nasa.gov/5603/)
- **Flat Map.** Preserved the button label and allowed the toolbar to wrap at narrow widths.
- **Quiz & Proof.** The initial free-form A/B exercise evolved into ten questions with preset year pairs and latitude bands. Use **Compare A/B** for custom year-pair comparisons. Quiz maps highlight the active band, share a legend, and support Play A, Play B, and Play A → B. The active map is highlighted during playback.
- The first quiz answer counts toward the score. Immediate proof shows the correct answer, the measured warm- or cool-colored shares of valid pixels, and percentage-point differences or changes. Grading uses the same one-decimal precision as the displayed shares. Questions 9 and 10 include evidence for two bands. Results support review, replay and retake. Missing or invalid frames trigger nearby-year recovery when possible, and the results list unavailable questions.
- **Header.** Replaced the striped mark with a transparent crop of the supplied cyan globe, headphones, and waveform icon. The workbench uses a 36 px desktop mark and 30 px mobile mark with preserved proportions and empty alt text beside the visible title. The brand link returns to the workbench. [Icon](../assets/earthtune-icon.png)

## Team popup

The EarthTune Studio Team popup uses the following roster. Each card contains only its badge, role, and full name.

| Badge | Role | Name |
| --- | --- | --- |
| 01 | UI/UX Designer | Roger Santiago Aguilar |
| 02 | Pitch Lead | John Kenneth Enaje |
| 03 | Backend Developer | Al Justin Marollano |
| 04 | DevOps | Micah Ella Masilang |
| 05 | Frontend Developer | Harvey Mirabel |
| 06 | Project Manager | Eddie Mendoza |

The existing card styling, popup title, introduction, source footer, and navigation remain in place. The cards use two columns on desktop and one on mobile, with wrapping names. On short screens, the popup scrolls within the viewport to keep all six cards and **Back to Studio** reachable.

## Files changed

| Area | Files |
| --- | --- |
| Data and assets | `data/GLB.Ts+dSST.csv`, `data/manifest.json`, `js/data.js`, `js/regional-data.js`, `assets/eic/2025.webp`, `assets/earthtune-icon.png` |
| Studio and observatory | `index.html`, `css/studio.css`, `observatory.html`, `js/studio.js`, `js/studio-launch.js`, `js/core/JukeboxStore.js`, `js/components/DeskWorkbenchBridge.js` |
| Workbench | `monitor-workbench/app.js`, `monitor-workbench/index.html`, `monitor-workbench/styles.css` |
| Documentation | `README.md`, `DESIGN.md`, `docs/DATA-NOTES.md`, this handoff |

## Studio launch follow-up

- The main 3D studio preloads the cyan globe icon. The merged Larpist header scales it from 36–44 px on desktop and uses 30 px on mobile. The home link retains its accessible name.
- On a normal launch, the icon pops in over a navy backdrop with a cyan glow. “EarthTune Studio” and “NASA Space Apps Challenge” appear beneath it, then fade as the icon lands on the measured header position. The final setting is 0.5× speed, about 2.4 seconds.
- Local ZIP users reported that the intro sometimes failed to appear. The launch now allows up to 1.5 seconds for logo decoding and tolerates startup resizes until the logo begins moving toward the header. Pointer or keyboard input, a resize during that movement, or an animation failure dismisses the intro.
- Reduced-motion preferences and direct desk or globe links use a stationary EarthTune Studio splash. It holds for 360 ms and fades over 240 ms.
- The follow-up changes `index.html` and `css/studio.css` and adds `js/studio-launch.js`. The six `jmo-skills` installed during the session are local Codex tools. EarthTune runs independently of them.
- Local Edge checks verified the completed desktop animation, keyboard interruption at mobile width, reduced motion, and a direct globe link. Each case restored the visible header icon.
- Follow-up Edge checks simulated a 400 ms image decode and startup resize, and verified the reduced-motion splash timing. For local distribution, download a fresh ZIP from GitHub’s `main` branch, fully extract it, and run `START-WINDOWS.cmd` from the extracted folder.

## Run and verify

From the repository root, run `node tools/server.mjs 8765` or launch `START-WINDOWS.cmd`. Open `http://127.0.0.1:8765/` for the studio, `/monitor-workbench/` for standalone workbench testing, and `/observatory.html` for the observatory. The app serves static files directly and has no `package.json` or npm build step.

- Session checks compared all 46 annual values with the NASA CSV. Local Edge smoke tests covered historical playback, 2024/2025 switching, the 2025 map and regional audio, and the embedded jukebox.
- Workbench Edge checks covered source-link and ledger reachability at 960 × 540 and 390 × 844, Flat Map label fit from 280 to 960 px, and icon alignment and brand navigation on desktop and mobile.
- After the source update, both SVS links and the Live Frame Ledger remained reachable at 960 × 540 and 390 × 844. NASA SVS 5603 returned HTTP 200.
- Team popup checks in Edge verified all six names, roles, and badges, two columns at 960 × 650, and one column at 320 × 420. The mobile popup scrolled to the last card and **Back to Studio** closed the popup at both sizes.
- Quiz checks covered desktop and mobile layouts, correct, incorrect and tied answers, playback, score review and practice, and missing-frame recovery.
- Handoff verification reran `node --check` on the changed JavaScript files and local server, and `git diff --check`. The browser results above come from the implementation sessions.

## Open follow-ups

- Larpist’s newer Skylar greeting and synchronized captions explain how to open the monitor and turn on its temperature layer. The merge also retains Larpist’s Frame Year Navigator alongside the updated NASA data, quiz, sources, and team popup.
- Manual listening on speakers or headphones and touch and 3D checks on a physical mobile device remain open. Verification was local. The production deployment was outside the session’s verification.
