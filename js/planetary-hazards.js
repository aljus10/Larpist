/**
 * Earth Resonance: Planetary Hazards & Extreme Events Catalog (1980–2026)
 * Sources:
 * - Volcanoes: Smithsonian Institution Global Volcanism Program (GVP) & NASA GISS
 * - Megafires: NASA FIRMS (Fire Information for Resource Management System) / MODIS / VIIRS
 * - Tropical Cyclones: NOAA/NASA IBTrACS (International Best Track Archive for Climate Stewardship)
 * - Fireballs & Bolides: NASA CNEOS (Center for Near Earth Object Studies)
 */
window.PLANETARY_HAZARDS = [
  // 1980
  {
    id: "helens-1980",
    year: 1980,
    type: "volcano",
    name: "Mount St. Helens Cataclysm",
    location: "Washington, USA",
    lat: 46.20,
    lon: -122.19,
    metrics: "VEI 5 · 520M tons ash · 24 km plume",
    headline: "Massive lateral blast removed 400 m of the peak, triggering global seismic alarms.",
    description: "On May 18, 1980, a 5.1 magnitude earthquake triggered the largest terrestrial landslide in recorded history, unleashing a lateral blast that flattened 600 sq km of forest. NASA high-altitude aircraft and early satellite radiometers tracked the ash cloud circling Earth in 15 days.",
    audioPreset: "volcano"
  },
  // 1982
  {
    id: "chichon-1982",
    year: 1982,
    type: "volcano",
    name: "El Chichón Eruption",
    location: "Chiapas, Mexico",
    lat: 17.36,
    lon: -93.23,
    metrics: "VEI 5 · 7 Mt SO₂ · 29 km plume",
    headline: "High-sulfur stratospheric injection caused global aerosol cooling.",
    description: "El Chichón unexpectedly erupted with exceptionally high sulfur dioxide emissions, creating a persistent stratospheric aerosol veil. NASA Nimbus-7 satellite TOMS instruments made pioneering global measurements of the spreading aerosol cloud, which cooled the Northern Hemisphere by ~0.2 °C.",
    audioPreset: "volcano"
  },
  // 1991
  {
    id: "pinatubo-1991",
    year: 1991,
    type: "volcano",
    name: "Mount Pinatubo Super-Eruption",
    location: "Luzon, Philippines",
    lat: 15.13,
    lon: 120.35,
    metrics: "VEI 6 · 20 Mt SO₂ · -0.5 °C Global Cooling",
    headline: "The 20th century's second-largest eruption, cooling planetary temperatures for 2 years.",
    description: "On June 15, 1991, Mount Pinatubo injected 20 million metric tons of SO₂ into the stratosphere up to 35 km altitude. The resulting sulfuric acid aerosol cloud spread across the entire equator within three weeks, reflecting sunlight and causing global surface temperatures to drop by ~0.5 °C in 1992–1993, clearly visible in our observatory data.",
    audioPreset: "volcano"
  },
  // 1997
  {
    id: "indo-fire-1997",
    year: 1997,
    type: "wildfire",
    name: "Indonesian Peatland Megafires",
    location: "Sumatra & Kalimantan, Indonesia",
    lat: -1.50,
    lon: 102.50,
    metrics: "5.2M hectares · 0.9–2.6 Gt CO₂ emitted",
    headline: "El Niño megadrought fueled catastrophic tropical peat swamp burning.",
    description: "Triggered by the record 1997–1998 Super El Niño drought, widespread agricultural drainage ignited prehistoric peat layers up to 20 meters deep. NASA TOMS and AVHRR satellites documented a thick smoke pall covering Southeast Asia for months, releasing the equivalent of 13–40% of mean annual global fossil fuel emissions.",
    audioPreset: "wildfire"
  },
  {
    id: "paka-1997",
    year: 1997,
    type: "cyclone",
    name: "Super Typhoon Paka",
    location: "Western Pacific / Guam",
    lat: 13.44,
    lon: 144.79,
    metrics: "Cat 5 · 295 km/h winds · 901 hPa",
    headline: "Unprecedented intensity during peak El Niño oceanic warmth.",
    description: "Super Typhoon Paka raged across Micronesia in December 1997. Fed by the deepest warm ocean pool recorded during the 1997 El Niño, Paka reached extreme Category 5 super typhoon strength with sustained gusts exceeding 380 km/h, illustrating how elevated sea surface temperatures energize mega-storms.",
    audioPreset: "cyclone"
  },
  // 2005
  {
    id: "katrina-2005",
    year: 2005,
    type: "cyclone",
    name: "Hurricane Katrina",
    location: "Gulf of Mexico / USA",
    lat: 29.50,
    lon: -89.60,
    metrics: "Cat 5 · 902 hPa · $125B damages",
    headline: "Rapid explosive intensification over the Gulf of Mexico Loop Current.",
    description: "In August 2005, Katrina underwent rapid intensification over an unusually warm ocean eddy in the Gulf of Mexico, deepening to 902 hPa. NASA TRMM satellite radar captured towering 'hot towers' in the eyewall that signaled rapid strengthening before devastating the northern Gulf Coast.",
    audioPreset: "cyclone"
  },
  // 2010
  {
    id: "eyjafjallajokull-2010",
    year: 2010,
    type: "volcano",
    name: "Eyjafjallajökull Ash Crisis",
    location: "Suðurland, Iceland",
    lat: 63.63,
    lon: -19.62,
    metrics: "VEI 4 · 250M m³ ash · 100k flights grounded",
    headline: "Subglacial phreatomagmatic blast disrupted worldwide airspace.",
    description: "In April 2010, magma interaction with glacial meltwater produced microscopic, highly abrasive silica ash particles. Carried by the polar jet stream across Europe, the plume caused the largest air-traffic shutdown since WWII. NASA Terra/Aqua MODIS and CALIPSO lidar tracked the exact altitude layers of the floating ash veil.",
    audioPreset: "volcano"
  },
  // 2013
  {
    id: "chelyabinsk-2013",
    year: 2013,
    type: "bolide",
    name: "Chelyabinsk Superbolide Airburst",
    location: "Southern Urals, Russia",
    lat: 54.80,
    lon: 61.10,
    metrics: "440 kt TNT · 19 m asteroid · 30 km altitude",
    headline: "Largest recorded cosmic impact in over a century.",
    description: "On February 15, 2013, an undetected 19-meter chondritic asteroid entered Earth's atmosphere at 19 km/s. It exploded in a blinding fireball brighter than the Sun at 29.7 km altitude, generating a supersonic shockwave that circled Earth twice and blew out windows across six cities. NASA's Center for Near Earth Object Studies (CNEOS) and infrasound stations reconstructed the complete orbital trajectory.",
    audioPreset: "bolide"
  },
  {
    id: "haiyan-2013",
    year: 2013,
    type: "cyclone",
    name: "Super Typhoon Haiyan (Yolanda)",
    location: "Leyte & Samar, Philippines",
    lat: 11.24,
    lon: 125.00,
    metrics: "Cat 5 · 315 km/h sustained · 895 hPa",
    headline: "Strongest tropical cyclone to ever make landfall in recorded planetary history.",
    description: "On November 8, 2013, Super Typhoon Haiyan struck the central Philippines with 1-minute sustained winds of 315 km/h and an unprecedented 6-meter storm surge. NASA GPM and Aqua satellites observed cloud-top temperatures colder than -85 °C in its perfectly symmetric annular eye.",
    audioPreset: "cyclone"
  },
  // 2015
  {
    id: "patricia-2015",
    year: 2015,
    type: "cyclone",
    name: "Hurricane Patricia",
    location: "Eastern Pacific / Mexico",
    lat: 18.50,
    lon: -105.00,
    metrics: "Cat 5 · 345 km/h winds · 872 hPa Record",
    headline: "Lowest barometric pressure ever measured in the Western Hemisphere.",
    description: "Fueled by the extraordinary warm ocean temperatures of the 2015 El Niño, Hurricane Patricia deepened by 100 hPa in 24 hours to reach a central pressure of 872 hPa and sustained winds of 345 km/h. NASA GPM satellite microwave imager mapped unprecedented convective rain rates exceeding 150 mm/hour.",
    audioPreset: "cyclone"
  },
  // 2018
  {
    id: "bering-bolide-2018",
    year: 2018,
    type: "bolide",
    name: "Bering Sea Fireball Airburst",
    location: "Bering Sea / North Pacific",
    lat: 56.90,
    lon: 172.40,
    metrics: "173 kt TNT · 10 m meteor · 25.6 km altitude",
    headline: "Second most powerful atmospheric impact of the 21st century.",
    description: "On December 18, 2018, a 10-meter asteroid detonated over the remote Bering Sea, releasing 173 kilotons of TNT equivalent energy (over 10 times the Hiroshima weapon). NASA Terra satellite's MISR and MODIS instruments captured historic true-color images of the meteor's orange fireball and dark shadow cast onto sea ice below.",
    audioPreset: "bolide"
  },
  // 2019
  {
    id: "australia-fire-2019",
    year: 2019,
    type: "wildfire",
    name: "Australian 'Black Summer'",
    location: "Eastern & Southern Australia",
    lat: -35.30,
    lon: 149.10,
    metrics: "24.3M hectares · 3B animals affected",
    headline: "Unprecedented continent-wide megafires generated stratospheric smoke.",
    description: "Between September 2019 and March 2020, extreme drought and record heat sparked bushfires that consumed 24 million hectares. The fires spawned enormous pyrocumulonimbus storm clouds that injected over 1 million tons of smoke into the stratosphere, circling the entire Southern Hemisphere for over a year.",
    audioPreset: "wildfire"
  },
  // 2021
  {
    id: "siberia-fire-2021",
    year: 2021,
    type: "wildfire",
    name: "Siberian Arctic Taiga Megafires",
    location: "Sakha Republic, Siberia",
    lat: 64.00,
    lon: 125.00,
    metrics: "18.1M hectares · Smoke reached North Pole",
    headline: "Historic Arctic heatwave burned boreal peat and permafrost forests.",
    description: "Record high Arctic temperatures fueled widespread forest and peat fires across northeastern Siberia. Satellite imagery from NASA Suomi-NPP VIIRS showed smoke covering more than 5 million square kilometers, reaching the North Pole for the first time in recorded observation history.",
    audioPreset: "wildfire"
  },
  // 2022
  {
    id: "tonga-2022",
    year: 2022,
    type: "volcano",
    name: "Hunga Tonga Submarine Super-Detonation",
    location: "Kingdom of Tonga, South Pacific",
    lat: -20.54,
    lon: -175.38,
    metrics: "VEI 5–6 · 146 Mt H₂O · 58 km plume peak",
    headline: "Largest atmospheric explosion recorded by modern instruments.",
    description: "On January 15, 2022, the submarine volcano Hunga Tonga–Hunga Haʻapai produced a colossal phreatoplinian detonation. The plume reached 58 km into the mesosphere, generating global atmospheric pressure waves that circled Earth four times. Uniquely, it injected 146 million tons of water vapor into the stratosphere—enough to increase stratospheric moisture by 10–15%—creating a novel warming forcing unlike traditional sulfur eruptions.",
    audioPreset: "volcano"
  },
  // 2023
  {
    id: "canada-fire-2023",
    year: 2023,
    type: "wildfire",
    name: "Canadian Megafire Crisis",
    location: "Across All Canadian Provinces",
    lat: 53.00,
    lon: -115.00,
    metrics: "18.5M hectares · 2.2 Gt CO₂ · Orange Skies",
    headline: "North America's most destructive wildfire season in recorded history.",
    description: "Widespread record heat and early snowmelt triggered catastrophic fires from British Columbia to Quebec, burning more than 18.5 million hectares (more than double the previous 1989 record). NASA satellite imagery captured colossal smoke plumes that turned skies orange in New York and Washington D.C., and crossed the Atlantic to blanket Western Europe.",
    audioPreset: "wildfire"
  },
  // 2024
  {
    id: "beryl-2024",
    year: 2024,
    type: "cyclone",
    name: "Hurricane Beryl",
    location: "Windward Islands & Gulf Coast",
    lat: 12.00,
    lon: -61.00,
    metrics: "Cat 5 · Earliest Cat 5 on Record (July 1)",
    headline: "Earliest Category 5 Atlantic hurricane fueled by off-the-charts ocean heat.",
    description: "In early July 2024, Beryl underwent unprecedented rapid intensification, becoming the earliest Category 5 hurricane ever observed in the Atlantic basin. Its unprecedented early strength was powered by Caribbean and Atlantic ocean heat content levels normally not observed until late September, demonstrating the impact of record global marine heatwaves.",
    audioPreset: "cyclone"
  }
];
