# v0.1 data boundary

The UI overhaul preserves the inherited data engine. It is not a new scientific validation of those datasets.

Release inspection found identical SHA-256 hashes for the 2024, 2025 and 2026 temperature map files, and likewise for the rainfall map files. Decoding each regional binary grid also found that the 2025 and 2026 slices equal 2024 for both tracks. The playable `years` array is therefore limited to 1980–2024. Original bundled source files are preserved, including a global-temperature 2026 value marked preliminary in the inherited manifest. That value does not make the duplicated regional fields valid 2026 observations.

The global GISTEMP snapshot and frame metadata are in `data/manifest.json`. Temperature map frames originate from NASA SVS 5450, a visualization of regional running means. The observatory calculates selected-area series from bundled regional grids. Those series require their own provenance and aggregation audit; they should not automatically be described as the original GISTEMP global annual table.

Rainfall is converted to a designed noise/drop texture. Relative normalization can make small year-to-year differences sound subtle; a listening study and calibrated scale are still needed. Do not describe synthesized storms as actual observed local weather or as an audio recording.

Rectangular geographic selection is implemented. Clicking a country polygon to retrieve a national report is not implemented. No future climate scenario is calculated. NASA branding does not imply NASA endorsement, and a scripted guide must remain labeled.
