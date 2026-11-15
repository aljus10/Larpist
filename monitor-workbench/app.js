const temperaturePoints = EARTH_DATA.points.filter(point => point.year <= 2025).map((point, index) => ({
  ...point,
  frame: point.year < 2025 ? 594 + index * 6 : null
}));
const LAST_REGIONAL_YEAR = temperaturePoints.at(-1).year;

const bands = [
  {name:'Arctic',range:'60°–90°N',start:0,end:1/6},
  {name:'N. Mid-Latitudes',range:'30°–60°N',start:1/6,end:1/3},
  {name:'Tropics',range:'30°S–30°N',start:1/3,end:2/3},
  {name:'S. Mid-Latitudes',range:'30°–60°S',start:2/3,end:5/6},
  {name:'Antarctic',range:'60°–90°S',start:5/6,end:1}
];

const categoryLabels = {
  cold: 'Cold',
  normal: 'Normal',
  warm: 'Warm',
  hot: 'Hot',
  cool: 'Cold',
  reference: 'Normal'
};
const analysisCache = new Map();
const globeTextureCache = new Map();
const state = {
  yearIndex:0,
  bandIndex:0,
  mode:'history',
  section:'workbench',
  view:'flat',
  temperature:false,
  globeRotation:0,
  muted:false,
  playing:false,
  token:0,
  globeFrame:0,
  masterVolume:0.75,
  durationScale:1.00,
  foleyEnabled:true,
  activeThemeKey:null,
  activeThemeUntil:0
};

const THERMAL_META = {
  cold: {
    label: 'Cold State',
    shortLabel: 'COLD',
    band: '1.5–4 kHz',
    color: '#38bdf8',
    glow: 'rgba(56, 189, 248, 0.85)',
    fillTop: 'rgba(56, 189, 248, 0.45)',
    fillBottom: 'rgba(56, 189, 248, 0.02)',
  },
  normal: {
    label: 'Normal Baseline',
    shortLabel: 'NORMAL',
    band: '400–900 Hz',
    color: '#cbd5e1',
    glow: 'rgba(203, 213, 225, 0.75)',
    fillTop: 'rgba(203, 213, 225, 0.35)',
    fillBottom: 'rgba(203, 213, 225, 0.02)',
  },
  warm: {
    label: 'Warm State',
    shortLabel: 'WARM',
    band: '150–450 Hz',
    color: '#f59e0b',
    glow: 'rgba(245, 158, 11, 0.85)',
    fillTop: 'rgba(245, 158, 11, 0.45)',
    fillBottom: 'rgba(245, 158, 11, 0.02)',
  },
  hot: {
    label: 'Hot / Scalding',
    shortLabel: 'HOT',
    band: '2–8 kHz Sizzle',
    color: '#f97316',
    glow: 'rgba(249, 115, 22, 0.9)',
    fillTop: 'rgba(249, 115, 22, 0.5)',
    fillBottom: 'rgba(249, 115, 22, 0.02)',
  }
};

let audioContext = null;
let masterGain = null;
let compressor = null;
let analyser = null;
let synthAssets = null;
const activeSources = new Set();

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const clamp = (value,min,max)=>Math.max(min,Math.min(max,value));
const sleep = ms => new Promise(resolve=>setTimeout(resolve,ms));
const frameImagePath = year => `../assets/eic/${year}.webp`;
const signed = value => `${value>=0?'+':''}${value.toFixed(2)}`;
const currentPoint = ()=>temperaturePoints[state.yearIndex];
const isRegionalAvailable = year => Number.isInteger(year) && year>=temperaturePoints[0].year && year<=LAST_REGIONAL_YEAR;

function setStatus(message){
  const el = $('#live-status');
  if (el) el.textContent = message;
}

let lastAnnounceTime = 0;
function announceA11y(message, { assertive = false, throttleMs = 0 } = {}) {
  const now = performance.now();
  if (throttleMs > 0 && now - lastAnnounceTime < throttleMs) return;
  lastAnnounceTime = now;

  const targetId = assertive ? '#a11y-alert-region' : '#a11y-live-region';
  const el = $(targetId) || $('#live-status');
  if (el) {
    el.textContent = '';
    setTimeout(() => {
      el.textContent = message;
    }, 40);
  }
}

function notifyParentScan(scanning, bandIndex = state.bandIndex, customLatRatio = null) {
  if (window.parent && window.parent !== window) {
    const band = bands[bandIndex] || bands[0];
    const point = currentPoint();
    const latRatio = typeof customLatRatio === 'number' ? customLatRatio : (band.start + band.end) / 2;
    window.parent.postMessage({
      type: 'MONITOR_SCAN_UPDATE',
      scanning: scanning && isRegionalAvailable(point.year),
      year: point.year,
      value: point.value,
      regionalAvailable: isRegionalAvailable(point.year),
      bandIndex,
      bandName: band.name,
      latRatio
    }, '*');
  }
}

function createSynthAssets(ctx) {
  const sr = ctx.sampleRate;
  const noiseLen = Math.floor(sr * 2.5);
  const whiteBuffer = ctx.createBuffer(2, noiseLen, sr);
  for (let ch = 0; ch < 2; ch++) {
    const data = whiteBuffer.getChannelData(ch);
    for (let i = 0; i < noiseLen; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  }

  const pinkBuffer = ctx.createBuffer(2, noiseLen, sr);
  for (let ch = 0; ch < 2; ch++) {
    const data = pinkBuffer.getChannelData(ch);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < noiseLen; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
  }

  const irDuration = 1.4;
  const irLen = Math.floor(sr * irDuration);
  const coldIrBuffer = ctx.createBuffer(2, irLen, sr);
  for (let ch = 0; ch < 2; ch++) {
    const data = coldIrBuffer.getChannelData(ch);
    let lastSample = 0;
    for (let i = 0; i < irLen; i++) {
      const t = i / sr;
      const env = Math.pow(1 - i / irLen, 3.4) * Math.exp(-t * 3.2);
      const raw = Math.random() * 2 - 1;
      const hp = raw - 0.82 * lastSample;
      lastSample = raw;
      const shimmer = 0.85 + 0.15 * Math.sin(2 * Math.PI * (ch === 0 ? 1960 : 2890) * t * 0.02);
      data[i] = hp * env * shimmer * 0.55;
    }
    const taps = ch === 0 ? [0.011, 0.024, 0.041] : [0.014, 0.029, 0.047];
    taps.forEach((tapSec, idx) => {
      const idxPos = Math.floor(tapSec * sr);
      if (idxPos < irLen) {
        data[idxPos] += (0.28 / (idx + 1)) * (idx % 2 === 0 ? 1 : -1);
      }
    });
  }

  const curveSamples = 2048;
  const warmCurve = new Float32Array(curveSamples);
  for (let i = 0; i < curveSamples; i++) {
    const x = (i * 2) / curveSamples - 1;
    warmCurve[i] = Math.tanh(1.35 * x + 0.18 * x * x) / Math.tanh(1.53);
  }

  return { whiteBuffer, pinkBuffer, coldIrBuffer, warmCurve };
}

async function ensureAudio(){
  if(!audioContext){
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if(!AudioCtor){ setStatus('Web Audio API unavailable.'); return false; }
    audioContext = new AudioCtor();

    masterGain = audioContext.createGain();
    masterGain.gain.value = state.muted ? 0 : state.masterVolume;

    compressor = audioContext.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-10, audioContext.currentTime);
    compressor.knee.setValueAtTime(14, audioContext.currentTime);
    compressor.ratio.setValueAtTime(6, audioContext.currentTime);
    compressor.attack.setValueAtTime(0.003, audioContext.currentTime);
    compressor.release.setValueAtTime(0.15, audioContext.currentTime);

    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.78;
    analyser.minDecibels = -92;
    analyser.maxDecibels = -12;

    masterGain.connect(compressor);
    compressor.connect(analyser);
    analyser.connect(audioContext.destination);

    synthAssets = createSynthAssets(audioContext);
  }
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: 'STOP_WELCOME_AUDIO' }, '*');
  }
  if(audioContext.state === 'suspended'){
    audioContext.resume().catch(()=>{});
  }
  return true;
}

function trackSource(source){
  activeSources.add(source);
  source.addEventListener('ended',()=>activeSources.delete(source),{once:true});
  return source;
}

function setPlayHistoryButtonState(playing){
  const btn = $('#play-history');
  if (!btn) return;
  const spans = btn.querySelectorAll('span');
  if (spans.length >= 2) {
    spans[0].textContent = playing ? '■' : '▶';
    spans[1].textContent = playing ? ' Stop' : 'Play history';
  } else {
    btn.textContent = playing ? '■ Stop' : '▶ Play history';
  }
}

function stopAudio(update=true){
  state.token+=1;
  showQuizPlayback();
  state.playing=false;
  stopThermalLoop();
  activeSources.forEach(source=>{try{source.stop();}catch{}});
  activeSources.clear();
  setPlayHistoryButtonState(false);
  $('#scan-rule').classList.remove('scanning');
  document.body.classList.remove('busy');
  notifyParentScan(false);
  if(update) setStatus('Playback stopped.');
}

function envelope(gain,start,duration,level=.16){
  gain.gain.setValueAtTime(.0001,start);
  gain.gain.exponentialRampToValueAtTime(level,start+.02);
  gain.gain.exponentialRampToValueAtTime(.0001,start+Math.max(.06,duration));
}

function historyFrequency(value){ return clamp(180*Math.pow(4,(value+.8)/3),150,850); }

function setVisualizerActiveTheme(key, durationMs) {
  state.activeThemeKey = key;
  state.activeThemeUntil = performance.now() + durationMs;
  updateVisualizerHeader(key);
}

function updateVisualizerHeader(key) {
  const dot = $('#vizStateIndicator');
  const label = $('#vizActiveLabel');
  if (!dot || !label) return;

  if (typeof activeThermalLoops !== 'undefined' && activeThermalLoops.size > 1) {
    const keys = [...activeThermalLoops.keys()];
    const labels = keys.map(k => THERMAL_META[k]?.shortLabel || k.toUpperCase()).join(' + ');
    dot.style.backgroundColor = '#4df3ff';
    dot.style.boxShadow = '0 0 12px rgba(77, 243, 255, 0.9)';
    label.textContent = `POLYPHONIC MIX: ${labels}`;
    label.style.color = '#4df3ff';
    return;
  }

  if (!key) {
    dot.style.backgroundColor = '#64748b';
    dot.style.boxShadow = 'none';
    label.textContent = 'IDLE MONITOR';
    label.style.color = '#94a3b8';
    return;
  }

  const meta = THERMAL_META[key];
  if (!meta) return;
  dot.style.backgroundColor = meta.color;
  dot.style.boxShadow = `0 0 10px ${meta.glow}`;
  label.textContent = `${meta.shortLabel} · ${meta.band}`;
  label.style.color = meta.color;
}

/* -------------------------------------------------------------
   THE FOUR THERMAL PSYCHOACOUSTIC SYNTHESIS VOICES
   ------------------------------------------------------------- */

/**
 * 1. COLD (1.5–4 kHz, Crystalline / Glassy)
 */
function synthesizeCold(ctx, destination, startTime, assets, opts) {
  const scale = opts.durationScale;
  const foley = opts.foleyEnabled;

  const voiceBus = ctx.createGain();
  voiceBus.gain.setValueAtTime(0.85, startTime);

  const hpf = ctx.createBiquadFilter();
  hpf.type = 'highpass';
  hpf.frequency.setValueAtTime(1250, startTime);
  hpf.Q.setValueAtTime(0.75, startTime);

  const shelf = ctx.createBiquadFilter();
  shelf.type = 'highshelf';
  shelf.frequency.setValueAtTime(2800, startTime);
  shelf.gain.setValueAtTime(2.5, startTime);

  const dryGain = ctx.createGain();
  dryGain.gain.setValueAtTime(0.78, startTime);

  const convolver = ctx.createConvolver();
  convolver.buffer = assets.coldIrBuffer;

  const wetGain = ctx.createGain();
  wetGain.gain.setValueAtTime(0.42, startTime);

  voiceBus.connect(hpf);
  hpf.connect(shelf);
  shelf.connect(dryGain);
  dryGain.connect(destination);

  shelf.connect(convolver);
  convolver.connect(wetGain);
  wetGain.connect(destination);

  const partials = [
    { freq: 1960, amp: 0.34, decay: 0.52 * scale },
    { freq: 2890, amp: 0.24, decay: 0.42 * scale },
    { freq: 3920, amp: 0.16, decay: 0.32 * scale },
    { freq: 5240, amp: 0.06, decay: 0.18 * scale },
  ];

  partials.forEach((p) => {
    const osc = trackSource(ctx.createOscillator());
    osc.type = 'sine';
    osc.frequency.setValueAtTime(p.freq, startTime);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, startTime);
    g.gain.linearRampToValueAtTime(p.amp, startTime + 0.0025);
    g.gain.exponentialRampToValueAtTime(0.0001, startTime + p.decay + 0.05);

    osc.connect(g);
    g.connect(voiceBus);
    osc.start(startTime);
    osc.stop(startTime + p.decay + 0.08);
  });

  const clickSrc = trackSource(ctx.createBufferSource());
  clickSrc.buffer = assets.whiteBuffer;
  const clickBp = ctx.createBiquadFilter();
  clickBp.type = 'bandpass';
  clickBp.frequency.setValueAtTime(3400, startTime);
  clickBp.Q.setValueAtTime(3.2, startTime);

  const clickGain = ctx.createGain();
  clickGain.gain.setValueAtTime(0.0001, startTime);
  clickGain.gain.linearRampToValueAtTime(0.45, startTime + 0.0015);
  clickGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.012);

  clickSrc.connect(clickBp);
  clickBp.connect(clickGain);
  clickGain.connect(voiceBus);
  clickSrc.start(startTime, 0.1, 0.02);

  const pingOsc = trackSource(ctx.createOscillator());
  pingOsc.type = 'sine';
  pingOsc.frequency.setValueAtTime(4650, startTime);
  pingOsc.frequency.exponentialRampToValueAtTime(2400, startTime + 0.011);
  const pingGain = ctx.createGain();
  pingGain.gain.setValueAtTime(0.22, startTime);
  pingGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.014);
  pingOsc.connect(pingGain);
  pingGain.connect(voiceBus);
  pingOsc.start(startTime);
  pingOsc.stop(startTime + 0.018);

  if (foley) {
    const clinkOffsets = [0.004, 0.062 * Math.min(scale, 1.25)];
    const clinkFreqs = [
      [2580, 3690],
      [2840, 4120],
    ];
    clinkOffsets.forEach((offset, idx) => {
      const t0 = startTime + offset;
      const n = trackSource(ctx.createBufferSource());
      n.buffer = assets.whiteBuffer;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(clinkFreqs[idx][1], t0);
      bp.Q.setValueAtTime(10.0, t0);
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.0001, t0);
      ng.gain.linearRampToValueAtTime(idx === 0 ? 0.38 : 0.28, t0 + 0.001);
      ng.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.018);
      n.connect(bp);
      bp.connect(ng);
      ng.connect(voiceBus);
      n.start(t0, 0.3 + idx * 0.2, 0.025);

      const tick = trackSource(ctx.createOscillator());
      tick.type = 'sine';
      tick.frequency.setValueAtTime(clinkFreqs[idx][0], t0);
      const tg = ctx.createGain();
      tg.gain.setValueAtTime(0.0001, t0);
      tg.gain.linearRampToValueAtTime(idx === 0 ? 0.16 : 0.12, t0 + 0.0015);
      tg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.045);
      tick.connect(tg);
      tg.connect(voiceBus);
      tick.start(t0);
      tick.stop(t0 + 0.055);
    });
  }

  return Math.max(0.9, 0.65 * scale + 0.85);
}

