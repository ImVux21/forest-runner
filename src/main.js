// ===================================================
// Forest Runner — Main Entry Point
// Connects UI, CrazyGames SDK, Modes (Explore vs Time Trial),
// Daily Challenges, Wardrobe Skins & Controls
// ===================================================

import { Game } from './game/Game.js';
import { CrazySDK } from './game/CrazySDK.js';

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('canvas-container');
  const game = new Game(container);

  // ─── Mode Starting Handlers ───────────────────────────────────────────────
  const btnStartExplore = document.getElementById('btn-start');
  if (btnStartExplore) {
    btnStartExplore.addEventListener('click', () => {
      game.startExploration();
    });
  }

  const btnStartTT = document.getElementById('btn-start-tt');
  if (btnStartTT) {
    btnStartTT.addEventListener('click', () => {
      game.startTimeTrial();
    });
  }

  // ─── Daily Challenge Display & Countdown ──────────────────────────────────
  const updateDailyChallengeUI = () => {
    const ch = game.save.getDailyChallenge();
    if (!ch) return;

    const descEl = document.getElementById('daily-desc');
    const fillEl = document.getElementById('daily-progress-fill');
    const countEl = document.getElementById('daily-count-text');
    const rewardEl = document.getElementById('daily-reward-text');

    if (descEl) descEl.textContent = ch.description;
    if (countEl) countEl.textContent = `${ch.progress} / ${ch.target} ${ch.completed ? '✅ DONE' : ''}`;
    if (fillEl) {
      const pct = Math.min(100, Math.round((ch.progress / ch.target) * 100));
      fillEl.style.width = `${pct}%`;
    }
    if (rewardEl) {
      rewardEl.textContent = ch.rewardSkin ? `🎁 Unlock ${ch.rewardSkin.toUpperCase()} Skin` : `🎁 +${ch.rewardCoins} 🪙`;
    }

    // Refresh countdown to midnight UTC
    const countdownEl = document.getElementById('daily-countdown');
    if (countdownEl) {
      const now = new Date();
      const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
      const diffMs = Math.max(0, midnight - now);
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diffMs % (1000 * 60)) / 1000);
      countdownEl.textContent = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
  };

  updateDailyChallengeUI();
  setInterval(updateDailyChallengeUI, 1000);

  // ─── Wardrobe Modal & Skin Selection ──────────────────────────────────────
  const btnOpenWardrobe = document.getElementById('btn-open-wardrobe');
  const btnStartWardrobe = document.getElementById('btn-start-wardrobe');
  const btnCloseWardrobe = document.getElementById('btn-close-wardrobe');
  const wardrobeModal = document.getElementById('wardrobe-modal');
  const skinCards = document.querySelectorAll('.skin-card');

  const refreshWardrobeUI = () => {
    skinCards.forEach(card => {
      const skinType = card.dataset.skin;
      const isUnlocked = game.save.isSkinUnlocked(skinType);
      const badge = card.querySelector('.skin-lock-badge');

      if (isUnlocked) {
        card.classList.remove('locked');
        if (badge) badge.style.display = 'none';
      } else {
        card.classList.add('locked');
        if (badge) badge.style.display = 'block';
      }
    });
  };

  const openWardrobe = () => {
    refreshWardrobeUI();
    CrazySDK.gameplayStop();
    if (wardrobeModal) wardrobeModal.classList.remove('hidden');
  };

  const closeWardrobe = () => {
    if (wardrobeModal) wardrobeModal.classList.add('hidden');
    if (game.state === 'playing') {
      CrazySDK.gameplayStart();
    }
  };

  if (btnOpenWardrobe) btnOpenWardrobe.addEventListener('click', openWardrobe);
  if (btnStartWardrobe) btnStartWardrobe.addEventListener('click', openWardrobe);
  if (btnCloseWardrobe) btnCloseWardrobe.addEventListener('click', closeWardrobe);

  // ─── Lore & Biome Guide Modal ─────────────────────────────────────────────
  const loreModal = document.getElementById('lore-modal');
  const btnOpenLore = document.getElementById('btn-open-lore');
  const btnHudLore = document.getElementById('btn-hud-lore');
  const btnCloseLore = document.getElementById('btn-close-lore');

  const openLore = () => {
    CrazySDK.gameplayStop();
    if (loreModal) loreModal.classList.remove('hidden');
  };

  const closeLore = () => {
    if (loreModal) loreModal.classList.add('hidden');
    if (game.state === 'playing') {
      CrazySDK.gameplayStart();
    }
  };

  if (btnOpenLore) btnOpenLore.addEventListener('click', openLore);
  if (btnHudLore) btnHudLore.addEventListener('click', openLore);
  if (btnCloseLore) btnCloseLore.addEventListener('click', closeLore);

  skinCards.forEach(card => {
    card.addEventListener('click', () => {
      const skinType = card.dataset.skin;
      if (!game.save.isSkinUnlocked(skinType)) {
        if (game.audio) game.audio.playHit();
        return;
      }
      skinCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      game.setSkin(skinType);
      if (game.audio) game.audio.playCollect();
    });
  });

  // ─── Time Trial Summary Modal Controls ────────────────────────────────────
  const ttModal = document.getElementById('tt-summary-modal');
  const btnTTReplay = document.getElementById('btn-tt-replay');
  const btnTTDouble = document.getElementById('btn-tt-double');
  const btnTTFreeroam = document.getElementById('btn-tt-freeroam');

  if (btnTTReplay) {
    btnTTReplay.addEventListener('click', () => {
      CrazySDK.requestMidgameAd({
        onFinished: () => {
          if (ttModal) ttModal.classList.add('hidden');
          game.startTimeTrial();
        },
      });
    });
  }

  if (btnTTDouble) {
    btnTTDouble.addEventListener('click', () => {
      CrazySDK.requestRewardedAd({
        onReward: () => {
          const earned = game.timeTrial.roundCoins || 0;
          game.save.addCoins(earned);
          const c = document.getElementById('tt-summary-coins');
          if (c) c.textContent = `+${earned * 2} (DOUBLED!)`;
          btnTTDouble.style.display = 'none';
          if (game.audio) game.audio.playRoundComplete();
        },
      });
    });
  }

  if (btnTTFreeroam) {
    btnTTFreeroam.addEventListener('click', () => {
      if (ttModal) ttModal.classList.add('hidden');
      game.startExploration();
    });
  }

  // ─── D-Pad Movement Buttons ───────────────────────────────────────────────
  const bindDirectionButton = (id, x, z) => {
    const btn = document.getElementById(id);
    if (!btn) return;

    const startMove = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (game.state === 'menu') game.startExploration();
      btn.classList.add('active');
      game.input.setTouchDirection(x, z);
    };

    const stopMove = (e) => {
      e.preventDefault();
      btn.classList.remove('active');
      game.input.setTouchDirection(0, 0);
    };

    btn.addEventListener('pointerdown', startMove);
    btn.addEventListener('pointerup', stopMove);
    btn.addEventListener('pointerleave', stopMove);
  };

  bindDirectionButton('btn-control-up', 0, -1);
  bindDirectionButton('btn-control-down', 0, 1);
  bindDirectionButton('btn-control-left', -1, 0);
  bindDirectionButton('btn-control-right', 1, 0);

  // ─── Jump, Sprint & Glider Mobile Buttons ─────────────────────────────────
  const btnJump = document.getElementById('btn-control-jump');
  if (btnJump) {
    btnJump.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (game.state === 'menu') game.startExploration();
      btnJump.classList.add('active');
      setTimeout(() => btnJump.classList.remove('active'), 120);
      game.input.triggerJump();
    });
  }

  const btnSprint = document.getElementById('btn-control-sprint');
  if (btnSprint) {
    btnSprint.addEventListener('click', () => {
      const active = game.input.toggleSprint();
      btnSprint.classList.toggle('active', active);
    });
  }

  const btnGlider = document.getElementById('btn-control-glider');
  if (btnGlider) {
    btnGlider.addEventListener('pointerdown', () => {
      game.input.setTouchGlide(true);
      btnGlider.classList.add('active');
    });
    btnGlider.addEventListener('pointerup', () => {
      game.input.setTouchGlide(false);
      btnGlider.classList.remove('active');
    });
    btnGlider.addEventListener('pointerleave', () => {
      game.input.setTouchGlide(false);
      btnGlider.classList.remove('active');
    });
  }

  // ─── Talk [E] Button ──────────────────────────────────────────────────────
  const btnTalk = document.getElementById('btn-control-talk');
  if (btnTalk) {
    btnTalk.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      game.triggerTalk();
    });
  }

  // ─── Camera Rotation Buttons ──────────────────────────────────────────────
  const btnRotL = document.getElementById('btn-control-rot-left');
  const btnRotR = document.getElementById('btn-control-rot-right');

  if (btnRotL) {
    btnRotL.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      game.thirdPersonCamera.rotateManual(0.35);
    });
  }
  if (btnRotR) {
    btnRotR.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      game.thirdPersonCamera.rotateManual(-0.35);
    });
  }

  // ─── Launch on Any Key ────────────────────────────────────────────────────
  window.addEventListener('keydown', (e) => {
    if (game.state === 'menu' && (e.code === 'Enter' || e.code === 'Space')) {
      game.startExploration();
    }
  });

  // ─── CrazyGames Lifecycle: Visibility & Toolbar Mute ──────────────────────
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (game.audio) game.audio.setMuted(true);
      CrazySDK.gameplayStop();
    } else {
      if (game.audio) game.audio.setMuted(false);
      if (game.state === 'playing') {
        CrazySDK.gameplayStart();
      }
    }
  });

  CrazySDK.addSettingsChangeListener((settings) => {
    if (settings && settings.muteAudio !== undefined && game.audio) {
      game.audio.setMuted(settings.muteAudio);
    }
  });
});

