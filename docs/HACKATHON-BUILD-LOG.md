# Earthtone Studio — Hackathon Build Log

Use this document during the NASA Space Apps Challenge event. Record work when it happens. Do not backdate entries or describe pre-event work as event work.

## Project identity

- **Challenge:** The Earth Information Jukebox
- **Team:** _Add official team name_
- **Event:** _Add Local Event or Universal Event_
- **Event timezone:** _Add timezone_
- **Official build window:** _Add organizer-confirmed start and submission deadline_
- **Project page:** _Add URL when available_
- **Repository:** _Add URL or local repository identifier_

## Pre-event baseline

Earthtone Studio existed before the hackathon. The baseline includes the 3D studio, NASA temperature and rainfall views, numerical-series sonification, timeline playback, comparison controls, and an early listening lesson.

The challenge-specific event work will be identified separately below. Reusing baseline components is subject to organizer guidance and must be disclosed.

### Baseline evidence

- **Baseline captured at:** _YYYY-MM-DD HH:MM timezone_
- **Baseline commit or archive name:** _Add identifier_
- **Baseline commit hash:** _Add hash_
- **Baseline ZIP SHA-256:** _Add hash_
- **Baseline screenshot/video folder:** _Add path or URL_
- **Organizer guidance on reuse:** _Paste or link to the written response_

### Baseline command record

Run these from the repository only when the baseline is actually frozen:

```powershell
git status --short
git rev-parse HEAD
git log -1 --format=fuller
```

If the project is not yet tracked in Git, initialize a repository only with the team's agreement, preserve the original release files, and record the true initialization time. Do not rewrite file timestamps as evidence.

## Event objective

Build and validate a challenge-specific **Learn → Scan → Compare → Explain** experience in which a credited NASA Earth Information Center frame actually drives the generated sound.

The event module should demonstrate:

1. Exact NASA frame identity and provenance.
2. A documented extraction of visual categories from that frame.
3. A stable visual-feature-to-sound mapping.
4. Keyboard and screen-reader access to the core route.
5. A listening task that tests understanding rather than merely playing music.
6. A reproducible ledger connecting the frame, selected region, extracted features, and scheduled sounds.

## Event work log

Create one entry for each meaningful work session. Attach commits, screenshots, recordings, test output, or source notes wherever possible.

### Entry template

- **Started:** _YYYY-MM-DD HH:MM timezone_
- **Finished:** _YYYY-MM-DD HH:MM timezone_
- **Team members:** _Names_
- **Goal:** _What this session attempted_
- **Work completed:**
  - _Specific change_
  - _Specific change_
- **Files changed:** _Paths_
- **Commit:** _Hash and message_
- **Evidence:** _Screenshot, video, test output, or ledger path_
- **AI/computational assistance:** _Tool, prompt purpose, generated material, and human verification_
- **Problems or limitations:** _What remains uncertain or failed_
- **Next action:** _Smallest next step_

---

### 14 November — Event start and baseline verification

- **Started:** _Fill during the event_
- **Finished:** _Fill during the event_
- **Team members:** _Fill during the event_
- **Goal:** Verify the frozen pre-event baseline and begin the challenge-specific frame-to-sound module.
- **Work completed:** _Fill during the event_
- **Files changed:** _Fill during the event_
- **Commit:** _Fill during the event_
- **Evidence:** _Fill during the event_
- **AI/computational assistance:** _Fill during the event_
- **Problems or limitations:** _Fill during the event_
- **Next action:** _Fill during the event_

### 14 November — NASA frame provenance and extraction

- **Started:** _Fill during the event_
- **Finished:** _Fill during the event_
- **Team members:** _Fill during the event_
- **Goal:** Select the official EIC-linked visualization, record its exact frame metadata, and produce the first inspectable category vector.
- **Work completed:** _Fill during the event_
- **Files changed:** _Fill during the event_
- **Commit:** _Fill during the event_
- **Evidence:** _Fill during the event_
- **AI/computational assistance:** _Fill during the event_
- **Problems or limitations:** _Fill during the event_
- **Next action:** _Fill during the event_

### 14 November — Learn and Scan experience