/**
 * 2. NORMAL (400–900 Hz, Neutral / Dry Baseline)
 */
function synthesizeNormal(ctx, destination, startTime, assets, opts) {
  const scale = opts.durationScale;
  const foley = opts.foleyEnabled;

  const voiceBus = ctx.createGain();
  voiceBus.gain.setValueAtTime(0.9, startTime);

  const hpf = ctx.createBiquadFilter();
  hpf.type = 'highpass';
  hpf.frequency.setValueAtTime(300, startTime);
  hpf.Q.setValueAtTime(0.7, startTime);

  const lpf = ctx.createBiquadFilter();
  lpf.type = 'lowpass';
  lpf.frequency.setValueAtTime(1250, startTime);
  lpf.Q.setValueAtTime(0.7, startTime);

  voiceBus.connect(hpf);
  hpf.connect(lpf);
  lpf.connect(destination);

  const attack = 0.010;
  const decay = 0.22 * (0.65 + 0.35 * scale);

  const fundOsc = trackSource(ctx.createOscillator());
  fundOsc.type = 'sine';
  fundOsc.frequency.setValueAtTime(587.33, startTime);

  const fundGain = ctx.createGain();
  fundGain.gain.setValueAtTime(0.0001, startTime);
  fundGain.gain.linearRampToValueAtTime(0.46, startTime + attack);
  fundGain.gain.exponentialRampToValueAtTime(0.0001, startTime + attack + decay);

  fundOsc.connect(fundGain);
  fundGain.connect(voiceBus);
  fundOsc.start(startTime);
  fundOsc.stop(startTime + attack + decay + 0.03);

  const overOsc = trackSource(ctx.createOscillator());
  overOsc.type = 'sine';
  overOsc.frequency.setValueAtTime(880, startTime);

  const overGain = ctx.createGain();
  overGain.gain.setValueAtTime(0.0001, startTime);
  overGain.gain.linearRampToValueAtTime(0.11, startTime + 0.006);
  overGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.065 * scale);

  overOsc.connect(overGain);
  overGain.connect(voiceBus);
  overOsc.start(startTime);
  overOsc.stop(startTime + 0.08 * scale + 0.02);

  const bodyOsc = trackSource(ctx.createOscillator());
  bodyOsc.type = 'sine';
  bodyOsc.frequency.setValueAtTime(440, startTime);
  const bodyGain = ctx.createGain();
  bodyGain.gain.setValueAtTime(0.0001, startTime);
  bodyGain.gain.linearRampToValueAtTime(0.08, startTime + attack);
  bodyGain.gain.exponentialRampToValueAtTime(0.0001, startTime + attack + decay * 0.7);
  bodyOsc.connect(bodyGain);
  bodyGain.connect(voiceBus);
  bodyOsc.start(startTime);
  bodyOsc.stop(startTime + attack + decay);

  if (foley) {
    const knock = trackSource(ctx.createBufferSource());
    knock.buffer = assets.pinkBuffer;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(640, startTime);
    bp.Q.setValueAtTime(2.6, startTime);

    const kg = ctx.createGain();
    kg.gain.setValueAtTime(0.0001, startTime);
    kg.gain.linearRampToValueAtTime(0.32, startTime + 0.004);
    kg.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.028);

    knock.connect(bp);
    bp.connect(kg);
    kg.connect(voiceBus);
    knock.start(startTime, 0.2, 0.04);
  }

  return Math.max(0.45, attack + decay + 0.12);
}

/**
 * 3. WARM (150–450 Hz, Rich Rhodes Swell / Tube Warmth)
 */
function synthesizeWarm(ctx, destination, startTime, assets, opts) {
  const scale = opts.durationScale;
  const foley = opts.foleyEnabled;

  const attack = 0.20 * (0.7 + 0.3 * scale);
  const decay = 0.90 * scale;
  const total = attack + decay;

  const voiceBus = ctx.createGain();
  voiceBus.gain.setValueAtTime(0.92, startTime);

  const shaper = ctx.createWaveShaper();
  shaper.curve = assets.warmCurve;
  shaper.oversample = '2x';

  const lpf1 = ctx.createBiquadFilter();
  lpf1.type = 'lowpass';
  lpf1.frequency.setValueAtTime(420, startTime);
  lpf1.frequency.linearRampToValueAtTime(740, startTime + attack);
  lpf1.frequency.exponentialRampToValueAtTime(360, startTime + total);
  lpf1.Q.setValueAtTime(0.85, startTime);

  const lpf2 = ctx.createBiquadFilter();
  lpf2.type = 'lowpass';
  lpf2.frequency.setValueAtTime(760, startTime);
  lpf2.Q.setValueAtTime(0.6, startTime);

  const hpf = ctx.createBiquadFilter();
  hpf.type = 'highpass';
  hpf.frequency.setValueAtTime(65, startTime);

  const envGain = ctx.createGain();
  envGain.gain.setValueAtTime(0.0001, startTime);
  envGain.gain.linearRampToValueAtTime(0.45, startTime + attack * 0.55);
  envGain.gain.linearRampToValueAtTime(0.85, startTime + attack);
  envGain.gain.exponentialRampToValueAtTime(0.0001, startTime + total + 0.08);

  voiceBus.connect(shaper);
  shaper.connect(lpf1);
  lpf1.connect(lpf2);
  lpf2.connect(hpf);
  hpf.connect(envGain);
  envGain.connect(destination);

  const chordVoices = [
    { freq: 174.61, type: 'triangle', amp: 0.34, detune: -3 },
    { freq: 174.61, type: 'sine', amp: 0.24, detune: 3 },
    { freq: 261.63, type: 'sine', amp: 0.26, detune: -2 },
    { freq: 261.63, type: 'triangle', amp: 0.14, detune: 2.5 },
    { freq: 349.23, type: 'sine', amp: 0.19, detune: 0 },
    { freq: 440.00, type: 'sine', amp: 0.07, detune: -1.5 },
  ];

  chordVoices.forEach((v) => {
    const osc = trackSource(ctx.createOscillator());
    osc.type = v.type;
    osc.frequency.setValueAtTime(v.freq, startTime);
    osc.detune.setValueAtTime(v.detune, startTime);

    const g = ctx.createGain();
    g.gain.setValueAtTime(v.amp, startTime);

    osc.connect(g);
    g.connect(voiceBus);
    osc.start(startTime);
    osc.stop(startTime + total + 0.12);
  });

  if (foley) {
    const thrum = trackSource(ctx.createBufferSource());
    thrum.buffer = assets.pinkBuffer;
    const thrumBp = ctx.createBiquadFilter();
    thrumBp.type = 'bandpass';
    thrumBp.frequency.setValueAtTime(210, startTime);
    thrumBp.Q.setValueAtTime(1.6, startTime);

    const thrumGain = ctx.createGain();
    thrumGain.gain.setValueAtTime(0.0001, startTime);
    thrumGain.gain.linearRampToValueAtTime(0.42, startTime + attack);
    thrumGain.gain.exponentialRampToValueAtTime(0.0001, startTime + total);

    thrum.connect(thrumBp);
    thrumBp.connect(thrumGain);
    thrumGain.connect(destination);
    thrum.start(startTime, 0.05, total + 0.05);

    const bubbles = [
      { offset: 0.09, fStart: 185, fEnd: 295, dur: 0.11, amp: 0.09 },
      { offset: 0.28 * scale, fStart: 220, fEnd: 340, dur: 0.12, amp: 0.07 },
    ];
    bubbles.forEach((b) => {
      const bt = startTime + b.offset;
      const bOsc = trackSource(ctx.createOscillator());
      bOsc.type = 'sine';
      bOsc.frequency.setValueAtTime(b.fStart, bt);
      bOsc.frequency.exponentialRampToValueAtTime(b.fEnd, bt + b.dur);

      const bg = ctx.createGain();
      bg.gain.setValueAtTime(0.0001, bt);
      bg.gain.linearRampToValueAtTime(b.amp, bt + b.dur * 0.45);
      bg.gain.exponentialRampToValueAtTime(0.0001, bt + b.dur);

      bOsc.connect(bg);
      bg.connect(lpf2);
      bOsc.start(bt);
      bOsc.stop(bt + b.dur + 0.02);
    });
  }

  return total + 0.18;
}

/**
 * 4. HOT (2–8 kHz Broadband Turbulence + Sizzle & Urgent Pulse)
 */
function synthesizeHot(ctx, destination, startTime, assets, opts) {
  const scale = opts.durationScale;
  const foley = opts.foleyEnabled;

  const steamDur = 0.56 * scale;

  const noiseSrc = trackSource(ctx.createBufferSource());
  noiseSrc.buffer = assets.whiteBuffer;

  const steamHpf = ctx.createBiquadFilter();
  steamHpf.type = 'highpass';
  steamHpf.frequency.setValueAtTime(2000, startTime);
  steamHpf.Q.setValueAtTime(0.8, startTime);

  const steamPeak = ctx.createBiquadFilter();
  steamPeak.type = 'peaking';
  steamPeak.frequency.setValueAtTime(4800, startTime);
  steamPeak.Q.setValueAtTime(0.9, startTime);
  steamPeak.gain.setValueAtTime(5.5, startTime);

  const steamLpf = ctx.createBiquadFilter();
  steamLpf.type = 'lowpass';
  steamLpf.frequency.setValueAtTime(8600, startTime);

  const steamGain = ctx.createGain();
  steamGain.gain.setValueAtTime(0.0001, startTime);
  steamGain.gain.linearRampToValueAtTime(0.38, startTime + 0.015);

  const steps = 18;
  for (let i = 1; i < steps; i++) {
    const frac = i / steps;
    const tStep = startTime + 0.015 + frac * (steamDur - 0.05);
    const envDecay = Math.pow(1 - frac, 0.85);
    const jitter = 0.5 + 0.65 * Math.abs(Math.sin(i * 4.73 + 0.9) * Math.cos(i * 2.17));
    steamGain.gain.linearRampToValueAtTime(Math.max(0.001, 0.34 * envDecay * jitter), tStep);
  }
  steamGain.gain.exponentialRampToValueAtTime(0.0001, startTime + steamDur);

  noiseSrc.connect(steamHpf);
  steamHpf.connect(steamPeak);
  steamPeak.connect(steamLpf);
  steamLpf.connect(steamGain);
  steamGain.connect(destination);
  noiseSrc.start(startTime, 0.0, steamDur + 0.04);

  const pulseSpacing = 0.088 * (0.75 + 0.25 * scale);
  const pulseLen = 0.052 * (0.8 + 0.2 * scale);

  for (let p = 0; p < 3; p++) {
    const pt = startTime + 0.01 + p * pulseSpacing;
    const baseFreq = 1180 + p * 35;
    const osc1 = trackSource(ctx.createOscillator());
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(baseFreq, pt);

    const osc2 = trackSource(ctx.createOscillator());
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(baseFreq + 155, pt);

    const pulseBp = ctx.createBiquadFilter();
    pulseBp.type = 'bandpass';
    pulseBp.frequency.setValueAtTime(1450, pt);
    pulseBp.Q.setValueAtTime(1.4, pt);

    const pg = ctx.createGain();
    pg.gain.setValueAtTime(0.0001, pt);
    pg.gain.linearRampToValueAtTime(0.32, pt + 0.004);
    pg.gain.exponentialRampToValueAtTime(0.0001, pt + pulseLen);

    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0.45, pt);

    osc1.connect(pulseBp);
    osc2.connect(g2);
    g2.connect(pulseBp);
    pulseBp.connect(pg);
    pg.connect(destination);

    osc1.start(pt);
    osc2.start(pt);
    osc1.stop(pt + pulseLen + 0.015);
    osc2.stop(pt + pulseLen + 0.015);
  }

  if (foley) {
    const crackleCount = 14;
    for (let c = 0; c < crackleCount; c++) {
      const pseudoRand = Math.abs(Math.sin((c + 1) * 12.9898) * 43758.5453) % 1;
      const ct = startTime + 0.008 + pseudoRand * (steamDur * 0.85);
      const popFreq = 3200 + ((c * 617) % 4400);

      const popSrc = trackSource(ctx.createBufferSource());
      popSrc.buffer = assets.whiteBuffer;

      const popBp = ctx.createBiquadFilter();
      popBp.type = 'bandpass';
      popBp.frequency.setValueAtTime(popFreq, ct);
      popBp.Q.setValueAtTime(6.0, ct);

      const popGain = ctx.createGain();
      const amp = 0.22 + (c % 3) * 0.1;
      popGain.gain.setValueAtTime(0.0001, ct);
      popGain.gain.linearRampToValueAtTime(amp, ct + 0.0012);
      popGain.gain.exponentialRampToValueAtTime(0.0001, ct + 0.009);

      popSrc.connect(popBp);
      popBp.connect(popGain);
      popGain.connect(destination);
      popSrc.start(ct, (c * 0.13) % 1.8, 0.014);
    }
  }

  return Math.max(steamDur + 0.15, 3 * pulseSpacing + 0.25);
}

async function playThermalVoice(type, { duration = null, suppressVisual = false } = {}) {
  if (!await ensureAudio() || state.muted) return 0.5;
  const now = audioContext.currentTime + 0.01;
  const scale = (duration ? clamp(duration / 0.8, 0.45, 2.0) : 1.0) * state.durationScale;
  const opts = {
    durationScale: scale,
    foleyEnabled: state.foleyEnabled
  };

  let renderedDuration = 0.6;
  switch (type) {
    case 'cold':
      renderedDuration = synthesizeCold(audioContext, masterGain, now, synthAssets, opts);
      break;
    case 'normal':
      renderedDuration = synthesizeNormal(audioContext, masterGain, now, synthAssets, opts);
      break;
    case 'warm':
      renderedDuration = synthesizeWarm(audioContext, masterGain, now, synthAssets, opts);
      break;
    case 'hot':
      renderedDuration = synthesizeHot(audioContext, masterGain, now, synthAssets, opts);
      break;
    default:
      renderedDuration = synthesizeNormal(audioContext, masterGain, now, synthAssets, opts);
  }

  if (!suppressVisual) {
    setVisualizerActiveTheme(type, Math.max(650, renderedDuration * 1000));
  }
  return renderedDuration;
}

