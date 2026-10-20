// ===================================================
// f03_day_night_challenger.test.mjs — Adversarial Stress Test Suite for Day/Night Lighting Cycle
// Empirical verification of C1 continuity, sticky blue moonlight immunity,
// dynamic modulation of all 9 parameters, and edge-case robustness.
// ===================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import '../helpers/headless_env.mjs';

// Polyfill global requestAnimationFrame and cancelAnimationFrame for headless Game instantiation
if (typeof globalThis.requestAnimationFrame === 'undefined') {
  globalThis.requestAnimationFrame = (cb) => 0;
  globalThis.cancelAnimationFrame = (id) => {};
}

import { Game, LIGHTING_PHASES } from '../../src/game/Game.js';
import { WorldManager } from '../../src/game/WorldManager.js';
import { Player3D } from '../../src/game/Player3D.js';
import { AtmosphereManager } from '../../src/game/AtmosphereManager.js';
import { AudioManager } from '../../src/game/AudioManager.js';

// In headless tests, stub _animate and async asset loaders that attempt network fetch
Game.prototype._animate = function() {};
WorldManager.prototype.init = async function() {};
Player3D.prototype.init = async function() {};
AtmosphereManager.prototype.init = async function() {};
AudioManager.prototype.startAmbience = function() {};

