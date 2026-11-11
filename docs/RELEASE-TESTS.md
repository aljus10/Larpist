# v0.1 release checks

Performed locally on Windows, 8 November 2026, in the connected Chromium-based in-app browser.

## Browser checks

- Rendered the original 3D room and its live HTML surfaces.
- Inspected desktop 1440×900, short desktop 1280×720 and phone 390×844 layouts. Checked document width against viewport width at the short desktop and phone sizes; no horizontal document overflow.
- Selected Rainfall on the physical jukebox; the monitor switched its value, map legend and rain parameters. Play advanced the timeline; Pause stopped it. Mute updated both the sound state and control label.
- Verified that changing tracks did not change the permanent information-frame text. Inspected the frame focus on a short desktop screen; the print fit within its physical frame.
- Completed the embedded prediction, listen/compare and explanation steps. The 1980/2024 values and feedback were displayed.
- Selected Flat Map and used the year slider's End key to reach 2024. Resized from phone to desktop; selected projection and year survived without reloading the iframe.
- Applied a named rectangular region (5–21° N, 116–127° E); the region badge and calculated value changed.
- Opened the sources/methods dialog in the extracted package. Escape dismissed the dialog; a second Escape returned to the studio.
- Rechecked track selection, focus, phone projection/year controls after changing live-surface projection to use the same camera as the WebGL objects. Isolated scene and HTML layers to prevent compositing artifacts.

## Source checks

- Parsed the studio module, local server and inline observatory JavaScript without executing the page code.
- Confirmed repeated 2024/2025/2026 image hashes and regional grid slices. Restricted playback to 45 years ending in 2024 and updated source/range labels.
- Confirmed that the learning sync targets `observatory.html`, leaving the studio entry intact.
- Built an explicit-allowlist ZIP, checked its CRCs and all manifest hashes, extracted it and served the extracted directory. Every packaged file returned HTTP 200 with the expected content length. The packaged browser check logged no new console errors.

This is local integration and visual verification, not a scientific validation, accessibility certification or cross-device performance study. Subjective rain quality, voice quality, unsupported GPU fallback and other browser/device combinations need further testing.