async function playHistoryTone(value, duration=.34){
  if(!await ensureAudio() || state.muted) return;
  const now = audioContext.currentTime;
  const frequency = historyFrequency(value);
  const tier = value < -0.10 ? 'cold' : (value < 0.25 ? 'normal' : (value < 0.70 ? 'warm' : 'hot'));
  setVisualizerActiveTheme(tier, Math.max(450, duration * 1000));

  const dur = duration * state.durationScale;
  const gain = audioContext.createGain();

  if (tier === 'cold') {
    envelope(gain, now, dur, 0.16);
    const filter = audioContext.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1100;
    gain.connect(filter);
    filter.connect(masterGain);

    [1, 1.47, 2.01].forEach((mult) => {
      const osc = trackSource(audioContext.createOscillator());
      osc.type = 'sine';
      osc.frequency.value = frequency * mult;
      osc.connect(gain);
      osc.start(now);
      osc.stop(now + dur + 0.05);
    });

    if (state.foleyEnabled && synthAssets) {
      const click = trackSource(audioContext.createBufferSource());
      click.buffer = synthAssets.whiteBuffer;
      const bp = audioContext.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 3400;
      bp.Q.value = 3.5;
      const cg = audioContext.createGain();
      envelope(cg, now, 0.015, 0.22);
      click.connect(bp);
      bp.connect(cg);
      cg.connect(masterGain);
      click.start(now, 0.05, 0.02);
    }
  } else if (tier === 'normal') {
    envelope(gain, now, dur, 0.18);
    const filter = audioContext.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = frequency;
    filter.Q.value = 0.9;
    gain.connect(filter);
    filter.connect(masterGain);

    const osc = trackSource(audioContext.createOscillator());
    osc.type = 'sine';
    osc.frequency.value = frequency;
    osc.connect(gain);
    osc.start(now);
    osc.stop(now + dur + 0.03);

    const over = trackSource(audioContext.createOscillator());
    over.type = 'sine';
    over.frequency.value = frequency * 1.5;
    const og = audioContext.createGain();
    envelope(og, now, dur * 0.45, 0.08);
    over.connect(og);
    og.connect(filter);
    over.start(now);
    over.stop(now + dur * 0.5);
  } else if (tier === 'warm') {
    envelope(gain, now, dur, 0.20);
    const shaper = audioContext.createWaveShaper();
    if (synthAssets) {
      shaper.curve = synthAssets.warmCurve;
      shaper.oversample = '2x';
    }
    const lpf = audioContext.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.value = Math.min(1200, frequency * 2.2);
    gain.connect(shaper);
    shaper.connect(lpf);
    lpf.connect(masterGain);

    [0.75, 1, 1.25].forEach((mult, idx) => {
      const osc = trackSource(audioContext.createOscillator());
      osc.type = idx === 1 ? 'sine' : 'triangle';
      osc.frequency.value = frequency * mult;
      osc.detune.value = (idx - 1) * 3;
      osc.connect(gain);
      osc.start(now);
      osc.stop(now + dur + 0.05);
    });
  } else {
    envelope(gain, now, dur, 0.22);
    const lpf = audioContext.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.value = 3200;
    gain.connect(lpf);
    lpf.connect(masterGain);

    const osc = trackSource(audioContext.createOscillator());
    osc.type = 'triangle';
    osc.frequency.value = frequency;
    osc.connect(gain);
    osc.start(now);
    osc.stop(now + dur + 0.04);

    const osc2 = trackSource(audioContext.createOscillator());
    osc2.type = 'sine';
    osc2.frequency.value = frequency + 135;
    const og2 = audioContext.createGain();
    envelope(og2, now, dur, 0.09);
    osc2.connect(og2);
    og2.connect(lpf);
    osc2.start(now);
    osc2.stop(now + dur + 0.04);

    if (state.foleyEnabled && synthAssets) {
      const steam = trackSource(audioContext.createBufferSource());
      steam.buffer = synthAssets.whiteBuffer;
      const bp = audioContext.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 4600;
      bp.Q.value = 1.2;
      const sg = audioContext.createGain();
      envelope(sg, now, dur * 0.9, 0.16);
      steam.connect(bp);
      bp.connect(sg);
      sg.connect(masterGain);
      steam.start(now, 0.1, dur);
    }
  }
}

async function playBoundaryClick(){
  if(!await ensureAudio()||state.muted) return;
  const now=audioContext.currentTime;
  const osc=trackSource(audioContext.createOscillator());
  const gain=audioContext.createGain();
  osc.type='square'; osc.frequency.setValueAtTime(145,now); osc.frequency.exponentialRampToValueAtTime(70,now+.045);
  envelope(gain,now,.055,.09); osc.connect(gain); gain.connect(masterGain); osc.start(now); osc.stop(now+.07);
}

async function playCategory(category, duration = 0.85){
  let mapped = 'normal';
  if (category === 'cold' || category === 'cool') mapped = 'cold';
  else if (category === 'normal' || category === 'reference') mapped = 'normal';
  else if (category === 'hot') mapped = 'hot';
  else if (category === 'warm') mapped = 'warm';

  return playThermalVoice(mapped, { duration });
}

function nearestGroup(r,g,b){
  if((r+g+b)/3<34) return null;
  const groups={
    cold:[
      [22,47,109],
      [62,100,160],
      [168,201,224]
    ],
    normal:[
      [232,235,228],
      [247,244,210]
    ],
    warm:[
      [250,215,62],
      [245,175,45]
    ],
    hot:[
      [226,119,27],
      [177,17,9],
      [115,8,8]
    ]
  };
  let winner='normal',best=Infinity;
  Object.entries(groups).forEach(([group,anchors])=>anchors.forEach(([ar,ag,ab])=>{
    const distance=(r-ar)**2+(g-ag)**2+(b-ab)**2;
    if(distance<best){best=distance;winner=group;}
  }));
  return winner;
}

async function getGlobeTexture(year){
  if(!isRegionalAvailable(year)) throw new Error(`Regional NASA maps are available only through ${LAST_REGIONAL_YEAR}.`);
  if(globeTextureCache.has(year)) return globeTextureCache.get(year);
  const image=new Image();image.src=frameImagePath(year);image.alt='';
  try{await image.decode();}catch{throw new Error(`The NASA frame for ${year} could not be projected onto the globe.`)}
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;
  const context=canvas.getContext('2d',{willReadFrequently:true});
  context.drawImage(image,0,0,canvas.width,canvas.height);
  const texture={width:canvas.width,height:canvas.height,pixels:context.getImageData(0,0,canvas.width,canvas.height).data};
  globeTextureCache.set(year,texture);
  return texture;
}

function renderGlobeUnavailable(year){
  const canvas=$('#earth-globe');
  if(!canvas) return;
  const context=canvas.getContext('2d');
  const size=canvas.width,cx=size/2,cy=size/2,radius=size*.44;
  context.clearRect(0,0,size,size);
  const fill=context.createRadialGradient(cx-radius*.25,cy-radius*.3,radius*.08,cx,cy,radius);
  fill.addColorStop(0,'#173647');fill.addColorStop(1,'#08161f');
  context.beginPath();context.arc(cx,cy,radius,0,Math.PI*2);context.fillStyle=fill;context.fill();
  context.strokeStyle='rgba(255,255,255,.38)';context.lineWidth=2;context.stroke();
  context.textAlign='center';
  context.fillStyle='rgba(255,253,247,.9)';context.font='600 15px sans-serif';
  context.fillText('Regional map unavailable',cx,cy-6);
  context.fillStyle='rgba(255,253,247,.62)';context.font='12px sans-serif';
  context.fillText(`Regional maps cover 1980–${LAST_REGIONAL_YEAR}`,cx,cy+16);
  context.textAlign='left';
  canvas.setAttribute('aria-label',`Regional NASA temperature projection unavailable for ${year}. Regional maps cover 1980 through ${LAST_REGIONAL_YEAR}.`);
}

async function renderGlobe(){
  if(state.view!=='globe') return;
  const renderId=++state.globeFrame;
  const canvas=$('#earth-globe'),context=canvas.getContext('2d');
  const year=currentPoint().year;
  if(!isRegionalAvailable(year)){renderGlobeUnavailable(year);return;}
  let texture;
  try{texture=await getGlobeTexture(year);}catch(error){
    if(renderId===state.globeFrame && state.view==='globe' && year===currentPoint().year) setStatus(error.message);
    return;
  }
  if(renderId!==state.globeFrame||state.view!=='globe'||year!==currentPoint().year)return;
  const size=canvas.width,cx=size/2,cy=size/2,radius=size*.44;
  const output=context.createImageData(size,size),data=output.data;
  const rotation=state.globeRotation;
  for(let y=0;y<size;y++){
    const ny=(y-cy)/radius;
    for(let x=0;x<size;x++){
      const nx=(x-cx)/radius,radial=nx*nx+ny*ny;
      if(radial>1)continue;
      const nz=Math.sqrt(1-radial);
      const latitude=Math.asin(-ny);
      const longitude=Math.atan2(nx,nz)+rotation;
      const u=((longitude/(Math.PI*2)+.5)%1+1)%1;
      const v=clamp(.5-latitude/Math.PI,0,1);
      const sourceX=Math.min(texture.width-1,Math.floor(u*texture.width));
      const sourceY=Math.min(texture.height-1,Math.floor(v*texture.height));
      const source=(sourceY*texture.width+sourceX)*4,target=(y*size+x)*4;
      const light=Math.max(0,nx*-.28+ny*-.22+nz*.92);
      const shade=.77+.23*light;
      data[target]=texture.pixels[source]*shade;
      data[target+1]=texture.pixels[source+1]*shade;
      data[target+2]=texture.pixels[source+2]*shade;
      data[target+3]=255;
    }
  }
  context.clearRect(0,0,size,size);context.putImageData(output,0,0);
  context.save();context.beginPath();context.arc(cx,cy,radius,0,Math.PI*2);context.clip();
  const band=bands[state.bandIndex];
  const yA=cy-Math.sin(Math.PI/2-band.start*Math.PI)*radius;
  const yB=cy-Math.sin(Math.PI/2-band.end*Math.PI)*radius;
  context.fillStyle='rgba(228,184,70,.11)';context.fillRect(cx-radius,Math.min(yA,yB),radius*2,Math.abs(yB-yA));
  context.strokeStyle='rgba(255,253,247,.28)';context.lineWidth=1;
  [-60,-30,0,30,60].forEach(degrees=>{
    const latitude=degrees*Math.PI/180,yLine=cy-Math.sin(latitude)*radius,halfWidth=Math.cos(latitude)*radius;
    context.beginPath();context.moveTo(cx-halfWidth,yLine);context.lineTo(cx+halfWidth,yLine);context.stroke();
  });
  context.strokeStyle='rgba(228,184,70,.95)';context.lineWidth=3;
  [band.start,band.end].forEach(edge=>{
    const latitude=Math.PI/2-edge*Math.PI,yLine=cy-Math.sin(latitude)*radius,halfWidth=Math.cos(latitude)*radius;
    context.beginPath();context.moveTo(cx-halfWidth,yLine);context.lineTo(cx+halfWidth,yLine);context.stroke();
  });
  const vignette=context.createRadialGradient(cx-radius*.22,cy-radius*.25,radius*.1,cx,cy,radius*1.08);
  vignette.addColorStop(0,'rgba(255,255,255,.09)');vignette.addColorStop(.62,'rgba(0,0,0,0)');vignette.addColorStop(1,'rgba(0,0,0,.32)');
  context.fillStyle=vignette;context.fillRect(cx-radius,cy-radius,radius*2,radius*2);context.restore();
  context.beginPath();context.arc(cx,cy,radius,0,Math.PI*2);context.strokeStyle='rgba(255,255,255,.72)';context.lineWidth=2;context.stroke();
  canvas.setAttribute('aria-label',`Interactive round projection of the ${year} NASA temperature frame. ${bands[state.bandIndex].name}, ${bands[state.bandIndex].range}, is highlighted.`);
}

let globeAnimationFrame=0;
function scheduleGlobeRender(){
  if(globeAnimationFrame)return;
  globeAnimationFrame=requestAnimationFrame(()=>{globeAnimationFrame=0;renderGlobe();});
}

function setEarthView(){
  state.view='flat';
  $('#map-stage').dataset.view='flat';
  applyRegionalAvailability(currentPoint().year);
  if($('#flat-view')) $('#flat-view').setAttribute('aria-pressed','true');
}

function setTemperatureMode(enabled){
  state.temperature=Boolean(enabled);
  const mapStage=$('#map-stage');
  const button=$('#temperature-view');
  if(mapStage){
    mapStage.dataset.temperature=String(state.temperature);
    mapStage.setAttribute('aria-label',state.temperature
      ? `NASA global temperature anomaly map for ${currentPoint().year}`
      : 'NASA Blue Marble world map');
  }
  if(button) button.setAttribute('aria-pressed',String(state.temperature));
  if(window.parent&&window.parent!==window){
    window.parent.postMessage({
      type:'MONITOR_TEMPERATURE_MODE',
      enabled:state.temperature,
      year:currentPoint().year
    },'*');
  }
  setStatus(state.temperature
    ? `Temperature layer on for ${currentPoint().year}.`
    : 'Temperature layer off. Showing the natural-color Earth.');
}

function rotateGlobe(delta){state.globeRotation=(state.globeRotation+delta)%(Math.PI*2);scheduleGlobeRender();}

async function analyzeYear(year){
  if(!isRegionalAvailable(year)) return null;
  if(analysisCache.has(year)) return analysisCache.get(year);
  const image=new Image(); image.src=frameImagePath(year); image.alt='';
  try{await image.decode();}catch{throw new Error(`The NASA frame for ${year} could not be loaded.`)}
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;
  const context=canvas.getContext('2d',{willReadFrequently:true});
  context.drawImage(image,0,0,canvas.width,canvas.height);
  const pixels=context.getImageData(0,0,canvas.width,canvas.height).data;
  const vectors=bands.map(band=>{
    const counts={cold:0,normal:0,warm:0,hot:0,valid:0,unclassified:0};
    const yStart=Math.floor(canvas.height*band.start);const yEnd=Math.ceil(canvas.height*band.end);
    for(let y=yStart;y<yEnd;y+=2){
      for(let x=0;x<canvas.width;x+=2){
        const offset=(y*canvas.width+x)*4;
        if(pixels[offset+3]<220){counts.unclassified++;continue;}
        const group=nearestGroup(pixels[offset],pixels[offset+1],pixels[offset+2]);
        if(!group){counts.unclassified++;continue;}
        counts[group]++;counts.valid++;
      }
    }
    const divisor=Math.max(1,counts.valid);
    const cold=counts.cold/divisor;
    const normal=counts.normal/divisor;
    const warm=counts.warm/divisor;
    const hot=counts.hot/divisor;
    return {
      cold,
      normal,
      warm,
      hot,
      cool: cold,
      reference: normal,
      combinedWarm: warm + hot,
      valid: counts.valid,
      unclassified: counts.unclassified
    };
  });
  analysisCache.set(year,vectors);
  return vectors;
}

