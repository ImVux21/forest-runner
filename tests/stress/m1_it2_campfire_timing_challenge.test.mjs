// ===================================================
// m1_it2_campfire_timing_challenge.test.mjs
// Adversarial Challenger Test Suite: challenger_m1_it2_2
// Evaluates:
// 1. Frame 0 Campfire Particle Coordinates (0/35 flames & 0/30 smoke at origin, 100% at summit)
// 2. Elapsed time step across 900ms to 1100ms in tiny increments (zero rate jumps, zero 1000x accelerations)
// 3. Elapsed time step across 900s to 1100s boundary (confirm elimination of legacy heuristic jump)
// 4. Extreme delta stress (dt = 0.0s, dt = 1.0s, alternating extreme deltas)
// ===================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import '../helpers/headless_env.mjs';
import { AtmosphereManager } from '../../src/game/AtmosphereManager.js';

class MockWorld {
  getGroundHeight(x, z) {
    if (x > 7 && x < 29 && z > 12 && z < 32) return 7.0; // Peak Summit
    if (x > -28 && x < 4 && z > 5 && z < 31) return 3.5; // Mushroom Grove
    return 0.0;
  }
}

function assertValidMatrices(mesh, label) {
  const count = mesh.count;
  const mat = new THREE.Matrix4();
  const pos = new THREE.Vector3();
  const rot = new THREE.Quaternion();
  const scale = new THREE.Vector3();

  for (let i = 0; i < count; i++) {
    mesh.getMatrixAt(i, mat);
    for (let e = 0; e < 16; e++) {
      assert.ok(
        Number.isFinite(mat.elements[e]),
        `${label} instance ${i} element ${e} is not finite: ${mat.elements[e]}`
      );
    }
    const det = mat.determinant();
    assert.ok(
      Number.isFinite(det) && det > 0,
      `${label} instance ${i} determinant is non-positive or not finite: ${det}`
    );
    mat.decompose(pos, rot, scale);
    assert.ok(
      scale.x > 0 && scale.y > 0 && scale.z > 0,
      `${label} instance ${i} has non-positive scale: (${scale.x}, ${scale.y}, ${scale.z})`
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Part 1: Frame 0 Campfire Particle Coordinates
// ─────────────────────────────────────────────────────────────────────────────

test('CHALLENGE 1.1: Frame 0 cold-start data arrays — 0/35 flames & 0/30 smoke at (0,0,0), 100% at summit peak (20,7,22)', async () => {
  const scene = new THREE.Scene();
  const world = new MockWorld();
  const atmo = new AtmosphereManager(scene, world);
  await atmo.init();

  // Inspect raw flameData immediately after init() before any update()
  assert.equal(atmo.flameData.length, 35, 'Must contain exactly 35 flame particles');
  assert.equal(atmo.smokeData.length, 30, 'Must contain exactly 30 smoke particles');

  let flamesNearOrigin = 0;
  let flamesAtSummit = 0;
  for (let i = 0; i < atmo.flameData.length; i++) {
    const f = atmo.flameData[i];
    const distToOrigin = Math.hypot(f.x, f.z, f.y);
    const distToSummitHorizontal = Math.hypot(f.x - 20.0, f.z - 22.0);

    if (distToOrigin < 5.0) flamesNearOrigin++;
    if (distToSummitHorizontal <= 0.5 && f.y >= 7.0 && f.y <= 10.0) flamesAtSummit++;
  }

  assert.equal(
    flamesNearOrigin,
    0,
    `CRITICAL: Expected 0/35 flames near origin (0, 0, 0), but found ${flamesNearOrigin}`
  );
  assert.equal(
    flamesAtSummit,
    35,
    `CRITICAL: Expected 35/35 (100%) flames at summit peak (20, 7, 22), but found ${flamesAtSummit}`
  );

  let smokeNearOrigin = 0;
  let smokeAtSummit = 0;
  for (let i = 0; i < atmo.smokeData.length; i++) {
    const s = atmo.smokeData[i];
    const distToOrigin = Math.hypot(s.x, s.z, s.y);
    const distToSummitHorizontal = Math.hypot(s.x - 20.0, s.z - 22.0);

    if (distToOrigin < 5.0) smokeNearOrigin++;
    if (distToSummitHorizontal <= 0.5 && s.y >= 7.5 && s.y <= 14.0) smokeAtSummit++;
  }

  assert.equal(
    smokeNearOrigin,
    0,
    `CRITICAL: Expected 0/30 smoke puffs near origin (0, 0, 0), but found ${smokeNearOrigin}`
  );
  assert.equal(
    smokeAtSummit,
    30,
    `CRITICAL: Expected 30/30 (100%) smoke puffs at summit peak (20, 7, 22), but found ${smokeAtSummit}`
  );
});

test('CHALLENGE 1.2: Frame 0 InstancedMesh instanceMatrix buffers — 0/35 flames & 0/30 smoke at origin, 100% at summit peak', async () => {
  const scene = new THREE.Scene();
  const world = new MockWorld();
  const atmo = new AtmosphereManager(scene, world);
  await atmo.init();

  const mat = new THREE.Matrix4();
  const pos = new THREE.Vector3();
  const rot = new THREE.Quaternion();
  const scale = new THREE.Vector3();

  // Validate flames InstancedMesh directly from GPU instance matrices on Frame 0
  const fMesh = atmo.particles.flames;
  assert.ok(fMesh, 'Flames InstancedMesh must exist on Frame 0');
  assert.equal(fMesh.count, 35, 'Flames mesh count must be 35');
  assertValidMatrices(fMesh, 'Frame 0 flames');

  let flamesMeshNearOrigin = 0;
  let flamesMeshAtSummit = 0;

  for (let i = 0; i < fMesh.count; i++) {
    fMesh.getMatrixAt(i, mat);
    mat.decompose(pos, rot, scale);

    const distToOrigin = Math.hypot(pos.x, pos.y, pos.z);
    const distToSummitH = Math.hypot(pos.x - 20.0, pos.z - 22.0);

    if (distToOrigin < 5.0) flamesMeshNearOrigin++;
    if (distToSummitH <= 0.5 && pos.y >= 7.0 && pos.y <= 10.0) flamesMeshAtSummit++;
  }

  assert.equal(
    flamesMeshNearOrigin,
    0,
    `CRITICAL: Expected 0/35 flame mesh instances near origin, but found ${flamesMeshNearOrigin}`
  );
  assert.equal(
    flamesMeshAtSummit,
    35,
    `CRITICAL: Expected 35/35 (100%) flame mesh instances at summit peak, but found ${flamesMeshAtSummit}`
  );

  // Validate smoke InstancedMesh directly from GPU instance matrices on Frame 0
  const sMesh = atmo.particles.smoke;
  assert.ok(sMesh, 'Smoke InstancedMesh must exist on Frame 0');
  assert.equal(sMesh.count, 30, 'Smoke mesh count must be 30');
  assertValidMatrices(sMesh, 'Frame 0 smoke');

  let smokeMeshNearOrigin = 0;
  let smokeMeshAtSummit = 0;

  for (let i = 0; i < sMesh.count; i++) {
    sMesh.getMatrixAt(i, mat);
    mat.decompose(pos, rot, scale);

    const distToOrigin = Math.hypot(pos.x, pos.y, pos.z);
    const distToSummitH = Math.hypot(pos.x - 20.0, pos.z - 22.0);

    if (distToOrigin < 5.0) smokeMeshNearOrigin++;
    if (distToSummitH <= 0.5 && pos.y >= 7.5 && pos.y <= 14.0) smokeMeshAtSummit++;
  }

  assert.equal(
    smokeMeshNearOrigin,
    0,
    `CRITICAL: Expected 0/30 smoke mesh instances near origin, but found ${smokeMeshNearOrigin}`
  );
  assert.equal(
    smokeMeshAtSummit,
    30,
    `CRITICAL: Expected 30/30 (100%) smoke mesh instances at summit peak, but found ${smokeMeshAtSummit}`
  );
});

test('CHALLENGE 1.3: Frame 0 first update step (dt = 0.0001s) preserves 0 at origin, 100% at summit', async () => {
  const scene = new THREE.Scene();
  const world = new MockWorld();
  const atmo = new AtmosphereManager(scene, world);
  await atmo.init();

  // First simulation update call
  atmo.update(0.0001, 0.0001, 0.5);

  const mat = new THREE.Matrix4();
  const pos = new THREE.Vector3();

  // Flame positions
  for (let i = 0; i < atmo.particles.flames.count; i++) {
    atmo.particles.flames.getMatrixAt(i, mat);
    pos.setFromMatrixPosition(mat);
    const distToSummit = Math.hypot(pos.x - 20.0, pos.z - 22.0);
    const distToOrigin = Math.hypot(pos.x, pos.z);
    assert.ok(distToSummit < 1.0, `Flame ${i} must remain at summit: dist=${distToSummit}`);
    assert.ok(distToOrigin > 25.0, `Flame ${i} must not be near origin: dist=${distToOrigin}`);
  }

  // Smoke positions
  for (let i = 0; i < atmo.particles.smoke.count; i++) {
    atmo.particles.smoke.getMatrixAt(i, mat);
    pos.setFromMatrixPosition(mat);
    const distToSummit = Math.hypot(pos.x - 20.0, pos.z - 22.0);
    const distToOrigin = Math.hypot(pos.x, pos.z);
    assert.ok(distToSummit < 1.0, `Smoke ${i} must remain at summit: dist=${distToSummit}`);
    assert.ok(distToOrigin > 25.0, `Smoke ${i} must not be near origin: dist=${distToOrigin}`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Part 2: Step through elapsed time across 900ms to 1100ms in tiny increments
// ─────────────────────────────────────────────────────────────────────────────

test('CHALLENGE 2.1: Stepping elapsed time across 900ms to 1100ms (0.900s to 1.100s) in 0.001s increments asserts zero rate jumps or 1000x accelerations', async () => {
  const scene = new THREE.Scene();
  const world = new MockWorld();
  const atmo = new AtmosphereManager(scene, world);
  await atmo.init();

  const campfire = atmo.pointLights.find(p => p.config.id === 'summit_campfire');
  assert.ok(campfire, 'Summit campfire light must exist');

  const stepDt = 0.001; // 1 millisecond
  const startSec = 0.900;
  const endSec = 1.100;

  let prevIntensity = null;
  let maxIntensityRate = 0.0; // dI/dt (intensity change per second)
  let maxIntensityDelta = 0.0; // single step delta

  // Also track firefly position rates to verify particle motion smoothness
  const fireflyMesh = atmo.particles.fireflies;
  const mat = new THREE.Matrix4();
  const curPos = new THREE.Vector3();
  let prevFirefly0Pos = null;
  let maxFireflyVelocity = 0.0; // dx/dt

  for (let t = startSec; t <= endSec + 0.0001; t += stepDt) {
    atmo.update(stepDt, t, 0.75); // Night time (nightFactor = 1.0)

    const curIntensity = campfire.light.intensity;
    if (prevIntensity !== null) {
      const deltaI = Math.abs(curIntensity - prevIntensity);
      const rateI = deltaI / stepDt; // Rate of change in intensity per second

      if (deltaI > maxIntensityDelta) maxIntensityDelta = deltaI;
      if (rateI > maxIntensityRate) maxIntensityRate = rateI;

      // Assert continuous rate: analytical max derivative of campfire flicker is ~3.34/s
      // If there were a rate jump or 1000x acceleration, rateI would exceed 100/s
      assert.ok(
        rateI < 10.0,
        `Campfire intensity rate jump detected at t=${t.toFixed(4)}s: rate was ${rateI.toFixed(2)}/s (delta=${deltaI.toFixed(6)})`
      );
    }
    prevIntensity = curIntensity;

    // Check firefly position rate
    fireflyMesh.getMatrixAt(0, mat);
    curPos.setFromMatrixPosition(mat);
    if (prevFirefly0Pos !== null) {
      const disp = curPos.distanceTo(prevFirefly0Pos);
      const vel = disp / stepDt;
      if (vel > maxFireflyVelocity) maxFireflyVelocity = vel;

      // Analytical max firefly velocity is ~6.4 m/s. If 1000x acceleration happened, vel would be > 1000 m/s!
      assert.ok(
        vel < 15.0,
        `Firefly 1000x acceleration detected at t=${t.toFixed(4)}s: velocity was ${vel.toFixed(2)} m/s (disp=${disp.toFixed(6)})`
      );
    }
    prevFirefly0Pos = curPos.clone();
  }

  // Summary assertions across the entire 900ms to 1100ms interval
  assert.ok(
    maxIntensityDelta < 0.01,
    `Max single-step intensity delta across 900-1100ms must be < 0.01, got ${maxIntensityDelta.toFixed(6)}`
  );
  assert.ok(
    maxIntensityRate < 5.0,
    `Max intensity rate across 900-1100ms must be < 5.0/s, got ${maxIntensityRate.toFixed(2)}/s`
  );
  assert.ok(
    maxFireflyVelocity < 10.0,
    `Max firefly velocity across 900-1100ms must be < 10.0 m/s, got ${maxFireflyVelocity.toFixed(2)} m/s`
  );
});

test('CHALLENGE 2.2: Ultra-fine 0.0001s (100 microseconds) stepping across 1000ms boundary (0.995s to 1.005s)', async () => {
  const scene = new THREE.Scene();
  const world = new MockWorld();
  const atmo = new AtmosphereManager(scene, world);
  await atmo.init();

  const campfire = atmo.pointLights.find(p => p.config.id === 'summit_campfire');
  const stepDt = 0.0001; // 0.1ms
  let prevIntensity = null;
  let maxRate = 0.0;

  for (let t = 0.995; t <= 1.005; t += stepDt) {
    atmo.update(stepDt, t, 0.75);
    const curI = campfire.light.intensity;
    if (prevIntensity !== null) {
      const delta = Math.abs(curI - prevIntensity);
      const rate = delta / stepDt;
      if (rate > maxRate) maxRate = rate;

      assert.ok(
        delta < 0.001,
        `Ultra-fine step jump at t=${t.toFixed(5)}s: delta was ${delta.toFixed(6)}`
      );
      assert.ok(
        rate < 5.0,
        `Ultra-fine rate jump at t=${t.toFixed(5)}s: rate was ${rate.toFixed(2)}/s`
      );
    }
    prevIntensity = curI;
  }

  assert.ok(maxRate < 4.0, `Max flicker rate across 1.0s boundary must be < 4.0/s, got ${maxRate.toFixed(2)}/s`);
});

test('CHALLENGE 2.3: Stepping elapsed across 900s to 1100s (confirm elimination of legacy elapsed>1000 heuristic)', async () => {
  const scene = new THREE.Scene();
  const world = new MockWorld();
  const atmo = new AtmosphereManager(scene, world);
  await atmo.init();

  const campfire = atmo.pointLights.find(p => p.config.id === 'summit_campfire');

  // In the legacy buggy code, passing elapsed = 1000.0 collapsed tSec to 1.0 (a 1000x backward jump)
  // We test t from 999.0s to 1001.0s in 0.01s steps
  const stepDt = 0.01;
  let prevIntensity = null;
  let maxDeltaAcross1000 = 0.0;

  for (let t = 999.0; t <= 1001.0; t += stepDt) {
    atmo.update(stepDt, t, 0.75);
    const curI = campfire.light.intensity;

    if (prevIntensity !== null) {
      const delta = Math.abs(curI - prevIntensity);
      if (delta > maxDeltaAcross1000) maxDeltaAcross1000 = delta;

      assert.ok(
        delta < 0.05,
        `Legacy heuristic jump detected at t=${t.toFixed(3)}s! Delta was ${delta.toFixed(4)}`
      );
    }
    prevIntensity = curI;
  }

  assert.ok(
    maxDeltaAcross1000 < 0.05,
    `Flicker across 1000s boundary must be smooth (< 0.05 per 10ms), got ${maxDeltaAcross1000.toFixed(4)}`
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Part 3: Extreme Deltas Stress Testing (dt = 1.0s, dt = 0.0s)
// ─────────────────────────────────────────────────────────────────────────────

test('CHALLENGE 3.1: Extreme delta dt = 0.0s (pause/freeze frames) — zero NaN, valid matrices, zero drift', async () => {
  const scene = new THREE.Scene();
  const world = new MockWorld();
  const atmo = new AtmosphereManager(scene, world);
  await atmo.init();

  // Run 100 iterations of dt = 0.0s
  for (let i = 0; i < 100; i++) {
    atmo.update(0.0, 50.0, 0.5);
  }

  // Validate all 5 particle systems
  assertValidMatrices(atmo.particles.leaves, 'leaves (dt=0.0)');
  assertValidMatrices(atmo.particles.spores, 'spores (dt=0.0)');
  assertValidMatrices(atmo.particles.flames, 'flames (dt=0.0)');
  assertValidMatrices(atmo.particles.smoke, 'smoke (dt=0.0)');
  assertValidMatrices(atmo.particles.fireflies, 'fireflies (dt=0.0)');

  // Verify internal accumulator did NOT drift during dt = 0
  assert.equal(atmo.elapsedTime, 0.0, 'Internal elapsedTime must remain 0.0 when dt=0.0');

  // Verify point lights finite and non-negative
  for (const pl of atmo.pointLights) {
    assert.ok(Number.isFinite(pl.light.intensity), `Light ${pl.config.id} intensity is not finite`);
    assert.ok(pl.light.intensity >= 0, `Light ${pl.config.id} intensity is negative: ${pl.light.intensity}`);
  }
});

test('CHALLENGE 3.2: Extreme delta dt = 1.0s (severe hitching) — zero NaNs, valid matrices, campfire confinement', async () => {
  const scene = new THREE.Scene();
  const world = new MockWorld();
  const atmo = new AtmosphereManager(scene, world);
  await atmo.init();

  // Run 50 iterations of dt = 1.0s (each frame advances 1 whole second)
  for (let i = 0; i < 50; i++) {
    atmo.update(1.0, (i + 1) * 1.0, 0.75);

    // Assert all particle buffers remain valid after each 1-second leap
    assertValidMatrices(atmo.particles.leaves, `leaves (dt=1.0 step ${i})`);
    assertValidMatrices(atmo.particles.spores, `spores (dt=1.0 step ${i})`);
    assertValidMatrices(atmo.particles.flames, `flames (dt=1.0 step ${i})`);
    assertValidMatrices(atmo.particles.smoke, `smoke (dt=1.0 step ${i})`);
    assertValidMatrices(atmo.particles.fireflies, `fireflies (dt=1.0 step ${i})`);

    // Verify flames never escape to origin despite massive delta
    for (let f = 0; f < atmo.flameData.length; f++) {
      const flame = atmo.flameData[f];
      const distToSummit = Math.hypot(flame.x - 20.0, flame.z - 22.0);
      assert.ok(
        distToSummit < 3.0,
        `Step ${i}: Flame ${f} escaped summit campfire! Pos: (${flame.x}, ${flame.y}, ${flame.z})`
      );
    }
  }

  // Final bounding box check for campfire flames under dt=1.0 stress
  atmo.particles.flames.computeBoundingBox();
  const fb = atmo.particles.flames.boundingBox;
  assert.ok(fb.min.x >= 18.0 && fb.max.x <= 22.0, `Flames X bounds [${fb.min.x}, ${fb.max.x}]`);
  assert.ok(fb.min.z >= 20.0 && fb.max.z <= 24.0, `Flames Z bounds [${fb.min.z}, ${fb.max.z}]`);
  assert.ok(fb.min.y >= 6.5 && fb.max.y <= 12.0, `Flames Y bounds [${fb.min.y}, ${fb.max.y}]`);
});

test('CHALLENGE 3.3: Alternating extreme deltas (0.0s <-> 1.0s <-> 0.001s <-> 1.0s)', async () => {
  const scene = new THREE.Scene();
  const world = new MockWorld();
  const atmo = new AtmosphereManager(scene, world);
  await atmo.init();

  const extremeSequence = [0.0, 1.0, 0.0, 1.0, 0.0001, 1.0, 0.016, 1.0, 0.0];
  let elapsed = 0.0;

  for (let cycle = 0; cycle < 15; cycle++) {
    for (const dt of extremeSequence) {
      elapsed += dt;
      atmo.update(dt, elapsed, 0.5);

      // Verify no NaNs or degeneracies
      assertValidMatrices(atmo.particles.flames, `flames cycle ${cycle} dt=${dt}`);
      assertValidMatrices(atmo.particles.smoke, `smoke cycle ${cycle} dt=${dt}`);
    }
  }

  // Verify all flames strictly at summit
  for (let i = 0; i < atmo.flameData.length; i++) {
    const f = atmo.flameData[i];
    const distToSummit = Math.hypot(f.x - 20.0, f.z - 22.0);
    assert.ok(distToSummit < 3.0, `Flame ${i} drifted away from summit: ${distToSummit}`);
  }
});