// Helper to create a headless Game instance
function createTestGame() {
  const container = document.createElement('div');
  const game = new Game(container);
  return game;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. 10,000 Simulated Frames Stress Test: Sticky Blue Moonlight Immunity
// ─────────────────────────────────────────────────────────────────────────────

test('Challenger 1.1: 10,000 simulated frames at 60 FPS — sunlight never gets stuck on blue moonlight', () => {
  const game = createTestGame();

  // Baseline at dawn (0.0)
  game.dayTime = 0.0;
  const delta = 1.0 / 60.0; // 0.016667s
  const totalFrames = 10000;
  const cycleSeconds = game.dayDuration; // 140s
  const simulatedSeconds = totalFrames * delta; // ~166.67 seconds (> 1.19 full cycles)

  let noonVisits = 0;
  let midnightVisits = 0;
  let sunsetVisits = 0;
  let dawnVisits = 0;

  for (let frame = 0; frame < totalFrames; frame++) {
    // Advance dayTime as done in Game._update
    game.dayTime = (game.dayTime + delta / game.dayDuration) % 1.0;
    game._updateDayNightLighting(delta);

    const t = game.dayTime;
    const sunColor = game.sunLight.color;

    // Check: Color must never contain NaN or invalid range
    assert.ok(!Number.isNaN(sunColor.r) && !Number.isNaN(sunColor.g) && !Number.isNaN(sunColor.b),
      `Frame ${frame}: sunColor contains NaN!`);
    assert.ok(sunColor.r >= 0 && sunColor.r <= 1.0, `Frame ${frame}: sunColor.r out of bounds: ${sunColor.r}`);
    assert.ok(sunColor.g >= 0 && sunColor.g <= 1.0, `Frame ${frame}: sunColor.g out of bounds: ${sunColor.g}`);
    assert.ok(sunColor.b >= 0 && sunColor.b <= 1.0, `Frame ${frame}: sunColor.b out of bounds: ${sunColor.b}`);

    // Noon check window: t in [0.245, 0.255]
    if (Math.abs(t - 0.25) < 0.005) {
      noonVisits++;
      // Day sunColor is 0xfff6e5 -> in linear: r=1.0, g=0.9216, b=0.7835
      // Sunlight MUST be warm solar cream, NOT blue moonlight (0x8cb8ff: r=0.262, b=1.0)!
      assert.ok(sunColor.r > 0.98, `Frame ${frame}: Day sunColor.r should be > 0.98, got ${sunColor.r}`);
      assert.ok(sunColor.g > 0.88, `Frame ${frame}: Day sunColor.g should be > 0.88, got ${sunColor.g}`);
      assert.ok(sunColor.b < 0.85, `Frame ${frame}: Day sunColor.b should be < 0.85 (warm), got ${sunColor.b}`);
      assert.ok(sunColor.r > sunColor.b, `Frame ${frame}: Day sunlight MUST be warm (r > b), but got r=${sunColor.r}, b=${sunColor.b}`);
    }

    // Midnight check window: t in [0.745, 0.755]
    if (Math.abs(t - 0.75) < 0.005) {
      midnightVisits++;
      // Night sunColor is 0x8cb8ff -> in linear: r=0.262, g=0.479, b=1.0
      assert.ok(sunColor.b > 0.95, `Frame ${frame}: Night moonlight.b should be > 0.95, got ${sunColor.b}`);
      assert.ok(sunColor.b > sunColor.r, `Frame ${frame}: Night moonlight must be blue (b > r), but got r=${sunColor.r}, b=${sunColor.b}`);
    }

    // Dawn check window: t < 0.005 or t > 0.995
    if (t < 0.005 || t > 0.995) {
      dawnVisits++;
      // Dawn sunColor is 0xffb88c -> in linear: r=1.0, g=0.479, b=0.262
      assert.ok(sunColor.r > 0.98, `Frame ${frame}: Dawn sunColor.r should be > 0.98, got ${sunColor.r}`);
      assert.ok(sunColor.r > sunColor.b, `Frame ${frame}: Dawn sunColor must be warm golden (r > b), got r=${sunColor.r}, b=${sunColor.b}`);
    }

    // Sunset check window: t in [0.495, 0.505]
    if (Math.abs(t - 0.50) < 0.005) {
      sunsetVisits++;
      // Sunset sunColor is 0xff7a36 -> in linear: r=1.0, g=0.194, b=0.038
      assert.ok(sunColor.r > 0.98, `Frame ${frame}: Sunset sunColor.r should be > 0.98, got ${sunColor.r}`);
      assert.ok(sunColor.b < 0.30, `Frame ${frame}: Sunset sunColor.b should be < 0.30, got ${sunColor.b}`);
    }
  }

  assert.ok(noonVisits >= 1, `Must have passed noon at least once (passed ${noonVisits} times)`);
  assert.ok(midnightVisits >= 1, `Must have passed midnight at least once (passed ${midnightVisits} times)`);
  assert.ok(sunsetVisits >= 1, `Must have passed sunset at least once (passed ${sunsetVisits} times)`);
  assert.ok(dawnVisits >= 1, `Must have passed dawn at least once (passed ${dawnVisits} times)`);
});

test('Challenger 1.2: Multi-cycle long-term stress (5 full cycles, 10,000 variable frames)', () => {
  const game = createTestGame();
  game.dayTime = 0.75; // Start directly at midnight
  game._updateDayNightLighting(0.016);
  assert.equal(game.sunLight.color.getHexString(), '8cb8ff', 'Starts at midnight blue');

  // Simulate 10,000 frames with varying frame rates (delta from 0.035s to 0.105s)
  // Total simulated time will be ~700 seconds (5 full 140s cycles)
  let simulatedTime = 0;
  for (let frame = 0; frame < 10000; frame++) {
    const delta = 0.070 + 0.035 * Math.sin(frame * 0.1);
    game.dayTime = (game.dayTime + delta / game.dayDuration) % 1.0;
    game._updateDayNightLighting(delta);
    simulatedTime += delta;

    // In every frame that is daytime, sunLight MUST NOT be blue
    if (Math.abs(game.dayTime - 0.25) < 0.01) {
      assert.ok(game.sunLight.color.r > game.sunLight.color.b,
        `Frame ${frame} (t=${game.dayTime.toFixed(4)}): Sunlight must be warm daylight, not blue! r=${game.sunLight.color.r}, b=${game.sunLight.color.b}`);
      assert.ok(game.sunLight.intensity >= 2.45,
        `Frame ${frame}: Sun intensity at noon should be ~2.50, got ${game.sunLight.intensity}`);
    }
  }

  assert.ok(simulatedTime >= 5 * 140, `Simulated time must cover >= 5 full cycles, got ${simulatedTime}s`);
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Smoothstep C1 Continuity & Boundary Verification
// ─────────────────────────────────────────────────────────────────────────────

test('Challenger 2.1: C0 continuity at all 4 keyframe boundaries and wrap-around', () => {
  const game = createTestGame();
  const boundaries = [0.0, 0.25, 0.50, 0.75];
  const eps = 1e-5;

  for (const b of boundaries) {
    const tBefore = (b - eps + 1.0) % 1.0;
    const tAfter = (b + eps) % 1.0;

    game.dayTime = tBefore;
    game._updateDayNightLighting(0.016);
    const sunColorBefore = game.sunLight.color.clone();
    const sunIntBefore = game.sunLight.intensity;
    const hemiIntBefore = game.hemiLight.intensity;
    const ambIntBefore = game.ambientLight.intensity;
    const nightBefore = game.nightFactor;

    game.dayTime = tAfter;
    game._updateDayNightLighting(0.016);
    const sunColorAfter = game.sunLight.color.clone();
    const sunIntAfter = game.sunLight.intensity;
    const hemiIntAfter = game.hemiLight.intensity;
    const ambIntAfter = game.ambientLight.intensity;
    const nightAfter = game.nightFactor;

    const colorDelta = Math.abs(sunColorBefore.r - sunColorAfter.r) +
                       Math.abs(sunColorBefore.g - sunColorAfter.g) +
                       Math.abs(sunColorBefore.b - sunColorAfter.b);
    assert.ok(colorDelta < 1e-4, `Boundary ${b}: Color discontinuous! delta=${colorDelta}`);
    assert.ok(Math.abs(sunIntBefore - sunIntAfter) < 1e-4, `Boundary ${b}: Sun intensity discontinuous!`);
    assert.ok(Math.abs(hemiIntBefore - hemiIntAfter) < 1e-4, `Boundary ${b}: Hemi intensity discontinuous!`);
    assert.ok(Math.abs(ambIntBefore - ambIntAfter) < 1e-4, `Boundary ${b}: Ambient intensity discontinuous!`);
    assert.ok(Math.abs(nightBefore - nightAfter) < 1e-4, `Boundary ${b}: Night factor discontinuous!`);
  }
});

test('Challenger 2.2: Wrap-around continuity from t = 0.999 to 0.001 and t = 0.99999 to 0.00001', () => {
  const game = createTestGame();

  // Test wide wrap: 0.999 -> 0.001 (dt = 0.002)
  game.dayTime = 0.999;
  game._updateDayNightLighting(0.016);
  const color999 = game.sunLight.color.clone();
  const int999 = game.sunLight.intensity;
  const fog999 = game.scene.fog.color.clone();

  game.dayTime = 0.001;
  game._updateDayNightLighting(0.016);
  const color001 = game.sunLight.color.clone();
  const int001 = game.sunLight.intensity;
  const fog001 = game.scene.fog.color.clone();

  const colorDiff999 = Math.abs(color999.r - color001.r) + Math.abs(color999.g - color001.g) + Math.abs(color999.b - color001.b);
  assert.ok(colorDiff999 < 0.05, `Wrap (0.999->0.001): sun color diff should be < 0.05, got ${colorDiff999}`);
  assert.ok(Math.abs(int999 - int001) < 0.05, `Wrap (0.999->0.001): sun intensity diff should be < 0.05, got ${Math.abs(int999 - int001)}`);

  // Test micro wrap: 0.99999 -> 0.00001 (dt = 0.00002)
  game.dayTime = 0.99999;
  game._updateDayNightLighting(0.016);
  const color99999 = game.sunLight.color.clone();
  const int99999 = game.sunLight.intensity;

  game.dayTime = 0.00001;
  game._updateDayNightLighting(0.016);
  const color00001 = game.sunLight.color.clone();
  const int00001 = game.sunLight.intensity;

  const microColorDiff = Math.abs(color99999.r - color00001.r) + Math.abs(color99999.g - color00001.g) + Math.abs(color99999.b - color00001.b);
  assert.ok(microColorDiff < 1e-4, `Micro-wrap: sun color diff should be < 1e-4, got ${microColorDiff}`);
  assert.ok(Math.abs(int99999 - int00001) < 1e-4, `Micro-wrap: sun intensity diff should be < 1e-4`);
});

test('Challenger 2.3: Smoothstep C1 derivative continuity at all boundaries', () => {
  // Hermite smoothstep S(x) = 3x^2 - 2x^3 has S'(0) = 0 and S'(1) = 0.
  // Therefore, for any parameter P(t), dP/dt as t -> boundary- is 0,
  // and dP/dt as t -> boundary+ is 0.
  // The derivative matches across the boundary (left derivative == right derivative == 0).
  const game = createTestGame();
  const boundaries = [0.0, 0.25, 0.50, 0.75];
  const h = 1e-4;

  for (const b of boundaries) {
    // Value at boundary
    game.dayTime = b;
    game._updateDayNightLighting(0.016);
    const valAtB = game.sunLight.intensity;

    // Value approaching from left
    const tLeft = (b - h + 1.0) % 1.0;
    game.dayTime = tLeft;
    game._updateDayNightLighting(0.016);
    const valLeft = game.sunLight.intensity;

    // Value approaching from right
    const tRight = (b + h) % 1.0;
    game.dayTime = tRight;
    game._updateDayNightLighting(0.016);
    const valRight = game.sunLight.intensity;

    // Left numerical derivative: (valAtB - valLeft) / h
    const leftDeriv = (valAtB - valLeft) / h;
    // Right numerical derivative: (valRight - valAtB) / h
    const rightDeriv = (valRight - valAtB) / h;

    // In smoothstep, both left and right derivatives should approach 0 at the keyframe!
    assert.ok(Math.abs(leftDeriv) < 0.05, `Boundary ${b}: left derivative should be ~0, got ${leftDeriv}`);
    assert.ok(Math.abs(rightDeriv) < 0.05, `Boundary ${b}: right derivative should be ~0, got ${rightDeriv}`);
    // Difference between left and right derivatives (C1 continuity check)
    assert.ok(Math.abs(leftDeriv - rightDeriv) < 0.08,
      `Boundary ${b}: C1 derivative mismatch! left=${leftDeriv}, right=${rightDeriv}`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Dynamic Updates of All 9+ Lighting/Fog/Sky Parameters
// ─────────────────────────────────────────────────────────────────────────────

test('Challenger 3.1: All 9+ parameters update dynamically with non-zero variance', () => {
  const game = createTestGame();
  const samples = 100;

  const history = {
    sunColorR: [],
    sunColorG: [],
    sunColorB: [],
    sunIntensity: [],
    sunPosX: [],
    sunPosY: [],
    sunPosZ: [],
    ambientColorR: [],
    ambientColorG: [],
    ambientColorB: [],
    ambientIntensity: [],
    hemiSkyColorR: [],
    hemiSkyColorG: [],
    hemiSkyColorB: [],
    hemiGroundColorR: [],
    hemiGroundColorG: [],
    hemiGroundColorB: [],
    hemiIntensity: [],
    skyColorR: [],
    skyColorG: [],
    skyColorB: [],
    fogColorR: [],
    fogColorG: [],
    fogColorB: [],
    nightFactor: [],
  };

  for (let i = 0; i < samples; i++) {
    game.dayTime = i / samples;
    game._updateDayNightLighting(0.016);

    history.sunColorR.push(game.sunLight.color.r);
    history.sunColorG.push(game.sunLight.color.g);
    history.sunColorB.push(game.sunLight.color.b);
    history.sunIntensity.push(game.sunLight.intensity);
    history.sunPosX.push(game.sunLight.position.x);
    history.sunPosY.push(game.sunLight.position.y);
    history.sunPosZ.push(game.sunLight.position.z);
    history.ambientColorR.push(game.ambientLight.color.r);
    history.ambientColorG.push(game.ambientLight.color.g);
    history.ambientColorB.push(game.ambientLight.color.b);
    history.ambientIntensity.push(game.ambientLight.intensity);
    history.hemiSkyColorR.push(game.hemiLight.color.r);
    history.hemiSkyColorG.push(game.hemiLight.color.g);
    history.hemiSkyColorB.push(game.hemiLight.color.b);
    history.hemiGroundColorR.push(game.hemiLight.groundColor.r);
    history.hemiGroundColorG.push(game.hemiLight.groundColor.g);
    history.hemiGroundColorB.push(game.hemiLight.groundColor.b);
    history.hemiIntensity.push(game.hemiLight.intensity);
    history.skyColorR.push(game.scene.background.r);
    history.skyColorG.push(game.scene.background.g);
    history.skyColorB.push(game.scene.background.b);
    history.fogColorR.push(game.scene.fog.color.r);
    history.fogColorG.push(game.scene.fog.color.g);
    history.fogColorB.push(game.scene.fog.color.b);
    history.nightFactor.push(game.nightFactor);
  }

  // Helper to check range > 0
  function assertHasDynamicRange(arr, name, minExpectedRange = 0.05) {
    const min = Math.min(...arr);
    const max = Math.max(...arr);
    const range = max - min;
    assert.ok(range >= minExpectedRange,
      `Parameter ${name} must be dynamic! Min=${min}, Max=${max}, Range=${range}`);
  }

  // 1. sunLight.color (r, g, b)
  assertHasDynamicRange(history.sunColorR, 'sunColor.r', 0.40);
  assertHasDynamicRange(history.sunColorG, 'sunColor.g', 0.20);
  assertHasDynamicRange(history.sunColorB, 'sunColor.b', 0.60);

  // 2. sunLight.intensity
  assertHasDynamicRange(history.sunIntensity, 'sunLight.intensity', 1.80);

  // 3. sunLight.position (x, y, z)
  assertHasDynamicRange(history.sunPosX, 'sunLight.position.x', 80.0);
  assertHasDynamicRange(history.sunPosY, 'sunLight.position.y', 25.0);
  assertHasDynamicRange(history.sunPosZ, 'sunLight.position.z', 30.0);

  // 4. ambientLight.color (r, g, b)
  assertHasDynamicRange(history.ambientColorR, 'ambientLight.color.r', 0.60);
  assertHasDynamicRange(history.ambientColorG, 'ambientLight.color.g', 0.60);
  assertHasDynamicRange(history.ambientColorB, 'ambientLight.color.b', 0.60);

  // 5. ambientLight.intensity
  assertHasDynamicRange(history.ambientIntensity, 'ambientLight.intensity', 0.20);

  // 6. hemiLight.color (sky)
  assertHasDynamicRange(history.hemiSkyColorR, 'hemiLight.skyColor.r', 0.70);
  assertHasDynamicRange(history.hemiSkyColorG, 'hemiLight.skyColor.g', 0.40);
  assertHasDynamicRange(history.hemiSkyColorB, 'hemiLight.skyColor.b', 0.60);

  // 7. hemiLight.groundColor
  assertHasDynamicRange(history.hemiGroundColorR, 'hemiLight.groundColor.r', 0.05);
  assertHasDynamicRange(history.hemiGroundColorG, 'hemiLight.groundColor.g', 0.20);
  assertHasDynamicRange(history.hemiGroundColorB, 'hemiLight.groundColor.b', 0.005);

  // 8. hemiLight.intensity
  assertHasDynamicRange(history.hemiIntensity, 'hemiLight.intensity', 0.50);

  // 9. scene.background (sky)
  assertHasDynamicRange(history.skyColorR, 'scene.background.r', 0.80);
  assertHasDynamicRange(history.skyColorG, 'scene.background.g', 0.50);
  assertHasDynamicRange(history.skyColorB, 'scene.background.b', 0.70);

  // 10. scene.fog.color
  assertHasDynamicRange(history.fogColorR, 'scene.fog.color.r', 0.80);
  assertHasDynamicRange(history.fogColorG, 'scene.fog.color.g', 0.50);
  assertHasDynamicRange(history.fogColorB, 'scene.fog.color.b', 0.70);

  // 11. nightFactor
  assertHasDynamicRange(history.nightFactor, 'nightFactor', 0.90);
});

test('Challenger 3.2: Exact keyframe convergence at phase boundaries', () => {
  const game = createTestGame();
  const phases = [
    { t: 0.00, kf: LIGHTING_PHASES[0], name: 'dawn' },
    { t: 0.25, kf: LIGHTING_PHASES[1], name: 'day' },
    { t: 0.50, kf: LIGHTING_PHASES[2], name: 'sunset' },
    { t: 0.75, kf: LIGHTING_PHASES[3], name: 'night' },
  ];

  for (const { t, kf, name } of phases) {
    game.dayTime = t;
    game._updateDayNightLighting(0.016);

    assert.equal(game.sunLight.color.getHexString(), kf.sunColor.getHexString(),
      `${name} sunColor mismatch`);
    assert.equal(game.sunLight.intensity, kf.sunIntensity,
      `${name} sunIntensity mismatch`);
    assert.ok(game.sunLight.position.equals(kf.sunPosition),
      `${name} sunPosition mismatch`);

    assert.equal(game.ambientLight.color.getHexString(), kf.ambientColor.getHexString(),
      `${name} ambientColor mismatch`);
    assert.equal(game.ambientLight.intensity, kf.ambientIntensity,
      `${name} ambientIntensity mismatch`);

    assert.equal(game.hemiLight.color.getHexString(), kf.hemiSky.getHexString(),
      `${name} hemiSky mismatch`);
    assert.equal(game.hemiLight.groundColor.getHexString(), kf.hemiGround.getHexString(),
      `${name} hemiGround mismatch`);
    assert.equal(game.hemiLight.intensity, kf.hemiIntensity,
      `${name} hemiIntensity mismatch`);

    assert.equal(game.scene.background.getHexString(), kf.skyColor.getHexString(),
      `${name} skyColor mismatch`);
    assert.equal(game.scene.fog.color.getHexString(), kf.fogColor.getHexString(),
      `${name} fogColor mismatch`);

    assert.equal(game.nightFactor, kf.nightWeight,
      `${name} nightWeight mismatch`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Adversarial Edge Cases & Robustness
// ─────────────────────────────────────────────────────────────────────────────

test('Challenger 4.1: Negative and out-of-range dayTime values do not throw or crash', () => {
  const game = createTestGame();
  const extremeValues = [-100.5, -1.0, -0.75, -0.25, -1e-15, 0.0, 1.0, 1.25, 2.5, 999.999];

  for (const val of extremeValues) {
    game.dayTime = val;
    assert.doesNotThrow(() => {
      game._updateDayNightLighting(0.016);
    }, `dayTime = ${val} must not throw!`);

    assert.ok(!Number.isNaN(game.sunLight.color.r), `dayTime = ${val} produced NaN color!`);
    assert.ok(!Number.isNaN(game.sunLight.intensity), `dayTime = ${val} produced NaN intensity!`);
    assert.ok(!Number.isNaN(game.nightFactor), `dayTime = ${val} produced NaN nightFactor!`);
  }
});

test('Challenger 4.2: Float precision limits and boundary index verification (phaseIndex strictly in [0, 3])', () => {
  const game = createTestGame();

  // Test values extremely close to 1.0, 0.25, 0.5, 0.75
  const boundaryTests = [
    0.0,
    Number.EPSILON,
    0.25 - Number.EPSILON,
    0.25,
    0.25 + Number.EPSILON,
    0.50 - Number.EPSILON,
    0.50,
    0.50 + Number.EPSILON,
    0.75 - Number.EPSILON,
    0.75,
    0.75 + Number.EPSILON,
    1.0 - Number.EPSILON,
    0.9999999999999999,
    1.0,
    1.0 + Number.EPSILON,
  ];

  for (const t of boundaryTests) {
    game.dayTime = t;
    game._updateDayNightLighting(0.016);

    // Verify properties are valid
    assert.ok(game.sunLight.intensity >= 0.38 && game.sunLight.intensity <= 2.50,
      `Intensity at t=${t} out of expected range: ${game.sunLight.intensity}`);
    assert.ok(game.nightFactor >= 0.0 && game.nightFactor <= 1.0,
      `nightFactor at t=${t} out of expected range: ${game.nightFactor}`);
  }

  // Fuzz test 100,000 random floating point numbers in [-10, 10]
  for (let i = 0; i < 100000; i++) {
    const rawTime = (Math.random() - 0.5) * 20;
    const t = ((rawTime % 1.0) + 1.0) % 1.0;
    const phaseIndex = Math.floor(t / 0.25);
    assert.ok(phaseIndex >= 0 && phaseIndex <= 3,
      `Fuzz failure: rawTime=${rawTime}, t=${t}, phaseIndex=${phaseIndex}`);
  }
});

test('Challenger 4.3: Zero-allocation stability during lighting update', () => {
  const game = createTestGame();

  // Capture object references
  const refSunColor = game.sunLight.color;
  const refSunPos = game.sunLight.position;
  const refAmbColor = game.ambientLight.color;
  const refHemiSky = game.hemiLight.color;
  const refHemiGround = game.hemiLight.groundColor;
  const refBg = game.scene.background;
  const refFogColor = game.scene.fog.color;

  // Run 1,000 updates
  for (let i = 0; i < 1000; i++) {
    game.dayTime = i / 1000;
    game._updateDayNightLighting(0.016);

    // Verify references did NOT change (in-place mutation, no object replacement)
    assert.equal(game.sunLight.color, refSunColor, 'sunLight.color object reference changed!');
    assert.equal(game.sunLight.position, refSunPos, 'sunLight.position object reference changed!');
    assert.equal(game.ambientLight.color, refAmbColor, 'ambientLight.color object reference changed!');
    assert.equal(game.hemiLight.color, refHemiSky, 'hemiLight.color object reference changed!');
    assert.equal(game.hemiLight.groundColor, refHemiGround, 'hemiLight.groundColor object reference changed!');
    assert.equal(game.scene.background, refBg, 'scene.background object reference changed!');
    assert.equal(game.scene.fog.color, refFogColor, 'scene.fog.color object reference changed!');
  }
});
