// -------------------------------------------------------------
// EARTHTONE STUDIO - ACCESSIBLE VOICE GUIDE & DUCKING CONTROLLER
// Dr. Joe AI Guide with WCAG 2.1 SC 1.4.2 compliance and Web Audio sidechain ducking
// -------------------------------------------------------------

import { store } from './JukeboxStore.js';
import { audioEngine } from './AudioEngine.js';

class VoiceGuide {
  constructor() {
    this.synth = window.speechSynthesis || null;
    this.currentUtterance = null;
    this.announcerEl = document.getElementById('announcer');
    this.voice = null;
    this.heartbeatTimer = null;

    if (this.synth) {
      this._initVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this._initVoices();
      }
    }

    // Listen to store voice toggle
    store.addEventListener('voiceToggle', (e) => {
      if (!e.detail.voiceEnabled) {
        this.cancel();
      } else {
        this.speak('Voice guide activated. Welcome to the Earthtone Studio. Use the Telemetry Desk to explore historical climate anomalies.');
      }
    });
  }

  _initVoices() {
    if (!this.synth) return;
    const voices = this.synth.getVoices();
    // Prefer warm natural English voice
    this.voice = voices.find((v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('David'))) || voices.find((v) => v.lang.startsWith('en')) || null;
  }

  announce(text) {
    // Screen reader accessible DOM announcement
    if (this.announcerEl) {
      this.announcerEl.textContent = text;
    }
  }

  speak(text, { priority = false } = {}) {
    this.announce(text);

    if (!store.state.voiceEnabled || !this.synth) {
      return;
    }

    if (priority) {
      this.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    if (this.voice) utterance.voice = this.voice;
    utterance.rate = 0.98;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      audioEngine.duck(0.08); // -18 dB ducking
      this._startHeartbeat();
    };

    const cleanup = () => {
      this._stopHeartbeat();
      audioEngine.restore(0.35); // restore to 0 dB
      this.currentUtterance = null;
    };

    utterance.onend = cleanup;
    utterance.onerror = cleanup;

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
  }

  cancel() {
    if (this.synth) {
      this.synth.cancel();
    }
    this._stopHeartbeat();
    audioEngine.restore(0.1);
    this.currentUtterance = null;
  }

  _startHeartbeat() {
    this._stopHeartbeat();
    // Chromium bug safeguard: long speech freezes after 15s without resume() pulse
    this.heartbeatTimer = setInterval(() => {
      if (this.synth && this.synth.speaking) {
        this.synth.pause();
        this.synth.resume();
      } else {
        this._stopHeartbeat();
      }
    }, 10000);
  }

  _stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}

export const voiceGuide = new VoiceGuide();