function renderUnavailableAnalysis(){
  const point=currentPoint();
  const bars=$('#category-bars');
  if(bars){
    bars.innerHTML=`<p class="analysis-unavailable">Regional category analysis is available for 1980–${LAST_REGIONAL_YEAR}.</p>`;
  }
  const ledger=$('#ledger-summary');
  if(ledger){
    ledger.textContent=`${point.year} · regional analysis unavailable (valid through ${LAST_REGIONAL_YEAR}).`;
  }
}

function applyRegionalAvailability(year){
  const available=isRegionalAvailable(year);
  const frameImage=$('#frame-image');
  const bandsEl=$('#latitude-bands');
  const notice=$('#regional-unavailable');
  if(frameImage) frameImage.hidden=!available;
  if(bandsEl) bandsEl.hidden=!available;
  if(notice) notice.hidden=available;
  const scanRule=$('#scan-rule');
  if(scanRule){
    scanRule.hidden=!available;
    if(!available) scanRule.classList.remove('scanning');
  }
  $$('[data-band]').forEach(button=>{
    button.disabled=!available;
    button.setAttribute('aria-disabled',String(!available));
    button.setAttribute('aria-pressed',String(available && state.mode==='frame' && Number(button.dataset.band)===state.bandIndex));
  });
  const scanButton=$('#scan-frame');
  const playBandButton=$('#play-band');
  if(scanButton) scanButton.disabled=!available;
  if(playBandButton) playBandButton.disabled=!available;
  const viewDescription=$('#view-description');
  if(viewDescription){
    viewDescription.textContent=available
      ?'Flat view shows the complete source frame and all five latitude bands at once.'
      :`${year} shows the official global annual anomaly. Regional NASA maps are available only through ${LAST_REGIONAL_YEAR}.`;
  }
  const frameWindow=$('#frame-window');
  if(frameWindow){
    frameWindow.textContent=available?(year === 2025 ? 'Annual regional mean' : 'Running regional mean'):`Global annual value · regional maps 1980–${LAST_REGIONAL_YEAR}`;
  }
  const bandSummary=$('#selected-band-summary strong');
  if(bandSummary){
    bandSummary.textContent=available
      ?`${bands[state.bandIndex].name} · ${bands[state.bandIndex].range}`
      :`Regional bands unavailable · through ${LAST_REGIONAL_YEAR}`;
  }
  if(!available) renderUnavailableAnalysis();
}

async function updateFrameAnalysis(){
  const {year}=currentPoint();
  if(!isRegionalAvailable(year)){ renderUnavailableAnalysis(); return; }
  try{
    const vectors=await analyzeYear(year);
    if(!vectors||currentPoint().year!==year) return;
    renderBandVector(vectors[state.bandIndex]);
    updateLedger(vectors[state.bandIndex]);
  }catch(error){
    if(currentPoint().year===year){
      $('#category-bars').textContent=error.message;
      $('#ledger-summary').textContent=`${year} · regional analysis unavailable.`;
      setStatus(error.message);
    }
  }
}

function updateYear(index,{play=false, announce=false, throttleMs=0}={}){
  state.yearIndex=clamp(index,0,temperaturePoints.length-1);
  const point=currentPoint();
  const regionalAvailable=isRegionalAvailable(point.year);
  const frameImage=$('#frame-image');
  if(regionalAvailable){
    const frameSrc=frameImagePath(point.year);
    if(frameImage.getAttribute('src')!==frameSrc) frameImage.src=frameSrc;
    frameImage.alt=`NASA global temperature anomaly visualization for ${point.year}`;
    $('#frame-index').textContent=point.frame === null ? 'Annual grid' : `#${point.frame}`;
  }else{
    frameImage.alt=`Regional NASA temperature map unavailable for ${point.year}`;
    $('#frame-index').textContent='—';
  }
  $('#frame-year').textContent=point.year;
  $('#history-year').textContent=point.year;
  $('#history-value').textContent=`${signed(point.value)} °C`;
  $('#history-frequency').textContent=`${Math.round(historyFrequency(point.value))} Hz`;
  $('#year-slider').value=state.yearIndex;
  $('#year-slider').setAttribute('aria-valuetext',`${point.year}, ${signed(point.value)} degrees Celsius relative to the 1951–1980 average`);
  $('#year-output').textContent=point.year;
  if($('#frame-year-select')) $('#frame-year-select').value=String(point.year);
  if($('#frame-year-slider')) {
    $('#frame-year-slider').value=state.yearIndex;
    $('#frame-year-slider').setAttribute('aria-valuetext',`${point.year}, ${signed(point.value)} degrees Celsius relative to the 1951–1980 average`);
  }
  applyRegionalAvailability(point.year);
  updateFrameAnalysis();
  renderGlobe();
  if(play) playHistoryTone(point.value);

  if(announce){
    const qual = point.value >= 0.5 ? 'significantly warmer than baseline' : (point.value > 0 ? 'warmer than baseline' : (point.value < 0 ? 'cooler than baseline' : 'near baseline normal'));
    const freqHz = Math.round(historyFrequency(point.value));
    const textValue = `${point.value >= 0 ? 'plus ' : 'minus '}${Math.abs(point.value).toFixed(2)} degrees Celsius`;
    announceA11y(`Year ${point.year}: Anomaly ${textValue}, ${freqHz} Hertz, ${qual}.`, { throttleMs });
  }

  // Sync the 3D studio globe in the parent window
  if(window.parent && window.parent !== window){
    window.parent.postMessage({
      type: 'MONITOR_YEAR_CHANGE',
      year: point.year,
      value: point.value,
      regionalAvailable
    }, '*');
  }
}

async function playHistory(){
  if(state.playing){stopAudio();return;}
  if(!await ensureAudio()) return;
  stopAudio(false);
  state.playing=true;
  const token=state.token;
  document.body.classList.add('busy');
  setPlayHistoryButtonState(true);

  // Ensure flat map is visible on monitor so user sees the year-by-year color changes alongside the 3D hologram globe
  if(state.view !== 'flat') setEarthView('flat');
  // Do NOT show the latitude scan rule or band highlights during History playback (reserved for Frame Scan)
  $('#scan-rule').classList.remove('scanning');
  $$('[data-band]').forEach(button=>button.setAttribute('aria-pressed','false'));
  notifyParentScan(false);

  // If starting at the end of the record, wrap back to the first year.
  if(state.yearIndex >= temperaturePoints.length - 1){
    state.yearIndex = 0;
  }

  announceA11y(`Playing climate history sonification from ${temperaturePoints[state.yearIndex].year} to 2025.`);

  for(let index=state.yearIndex;index<temperaturePoints.length;index++){
    if(token!==state.token) return;
    const pt = temperaturePoints[index];
    const isMilestone = index === 0 || index === temperaturePoints.length - 1 || pt.year % 5 === 0 || pt.year === 2016 || pt.year === 2024;
    updateYear(index, { announce: isMilestone, throttleMs: 1100 });
    await playHistoryTone(pt.value, .30);
    await sleep(360);
  }
  if(token===state.token){
    state.playing=false;
    document.body.classList.remove('busy');
    setPlayHistoryButtonState(false);
  }
}

function selectBand(index,{focus=false, showHighlight=(state.mode==='frame'), announce=false}={}){
  if(!isRegionalAvailable(currentPoint().year)) return;
  state.bandIndex=clamp(index,0,bands.length-1);
  $$('[data-band]').forEach(button=>{
    const isSelected = showHighlight && Number(button.dataset.band)===state.bandIndex;
    button.setAttribute('aria-pressed',String(isSelected));
  });
  $('#selected-band-summary strong').textContent=`${bands[state.bandIndex].name} · ${bands[state.bandIndex].range}`;
  if(focus) $$('#latitude-bands button')[state.bandIndex].focus();
  updateFrameAnalysis();
  renderGlobe();
  if(announce){
    announceA11y(`Selected latitude band: ${bands[state.bandIndex].name} (${bands[state.bandIndex].range}).`);
  }
}

function renderBandVector(vector){
  const categories=['cold','normal','warm','hot'];
  $('#category-bars').innerHTML=categories.map(category=>{
    const percent=((vector[category] !== undefined ? vector[category] : (category === 'cold' ? vector.cool : category === 'normal' ? vector.reference : vector.warm)) || 0)*100;
    return `<div class="bar-row"><span>${categoryLabels[category] || category}</span><div class="bar-track" aria-hidden="true"><div class="bar-fill ${category}" style="width:${percent.toFixed(1)}%"></div></div><output>${percent.toFixed(0)}%</output></div>`;
  }).join('');
}

function updateLedger(vector){
  const point=currentPoint(),band=bands[state.bandIndex];
  const c = ((vector.cold ?? vector.cool) * 100).toFixed(0);
  const n = ((vector.normal ?? vector.reference) * 100).toFixed(0);
  const w = ((vector.warm ?? 0) * 100).toFixed(0);
  const h = ((vector.hot ?? 0) * 100).toFixed(0);
  $('#ledger-summary').textContent=`${point.year} · ${band.name}: ${c}% cold, ${n}% normal, ${w}% warm, ${h}% hot.`;
}

async function playBandPattern(vector,label,token=state.token){
  if(token!==state.token) return;
  await playBoundaryClick();await sleep(120);
  const total=2200 * state.durationScale;
  for(const category of ['cold','normal','warm','hot']){
    if(token!==state.token) return;
    const share = vector[category] ?? (category === 'cold' ? vector.cool : category === 'normal' ? vector.reference : vector.warm);
    const duration=Math.max(0,share*total);
    if(duration<65) continue;
    await playCategory(category,duration/1000);await sleep(duration+40);
  }
}

async function playSelectedBand(){
  if(!isRegionalAvailable(currentPoint().year)){setStatus(`Regional band playback is available only through ${LAST_REGIONAL_YEAR}.`);return;}
  stopAudio(false);const token=state.token;document.body.classList.add('busy');
  try{
    selectBand(state.bandIndex, {showHighlight:true});
    notifyParentScan(true, state.bandIndex);
    const vectors=await analyzeYear(currentPoint().year);
    await playBandPattern(vectors[state.bandIndex],`${currentPoint().year}, ${bands[state.bandIndex].name}`,token);
  }
  catch(error){if(token===state.token) setStatus(error.message)}
  if(token===state.token){
    document.body.classList.remove('busy');
    if(state.mode!=='frame') notifyParentScan(false);
  }
}

async function scanFrame(){
  if(!isRegionalAvailable(currentPoint().year)){setStatus(`Frame Scan is available only through ${LAST_REGIONAL_YEAR}.`);return;}
  announceA11y(`Scanning ${currentPoint().year} latitude bands from North to South.`);
  stopAudio(false);const token=state.token;document.body.classList.add('busy');
  if(state.view!=='flat') setEarthView('flat');
  $('#scan-rule').classList.add('scanning');
  try{
    const vectors=await analyzeYear(currentPoint().year);
    for(let i=0;i<bands.length;i++){
      if(token!==state.token)return;
      selectBand(i, {showHighlight:true});
      const midRatio = (bands[i].start + bands[i].end) / 2;
      $('#scan-rule').style.top=`${midRatio * calcMapHeight()}px`;
      notifyParentScan(true, i);
      await playBandPattern(vectors[i],`${currentPoint().year}, ${bands[i].name}`,token);await sleep(180);
    }
  }catch(error){if(token===state.token) setStatus(error.message)}
  if(token===state.token){
    document.body.classList.remove('busy');
    $('#scan-rule').classList.remove('scanning');
    notifyParentScan(false);
  }
}

function calcMapHeight(){return $('#frame-image').clientHeight||$('#map-stage')?.clientHeight||380}

function setMode(mode){
  stopAudio(false);state.mode=mode;
  if (mode === 'learn' && !quizInitialized) {
    quizInitialized = true;
    initializeQuiz();
  }
  const tabs={history:'#history-tab',frame:'#frame-tab',learn:'#learn-tab'};
  const panels={history:'#history-panel',frame:'#frame-panel',learn:'#learn-panel'};
  Object.keys(tabs).forEach(key=>{
    $(tabs[key]).setAttribute('aria-selected',String(key===mode));
    $(tabs[key]).tabIndex=key===mode?0:-1;
    $(panels[key]).hidden=key!==mode;
  });
  if(mode==='frame'){
    const regionalAvailable=isRegionalAvailable(currentPoint().year);
    selectBand(state.bandIndex, {showHighlight:true});
    notifyParentScan(regionalAvailable, state.bandIndex);
    if(!regionalAvailable) setStatus(`Frame Scan is available only through ${LAST_REGIONAL_YEAR}.`);
  }else{
    $$('[data-band]').forEach(button=>button.setAttribute('aria-pressed','false'));
    $('#scan-rule').classList.remove('scanning');
    notifyParentScan(false);
  }
}

const SECTION_METADATA = {
  workbench: { num: '1', label: 'Atlas & Scan' },
  compare: { num: '2', label: 'Compare A/B' },
  method: { num: '3', label: 'Method & Sources' }
};

function openSectionDrawer() {
  const toggle = $('#section-drawer-toggle');
  const menu = $('#section-drawer-menu');
  if (!toggle || !menu) return;
  menu.classList.add('is-open');
  toggle.setAttribute('aria-expanded', 'true');
}

function closeSectionDrawer() {
  const toggle = $('#section-drawer-toggle');
  const menu = $('#section-drawer-menu');
  if (!toggle || !menu) return;
  menu.classList.remove('is-open');
  toggle.setAttribute('aria-expanded', 'false');
}

function toggleSectionDrawer() {
  const toggle = $('#section-drawer-toggle');
  const isOpen = toggle?.getAttribute('aria-expanded') === 'true';
  if (isOpen) {
    closeSectionDrawer();
  } else {
    openSectionDrawer();
  }
}

function setSection(sectionName){
  stopAudio(false);
  state.section = sectionName;
  $$('[data-section]').forEach(sec => {
    sec.hidden = sec.dataset.section !== sectionName;
  });

  if (sectionName === 'compare') {
    setTimeout(resizeAnalyserCanvas, 40);
  }

  // Update Drawer Header Pill
  const meta = SECTION_METADATA[sectionName] || { num: '1', label: 'Atlas & Scan' };
  const numEl = $('#drawer-active-num');
  const labelEl = $('#drawer-active-label');
  if (numEl) numEl.textContent = meta.num;
  if (labelEl) labelEl.textContent = meta.label;

  // Update Drawer Menu Items
  $$('.drawer-item[data-section-target]').forEach(item => {
    const isSelected = item.dataset.sectionTarget === sectionName;
    item.classList.toggle('active', isSelected);
    item.setAttribute('aria-selected', String(isSelected));
    const check = item.querySelector('.drawer-item-check');
    if (check) check.textContent = isSelected ? '✓' : '';
  });

  // Legacy tab compatibility if any remain
  $$('.section-tab[data-section-target]').forEach(btn => {
    const isSelected = btn.dataset.sectionTarget === sectionName;
    btn.setAttribute('aria-selected', String(isSelected));
    btn.tabIndex = isSelected ? 0 : -1;
  });

  closeSectionDrawer();
}

const yearOptions = points => points.map(({year}) => `<option value="${year}">${year}</option>`).join('');
const bandOptions = () => bands.map((band,index) => `<option value="${index}">${band.name} · ${band.range}</option>`).join('');

