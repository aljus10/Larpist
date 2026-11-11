// -------------------------------------------------------------
// EARTHTONE STUDIO - UNIFIED SONIFICATION ENGINE
// Deterministic Web Audio API synthesis with event ducking for Voice Guide
// -------------------------------------------------------------

import { store } from './JukeboxStore.js';

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.sonificationGain = null;
    this.activeSources = new Set();
    this.isDucked = false;

    // Listen to store mute changes
    store.addEventListener('muteChange', (e) => {
      if (this.masterGain && this.ctx) {
        const target = e.detail.isMuted ? 0.0001 : 0.75;
        this.masterGain.gain.setValueAtTime(target, this.ctx.currentTime);
      }
    });
  }

  async ensureAudio() {
    if (!this.ctx) {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtor) {
        console.warn('Web Audio API not supported by this browser.');
        return false;
      }
      this.ctx = new AudioCtor();

      // Master bus
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = store.state.isMuted ? 0.0001 : 0.75;
      this.masterGain.connect(this.ctx.destination);

      // Dedicated Sonification sub-bus (allows -18 dB ducking during speech)
      this.sonificationGain = this.ctx.createGain();
      this.sonificationGain.gain.value = 1.0;
      this.sonificationGain.connect(this.masterGain);
    }
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    return true;
  }

  trackSource(source) {
    this.activeSources.add(source);
    source.addEventListener('ended', () => this.activeSources.delete(source), { once: true });
    return source;
  }

  stopAll() {
    this.activeSources.forEach((src) => {
      try { src.stop(); } catch {}
    });
    this.activeSources.clear();
  }

  duck(duration = 0.08) {
    if (!this.ctx || !this.sonificationGain) return;
    this.isDucked = true;
    const now = this.ctx.currentTime;
    this.sonificationGain.gain.cancelScheduledValues(now);
    this.sonificationGain.gain.setValueAtTime(this.sonificationGain.gain.value, now);
    this.sonificationGain.gain.exponentialRampToValueAtTime(0.12, now + duration); // -18 dB
  }

  restore(duration = 0.35) {
    if (!this.ctx || !this.sonificationGain) return;
    this.isDucked = false;
    const now = this.ctx.currentTime;
    this.sonificationGain.gain.cancelScheduledValues(now);
    this.sonificationGain.gain.setValueAtTime(Math.max(0.001, this.sonificationGain.gain.value), now);
    this.sonificationGain.gain.exponentialRampToValueAtTime(1.0, now + duration); // 0 dB
  }

  envelope(gainNode, start, duration, maxLevel = 0.16) {
    gainNode.gain.setValueAtTime(0.0001, start);
    gainNode.gain.exponentialRampToValueAtTime(maxLevel, start + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, start + Math.max(0.06, duration));
  }

  historyFrequency(val) {
    // NASA GISS anomaly pitch curve: 150 Hz to 850 Hz
    return Math.max(150, Math.min(850, 180 * Math.pow(4, (val + 0.8) / 3)));
  }

  async playHistoryTone(anomalyValue, duration = 0.34) {
    if (!await this.ensureAudio() || store.state.isMuted) return;
    const now = this.ctx.currentTime;
    const frequency = this.historyFrequency(anomalyValue);

    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2200;

    this.envelope(gain, now, duration, 0.18);

    // Blended sine (harmonic fundamental) + triangle (warm presence)
    [1, 2].forEach((multiple, index) => {
      const osc = this.trackSource(this.ctx.createOscillator());
      osc.type = index ? 'sine' : 'triangle';
      osc.frequency.value = frequency * multiple;
      osc.connect(gain);
      osc.start(now);
      osc.stop(now + duration + 0.03);
    });

    gain.connect(filter);
    filter.connect(this.sonificationGain);
  }

  async playBoundaryClick() {
    if (!await this.ensureAudio() || store.state.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.trackSource(this.ctx.createOscillator());
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(145, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.045);

    this.envelope(gain, now, 0.055, 0.09);
    osc.connect(gain);
    gain.connect(this.sonificationGain);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  async playCategoryTexture(category, duration = 0.85) {
    if (!await this.ensureAudio() || store.state.isMuted) return;
    const now = this.ctx.currentTime;

    if (category === 'cool') {
      // Cool: Airy dual sines through lowpass
      const gain = this.ctx.createGain();
      this.envelope(gain, now, duration, 0.11);
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 820;

      [196, 204].forEach((freq) => {
        const osc = this.trackSource(this.ctx.createOscillator());
        osc.type = 'sine';
        osc.frequency.value = freq;
        osc.connect(gain);
        osc.start(now);
        osc.stop(now + duration + 0.04);
      });

      gain.connect(filter);
      filter.connect(this.sonificationGain);
    } else if (category === 'reference') {
      // Reference: Steady 330 Hz triangle anchor
      const gain = this.ctx.createGain();
      this.envelope(gain, now, duration, 0.13);
      const osc = this.trackSource(this.ctx.createOscillator());
      osc.type = 'triangle';
      osc.frequency.value = 330;
      osc.connect(gain);
      gain.connect(this.sonificationGain);
      osc.start(now);
      osc.stop(now + duration + 0.04);
    } else {
      // Warm: Rapid plucked arpeggios
      const count = Math.max(1, Math.floor(duration / 0.14));
      for (let i = 0; i < count; i++) {
        const start = now + i * (duration / count);
        const length = Math.min(0.12, (duration / count) * 0.85);
        const gain = this.ctx.createGain();
        this.envelope(gain, start, length, 0.12);

        const osc = this.trackSource(this.ctx.createOscillator());
        osc.type = 'sine';
        osc.frequency.value = i % 2 === 0 ? 540 : 660;
        osc.connect(gain);
        gain.connect(this.sonificationGain);
        osc.start(start);
        osc.stop(start + length + 0.02);
      }
    }
  }

  async playBandPattern(vector, token) {
    await this.playBoundaryClick();
    await new Promise((r) => setTimeout(r, 120));

    const totalDurationMs = 2100;
    const categories = ['cool', 'reference', 'warm'];

    for (const cat of categories) {
      if (token !== store.state.stateToken) return;
      const duration = Math.max(0, (vector[cat] || 0) * totalDurationMs);
      if (duration < 70) continue;
      await this.playCategoryTexture(cat, duration / 1000);
      await new Promise((r) => setTimeout(r, duration + 40));
    }
  }
}

export const audioEngine = new AudioEngine();
