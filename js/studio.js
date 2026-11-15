import * as THREE from 'three';
import { CSS3DRenderer, CSS3DObject } from '../vendor/CSS3DRenderer.js';
import { store } from './core/JukeboxStore.js';

// -------------------------------------------------------------
// EARTHTUNE STUDIO — 3D INTERACTIVE ROOM ARCHITECTURE
// -------------------------------------------------------------

const $ = (selector) => document.querySelector(selector);
const stage = $('#studio');
const sceneHost = $('#scene');
const mobileWorkbenchDock = $('#mobile-workbench-dock');

// CSS3D Scene setup for interactive web pages on 3D monitor screens
const cssScene = new THREE.Scene();
const cssRenderer = new CSS3DRenderer();
cssRenderer.setSize(window.innerWidth, window.innerHeight);
cssRenderer.domElement.style.position = 'absolute';
cssRenderer.domElement.style.top = '0';
cssRenderer.domElement.style.left = '0';
cssRenderer.domElement.style.width = '100%';
cssRenderer.domElement.style.height = '100%';
cssRenderer.domElement.style.pointerEvents = 'none';
cssRenderer.domElement.style.zIndex = '2';
cssRenderer.domElement.className = 'studio-css3d-layer';
sceneHost.appendChild(cssRenderer.domElement);

// -------------------------------------------------------------
// EMBEDDED MONITOR WORKSTATION (Directly on 3D Monitor Screen)
// -------------------------------------------------------------
const monitorWrapper = document.createElement('div');
monitorWrapper.className = 'monitor-css3d-wrapper';
monitorWrapper.style.width = '960px';
monitorWrapper.style.height = '540px';
monitorWrapper.style.position = 'relative';
monitorWrapper.style.borderRadius = '2px';
monitorWrapper.style.overflow = 'hidden';
monitorWrapper.style.backgroundColor = '#0f1822';
monitorWrapper.style.boxShadow = '0 0 42px rgba(77, 243, 255, 0.16), 0 0 95px rgba(255, 210, 140, 0.12)';
monitorWrapper.style.pointerEvents = 'auto';

const monitorFrame = document.createElement('iframe');
monitorFrame.id = 'embedded-workstation-frame';
monitorFrame.src = './monitor-workbench/index.html';
monitorFrame.title = 'EarthTune Studio — NASA Earth Information Sonification Workbench';
// Monitor-optimized 16:9 virtual canvas (960x540 provides +67% optical boost on 3D monitor)
monitorFrame.style.width = '960px';
monitorFrame.style.height = '540px';
monitorFrame.style.border = 'none';
monitorFrame.style.display = 'block';
monitorFrame.style.backgroundColor = '#0f1822';
monitorFrame.style.pointerEvents = 'auto'; // Direct interaction enabled in Overview and Desk modes
monitorFrame.setAttribute('allow', 'autoplay');

// Click-to-focus shield over monitor (used only when focused on Globe)
const monitorClickShield = document.createElement('div');
monitorClickShield.className = 'monitor-click-shield';
monitorClickShield.title = 'Click monitor to focus Scan & Compare Workbench';
monitorClickShield.style.position = 'absolute';
monitorClickShield.style.inset = '0';
monitorClickShield.style.cursor = 'pointer';
monitorClickShield.style.pointerEvents = 'auto';
monitorClickShield.style.display = 'none';
monitorClickShield.style.background = 'transparent';
monitorClickShield.addEventListener('click', (e) => {
  e.stopPropagation();
  if (S.focus !== 'desk') {
    focusTarget('desk');
  }
});

monitorWrapper.appendChild(monitorFrame);
monitorWrapper.appendChild(monitorClickShield);

const monitorCSSObj = new CSS3DObject(monitorWrapper);
// Monitor physical width in 3D scene is 4.1061m, height 2.3173m
const cssScale = 4.1061 / 960;
monitorCSSObj.scale.set(cssScale, cssScale, cssScale);
// Initial placeholder position (will be aligned to Screen_Observatory_Monitor on load)
monitorCSSObj.position.set(-2.955, 2.345, -0.285);
cssScene.add(monitorCSSObj);

const compactQuery = matchMedia('(max-width:760px)');
let storedMotion = null;
try { storedMotion = localStorage.getItem('earthtone.motion'); } catch {}
// Keep interactive camera parallax active unless explicitly turned off by the user
let motionOff = storedMotion === 'off';

let compact = compactQuery.matches;
let isPlaying = false;
let isMuted = false;
let isRoomLightOn = true;
let currentVolume = 0.85;

function syncCompactWorkbenchLayout() {
  compact = compactQuery.matches;
  document.body.classList.toggle('compact-mobile', compact);
  if (compact && mobileWorkbenchDock) {
    mobileWorkbenchDock.hidden = false;
    if (monitorFrame.parentElement !== mobileWorkbenchDock) {
      mobileWorkbenchDock.appendChild(monitorFrame);
    }
    monitorFrame.style.width = '100%';
    monitorFrame.style.height = '920px';
    monitorFrame.style.pointerEvents = 'auto';
    if (cssRenderer?.domElement) {
      cssRenderer.domElement.style.display = 'none';
    }
    // On mobile, monitorFrame is docked below #scene, so keep the 3D banner focused on the Globe/Overview
    if (S && S.focus === 'desk') {
      const globeView = focusTargets.get('globe') || focusTargets.get('overview');
      if (globeView) {
        S.basePos.copy(globeView.position);
        S.baseLook.copy(globeView.target);
      }
    }
  } else {
    if (mobileWorkbenchDock) {
      mobileWorkbenchDock.hidden = true;
    }
    if (monitorFrame.parentElement !== monitorWrapper) {
      monitorWrapper.insertBefore(monitorFrame, monitorClickShield);
    }
    monitorFrame.style.width = '960px';
    monitorFrame.style.height = '540px';
    if (cssRenderer?.domElement) {
      cssRenderer.domElement.style.display = '';
    }
  }
}

// Scene setup — Architectural studio environment
const scene = new THREE.Scene();
scene.background = new THREE.Color('#0c131a');
scene.fog = new THREE.Fog('#0c131a', 14, 38);

const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 80);

// -------------------------------------------------------------
// 1. EXTENSIBLE FOCUS TARGET REGISTRY
// Designed for seamless addition of future toggle buttons & targets
// -------------------------------------------------------------
export const focusTargets = new Map();

export function registerFocusTarget(id, config) {
  focusTargets.set(id, {
    id,
    label: config.label || id,
    position: config.position instanceof THREE.Vector3 ? config.position.clone() : new THREE.Vector3(...config.position),
    target: config.target instanceof THREE.Vector3 ? config.target.clone() : new THREE.Vector3(...config.target),
    fov: config.fov || 40,
    parallaxScale: config.parallaxScale ?? (id === 'overview' ? 1.0 : 0.25),
    onFocus: config.onFocus || null,
    onBlur: config.onBlur || null
  });
}

// Register core EarthTune Studio focal anchors
registerFocusTarget('overview', {
  label: 'EarthTune Studio Overview',
  position: new THREE.Vector3(-0.10, 2.75, 9.05),
  target: new THREE.Vector3(-0.10, 2.20, -0.30),
  fov: 40,
  parallaxScale: 1.0
});

registerFocusTarget('globe', {
  label: '3D Earth Globe',
  position: new THREE.Vector3(3.15, 2.20, 5.20),
  target: new THREE.Vector3(3.15, 2.10, -0.34),
  fov: 38,
  parallaxScale: 0.25
});

registerFocusTarget('desk', {
  label: 'Scan & Compare Workbench',
  position: new THREE.Vector3(-1.75, 2.64, 2.88),
  target: new THREE.Vector3(-2.955, 2.345, -0.285),
  fov: 42,
  parallaxScale: 0.12,
  onFocus: () => {
    try { monitorFrame.contentWindow?.focus(); } catch {}
    announce('EarthTune Scan & Compare Workbench engaged. Control directly on the monitor.');
  },
  onBlur: () => {
    announce('EarthTune Studio overview focused.');
  }
});

// Backward-compatible view lookup
export const views = {
  get overview() { return focusTargets.get('overview'); },
  get globe() { return focusTargets.get('globe'); },
  get desk() { return focusTargets.get('desk'); }
};

// -------------------------------------------------------------
// 2. CENTRAL CAMERA & INTERACTION STATE MODEL
// -------------------------------------------------------------
const defaultTarget = focusTargets.get('overview');