- **Started:** _Fill during the event_
- **Finished:** _Fill during the event_
- **Team members:** _Fill during the event_
- **Goal:** Implement the isolated sound legend and deterministic geographic scan.
- **Work completed:** _Fill during the event_
- **Files changed:** _Fill during the event_
- **Commit:** _Fill during the event_
- **Evidence:** _Fill during the event_
- **AI/computational assistance:** _Fill during the event_
- **Problems or limitations:** _Fill during the event_
- **Next action:** _Fill during the event_

### 15 November — Compare and Explain experience

- **Started:** _Fill during the event_
- **Finished:** _Fill during the event_
- **Team members:** _Fill during the event_
- **Goal:** Implement fixed-scale A/B comparison, the comprehension question, answer reveal, and transformation ledger.
- **Work completed:** _Fill during the event_
- **Files changed:** _Fill during the event_
- **Commit:** _Fill during the event_
- **Evidence:** _Fill during the event_
- **AI/computational assistance:** _Fill during the event_
- **Problems or limitations:** _Fill during the event_
- **Next action:** _Fill during the event_

### 15 November — Accessibility and user checks

- **Started:** _Fill during the event_
- **Finished:** _Fill during the event_
- **Team members:** _Fill during the event_
- **Goal:** Test keyboard operation, screen-reader output, mono playback, stopping audio, and unseen listening questions.
- **Work completed:** _Fill during the event_
- **Files changed:** _Fill during the event_
- **Commit:** _Fill during the event_
- **Evidence:** _Fill during the event_
- **AI/computational assistance:** _Fill during the event_
- **Problems or limitations:** _Fill during the event_
- **Next action:** _Fill during the event_

### 15 November — Submission build

- **Started:** _Fill during the event_
- **Finished:** _Fill during the event_
- **Team members:** _Fill during the event_
- **Goal:** Freeze, test, document, and submit the event build.
- **Work completed:** _Fill during the event_
- **Files changed:** _Fill during the event_
- **Final commit:** _Hash_
- **Release/archive SHA-256:** _Hash_
- **Live demo:** _URL_
- **Backup demo recording:** _URL_
- **Submission page:** _URL_
- **Known limitations:** _Fill during the event_

## Frame-to-sound verification record

Complete one row for every demonstrated frame.

| Frame ID | NASA source | Displayed date | Observation window | Projection | File hash | Regions | Valid pixels | Unclassified pixels | Mapping version | Ledger |
| --- | --- | --- | --- | --- | --- | --- | ---: | ---: | --- | --- |
| _Fill during event_ | _URL_ | _Date_ | _Window_ | _Projection_ | _SHA-256_ | _Masks_ | _Count_ | _Count_ | _Version_ | _Path_ |

## Accessibility and comprehension results

Do not invent results. Record raw counts and relevant testing conditions. A small pilot is formative evidence, not statistical validation.

| Participant | Setup and assistive technology | Core route completed independently? | Correct answers / trials | Replays | Blocking issue | Change made | Teach-back result |
| --- | --- | --- | ---: | ---: | --- | --- | --- |
| _Anonymous ID_ | _Device/browser/input_ | _Yes/No/With assistance_ | _x/6_ | _Count_ | _Issue_ | _Fix_ | _What the participant understood_ |

## AI and computational-assistance disclosure

For every tool used, record:

- Tool and model/version when known.
- The purpose of the assistance.
- Which code, writing, design, research, or debugging it influenced.
- How a team member reviewed and tested the result.
- What was rejected or corrected.

Do not paste secrets, personal participant information, or private credentials into this record.

## Event-build summary

Complete this at submission time.

### Reused from the pre-event baseline

- _List reused components honestly._

### Built or substantially changed during the official window

- _List changes supported by commits and evidence above._

### What the listener can now learn

- _State the question a listener can answer from sound._
- _State what the sound represents._
- _State what it does not establish._

### Scientific limits

- Frame-derived category coverage is not automatically geographic surface-area coverage.
- A rendered color category is not an exact recovery of the original measurement.
- Temperature anomaly is not absolute temperature.
- A selected-frame difference does not alone establish a trend, cause, or forecast.
- Sonification is a designed translation, not recorded planetary or weather audio.

### Final team attestation

> We have distinguished pre-event work from work completed during the official event window. The entries above reflect our actual development history to the best of our knowledge, and the cited evidence can be inspected by reviewers.

- **Team representative:** _Name_
- **Date and time:** _YYYY-MM-DD HH:MM timezone_
- **Other team members acknowledging:** _Names_
