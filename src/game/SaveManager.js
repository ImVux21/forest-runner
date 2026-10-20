// ===================================================
// SaveManager.js — LocalStorage persistence
// Tracks scores, coins, unlocked skins, best streak & daily challenge retention
// ===================================================

const SAVE_KEY = 'forest_runner_save';

export class SaveManager {
  constructor() {
    this._data = this._load();
    this._verifyDailyChallenge();
  }

  _load() {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(SAVE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          return {
            bestScore: parsed.bestScore || 0,
            bestTimeTrialScore: parsed.bestTimeTrialScore || 0,
            bestStreak: parsed.bestStreak || 0,
            totalCoins: parsed.totalCoins || 0,
            totalPlays: parsed.totalPlays || 0,
            unlockedSkins: Array.isArray(parsed.unlockedSkins) ? parsed.unlockedSkins : ['blue'],
            dailyChallenge: parsed.dailyChallenge || null,
          };
        }
      }
    } catch (_) {}
    return {
      bestScore: 0,
      bestTimeTrialScore: 0,
      bestStreak: 0,
      totalCoins: 0,
      totalPlays: 0,
      unlockedSkins: ['blue'],
      dailyChallenge: null,
    };
  }

  _save() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(SAVE_KEY, JSON.stringify(this._data));
      }
    } catch (_) {}
  }

  getBestScore() {
    return this._data.bestScore || 0;
  }

  getBestTimeTrialScore() {
    return this._data.bestTimeTrialScore || 0;
  }

  getBestStreak() {
    return this._data.bestStreak || 0;
  }

  getTotalCoins() {
    return this._data.totalCoins || 0;
  }

  getTotalPlays() {
    return this._data.totalPlays || 0;
  }

  addCoins(amount) {
    this._data.totalCoins = (this._data.totalCoins || 0) + amount;
    this._save();
    return this._data.totalCoins;
  }

  updateBestScore(score) {
    this._data.totalPlays = (this._data.totalPlays || 0) + 1;
    if (score > (this._data.bestScore || 0)) {
      this._data.bestScore = score;
    }
    this._save();
    return this._data.bestScore;
  }

  recordTimeTrialScore(score) {
    let isRecord = false;
    if (score > (this._data.bestTimeTrialScore || 0)) {
      this._data.bestTimeTrialScore = score;
      isRecord = true;
    }
    this._save();
    return isRecord;
  }

  recordStreak(streak) {
    if (streak > (this._data.bestStreak || 0)) {
      this._data.bestStreak = streak;
      this._save();
    }
  }

  // ─── Wardrobe Skin Persistence ──────────────────────────────────────────

  isSkinUnlocked(skinName) {
    if (!this._data.unlockedSkins) this._data.unlockedSkins = ['blue'];
    return this._data.unlockedSkins.includes(skinName);
  }

  unlockSkin(skinName) {
    if (!this.isSkinUnlocked(skinName)) {
      this._data.unlockedSkins.push(skinName);
      this._save();
      return true;
    }
    return false;
  }

  getUnlockedSkins() {
    return this._data.unlockedSkins || ['blue'];
  }

  // ─── Daily Challenge System (D1 Retention) ──────────────────────────────

  _getTodayDateString() {
    try {
      return new Date().toISOString().slice(0, 10);
    } catch (_) {
      return '2026-09-28';
    }
  }

  _verifyDailyChallenge() {
    const today = this._getTodayDateString();
    if (!this._data.dailyChallenge || this._data.dailyChallenge.date !== today) {
      // Seed challenge using date
      const dayNum = parseInt(today.replace(/-/g, ''), 10) || 20260928;
      const templates = [
        { type: 'coins', title: 'Coin Hunter', description: 'Collect 25 coins in the valley', target: 25, rewardSkin: 'knight', rewardCoins: 100 },
        { type: 'streak', title: 'Combo Master', description: 'Achieve a 6x streak in Time Trial', target: 6, rewardSkin: 'mage', rewardCoins: 150 },
        { type: 'peak', title: 'Summit Mountaineer', description: 'Conquer the Windy Peak summit', target: 1, rewardSkin: 'crimson', rewardCoins: 200 },
      ];
      const template = templates[dayNum % templates.length];

      this._data.dailyChallenge = {
        date: today,
        type: template.type,
        title: template.title,
        description: template.description,
        target: template.target,
        progress: 0,
        completed: false,
        rewardSkin: template.rewardSkin,
        rewardCoins: template.rewardCoins,
        claimed: false,
      };
      this._save();
    }
  }

  getDailyChallenge() {
    this._verifyDailyChallenge();
    return this._data.dailyChallenge;
  }

  recordDailyProgress(type, amount = 1) {
    this._verifyDailyChallenge();
    const ch = this._data.dailyChallenge;
    if (!ch || ch.completed || ch.type !== type) return ch;

    if (type === 'streak') {
      if (amount > ch.progress) ch.progress = amount;
    } else {
      ch.progress = (ch.progress || 0) + amount;
    }

    if (ch.progress >= ch.target) {
      ch.progress = ch.target;
      ch.completed = true;
      if (ch.rewardSkin) {
        this.unlockSkin(ch.rewardSkin);
      }
      if (ch.rewardCoins) {
        this.addCoins(ch.rewardCoins);
      }
    }

    this._save();
    return ch;
  }
}