function populateSelects(){
  const regionalPoints=temperaturePoints.filter(point=>isRegionalAvailable(point.year));
  const years=yearOptions(regionalPoints);
  $('#frame-year-select').innerHTML=years;
  if($('#frame-year-slider')) $('#frame-year-slider').max=String(regionalPoints.length-1);
  $('#compare-year-a').innerHTML=years;$('#compare-year-b').innerHTML=years;$('#compare-year-b').value=String(LAST_REGIONAL_YEAR);
  $('#compare-band').innerHTML=bandOptions();
  $('#year-slider').max=String(temperaturePoints.length-1);
}

function setComparisonUnavailable(yearA,yearB){
  const cards=$$('#compare-output>div:not(.difference-mark)');
  const message=`Regional analysis unavailable (valid through ${LAST_REGIONAL_YEAR}).`;
  if(cards[0]) cards[0].innerHTML=`<span>Frame A</span><strong>${yearA}</strong><p>${message}</p>`;
  if(cards[1]) cards[1].innerHTML=`<span>Frame B</span><strong>${yearB}</strong><p>${message}</p>`;
}

async function updateComparison(){
  const yearA=Number($('#compare-year-a').value),yearB=Number($('#compare-year-b').value),bandIndex=Number($('#compare-band').value);
  if(!isRegionalAvailable(yearA)||!isRegionalAvailable(yearB)){
    setComparisonUnavailable(yearA,yearB);
    setStatus(`Compare A/B uses regional maps, available only through ${LAST_REGIONAL_YEAR}.`);
    return;
  }
  try{
    const [vectorsA,vectorsB]=await Promise.all([analyzeYear(yearA),analyzeYear(yearB)]);
    if(Number($('#compare-year-a').value)!==yearA || Number($('#compare-year-b').value)!==yearB || Number($('#compare-band').value)!==bandIndex) return;
    const a=vectorsA[bandIndex],b=vectorsB[bandIndex];
    const cards=$$('#compare-output>div:not(.difference-mark)');
    const formatCard = v => `${((v.cold ?? v.cool)*100).toFixed(0)}% cold · ${((v.normal ?? v.reference)*100).toFixed(0)}% normal · ${((v.warm ?? 0)*100).toFixed(0)}% warm · ${((v.hot ?? 0)*100).toFixed(0)}% hot`;
    if (cards[0]) cards[0].innerHTML=`<span>Frame A</span><strong>${yearA}</strong><p>${formatCard(a)}</p>`;
    if (cards[1]) cards[1].innerHTML=`<span>Frame B</span><strong>${yearB}</strong><p>${formatCard(b)}</p>`;
  }catch(error){setStatus(error.message)}
}

async function playComparison(){
  stopAudio(false);const token=state.token;document.body.classList.add('busy');
  const yearA=Number($('#compare-year-a').value),yearB=Number($('#compare-year-b').value),bandIndex=Number($('#compare-band').value);
  if(!isRegionalAvailable(yearA)||!isRegionalAvailable(yearB)){
    setComparisonUnavailable(yearA,yearB);
    setStatus(`Compare A/B uses regional maps, available only through ${LAST_REGIONAL_YEAR}.`);
    document.body.classList.remove('busy');
    return;
  }
  try{
    const [a,b]=await Promise.all([analyzeYear(yearA),analyzeYear(yearB)]);
    setStatus(`Playing Frame A (${yearA})...`);
    await playBandPattern(a[bandIndex],`Frame A, ${yearA}`,token);
    await sleep(500);
    if(token!==state.token)return;
    setStatus(`Playing Frame B (${yearB})...`);
    await playBandPattern(b[bandIndex],`Frame B, ${yearB}`,token);
    setStatus(`Comparison playback complete: ${yearA} vs ${yearB}.`);
  }catch(error){setStatus(error.message)}
  if(token===state.token)document.body.classList.remove('busy');
}

const quizSets = [
  { years: [1980, 2025], bandIds: [0], color: 'warm', type: 'larger' },
  { years: [2025, 1990], bandIds: [1], color: 'cool', type: 'larger' },
  { years: [2000, 2025], bandIds: [2], color: 'warm', type: 'trend' },
  { years: [2010, 2025], bandIds: [3], color: 'cool', type: 'smaller' },
  { years: [2025, 2020], bandIds: [4], color: 'warm', type: 'larger' },
  { years: [1990, 2000], bandIds: [0], color: 'warm', type: 'difference' },
  { years: [2000, 2010], bandIds: [1], color: 'cool', type: 'trend' },
  { years: [2024, 2025], bandIds: [2], color: 'warm', type: 'larger' },
  { years: [1980, 2025], bandIds: [0, 2], color: 'warm', type: 'change' },
  { years: [1980, 2025], bandIds: [1, 3], color: 'cool', type: 'decrease' }
];
const quizMaps = [$('#quiz-map-a'), $('#quiz-map-b')];
const quizBand = $('#quiz-band');
const quizPlayButtons = $$('[data-quiz-play]');
const quizBandName = index => ['Arctic', 'Northern mid-latitudes', 'Tropics', 'Southern mid-latitudes', 'Antarctic'][index];
let quizInitialized = false;
let quizQuestions = [];
let quizAnswers = [];
let quizIndex = 0;
let quizReviewing = false;
let quizComparison = null;

function showQuizPlayback(index, label = '') {
  quizMaps.forEach((map, position) => map.classList.toggle('is-playing', position === index));
  $('#quiz-playing').textContent = label;
}

function clearQuizAnswer() {
  const feedback = $('#lesson-feedback');
  feedback.hidden = true;
  feedback.textContent = '';
  feedback.className = 'lesson-feedback';
  $('#proof-receipt').hidden = true;
}

async function resolveQuizQuestions() {
  const availableYears = temperaturePoints.filter(point => isRegionalAvailable(point.year)).map(point => point.year);
  const loaded = new Map();
  async function loadFrame(year) {
    if (!loaded.has(year)) loaded.set(year, analyzeYear(year).catch(() => null));
    return loaded.get(year);
  }

  async function resolve(set) {
    const alternativeBands = bands.map((_, index) => index).filter(index => !set.bandIds.includes(index));
    const bandGroups = [set.bandIds];
    for (const index of alternativeBands) {
      if (set.bandIds.length === 1) bandGroups.push([index]);
      else bandGroups.push([set.bandIds[0], index], [index, set.bandIds[1]]);
    }
    if (set.bandIds.length === 2) {
      alternativeBands.forEach((first, index) => {
        alternativeBands.slice(index + 1).forEach(second => bandGroups.push([first, second]));
      });
    }

    const nearest = set.years.map(target => [...availableYears].sort((a, b) => Math.abs(a - target) - Math.abs(b - target)));
    for (const bandIds of bandGroups) {
      const usable = frame => bandIds.every(index => frame?.[index].valid);
      for (const yearA of nearest[0]) {
        const frameA = await loadFrame(yearA);
        if (!usable(frameA)) continue;
        for (const yearB of nearest[1]) {
          if (Math.sign(yearB - yearA) !== Math.sign(set.years[1] - set.years[0])) continue;
          const frameB = await loadFrame(yearB);
          if (!usable(frameB)) continue;
          const frames = [frameA, frameB];
          const playableBands = bands.map((_, index) => index).filter(index => frames.every(frame => frame[index].valid));
          return { ...set, years: [yearA, yearB], bandIds, frames, playableBands };
        }
      }
    }
    return null;
  }

  return Promise.all(quizSets.map(resolve));
}

async function initializeQuiz() {
  quizQuestions = await resolveQuizQuestions();
  startQuiz();
}

function startQuiz() {
  quizAnswers = Array(quizSets.length).fill(null);
  quizReviewing = false;
  advanceQuiz(-1);
}

function advanceQuiz(after) {
  const index = quizQuestions.findIndex((question, index) => index > after && question);
  if (index === -1) showQuizSummary();
  else openQuizQuestion(index);
}

function focusQuizProgress() {
  if (state.section === 'workbench' && state.mode === 'learn') $('#quiz-progress').focus();
}

function openQuizQuestion(index) {
  quizIndex = index;
  const question = quizQuestions[index];
  $('#quiz-summary').hidden = true;
  $('#quiz-comparison').hidden = false;
  $('#quiz-back').hidden = !quizReviewing;
  $('#quiz-progress').textContent = `Question ${index + 1} of ${quizSets.length}${quizReviewing ? ' · Review' : ''}`;
  const options = question.bandIds.length === 2 ? question.bandIds : question.playableBands;
  quizBand.innerHTML = options.map(id => `<option value="${id}">${quizBandName(id)} · ${bands[id].range}</option>`).join('');
  quizBand.value = String(quizAnswers[index]?.bandId ?? question.bandIds[0]);
  updateQuiz();
  focusQuizProgress();
}

function showQuizSummary() {
  stopAudio(false);
  quizComparison = null;
  $('#quiz-progress').textContent = 'Quiz results';
  $('#quiz-summary').hidden = false;
  $('#quiz-comparison').hidden = true;
  $('#quiz-next').hidden = true;
  $('#quiz-back').hidden = true;
  const correct = quizAnswers.filter(answer => answer?.correct).length;
  $('#quiz-score').textContent = `Score: ${correct} out of ${quizSets.length}`;
  const missing = quizQuestions.flatMap((question, index) => question ? [] : [`${index + 1} (${quizSets[index].years.join(' → ')} · ${quizSets[index].bandIds.map(quizBandName).join(' and ')})`]);
  const unavailable = $('#quiz-unavailable');
  unavailable.hidden = missing.length === 0;
  unavailable.textContent = missing.length ? `Comparisons unavailable: ${missing.join(', ')}.` : '';
  $('#quiz-review-list').innerHTML = quizAnswers.map((answer, index) => answer
    ? `<li value="${index + 1}"><button class="text-button" type="button" data-quiz-review="${index}">Review ${quizQuestions[index].years.join(' → ')} · ${answer.correct ? 'Correct' : 'Incorrect'}</button></li>`
    : '').join('');
  focusQuizProgress();
}

const quizPercent = value => `${(value / 10).toFixed(1)}%`;
const quizPoints = value => `${(value / 10).toFixed(1)} percentage points`;

function quizEvidence(question, bandId) {
  const { years, frames, color, type } = question;
  const bandIds = question.bandIds.length === 2 ? question.bandIds : [bandId];
  const rows = bandIds.map(id => {
    // Pixel classifier fractions use valid pixels only. Grade the displayed tenths.
    const [a, b] = frames.map(frame => Math.round(frame[id][color] * 1000));
    return { id, a, b, change: b - a };
  });
  const [first, second] = rows;
  const category = `${color}-colored pixel share`;
  const region = quizBandName(bandId).toLowerCase();
  let prompt;
  let choices;
  let correct;
  switch (type) {
    case 'larger':
    case 'smaller':
      prompt = `Which frame shows a ${type} share of ${color}-colored pixels in the ${region}?`;
      choices = ['Frame A', 'Frame B', 'Same share'];
      correct = first.change === 0 ? 2 : (first.change > 0) === (type === 'larger') ? 1 : 0;
      break;
    case 'trend':
      prompt = `How did the ${category} in the ${region} change from ${years[0]} to ${years[1]}?`;
      choices = ['Increased', 'Decreased', 'Stayed the same'];
      correct = first.change === 0 ? 2 : first.change > 0 ? 0 : 1;
      break;
    case 'difference': {
      prompt = `What was the difference in ${category} between the two frames in the ${region}?`;
      const difference = Math.abs(first.change);
      const step = Math.max(10, Math.round(difference * 0.15));
      const start = Math.max(0, Math.min(1000 - step * 2, difference - step));
      const values = [difference, ...[start, start + step, start + step * 2].filter(value => value !== difference).slice(0, 2)].sort((a, b) => a - b);
      choices = values.map(quizPoints);
      correct = values.indexOf(difference);
      break;
    }
    case 'change':
    case 'decrease': {
      const decrease = type === 'decrease';
      const measure = row => decrease ? Math.max(0, -row.change) : Math.abs(row.change);
      const difference = measure(first) - measure(second);
      prompt = `Which band had the larger ${type} in ${category} from ${years[0]} to ${years[1]}?`;
      choices = [...bandIds.map(quizBandName), `Same ${type}`];
      if (decrease) choices.push('Neither decreased');
      correct = decrease && !measure(first) && !measure(second) ? 3 : difference === 0 ? 2 : difference > 0 ? 0 : 1;
      break;
    }
  }
  return { prompt, choices, correct, rows };
}

function updateQuiz() {
  stopAudio(false);
  clearQuizAnswer();
  const question = quizQuestions[quizIndex];
  const bandId = Number(quizBand.value);
  const band = bands[bandId];
  const evidence = quizEvidence(question, bandId);
  quizComparison = { ...question, band, bandId, evidence, vectors: question.frames.map(frame => frame[bandId]) };
  const saved = quizAnswers[quizIndex];
  const reviewingEvidence = saved && (saved.bandId === bandId || question.bandIds.length === 2);
  $('#quiz-practice').hidden = !saved || reviewingEvidence;
  const next = $('#quiz-next');
  next.hidden = !saved || quizReviewing;
  next.textContent = quizQuestions.slice(quizIndex + 1).some(Boolean) ? 'Next question' : 'See results';

  quizMaps.forEach((map, position) => {
    const year = question.years[position];
    map.querySelector('figcaption span').textContent = year;
    const image = map.querySelector('img');
    const path = frameImagePath(year);
    if (image.getAttribute('src') !== path) image.src = path;
    image.alt = `${year} temperature anomaly map with ${quizBandName(bandId)} (${band.range}) highlighted`;
    const highlight = map.querySelector('.quiz-band-highlight');
    highlight.style.top = `${band.start * 100}%`;
    highlight.style.height = `${(band.end - band.start) * 100}%`;
  });
  $('#quiz-question').textContent = evidence.prompt;
  $('#quiz-choices').innerHTML = evidence.choices.map((choice, index) =>
    `<button type="button" data-answer="${index}" aria-pressed="false">${choice}</button>`).join('');
  $('#lesson-answers').disabled = Boolean(reviewingEvidence);
  if (reviewingEvidence) showQuizAnswer(saved.choice);
}

async function playQuiz(order) {
  const comparison = quizComparison;
  if (!comparison) return;
  if (state.muted) {
    $('#quiz-playing').textContent = 'Audio is muted.';
    return;
  }
  stopAudio(false);
  const token = state.token;
  const sequence = order === 'ab' ? [0, 1] : [order === 'a' ? 0 : 1];
  const { years, band, vectors } = comparison;
  try {
    if (!await ensureAudio()) return;
    for (const index of sequence) {
      if (token !== state.token) return;
      const label = `Frame ${index === 0 ? 'A' : 'B'}, ${years[index]}, ${band.name}`;
      showQuizPlayback(index, `Playing ${label}`);
      await playBandPattern(vectors[index], label, token);
      if (token !== state.token) return;
      showQuizPlayback();
      if (order === 'ab' && index === 0) await sleep(500);
    }
  } catch (error) {
    if (token === state.token) {
      showQuizPlayback();
      $('#quiz-playing').textContent = error.message;
    }
  }
}

