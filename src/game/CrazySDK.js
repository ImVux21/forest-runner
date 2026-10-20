// ===================================================
// CrazySDK.js — Official CrazyGames SDK v3 Integration
// Safe wrapper with offline fallback and event tracking
// ===================================================

export class CrazySDK {
  static initialized = false;
  static isAvailable = false;
  static isGameplayRunning = false;
  static lastMidgameAdTime = Date.now(); // Initialized to Date.now() per 3-minute rule
  static AD_COOLDOWN_MS = 180000; // 3 minutes per CrazyGames playbook

  static async init() {
    if (this.initialized) return;
    this.initialized = true;

    try {
      if (typeof window !== 'undefined' && window.CrazyGames && window.CrazyGames.SDK) {
        await window.CrazyGames.SDK.init();
        this.isAvailable = true;
        this.loadingStart();
        console.log('[CrazySDK] CrazyGames SDK v3 successfully initialized');
      } else {
        console.log('[CrazySDK] CrazyGames SDK not detected in environment — operating in standalone mode');
      }
    } catch (err) {
      console.warn('[CrazySDK] Initialization error or adblocker detected:', err);
      this.isAvailable = false;
    }
  }

  static loadingStart() {
    try {
      if (this.isAvailable && window.CrazyGames?.SDK?.game?.loadingStart) {
        window.CrazyGames.SDK.game.loadingStart();
        console.log('[CrazySDK] loadingStart() called');
      }
    } catch (err) {
      console.warn('[CrazySDK] loadingStart error:', err);
    }
  }

  static loadingStop() {
    try {
      if (this.isAvailable && window.CrazyGames?.SDK?.game?.loadingStop) {
        window.CrazyGames.SDK.game.loadingStop();
        console.log('[CrazySDK] loadingStop() called');
      }
    } catch (err) {
      console.warn('[CrazySDK] loadingStop error:', err);
    }
  }

  static addSettingsChangeListener(callback) {
    try {
      if (this.isAvailable && window.CrazyGames?.SDK?.game?.addSettingsChangeListener) {
        window.CrazyGames.SDK.game.addSettingsChangeListener(callback);
        console.log('[CrazySDK] addSettingsChangeListener attached');
      }
    } catch (err) {
      console.warn('[CrazySDK] addSettingsChangeListener error:', err);
    }
  }

  static gameplayStart() {
    if (!this.isGameplayRunning) {
      this.isGameplayRunning = true;
      try {
        if (this.isAvailable && window.CrazyGames?.SDK?.game) {
          window.CrazyGames.SDK.game.gameplayStart();
          console.log('[CrazySDK] gameplayStart() called');
        }
      } catch (err) {
        console.warn('[CrazySDK] gameplayStart error:', err);
      }
    }
  }

  static gameplayStop() {
    if (this.isGameplayRunning) {
      this.isGameplayRunning = false;
      try {
        if (this.isAvailable && window.CrazyGames?.SDK?.game) {
          window.CrazyGames.SDK.game.gameplayStop();
          console.log('[CrazySDK] gameplayStop() called');
        }
      } catch (err) {
        console.warn('[CrazySDK] gameplayStop error:', err);
      }
    }
  }

  static happytime() {
    try {
      if (this.isAvailable && window.CrazyGames?.SDK?.game) {
        window.CrazyGames.SDK.game.happytime();
        console.log('[CrazySDK] happytime() celebrated');
      }
    } catch (err) {
      console.warn('[CrazySDK] happytime error:', err);
    }
  }

  static requestMidgameAd(callbacks = {}) {
    const elapsed = Date.now() - this.lastMidgameAdTime;
    if (elapsed < this.AD_COOLDOWN_MS) {
      const remaining = Math.ceil((this.AD_COOLDOWN_MS - elapsed) / 1000);
      console.log(`[CrazySDK] Midgame Ad skipped — cooldown active (${remaining}s remaining)`);
      if (callbacks.onFinished) callbacks.onFinished();
      return;
    }

    this.gameplayStop();
    if (this.isAvailable && window.CrazyGames?.SDK?.ad) {
      try {
        window.CrazyGames.SDK.ad.requestAd('midgame', {
          adStarted: () => {
            console.log('[CrazySDK] Midgame Ad started');
            this.lastMidgameAdTime = Date.now();
            if (callbacks.onStart) callbacks.onStart();
          },
          adFinished: () => {
            console.log('[CrazySDK] Midgame Ad finished');
            this.lastMidgameAdTime = Date.now();
            this.gameplayStart();
            if (callbacks.onFinished) callbacks.onFinished();
          },
          adError: (error) => {
            console.warn('[CrazySDK] Midgame Ad error:', error);
            this.gameplayStart();
            if (callbacks.onError) callbacks.onError(error);
          },
        });
        return;
      } catch (e) {
        console.warn('[CrazySDK] Ad request exception:', e);
      }
    }
    // Fallback if SDK unavailable
    if (callbacks.onFinished) callbacks.onFinished();
  }

  static requestRewardedAd(callbacks = {}) {
    this.gameplayStop();
    if (this.isAvailable && window.CrazyGames?.SDK?.ad) {
      try {
        window.CrazyGames.SDK.ad.requestAd('rewarded', {
          adStarted: () => {
            console.log('[CrazySDK] Rewarded Ad started');
            if (callbacks.onStart) callbacks.onStart();
          },
          adFinished: () => {
            console.log('[CrazySDK] Rewarded Ad finished — granting reward');
            this.gameplayStart();
            if (callbacks.onReward) callbacks.onReward();
            if (callbacks.onFinished) callbacks.onFinished();
          },
          adError: (error) => {
            console.warn('[CrazySDK] Rewarded Ad error:', error);
            this.gameplayStart();
            if (callbacks.onError) callbacks.onError(error);
          },
        });
        return;
      } catch (e) {
        console.warn('[CrazySDK] Rewarded ad exception:', e);
      }
    }
    // Fallback in local/dev mode: reward immediately for testing
    if (callbacks.onReward) callbacks.onReward();
    if (callbacks.onFinished) callbacks.onFinished();
  }
}