export const S = {
  // Current interpolated values (rendered every frame)
  pos: new THREE.Vector3().copy(defaultTarget.position),
  look: new THREE.Vector3().copy(defaultTarget.target),
  fov: 40,

  // Interpolated Parallax Offsets
  camOffset: new THREE.Vector3(),
  lookOffset: new THREE.Vector3(),

  // Targets (where camera is easing towards)
  basePos: new THREE.Vector3().copy(defaultTarget.position),
  baseLook: new THREE.Vector3().copy(defaultTarget.target),
  targetCamOffset: new THREE.Vector3(),
  targetLookOffset: new THREE.Vector3(),
  targetFov: 40,

  // Overview wheel depth zoom (clamped inside room boundaries)
  depthMin: 6.2,
  depthMax: 9.05,
  depthTarget: defaultTarget.position.z,
  depthCurrent: defaultTarget.position.z,

  // Interaction & Focus Flags
  focus: 'overview',
  pointer: null,            // { x, y } client coordinates
  mouseMoved: false,        // Dirty flag for pointer movement
  drag: null,               // Active pointer drag session
  suppressClickUntil: 0,    // Timestamp to block click events right after dragging
  lastInteraction: performance.now()
};

export let focus = 'overview';

// Check URL query view parameter
const urlParams = new URLSearchParams(window.location.search);
const initView = urlParams.get('view');
if (initView && focusTargets.has(initView)) {
  const initTarget = focusTargets.get(initView);
  S.focus = initView;
  focus = initView;
  S.pos.copy(initTarget.position);
  S.look.copy(initTarget.target);
  S.basePos.copy(initTarget.position);
  S.baseLook.copy(initTarget.target);
  S.fov = initTarget.fov || 40;
  S.targetFov = S.fov;
  document.body.dataset.focus = initView;
  if (monitorFrame) {
    monitorFrame.style.pointerEvents = initView === 'globe' ? 'none' : 'auto';
  }
  if (monitorClickShield) {
    monitorClickShield.style.display = initView === 'globe' ? 'block' : 'none';
  }
}
camera.position.copy(S.pos);
camera.lookAt(S.look);

// -------------------------------------------------------------
// LIGHTING SETUP — NIGHT OBSERVATORY MODE (Reference B)
// -------------------------------------------------------------
const hemiLight = new THREE.HemisphereLight('#7aa2c4', '#080e16', 0.45);
scene.add(hemiLight);

const keyLight = new THREE.DirectionalLight('#d8e6f5', 0.48);
keyLight.position.set(2, 7, 7);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight('#4a7298', 0.25);
fillLight.position.set(-5, 6, 5);
scene.add(fillLight);

// Dais centerpiece hologram spotlight
const daisSpot = new THREE.SpotLight('#64f0ff', 6.2, 16, 0.45, 0.5, 1.2);
daisSpot.position.set(3.15, 7.50, 1.50);
daisSpot.target.position.set(3.15, 2.19, -0.34);
scene.add(daisSpot, daisSpot.target);

// Dais upward emitter optic glow
const daisEmitterLight = new THREE.PointLight('#4df3ff', 4.5, 6, 1.8);
daisEmitterLight.position.set(3.10, 0.45, -0.24);
scene.add(daisEmitterLight);

// Warm architectural downlight for the Left Telemetry Table & Monitor Stand
const leftDeskSpot = new THREE.SpotLight('#ffd27d', 7.5, 16, 0.62, 0.68, 1.1);
leftDeskSpot.position.set(-3.20, 6.50, 2.20);
leftDeskSpot.target.position.set(-3.20, 0.42, -0.15);
scene.add(leftDeskSpot, leftDeskSpot.target);

// Under-monitor warm amber table wash (highlights monitor stand, bezel & tabletop surface)
const deskTaskLight = new THREE.PointLight('#ffca6b', 4.2, 6.5, 1.35);
deskTaskLight.position.set(-2.95, 0.92, 0.28);
scene.add(deskTaskLight);

// Soft warm fill for the left tabletop edge and outer monitor frame
const leftTableWarmFill = new THREE.PointLight('#ffd88a', 2.8, 7.5, 1.4);
leftTableWarmFill.position.set(-4.65, 1.35, 0.85);
scene.add(leftTableWarmFill);

// Backlight halos on the studio wall behind the Monitor and Hologram Globe
const monitorHalo = new THREE.PointLight('#ffcf78', 5.2, 9.0, 1.35);
monitorHalo.position.set(-2.95, 2.45, -0.05);
scene.add(monitorHalo);

const globeHalo = new THREE.PointLight('#38e8ff', 5.5, 8.5, 1.5);
globeHalo.position.set(3.15, 2.35, 0.65);
scene.add(globeHalo);

function toggleRoomLights() {
  isRoomLightOn = !isRoomLightOn;
  keyLight.intensity = isRoomLightOn ? 0.48 : 1.5;
  fillLight.intensity = isRoomLightOn ? 0.25 : 0.75;
  hemiLight.intensity = isRoomLightOn ? 0.45 : 1.25;
  playRelaySwitchSound();
  announce(isRoomLightOn ? 'Studio lighting: Night Observation Mode' : 'Studio overhead lighting: On');
}

function announce(message) {
  const el = $('#announcer');
  if (el) el.textContent = message;
}

// -------------------------------------------------------------
// WEB AUDIO SYNTHESIZER & SONIFICATION ENGINE
// -------------------------------------------------------------
let audioCtx = null;
let masterGain = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (AudioCtor) {
      audioCtx = new AudioCtor();
      masterGain = audioCtx.createGain();
      masterGain.gain.setValueAtTime(currentVolume, audioCtx.currentTime);
      masterGain.connect(audioCtx.destination);
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playRelaySwitchSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.045);
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.048);
    osc.connect(gain);
    gain.connect(masterGain || ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  } catch {}
}

function playSynthesizedTone(type) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    if (type === 'resonance') {
      [117.45, 234.9, 352.35, 469.8].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = idx === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.12 / (idx + 1), now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 4.5);
        osc.connect(gain);
        gain.connect(masterGain || ctx.destination);
        osc.start(now);
        osc.stop(now + 4.6);
      });
      announce('Track 03: Atmospheric Schumann Harmonic Resonance playing.');
    } else if (type === 'aux') {
      [261.63, 329.63, 392.00, 523.25, 659.25].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        const startT = now + idx * 0.07;
        osc.frequency.setValueAtTime(freq, startT);
        gain.gain.setValueAtTime(0.09, startT);
        gain.gain.exponentialRampToValueAtTime(0.0001, startT + 3.8);
        osc.connect(gain);
        gain.connect(masterGain || ctx.destination);
        osc.start(startT);
        osc.stop(startT + 3.9);
      });
      announce('Track 04: NASA Space Challenge Auxiliary Channel playing.');
    }
  } catch (err) {
    console.warn('Tone synth notice:', err);
  }
}

const iframe = $('#observatory');
function command(action, value) {
  try {
    const api = iframe?.contentWindow?.earthtoneController;
    if (!api) {
      announce('Connecting to observatory audio engine…');
      return false;
    }
    api.command(action, value);
    return true;
  } catch {
    announce('The observatory audio engine could not connect.');
    return false;
  }
}

const trackTitles = [
  'NASA Goddard: Global Surface Temperature Anomaly',
  'TRMM / GPM: Satellite Precipitation Granular Acoustics',
  'Atmospheric Schumann Harmonic Resonance (117.45 Hz)',
  'NASA Space Challenge: Deep Space Auxiliary Carrier'
];
let currentTrackIdx = 0;

function selectTrack(idx) {
  currentTrackIdx = idx % trackTitles.length;
  playRelaySwitchSound();

  // Animate jukebox button depress
  animateButtonDepress(currentTrackIdx + 1);

  if (currentTrackIdx === 0) {
    command('track', 'temperature');
    command('play');
    isPlaying = true;
    announce(trackTitles[0]);
  } else if (currentTrackIdx === 1) {
    command('track', 'rain');
    command('play');
    isPlaying = true;
    announce(trackTitles[1]);
  } else if (currentTrackIdx === 2) {
    playSynthesizedTone('resonance');
    isPlaying = true;
  } else if (currentTrackIdx === 3) {
    playSynthesizedTone('aux');
    isPlaying = true;
  }
}

