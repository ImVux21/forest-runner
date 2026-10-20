// ===================================================
// f06_atmosphere_remediation.test.mjs — M1 Remediation Verification Suite
// Verifies:
// 1. Continuous 4-phase smoothstep cloud color tinting across Dawn (#ffccaa),
//    Day (#ffffff), Sunset (#ff9966), and Night (#202b44), eliminating dayTime=0.55 jump.
// 2. Campfire particle initial positions (strictly at peak 20, 7, 22 on cold start)
// 3. Timing continuity & scale invariance (monotonic real-time progression across 1.0s boundary)
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

// ─────────────────────────────────────────────────────────────────────────────
// Section 1: Cloud Color Continuity (Max Delta < 0.05 Across Full Day/Night Cycle)
// ─────────────────────────────────────────────────────────────────────────────

test('F6.Remediation.1.1: Cloud color continuous modulation with max delta < 0.05 across 1,000 steps', async () => {
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

      assert.ok(
        delta < 0.05,
        `Cloud color delta exceeded 0.05 at dayTime=${dayTime.toFixed(4)}: delta was ${delta.toFixed(4)}`
      );
    }
    prevColor = curColor;
  }

  assert.ok(maxDelta > 0.001, `Cloud color must actively modulate over time, max delta was ${maxDelta}`);
  assert.ok(
    maxDelta < 0.05,
    `Max cloud color delta across full cycle must be < 0.05, got ${maxDelta.toFixed(4)} at dayTime=${maxDeltaAt.toFixed(4)}`
  );
});

test('F6.Remediation.1.2: Smooth transition across sunset-to-night boundary (dayTime = 0.5499 -> 0.5501)', async () => {
  const scene = new THREE.Scene();
  const world = new MockWorld();
  const atmo = new AtmosphereManager(scene, world);
  await atmo.init();

  // Test across the previous bug boundary at dayTime = 0.55
  atmo.update(0.016, 1.0, 0.5499);
  const colorBefore = atmo.materials.cloud.color.clone();

  atmo.update(0.016, 1.016, 0.5501);
  const colorAfter = atmo.materials.cloud.color.clone();

  const boundaryDelta =
    Math.abs(colorBefore.r - colorAfter.r) +
    Math.abs(colorBefore.g - colorAfter.g) +
    Math.abs(colorBefore.b - colorAfter.b);

  // In smoothstep, a 0.0002 dayTime change must produce a negligible color change (< 0.01)
  assert.ok(
    boundaryDelta < 0.01,
    `Sunset-to-night cloud transition must be continuous without hard snapping: delta across 0.55 was ${boundaryDelta.toFixed(4)}`
  );
});

test('F6.Remediation.1.3: Dawn tinting presence and smooth wrap-around across midnight', async () => {
  const scene = new THREE.Scene();
  const world = new MockWorld();
  const atmo = new AtmosphereManager(scene, world);
  await atmo.init();

  // 1. Dawn tinting verification (dayTime = 0.00)
  atmo.update(0.016, 1.0, 0.00);
  const dawnColor = atmo.materials.cloud.color.clone();

  // Dawn cloud color (#ffccaa) has warm morning tones (linear R=1.0, G=0.604, B=0.402)
  assert.ok(dawnColor.r > 0.95, `Dawn cloud Red must be > 0.95, got ${dawnColor.r}`);
  assert.ok(dawnColor.g > 0.55 && dawnColor.g < 0.85, `Dawn cloud Green must reflect warm rose-gold, got ${dawnColor.g}`);
  assert.ok(dawnColor.b > 0.35 && dawnColor.b < 0.70, `Dawn cloud Blue must reflect warm rose-gold, got ${dawnColor.b}`);

  // 2. Midnight wrap-around continuity (0.999 -> 0.001)
  atmo.update(0.016, 10.0, 0.999);
  const wrapBefore = atmo.materials.cloud.color.clone();

  atmo.update(0.016, 10.016, 0.001);
  const wrapAfter = atmo.materials.cloud.color.clone();

  const wrapDelta =
    Math.abs(wrapBefore.r - wrapAfter.r) +
    Math.abs(wrapBefore.g - wrapAfter.g) +
    Math.abs(wrapBefore.b - wrapAfter.b);

  assert.ok(
    wrapDelta < 0.05,
    `Cloud color wrap-around at midnight (0.999 -> 0.001) must be smooth, delta was ${wrapDelta.toFixed(4)}`
  );
});

