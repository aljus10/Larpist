# Earth Resonance: proposed hackathon direction

Planning proposal, 5 November 2026. No implementation authorized by this plan.
Primary brief: user-pasted text and [official 2026 challenge](https://www.spaceappschallenge.org/2026/challenges/the-earth-information-jukebox/).
Research and participation caveats: [challenge-research.md](challenge-research.md).

## Proposed promise

Hear the geographic patterns that a global average can hide.

Earth Resonance is proposed as an audio-first exploration and learning instrument
for NASA EIC imagery. A web application is a valid delivery format; distinction
comes from a meaningful, reproducible image-to-sound translation and evidence
that people understand it, including without seeing the screen.

## The central demonstration

1. Select a credited EIC visualization and frame/date.
2. Learn a short, isolated sound legend.
3. Scan defined geographic bands/regions in that same frame. Synchronize the
   visual highlight, accessible region label and audio segment.
4. Compare two regions or dates using one fixed mapping and playback duration.
5. Explain the source features, units, time window, mapping and artistic choices.

Proposed implementation: derive auditable color-bin proportions from an EIC
frame, excluding labels, missing pixels and non-map background. Translate a few
ordered geographic bands into a repeatable musical phrase. Pixel colors are
visual features; do not report decoded values as exact physical measurements
without a validated legend, projection and inversion. If using underlying data,
show its exact linkage to the displayed frame and explain aggregation differences.
This is a proposed method, not a NASA-required algorithm.

Start with a verified temperature EIC scene already used by the project. A rain
scene becomes the next candidate once its EIC provenance and temporal/spatial
meaning are verified. Do not claim new or unique invention without prior-art review.

## Priorities

P0: Verify frame provenance, dates, grid alignment, sources, missing-data handling
and exactly what controls the current sound. Current code plays an aggregate
regional numeric series while displaying a separately selected visual frame.
That does not yet demonstrate translation of a frame's spatial pattern.

P1: Deliver one repeatable scene-to-sound scan with a sound legend, keyboard
selection, play/pause/repeat and clear description. Offer mono-friendly cues;
stereo position must not be the only way to identify a region.

P1: Diagnose rain before exaggerating it. Measure the actual range of the
current regional/global series. A small annual global-mean change need not
mean a defective graph. Compare two contrasting regions in the same period
or seasons only when the dataset supports them. Keep fixed scale/normalization
across an A/B comparison. Label any relative enhancement and preserve absolute
values. Do not derive storm events or thunder from annual mean rainfall alone.

P2: Make Dr. Jo a concise female-voiced guide, with visible captions, a manual
Read/Stop control, and narration that pauses or ducks synthesis. Narration is
separate from the non-speech sonification. Retain accurate guide identity and
source grounding; general chat and a real portrait are secondary.

P2: Test comprehension. Proposed small pilot: ask 3–5 listeners to identify
which of two scenes/regions has the higher mapped feature, then explain the
mapping. Record mistakes, setup, participants' consent and limitations. Include
blind/low-vision users if available; do not claim validated accessibility from
sighted screen-off tests. Avoid invented improvement statistics.

P3: Add one more weather layer only after the core scene, provenance and
comprehension checks work. More datasets and animations are not success measures.

## Scope and pitch

Keep: globe, projections, source tabs, learning activity, regional selection,
repeatable synthesis and offline-capable core.

Defer: additional hazard effects, broad weather forecasting, generic AI chat,
new 3D avatars, and many new datasets. Existing features may remain secondary.

Suggested internal rehearsal, not an official time limit: a 90-second demo:
15 seconds to introduce the access problem, 15 seconds for the sound legend,
30 seconds to scan and compare a real EIC scene, 15 seconds to show the mapping
and sources, and 15 seconds for listener-test evidence and limitations.

## Sequence and decisions

Before challenge implementation: resolve existing-work eligibility with the
Local Lead/Global Organizing Team. Suggested question: “We already have an
Earth-data sonification prototype built before the event. May any of it be reused,
what must be newly built during the event, and how should prior work be disclosed?”
The official FAQ prohibits starting challenge work before the hackathon; no
exception for this prototype has been verified. Do not conceal its history.

Planning now: agree audience, inspect public data documentation, define mapping
and pilot questions, clarify team capacity and review current participation rules.
During the permitted build window: verify one EIC scene, implement its accessible
scan, tune rain only if its data supports the desired comparison, test with
listeners, then record the working demo and document sources/AI use/licenses.

Recheck the official Resources tab and 2026 judging/submission guides when
released. Exact scoring weights, pitch length and deliverable limits have not
been verified; this proposal does not represent them as official requirements.

Open decisions: primary audience, team size/skills, event registration and actual
submission window, organizer ruling, and which verified EIC scene leads the demo.