// -------------------------------------------------------------
// DYNAMIC TELEMETRY SCREEN (CanvasTexture on Screen_Observatory_Monitor)
// -------------------------------------------------------------
const screenCanvas = document.createElement('canvas');
screenCanvas.width = 512;
screenCanvas.height = 288;
const screenCtx = screenCanvas.getContext('2d');
const screenTex = new THREE.CanvasTexture(screenCanvas);
screenTex.colorSpace = THREE.SRGBColorSpace;
screenTex.wrapS = THREE.RepeatWrapping;
screenTex.repeat.x = -1;
screenTex.offset.x = 1;
screenTex.center.set(0.5, 0.5);
screenTex.rotation = Math.PI;

function updateScreenTexture(time) {
  if (!screenCtx) return;
  const w = screenCanvas.width;
  const h = screenCanvas.height;

  // Background
  screenCtx.fillStyle = '#09131d';
  screenCtx.fillRect(0, 0, w, h);

  // Top header bar
  screenCtx.fillStyle = '#102436';
  screenCtx.fillRect(0, 0, w, 38);
  screenCtx.fillStyle = '#4df3ff';
  screenCtx.font = 'bold 15px monospace';
  screenCtx.fillText('NASA EARTH JUKEBOX · 1980–2025', 18, 24);

  // Status indicator dot
  screenCtx.fillStyle = '#4df3ff';
  screenCtx.beginPath();
  screenCtx.arc(w - 24, 19, 6, 0, Math.PI * 2);
  screenCtx.fill();

  const curPoint = store.currentPoint || { year: 1980, value: 0.26 };
  // Active track label
  screenCtx.fillStyle = '#8ea9b8';
  screenCtx.font = '12px sans-serif';
  screenCtx.fillText('ACTIVE ANOMALY ARCHIVE · GISTEMP v4', 18, 66);

  screenCtx.fillStyle = '#ffffff';
  screenCtx.font = 'bold 20px monospace';
  screenCtx.fillText(`YEAR ${curPoint.year} : ${curPoint.value >= 0 ? '+' : ''}${curPoint.value.toFixed(2)} °C`, 18, 96);

  // Waveform visualization box
  screenCtx.fillStyle = '#0b1822';
  screenCtx.fillRect(18, 114, w - 36, 95);

  screenCtx.strokeStyle = '#cc4d2f';
  screenCtx.lineWidth = 2.5;
  screenCtx.beginPath();
  const points = 32;
  const step = (w - 36) / points;
  for (let i = 0; i <= points; i++) {
    const x = 18 + i * step;
    const wave = Math.sin(time * 3 + i * 0.4) * 22;
    const y = 162 + wave;
    if (i === 0) screenCtx.moveTo(x, y);
    else screenCtx.lineTo(x, y);
  }
  screenCtx.stroke();

  // Prompt button box
  screenCtx.fillStyle = '#1a4d46';
  screenCtx.fillRect(18, 222, w - 36, 44);
  screenCtx.fillStyle = '#5effdf';
  screenCtx.font = 'bold 13px sans-serif';
  screenCtx.textAlign = 'center';
  screenCtx.fillText('CLICK MONITOR TO OPEN MISSION CONTROL', w / 2, 250);
  screenCtx.textAlign = 'left';

  screenTex.needsUpdate = true;
}

// -------------------------------------------------------------
// REAL 3D HOLOGRAPHIC EARTH (Centerpiece apparatus on Right Table)
// Standalone floating globe sized to exact Blender reference (2.66m diameter)
// -------------------------------------------------------------
const globeCenter = new THREE.Vector3(3.147, 2.192, -0.337);

const globeGroup = new THREE.Group();
globeGroup.position.copy(globeCenter);
scene.add(globeGroup);

// Upright orientation (0-degree tilt) so Arctic-to-Antarctic bands align naturally with the flat map
const globeTiltGroup = new THREE.Group();
globeTiltGroup.rotation.z = 0;
globeGroup.add(globeTiltGroup);

const earthTexLoader = new THREE.TextureLoader();
const globeTexCache = new Map();
const LAST_REGIONAL_YEAR = 2025;

// Layer 1: High-clarity NASA Blue Marble base Earth (continents, terrain relief, oceans)
const blueMarbleTex = earthTexLoader.load('assets/earth-blue-marble.jpg');
blueMarbleTex.colorSpace = THREE.SRGBColorSpace;
blueMarbleTex.anisotropy = 8;

const globeBaseSphere = new THREE.Mesh(
  new THREE.SphereGeometry(1.326, 64, 48),
  new THREE.MeshStandardMaterial({
    map: blueMarbleTex,
    emissive: new THREE.Color('#ffffff'),
    emissiveMap: blueMarbleTex,
    emissiveIntensity: 0.42,
    roughness: 0.38,
    metalness: 0.08
  })
);
globeBaseSphere.renderOrder = 0;

// Layer 2: Dynamic NASA GISS temperature anomaly heatmap layer (1980–2025)
let activeEarthTex = earthTexLoader.load('assets/eic/1980.webp');
activeEarthTex.colorSpace = THREE.SRGBColorSpace;
activeEarthTex.anisotropy = 8;
globeTexCache.set(1980, activeEarthTex);

const globeSphere = new THREE.Mesh(
  new THREE.SphereGeometry(1.33, 64, 48),
  new THREE.MeshStandardMaterial({
    map: activeEarthTex,
    emissive: new THREE.Color('#ffffff'),
    emissiveMap: activeEarthTex,
    emissiveIntensity: 0.55,
    transparent: true,
    opacity: 0.70,
    roughness: 0.32,
    metalness: 0.10,
    depthWrite: false
  })
);
globeSphere.renderOrder = 1;
globeSphere.material.opacity = 0;

// Layer 3: Crisp vector country borders & coastlines shell
const worldBordersTex = earthTexLoader.load('assets/world-borders-clean.svg');
worldBordersTex.colorSpace = THREE.SRGBColorSpace;
worldBordersTex.anisotropy = 8;

const globeBordersSphere = new THREE.Mesh(
  new THREE.SphereGeometry(1.334, 64, 48),
  new THREE.MeshBasicMaterial({
    map: worldBordersTex,
    transparent: true,
    opacity: 0.96,
    depthWrite: false
  })
);
globeBordersSphere.renderOrder = 2;

// Attach base Earth and country borders to globeSphere so all 3 layers rotate together
globeSphere.add(globeBaseSphere);
globeSphere.add(globeBordersSphere);

// Center Prime Meridian (Africa/Europe/Atlantic) toward the camera to match the flat map
globeSphere.rotation.y = -Math.PI / 2;
globeTiltGroup.add(globeSphere);

let currentGlobeYear = 1980;
function setGlobeYearTexture(year, available = true) {
  const numYear = Number(year);
  if (!Number.isInteger(numYear) || numYear < 1980) return;
  const regionalAvailable = available && numYear <= LAST_REGIONAL_YEAR;
  if (!regionalAvailable) {
    globeSphere.material.visible = false;
    currentGlobeYear = null;
    return;
  }
  if (numYear === currentGlobeYear) return;
  currentGlobeYear = numYear;
  if (globeTexCache.has(numYear)) {
    const cachedTex = globeTexCache.get(numYear);
    globeSphere.material.visible = true;
    globeSphere.material.map = cachedTex;
    globeSphere.material.emissiveMap = cachedTex;
    globeSphere.material.needsUpdate = true;
    return;
  }
  earthTexLoader.load(`assets/eic/${numYear}.webp`, (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    globeTexCache.set(numYear, tex);
    if (currentGlobeYear === numYear) {
      globeSphere.material.visible = true;
      globeSphere.material.map = tex;
      globeSphere.material.emissiveMap = tex;
      globeSphere.material.needsUpdate = true;
    }
  });
}

// Synchronize globe texture with store year changes
store.addEventListener('yearChange', (e) => {
  setGlobeYearTexture(e.detail.point.year);
});

// Rayleigh limb atmospheric glow shell
const atmoShell = new THREE.Mesh(
  new THREE.SphereGeometry(1.37, 48, 32),
  new THREE.MeshBasicMaterial({
    color: '#4df3ff',
    transparent: true,
    opacity: 0.22,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide
  })
);
globeTiltGroup.add(atmoShell);

