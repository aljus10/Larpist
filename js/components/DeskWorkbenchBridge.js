// -------------------------------------------------------------
// EARTHTONE STUDIO - DESK WORKBENCH BRIDGE
// High-DPI Accessible DOM Control Station docked over Telemetry Monitor
// -------------------------------------------------------------

import { store, temperaturePoints, bands, categoryLabels } from '../core/JukeboxStore.js';
import { audioEngine } from '../core/AudioEngine.js';
import { frameClassifier } from '../core/FrameClassifier.js';
import { voiceGuide } from '../core/VoiceGuide.js';

export class DeskWorkbenchBridge {
  constructor(containerEl) {
    this.container = containerEl;
    this.historyPlaybackTimer = null;
    this.isScanning = false;

    this._render();
    this._bindEvents();
    this._bindStoreEvents();

    // Initial analysis for 1980
    this.updateAnalysis();
    this.drawChart();
  }

  _render() {
    this.container.innerHTML = `
      <div class="workbench-window">
        <header class="workbench-header">
          <div class="header-branding">
            <span class="live-dot" aria-hidden="true"></span>
            <strong>NASA Earth Information Jukebox</strong>
            <small>SVS 5450 Atlas · GISTEMP v4</small>
          </div>
          <div class="header-actions">
            <!-- Projection toggle: Sphere vs Flat -->
            <div class="projection-toggle" role="group" aria-label="Hologram projection mode">
              <button type="button" id="toggle-sphere" class="btn-toggle active" aria-pressed="true">
                <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8.5"/><path d="M3.8 12h16.4M12 3.5c2.4 2.3 3.6 5.1 3.6 8.5S14.4 18.2 12 20.5"/></svg>
                <span>3D Globe</span>
              </button>
              <button type="button" id="toggle-flat" class="btn-toggle" aria-pressed="false">
                <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><path d="M3.5 5.5h17v13h-17zM8 5.5v13m8-13v13M3.5 10h17m-17 4h17"/></svg>
                <span>Flat Map</span>
              </button>
            </div>

            <!-- Voice guide opt-in toggle -->
            <button type="button" id="btn-voice-toggle" class="btn-action" aria-pressed="false" title="Toggle Dr. Joe voice narration (Key: V)">
              <span class="voice-icon" aria-hidden="true">🎙️</span>
              <span id="voice-label">Voice Guide: Off</span>
            </button>

            <!-- Mute toggle -->
            <button type="button" id="btn-mute-toggle" class="btn-action" aria-pressed="false" title="Toggle audio sound (Key: M)">
              <span id="mute-label">Audio On</span>
            </button>
          </div>
        </header>

        <!-- Mode navigation tabs -->
        <nav class="workbench-tabs" role="tablist" aria-label="Listening Modes">
          <button type="button" role="tab" id="tab-history" class="tab-btn active" aria-selected="true" aria-controls="panel-history">
            <span>1. Historical Timeline</span>
          </button>
          <button type="button" role="tab" id="tab-frame" class="tab-btn" aria-selected="false" aria-controls="panel-frame">
            <span>2. Geographic Frame Scan</span>
          </button>
          <button type="button" role="tab" id="tab-learn" class="tab-btn" aria-selected="false" aria-controls="panel-learn">
            <span>3. Ear-Training Lab</span>
          </button>
        </nav>

        <!-- PANEL 1: HISTORY -->
        <section id="panel-history" class="workbench-panel" role="tabpanel" aria-labelledby="tab-history">
          <div class="readouts-grid">
            <div class="readout-card">
              <span class="readout-lbl">Selected Year</span>
              <strong id="rd-year" class="readout-val">1980</strong>
            </div>
            <div class="readout-card">
              <span class="readout-lbl">Global Anomaly</span>
              <strong id="rd-anomaly" class="readout-val warm-val">+0.26 °C</strong>
            </div>
            <div class="readout-card">
              <span class="readout-lbl">Synthesized Pitch</span>
              <strong id="rd-pitch" class="readout-val cyan-val">294 Hz</strong>
            </div>
          </div>

          <div class="chart-container" aria-label="Historical anomaly chart">
            <svg id="workbench-chart" viewBox="0 0 900 130" role="img" preserveAspectRatio="none">
              <title>Global Temperature Anomaly 1980–2025</title>
            </svg>
            <div class="chart-axis-labels" aria-hidden="true">
              <span>1980</span>
              <span>1990</span>
              <span>2000</span>
              <span>2010</span>
              <span>2025</span>
            </div>
          </div>

          <div class="scrubber-row">
            <label for="year-slider" class="sr-only">Move through historical years</label>
            <input type="range" id="year-slider" min="0" max="45" value="0" step="1" aria-label="Select year from 1980 to 2025">
          </div>

          <div class="transport-row">
            <button type="button" id="btn-prev-year" class="btn-secondary icon-btn" aria-label="Previous Year">←</button>
            <button type="button" id="btn-play-history" class="btn-primary">
              <span id="play-history-icon" aria-hidden="true">▶</span>
              <span id="play-history-label">Play 1980–2025</span>
            </button>
            <button type="button" id="btn-next-year" class="btn-secondary icon-btn" aria-label="Next Year">→</button>
            <button type="button" id="btn-play-single" class="btn-secondary">Play Year Note</button>
          </div>
        </section>

        <!-- PANEL 2: FRAME SCAN -->
        <section id="panel-frame" class="workbench-panel" role="tabpanel" aria-labelledby="tab-frame" hidden>
          <div class="frame-intro">
            <p>Texture identity indicates category: airy low tones for <strong>Cooler</strong>, steady tone for <strong>Near Reference</strong>, and bright plucked notes for <strong>Warmer</strong>. Texture duration reflects categorized image coverage.</p>
          </div>

          <div class="latitude-selector" role="group" aria-label="Select latitude band to sonify">
            ${bands.map((b, i) => `
              <button type="button" class="btn-band ${i === 0 ? 'active' : ''}" data-band="${i}">
                <strong>${b.name}</strong>
                <small>${b.range}</small>
              </button>
            `).join('')}
          </div>

          <div class="band-analysis-card">
            <div class="band-header">
              <span id="band-name-lbl">Arctic (60°–90°N)</span>
              <span id="band-samples-lbl">Sampling image pixels…</span>
            </div>
            <div id="category-bars-wrap" class="category-bars"></div>
          </div>

          <div class="transport-row">
            <button type="button" id="btn-scan-frame" class="btn-primary">
              <span>⚡ Scan North to South</span>
            </button>
            <button type="button" id="btn-play-band" class="btn-secondary">
              <span>Play Selected Region</span>
            </button>
          </div>
        </section>

        <!-- PANEL 3: LEARN EAR-TRAINING -->
        <section id="panel-learn" class="workbench-panel" role="tabpanel" aria-labelledby="tab-learn" hidden>
          <div class="learn-challenge-box">
            <h3>Listening Challenge: Arctic Warming</h3>
            <p>Compare the Arctic pattern between 1980 and 2024. Listen for which year contains more bright, plucked warmer-category textures.</p>
            <button type="button" id="btn-learn-listen" class="btn-primary full-btn">
              <span>▶ Listen to A (1980), then B (2024)</span>
            </button>

            <fieldset id="learn-answers-group" class="learn-answers" disabled>
              <legend>Which frame has greater warmer-category coverage?</legend>
              <button type="button" class="btn-answer" data-answer="1980">A · 1980</button>
              <button type="button" class="btn-answer" data-answer="2024">B · 2024</button>
            </fieldset>

            <div id="learn-feedback" class="learn-feedback" role="status">
              Listen to the two frames first, then select your answer.
            </div>
          </div>
        </section>

        <!-- Status footer -->
        <footer class="workbench-footer">
          <span id="wb-status" role="status" aria-live="polite">Ready. Historical timeline active.</span>
        </footer>
      </div>
    `;
  }

