# Earthtone Studio — Earth Information Jukebox concept research

Verified 10 November 2026. Primary sources only for external research. Project-source observations are identified separately. Concepts, mappings, acceptance targets and demo timings below are proposals, not NASA requirements or evidence of winning. No REA tools or captured reference materials were used.

## Recommendation

Build **Earth Pattern Score: Learn, Scan, Compare**. A listener learns three distinct sound textures, scans a credited EIC frame through named geographic regions, and compares the distribution of its visual categories across two regions or dates. The same selection drives the highlighted map, accessible description, category table and sound. A small, inspectable transformation plus a successful nonvisual task is the central demonstration.

The promise: **Hear where a pattern changes, then check exactly why it sounds different.** Keep the existing musical timeline as a secondary numeric-data instrument. The recommended frame mode communicates spatial distribution through timbre, duration and scan order; it does not depend on remembering whether an isolated note is high, medium or low.

## What the challenge establishes

The production brief asks for EIC visual frames paired with corresponding dynamic sonifications. Its objectives also allow a curated collection of original generated audio paired with imagery. Translation methods and delivery format are open; computer vision, machine learning and particular musical techniques are examples. Accessibility for blind and low-vision audiences is central, while the detailed “Potential Considerations” are expressly optional. A strong alignment demonstration therefore selects an identifiable EIC frame and makes its audible transformation evident. A soundtrack accompanying an unrelated Earth image leaves that relationship unproven. [Official 2026 challenge](https://www.spaceappschallenge.org/2026/challenges/the-earth-information-jukebox/)

NASA's EIC gallery identifies content used on its hyperwall. The EIC Climate Vital Signs dashboard links a global temperature-anomaly visualization, and SVS 5450 is explicitly tagged Earth Information Center. These establish a defensible temperature starting point; archive the exact product/version rather than assuming every NASA map belongs to EIC. [EIC gallery](https://svs.gsfc.nasa.gov/gallery/earth-information-center/), [Climate Vital Signs dashboard](https://svs.gsfc.nasa.gov/gallery/climate-vital-signs-dashboard/), [SVS 5450](https://svs.gsfc.nasa.gov/5450/)

## Evidence that changes the design

| Primary research | Finding and limit | Design implication proposed here |
| --- | --- | --- |
| [Dubus and Bresin, 2013, PLOS ONE](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0082491) | Their review covered 179 publications and 495 mappings. Pitch dominated; evaluation of mapping efficiency was uncommon. Frequency of use does not establish the best mapping for this task. | Choose mappings by the questions listeners must answer, then test them. A larger synthesizer is not itself scientific evidence. |
| [Walker and Nees, 2005, Conceptual versus Perceptual Training for Auditory Graphs](https://journals.sagepub.com/doi/10.1177/154193120504901721) | In a 60-student point-estimation study, practice with feedback improved post-test scores versus control. The accessible publisher abstract supports this narrow conclusion, not a universal training duration or blind-user result. | Teach one cue at a time, ask a practice question, give corrective feedback, then test unfamiliar scenes. |
| [Guiotto Nai Fovino et al., 2024, Edukoi](https://link.springer.com/article/10.1007/s00779-024-01809-5) | Nearly 150 middle-school students explored images using familiar sound associations. The authors report strong colour recognition after brief training and retention after two months; shape recognition was harder. Only one participant was completely blind. Questionnaire science engagement did not improve despite positive verbal feedback. | Test a small, memorable timbre vocabulary and separate category recognition from spatial comprehension. This does not validate Earthtone's sounds or accessibility. Avoid treating praise as learning evidence. |
| [Nees and Walker, 2006, Relative Intensity of Auditory Context for Auditory Graph Design](https://www.icad.org/Proceedings/2006/NeesWalker2006.pdf) | Their small experiment found context/data intensity differences helped point estimation relative to equal intensity; they call for larger-sample research. | Give region boundaries a distinct, brief cue. Pilot masking and intelligibility rather than copying the study's decibel setting into a different interface. |
| [Arcand et al., 2024, A Universe of Sound](https://www.frontiersin.org/journals/communication/articles/10.3389/fcomm.2024.1288896/full) | Responses from 3,184 sighted or blind/low-vision participants were positive and included self-reported learning gains. This is astronomy outreach and participant response, not proof of objective Earth-science comprehension. | Evaluate enjoyment, trust and task correctness separately. Explain data provenance and artistic choices so listeners can judge what they hear. |

These studies motivate the proposal; they do not prove a preferred sound metaphor, culture-independent mapping, superior learning style or performance advantage for this application.

## Three viable concepts

| Concept | Demonstrable question and mechanism | Strength | Main cost or risk |
| --- | --- | --- | --- |
| **Earth Pattern Score — recommended** | “Which region has a larger proportion of the frame's warmer-than-baseline category?” Fixed region sequence; different textures identify categories; their durations encode category coverage. Pin a region and play A/B under one mapping. | Direct frame relationship; repeatable; mono-compatible; inspectable category vectors; bounded build scope. | Coarse category coverage loses within-category magnitude and fine spatial detail. Pixel coverage must not be described as Earth-surface area. |
| **Earth Ear Lens** | “Where does this visual boundary occur?” Keyboard steps through a small labelled grid, with a cue at category changes and a spoken value/category on demand. A pinned cell provides a reference. | User-directed spatial discovery, useful for following boundaries without vision. | Navigation, orientation, projection accuracy and lengthy exploration are harder to finish and test. Pitch, if retained, needs an audible reference. |
| **Seasonal Rain Rhythm** | “Where and when does the mapped wet/dry pattern shift?” Selected EIC precipitation frames drive a fixed sequence of per-region event counts or texture durations, with time and region explicitly announced. | Natural narrative and temporal change; avoids making a global annual mean sound like a local storm. | Product meaning is crucial: the EIC seasonal-variation visualization adds daily anomalies then fades them over three months. Its frame is not an instantaneous rain-rate measurement. [EIC daily gallery](https://svs.gsfc.nasa.gov/gallery/daily-visualizations/), [SVS 4897](https://svs.gsfc.nasa.gov/4897/) |

Recommend the first concept because it exposes the exact transformation and supports a short, objectively scored task. Ear Lens is the first stretch feature. Rain follows a product/provenance audit. None is claimed as unprecedented prior art.

## What must be true of a frame-to-sound pairing

The following are proposed engineering validity conditions, not additional competition rules:

1. **Identity:** preserve the NASA source URL, product ID, frame index, displayed date, projection/variant, downloaded-file hash, credit and reuse information. Distinguish the frame's display date from its represented observation window.
2. **A real dependency:** frame features must actually enter the sound-generation function. For numeric-data sonification, document the underlying data's exact correspondence to the displayed visualization: variable, spatial grid, baseline, aggregation window and processing. Two assets sharing a year is insufficient evidence of equivalence.
3. **Exclusions:** mask legends, dates, borders, background, overlays and missing-data pixels. Do not let white missing pixels silently become “near baseline.” Report unclassified pixels and reject an unreliable frame rather than forcing a colour match.
4. **Stable transform:** publish palette classification, masks, bin boundaries, normalization, clipping, sound vocabulary and timing. A/B uses identical settings. Repeating a selection produces the same feature vector and audio schedule; any stochastic texture uses a recorded seed.
5. **Correspondence:** the current highlight, accessible region name, table row and audible segment reference the same frame/region. A frame change cancels queued playback; failure to load a frame must not leave a misleading old picture playing new audio.
6. **Traceability:** export a small ledger: `frame ID -> region mask -> valid/unclassified counts -> category fractions -> scheduled sound events`. Let a reviewer reproduce one example by hand.

**Two distinct modes must remain explicit.** Frame-derived mode reports visual-category coverage. Separate numeric mode can report degrees Celsius or mm/day only from a verified numeric dataset and aggregation. Colour inversion from a rendered image is not exact physical measurement: antialiasing, compression, saturated colours and palette ambiguity can destroy information. The proposed MVP avoids that inference.

SVS 5450 describes anomalies relative to 1951–1980, maps averaged over a running 24-month window, and a final 2024 frame. Consequently a sound from that map must not be labelled a daily temperature, absolute temperature, or automatically the annual global GISTEMP value. Its page offers multiple projections, frame sets, timestamps and a colour table; use matching assets. [SVS 5450 documentation and downloads](https://svs.gsfc.nasa.gov/5450/)

## Minimum mapping for Earth Pattern Score

This is a **candidate to prototype and test**, not a scientifically established perceptual scale. Begin with one map variant and three fixed, documented palette groups: cooler, near-reference, warmer. Confirm each group against the source legend; retain finer visual bins in the ledger if they are pooled for audio.

| Input or state | Proposed sound mapping | Visual/text equivalent and interpretation |
| --- | --- | --- |
| Geographic position | Five fixed regions, north to south: 60–90°N, 30–60°N, 30°S–30°N, 30–60°S, 60–90°S. One region at a time. | Named selectable regions and a moving outline. Validate masks against the chosen projection before using these geographic labels. |
| Region boundary | A short dry click, followed by an optional spoken region name before the data sound. | Region heading and focus/status update. Speech and data do not compete. The click means a boundary, not a climate event. |
| Cooler / near-reference / warmer palette groups | Three easily distinguished synthetic textures, provisionally hollow/airy, rounded/steady, bright/plucked. The legend lets users audition each in isolation. | Text names and patterned swatches. Metaphors are arbitrary encodings; no fire, storm or danger inference is intended. Replace confusable textures after pilot feedback. |
| Fraction `p[k]` of valid region pixels in category `k` | Within a fixed 3-second region phrase, play categories serially in the same cooler → reference → warmer order. Texture duration `d[k] = 3 × p[k]` seconds. Fractions sum to one. Keep master level and phrase duration fixed. | Exact percentages in a table and proportional segments. Longer texture means greater valid **map-image coverage** in that category, not a higher anomaly or faster change. Zero fractions produce no segment. Very short segments require a tested audibility policy, disclosed in the legend. |
| Missing/unclassified coverage | A separate status cue and text; omit it from category normalization and state the valid fraction. Entirely invalid region: “No valid frame data,” never a neutral phrase. | Show valid/unclassified percentages and reason. This encodes availability, not uncertainty in the climate measurement. |
| Pin A / choose B / replay | Boundary cue identifies A or B; replay the same selected region under the same category scale and 3-second phrase. | A/B labels, source dates, vectors and differences. No per-frame rescaling. |
| Optional later pitch or stereo | Redundant cue only, user-toggleable, after the basic vocabulary works. | Every important distinction survives mono playback and does not require pitch naming or left/right hearing. |

For region `r`, `p[r,k] = count(valid pixels in r assigned to k) / count(valid classified pixels in r)`. This deliberately measures the rendered image. Projection distortion means pixel fractions are not generally geographic area fractions. To claim surface-area coverage, use validated geolocation and appropriate area weights or the documented underlying grid; that is separate stretch work. If reliable geographic masks cannot be finished, explicitly label fixed screen-space strips instead of inventing geographic precision.

Musicality comes from a coherent timbre family, smooth envelopes and repeatable phrasing. An optional musical layer must be independently switchable and absent in comprehension trials. Keep loudness under user control rather than making scientific magnitude depend on volume.

## Exact end-to-end demonstration

Proposed 100-second rehearsal; no official pitch limit has been verified:

1. **0–10 s:** “Earth Pattern Score makes one NASA EIC image explorable by ear.” Open a locally cached, credited SVS frame and state its represented window and baseline.
2. **10–25 s:** Use only keyboard controls. Play the three isolated legend textures, then one practice comparison with corrective feedback. Announce what duration means.
3. **25–45 s:** Start a north-to-south scan. The active map region and accessible name advance with its phrase. Pause and repeat a region. The nonvisual route must work without pointing at the globe.
4. **45–65 s:** Pin A, choose a second real frame or region B with a verified category-coverage difference, then play A/B. Ask which has more warmer-category coverage; reveal the table after the listener answers. Do not preselect a visually dramatic pair until the ledger confirms the claimed difference.
5. **65–80 s:** Show the single-region ledger and its fixed mapping. Explain that this mode translates image categories; open the separate numeric timeline only if time permits, with its different provenance stated.
6. **80–100 s:** Show actual pilot counts, one discovered usability problem and the resulting fix. End with the source/version, known limits and a link to the reproducible demo. If recruitment or testing did not happen, label the protocol as planned and make no results claim.

The meaningful “wow” is a listener answering correctly before seeing the reveal, followed by an inspectable explanation. A sighted presenter covering the screen demonstrates a route; it does not establish blind-user accessibility.

## Current Earthtone gap analysis

These are read-only source observations on 10 November, not a new runtime, scientific or accessibility audit. File links are repository evidence, not external research citations.

| Existing evidence | Gap for this proposal | Priority |
| --- | --- | --- |
| [observatory.html](../observatory.html), `seriesFor` around lines 1893–1906 and `playActiveSound` around 2275: audio uses a selected-area numeric series; [manifest.json](../data/manifest.json) separately identifies NASA map frames. | This supports numeric sonification alongside maps, but does not itself prove translation of the displayed frame's spatial distribution. Add an actual frame-feature pipeline and ledger, or validate exact underlying-data correspondence before claiming that relationship. | P0 |
| [observatory.html](../observatory.html), source disclosure around 1795–1800; [DATA-NOTES.md](DATA-NOTES.md). | Existing text correctly distinguishes running-mean maps from regional series and excludes repeated later data. Preserve these distinctions in the spoken introduction and frame labels. Validate the precise chosen frame/window before the demo. | P0 |
| [observatory.html](../observatory.html), `playRainSound` around 2032–2047 uses both relative series range and an absolute component; its sources text says the inherited rainfall provenance needs an audit. | Same absolute value can sound different when the selected series changes. Regional A/B requires locked calibration. Annual/aggregated rainfall cannot establish a specific convective storm; dramatic weather effects are artistic unless the source supports them. | P0 before rain demo |
| [observatory.html](../observatory.html), lesson routines around 2454–2517 already implement prediction/listen/explanation; controls include labelled buttons and a native range. | Reuse the learning structure, but teach the new timbre/duration vocabulary and test transfer to unfamiliar regions. Source presence of labels does not establish end-to-end screen-reader usability. | P1 |
| [studio.js](../js/studio.js), track titles and auxiliary/resonance synthesis around 159–226. | These supplementary tones do not demonstrate EIC-frame translation. Keep the judge-facing core unmistakably on the verified frame-derived experience; make supplementary artistic tracks explicit. | P1 |

## MVP and stretch scope

**MVP:** one verified temperature visualization; two pinned frames; five validated region masks; three texture categories; fixed duration mapping; keyboard selection/play/pause/repeat/A/B; isolated sound legend plus one feedback exercise; synchronized descriptions and category table; deterministic event ledger; cached demo; a small recorded pilot. Fewer validated regions are preferable to falsely precise masks.

**Stretch, in order:** keyboard Ear Lens; replayable export containing frame, mapping and generated sound; a validated second variable; independently toggled musical arrangement; optional tactile output with the same boundary semantics. Haptics require device testing and an equivalent alternative. More tracks, a 3D guide, AI chat or cinematic effects do not substitute for the MVP evidence.

## Accessibility acceptance and 3–5 participant protocol

Use standards checks and real-user evaluation together. W3C cautions against generalizing from a couple of disabled participants and recommends reporting study scope, methods and user characteristics. Small tests are useful formative evidence, not a statistically significant population result. [WAI: Involving Users in Evaluating Web Accessibility](https://www.w3.org/WAI/test-evaluate/involving-users/)

### Before inviting participants

Check the entire core route with keyboard and an actual screen reader. Provide named controls, visible unobscured focus, no keyboard trap, non-colour indicators, text alternatives, reflow/zoom support and alternatives to dragging. Offer explicit playback and a reachable stop/volume control. Include equivalent text/table information for people unable to hear the sonification and captions/transcripts for narration. These are selected checks against WCAG 2.2, including 1.1.1, 1.4.1–1.4.4, 1.4.10, 2.1.1–2.1.2, 2.4.7, 2.4.11, 2.5.7 and 4.1.2; this list is not a conformance assessment. [WCAG 2.2](https://www.w3.org/TR/WCAG22/)

Prefer native controls. If a custom scrubber is necessary, expose name, minimum, maximum, current value and meaningful value text; support arrow keys and Home/End. W3C's slider guidance explicitly warns that touch assistive-technology support must be tested on the relevant devices. [WAI-ARIA slider pattern](https://www.w3.org/WAI/ARIA/apg/patterns/slider/)

Proposed product behaviours beyond those selected checks: make narration manual and pausable; suspend data sound during narration and screen-reader exploration when requested; avoid announcing every scheduled note in a live region; provide a quiet mode without ambient effects, user-selected comfortable volume, mono playback and reduced motion.

### Formative pilot: about 15 minutes per person

Recruit **3–5 consenting participants**, aiming to include blind and low-vision users who use their usual assistive technology. Record relevant experience, device/browser/screen reader, hearing accommodations and musical familiarity only with consent. If all participants are sighted, report that fact and call screen-off tasks nonvisual usability checks. Do not simulate blindness and claim equivalent lived experience. Offer breaks and record only what participants permit.

1. **Independent route:** from a fresh page, select the specified frame, find the legend, play, pause and replay a region using the participant's preferred input. Record independent success, assistance and blocking errors. Use think-aloud here; do not time the facilitator's help as successful independent use.
2. **Initial recognition:** before instruction, present three isolated categories in randomized order. Ask their meaning; allow “don't know.” This is diagnostic, not a requirement that the mapping be intuitive.
3. **Training, at most two minutes:** explain category identity and duration once; give two practice A/B examples with feedback. Keep these stimuli out of the later test.
4. **Comprehension, six unseen trials:** two category-identification trials; two A/B coverage comparisons, balanced in order; one region-location question after a scan; one missing-data-versus-reference question. Build answer keys from the ledger. During this block hide the answer table/reveal and disable narration that gives away the answer, while keeping navigation/region labels available. Permit replay and log its count. Do not coach or give feedback until the block ends.
5. **Transfer and modality:** try an unfamiliar verified frame. Repeat one new matched task in mono. Let the user inspect the text/table alternative afterwards and explain in their own words what the sound measures and one thing it cannot establish.
6. **Feedback and revision:** ask comfort, effort, enjoyment and confidence separately from correctness. Ask which cues were confused. Fix the highest-impact barrier, then retest with new stimuli; disclose any reused participants and their extra practice.

Suggested internal MVP targets, declared before testing: every participant can stop playback; no blocking keyboard/screen-reader issue remains on the tested route; at least 4/6 scored answers per participant after training; no repeated confusion of missing coverage with the reference category; and correct teach-back of “category coverage, not absolute temperature or climate causation.” These targets guide iteration, not statistical validation. If a target fails, simplify the vocabulary or reduce region count before adding instruments.

Keep an anonymized row per participant: `setup | independent tasks | six trial answers | replays | assistance | teach-back | comfort | issue/fix`. Report raw counts and denominators, errors and relevant differences in setup. Do not pool repeated trials as independent participants, infer a treatment effect from this pilot, or advertise a percentage learning gain from such a small sample.

## Judge-facing evidence to prepare

| Claim | Reviewable evidence |
| --- | --- |
| “Answers the EIC brief” | A credited EIC-linked frame, its identity/window and a live change that predictably changes the derived vector and sound. |
| “Meaningful sonification” | One mapping table, deterministic event ledger, stable A/B settings and a demonstrated category-coverage question. |
| “Can be learned” | Actual post-training unseen-trial answers, training duration, confusions and transfer result. |
| “Supports nonvisual use” | A keyboard/screen-reader recording of the complete route and participant setup/results, with consent. Report untested users/devices explicitly. |
| “Scientifically careful” | Frame/data distinction, source/version, missing-pixel accounting, represented time window and limits stated beside playback. |
| “Ready to demonstrate” | Cached frame/audio capability, a short resettable walkthrough and a fallback recording of the same working build. Distinguish recorded evidence from a live run. |

These are proposed presentation lenses, not a verified 2026 scoring rubric. Do not claim NASA endorsement, objective accessibility validation, comparative superiority, or a guaranteed award.

## Eligibility and scientific limits

The current FAQ lists the event as **14–15 November 2026**, prohibits starting challenge work before the hackathon, and schedules Project Submission and Judging and Awards guides for **13 November**. It requires project-page submission for global judging and disclosure of generative/computational assistance. An existing prototype and challenge-specific work before the event create a material eligibility question: obtain an organizer ruling on what may be reused and disclose development history. This report does not establish eligibility. Recheck the final guides, local deadline and challenge resources when released; exact scoring weights and pitch limits remain unverified here. [2026 participant FAQs](https://www.spaceappschallenge.org/resources/participant-faqs/)

Published legal terms require appropriate citations and open/public availability or qualifying open-source licensing for relevant solution materials. Preserve third-party license/source records and confirm the final submission's license rather than assuming NASA imagery makes all dependencies unrestricted. [Space Apps legal terms](https://www.spaceappschallenge.org/legal/)

Scientific limits to state plainly: a rendered colour category is a visual encoding; the proposed three-category score cannot recover within-bin values, small spatial features or measurement uncertainty. “Near reference” is not “safe,” a warm anomaly is not an absolute hot temperature, and a selected-frame difference is not by itself a trend, attribution or forecast. Sonification is a designed representation, not a recording of Earth's electromagnetic resonance or weather.

## Verification method

Reviewed the official production challenge, FAQ and legal pages, NASA EIC/SVS product documentation, original research/publisher papers and W3C standards/guidance. Web extraction of Space Apps intermittently failed; the production page's server-rendered content was retrieved and decoded as text without executing scripts. Staging and community summaries were not used as governing requirements. Existing project code and documentation were read only for the gap analysis. No application change, participant test or numerical image audit was performed in this research task.