// -------------------------------------------------------------
// 3D ARCTIC-TO-ANTARCTIC LATITUDE SCAN OVERLAY ON HOLOGRAM GLOBE
// Mirrors the flat-map latitude sweep (Arctic -> N. Mid -> Tropics -> S. Mid -> Antarctic)
// -------------------------------------------------------------
const globeScanGroup = new THREE.Group();
globeScanGroup.visible = false;
globeTiltGroup.add(globeScanGroup);

// Glowing golden latitude ring that glides smoothly from North Pole to South Pole
const globeScanRing = new THREE.Mesh(
  new THREE.TorusGeometry(1, 0.018, 16, 72),
  new THREE.MeshBasicMaterial({
    color: '#ffd24d',
    transparent: true,
    opacity: 0.96,
    depthWrite: false
  })
);
globeScanRing.rotation.x = Math.PI / 2;
globeScanGroup.add(globeScanRing);

// 5 spherical latitude band highlight groups (0: Arctic .. 4: Antarctic)
const GLOBE_BAND_THETA = [
  [0, Math.PI / 6],               // 0: Arctic (60°N - 90°N)
  [Math.PI / 6, Math.PI / 6],     // 1: N. Mid (30°N - 60°N)
  [Math.PI / 3, Math.PI / 3],     // 2: Tropics (30°S - 30°N)
  [2 * Math.PI / 3, Math.PI / 6], // 3: S. Mid (30°S - 60°S)
  [5 * Math.PI / 6, Math.PI / 6]  // 4: Antarctic (60°S - 90°S)
];

const globeBandMeshes = GLOBE_BAND_THETA.map(([thetaStart, thetaLength]) => {
  const bandGroup = new THREE.Group();
  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(1.342, 64, 16, 0, Math.PI * 2, thetaStart, thetaLength),
    new THREE.MeshBasicMaterial({
      color: '#ffd24d',
      transparent: true,
      opacity: 0.16,
      side: THREE.FrontSide,
      depthWrite: false
    })
  );
  bandGroup.add(shell);

  // Add crisp golden latitude border rings at the band edges (excluding poles 0 and PI)
  [thetaStart, thetaStart + thetaLength].forEach((theta) => {
    if (theta > 0.05 && theta < Math.PI - 0.05) {
      const latPhi = (Math.PI / 2) - theta;
      const borderRadius = 1.346 * Math.cos(latPhi);
      const borderY = 1.346 * Math.sin(latPhi);
      const borderRing = new THREE.Mesh(
        new THREE.TorusGeometry(borderRadius, 0.011, 12, 64),
        new THREE.MeshBasicMaterial({
          color: '#e4b846',
          transparent: true,
          opacity: 0.88,
          depthWrite: false
        })
      );
      borderRing.rotation.x = Math.PI / 2;
      borderRing.position.y = borderY;
      bandGroup.add(borderRing);
    }
  });

  bandGroup.visible = false;
  globeScanGroup.add(bandGroup);
  return bandGroup;
});

const globeScanState = {
  active: false,
  targetPhi: Math.PI / 2,
  currentPhi: Math.PI / 2,
  bandIndex: -1
};



// -------------------------------------------------------------
// LOAD ENCLOSED STUDIO ROOM GLB MODEL
// -------------------------------------------------------------
const roomGroup = new THREE.Group();
scene.add(roomGroup);

let screenMesh = null;
let deskKeyboardObj = null;
let deskTeamKeycapObj = null;
let switchPlateMesh = null;
let switchRockerMesh = null;
let jukeboxVolumeKnob = null;
let jukeboxStationMesh = null;
let deskConsoleMesh = null;
let playerButtonRed = null;
let playerChassisMesh = null;
let consoleDeskMesh = null;

const trackButtons = [];

function isDescendantOf(obj, targetRoot) {
  if (!obj || !targetRoot) return false;
  let curr = obj;
  while (curr) {
    if (curr === targetRoot) return true;
    curr = curr.parent;
  }
  return false;
}

function animateDeskPropPress(obj, deltaY = 0.03, durationMs = 155) {
  if (!obj) return;
  if (obj.userData.origY === undefined) {
    obj.userData.origY = obj.position.y;
  }
  obj.position.y = obj.userData.origY - deltaY;
  if (obj.userData.pressTimer) clearTimeout(obj.userData.pressTimer);
  obj.userData.pressTimer = setTimeout(() => {
    obj.position.y = obj.userData.origY;
    obj.userData.pressTimer = null;
  }, durationMs);
}

const teamModalEl = $('#team-modal');
const teamModalCloseBtn = $('#team-modal-close');
const teamModalDoneBtn = $('#team-modal-done');
const teamNavBtn = $('#team-nav-button');

export function openTeamModal() {
  if (!teamModalEl) return;
  updateKeycapFloatingTag(false);
  teamModalEl.hidden = false;
  announce('Meet the Team panel opened.');
  setTimeout(() => {
    teamModalCloseBtn?.focus();
  }, 40);
}

export function closeTeamModal() {
  if (!teamModalEl || teamModalEl.hidden) return;
  teamModalEl.hidden = true;
  announce('Closed Meet the Team panel. Returned to EarthTune Studio.');
}

teamNavBtn?.addEventListener('click', openTeamModal);
teamModalCloseBtn?.addEventListener('click', closeTeamModal);
teamModalDoneBtn?.addEventListener('click', closeTeamModal);
const keycapTagEl = $('#keycap-floating-tag');
const tempKeycapVec = new THREE.Vector3();

function updateKeycapFloatingTag(visible) {
  if (!keycapTagEl) return;
  if (!visible || !deskTeamKeycapObj || !camera || (teamModalEl && !teamModalEl.hidden)) {
    keycapTagEl.style.display = 'none';
    return;
  }
  deskTeamKeycapObj.getWorldPosition(tempKeycapVec);
  tempKeycapVec.y += 0.07;
  tempKeycapVec.project(camera);
  if (tempKeycapVec.z > 1) {
    keycapTagEl.style.display = 'none';
    return;
  }
  const x = (tempKeycapVec.x * 0.5 + 0.5) * window.innerWidth;
  const y = (-(tempKeycapVec.y * 0.5) + 0.5) * window.innerHeight;
  keycapTagEl.style.left = `${x}px`;
  keycapTagEl.style.top = `${y}px`;
  keycapTagEl.style.display = 'flex';
}

keycapTagEl?.addEventListener('click', () => {
  playRelaySwitchSound();
  if (deskTeamKeycapObj) animateDeskPropPress(deskTeamKeycapObj, 0.04, 175);
  openTeamModal();
});
teamModalEl?.addEventListener('click', (e) => {
  if (e.target === teamModalEl) {
    closeTeamModal();
  }
});
teamModalEl?.addEventListener('keydown', (e) => {
  if (e.key !== 'Tab') return;
  const focusable = [...teamModalEl.querySelectorAll('button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])')]
    .filter((el) => !el.hidden && el.getAttribute('aria-hidden') !== 'true');
  if (!focusable.length) {
    e.preventDefault();
    teamModalEl.focus();
    return;
  }
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (e.shiftKey && (document.activeElement === first || !teamModalEl.contains(document.activeElement))) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && (document.activeElement === last || !teamModalEl.contains(document.activeElement))) {
    e.preventDefault();
    first.focus();
  }
});

function animateButtonDepress(btnIdx) {
  const btn = trackButtons[btnIdx - 1];
  if (!btn) return;
  const origZ = btn.userData.origZ !== undefined ? btn.userData.origZ : btn.position.z;
  btn.userData.origZ = origZ;
  btn.position.z = origZ - 0.02;
  setTimeout(() => {
    btn.position.z = origZ;
  }, 160);
}

