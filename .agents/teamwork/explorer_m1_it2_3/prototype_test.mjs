// ===================================================
// prototype_test.mjs — Prototype Verification for f06_atmosphere_remediation
// In explorer_m1_it2_3 folder for read-only validation
// ===================================================
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import '../../../tests/helpers/headless_env.mjs';
import { AtmosphereManager } from '../../../src/game/AtmosphereManager.js';

class MockWorld {
  getGroundHeight(x, z) {
    if (x > 7 && x < 29 && z > 12 && z < 32) return 7.0; // Peak Summit
    if (x > -28 && x < 4 && z > 5 && z < 31) return 3.5; // Mushroom Grove
    return 0.0;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Cloud Color Continuity (Max Delta < 0.05 Across Full Day/Night Cycle)
// ─────────────────────────────────────────────────────────────────────────────

test('Cloud Color: Continuous interpolation with max delta < 0.05 across full 1,000-step cycle', async () => {
  const scene = new THREE.Scene();
  const world = new MockWorld();
  const atmo = new AtmosphereManager(scene, world);
  await atmo.init();

  const steps = 1000;
  let prevColor = null;
  let maxDelta = 0.0;
  let maxDeltaAt = 0.0;

  for (let i = 0; i <= steps; i++) {
    const dayTime = (i / steps) % 1.0;
    atmo.update(0.016, i * 0.016, dayTime);
    const curColor = atmo.materials.cloud.color.clone();

    if (prevColor) {
      const delta =
        Math.abs(curColor.r - prevColor.r) +
        Math.abs(curColor.g - prevColor.g) +
        Math.abs(curColor.b - prevColor.b);

      if (delta > maxDelta) {
        maxDelta = delta;
        maxDeltaAt = dayTime;
      }
    }
    prevColor = curColor;
  }

  console.log(`[Diagnostic] Max cloud color delta observed: ${maxDelta.toFixed(4)} at dayTime=${maxDeltaAt.toFixed(4)}`);
  assert.ok(
    maxDelta < 0.05,
    `Cloud color delta must stay < 0.05 across all steps, but found jump of ${maxDelta.toFixed(4)} at dayTime=${maxDeltaAt.toFixed(4)}`
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Campfire Particles Initial Positions (Strictly at Peak 20, 7, 22)
// ─────────────────────────────────────────────────────────────────────────────

test('Campfire Particles: Initial positions strictly localized to Peak Summit (20, 7, 22)', async () => {
  const scene = new THREE.Scene();
  const world = new MockWorld();
  const atmo = new AtmosphereManager(scene, world);
  await atmo.init();

  // 1. Check data arrays immediately after init()
  let originFlames = 0;
  let summitFlames = 0;
  for (const f of atmo.flameData) {
    const distToOrigin = Math.hypot(f.x, f.z);
    const distToSummit = Math.hypot(f.x - 20.0, f.z - 22.0);
    if (distToOrigin < 5.0) originFlames++;
    if (distToSummit < 3.0 && Math.abs(f.y - 7.0) < 3.0) summitFlames++;
  }

  let originSmoke = 0;
  let summitSmoke = 0;
  for (const s of atmo.smokeData) {
    const distToOrigin = Math.hypot(s.x, s.z);
    const distToSummit = Math.hypot(s.x - 20.0, s.z - 22.0);
    if (distToOrigin < 5.0) originSmoke++;
    if (distToSummit < 4.0 && s.y >= 6.5) summitSmoke++;
  }

  console.log(`[Diagnostic] Initial Flames: ${summitFlames}/35 at summit, ${originFlames}/35 near origin`);
  console.log(`[Diagnostic] Initial Smoke: ${summitSmoke}/30 at summit, ${originSmoke}/30 near origin`);

  assert.equal(originFlames, 0, 'Zero flame particles may initialize near origin (0, 0, 0)');
  assert.equal(originSmoke, 0, 'Zero smoke particles may initialize near origin (0, 0, 0)');
  assert.equal(summitFlames, 35, 'All 35 flame particles must initialize at summit (20, 7, 22)');
  assert.equal(summitSmoke, 30, 'All 30 smoke particles must initialize at summit (20, 7, 22)');
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Timing Continuity & Unit Conversion (No 1000x Inversion)
// ─────────────────────────────────────────────────────────────────────────────

test('Timing Continuity: Millisecond inputs must scale smoothly to seconds without 1000x inversion', async () => {
  const scene = new THREE.Scene();
  const world = new MockWorld();
  const atmo = new AtmosphereManager(scene, world);
  await atmo.init();

  // Test leaf sway rate between 500ms and 516ms (16ms elapsed):
  // If elapsed = 500ms is treated as 500s and 516ms as 516s,
  // the position change in 1 frame will be driven by 16 seconds of time advance!
  // At normal 0.016s delta, displacement is tiny: swaySpeed * delta * amp < 0.05.
  // Under the bug: at 999ms vs 1001ms, leaf position experiences a sudden phase reversal.
  
  // Test point lights across 100 steps from elapsed = 950ms to 1050ms
  const campfire = atmo.pointLights.find(p => p.config.id === 'summit_campfire');
  let prevIntensity = null;
  let maxStepDelta = 0.0;
  let maxStepAt = 0.0;

  for (let ms = 950; ms <= 1050; ms += 2) {
    atmo.update(0.002, ms, 0.75); // Night
    const curIntensity = campfire.light.intensity;
    if (prevIntensity !== null) {
      const stepDelta = Math.abs(curIntensity - prevIntensity);
      if (stepDelta > maxStepDelta) {
        maxStepDelta = stepDelta;
        maxStepAt = ms;
      }
    }
    prevIntensity = curIntensity;
  }

  console.log(`[Diagnostic] Max flicker intensity step across [950ms, 1050ms]: ${maxStepDelta.toFixed(4)} at ms=${maxStepAt}`);

  // In smooth physical simulation with delta = 0.002s, max intensity change per 2ms step is < 0.05.
  // Under the 1000ms jump, the phase dislocation causes an abrupt jump.
  assert.ok(
    maxStepDelta < 0.05,
    `Flicker intensity step must be smooth (< 0.05 per 2ms), but found jump of ${maxStepDelta.toFixed(4)} at ${maxStepAt}ms`
  );
});
