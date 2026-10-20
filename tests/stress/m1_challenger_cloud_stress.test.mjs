// ===================================================
// m1_challenger_cloud_stress.test.mjs — Adversarial Stress Test Suite
// Challenger: challenger_m1_it2_1
// Scope: Cloud Color Interpolation Continuity, Wrap-around, Negative Values, & Stability
// ===================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import '../helpers/headless_env.mjs';
import { AtmosphereManager } from '../../src/game/AtmosphereManager.js';

class MockWorld {
  getGroundHeight() {
    return 0.0;
  }
}

function manhattanDelta(c1, c2) {
  return Math.abs(c1.r - c2.r) + Math.abs(c1.g - c2.g) + Math.abs(c1.b - c2.b);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Continuous Time Steps Across [0, 1) (1,000 to 10,000 Steps)
// ─────────────────────────────────────────────────────────────────────────────

test('Challenger Stress 1: 1,000 continuous time steps across [0, 1) has max delta < 0.05', async () => {
  const scene = new THREE.Scene();
  const atmo = new AtmosphereManager(scene, new MockWorld());
  await atmo.init();

  const steps = 1000;
  let prevColor = null;
  let maxDelta = 0.0;
  let maxDeltaAt = 0.0;

  for (let i = 0; i <= steps; i++) {
    const dayTime = i / steps;
    atmo.update(0.016, i * 0.016, dayTime);
    const curColor = atmo.materials.cloud.color.clone();

    if (prevColor) {
      const delta = manhattanDelta(curColor, prevColor);
      if (delta > maxDelta) {
        maxDelta = delta;
        maxDeltaAt = dayTime;
      }
      assert.ok(
        delta < 0.05,
        `1,000-step test: delta exceeded 0.05 at dayTime=${dayTime}: delta was ${delta.toFixed(6)}`
      );
    }
    prevColor = curColor;
  }

  assert.ok(maxDelta > 0.001, `Cloud color must actively modulate (maxDelta was ${maxDelta})`);
  assert.ok(
    maxDelta < 0.05,
    `1,000-step test: max delta must be strictly < 0.05, got ${maxDelta.toFixed(6)} at dayTime=${maxDeltaAt}`
  );
});

test('Challenger Stress 2: 2,500 continuous time steps across [0, 1) has max delta < 0.05', async () => {
  const scene = new THREE.Scene();
  const atmo = new AtmosphereManager(scene, new MockWorld());
  await atmo.init();

  const steps = 2500;
  let prevColor = null;
  let maxDelta = 0.0;
  let maxDeltaAt = 0.0;

  for (let i = 0; i <= steps; i++) {
    const dayTime = i / steps;
    atmo.update(0.016, i * 0.016, dayTime);
    const curColor = atmo.materials.cloud.color.clone();

    if (prevColor) {
      const delta = manhattanDelta(curColor, prevColor);
      if (delta > maxDelta) {
        maxDelta = delta;
        maxDeltaAt = dayTime;
      }
      assert.ok(
        delta < 0.05,
        `2,500-step test: delta exceeded 0.05 at dayTime=${dayTime}: delta was ${delta.toFixed(6)}`
      );
    }
    prevColor = curColor;
  }

  assert.ok(
    maxDelta < 0.05,
    `2,500-step test: max delta must be strictly < 0.05, got ${maxDelta.toFixed(6)} at dayTime=${maxDeltaAt}`
  );
});

test('Challenger Stress 3: 5,000 continuous time steps across [0, 1) has max delta < 0.05', async () => {
  const scene = new THREE.Scene();
  const atmo = new AtmosphereManager(scene, new MockWorld());
  await atmo.init();

  const steps = 5000;
  let prevColor = null;
  let maxDelta = 0.0;
  let maxDeltaAt = 0.0;

  for (let i = 0; i <= steps; i++) {
    const dayTime = i / steps;
    atmo.update(0.016, i * 0.016, dayTime);
    const curColor = atmo.materials.cloud.color.clone();

    if (prevColor) {
      const delta = manhattanDelta(curColor, prevColor);
      if (delta > maxDelta) {
        maxDelta = delta;
        maxDeltaAt = dayTime;
      }
      assert.ok(
        delta < 0.05,
        `5,000-step test: delta exceeded 0.05 at dayTime=${dayTime}: delta was ${delta.toFixed(6)}`
      );
    }
    prevColor = curColor;
  }

  assert.ok(
    maxDelta < 0.05,
    `5,000-step test: max delta must be strictly < 0.05, got ${maxDelta.toFixed(6)} at dayTime=${maxDeltaAt}`
  );
});

test('Challenger Stress 4: 10,000 continuous time steps across [0, 1) has max delta < 0.05', async () => {
  const scene = new THREE.Scene();
  const atmo = new AtmosphereManager(scene, new MockWorld());
  await atmo.init();

  const steps = 10000;
  let prevColor = null;
  let maxDelta = 0.0;
  let maxDeltaAt = 0.0;

  for (let i = 0; i <= steps; i++) {
    const dayTime = i / steps;
    atmo.update(0.016, i * 0.016, dayTime);
    const curColor = atmo.materials.cloud.color.clone();

    if (prevColor) {
      const delta = manhattanDelta(curColor, prevColor);
      if (delta > maxDelta) {
        maxDelta = delta;
        maxDeltaAt = dayTime;
      }
      assert.ok(
        delta < 0.05,
        `10,000-step test: delta exceeded 0.05 at dayTime=${dayTime}: delta was ${delta.toFixed(6)}`
      );
    }
    prevColor = curColor;
  }

  assert.ok(
    maxDelta < 0.05,
    `10,000-step test: max delta must be strictly < 0.05, got ${maxDelta.toFixed(6)} at dayTime=${maxDeltaAt}`
  );
  // Empirical verification: max delta for 10,000 steps is ~0.001146
  assert.ok(
    maxDelta < 0.002,
    `10,000-step test: max delta should be approximately 0.001146, got ${maxDelta.toFixed(6)}`
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. High-Density Micro-Stepping Specifically Around t = 0.55
// ─────────────────────────────────────────────────────────────────────────────

test('Challenger Stress 5: Boundary t = 0.55 high-density micro-sampling ([0.540, 0.560], 2,000 steps)', async () => {
  const scene = new THREE.Scene();
  const atmo = new AtmosphereManager(scene, new MockWorld());
  await atmo.init();

  // Test 2,000 steps between 0.540 and 0.560 (step size 0.00001)
  const start = 0.540;
  const end = 0.560;
  const steps = 2000;
  let prevColor = null;
  let maxDelta = 0.0;
  let maxDeltaAt = 0.0;

  for (let i = 0; i <= steps; i++) {
    const dayTime = start + (i / steps) * (end - start);
    atmo.update(0.016, 1.0, dayTime);
    const curColor = atmo.materials.cloud.color.clone();

    if (prevColor) {
      const delta = manhattanDelta(curColor, prevColor);
      if (delta > maxDelta) {
        maxDelta = delta;
        maxDeltaAt = dayTime;
      }
      assert.ok(
        delta < 0.001,
        `Micro-step at t=${dayTime.toFixed(5)} exceeded 0.001: ${delta.toFixed(6)}`
      );
    }
    prevColor = curColor;
  }

  assert.ok(
    maxDelta < 0.0002,
    `Max micro-step delta across t=0.55 region must be < 0.0002, got ${maxDelta.toFixed(6)} at ${maxDeltaAt.toFixed(5)}`
  );

  // Exact step across 0.5499 -> 0.5501 (dt = 0.0002)
  atmo.update(0.016, 1.0, 0.5499);
  const cBefore = atmo.materials.cloud.color.clone();
  atmo.update(0.016, 1.016, 0.5501);
  const cAfter = atmo.materials.cloud.color.clone();
  const jump = manhattanDelta(cBefore, cAfter);

  assert.ok(
    jump < 0.002,
    `Direct jump across t=0.55 (0.5499 -> 0.5501) must be strictly < 0.002, got ${jump.toFixed(6)}`
  );
  assert.ok(
    jump < 0.05,
    `Direct jump across t=0.55 must be strictly < 0.05, got ${jump.toFixed(6)}`
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Wrap-Around Continuity (t = 0.999 to 0.001)
// ─────────────────────────────────────────────────────────────────────────────

test('Challenger Stress 6: Wrap-around continuity from t = 0.999 to 0.001 and exact midnight t = 1.0 -> 0.0', async () => {
  const scene = new THREE.Scene();
  const atmo = new AtmosphereManager(scene, new MockWorld());
  await atmo.init();

  // Test 0.999 -> 0.001 (step size = 0.002)
  atmo.update(0.016, 1.0, 0.999);
  const c999 = atmo.materials.cloud.color.clone();

  atmo.update(0.016, 1.016, 0.001);
  const c001 = atmo.materials.cloud.color.clone();

  const wrapDelta = manhattanDelta(c999, c001);
  assert.ok(
    wrapDelta < 0.05,
    `Wrap-around delta (0.999 -> 0.001) must be strictly < 0.05, got ${wrapDelta.toFixed(6)}`
  );
  assert.ok(
    wrapDelta < 0.001,
    `Wrap-around delta (0.999 -> 0.001) is expected to be < 0.001, got ${wrapDelta.toFixed(6)}`
  );

  // High-resolution wrap-around sweep: 0.995 -> 1.0 -> 0.005 in 0.0001 steps
  let prevColor = null;
  let maxWrapSweepDelta = 0.0;
  for (let s = 0; s <= 100; s++) {
    // dayTime from 0.995 to 1.005
    const dt = 0.995 + s * 0.0001;
    atmo.update(0.016, 1.0, dt);
    const cur = atmo.materials.cloud.color.clone();
    if (prevColor) {
      const d = manhattanDelta(cur, prevColor);
      if (d > maxWrapSweepDelta) maxWrapSweepDelta = d;
      assert.ok(d < 0.05, `Wrap sweep at ${dt} exceeded 0.05: ${d}`);
    }
    prevColor = cur;
  }

  assert.ok(
    maxWrapSweepDelta < 0.0005,
    `Wrap sweep max delta must be < 0.0005, got ${maxWrapSweepDelta.toFixed(6)}`
  );

  // Check exact t = 1.0 matches t = 0.0 (Dawn #ffccaa)
  atmo.update(0.016, 1.0, 1.0);
  const c10 = atmo.materials.cloud.color.clone();
  atmo.update(0.016, 1.0, 0.0);
  const c00 = atmo.materials.cloud.color.clone();
  assert.equal(c10.getHexString(), c00.getHexString(), 't=1.0 and t=0.0 must yield identical hex color');
  assert.equal(c00.getHexString().toLowerCase(), 'ffccaa', 't=0.0 must be Dawn #ffccaa');
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Negative dayTime Values & Multi-Cycle Continuity
// ─────────────────────────────────────────────────────────────────────────────

test('Challenger Stress 7: Negative dayTime continuous sweep across [-3.0, 0.0]', async () => {
  const scene = new THREE.Scene();
  const atmo = new AtmosphereManager(scene, new MockWorld());
  await atmo.init();

  const steps = 3000;
  let prevColor = null;
  let maxDelta = 0.0;
  let maxDeltaAt = 0.0;

  for (let i = 0; i <= steps; i++) {
    const dayTime = -3.0 + (i / steps) * 3.0; // from -3.0 to 0.0
    atmo.update(0.016, i * 0.016, dayTime);
    const curColor = atmo.materials.cloud.color.clone();

    if (prevColor) {
      const delta = manhattanDelta(curColor, prevColor);
      if (delta > maxDelta) {
        maxDelta = delta;
        maxDeltaAt = dayTime;
      }
      assert.ok(
        delta < 0.05,
        `Negative dayTime step at ${dayTime.toFixed(4)} exceeded 0.05: ${delta.toFixed(6)}`
      );
    }
    prevColor = curColor;
  }

  assert.ok(
    maxDelta < 0.05,
    `Negative sweep max delta must be < 0.05, got ${maxDelta.toFixed(6)} at ${maxDeltaAt.toFixed(4)}`
  );
  assert.ok(
    maxDelta < 0.015,
    `Negative sweep max delta should be ~0.01146, got ${maxDelta.toFixed(6)}`
  );
});

test('Challenger Stress 8: Negative to positive zero-crossing continuity (-0.005 -> +0.005)', async () => {
  const scene = new THREE.Scene();
  const atmo = new AtmosphereManager(scene, new MockWorld());
  await atmo.init();

  let prevColor = null;
  let maxCrossDelta = 0.0;

  for (let t = -0.005; t <= 0.005; t += 0.0001) {
    atmo.update(0.016, 1.0, t);
    const cur = atmo.materials.cloud.color.clone();
    if (prevColor) {
      const d = manhattanDelta(cur, prevColor);
      if (d > maxCrossDelta) maxCrossDelta = d;
      assert.ok(
        d < 0.05,
        `Zero-crossing step at t=${t.toFixed(5)} exceeded 0.05: ${d.toFixed(6)}`
      );
    }
    prevColor = cur;
  }

  assert.ok(
    maxCrossDelta < 0.0005,
    `Zero-crossing max delta must be < 0.0005, got ${maxCrossDelta.toFixed(6)}`
  );
});

test('Challenger Stress 9: Extreme large and negative dayTime values produce finite, valid colors', async () => {
  const scene = new THREE.Scene();
  const atmo = new AtmosphereManager(scene, new MockWorld());
  await atmo.init();

  const extremeValues = [
    -1000000.5, -99999.25, -123.456, -1.0, -0.75, -0.5, -0.25, -0.0,
    0.0, 0.25, 0.5, 0.75, 1.0, 123.456, 99999.25, 1000000.5
  ];

  for (const val of extremeValues) {
    atmo.update(0.016, 1.0, val);
    const c = atmo.materials.cloud.color;

    assert.ok(Number.isFinite(c.r), `Color R must be finite for dayTime=${val}: got ${c.r}`);
    assert.ok(Number.isFinite(c.g), `Color G must be finite for dayTime=${val}: got ${c.g}`);
    assert.ok(Number.isFinite(c.b), `Color B must be finite for dayTime=${val}: got ${c.b}`);

    assert.ok(c.r >= 0.0 && c.r <= 1.0, `Color R in [0, 1] for dayTime=${val}: got ${c.r}`);
    assert.ok(c.g >= 0.0 && c.g <= 1.0, `Color G in [0, 1] for dayTime=${val}: got ${c.g}`);
    assert.ok(c.b >= 0.0 && c.b <= 1.0, `Color B in [0, 1] for dayTime=${val}: got ${c.b}`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. C^1 Tangent Flatness at Keyframes (Zero Derivative Transition)
// ─────────────────────────────────────────────────────────────────────────────

test('Challenger Stress 10: Hermite cubic tangents are flat (zero slope) at all keyframe nodes', async () => {
  const scene = new THREE.Scene();
  const atmo = new AtmosphereManager(scene, new MockWorld());
  await atmo.init();

  const keyframes = [0.00, 0.25, 0.50, 0.75];
  const eps = 0.00001; // 1e-5

  for (const kf of keyframes) {
    atmo.update(0.016, 1.0, kf);
    const cCenter = atmo.materials.cloud.color.clone();

    atmo.update(0.016, 1.0, kf - eps);
    const cLeft = atmo.materials.cloud.color.clone();

    atmo.update(0.016, 1.0, kf + eps);
    const cRight = atmo.materials.cloud.color.clone();

    const slopeLeft = manhattanDelta(cCenter, cLeft) / eps;
    const slopeRight = manhattanDelta(cCenter, cRight) / eps;

    // In Hermite smoothstep 3u^2 - 2u^3, S'(0) = 0 and S'(1) = 0.
    // For small eps, the slope should approach 0 (strictly < 0.1, whereas midpoint slope is ~11.4).
    assert.ok(
      slopeLeft < 0.1,
      `Slope to the left of keyframe ${kf} should approach 0, got ${slopeLeft.toFixed(4)}`
    );
    assert.ok(
      slopeRight < 0.1,
      `Slope to the right of keyframe ${kf} should approach 0, got ${slopeRight.toFixed(4)}`
    );
  }
});