const gltfLoader = new (window.THREE?.GLTFLoader || window.GLTFLoader || THREE.GLTFLoader)();
gltfLoader.load(
  'assets/models/studio_room.glb',
  (gltf) => {
    const roomModel = gltf.scene;
    roomGroup.add(roomModel);

    roomModel.traverse((child) => {
      if (child.name === 'Desk_Mechanical_Keyboard') {
        deskKeyboardObj = child;
      } else if (child.name === 'Desk_Team_Keycap') {
        deskTeamKeycapObj = child;
      }

      if (child.isMesh) {
        // DoubleSide to prevent any invisible walls or backface culling
        if (child.material) {
          child.material.side = THREE.DoubleSide;
          if (child.material.map) child.material.map.colorSpace = THREE.SRGBColorSpace;
          if (child.material.emissiveMap) child.material.emissiveMap.colorSpace = THREE.SRGBColorSpace;
        }

        const matName = child.material?.name || '';

        if (matName === 'Mat_KB_Chassis') {
          child.material = new THREE.MeshStandardMaterial({
            color: '#18202a',
            roughness: 0.30,
            metalness: 0.68,
            side: THREE.DoubleSide
          });
        } else if (matName === 'Mat_KB_Backlight') {
          child.material = new THREE.MeshStandardMaterial({
            color: '#ffba52',
            emissive: new THREE.Color('#ffa826'),
            emissiveIntensity: 1.85,
            roughness: 0.20,
            metalness: 0.10,
            side: THREE.DoubleSide
          });
        } else if (matName === 'Mat_KB_KeyDark') {
          child.material = new THREE.MeshStandardMaterial({
            color: '#222e3c',
            roughness: 0.38,
            metalness: 0.18,
            side: THREE.DoubleSide
          });
        } else if (matName === 'Mat_KB_KeyAccent') {
          child.material = new THREE.MeshStandardMaterial({
            color: '#f2b254',
            emissive: new THREE.Color('#ff9d2e'),
            emissiveIntensity: 0.55,
            roughness: 0.32,
            metalness: 0.12,
            side: THREE.DoubleSide
          });
        } else if (matName === 'Mat_Team_SwitchBase') {
          child.material = new THREE.MeshStandardMaterial({
            color: '#161e28',
            roughness: 0.34,
            metalness: 0.62,
            side: THREE.DoubleSide
          });
        } else if (matName === 'Mat_Team_FrostedAmber') {
          child.material = new THREE.MeshStandardMaterial({
            color: '#ffd074',
            emissive: new THREE.Color('#ff9e2c'),
            emissiveIntensity: 1.25,
            roughness: 0.22,
            metalness: 0.06,
            side: THREE.DoubleSide
          });
        } else if (
          matName === 'Mat_Team_LegendInk' ||
          child.name === 'Desk_Team_Question_Mark' ||
          child.name === 'Desk_Team_Label'
        ) {
          child.material = new THREE.MeshStandardMaterial({
            color: '#0a1017',
            roughness: 0.25,
            metalness: 0.25,
            side: THREE.DoubleSide
          });
        } else if (child.name === 'Earthtune_Wall_Branding') {
          // 3D vector-extruded wall lettering in matte black finish with depth
          child.material = new THREE.MeshStandardMaterial({
            color: '#141618',
            roughness: 0.85,
            metalness: 0.15,
            side: THREE.DoubleSide
          });
        } else if (child.name === 'Hologram_Globe_Preview') {
          // Hide static preview mesh from Blender so live interactive WebGL sphere renders
          child.visible = false;
        } else if (child.name === 'Screen_Observatory_Monitor') {
          screenMesh = child;
          // Sleek dark monitor backing behind the interactive web page
          child.material = new THREE.MeshBasicMaterial({
            color: '#080d12',
            side: THREE.DoubleSide
          });

          // Align CSS3D monitor object to Screen_Observatory_Monitor
          child.updateWorldMatrix(true, true);
          const worldPos = new THREE.Vector3();
          const worldQuat = new THREE.Quaternion();
          child.getWorldPosition(worldPos);
          child.getWorldQuaternion(worldQuat);

          console.log('[MONITOR] Screen worldPos:', JSON.stringify(worldPos));
          console.log('[MONITOR] Screen worldQuat:', JSON.stringify(worldQuat));

          monitorCSSObj.position.copy(worldPos);
          monitorCSSObj.quaternion.copy(worldQuat);

          // Push slightly forward along local normal so iframe sits flush on the glass
          const screenNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(worldQuat);
          console.log('[MONITOR] Screen normal:', JSON.stringify(screenNormal));
          monitorCSSObj.position.add(screenNormal.clone().multiplyScalar(0.008));
        } else if (child.name === 'Hologram_Emitter_Ring') {
          child.material = new THREE.MeshStandardMaterial({
            color: '#4df3ff',
            emissive: new THREE.Color('#4df3ff'),
            emissiveIntensity: 2.5,
            roughness: 0.2,
            metalness: 0.8,
            side: THREE.DoubleSide
          });
        } else if (child.name === 'Hologram_Emitter_Platter') {
          child.material = new THREE.MeshStandardMaterial({
            color: '#1a2228',
            roughness: 0.45,
            metalness: 0.65,
            side: THREE.DoubleSide
          });
        } else if (child.name === 'Conduit_Data_Cable') {
          child.material = new THREE.MeshStandardMaterial({
            color: '#2a3138',
            roughness: 0.6,
            metalness: 0.3,
            side: THREE.DoubleSide
          });
        } else if (child.name.startsWith('Monitor_Stand') || child.name === 'Monitor COMBINED_Baked') {
          child.material = new THREE.MeshStandardMaterial({
            color: '#2b323b',
            roughness: 0.38,
            metalness: 0.35,
            side: THREE.DoubleSide
          });
        } else if (child.name === 'desktop2_Baked' || child.name === 'desktop.2_Baked' || child.name === 'Desktop_Left_Tabletop') {
          // Clean, uniform dark observatory studio desks that catch warm/cyan table lighting
          child.material = new THREE.MeshStandardMaterial({
            color: '#151c24',
            roughness: 0.40,
            metalness: 0.25,
            side: THREE.DoubleSide
          });
        } else if (child.name === 'wall_Baked') {
          // Reference B: Midnight-slate observatory studio walls
          child.material = new THREE.MeshStandardMaterial({
            color: '#141e2b',
            roughness: 0.78,
            metalness: 0.12,
            side: THREE.DoubleSide
          });
        } else if (child.name.startsWith('Trim_Baseboard')) {
          child.material = new THREE.MeshStandardMaterial({
            color: '#0a1017',
            roughness: 0.65,
            metalness: 0.2,
            side: THREE.DoubleSide
          });
        }
      }
    });

    console.log('Enclosed studio room loaded successfully with all walls intact.');
  },
  undefined,
  (err) => {
    console.error('Error loading studio_room.glb:', err);
  }
);

// -------------------------------------------------------------
// WEBGL RENDERER & RESIZE
// -------------------------------------------------------------
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  sceneHost.append(renderer.domElement);
} catch (err) {
  console.error('WebGL initialization failure:', err);
}

function resize() {
  syncCompactWorkbenchLayout();
  const w = compact ? (sceneHost.clientWidth || window.innerWidth) : window.innerWidth;
  const h = compact ? (sceneHost.clientHeight || 205) : window.innerHeight;
  camera.aspect = w / Math.max(1, h);
  const baseOverviewFov = compact ? 42 : THREE.MathUtils.clamp(38 + Math.max(0, 1.45 - camera.aspect) * 8, 38, 44);
  const currentTarget = focusTargets.get(S.focus);
  if (S.focus === 'overview') {
    S.targetFov = baseOverviewFov;
  } else if (currentTarget) {
    S.targetFov = currentTarget.fov || baseOverviewFov;
  }
  camera.updateProjectionMatrix();
  if (renderer) renderer.setSize(w, h);
  if (cssRenderer && !compact) cssRenderer.setSize(w, h);
}
window.addEventListener('resize', resize);
compactQuery.addEventListener?.('change', resize);
resize();

// -------------------------------------------------------------
// 3. RAYCASTING, DRAG DISAMBIGUATION & INTERACTION
// -------------------------------------------------------------
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let isDraggingGlobe = false;
let prevMouseX = 0;
let prevMouseY = 0;
let globeSpinVelocity = 0;
let globeTiltVelocity = 0;

function raycastInteractive(clientX, clientY) {
  if (!renderer) return [];
  const canvas = renderer.domElement;
  const rect = canvas.getBoundingClientRect();
  mouse.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
  raycaster.setFromCamera(mouse, camera);

  const interactiveTargets = [
    globeSphere,
    screenMesh,
    deskTeamKeycapObj,
    deskKeyboardObj
  ].filter(Boolean);

  return raycaster.intersectObjects(interactiveTargets, true);
}