function showQuizAnswer(choice) {
  const { years, color, type, evidence } = quizComparison;
  const { rows, correct, choices } = evidence;
  const descriptions = rows.map(({ id, a, b, change }) => {
    const movement = change === 0 ? 'stayed the same' : `${change > 0 ? 'increased' : 'decreased'} by ${quizPoints(Math.abs(change))}`;
    return `In the ${quizBandName(id).toLowerCase()}, the ${color}-colored share ${movement} from ${quizPercent(a)} in Frame A (${years[0]}) to ${quizPercent(b)} in Frame B (${years[1]}).`;
  });

  $$('#quiz-choices [data-answer]').forEach(button => {
    button.setAttribute('aria-pressed', String(Number(button.dataset.answer) === choice));
  });
  const feedback = $('#lesson-feedback');
  feedback.className = `lesson-feedback ${choice === correct ? 'correct' : 'incorrect'}`;
  feedback.textContent = `${choice === correct ? 'Correct.' : 'Not quite.'} You picked ${choices[choice]}. Correct answer: ${choices[correct]}. ${descriptions.join(' ')}`;
  feedback.hidden = false;
  $('#proof-metric').textContent = `Share of valid map pixels in ${color} colors`;
  $('#proof-values').innerHTML = rows.map(({ id, a, b, change }) => `
    <p><strong>${quizBandName(id)} (${bands[id].range})</strong></p>
    <div class="proof-shares">
      <div><span>Frame A (${years[0]})</span><strong>${quizPercent(a)}</strong></div>
      <div><span>Frame B (${years[1]})</span><strong>${quizPercent(b)}</strong></div>
    </div>
    <p>${type === 'decrease' ? 'Decrease' : type === 'change' || type === 'difference' ? 'Absolute change' : 'Difference'}: ${quizPoints(type === 'decrease' ? Math.max(0, -change) : Math.abs(change))}.</p>
  `).join('');
  $('#proof-takeaway').textContent = rows.length === 2
    ? 'Switch latitude bands to highlight and replay each strip.'
    : 'Compare the highlighted strips to see where these colors appear.';
  $('#proof-receipt').hidden = false;
}

function answerLesson(choice) {
  if (!quizComparison) return;
  const { bandId, evidence } = quizComparison;
  if (!quizAnswers[quizIndex]) {
    quizAnswers[quizIndex] = { choice, bandId, correct: choice === evidence.correct };
    $('#lesson-answers').disabled = true;
    $('#quiz-next').hidden = false;
  }
  showQuizAnswer(choice);
  $('#lesson-feedback').scrollIntoView({ block: 'nearest' });
}

function copyLedger(){
  const text=$('#ledger-summary').textContent;
  if(navigator.clipboard?.writeText){navigator.clipboard.writeText(text);}
}

/* =====================================================
   NASA CLIMATE STORIES & DR. JO AUDIO ENGINE (OPTION 1)
   ===================================================== */
const storyAudio = new Audio();
storyAudio.preload = 'auto';
storyAudio.volume = 0.95;

const storySubtitleContainer = document.getElementById('story-subtitle');
const storySubtitleTextEl = document.getElementById('story-subtitle-text');

let activeStory = null;
let storySyncTimer = null;
let triggeredMilestones = new Set();

const CLIMATE_STORIES = {
  'heat-spike': {
    title: 'Expedition 1: The Global Heat Spike',
    audioFile: 'heat-spike.wav',
    cues: [
      { start: 0, end: 3.60, text: 'Welcome to Expedition 1: The Global Heat Spike.' },
      { start: 3.80, end: 9.24, text: 'In 1980, global temperatures remained close to the historical mid-century baseline.' },
      { start: 9.44, end: 13.36, text: 'Hear the calm, balanced frequency of this baseline era.' },
      { start: 13.56, end: 23.96, text: 'Fast forward to 2016. Driven by accumulated greenhouse forcing and an intense El Niño, global anomalies reached plus 0.99 degrees Celsius.' },
      { start: 24.16, end: 27.76, text: 'Notice how the pitch climbs higher across the northern hemisphere.' },
      { start: 27.96, end: 33.72, text: 'In 2023 and 2024, our climate system crossed an uncharted threshold.' },
      { start: 33.92, end: 43.28, text: 'Global anomalies shattered all prior records at plus 1.18 degrees Celsius, pushing our sonification to the sharpest edge of its acoustic range.' }
    ],
    milestones: [
      { time: 0.0, year: 1980, temp: false, band: null, tone: 0.26 },
      { time: 13.56, year: 2016, temp: true, band: null, tone: 0.99 },
      { time: 27.96, year: 2024, temp: true, band: null, tone: 1.18 }
    ]
  },
  'arctic-amplification': {
    title: 'Expedition 2: Arctic Amplification',
    audioFile: 'arctic-amplification.wav',
    cues: [
      { start: 0, end: 3.36, text: 'Welcome to Expedition 2: Arctic Amplification.' },
      { start: 3.56, end: 8.44, text: 'In 1980, reflective Arctic sea ice acted as Earth\'s natural mirror.' },
      { start: 8.64, end: 13.76, text: 'At 60 to 90 degrees North, acoustic frequencies matched global equilibrium.' },
      { start: 13.96, end: 18.28, text: 'By the turn of the millennium, perennial sea ice began shrinking rapidly.' },
      { start: 18.48, end: 25.92, text: 'As bright ice melted into darker ocean waters, solar heat absorption accelerated, triggering a runaway warming feedback loop.' },
      { start: 26.12, end: 31.00, text: 'Today, the Arctic is warming nearly four times faster than the rest of the planet.' },
      { start: 31.20, end: 37.60, text: 'Compare this polar tone to equatorial regions to hear the drastic acoustic divergence of our melting pole.' }
    ],
    milestones: [
      { time: 0.0, year: 1980, temp: true, band: 0, tone: 0.26 },
      { time: 13.96, year: 2000, temp: true, band: 0, tone: 0.40 },
      { time: 26.12, year: 2024, temp: true, band: 0, tone: 1.18 }
    ]
  },
  'satellite-era': {
    title: 'Expedition 3: The 45-Year Satellite Era',
    audioFile: 'satellite-era.wav',
    cues: [
      { start: 0, end: 4.00, text: 'Welcome to Expedition 3: The 45-Year Satellite Era.' },
      { start: 4.20, end: 13.96, text: 'In 1980, NASA and NOAA began continuous orbital Earth monitoring, observing a world still governed by natural decadal variability.' },
      { start: 14.16, end: 20.00, text: 'In 1998, an unprecedented ocean warming event signaled a permanent regime shift.' },
      { start: 20.20, end: 25.96, text: 'Natural cooling cycles could no longer counteract the compounding buildup of greenhouse gases.' },
      { start: 26.16, end: 33.60, text: 'Across 45 years of continuous satellite records, NASA datasets document an undeniable upward trajectory.' },
      { start: 33.80, end: 39.40, text: 'What was once abstract numbers is now a visceral, audible reality for our home planet.' }
    ],
    milestones: [
      { time: 0.0, year: 1980, temp: false, band: null, tone: 0.26 },
      { time: 14.16, year: 1998, temp: true, band: null, tone: 0.61 },
      { time: 26.16, year: 2025, temp: true, band: null, tone: 1.18 }
    ]
  }
};

function getStoryYearIndex(targetYear) {
  const idx = temperaturePoints.findIndex(p => p.year === targetYear);
  return idx >= 0 ? idx : 0;
}

function updateStorySubtitleDisplay(text) {
  if (storySubtitleContainer && storySubtitleTextEl) {
    storySubtitleContainer.hidden = false;
    storySubtitleContainer.classList.add('is-active');
    storySubtitleTextEl.textContent = text;
  }
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: 'STORY_SUBTITLE', text: text, active: true }, '*');
  }
}

function hideStorySubtitleDisplay() {
  if (storySubtitleContainer) {
    storySubtitleContainer.classList.remove('is-active');
    setTimeout(() => {
      if (!storySubtitleContainer.classList.contains('is-active')) {
        storySubtitleContainer.hidden = true;
      }
    }, 240);
  }
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: 'STORY_SUBTITLE', active: false }, '*');
  }
}

function syncStoryProgress() {
  if (!activeStory || storyAudio.paused || storyAudio.ended) return;
  const t = storyAudio.currentTime;

  // 1. Update Subtitle Cue
  const activeCue = activeStory.cues.find(c => t >= c.start && t < c.end);
  if (activeCue) {
    updateStorySubtitleDisplay(activeCue.text);
  } else if (t >= activeStory.cues[activeStory.cues.length - 1].end) {
    hideStorySubtitleDisplay();
  }

  // 2. Trigger Visual Milestones on the Monitor accurate to narration
  activeStory.milestones.forEach((m, idx) => {
    if (t >= m.time && !triggeredMilestones.has(idx)) {
      triggeredMilestones.add(idx);
      updateYear(getStoryYearIndex(m.year));
      if (typeof setTemperatureMode === 'function') {
        setTemperatureMode(m.temp);
      }
      if (m.band !== null && typeof selectBand === 'function') {
        selectBand(m.band, { showHighlight: true });
      } else {
        $$('[data-band]').forEach(b => b.setAttribute('aria-pressed', 'false'));
      }
      if (typeof playHistoryTone === 'function') {
        playHistoryTone(m.tone, 0.45);
      }
    }
  });
}

function startClimateStory(storyId) {
  const story = CLIMATE_STORIES[storyId];
  if (!story) return;

  // Immediately silence any welcome audio from Dr. Jo in parent room
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: 'STOP_WELCOME_AUDIO' }, '*');
  }

  stopAudio(false);
  stopClimateStory();

  activeStory = story;
  triggeredMilestones.clear();

  if (state.view !== 'flat') setEarthView();
  if (state.mode !== 'history') setMode('history');

  storyAudio.src = `../assets/audio/stories/${story.audioFile}`;
  storyAudio.currentTime = 0;
  storyAudio.play().catch(e => {
    console.warn('Story audio play blocked or error:', e);
  });

  if (storySyncTimer) clearInterval(storySyncTimer);
  storySyncTimer = setInterval(syncStoryProgress, 60);
}

function stopClimateStory() {
  if (storySyncTimer) {
    clearInterval(storySyncTimer);
    storySyncTimer = null;
  }
  storyAudio.pause();
  storyAudio.currentTime = 0;
  activeStory = null;
  triggeredMilestones.clear();
  hideStorySubtitleDisplay();
}

storyAudio.addEventListener('ended', () => {
  stopClimateStory();
});

