# EarthTune Studio — Architectural & Design Specification

## 1. Spatial & Visual Direction
- **Night Observatory Palette:** Midnight-slate architectural walls (`#141e2b`), dark charcoal desks (`#151c24`), warm-amber downlighting (`#ffd27d`) over the left workstation table, and cyan hologram illumination (`#4df3ff`) over the right globe table.
- **Two Hero Instruments & Tactile Desk Hardware:**
  1. **Left Workstation (`1 · Scan & Compare`):** Houses the 16:9 interactive Monitor Workbench (`960×540` CSS3D surface) directly on `Screen_Observatory_Monitor`, flanked on the tabletop by a tactile 3D 65% Mechanical Keyboard (`Desk_Mechanical_Keyboard`) and a Frosted-Amber `? · TEAM` Macro Keycap (`Desk_Team_Keycap`) that opens the **EarthTune Studio Team** modal (`#team-modal`).
  2. **Right Hologram Emitter (`2 · 3D Earth Globe`):** Projects the 3-layer interactive 3D Earth Globe (`earth-blue-marble.jpg` + `1980–2024` NASA anomaly textures + `world-borders-clean.svg`) with 2-axis pointer drag and synchronized 3D latitude band scan rings.

## 2. Camera & Accessibility Architecture
- **Three Explicit Focus States:** `Studio Overview` (`overview`), `1 · Scan & Compare (Monitor)` (`desk`), and `2 · 3D Earth Globe` (`globe`), with `Escape` and click-outside-to-return support.
- **Keyboard & Screen-Reader Entry:** Top-level `.skip-link` (`#skip-to-workbench`) moves focus directly into the Monitor Workbench, which implements full roving `tabindex` and arrow-key navigation across both section tabs and listening mode tabs.
- **Responsive Mobile Route (`≤ 760px`):** Docks the Monitor Workbench into `#mobile-workbench-dock` below a `205px` 3D Hologram Globe banner so all controls and all 5 latitude bands remain 100% unclipped on `390×844` screens.