if (renderer) {
  const canvas = renderer.domElement;

  canvas.addEventListener('pointerdown', (e) => {
    if (e.button > 0) return; // Ignore right/middle clicks

    // Ignore if clicking inside HTML overlays
    if (e.target.closest && e.target.closest('.focus-bar, .studio-footer, button, a, input')) {
      return;
    }

    // Initialize pointer drag session tracker
    S.drag = {
      id: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      moved: false
    };

    // Check if user is grabbing the holographic globe
    const hits = raycastInteractive(e.clientX, e.clientY);
    if (hits.length > 0 && (hits[0].object === globeSphere || hits[0].object.parent === globeSphere)) {
      isDraggingGlobe = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
      globeSpinVelocity = 0;
      globeTiltVelocity = 0;
      canvas.style.cursor = 'grabbing';
    }
  });

  window.addEventListener('pointermove', (e) => {
    // 1. Drag distance threshold tracking (5px threshold)
    if (S.drag) {
      const dist = Math.hypot(e.clientX - S.drag.startX, e.clientY - S.drag.startY);
      if (dist > 5) {
        S.drag.moved = true;
      }
    }

    // 2. Earth globe manual 2-axis spin & tilt dragging (sideways + top-to-bottom)
    if (isDraggingGlobe) {
      const dx = e.clientX - prevMouseX;
      const dy = e.clientY - prevMouseY;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
      const rotY = dx * 0.008;
      const rotX = dy * 0.008;
      globeSphere.rotation.y += rotY;
      globeTiltGroup.rotation.x = THREE.MathUtils.clamp(
        globeTiltGroup.rotation.x + rotX,
        -Math.PI * 0.48,
        Math.PI * 0.48
      );
      store.rotate(rotY, '3d_scene');
      globeSpinVelocity = rotY;
      globeTiltVelocity = rotX;
    }

    // 3. Record cursor position for deadband parallax tracking
    if (e.pointerType !== 'touch' && !motionOff) {
      S.pointer = { x: e.clientX, y: e.clientY };
      S.mouseMoved = true;
    }

    // 4. Cursor hover feedback
    if (!isDraggingGlobe) {
      const hits = raycastInteractive(e.clientX, e.clientY);
      const isTeamHit = deskTeamKeycapObj && hits.some(h => isDescendantOf(h.object, deskTeamKeycapObj));
      updateKeycapFloatingTag(isTeamHit);
      if (hits.length > 0) {
        const isGlobeHit = hits[0].object === globeSphere || hits[0].object.parent === globeSphere;
        canvas.style.cursor = isGlobeHit ? 'grab' : 'pointer';
      } else {
        canvas.style.cursor = 'default';
      }
    }
  });

  window.addEventListener('pointerup', () => {
    // Drag-vs-Click Disambiguation:
    // If pointer was dragged more than 5px, suppress clicks for 350ms to prevent accidental triggers
    if (S.drag && S.drag.moved) {
      S.suppressClickUntil = performance.now() + 350;
    }
    if (isDraggingGlobe) {
      isDraggingGlobe = false;
      canvas.style.cursor = 'default';
    }
    S.drag = null;
  });

  canvas.addEventListener('click', (e) => {
    // 1. Check suppression window from dragging
    if (performance.now() < S.suppressClickUntil) {
      e.preventDefault();
      e.stopImmediatePropagation();
      return;
    }

    const hits = raycastInteractive(e.clientX, e.clientY);

    // 2. Interactive Object Hits
    if (hits.length > 0) {
      const hitObj = hits[0].object;

      // Check 3D '? TEAM' Macro Keycap -> tactile click + open Team Modal
      if (deskTeamKeycapObj && hits.some(h => isDescendantOf(h.object, deskTeamKeycapObj))) {
        playRelaySwitchSound();
        animateDeskPropPress(deskTeamKeycapObj, 0.04, 175);
        openTeamModal();
        return;
      }

      // Check 3D Mechanical Keyboard -> tactile click + depress animation
      if (deskKeyboardObj && hits.some(h => isDescendantOf(h.object, deskKeyboardObj))) {
        playRelaySwitchSound();
        animateDeskPropPress(deskKeyboardObj, 0.02, 135);
        announce('Mechanical studio keyboard tapped.');
        return;
      }

      // Check Globe click -> toggle focus
      if (hitObj === globeSphere || hitObj.parent === globeSphere) {
        focusTarget(S.focus === 'globe' ? 'overview' : 'globe');
        return;
      }

      // Check Telemetry Screen -> focus desk & open workstation
      if (screenMesh && (hitObj === screenMesh || hits.some(h => h.object === screenMesh))) {
        if (S.focus !== 'desk') {
          focusTarget('desk');
        }
        return;
      }
      return;
    }

    // 3. FEATURE 3: TAP-OUTSIDE-TO-REVERT
    // Clicking anywhere on empty backdrop/floor reverts smoothly to room overview
    if (S.focus !== 'overview') {
      homeView();
    }
  }, { capture: true });
}

// -------------------------------------------------------------
// 4. PARALLAX TRACKING WITH DEADBAND FILTER
// -------------------------------------------------------------
function updateParallax(clientX, clientY) {
  if (motionOff) return;
  const w = window.innerWidth;
  const h = window.innerHeight;

  // Normalized device coordinates [-1.0, 1.0] centered at (0, 0)
  const rawX = THREE.MathUtils.clamp((clientX / w - 0.5) * 2, -1, 1);
  const rawY = THREE.MathUtils.clamp((clientY / h - 0.5) * 2, -1, 1);

  // Deadband Filter (2.5% anti-jitter circular threshold)
  const mag = Math.hypot(rawX, rawY);
  let nx = 0, ny = 0;
  if (mag > 0.025) {
    const factor = (mag - 0.025) / (1 - 0.025);
    const curved = factor * (0.86 + 0.14 * factor * factor);
    const scale = Math.min(1, curved) / mag;
    nx = rawX * scale;
    ny = rawY * scale;
  }

  const currentTarget = focusTargets.get(S.focus) || focusTargets.get('overview');
  const scale = currentTarget?.parallaxScale ?? (S.focus === 'overview' ? 1.0 : 0.25);

  if (S.focus === 'overview') {
    // Environmental parallax in room overview
    S.targetCamOffset.set(nx * 0.45 * scale, -ny * 0.25 * scale, 0);
    S.targetLookOffset.set(nx * 0.25 * scale, -ny * 0.15 * scale, 0);
  } else {
    // Constrained parallax when focused on an object (provides 3D relief without losing framing)
    S.targetCamOffset.set(nx * 0.10 * scale, -ny * 0.06 * scale, 0);
    S.targetLookOffset.set(nx * 0.05 * scale, -ny * 0.03 * scale, 0);
  }
}

function returnCenter() {
  S.pointer = null;
  S.mouseMoved = false;
  S.targetCamOffset.set(0, 0, 0);
  S.targetLookOffset.set(0, 0, 0);
  S.lastInteraction = performance.now();
}

document.addEventListener('pointerleave', returnCenter);
window.addEventListener('blur', () => {
  // Do not snap camera back to center when focus moves into the embedded monitor iframe
  if (document.activeElement === monitorFrame) return;
  returnCenter();
});

// -------------------------------------------------------------
// 5. CAMERA FOCUS & NAVIGATION ORCHESTRATION
// Extensible for future toggle buttons & target registration
// -------------------------------------------------------------
export function focusTarget(id) {
  const target = focusTargets.get(id) || focusTargets.get('overview');
  if (!target) return;

  const prevId = S.focus;
  const prevTarget = focusTargets.get(prevId);
  if (prevTarget?.onBlur && prevId !== target.id) {
    prevTarget.onBlur(target.id);
  }

  S.focus = target.id;
  focus = target.id; // backward-compatibility
  document.body.dataset.focus = target.id;

  // Set base anchors to center camera directly on the target
  // On mobile (compact), the monitor is docked in 2D below #scene, so keep the 3D banner on the 3D Globe when 'desk' is selected
  const cameraAnchor = (compact && target.id === 'desk')
    ? (focusTargets.get('globe') || target)
    : target;
  S.basePos.copy(cameraAnchor.position);
  S.baseLook.copy(cameraAnchor.target);

  // Compute required FOV
  const baseOverviewFov = compact ? 44 : THREE.MathUtils.clamp(38 + Math.max(0, 1.45 - camera.aspect) * 8, 38, 44);
  S.targetFov = target.id === 'overview' ? baseOverviewFov : (target.fov || baseOverviewFov);

  // Zero out immediate parallax offsets so target lands centered
  S.targetCamOffset.set(0, 0, 0);
  S.targetLookOffset.set(0, 0, 0);

  updateFocusUI(target.id);

  announce(target.id === 'overview' ? 'Studio overview' : `${target.label} focused. Click background or press Escape to return.`);

  if (target.onFocus && prevId !== target.id) {
    target.onFocus(prevId);
  }

  S.lastInteraction = performance.now();
}