function bindEvents(){
  $$('[data-section-target]').forEach(el => {
    el.addEventListener('click', (event) => {
      event.preventDefault();
      setSection(el.dataset.sectionTarget);
    });
  });

  const drawerToggle = $('#section-drawer-toggle');
  if (drawerToggle) {
    drawerToggle.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      toggleSectionDrawer();
    });

    drawerToggle.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openSectionDrawer();
        const activeItem = $('.drawer-item.active') || $('.drawer-item');
        activeItem?.focus();
      }
    });
  }

  $$('.drawer-item').forEach((item, index, items) => {
    item.addEventListener('keydown', (event) => {
      let next = index;
      if (event.key === 'ArrowDown') next = (index + 1) % items.length;
      else if (event.key === 'ArrowUp') next = (index - 1 + items.length) % items.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = items.length - 1;
      else if (event.key === 'Escape') {
        closeSectionDrawer();
        drawerToggle?.focus();
        return;
      } else return;
      event.preventDefault();
      items[next].focus();
    });
  });

  // Close drawer when clicking outside
  document.addEventListener('click', (event) => {
    const drawer = $('#section-drawer');
    if (drawer && !drawer.contains(event.target)) {
      closeSectionDrawer();
    }
  });

  $$('[data-mode-target]').forEach(btn => {
    btn.addEventListener('click', (event) => {
      event.preventDefault();
      setMode(btn.dataset.modeTarget);
    });
  });

  // Forward pointer movement to parent 3D studio so camera parallax works smoothly
  // without feedback loops when CSS3D transforms shift or when hovering buttons/controls
  let lastScreenX = null;
  let lastScreenY = null;
  window.addEventListener('pointermove', (event) => {
    if (!window.parent || window.parent === window || event.pointerType === 'touch') return;
    if (lastScreenX !== null && Math.hypot(event.screenX - lastScreenX, event.screenY - lastScreenY) < 2) {
      return;
    }
    lastScreenX = event.screenX;
    lastScreenY = event.screenY;

    // Keep camera steady when cursor is over interactive buttons/sliders so controls never shift under cursor
    if (event.target.closest && event.target.closest('button, input, select, a, label')) {
      return;
    }

    window.parent.postMessage({
      type: 'MONITOR_POINTER_MOVE',
      ratioX: event.clientX / window.innerWidth,
      ratioY: event.clientY / window.innerHeight
    }, '*');
  }, { passive: true });

  // Clicking on the monitor screen focuses the monitor (Telemetry Desk),
  // EXCEPT when clicking Play History / transport / scrubber / Frame Scan / audio controls / temperature view toggle / Stories
  const noFocusSelector = '#section-drawer, #section-drawer-toggle, #section-drawer-menu, .drawer-item, #stories-open, #stories-close, #stories-modal, #story-hud, .story-ctrl-btn, .story-launch-btn, [data-launch], #help-open, #help-close, #help-modal, #play-history, .transport, #previous-year, #next-year, #play-selected, #year-slider, #frame-year-select, #frame-prev-year, #frame-next-year, .frame-context-row, .frame-year-control, .slider-block, #scan-frame, #play-band, .frame-actions, #history-tab, #frame-tab, #learn-tab, [data-band], [data-mode-target], [data-section-target], #mute-toggle, #exit-to-studio, #temperature-view, #flat-view, .view-switch, [data-legend]';
  document.addEventListener('click', (event) => {
    if (!window.parent || window.parent === window) return;
    if (event.target.closest && event.target.closest(noFocusSelector)) {
      return;
    }
    if (event.composedPath) {
      const path = event.composedPath();
      if (path.some(el => el && el.matches && el.matches(noFocusSelector))) {
        return;
      }
    }
    window.parent.postMessage({ type: 'FOCUS_MONITOR' }, '*');
  });

  $('#history-tab').addEventListener('click',()=>setMode('history'));
  $('#frame-tab').addEventListener('click',()=>setMode('frame'));
  $('#learn-tab').addEventListener('click',()=>setMode('learn'));
  $$('.mode-tabs [role="tab"]').forEach((tab,index,tabs)=>tab.addEventListener('keydown',event=>{
    let next=index;
    if(event.key==='ArrowRight') next=(index+1)%tabs.length;
    else if(event.key==='ArrowLeft') next=(index-1+tabs.length)%tabs.length;
    else if(event.key==='Home') next=0;
    else if(event.key==='End') next=tabs.length-1;
    else return;
    event.preventDefault();
    tabs[next].click();
    tabs[next].focus();
  }));
  $('#frame-image').addEventListener('error',()=>{
    if(!isRegionalAvailable(currentPoint().year)) return;
    setStatus(`The NASA frame for ${currentPoint().year} could not be loaded. Retrying with 1980 reference frame.`);
    if ($('#frame-image').dataset.retried !== 'true') {
      $('#frame-image').dataset.retried = 'true';
      $('#frame-image').src = '../assets/eic/1980.webp';
    }
  });
  $('#frame-image').addEventListener('load',()=>{
    delete $('#frame-image').dataset.retried;
  });
  $('#year-slider').addEventListener('input',event=>{
    stopAudio(false);
    updateYear(Number(event.target.value), { play: true, announce: true, throttleMs: 140 });
  });
  $('#year-slider').addEventListener('change',()=>{
    playHistoryTone(currentPoint().value,.42);
    updateYear(state.yearIndex, { announce: true });
  });
  $('#frame-year-select').addEventListener('change',event=>{
    stopAudio(false);
    const index=temperaturePoints.findIndex(point=>point.year===Number(event.target.value));
    if(index>=0) updateYear(index);
  });
  if($('#frame-year-slider')){
    $('#frame-year-slider').addEventListener('input',event=>{
      stopAudio(false);
      updateYear(Number(event.target.value));
    });
  }
  if($('#frame-prev-year')){
    $('#frame-prev-year').addEventListener('click',()=>{
      stopAudio(false);
      updateYear(state.yearIndex-1);
    });
  }
  if($('#frame-next-year')){
    $('#frame-next-year').addEventListener('click',()=>{
      stopAudio(false);
      updateYear(state.yearIndex+1);
    });
  }
  $('#previous-year').addEventListener('click',()=>{stopAudio(false);updateYear(state.yearIndex-1,{play:true});});
  $('#next-year').addEventListener('click',()=>{stopAudio(false);updateYear(state.yearIndex+1,{play:true});});
  $('#play-selected').addEventListener('click',()=>playHistoryTone(currentPoint().value,.6));
  $('#play-history').addEventListener('click',(event)=>{event.stopPropagation();playHistory();});
  $$('[data-band]').forEach(button=>button.addEventListener('click',()=>{stopAudio(false);if(state.mode!=='frame')setMode('frame');selectBand(Number(button.dataset.band),{showHighlight:true});notifyParentScan(true,Number(button.dataset.band));}));
  if($('#flat-view')) $('#flat-view').addEventListener('click',(event)=>{event.stopPropagation();setEarthView('flat');});
  if($('#temperature-view')) $('#temperature-view').addEventListener('click',(event)=>{event.stopPropagation();setTemperatureMode(!state.temperature);});
  $('#scan-frame').addEventListener('click',scanFrame);$('#play-band').addEventListener('click',playSelectedBand);
  ['compare-year-a','compare-year-b','compare-band'].forEach(id=>$(`#${id}`).addEventListener('change',updateComparison));
  $('#compare-play').addEventListener('click',playComparison);
  quizBand.addEventListener('change', updateQuiz);
  quizPlayButtons.forEach(button => button.addEventListener('click', () => playQuiz(button.dataset.quizPlay)));
  $('#quiz-choices').addEventListener('click', event => {
    const button = event.target.closest('[data-answer]');
    if (button) answerLesson(Number(button.dataset.answer));
  });
  $('#quiz-next').addEventListener('click', () => advanceQuiz(quizIndex));
  $('#quiz-review-list').addEventListener('click', event => {
    const button = event.target.closest('[data-quiz-review]');
    if (!button) return;
    quizReviewing = true;
    openQuizQuestion(Number(button.dataset.quizReview));
  });
  $('#quiz-back').addEventListener('click', showQuizSummary);
  $('#quiz-retake').addEventListener('click', startQuiz);
  $('#copy-ledger').addEventListener('click',copyLedger);
  $('#mute-toggle').addEventListener('click',async()=>{state.muted=!state.muted;stopAudio(false);if(await ensureAudio())masterGain.gain.value=state.muted?0:.72;$('#mute-toggle').setAttribute('aria-pressed',String(state.muted));$('#mute-toggle').setAttribute('aria-label',state.muted?'Turn audio on':'Mute audio');$('#mute-toggle span:last-child').textContent=state.muted?'Muted':'Audio on';});

  function returnToStudio(){
    stopAudio(false);
    if(window.parent&&window.parent!==window){
      window.parent.postMessage({type:'EXIT_COMPUTER_MODE'},'*');
    }
  }

  const exitBtn=$('#exit-to-studio');
  if(exitBtn){
    exitBtn.addEventListener('click',returnToStudio);
  }

  /* ---- Help Guide Modal ---- */
  const helpModal = document.getElementById('help-modal');
  const helpOpen  = document.getElementById('help-open');
  const helpClose = document.getElementById('help-close');

  function openHelp() {
    if (!helpModal) return;
    helpModal.hidden = false;
    document.body.style.overflow = 'hidden';
    helpClose?.focus();
  }

  function closeHelp() {
    if (!helpModal) return;
    helpModal.hidden = true;
    document.body.style.overflow = '';
    helpOpen?.focus();
  }

  helpOpen?.addEventListener('click', openHelp);
  helpClose?.addEventListener('click', closeHelp);
  helpModal?.addEventListener('click', (e) => {
    if (e.target === helpModal) closeHelp();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && helpModal && !helpModal.hidden) {
      closeHelp();
    }
  });

  /* ---- Climate Stories Modal & Controls ---- */
  const storiesModal = document.getElementById('stories-modal');
  const storiesOpen  = document.getElementById('stories-open');
  const storiesClose = document.getElementById('stories-close');

  function openStories() {
    if (!storiesModal) return;
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'STOP_WELCOME_AUDIO' }, '*');
    }
    storiesModal.hidden = false;
    document.body.style.overflow = 'hidden';
    storiesClose?.focus();
  }

  function closeStories() {
    if (!storiesModal) return;
    storiesModal.hidden = true;
    document.body.style.overflow = '';
    storiesOpen?.focus();
  }

  storiesOpen?.addEventListener('click', openStories);
  storiesClose?.addEventListener('click', closeStories);
  storiesModal?.addEventListener('click', (e) => {
    if (e.target === storiesModal) closeStories();
  });

  // Launch buttons inside stories modal
  $$('[data-launch]').forEach(btn => {
    btn.addEventListener('click', () => {
      const storyId = btn.getAttribute('data-launch');
      closeStories();
      startClimateStory(storyId);
    });
  });

  // COMPREHENSIVE KEYBOARD NAVIGATION & ASSISTIVE SHORTCUTS (WCAG 2.1 & Universal Design)
  window.addEventListener('keydown', (event) => {
    // Let native select, input, and textarea handle their own typing & arrow events
    if (event.target && event.target.matches && event.target.matches('select, input[type="text"], textarea')) {
      return;
    }

    const modalOpen = (storiesModal && !storiesModal.hidden) || (helpModal && !helpModal.hidden);

    // Escape closes modals, drawers, stops audio, or returns to studio
    if (event.key === 'Escape') {
      const drawerMenu = $('#section-drawer-menu');
      if (drawerMenu && drawerMenu.classList.contains('is-open')) {
        closeSectionDrawer();
        $('#section-drawer-toggle')?.focus();
        event.preventDefault();
        return;
      }
      if (storiesModal && !storiesModal.hidden) {
        closeStories();
        event.preventDefault();
        return;
      }
      if (helpModal && !helpModal.hidden) {
        closeHelp();
        event.preventDefault();
        return;
      }
      if (activeStory) {
        stopClimateStory();
        event.preventDefault();
        return;
      }
      stopAudio(false);
      returnToStudio();
      return;
    }

    // Do not trigger global workbench shortcuts when modal dialog is open
    if (modalOpen) return;

    // Space: Play / Pause sonification
    if (event.key === ' ' || event.code === 'Space') {
      // Don't hijack space if focused directly on a native button
      if (event.target && event.target.tagName === 'BUTTON') {
        return;
      }
      event.preventDefault();
      if (activeStory) {
        stopClimateStory();
      } else if (state.playing) {
        stopAudio();
      } else {
        playHistory();
      }
      return;
    }

    // ArrowLeft / ArrowRight: Scrub years
    if (event.key === 'ArrowLeft') {
      if (event.target && event.target.id === 'year-slider') return; // native range handles
      event.preventDefault();
      stopAudio(false);
      const step = event.shiftKey ? 5 : 1;
      updateYear(state.yearIndex - step, { play: true, announce: true });
      return;
    }
    if (event.key === 'ArrowRight') {
      if (event.target && event.target.id === 'year-slider') return; // native range handles
      event.preventDefault();
      stopAudio(false);
      const step = event.shiftKey ? 5 : 1;
      updateYear(state.yearIndex + step, { play: true, announce: true });
      return;
    }

    // Home / End: First year (1980) or latest year (2025)
    if (event.key === 'Home') {
      event.preventDefault();
      stopAudio(false);
      updateYear(0, { play: true, announce: true });
      return;
    }
    if (event.key === 'End') {
      event.preventDefault();
      stopAudio(false);
      updateYear(temperaturePoints.length - 1, { play: true, announce: true });
      return;
    }

    // ArrowUp / ArrowDown: Cycle latitude bands (North to South)
    if (event.key === 'ArrowUp') {
      if (event.target && event.target.matches('.drawer-item, select, input[type="range"]')) return;
      event.preventDefault();
      stopAudio(false);
      if (state.mode !== 'frame') setMode('frame');
      const nextBand = clamp(state.bandIndex - 1, 0, bands.length - 1);
      selectBand(nextBand, { showHighlight: true, announce: true });
      playSelectedBand();
      return;
    }
    if (event.key === 'ArrowDown') {
      if (event.target && event.target.matches('.drawer-item, select, input[type="range"]')) return;
      event.preventDefault();
      stopAudio(false);
      if (state.mode !== 'frame') setMode('frame');
      const nextBand = clamp(state.bandIndex + 1, 0, bands.length - 1);
      selectBand(nextBand, { showHighlight: true, announce: true });
      playSelectedBand();
      return;
    }

    // Key 'p' / 'P': Play tone for active year or band
    if (event.key === 'p' || event.key === 'P') {
      event.preventDefault();
      if (state.mode === 'frame') {
        playSelectedBand();
      } else {
        playHistoryTone(currentPoint().value, 0.6);
        const pt = currentPoint();
        announceA11y(`Playing tone for year ${pt.year}: ${signed(pt.value)} degrees Celsius, ${Math.round(historyFrequency(pt.value))} Hertz.`);
      }
      return;
    }

    // Key 's' / 'S': Trigger North-to-South frame scan
    if (event.key === 's' || event.key === 'S') {
      event.preventDefault();
      if (state.mode !== 'frame') setMode('frame');
      scanFrame();
      return;
    }

    // Key 'q' / 'Q': Jump directly to Quiz & Proof section on the monitor
    if (event.key === 'q' || event.key === 'Q') {
      event.preventDefault();
      stopAudio(false);
      if (state.section !== 'workbench') {
        setSection('workbench');
      }
      setMode('learn');
      announceA11y('Switched to Quiz and Proof section.');
      return;
    }

    // Quiz In-Section Shortcuts (when inside Quiz mode)
    if (state.mode === 'learn') {
      if (event.key === 'a' || event.key === 'A') {
        const btnA = document.querySelector('[data-quiz-play="a"]');
        if (btnA) { event.preventDefault(); btnA.click(); return; }
      }
      if (event.key === 'b' || event.key === 'B') {
        const btnB = document.querySelector('[data-quiz-play="b"]');
        if (btnB) { event.preventDefault(); btnB.click(); return; }
      }
      if (event.key === 'n' || event.key === 'N') {
        const nextBtn = document.querySelector('#quiz-next');
        if (nextBtn && !nextBtn.hidden) { event.preventDefault(); nextBtn.click(); return; }
      }
    }

    // Key 'm' / 'M': Toggle Mute
    if (event.key === 'm' || event.key === 'M') {
      event.preventDefault();
      $('#mute-toggle')?.click();
      return;
    }

    // Keys 1, 2, 3: Jump between workbench sections
    if (event.key === '1') {
      event.preventDefault();
      setSection('workbench');
      announceA11y('Switched to Section 1: Atlas and Scan Workbench.');
      return;
    }
    if (event.key === '2') {
      event.preventDefault();
      setSection('compare');
      announceA11y('Switched to Section 2: Compare A/B.');
      return;
    }
    if (event.key === '3') {
      event.preventDefault();
      setSection('method');
      announceA11y('Switched to Section 3: Method and Sources.');
      return;
    }

    // Key '?': Open Guide & Accessibility cheat sheet
    if (event.key === '?' || (event.key === '/' && event.shiftKey)) {
      event.preventDefault();
      openHelp();
      return;
    }
  });

  window.addEventListener('message',event=>{
    if(event.data&&(event.data.type==='SUSPEND_WORKSTATION'||event.data.type==='PAUSE_ALL_AUDIO')){
      stopAudio(false);
      stopClimateStory();
    } else if (event.data && event.data.type === 'FOCUS_FIRST_CONTROL') {
      const firstControl = $('#play-history') || $('#section-drawer-toggle');
      firstControl?.focus();
    }
  });
}

/* -------------------------------------------------------------
   DUAL ANALYSER (LOG FFT SPECTRUM + WAVEFORM OVERLAY)
   ------------------------------------------------------------- */
let analyserCanvas = null;
let analyserCtx = null;
let freqData = null;
let timeData = null;
let peakHold = null;
let analyserAnimId = null;

const MIN_FREQ = 80;
const MAX_FREQ = 12000;
const LOG_MIN = Math.log10(MIN_FREQ);
const LOG_MAX = Math.log10(MAX_FREQ);

function freqToX(freq, width) {
  const clamped = Math.max(MIN_FREQ, Math.min(MAX_FREQ, freq));
  return ((Math.log10(clamped) - LOG_MIN) / (LOG_MAX - LOG_MIN)) * width;
}

