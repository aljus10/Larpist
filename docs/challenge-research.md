# Earth Resonance — 2026 Space Apps challenge research

Verified 5 November 2026. Primary sources only. Recommendations below are interpretations, not NASA requirements.

## Decisive findings

- **Challenge alignment means EIC imagery-to-sound.** The current brief asks for an Earth Jukebox pairing NASA Earth Information Center (EIC) visual frames with dynamic sonification. Its objectives specifically call for a selected EIC visualization and a corresponding soundscape. A climate-data music app needs an explicit, demonstrated EIC-frame connection to make this alignment convincing. [2026 challenge](https://www.spaceappschallenge.org/2026/challenges/the-earth-information-jukebox/)
- **Advance challenge work is expressly prohibited.** The current official FAQ says: “Teams are not allowed to begin working on the challenges prior to the hackathon.” It identifies the 2026 event as November 14–15. This creates a material eligibility issue for an already-built challenge solution. The FAQ does not explain exceptions for existing general-purpose code, the consequences of prior work, or whether a separately built new solution would resolve the issue. Obtain a ruling from the Local Lead/Global Organizing Team; do not claim this existing build is eligible. [2026 Participant FAQs, “What are the challenges?”](https://www.spaceappschallenge.org/resources/participant-faqs/)
- **The detailed current judging/submission guides are not yet released.** The 2026 FAQ schedules the Project Submission Guide and Judging and Awards Guide for November 13. The current challenge Resources tab also says resources will be available Friday, November 13. Therefore exact global scoring, weights, current pitch/video limits, required submission fields, and the complete official challenge-resource list cannot yet be verified. [2026 FAQs](https://www.spaceappschallenge.org/resources/participant-faqs/), [challenge Resources tab](https://www.spaceappschallenge.org/2026/challenges/the-earth-information-jukebox/?tab=resources)

## What the brief actually asks for

The purpose is to broaden access to Earth science, particularly for blind and low-vision users, and support exploration through hearing. It proposes using image color, shape, brightness, or spatial density to control pitch, tempo, rhythm, volume, or instrumentation. These techniques are examples: neither computer vision nor machine learning is mandatory. The translation method is open, and the brief encourages a balance of meaningful interpretation and musical appeal. [2026 challenge](https://www.spaceappschallenge.org/2026/challenges/the-earth-information-jukebox/)

The summary emphasizes real-time sound, but the detailed objectives explicitly also permit a curated collection of original generated audio files paired with EIC imagery and an explanation of how the audio was made. Accepted example formats include a web jukebox, desktop application, backend endpoint, and an audio playlist. Real-time browser synthesis is a strong implementation choice, rather than the only allowed format. [2026 challenge](https://www.spaceappschallenge.org/2026/challenges/the-earth-information-jukebox/)

The section labelled Potential Considerations is explicitly optional. Screen-reader support, tactile feedback, descriptive text, intuitive controls, frame extraction, artistic mapping explanations, and storytelling are suggested there. Accessibility is nevertheless central to the stated problem, so a visually polished interface alone would provide weak evidence that the problem has been solved. [2026 challenge](https://www.spaceappschallenge.org/2026/challenges/the-earth-information-jukebox/)

## Current participation and submission facts

- Register on the official site, choose a Local Event or Universal Event, and submit through the team's project page to be eligible for Global Judging. The FAQ says to submit according to the ending time of the selected Local Event; consult that event and the November 13 guide for the final deadline details. [2026 FAQs](https://www.spaceappschallenge.org/resources/participant-faqs/)
- Local Event teams need at least one member; Universal Event teams need at least two for global judging. Maximum team size is six; all members must be signed up for the same event. Participants may belong to one team, and a team may work on one challenge. [2026 FAQs](https://www.spaceappschallenge.org/resources/participant-faqs/)
- The current FAQ allows generative/computational intelligence tools and requires describing their use in the submission. Preserve a clear account of assistance used. [2026 FAQs](https://www.spaceappschallenge.org/resources/participant-faqs/)
- Published legal terms require appropriate source citations, including freely available/open-source resources, and license documentation. Original project content must be freely available without restriction or under an OSI-compliant open-source license; the terms provide Apache 2.0 as the default if no specific compliant license is supplied. [Space Apps legal terms](https://www.spaceappschallenge.org/legal/)

## Evaluation: confirmed versus historical

The current FAQ confirms judging toward Honorable Mentions, Global Finalists, and Global Winners, but refers readers to the forthcoming guide for details. No 2026 global scoring rubric or weights were verified. [2026 FAQs](https://www.spaceappschallenge.org/resources/participant-faqs/)

A **2025 local event page**, not the 2026 global guide, lists influence, creativity, validity, relevance, and presentation. Treat these only as historical preparation lenses. They are useful questions to ask internally (who benefits, what is new, is the science sound, does it answer the brief, can judges understand it), but must not be represented as confirmed 2026 criteria. [2025 Isa Town local-event judging instructions](https://www.spaceappschallenge.org/2025/local-events/isa-town/)

Do not carry forward 2025 event dates, pitch limits, team restrictions imposed by a particular city, or 2025 award schedules. The official site labels local-event content as participant/Local Lead content that may not have been reviewed by NASA. The current production FAQ is the relevant source for the present participation facts. [2026 FAQs](https://www.spaceappschallenge.org/resources/participant-faqs/), [example local-event content notice](https://www.spaceappschallenge.org/2026/local-events/thrissur/)

## Official EIC resources available independently of the forthcoming challenge list

NASA's Scientific Visualization Studio EIC gallery identifies content used on EIC hyperwalls, including the Earth Now and Climate Vital Signs dashboards. Its Daily Visualizations gallery explicitly collects EIC products and includes global precipitation and sea-surface temperature, offering plausible connections to Earth Resonance's existing themes. These are verified NASA/EIC resources, **not yet confirmed as the challenge's November 13 recommended list**. [SVS EIC gallery](https://svs.gsfc.nasa.gov/gallery/earth-information-center/), [EIC daily visualizations](https://svs.gsfc.nasa.gov/gallery/daily-visualizations/)

Earth.gov is the virtual home of EIC exhibit content; it connects Earth information, visualizations, and interactive media with public decisions. [Earth.gov About](https://earth.gov/about)

## Differentiation opportunities for Earth Resonance

These are proposed directions based on the brief, not a ranking of other teams or evidence of originality:

1. **Make the visual-to-audio relationship inspectable.** Show an actual credited EIC frame and timestamp; let listeners hear the same frame/region repeatedly; explain exactly which image features drive each sound. Distinguish image-feature mappings from any separate temperature or rainfall data mapping. This closes the most important brief-alignment gap.
2. **Design an audio-first path.** A person should be able to select a visualization, discover the mapping, play/pause, and compare two moments using a keyboard and spoken labels. Test whether a listener can identify a meaningful difference without seeing the screen. This makes the accessibility claim concrete.
3. **Teach the ear before adding musical complexity.** Offer short isolated examples, consistent mapping ranges, and A/B comparisons before layering instruments. Explain what a change in pitch, pulse, or timbre means and which choices are artistic. This supports interpretability and avoids implying that music itself measures climate.
4. **Tell one defensible EIC story well.** A focused temperature or precipitation experience with documented source, dates, units, missing data, frame correspondence, and a short guided comparison may be more persuasive than many loosely connected datasets.
5. **Prepare evidence, not just claims.** A brief audio-first walkthrough, a reproducible mapping description, a source/license inventory, and results of basic listener/accessibility checks would make scientific and usability claims reviewable. The final submission format must follow the forthcoming 2026 guide.

## Research method and limits

The supplied URL without “the-” did not expose the current full brief. The canonical production route above did. Browser search extraction was incomplete and intermittently returned gateway failures; current text was verified by downloading production HTML and decoding its server-rendered page content. Staging pages were discovered but excluded as governing evidence because they contain stale placeholder content. Recheck the challenge Resources tab, FAQs, and both guides on November 13; request organizer clarification on prior work before making any competition-eligibility promise.