export function homeView() {
  focusTarget('overview');
}

// Global alias for backward compatibility
export const focusObject = focusTarget;

function updateFocusUI(currentId) {
  const focusBar = $('.focus-bar');
  if (focusBar) {
    focusBar.hidden = compact || currentId === 'overview' || currentId === 'desk';
  }

  // Enable direct interaction inside the monitor in both Overview and Desk modes
  if (monitorFrame) {
    monitorFrame.style.pointerEvents = (!compact && currentId === 'globe') ? 'none' : 'auto';
  }
  if (monitorClickShield) {
    monitorClickShield.style.display = (!compact && currentId === 'globe') ? 'block' : 'none';
  }

  // Update any present and future toggle buttons in DOM with data-focus-target
  document.querySelectorAll('[data-focus-target]').forEach((btn) => {
    const isCurrent = btn.getAttribute('data-focus-target') === currentId;
    btn.setAttribute('aria-current', isCurrent ? 'true' : 'false');
  });

  if (compact && currentId === 'desk' && mobileWorkbenchDock) {
    try {
      mobileWorkbenchDock.scrollIntoView({ behavior: 'smooth', block: 'start' });
      monitorFrame.contentWindow?.postMessage({ type: 'FOCUS_FIRST_CONTROL' }, '*');
    } catch {}
  }
}

// Skip-link handler: jumps directly into the EarthTune Workbench for keyboard & screen-reader users
$('#skip-to-workbench')?.addEventListener('click', (e) => {
  e.preventDefault();
  focusTarget('desk');
  try {
    monitorFrame.focus();
    monitorFrame.contentWindow?.focus();
    monitorFrame.contentWindow?.postMessage({ type: 'FOCUS_FIRST_CONTROL' }, '*');
  } catch {}
});

// Back button handler
$('#back-button')?.addEventListener('click', () => homeView());

// Escape key to close Team Modal or revert focus
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (teamModalEl && !teamModalEl.hidden) {
      closeTeamModal();
      return;
    }
    if (S.focus !== 'overview') {
      homeView();
    }
  }
});

// Delegated click listener: automatically handles ALL current & future toggle buttons
document.addEventListener('click', (e) => {
  const trigger = e.target.closest('[data-focus-target]');
  if (trigger) {
    e.preventDefault();
    const targetId = trigger.getAttribute('data-focus-target');
    if (targetId) {
      focusTarget(targetId);
    }
  }
});

// Wheel zoom in overview — clamped inside room boundaries
window.addEventListener('wheel', (e) => {
  if (S.focus !== 'overview') return;
  S.depthTarget = THREE.MathUtils.clamp(
    S.depthTarget + e.deltaY * 0.003,
    S.depthMin,
    S.depthMax
  );
  S.lastInteraction = performance.now();
}, { passive: true });

// -------------------------------------------------------------
// 6. PHYSICS-BASED SMOOTH EASING & RENDER LOOP
// -------------------------------------------------------------
const clock = new THREE.Clock();
const desiredPos = new THREE.Vector3();
const desiredLook = new THREE.Vector3();

function render() {
  requestAnimationFrame(render);

  const delta = clock.getDelta();
  const time = clock.getElapsedTime();
  const dtSec = Math.min(0.05, delta > 0 ? delta : 0.016);

  // Update parallax targets from pointer when dirty
  if (S.mouseMoved && S.pointer) {
    updateParallax(S.pointer.x, S.pointer.y);
    S.mouseMoved = false;
  }

  // Delta-time invariant exponential decay damping
  // 1 - exp(-dt * lambda) guarantees identical physical damping across 60Hz/120Hz/240Hz
  const posBlend = 1 - Math.exp(-dtSec * 7.5);
  const fovBlend = 1 - Math.exp(-dtSec * 4.0);

  // Overview depth zoom easing
  if (S.focus === 'overview') {
    S.depthCurrent += (S.depthTarget - S.depthCurrent) * posBlend;
  }

  // Calculate target camera position (base position + depth in overview + parallax)
  desiredPos.copy(S.basePos);
  if (S.focus === 'overview') {
    desiredPos.z = S.depthCurrent;
  }
  desiredPos.add(S.targetCamOffset);

  // Calculate target look-at vector (base look + parallax)
  desiredLook.copy(S.baseLook).add(S.targetLookOffset);

  // Apply exponential interpolation to camera state S
  S.pos.lerp(desiredPos, posBlend);
  S.look.lerp(desiredLook, posBlend);
  S.fov += (S.targetFov - S.fov) * fovBlend;

  // Apply to Three.js camera
  camera.position.copy(S.pos);
  camera.fov = S.fov;
  camera.updateProjectionMatrix();
  camera.lookAt(S.look);

  // User-draggable 2-axis inertia for the Earth globe (stays steady when untouched)
  if (!isDraggingGlobe && (globeSpinVelocity !== 0 || globeTiltVelocity !== 0)) {
    globeSphere.rotation.y += globeSpinVelocity;
    globeTiltGroup.rotation.x = THREE.MathUtils.clamp(
      globeTiltGroup.rotation.x + globeTiltVelocity,
      -Math.PI * 0.48,
      Math.PI * 0.48
    );
    globeSpinVelocity *= 0.92;
    globeTiltVelocity *= 0.90;
    if (Math.abs(globeSpinVelocity) < 0.00005) globeSpinVelocity = 0;
    if (Math.abs(globeTiltVelocity) < 0.00005) globeTiltVelocity = 0;
  }

  // Keep standalone globe steady at its exact reference position
  globeGroup.position.copy(globeCenter);

  // Update 3D Arctic-to-Antarctic latitude scan ring on Hologram Globe
  if (globeScanState.active) {
    const scanBlend = 1 - Math.exp(-dtSec * 6.0);
    globeScanState.currentPhi += (globeScanState.targetPhi - globeScanState.currentPhi) * scanBlend;
    const phi = globeScanState.currentPhi;
    const ringRadius = 1.348;
    globeScanRing.position.y = ringRadius * Math.sin(phi);
    const r = Math.max(0.18, ringRadius * Math.cos(phi));
    globeScanRing.scale.set(r, r, 1);
  }

  // Pulse dais emitter light
  daisEmitterLight.intensity = 4.2 + Math.sin(time * 3) * 0.5;

  if (renderer) renderer.render(scene, camera);
  if (cssRenderer) cssRenderer.render(cssScene, camera);
}

render();

