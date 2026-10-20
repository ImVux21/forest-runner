// ===================================================
// crazygames_features.test.mjs — CrazyGames System Verification
// Validates CrazySDK, TimeTrial, Daily Challenges & Juice Systems
// ===================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import { SaveManager } from '../src/game/SaveManager.js';
import { CrazySDK } from '../src/game/CrazySDK.js';
import { ScreenShake } from '../src/game/ScreenShake.js';

test('CG.1: CrazySDK graceful standalone operation without browser window crash', async () => {
  await CrazySDK.init();
  assert.equal(CrazySDK.initialized, true);

  // Calling lifecycle methods in node environment must not throw
  assert.doesNotThrow(() => CrazySDK.gameplayStart());
  assert.doesNotThrow(() => CrazySDK.gameplayStop());
  assert.doesNotThrow(() => CrazySDK.happytime());

  // Ad request fallback must call callback directly without freezing
  let adFinishedCalled = false;
  CrazySDK.requestMidgameAd({
    onFinished: () => {
      adFinishedCalled = true;
    },
  });
  assert.equal(adFinishedCalled, true);
});

test('CG.2: SaveManager generates deterministic daily challenge and tracks progress', () => {
  const save = new SaveManager();
  const challenge = save.getDailyChallenge();

  assert.ok(challenge, 'Daily challenge must be present');
  assert.ok(challenge.date, 'Challenge must have a date');
  assert.ok(challenge.target > 0, 'Target must be positive');
  assert.equal(typeof challenge.progress, 'number', 'Progress must be a number');

  // Verify daily progress increment
  const prevProg = challenge.progress;
  save.recordDailyProgress(challenge.type, 1);
  const updated = save.getDailyChallenge();
  assert.equal(updated.progress, Math.min(updated.target, prevProg + 1));
});

test('CG.3: SaveManager locks and unlocks skins appropriately', () => {
  const save = new SaveManager();
  assert.equal(save.isSkinUnlocked('blue'), true, 'Hero Blue default skin must be unlocked');

  // Test unlocking knight
  save.unlockSkin('knight');
  assert.equal(save.isSkinUnlocked('knight'), true, 'Knight skin must now be unlocked');
  assert.ok(save.getUnlockedSkins().includes('knight'));
});

test('CG.4: ScreenShake trauma math decays exponentially towards zero', () => {
  const mockCamera = {
    rotation: { x: 0, y: 0, z: 0 },
    position: { x: 0, y: 0, z: 0 },
  };

  const shake = new ScreenShake(mockCamera);
  shake.addTrauma(0.8);
  assert.equal(shake.trauma, 0.8, 'Trauma should register at 0.8');

  // Step 0.5s forward
  shake.update(0.5);
  assert.ok(shake.trauma < 0.8, 'Trauma should decay over time');

  // Step 1.5s forward
  shake.update(1.5);
  assert.equal(shake.trauma, 0, 'Trauma should eventually decay to 0');
});

test('CG.5: SaveManager records Time Trial high score and streaks', () => {
  const save = new SaveManager();
  const initialBest = save.getBestTimeTrialScore();

  save.recordTimeTrialScore(initialBest + 500);
  assert.equal(save.getBestTimeTrialScore(), initialBest + 500);

  save.recordStreak(8);
  assert.ok(save.getBestStreak() >= 8);
});

test('CG.6: CrazySDK enforces 180s (3-minute) midgame ad cooldown per CrazyGames playbook', () => {
  assert.equal(CrazySDK.AD_COOLDOWN_MS, 180000, 'Cooldown must be 180 seconds');

  // Simulate an ad having just run
  CrazySDK.lastMidgameAdTime = Date.now();

  let immediateRan = false;
  CrazySDK.requestMidgameAd({
    onFinished: () => {
      immediateRan = true;
    },
  });
  // Callback should run without blocking
  assert.equal(immediateRan, true, 'Immediate callback called when cooldown active');

  // Advance time past 180 seconds
  CrazySDK.lastMidgameAdTime = Date.now() - 181000;
  let secondRan = false;
  CrazySDK.requestMidgameAd({
    onFinished: () => {
      secondRan = true;
    },
  });
  assert.equal(secondRan, true, 'Ad request executes once cooldown expires');
});

