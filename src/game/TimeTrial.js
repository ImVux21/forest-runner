// ===================================================
// TimeTrial.js — High-Octane Arcade Time Trial Mode
// Streak combos, dynamic coin rushes, time bonuses & CrazyGames monetization hooks
// ===================================================
import * as THREE from 'three';
import { CrazySDK } from './CrazySDK.js';

export class TimeTrial {
  constructor(game) {
    this.game = game;
    this.active = false;
    this.timeLeft = 75.0; // Seconds
    this.maxTime = 90.0;
    this.round = 1;
    this.roundScore = 0;
    this.roundCoins = 0;

    // Streak system
    this.streak = 0;
    this.bestStreak = 0;
    this.streakTimer = 0;
    this.streakWindow = 3.8; // Seconds allowed between collections
    this.multiplier = 1;

    // Dynamic respawn rings
    this.rushCoins = []; // [{ mesh, box, baseY, points }]
    this.nextRushTimer = 0;
  }

  start() {
    this.active = true;
    this.timeLeft = 75.0;
    this.roundScore = 0;
    this.roundCoins = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.multiplier = 1;
    this.streakTimer = 0;

    // Reset player position to start of trial course
    this.game.player.reset(0, 0);
    this.game.collectibles.spawnAll();
    this._clearRushCoins();
    this._spawnCoinRushRoute();

    // Trigger CrazyGames start
    CrazySDK.gameplayStart();

    // Show HUD
    this._updateHUD();
    this._setVignette(false);

    if (this.game.audio) {
      this.game.audio.playRoundStart?.();
    }
  }

  stop() {
    if (!this.active) return;
    this.active = false;
    this._clearRushCoins();
    this._setVignette(false);
    CrazySDK.gameplayStop();
  }

  update(delta) {
    if (!this.active) return;

    // 1. Countdown timer
    this.timeLeft -= delta;
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this._updateHUD();
      this._finishRound();
      return;
    }

    // 2. Streak window decay
    if (this.streak > 0) {
      this.streakTimer -= delta;
      if (this.streakTimer <= 0) {
        this.resetStreak();
      }
    }

    // 3. Dynamic coin rush spawning
    this.nextRushTimer -= delta;
    if (this.nextRushTimer <= 0) {
      this._spawnCoinRushRoute();
      this.nextRushTimer = 18.0; // Refresh rush routes periodically
    }

    // 4. Update rush coins animation
    const time = performance.now() * 0.005;
    for (let i = 0; i < this.rushCoins.length; i++) {
      const item = this.rushCoins[i];
      item.mesh.rotation.y += delta * 4.5;
      item.mesh.position.y = item.baseY + Math.sin(time + item.mesh.position.x) * 0.16;
      item.box.setFromObject(item.mesh);
    }

    // 5. Check rush coin pickup
    const playerBox = this.game.player.getBoundingBox();
    for (let i = this.rushCoins.length - 1; i >= 0; i--) {
      const item = this.rushCoins[i];
      if (playerBox.intersectsBox(item.box)) {
        this.game.scene.remove(item.mesh);
        this.rushCoins.splice(i, 1);
        this.onItemCollected(item.points || 15, item.mesh.position);
      }
    }