// -------------------------------------------------------------
// WORKSTATION LIFECYCLE (Integrated directly in 3D monitor)
// -------------------------------------------------------------
window.addEventListener('message', (e) => {
  if (!e.data) return;
  if (e.data.type === 'OPEN_TEAM_MODAL' || e.data.action === 'openTeamModal') {
    openTeamModal();
  } else if (e.data.type === 'EXIT_COMPUTER_MODE') {
    homeView();
  } else if (e.data.type === 'FOCUS_MONITOR') {
    if (S.focus !== 'desk') {
      focusTarget('desk');
    }
  } else if (e.data.type === 'MONITOR_YEAR_CHANGE' && e.data.year) {
    const year = Number(e.data.year);
    const regionalAvailable = e.data.regionalAvailable !== false && year <= LAST_REGIONAL_YEAR;
    setGlobeYearTexture(year, regionalAvailable);
    if (!regionalAvailable) {
      globeScanState.active = false;
      globeScanState.bandIndex = -1;
      globeScanGroup.visible = false;
      globeBandMeshes.forEach((mesh) => {
        mesh.visible = false;
      });
    }
  } else if (e.data.type === 'MONITOR_TEMPERATURE_MODE') {
    globeSphere.material.opacity = e.data.enabled ? 0.70 : 0;
    if (e.data.year) setGlobeYearTexture(e.data.year);
  } else if (e.data.type === 'MONITOR_SCAN_UPDATE') {
    const year = Number(e.data.year);
    const regionalAvailable = e.data.regionalAvailable !== false && (!year || year <= LAST_REGIONAL_YEAR);
    if (year) {
      setGlobeYearTexture(year, regionalAvailable);
    }
    if (!regionalAvailable || !e.data.scanning || typeof e.data.latRatio !== 'number') {
      globeScanState.active = false;
      globeScanState.bandIndex = -1;
      globeScanGroup.visible = false;
      globeBandMeshes.forEach((mesh) => {
        mesh.visible = false;
      });
    } else {
      const targetPhi = (Math.PI / 2) - (e.data.latRatio * Math.PI);
      if (!globeScanState.active) {
        globeScanState.currentPhi = targetPhi;
      }
      globeScanState.active = true;
      globeScanState.targetPhi = targetPhi;
      globeScanState.bandIndex = e.data.bandIndex;
      globeScanGroup.visible = true;

      globeBandMeshes.forEach((mesh, idx) => {
        mesh.visible = idx === e.data.bandIndex;
      });
    }
  } else if (e.data.type === 'MONITOR_POINTER_MOVE' && !motionOff) {
    // Map local monitor iframe coordinates into true parent window viewport coordinates
    // so crossing into the monitor or hovering near buttons has zero coordinate jump
    const rect = monitorFrame.getBoundingClientRect();
    S.pointer = {
      x: rect.left + e.data.ratioX * rect.width,
      y: rect.top + e.data.ratioY * rect.height
    };
    S.mouseMoved = true;
  } else if (e.data.type === 'STOP_WELCOME_AUDIO' || e.data.type === 'START_STORY' || e.data.type === 'STORIES_OPENED' || e.data.type === 'PAUSE_ALL_AUDIO') {
    stopSkylarWelcome();
  } else if (e.data.type === 'STORY_SUBTITLE') {
    if (e.data.active && e.data.text) {
      if (subtitleContainer && subtitleTextEl) {
        subtitleContainer.hidden = false;
        subtitleContainer.classList.add('is-active');
        subtitleTextEl.textContent = e.data.text;
      }
    } else {
      hideSkylarSubtitle();
    }
  }
});

// -------------------------------------------------------------
// CARTESIA SKYLAR (FRIENDLY GUIDE) WELCOME GREETING & SUBTITLES
// -------------------------------------------------------------
const SKYLAR_WELCOME_TEXT =
  "Welcome to EarthTune Studio! Feel free to wander around the room and inspect the 3D hologram globe. When you're ready, click the monitor desk on your left, and trigger the temperature button to load the planetary map and start your exploration.";

// Exact waveform-aligned subtitle cues (measured from skylar-welcome.mp3 breath pauses)
const SKYLAR_SUBTITLE_CUES = [
  { start: 0.0, end: 1.85, text: 'Welcome to EarthTune Studio!' },
  { start: 1.85, end: 5.95, text: 'Feel free to wander around the room and inspect the 3D hologram globe.' },
  { start: 5.95, end: 8.95, text: "When you're ready, click the monitor desk on your left," },
  { start: 8.95, end: 13.40, text: 'and trigger the temperature button to load the planetary map and start your exploration.' }
];

let skylarSpoken = false;
const skylarAudio = new Audio('assets/audio/skylar-welcome.mp3');
skylarAudio.preload = 'auto';
skylarAudio.volume = 0.92;

const subtitleContainer = $('#welcome-subtitle');
const subtitleTextEl = $('#welcome-subtitle-text');

function updateSkylarSubtitle() {
  if (!subtitleContainer || !subtitleTextEl) return;
  const t = skylarAudio.currentTime;
  const activeCue = SKYLAR_SUBTITLE_CUES.find((c) => t >= c.start && t <= c.end);
  if (activeCue && !skylarAudio.paused && !skylarAudio.ended) {
    subtitleContainer.hidden = false;
    subtitleContainer.classList.add('is-active');
    if (subtitleTextEl.textContent !== activeCue.text) {
      subtitleTextEl.textContent = activeCue.text;
    }
  }
}

function hideSkylarSubtitle() {
  if (!subtitleContainer) return;
  subtitleContainer.classList.remove('is-active');
  setTimeout(() => {
    if (!subtitleContainer.classList.contains('is-active')) {
      subtitleContainer.hidden = true;
    }
  }, 240);
}

let subtitleTimer = null;

function startSubtitleSyncLoop() {
  if (subtitleTimer) clearInterval(subtitleTimer);
  updateSkylarSubtitle();
  subtitleTimer = setInterval(() => {
    if (skylarAudio.paused || skylarAudio.ended) {
      clearInterval(subtitleTimer);
      subtitleTimer = null;
      if (skylarAudio.ended) hideSkylarSubtitle();
      return;
    }
    updateSkylarSubtitle();
  }, 80);
}

skylarAudio.addEventListener('play', startSubtitleSyncLoop);
skylarAudio.addEventListener('timeupdate', updateSkylarSubtitle);
skylarAudio.addEventListener('ended', () => {
  if (subtitleTimer) {
    clearInterval(subtitleTimer);
    subtitleTimer = null;
  }
  hideSkylarSubtitle();
});

let unlockEventsBound = false;

function removeUnlockListeners() {
  const events = ['pointerdown', 'keydown', 'pointermove', 'mousemove', 'wheel', 'focus', 'touchstart'];
  events.forEach(evt => {
    window.removeEventListener(evt, autoPlayAttempt);
    try {
      monitorFrame.contentWindow?.removeEventListener(evt, autoPlayAttempt);
    } catch (_) {}
  });
  unlockEventsBound = false;
}

function autoPlayAttempt() {
  if (skylarSpoken) {
    removeUnlockListeners();
    return;
  }
  triggerSkylarGreeting();
}

function bindUnlockListeners() {
  if (unlockEventsBound || skylarSpoken) return;
  unlockEventsBound = true;
  const events = ['pointerdown', 'keydown', 'pointermove', 'mousemove', 'wheel', 'focus', 'touchstart'];
  events.forEach(evt => {
    window.addEventListener(evt, autoPlayAttempt, { passive: true });
    try {
      monitorFrame.contentWindow?.addEventListener(evt, autoPlayAttempt, { passive: true });
    } catch (_) {}
  });
}

export function triggerSkylarGreeting() {
  if (skylarSpoken) return;

  const tryPlay = () => {
    if (skylarSpoken) return;
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    } catch (_) {}

    skylarAudio.currentTime = 0;
    const playPromise = skylarAudio.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        skylarSpoken = true;
        announce(SKYLAR_WELCOME_TEXT);
        startSubtitleSyncLoop();
        removeUnlockListeners();
      }).catch(() => {
        // Autoplay blocked by browser policy until mouse moves or focus shifts
        skylarSpoken = false;
        hideSkylarSubtitle();
        bindUnlockListeners();
      });
    }
  };

  if (skylarAudio.readyState >= 2) {
    tryPlay();
  } else {
    skylarAudio.addEventListener('canplay', tryPlay, { once: true });
    skylarAudio.load();
  }
}

export function stopSkylarWelcome() {
  skylarSpoken = true;
  removeUnlockListeners();
  if (subtitleTimer) {
    clearInterval(subtitleTimer);
    subtitleTimer = null;
  }
  if (skylarAudio) {
    try {
      skylarAudio.pause();
      skylarAudio.currentTime = 0;
    } catch (_) {}
  }
  hideSkylarSubtitle();
}

// Automatically start audio when the whole interface has finished loading
function initAutoPlayback() {
  skylarAudio.load();

  if (document.readyState === 'complete') {
    triggerSkylarGreeting();
  } else {
    window.addEventListener('load', () => {
      triggerSkylarGreeting();
    }, { once: true });
  }

  monitorFrame.addEventListener('load', () => {
    triggerSkylarGreeting();
    bindUnlockListeners();
  });

  // Passive unlock listeners: moving cursor, scrolling or focus triggers audio without requiring a screen tap
  bindUnlockListeners();
}

initAutoPlayback();

// Expose public API on window for external toggle buttons, dev tools, and extensions
window.earthtoneStudio = {
  S,
  scene,
  camera,
  roomGroup,
  globeGroup,
  globeTiltGroup,
  globeSphere,
  get deskKeyboardObj() { return deskKeyboardObj; },
  get deskTeamKeycapObj() { return deskTeamKeycapObj; },
  lights: { hemiLight, keyLight, fillLight, daisSpot, daisEmitterLight, leftDeskSpot, deskTaskLight, leftTableWarmFill, monitorHalo, globeHalo },
  focusTargets,
  registerFocusTarget,
  focusTarget,
  homeView,
  focusObject,
  openTeamModal,
  closeTeamModal
};