function resizeAnalyserCanvas() {
  const container = $('#compareAnalyserContainer');
  if (!container || !analyserCanvas) return;
  const rect = container.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  analyserCanvas.width = Math.max(1, Math.floor(rect.width * dpr));
  analyserCanvas.height = Math.max(1, Math.floor(rect.height * dpr));
  if (analyserCtx) {
    analyserCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
}

function drawDualAnalyser() {
  analyserAnimId = requestAnimationFrame(drawDualAnalyser);
  const container = $('#compareAnalyserContainer');
  if (!container || !analyserCanvas || !analyserCtx) return;

  const width = container.clientWidth;
  const height = container.clientHeight;
  if (width <= 0 || height <= 0) return;

  // Check if active theme expired
  const nowMs = performance.now();
  if (state.activeThemeKey && nowMs > state.activeThemeUntil) {
    state.activeThemeKey = null;
    updateVisualizerHeader(null);
  }

  let strokeColor = '#64748b';
  let fillTop = 'rgba(100, 116, 139, 0.25)';
  let fillBottom = 'rgba(100, 116, 139, 0.02)';
  let waveColor = 'rgba(148, 163, 184, 0.55)';

  if (typeof activeThermalLoops !== 'undefined' && activeThermalLoops.size > 1) {
    strokeColor = '#4df3ff';
    fillTop = 'rgba(77, 243, 255, 0.35)';
    fillBottom = 'rgba(245, 158, 11, 0.06)';
    waveColor = '#38bdf8';
  } else if (state.activeThemeKey && THERMAL_META[state.activeThemeKey]) {
    const m = THERMAL_META[state.activeThemeKey];
    strokeColor = m.color;
    fillTop = m.fillTop;
    fillBottom = m.fillBottom;
    waveColor = m.color;
  }

  // Clear canvas
  analyserCtx.fillStyle = '#05070a';
  analyserCtx.fillRect(0, 0, width, height);

  const bottomAxisPad = 22;
  const plotHeight = height - bottomAxisPad;

  // Thermal zones shading
  const zones = [
    { f1: 150, f2: 450, color: 'rgba(245, 158, 11, 0.05)' },
    { f1: 450, f2: 900, color: 'rgba(203, 213, 225, 0.04)' },
    { f1: 1500, f2: 4000, color: 'rgba(56, 189, 248, 0.045)' },
    { f1: 4000, f2: 8500, color: 'rgba(249, 115, 22, 0.05)' },
  ];
  zones.forEach(z => {
    const x1 = freqToX(z.f1, width);
    const x2 = freqToX(z.f2, width);
    analyserCtx.fillStyle = z.color;
    analyserCtx.fillRect(x1, 0, x2 - x1, plotHeight);
  });

  // Horizontal gridlines
  analyserCtx.strokeStyle = 'rgba(148, 163, 184, 0.09)';
  analyserCtx.lineWidth = 1;
  for (let i = 1; i <= 3; i++) {
    const y = Math.round((plotHeight / 4) * i) + 0.5;
    analyserCtx.beginPath();
    analyserCtx.moveTo(0, y);
    analyserCtx.lineTo(width, y);
    analyserCtx.stroke();
  }

  // Vertical frequency gridlines & markers
  const markers = [
    { f: 100, label: '100Hz', major: false },
    { f: 200, label: '200Hz', major: true },
    { f: 600, label: '600Hz', major: true },
    { f: 1000, label: '1kHz', major: false },
    { f: 2000, label: '2kHz', major: true },
    { f: 4000, label: '4kHz', major: false },
    { f: 6000, label: '6kHz', major: true },
    { f: 10000, label: '10kHz', major: false },
  ];

  analyserCtx.font = '10px "JetBrains Mono", monospace';
  analyserCtx.textAlign = 'center';

  markers.forEach(m => {
    const x = Math.round(freqToX(m.f, width)) + 0.5;
    analyserCtx.strokeStyle = m.major ? 'rgba(148, 163, 184, 0.18)' : 'rgba(148, 163, 184, 0.07)';
    analyserCtx.beginPath();
    analyserCtx.moveTo(x, 0);
    analyserCtx.lineTo(x, plotHeight);
    analyserCtx.stroke();

    if (m.major || width > 520) {
      analyserCtx.fillStyle = m.major ? '#94a3b8' : '#475569';
      analyserCtx.fillText(m.label, x, height - 7);
    }
  });

  // Baseline separator
  analyserCtx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
  analyserCtx.beginPath();
  analyserCtx.moveTo(0, plotHeight + 0.5);
  analyserCtx.lineTo(width, plotHeight + 0.5);
  analyserCtx.stroke();

  // If audio is active and analyser is initialized
  if (analyser && audioContext) {
    const binCount = analyser.frequencyBinCount;
    if (!freqData || freqData.length !== binCount) {
      freqData = new Uint8Array(binCount);
      timeData = new Uint8Array(analyser.fftSize);
      peakHold = new Float32Array(120);
    }

    analyser.getByteFrequencyData(freqData);
    analyser.getByteTimeDomainData(timeData);

    const nyquist = audioContext.sampleRate / 2;
    const numPoints = 120;

    const grad = analyserCtx.createLinearGradient(0, 10, 0, plotHeight);
    grad.addColorStop(0, fillTop);
    grad.addColorStop(1, fillBottom);

    analyserCtx.beginPath();
    analyserCtx.moveTo(0, plotHeight);

    const pts = [];
    for (let i = 0; i < numPoints; i++) {
      const normX = i / (numPoints - 1);
      const freq = Math.pow(10, LOG_MIN + normX * (LOG_MAX - LOG_MIN));
      const exactBin = (freq / nyquist) * binCount;
      const b0 = Math.floor(exactBin);
      const b1 = Math.min(binCount - 1, b0 + 1);
      const frac = exactBin - b0;

      const nextFreq = Math.pow(10, LOG_MIN + ((i + 1) / (numPoints - 1)) * (LOG_MAX - LOG_MIN));
      const spanBins = Math.max(1, Math.floor(((nextFreq - freq) / nyquist) * binCount));
      let val = freqData[b0] * (1 - frac) + freqData[b1] * frac;
      if (spanBins > 1) {
        let localMax = val;
        for (let k = 0; k < spanBins && b0 + k < binCount; k++) {
          if (freqData[b0 + k] > localMax) localMax = freqData[b0 + k];
        }
        val = localMax;
      }

      const mag = val / 255;
      if (mag > peakHold[i]) {
        peakHold[i] = mag;
      } else {
        peakHold[i] = Math.max(0, peakHold[i] - 0.012);
      }

      const x = normX * width;
      const y = plotHeight - mag * (plotHeight - 16);
      pts.push({ x, y, peakY: plotHeight - peakHold[i] * (plotHeight - 16) });
      analyserCtx.lineTo(x, y);
    }

    analyserCtx.lineTo(width, plotHeight);
    analyserCtx.closePath();
    analyserCtx.fillStyle = grad;
    analyserCtx.fill();

    // Contour stroke
    analyserCtx.beginPath();
    pts.forEach((pt, idx) => {
      if (idx === 0) analyserCtx.moveTo(pt.x, pt.y);
      else analyserCtx.lineTo(pt.x, pt.y);
    });
    analyserCtx.strokeStyle = strokeColor;
    analyserCtx.lineWidth = 2;
    analyserCtx.stroke();

    // Peak-hold ghost line
    analyserCtx.beginPath();
    pts.forEach((pt, idx) => {
      if (idx === 0) analyserCtx.moveTo(pt.x, pt.peakY);
      else analyserCtx.lineTo(pt.x, pt.peakY);
    });
    analyserCtx.strokeStyle = 'rgba(248, 250, 252, 0.22)';
    analyserCtx.lineWidth = 1;
    analyserCtx.stroke();

    // Time-domain waveform overlay
    const waveCenterY = plotHeight * 0.35;
    const waveAmp = plotHeight * 0.26;
    analyserCtx.beginPath();
    const step = Math.max(1, Math.floor(timeData.length / width));
    let maxDev = 0;
    for (let i = 0; i < timeData.length; i += step) {
      const v = (timeData[i] - 128) / 128;
      if (Math.abs(v) > maxDev) maxDev = Math.abs(v);
      const x = (i / timeData.length) * width;
      const y = waveCenterY + v * waveAmp;
      if (i === 0) analyserCtx.moveTo(x, y);
      else analyserCtx.lineTo(x, y);
    }
    analyserCtx.strokeStyle = maxDev > 0.004 ? waveColor : 'rgba(148, 163, 184, 0.18)';
    analyserCtx.lineWidth = maxDev > 0.004 ? 1.6 : 1;
    analyserCtx.stroke();
  } else {
    const waveCenterY = plotHeight * 0.45;
    analyserCtx.beginPath();
    analyserCtx.moveTo(0, waveCenterY);
    analyserCtx.lineTo(width, waveCenterY);
    analyserCtx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
    analyserCtx.lineWidth = 1;
    analyserCtx.stroke();
  }
}

function setupDualAnalyser() {
  analyserCanvas = $('#compareAnalyserCanvas');
  if (!analyserCanvas) return;
  analyserCtx = analyserCanvas.getContext('2d');
  resizeAnalyserCanvas();
  window.addEventListener('resize', resizeAnalyserCanvas);
  const container = $('#compareAnalyserContainer');
  if (container && window.ResizeObserver) {
    new ResizeObserver(() => resizeAnalyserCanvas()).observe(container);
  }
  if (!analyserAnimId) {
    drawDualAnalyser();
  }
}

/* -------------------------------------------------------------
   DSP CONTROLS, THERMAL LOOPS & PREVIEWS (POLYPHONIC MULTI-VOICE)
   ------------------------------------------------------------- */
const activeThermalLoops = new Map(); // key: 'cold'|'normal'|'warm'|'hot' -> timerId

function updateThermalLoopUI(type, isActive) {
  $$(`[data-preview-thermal="${type}"]`).forEach(chip => {
    chip.classList.toggle('is-looping', isActive);
    chip.setAttribute('aria-pressed', String(isActive));
    const badge = chip.querySelector('.chip-loop-badge');
    if (badge) badge.textContent = isActive ? ' ⟳' : '';
  });
  $$(`.sound-legend button[data-legend="${type}"]`).forEach(btn => {
    btn.classList.toggle('is-looping', isActive);
    btn.setAttribute('aria-pressed', String(isActive));
  });
  if (type === 'cold') {
    $$('.sound-legend button[data-legend="cool"]').forEach(btn => {
      btn.classList.toggle('is-looping', isActive);
      btn.setAttribute('aria-pressed', String(isActive));
    });
  } else if (type === 'normal') {
    $$('.sound-legend button[data-legend="reference"]').forEach(btn => {
      btn.classList.toggle('is-looping', isActive);
      btn.setAttribute('aria-pressed', String(isActive));
    });
  }
}

function stopThermalLoop(specificType = null) {
  if (specificType) {
    let norm = specificType;
    if (norm === 'cool') norm = 'cold';
    if (norm === 'reference') norm = 'normal';

    const timer = activeThermalLoops.get(norm);
    if (timer) clearTimeout(timer);
    activeThermalLoops.delete(norm);
    updateThermalLoopUI(norm, false);

    if (activeThermalLoops.size === 0) {
      state.activeThemeKey = null;
      updateVisualizerHeader(null);
    } else {
      const remaining = [...activeThermalLoops.keys()];
      state.activeThemeKey = remaining[remaining.length - 1];
      updateVisualizerHeader(state.activeThemeKey);
    }
    return;
  }

  // Stop ALL active thermal loops
  activeThermalLoops.forEach((timer, type) => {
    if (timer) clearTimeout(timer);
    updateThermalLoopUI(type, false);
  });
  activeThermalLoops.clear();

  state.activeThemeKey = null;
  updateVisualizerHeader(null);
}

async function toggleThermalLoop(type) {
  let norm = type;
  if (type === 'cool') norm = 'cold';
  if (type === 'reference') norm = 'normal';

  // If this voice is already looping, turn it off independently
  if (activeThermalLoops.has(norm)) {
    stopThermalLoop(norm);
    const remaining = [...activeThermalLoops.keys()];
    if (remaining.length > 0) {
      const remainingNames = remaining.map(k => k.toUpperCase()).join(' + ');
      setStatus(`Stopped ${norm}. Still playing: ${remainingNames}.`);
    } else {
      setStatus(`Stopped ${norm} thermal sound loop.`);
    }
    return;
  }

  // Ensure audio is ready and stop welcome audio if any
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: 'STOP_WELCOME_AUDIO' }, '*');
  }

  if (!await ensureAudio() || state.muted) return;

  // Add to active loops map
  activeThermalLoops.set(norm, null);
  updateThermalLoopUI(norm, true);

  const activeNames = [...activeThermalLoops.keys()].map(k => k.toUpperCase()).join(' + ');
  setStatus(`Playing ${activeNames} thermal sound(s) (looping — click any active sound to stop it)...`);
  updateVisualizerHeader(norm);

  async function step() {
    if (!activeThermalLoops.has(norm)) return;
    const dur = await playThermalVoice(norm, { suppressVisual: false });
    state.activeThemeUntil = performance.now() + 10000;

    const intervalMs = Math.max(650, Math.round(dur * 1000 * 0.88));
    const timer = setTimeout(() => {
      if (activeThermalLoops.has(norm)) {
        step();
      }
    }, intervalMs);
    activeThermalLoops.set(norm, timer);
  }

  step();
}

function setupDspControls() {
  const volSlider = $('#compare-volume-slider');
  const volDb = $('#compare-volume-db');
  const durSlider = $('#compare-duration-slider');
  const durVal = $('#compare-duration-val');
  const foleyBtn = $('#compare-foley-toggle');
  const muteBtn = $('#compare-mute-toggle');
  const muteIcon = $('#compare-mute-icon');
  const muteText = $('#compare-mute-text');

  if (volSlider) {
    volSlider.value = String(state.masterVolume);
    volSlider.addEventListener('input', e => {
      state.masterVolume = parseFloat(e.target.value);
      if (masterGain && !state.muted && audioContext) {
        masterGain.gain.setValueAtTime(state.masterVolume, audioContext.currentTime);
      }
      if (volDb) {
        if (state.masterVolume <= 0.001) volDb.textContent = '-∞ dB';
        else volDb.textContent = `${(20 * Math.log10(state.masterVolume)).toFixed(1)} dB`;
      }
    });
  }

  if (durSlider) {
    durSlider.value = String(state.durationScale);
    durSlider.addEventListener('input', e => {
      state.durationScale = parseFloat(e.target.value);
      if (durVal) durVal.textContent = `${state.durationScale.toFixed(1)}s`;
    });
  }

  if (foleyBtn) {
    foleyBtn.addEventListener('click', () => {
      state.foleyEnabled = !state.foleyEnabled;
      foleyBtn.classList.toggle('active', state.foleyEnabled);
      foleyBtn.setAttribute('aria-pressed', String(state.foleyEnabled));
    });
  }

  if (muteBtn) {
    muteBtn.addEventListener('click', () => {
      state.muted = !state.muted;
      if (masterGain && audioContext) {
        masterGain.gain.setValueAtTime(state.muted ? 0 : state.masterVolume, audioContext.currentTime);
      }
      muteBtn.classList.toggle('active', state.muted);
      muteBtn.setAttribute('aria-pressed', String(state.muted));
      if (muteIcon) muteIcon.textContent = state.muted ? '🔇' : '🔊';
      if (muteText) muteText.textContent = state.muted ? 'Unmute' : 'Mute';
    });
  }

  // Thermal Preview Chips (Looping toggle)
  $$('[data-preview-thermal]').forEach(chip => {
    chip.addEventListener('click', () => {
      const type = chip.dataset.previewThermal;
      toggleThermalLoop(type);
    });
  });

  // Sound Legend buttons in Frame mode (Looping toggle)
  $$('.sound-legend button[data-legend]').forEach(btn => {
    btn.addEventListener('click', () => {
      const category = btn.dataset.legend;
      toggleThermalLoop(category);
    });
  });
}

function initialize(){
  populateSelects();bindEvents();selectBand(0);updateYear(0);updateComparison();
  setupDualAnalyser();setupDspControls();
  if(new URLSearchParams(location.search).get('view')==='globe')setEarthView('globe');
}

initialize();