  _bindEvents() {
    // Mode tab switching
    const tabs = {
      history: this.container.querySelector('#tab-history'),
      frame: this.container.querySelector('#tab-frame'),
      learn: this.container.querySelector('#tab-learn')
    };

    Object.entries(tabs).forEach(([mode, tabEl]) => {
      tabEl.addEventListener('click', () => {
        store.setMode(mode, 'ui');
      });
    });

    // Projection toggle
    const btnSphere = this.container.querySelector('#toggle-sphere');
    const btnFlat = this.container.querySelector('#toggle-flat');

    btnSphere.addEventListener('click', () => store.setProjection('sphere', 'ui'));
    btnFlat.addEventListener('click', () => store.setProjection('flat', 'ui'));

    // Voice toggle
    const btnVoice = this.container.querySelector('#btn-voice-toggle');
    btnVoice.addEventListener('click', () => {
      const active = store.toggleVoice();
      btnVoice.setAttribute('aria-pressed', String(active));
      this.container.querySelector('#voice-label').textContent = active ? 'Voice Guide: On' : 'Voice Guide: Off';
    });

    // Mute toggle
    const btnMute = this.container.querySelector('#btn-mute-toggle');
    btnMute.addEventListener('click', () => {
      const muted = store.toggleMute();
      btnMute.setAttribute('aria-pressed', String(muted));
      this.container.querySelector('#mute-label').textContent = muted ? 'Audio Muted' : 'Audio On';
    });

    // Scrubber
    const slider = this.container.querySelector('#year-slider');
    slider.addEventListener('input', (e) => {
      store.setYear(Number(e.target.value), 'ui');
    });

    slider.addEventListener('change', () => {
      audioEngine.playHistoryTone(store.currentPoint.value, 0.45);
    });

    // Prev / Next year
    this.container.querySelector('#btn-prev-year').addEventListener('click', () => {
      store.setYear(store.state.yearIndex - 1, 'ui');
      audioEngine.playHistoryTone(store.currentPoint.value, 0.35);
    });

    this.container.querySelector('#btn-next-year').addEventListener('click', () => {
      store.setYear(store.state.yearIndex + 1, 'ui');
      audioEngine.playHistoryTone(store.currentPoint.value, 0.35);
    });

    // Play single year note
    this.container.querySelector('#btn-play-single').addEventListener('click', () => {
      audioEngine.playHistoryTone(store.currentPoint.value, 0.6);
    });

    // Play history sequence
    this.container.querySelector('#btn-play-history').addEventListener('click', () => {
      this.toggleHistoryPlayback();
    });

    // Band buttons
    this.container.querySelectorAll('[data-band]').forEach((btn) => {
      btn.addEventListener('click', () => {
        store.selectBand(Number(btn.dataset.band), 'ui');
      });
    });

    // Scan frame north to south
    this.container.querySelector('#btn-scan-frame').addEventListener('click', () => {
      this.scanNorthToSouth();
    });

    // Play selected band
    this.container.querySelector('#btn-play-band').addEventListener('click', async () => {
      const vectors = await frameClassifier.analyzeYear(store.currentPoint.year);
      const vec = vectors[store.state.bandIndex];
      audioEngine.playBandPattern(vec, store.state.stateToken);
    });

    // Learn challenge buttons
    this.container.querySelector('#btn-learn-listen').addEventListener('click', () => {
      this.runLearnComparison();
    });

    this.container.querySelectorAll('[data-answer]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.verifyLearnAnswer(btn.dataset.answer);
      });
    });

    // Chart click-to-scrub
    const chartSvg = this.container.querySelector('#workbench-chart');
    chartSvg.addEventListener('click', (e) => {
      const rect = chartSvg.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const yearIdx = Math.round(ratio * (temperaturePoints.length - 1));
      store.setYear(yearIdx, 'ui');
      audioEngine.playHistoryTone(store.currentPoint.value, 0.4);
    });

    // Keyboard shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'v' || e.key === 'V') {
        btnVoice.click();
      } else if (e.key === 'm' || e.key === 'M') {
        btnMute.click();
      } else if (e.key === ' ') {
        e.preventDefault();
        this.toggleHistoryPlayback();
      } else if (e.key === 'ArrowLeft') {
        store.setYear(store.state.yearIndex - 1, 'ui');
      } else if (e.key === 'ArrowRight') {
        store.setYear(store.state.yearIndex + 1, 'ui');
      } else if (e.key === 'Escape') {
        store.stopPlayback();
        audioEngine.stopAll();
      }
    });
  }

  _bindStoreEvents() {
    store.addEventListener('yearChange', (e) => {
      const { point, origin } = e.detail;
      this.container.querySelector('#rd-year').textContent = point.year;
      this.container.querySelector('#rd-anomaly').textContent = `${point.value >= 0 ? '+' : ''}${point.value.toFixed(2)} °C`;
      this.container.querySelector('#rd-pitch').textContent = `${Math.round(audioEngine.historyFrequency(point.value))} Hz`;

      const slider = this.container.querySelector('#year-slider');
      if (slider && origin !== 'ui') slider.value = store.state.yearIndex;

      this.drawChart();
      this.updateAnalysis();
    });

    store.addEventListener('bandChange', (e) => {
      const { bandIndex, band } = e.detail;
      this.container.querySelectorAll('[data-band]').forEach((btn) => {
        btn.classList.toggle('active', Number(btn.dataset.band) === bandIndex);
      });
      const lbl = this.container.querySelector('#band-name-lbl');
      if (lbl) lbl.textContent = `${band.name} (${band.range})`;
      this.updateAnalysis();
    });

    store.addEventListener('projectionChange', (e) => {
      const isSphere = e.detail.projection === 'sphere';
      const btnSphere = this.container.querySelector('#toggle-sphere');
      const btnFlat = this.container.querySelector('#toggle-flat');
      if (btnSphere && btnFlat) {
        btnSphere.classList.toggle('active', isSphere);
        btnSphere.setAttribute('aria-pressed', String(isSphere));
        btnFlat.classList.toggle('active', !isSphere);
        btnFlat.setAttribute('aria-pressed', String(!isSphere));
      }
    });

    store.addEventListener('modeChange', (e) => {
      const mode = e.detail.mode;
      ['history', 'frame', 'learn'].forEach((m) => {
        const tab = this.container.querySelector(`#tab-${m}`);
        const panel = this.container.querySelector(`#panel-${m}`);
        if (tab && panel) {
          const isActive = m === mode;
          tab.classList.toggle('active', isActive);
          tab.setAttribute('aria-selected', String(isActive));
          panel.hidden = !isActive;
        }
      });
      this.container.querySelector('#wb-status').textContent = `Mode switched to ${mode.toUpperCase()}.`;
    });

    store.addEventListener('playbackChange', (e) => {
      const label = this.container.querySelector('#play-history-label');
      const icon = this.container.querySelector('#play-history-icon');
      if (label && icon) {
        if (e.detail.isPlaying) {
          icon.textContent = '■';
          label.textContent = 'Stop History';
        } else {
          icon.textContent = '▶';
          label.textContent = 'Play 1980–2025';
        }
      }
    });
  }

  async updateAnalysis() {
    try {
      const vectors = await frameClassifier.analyzeYear(store.currentPoint.year);
      const vec = vectors[store.state.bandIndex];
      const wrap = this.container.querySelector('#category-bars-wrap');
      const sampleLbl = this.container.querySelector('#band-samples-lbl');

      if (sampleLbl) {
        sampleLbl.textContent = `${Math.round(vec.valid).toLocaleString()} sampled pixels`;
      }

      if (wrap) {
        wrap.innerHTML = ['cool', 'reference', 'warm'].map((cat) => {
          const pct = ((vec[cat] || 0) * 100).toFixed(1);
          return `
            <div class="cat-bar-row">
              <span class="cat-bar-name">${categoryLabels[cat]}</span>
              <div class="cat-bar-track">
                <div class="cat-bar-fill fill-${cat}" style="width: ${pct}%"></div>
              </div>
              <span class="cat-bar-pct">${Math.round(pct)}%</span>
            </div>
          `;
        }).join('');
      }
    } catch (err) {
      console.warn('Analysis error:', err);
    }
  }

  drawChart() {
    const svg = this.container.querySelector('#workbench-chart');
    if (!svg) return;

    const width = 900;
    const height = 130;
    const pad = 12;
    const minVal = 0.0;
    const maxVal = 1.35;

    const x = (idx) => pad + (idx / (temperaturePoints.length - 1)) * (width - pad * 2);
    const y = (val) => height - pad - ((val - minVal) / (maxVal - minVal)) * (height - pad * 2);

    const pathData = temperaturePoints
      .map((p, idx) => `${idx === 0 ? 'M' : 'L'}${x(idx).toFixed(1)},${y(p.value).toFixed(1)}`)
      .join(' ');

    const areaData = `${pathData} L${x(temperaturePoints.length - 1)},${height - pad} L${x(0)},${height - pad} Z`;
    const curIdx = store.state.yearIndex;
    const curPoint = store.currentPoint;

    svg.innerHTML = `
      <defs>
        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#cc4d2f" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="#cc4d2f" stop-opacity="0.02"/>
        </linearGradient>
      </defs>
      <path d="${areaData}" fill="url(#chartGradient)"/>
      <path d="${pathData}" fill="none" stroke="#cc4d2f" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="${x(curIdx)}" x2="${x(curIdx)}" y1="${pad}" y2="${height - pad}" stroke="#ffffff" stroke-width="1.5" stroke-dasharray="3,3"/>
      <circle cx="${x(curIdx)}" cy="${y(curPoint.value)}" r="5.5" fill="#f4f1e8" stroke="#101b27" stroke-width="2.5"/>
    `;
  }

  async toggleHistoryPlayback() {
    if (store.state.isPlaying) {
      store.stopPlayback();
      return;
    }

    store.setPlaying(true);
    const token = store.state.stateToken;

    for (let i = store.state.yearIndex; i < temperaturePoints.length; i++) {
      if (token !== store.state.stateToken || !store.state.isPlaying) break;
      store.setYear(i, 'playback');
      await audioEngine.playHistoryTone(temperaturePoints[i].value, 0.28);
      await new Promise((r) => setTimeout(r, 340));
    }

    if (token === store.state.stateToken) {
      store.setPlaying(false);
      voiceGuide.announce('Historical sonification playback complete.');
    }
  }

  async scanNorthToSouth() {
    if (this.isScanning) return;
    this.isScanning = true;
    store.stopPlayback();
    const token = store.state.stateToken;

    try {
      const vectors = await frameClassifier.analyzeYear(store.currentPoint.year);
      voiceGuide.speak(`Scanning ${store.currentPoint.year} from Arctic to Antarctic.`);

      for (let i = 0; i < bands.length; i++) {
        if (token !== store.state.stateToken) break;
        store.selectBand(i, 'scan');
        const progressY = (bands[i].start + bands[i].end) / 2;
        store.setScanning(true, progressY);

        await audioEngine.playBandPattern(vectors[i], token);
        await new Promise((r) => setTimeout(r, 140));
      }
    } finally {
      this.isScanning = false;
      store.setScanning(false);
    }
  }

  async runLearnComparison() {
    const token = store.state.stateToken;
    const answers = this.container.querySelector('#learn-answers-group');
    const feedback = this.container.querySelector('#learn-feedback');
    if (answers) answers.disabled = true;

    feedback.textContent = 'Listening to Frame A: 1980 Arctic…';
    voiceGuide.speak('Frame A, 1980 Arctic.');

    const [vecs1980, vecs2024] = await Promise.all([
      frameClassifier.analyzeYear(1980),
      frameClassifier.analyzeYear(2024)
    ]);

    await audioEngine.playBandPattern(vecs1980[0], token);
    await new Promise((r) => setTimeout(r, 550));
    if (token !== store.state.stateToken) return;

    feedback.textContent = 'Listening to Frame B: 2024 Arctic…';
    voiceGuide.speak('Frame B, 2024 Arctic.');
    await audioEngine.playBandPattern(vecs2024[0], token);

    if (token === store.state.stateToken) {
      if (answers) answers.disabled = false;
      feedback.textContent = 'Which frame had more warmer-category coverage? Select A or B.';
      voiceGuide.speak('Now select which frame had greater warming coverage.');
    }
  }

  verifyLearnAnswer(selectedYear) {
    const isCorrect = selectedYear === '2024';
    const feedback = this.container.querySelector('#learn-feedback');
    if (feedback) {
      feedback.className = `learn-feedback ${isCorrect ? 'feedback-correct' : 'feedback-wrong'}`;
      feedback.textContent = isCorrect
        ? '✓ Correct! 2024 shows significantly higher warmer-category plucked duration than 1980.'
        : '✕ Not quite. 2024 contains far greater warm anomaly coverage than 1980.';
      voiceGuide.speak(feedback.textContent);
    }
  }
}
