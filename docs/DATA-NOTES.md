# Temperature and rainfall data

The 1980–2025 global temperature chart and jukebox use the annual January–December (`J-D`) column in NASA GISS GISTEMP v4’s [GLB.Ts+dSST.csv](https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.csv), downloaded November 14, 2026. The bundled CSV includes 1880–2025. Anomalies are in °C relative to the 1951–1980 average. The 2024 and 2025 values are +1.28 °C and +1.19 °C.

The 1980–2024 maps are running-mean visuals from [NASA’s Scientific Visualization Studio](https://svs.gsfc.nasa.gov/5450/). The 2025 map and observatory grid use the 2° × 2° [NASA GISS land–ocean temperature grid](https://data.giss.nasa.gov/pub/gistemp/gistemp1200_GHCNv4_ERSSTv5.nc.gz), created November 10, 2026. Each cell is the mean of available 2025 monthly anomalies, with at least seven valid months required. The equirectangular map uses the workbench’s existing temperature palette and clips it at ±2 °C. The numeric grid retains the full anomaly range.

Selected-area values use area-weighted grid cells. Historical regional grids have inherited provenance and aggregation. Running-mean maps and annual grid means describe different time windows, which can affect regional comparisons. The rainfall archive ends in 2024.

Rainfall is converted to a designed noise/drop texture. Relative normalization can make small year-to-year differences sound subtle; a listening study and calibrated scale are still needed. Do not describe synthesized storms as actual observed local weather or as an audio recording.

Rectangular geographic selection is implemented. Clicking a country polygon to retrieve a national report is not implemented. No future climate scenario is calculated. NASA branding does not imply NASA endorsement, and a scripted guide must remain labeled.
