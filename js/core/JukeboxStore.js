// -------------------------------------------------------------
// EARTHTONE STUDIO - UNIDIRECTIONAL JUKEBOX STATE STORE
// Single source of truth coordinating 2D DOM Workbench & 3D Three.js
// -------------------------------------------------------------

export const temperaturePoints = [
  [1980,.26],[1981,.32],[1982,.14],[1983,.31],[1984,.16],[1985,.12],[1986,.18],[1987,.32],[1988,.39],[1989,.27],
  [1990,.45],[1991,.41],[1992,.22],[1993,.23],[1994,.31],[1995,.45],[1996,.33],[1997,.47],[1998,.61],[1999,.38],
  [2000,.39],[2001,.53],[2002,.63],[2003,.62],[2004,.53],[2005,.68],[2006,.64],[2007,.66],[2008,.54],[2009,.66],
  [2010,.72],[2011,.61],[2012,.65],[2013,.67],[2014,.75],[2015,.89],[2016,1.01],[2017,.91],[2018,.85],[2019,.98],
  [2020,1.01],[2021,.85],[2022,.89],[2023,1.17],[2024,1.28]
].map(([year, value], index) => ({ year, value, frame: 594 + index * 6 }));

export const bands = [
  { name: 'Arctic', range: '60°–90°N', start: 0, end: 1/6 },
  { name: 'Northern mid-latitudes', range: '30°–60°N', start: 1/6, end: 1/3 },
  { name: 'Tropics', range: '30°S–30°N', start: 1/3, end: 2/3 },
  { name: 'Southern mid-latitudes', range: '30°–60°S', start: 2/3, end: 5/6 },
  { name: 'Antarctic', range: '60°–90°S', start: 5/6, end: 1 }
];

export const categoryLabels = {
  cool: 'Cooler',
  reference: 'Near reference',
  warm: 'Warmer'
};

export class JukeboxStore extends EventTarget {
  constructor() {
    super();
    this.state = {
      yearIndex: 0,
      bandIndex: 0,
      mode: 'history', // 'history' | 'frame' | 'learn'
      projection: 'sphere', // 'sphere' | 'flat'
      rotation: 0, // Longitude rotation radians
      isPlaying: false,
      isScanning: false,
      isMuted: false,
      voiceEnabled: false,
      stateToken: 0,
      scanProgressY: 0 // 0.0 (north) to 1.0 (south)
    };
  }

  get snapshot() {
    return { ...this.state };
  }

  get currentPoint() {
    return temperaturePoints[this.state.yearIndex];
  }

  get currentBand() {
    return bands[this.state.bandIndex];
  }

  setYear(index, origin = 'unknown') {
    const clamped = Math.max(0, Math.min(temperaturePoints.length - 1, index));
    if (this.state.yearIndex === clamped && origin !== 'force') return;
    this.state.yearIndex = clamped;
    this.state.stateToken++;
    this._emit('yearChange', { yearIndex: clamped, point: this.currentPoint, origin });
  }

  selectBand(index, origin = 'unknown') {
    const clamped = Math.max(0, Math.min(bands.length - 1, index));
    if (this.state.bandIndex === clamped && origin !== 'force') return;
    this.state.bandIndex = clamped;
    this._emit('bandChange', { bandIndex: clamped, band: this.currentBand, origin });
  }

  setProjection(projection, origin = 'unknown') {
    if (this.state.projection === projection) return;
    this.state.projection = projection === 'flat' ? 'flat' : 'sphere';
    this._emit('projectionChange', { projection: this.state.projection, origin });
  }

  setMode(mode, origin = 'unknown') {
    if (this.state.mode === mode) return;
    this.state.mode = mode;
    this.stopPlayback();
    this._emit('modeChange', { mode, origin });
  }

  rotate(delta, origin = 'unknown') {
    this.state.rotation = (this.state.rotation + delta) % (Math.PI * 2);
    this._emit('rotationChange', { rotation: this.state.rotation, origin });
  }

  setRotation(angle, origin = 'unknown') {
    this.state.rotation = angle % (Math.PI * 2);
    this._emit('rotationChange', { rotation: this.state.rotation, origin });
  }

  setScanning(isScanning, scanProgressY = 0) {
    this.state.isScanning = Boolean(isScanning);
    this.state.scanProgressY = scanProgressY;
    this._emit('scanUpdate', { isScanning: this.state.isScanning, scanProgressY });
  }

  setPlaying(isPlaying) {
    this.state.isPlaying = Boolean(isPlaying);
    this._emit('playbackChange', { isPlaying: this.state.isPlaying });
  }

  toggleMute() {
    this.state.isMuted = !this.state.isMuted;
    this._emit('muteChange', { isMuted: this.state.isMuted });
    return this.state.isMuted;
  }

  toggleVoice() {
    this.state.voiceEnabled = !this.state.voiceEnabled;
    this._emit('voiceToggle', { voiceEnabled: this.state.voiceEnabled });
    return this.state.voiceEnabled;
  }

  stopPlayback() {
    this.state.stateToken++;
    this.state.isPlaying = false;
    this.state.isScanning = false;
    this._emit('playbackChange', { isPlaying: false });
    this._emit('scanUpdate', { isScanning: false, scanProgressY: 0 });
  }

  _emit(type, detail) {
    this.dispatchEvent(new CustomEvent(type, { detail }));
  }
}

export const store = new JukeboxStore();
