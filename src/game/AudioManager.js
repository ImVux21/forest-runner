// ===================================================
// AudioManager.js — Rich Web Audio API Synthesizer
// Crisp cartoon SFX (coins, jumps, impacts, streaks) + Procedural Adventure BGM
// ===================================================

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.bgmTimer = null;
    this.muted = false;
    this.bgmPlaying = false;
  }

  setMuted(muted) {
    this.muted = !!muted;
    if (this.muted) {
      if (this.ctx && this.ctx.state === 'running') {
        this.ctx.suspend().catch(() => {});
      }
    } else {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    }
  }

  _getCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // ─── Crisp Coin Collect SFX ───────────────────────────────────────────────

  playCollect() {
    if (this.muted) return;
    try {
      const ctx = this._getCtx();
      const now = ctx.currentTime;

      // Two bright bell tones in quick succession (B5 -> E6)
      const freqs = [987.77, 1318.51];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);

        const startTime = now + idx * 0.06;
        gain.gain.setValueAtTime(0.18, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);

        osc.start(startTime);
        osc.stop(startTime + 0.2);
      });
    } catch (_) {}
  }

  // ─── Pitch-Ramping Streak Combo SFX ───────────────────────────────────────

  playStreak(streakCount = 1) {
    if (this.muted) return;
    try {
      const ctx = this._getCtx();
      const now = ctx.currentTime;

      // Ascending pitch base from 523Hz (C5) up to 1300Hz based on streak
      const baseFreq = 523.25 + Math.min(12, streakCount) * 65.0;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = streakCount >= 5 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.12);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.start(now);
      osc.stop(now + 0.18);
    } catch (_) {}
  }

  // ─── Cartoon Spring Jump SFX ──────────────────────────────────────────────

  playJump() {
    if (this.muted) return;
    try {
      const ctx = this._getCtx();
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      // Pitch slide upwards from 260Hz to 620Hz
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(620, now + 0.14);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      osc.start(now);
      osc.stop(now + 0.16);
    } catch (_) {}
  }

  // ─── Bouncy Mushroom Boing SFX ────────────────────────────────────────────

  playMushroom() {
    if (this.muted) return;
    try {
      const ctx = this._getCtx();
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      // Boing curve: 180Hz -> 850Hz -> 320Hz
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(850, now + 0.1);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.35);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

      osc.start(now);
      osc.stop(now + 0.38);
    } catch (_) {}
  }

  // ─── Ground Landing Thud SFX ──────────────────────────────────────────────

  playLand(impact = 0.5) {
    if (this.muted) return;
    try {
      const ctx = this._getCtx();
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(95, now);
      osc.frequency.exponentialRampToValueAtTime(28, now + 0.15);

      const vol = Math.min(0.35, 0.1 + impact * 0.25);
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      osc.start(now);
      osc.stop(now + 0.16);
    } catch (_) {}
  }

  // ─── Dramatic Impact Thud SFX ─────────────────────────────────────────────

  playHit() {
    if (this.muted) return;
    try {
      const ctx = this._getCtx();
      const now = ctx.currentTime;

      // Low punchy bass drop
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 0.28);

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

      osc.start(now);
      osc.stop(now + 0.32);

      // Snappy noise click
      const noise = ctx.createOscillator();
      const noiseGain = ctx.createGain();
      noise.type = 'sawtooth';
      noise.frequency.setValueAtTime(380, now);
      noise.frequency.exponentialRampToValueAtTime(80, now + 0.08);
      noise.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noiseGain.gain.setValueAtTime(0.25, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      noise.start(now);
      noise.stop(now + 0.1);
    } catch (_) {}
  }

  // ─── Time Trial Fanfares ──────────────────────────────────────────────────

  playRoundStart() {
    if (this.muted) return;
    try {
      const ctx = this._getCtx();
      const now = ctx.currentTime;
      // High chime fanfare (E5 -> G5 -> C6)
      const notes = [659.25, 783.99, 1046.50];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'triangle';
        const start = now + i * 0.09;
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.2, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);

        osc.start(start);
        osc.stop(start + 0.25);
      });
    } catch (_) {}
  }

  playRoundComplete() {
    if (this.muted) return;
    try {
      const ctx = this._getCtx();
      const now = ctx.currentTime;
      // Victory progression: C5, E5, G5, C6 triumphant chord
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sine';
        const start = now + i * 0.11;
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.25, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.5);

        osc.start(start);
        osc.stop(start + 0.5);
      });
    } catch (_) {}
  }

  // ─── Upbeat Procedural Fantasy Adventure BGM ──────────────────────────────

  startAmbience() {
    if (this.bgmPlaying || this.muted) return;
    this.bgmPlaying = true;

    try {
      const ctx = this._getCtx();
      // Cheerful pentatonic melody in G major [G4, A4, B4, D5, E5, G5]
      const notes = [392.00, 440.00, 493.88, 587.33, 659.25, 783.99];
      const melodyPattern = [0, 2, 3, 4, 3, 2, 0, 1, 2, 4, 5, 4, 3, 1, 0, 2];
      let step = 0;

      const tempo = 220; // ms per 16th note
      this.bgmTimer = setInterval(() => {
        if (!this.bgmPlaying) return;
        try {
          const now = ctx.currentTime;
          const noteFreq = notes[melodyPattern[step % melodyPattern.length]];

          // Soft pluck sound
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(noteFreq, now);

          gain.gain.setValueAtTime(0.045, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now);
          osc.stop(now + 0.2);

          // Bass groove every 4 steps
          if (step % 4 === 0) {
            const bass = ctx.createOscillator();
            const bassGain = ctx.createGain();
            bass.type = 'triangle';
            bass.frequency.setValueAtTime(noteFreq / 4, now);

            bassGain.gain.setValueAtTime(0.06, now);
            bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

            bass.connect(bassGain);
            bassGain.connect(ctx.destination);

            bass.start(now);
            bass.stop(now + 0.35);
          }

          step++;
        } catch (_) {}
      }, tempo);
    } catch (_) {}
  }

  stopAmbience() {
    this.bgmPlaying = false;
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }
}