    this._updateHUD();
  }

  onItemCollected(basePoints, worldPos) {
    if (!this.active) return;

    this.streak++;
    this.streakTimer = this.streakWindow;
    if (this.streak > this.bestStreak) this.bestStreak = this.streak;

    // Multiplier tiers: 1..2: 1x, 3..5: 2x, 6..9: 3x, 10+: 5x
    if (this.streak >= 10) this.multiplier = 5;
    else if (this.streak >= 6) this.multiplier = 3;
    else if (this.streak >= 3) this.multiplier = 2;
    else this.multiplier = 1;

    const awardedScore = basePoints * this.multiplier;
    this.roundScore += awardedScore;
    this.roundCoins += 1;
    this.game.coins += 1;
    this.game.score += awardedScore;

    // Time bonus on streak milestones
    let timeBonus = 0;
    if (this.streak > 0 && this.streak % 5 === 0) {
      timeBonus = 6.0;
      this.timeLeft = Math.min(this.maxTime, this.timeLeft + timeBonus);
      this.game.screenShake?.addTrauma(0.25);
      CrazySDK.happytime();
    }

    // Floating text popups
    if (this.game.floatingText && worldPos) {
      const color = this.multiplier >= 5 ? '#ff4081' : (this.multiplier >= 3 ? '#ff9100' : '#ffd700');
      let text = `+${awardedScore}`;
      if (this.multiplier > 1) text += ` [x${this.multiplier}!]`;
      if (timeBonus > 0) text += ` +${timeBonus}s ⏱`;
      this.game.floatingText.spawn(text, worldPos, { color, isBig: this.multiplier >= 3 });
    }

    // Audio pitch variation with streak
    if (this.game.audio) {
      this.game.audio.playStreak?.(this.streak);
    }

    // Screen vignette flame effect when on streak >= 3
    this._setVignette(this.streak >= 3);

    // Save coins
    this.game.save.addCoins(1);
    this.game.save.recordStreak(this.streak);
  }

  resetStreak() {
    this.streak = 0;
    this.multiplier = 1;
    this._setVignette(false);
    this._updateHUD();
  }

  _setVignette(active) {
    if (typeof document === 'undefined') return;
    const vig = document.getElementById('streak-vignette');
    if (vig) {
      vig.classList.toggle('active', active);
    }
  }

  _spawnCoinRushRoute() {
    // Generate rings of neon rush coins across valleys and ramp crests
    const clusters = [
      // Cluster A: Center Valley Spiral
      [[0, -10], [2, -14], [5, -18], [2, -22], [-2, -22], [-5, -18], [-2, -14]],
      // Cluster B: North Plateau Ridge
      [[-10, 4], [-12, 8], [-14, 12], [-14, 16], [-12, 20]],
      // Cluster C: River Crossway Docks
      [[6, -2], [10, -4], [14, -6], [18, -4], [22, -2]],
    ];

    const chosen = clusters[Math.floor(Math.random() * clusters.length)];

    const geo = new THREE.CylinderGeometry(0.42, 0.42, 0.1, 12);
    geo.rotateX(Math.PI / 2);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xff3d00,
      emissive: 0xff6e40,
      emissiveIntensity: 0.8,
      metalness: 0.8,
      roughness: 0.2,
    });

    chosen.forEach(([x, z]) => {
      const y = this.game.world.getGroundHeight(x, z) + 0.9;
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      this.game.scene.add(mesh);
      this.rushCoins.push({
        mesh,
        box: new THREE.Box3(),
        baseY: y,
        points: 25,
      });
    });
  }

  _clearRushCoins() {
    this.rushCoins.forEach((item) => this.game.scene.remove(item.mesh));
    this.rushCoins = [];
  }

  _updateHUD() {
    if (typeof document === 'undefined') return;

    const timerEl = document.getElementById('tt-timer-display');
    const streakEl = document.getElementById('tt-streak-display');
    const multEl = document.getElementById('tt-multiplier-tag');
    const ttScoreEl = document.getElementById('tt-score-display');
    const timerBar = document.getElementById('tt-timer-bar');

    if (timerEl) {
      const mins = Math.floor(this.timeLeft / 60);
      const secs = Math.floor(this.timeLeft % 60);
      const frac = Math.floor((this.timeLeft % 1) * 10);
      timerEl.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}.${frac}`;
      if (this.timeLeft <= 10) {
        timerEl.style.color = '#ff3b30';
        timerEl.classList.add('pulse-fast');
      } else {
        timerEl.style.color = '#ffd700';
        timerEl.classList.remove('pulse-fast');
      }
    }

    if (timerBar) {
      const pct = Math.max(0, Math.min(100, (this.timeLeft / this.maxTime) * 100));
      timerBar.style.width = `${pct}%`;
    }

    if (streakEl) {
      streakEl.textContent = this.streak > 0 ? `🔥 STREAK ${this.streak}` : 'NO STREAK';
      streakEl.style.color = this.streak >= 6 ? '#ff4081' : (this.streak >= 3 ? '#ff9100' : '#a0aec0');
    }

    if (multEl) {
      multEl.textContent = `x${this.multiplier}`;
      multEl.style.display = this.multiplier > 1 ? 'inline-block' : 'none';
    }

    if (ttScoreEl) {
      ttScoreEl.textContent = this.roundScore.toLocaleString();
    }
  }

  _finishRound() {
    this.stop();

    // Check best time trial score
    const isNewRecord = this.game.save.recordTimeTrialScore(this.roundScore);

    // Update Daily Challenge progress
    this.game.save.recordDailyProgress('coins', this.roundCoins);
    this.game.save.recordDailyProgress('streak', this.bestStreak);

    // Play fanfare
    if (this.game.audio) {
      this.game.audio.playRoundComplete?.();
    }

    // Celebrate high scores
    if (this.roundScore > 1000) {
      CrazySDK.happytime();
    }

    // Show round summary modal
    this._showSummaryModal(isNewRecord);
  }

  _showSummaryModal(isNewRecord) {
    if (typeof document === 'undefined') return;

    const modal = document.getElementById('tt-summary-modal');
    if (!modal) return;

    const finalScore = document.getElementById('tt-summary-score');
    const finalCoins = document.getElementById('tt-summary-coins');
    const finalStreak = document.getElementById('tt-summary-streak');
    const recordBadge = document.getElementById('tt-summary-record');

    if (finalScore) finalScore.textContent = this.roundScore.toLocaleString();
    if (finalCoins) finalCoins.textContent = `+${this.roundCoins}`;
    if (finalStreak) finalStreak.textContent = `x${this.bestStreak}`;
    if (recordBadge) recordBadge.style.display = isNewRecord ? 'block' : 'none';

    modal.classList.remove('hidden');
  }
}