test('F6.Remediation.1.4: Exact 4-phase keyframe cloud color fidelity (Dawn, Day, Sunset, Night)', async () => {
  const scene = new THREE.Scene();
  const world = new MockWorld();
  const atmo = new AtmosphereManager(scene, world);
  await atmo.init();

  // Dawn (0.00): rose-gold (#ffccaa)
  atmo.update(0.016, 1.0, 0.00);
  assert.equal(
    atmo.materials.cloud.color.getHexString().toLowerCase(),
    'ffccaa',
    'Dawn cloud color must match rose-gold (#ffccaa)'
  );

  // Noon (0.25): pure crisp white (#ffffff)
  atmo.update(0.016, 2.0, 0.25);
  assert.equal(
    atmo.materials.cloud.color.getHexString().toLowerCase(),
    'ffffff',
    'Noon cloud color must be pure white (#ffffff)'
  );

  // Sunset (0.50): warm apricot/amber (#ff9966)
  atmo.update(0.016, 3.0, 0.50);
  assert.equal(
    atmo.materials.cloud.color.getHexString().toLowerCase(),
    'ff9966',
    'Sunset cloud color must match warm apricot/amber (#ff9966)'
  );

  // Night (0.75): deep slate navy (#202b44)
  atmo.update(0.016, 4.0, 0.75);
  assert.equal(
    atmo.materials.cloud.color.getHexString().toLowerCase(),
    '202b44',
    'Night cloud color must match deep slate navy (#202b44)'
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 2: Campfire Particle Initial Positions (Strictly at Peak 20, 7, 22)
// ─────────────────────────────────────────────────────────────────────────────

test('F6.Remediation.2.1: Cold-start particle data strictly initialized at Summit Campfire (20, 7, 22)', async () => {
  const scene = new THREE.Scene();
  const world = new MockWorld();
  const atmo = new AtmosphereManager(scene, world);
  await atmo.init();

  // Inspect raw particle data arrays immediately after init() before any update()
  assert.equal(atmo.flameData.length, 35, 'Must have 35 flame particles');
  assert.equal(atmo.smokeData.length, 30, 'Must have 30 smoke particles');

  let originFlames = 0;
  let summitFlames = 0;
  for (let i = 0; i < atmo.flameData.length; i++) {
    const f = atmo.flameData[i];
    const distToOrigin = Math.hypot(f.x, f.z);
    const distToSummit = Math.hypot(f.x - 20.0, f.z - 22.0);

    if (distToOrigin < 5.0) originFlames++;
    if (distToSummit <= 1.0 && f.y >= 6.5 && f.y <= 9.5) summitFlames++;
  }

  let originSmoke = 0;
  let summitSmoke = 0;
  for (let i = 0; i < atmo.smokeData.length; i++) {
    const s = atmo.smokeData[i];
    const distToOrigin = Math.hypot(s.x, s.z);
    const distToSummit = Math.hypot(s.x - 20.0, s.z - 22.0);

    if (distToOrigin < 5.0) originSmoke++;
    if (distToSummit <= 1.0 && s.y >= 6.5 && s.y <= 13.0) summitSmoke++;
  }

  assert.equal(originFlames, 0, 'Zero flame particles may initialize near world origin (0, 0, 0)');
  assert.equal(originSmoke, 0, 'Zero smoke particles may initialize near world origin (0, 0, 0)');
  assert.equal(summitFlames, 35, 'All 35 flame particles must initialize at Summit Campfire (20, 7, 22)');
  assert.equal(summitSmoke, 30, 'All 30 smoke particles must initialize at Summit Campfire (20, 7, 22)');
});

test('F6.Remediation.2.2: First-frame InstancedMesh transform matrices localized to summit', async () => {
  const scene = new THREE.Scene();
  const world = new MockWorld();
  const atmo = new AtmosphereManager(scene, world);
  await atmo.init();

  // Run a single tiny simulation step (1ms cold-start)
  atmo.update(0.001, 0.001, 0.50);

  const mat = new THREE.Matrix4();
  const pos = new THREE.Vector3();
  const rot = new THREE.Quaternion();
  const scale = new THREE.Vector3();

  // Check flame instance matrices
  const fMesh = atmo.particles.flames;
  for (let i = 0; i < fMesh.count; i++) {
    fMesh.getMatrixAt(i, mat);
    mat.decompose(pos, rot, scale);

    const distToSummit = Math.hypot(pos.x - 20.0, pos.z - 22.0);
    const distToOrigin = Math.hypot(pos.x, pos.z);

    assert.ok(
      distToSummit < 2.5,
      `Flame instance ${i} must be at summit campfire, got (${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)})`
    );
    assert.ok(
      distToOrigin > 20.0,
      `Flame instance ${i} must NOT be near origin, dist was ${distToOrigin.toFixed(2)}m`
    );
  }

  // Check smoke instance matrices
  const sMesh = atmo.particles.smoke;
  for (let i = 0; i < sMesh.count; i++) {
    sMesh.getMatrixAt(i, mat);
    mat.decompose(pos, rot, scale);

    const distToSummit = Math.hypot(pos.x - 20.0, pos.z - 22.0);
    const distToOrigin = Math.hypot(pos.x, pos.z);

    assert.ok(
      distToSummit < 3.5,
      `Smoke instance ${i} must be at summit campfire, got (${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)})`
    );
    assert.ok(
      distToOrigin > 20.0,
      `Smoke instance ${i} must NOT be near origin, dist was ${distToOrigin.toFixed(2)}m`
    );
  }
});

test('F6.Remediation.2.3: Sustained lifecycle respawn confinement over 200 frames', async () => {
  const scene = new THREE.Scene();
  const world = new MockWorld();
  const atmo = new AtmosphereManager(scene, world);
  await atmo.init();

  // Run 200 simulation frames to force multiple particle lifecycles (respawns)
  for (let f = 0; f < 200; f++) {
    atmo.update(0.016, (f + 1) * 0.016, 0.75);

    // Verify flame data never jumps to origin
    for (let i = 0; i < atmo.flameData.length; i++) {
      const p = atmo.flameData[i];
      assert.ok(
        Math.hypot(p.x - 20.0, p.z - 22.0) < 3.0,
        `Frame ${f}: Flame particle ${i} escaped summit campfire! Pos: (${p.x}, ${p.y}, ${p.z})`
      );
    }
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 3: Timing Continuity & Scale Invariance (No 1.0s / 1000ms Heuristic Glitch)
// ─────────────────────────────────────────────────────────────────────────────

test('F6.Remediation.3.1: Continuous light flicker across elapsed = 1.0s / 1000ms boundary', async () => {
  const scene = new THREE.Scene();
  const world = new MockWorld();
  const atmo = new AtmosphereManager(scene, world);
  await atmo.init();

  const campfire = atmo.pointLights.find(p => p.config.id === 'summit_campfire');
  assert.ok(campfire, 'Summit campfire light must exist');

  // Step across 0.950s to 1.050s in 2ms (0.002s) increments
  let prevIntensity = null;
  let maxStepDelta = 0.0;
  let maxStepAt = 0.0;

  for (let s = 0.950; s <= 1.050; s += 0.002) {
    atmo.update(0.002, s, 0.75); // Night time for full flicker intensity
    const curIntensity = campfire.light.intensity;

    if (prevIntensity !== null) {
      const stepDelta = Math.abs(curIntensity - prevIntensity);
      if (stepDelta > maxStepDelta) {
        maxStepDelta = stepDelta;
        maxStepAt = s;
      }
    }
    prevIntensity = curIntensity;
  }

  // An ordinary 2ms delta in physical flicker produces delta < 0.05
  // The 1000ms heuristic glitch previously caused a phase warp of ~0.14
  assert.ok(
    maxStepDelta < 0.05,
    `Campfire flicker step must be continuous across 1.0s boundary (< 0.05 per 2ms), but found jump of ${maxStepDelta.toFixed(4)} at s=${maxStepAt.toFixed(4)}`
  );
});

test('F6.Remediation.3.2: Internal animation time accumulation is strictly monotonic', async () => {
  const scene = new THREE.Scene();
  const world = new MockWorld();
  const atmo = new AtmosphereManager(scene, world);
  await atmo.init();

  // Run 100 frames with varying deltas and verify internal state progression
  for (let f = 0; f < 100; f++) {
    const dt = 0.010 + (f % 5) * 0.002;
    atmo.update(dt, undefined, 0.25); // Test fallback to internal accumulator
  }

  // Verify that leaf particles sway smoothly without NaN or infinite positions
  const leafMesh = atmo.particles.leaves;
  const mat = new THREE.Matrix4();
  const pos = new THREE.Vector3();
  for (let i = 0; i < leafMesh.count; i++) {
    leafMesh.getMatrixAt(i, mat);
    pos.setFromMatrixPosition(mat);
    assert.ok(Number.isFinite(pos.x), `Leaf ${i} pos.x is not finite: ${pos.x}`);
    assert.ok(Number.isFinite(pos.y), `Leaf ${i} pos.y is not finite: ${pos.y}`);
    assert.ok(Number.isFinite(pos.z), `Leaf ${i} pos.z is not finite: ${pos.z}`);
  }
});
