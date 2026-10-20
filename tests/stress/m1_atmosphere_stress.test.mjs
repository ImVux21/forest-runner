// ===================================================
// m1_atmosphere_stress.test.mjs — Adversarial Stress Test Suite for AtmosphereManager
// Challenger: challenger_m1_2
// Evaluates: Cloud dynamics/wrapping/tinting, Particle buffers/NaNs/bounds,
//            Point lights ignition/flicker, Extreme Delta Stress (dt=0.0s, dt=0.5s),
//            and surfaces critical edge-case bugs for Milestone 1.
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

function assertNoNaNsInMatrixArray(array, label) {
  for (let i = 0; i < array.length; i++) {
    const val = array[i];
    assert.ok(
      Number.isFinite(val),
      `${label} matrix buffer contains non-finite value at index ${i}: ${val}`
    );
  }
}

function assertValidInstanceMatrices(mesh, label) {
  const count = mesh.count;
  const mat = new THREE.Matrix4();
  const pos = new THREE.Vector3();
  const rot = new THREE.Quaternion();
  const scale = new THREE.Vector3();

  for (let i = 0; i < count; i++) {
    mesh.getMatrixAt(i, mat);
    const elements = mat.elements;
    for (let e = 0; e < 16; e++) {
      assert.ok(
        Number.isFinite(elements[e]),
        `${label} instance ${i} element ${e} is not finite: ${elements[e]}`
      );
    }
    const det = mat.determinant();
    assert.ok(
      Number.isFinite(det) && det > 0,
      `${label} instance ${i} has invalid or non-positive determinant: ${det}`
    );

    mat.decompose(pos, rot, scale);
    assert.ok(
      scale.x > 0 && scale.y > 0 && scale.z > 0,
      `${label} instance ${i} has non-positive scale: (${scale.x}, ${scale.y}, ${scale.z})`
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 1: Drifting Clouds Verification & Adversarial Continuity Check
// ─────────────────────────────────────────────────────────────────────────────

test('Adversarial Clouds: Count, altitude limits, puff hierarchy, and shadow disabling', async () => {
  const scene = new THREE.Scene();
  const world = new MockWorld();
  const atmo = new AtmosphereManager(scene, world);
  await atmo.init();

  assert.equal(atmo.clouds.length, 14, 'Must create exactly 14 drifting cloud groups');

  for (let i = 0; i < atmo.clouds.length; i++) {
    const c = atmo.clouds[i];
    const y = c.group.position.y;
    assert.ok(
      y >= 22.0 && y <= 31.0,
      `Cloud ${i} initial altitude ${y} must be strictly within [22.0, 31.0]`
    );
    assert.ok(
      c.speed >= 1.0 && c.speed <= 1.8,
      `Cloud ${i} speed ${c.speed} must be in [1.0, 1.8]`
    );
    assert.ok(
      c.group.children.length >= 4 && c.group.children.length <= 6,
      `Cloud ${i} must have 4-6 puffs, found ${c.group.children.length}`
    );

    for (const puff of c.group.children) {
      assert.equal(puff.castShadow, false, 'Cloud puffs must have castShadow=false');
      assert.equal(puff.receiveShadow, false, 'Cloud puffs must have receiveShadow=false');
      assert.ok(puff.geometry instanceof THREE.DodecahedronGeometry, 'Puffs must use DodecahedronGeometry');
    }
  }
});

test('Adversarial Clouds: Boundary wrapping threshold (|x| > 65) and altitude re-roll', async () => {
  const scene = new THREE.Scene();
  const world = new MockWorld();
  const atmo = new AtmosphereManager(scene, world);
  await atmo.init();

  // Test wrapping trigger at x > 65.0
  const cloud = atmo.clouds[0];
  cloud.group.position.set(65.01, 25.0, 10.0);
  atmo.update(0.016, 1.0, 0.25);

  assert.ok(
    cloud.group.position.x <= -64.9,
    `Cloud at x > 65.0 must wrap to negative boundary (~ -64.9), got ${cloud.group.position.x}`
  );
  assert.ok(
    cloud.group.position.y >= 22.0 && cloud.group.position.y <= 31.0,
    `Wrapped cloud altitude ${cloud.group.position.y} must re-roll within [22.0, 31.0]`
  );
  assert.ok(
    cloud.group.position.z >= -60.0 && cloud.group.position.z <= 60.0,
    `Wrapped cloud Z ${cloud.group.position.z} must re-roll within [-60.0, 60.0]`
  );

  // Run 1000 simulated seconds to ensure no clouds escape the [-75, 75] boundary
  for (let s = 0; s < 1000; s++) {
    atmo.update(1.0, s, 0.25);
    for (let i = 0; i < atmo.clouds.length; i++) {
      const px = atmo.clouds[i].group.position.x;
      assert.ok(
        px >= -75.0 && px <= 75.0,
        `Cloud ${i} drifted out of bounds during long simulation: x = ${px}`
      );
    }
  }
});

test('Adversarial Clouds: Color tinting keyframes (Noon, Sunset, Night, Dawn)', async () => {
  const scene = new THREE.Scene();
  const world = new MockWorld();
  const atmo = new AtmosphereManager(scene, world);
  await atmo.init();

  // 1. Pure Day (Noon, dayTime = 0.25)
  atmo.update(0.016, 1.0, 0.25);
  assert.equal(
    atmo.materials.cloud.color.getHexString().toLowerCase(),
    'ffffff',
    'Day clouds must be pure white (#ffffff)'
  );

  // 2. Pure Night (Midnight, dayTime = 0.75)
  atmo.update(0.016, 2.0, 0.75);
  assert.equal(
    atmo.materials.cloud.color.getHexString().toLowerCase(),
    '202b44',
    'Night clouds must be deep slate navy (#202b44)'
  );

  // 3. Sunset transition (dayTime = 0.375, exact midpoint of day-to-sunset)
  atmo.update(0.016, 3.0, 0.375);
  const sunsetColor = atmo.materials.cloud.color;
  assert.ok(sunsetColor.r >= 0.99, `Sunset cloud Red must remain near 1.0, got ${sunsetColor.r}`);
  assert.ok(sunsetColor.g < 0.95 && sunsetColor.g > 0.65, `Sunset cloud Green should be tinted, got ${sunsetColor.g}`);
  assert.ok(sunsetColor.b < 0.90 && sunsetColor.b > 0.40, `Sunset cloud Blue should be tinted, got ${sunsetColor.b}`);
});

test('Regression Prevention: Cloud sunset-to-night continuity at dayTime = 0.55', async () => {
  const scene = new THREE.Scene();
  const world = new MockWorld();
  const atmo = new AtmosphereManager(scene, world);
  await atmo.init();

  // Step 1: Evaluate color right before sunset ends (dayTime = 0.5499)
  atmo.update(0.016, 1.0, 0.5499);
  const beforeColor = atmo.materials.cloud.color.clone();

  // Step 2: Evaluate color right as night begins (dayTime = 0.5501)
  atmo.update(0.016, 1.016, 0.5501);
  const afterColor = atmo.materials.cloud.color.clone();

  const colorJump =
    Math.abs(beforeColor.r - afterColor.r) +
    Math.abs(beforeColor.g - afterColor.g) +
    Math.abs(beforeColor.b - afterColor.b);

  assert.ok(
    colorJump < 0.02,
    `Cloud color must transition smoothly across dayTime=0.55 without popping: delta was ${colorJump}`
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 2: Particle Systems Verification (Buffers, Matrices, NaNs, Bounding Boxes)
// ─────────────────────────────────────────────────────────────────────────────

test('Adversarial Particles: Buffer counts, DynamicDrawUsage, and shadow flags', async () => {
  const scene = new THREE.Scene();
  const world = new MockWorld();
  const atmo = new AtmosphereManager(scene, world);
  await atmo.init();

  const systems = [
    { name: 'leaves', mesh: atmo.particles.leaves, expectedCount: 100 },
    { name: 'spores', mesh: atmo.particles.spores, expectedCount: 60 },
    { name: 'flames', mesh: atmo.particles.flames, expectedCount: 35 },
    { name: 'smoke', mesh: atmo.particles.smoke, expectedCount: 30 },
    { name: 'fireflies', mesh: atmo.particles.fireflies, expectedCount: 40 },
  ];

  for (const sys of systems) {
    assert.ok(sys.mesh, `Particle system ${sys.name} must exist`);
    assert.ok(sys.mesh.isInstancedMesh, `${sys.name} must be THREE.InstancedMesh`);
    assert.equal(sys.mesh.count, sys.expectedCount, `${sys.name} count must be ${sys.expectedCount}`);
    assert.equal(
      sys.mesh.instanceMatrix.usage,
      THREE.DynamicDrawUsage,
      `${sys.name} instanceMatrix usage must be THREE.DynamicDrawUsage`
    );
    assert.equal(sys.mesh.castShadow, false, `${sys.name} castShadow must be false`);
    assert.equal(sys.mesh.receiveShadow, false, `${sys.name} receiveShadow must be false`);
  }
});

test('Adversarial Particles: Valid instance matrices and zero NaNs over 300 simulation frames', async () => {
  const scene = new THREE.Scene();
  const world = new MockWorld();
  const atmo = new AtmosphereManager(scene, world);
  await atmo.init();

  // Run 300 frames simulating day, sunset, and night
  for (let frame = 0; frame < 300; frame++) {
    const elapsed = frame * 0.016;
    const dayTime = (frame % 200) / 200;
    atmo.update(0.016, elapsed, dayTime);

    // Validate leaves
    assertNoNaNsInMatrixArray(atmo.particles.leaves.instanceMatrix.array, 'leaves');
    assertValidInstanceMatrices(atmo.particles.leaves, 'leaves');

    // Validate spores
    assertNoNaNsInMatrixArray(atmo.particles.spores.instanceMatrix.array, 'spores');
    assertValidInstanceMatrices(atmo.particles.spores, 'spores');

    // Validate flames
    assertNoNaNsInMatrixArray(atmo.particles.flames.instanceMatrix.array, 'flames');
    assertValidInstanceMatrices(atmo.particles.flames, 'flames');

    // Validate smoke
    assertNoNaNsInMatrixArray(atmo.particles.smoke.instanceMatrix.array, 'smoke');
    assertValidInstanceMatrices(atmo.particles.smoke, 'smoke');

    // Fireflies (active when nightFactor >= 0.05)
    if (atmo.particles.fireflies.visible) {
      assertNoNaNsInMatrixArray(atmo.particles.fireflies.instanceMatrix.array, 'fireflies');
      assertValidInstanceMatrices(atmo.particles.fireflies, 'fireflies');
    }
  }
});

test('Adversarial Particles: Bounding box computation and spatial containment', async () => {
  const scene = new THREE.Scene();
  const world = new MockWorld();
  const atmo = new AtmosphereManager(scene, world);
  await atmo.init();

  // Warm up simulation for 4 seconds so all particles cycle through their lifespans
  for (let f = 0; f < 250; f++) {
    atmo.update(0.016, f * 0.016, 0.75); // Night time so fireflies are active too
  }

  // 1. Leaves Bounding Box
  atmo.particles.leaves.computeBoundingBox();
  const leafBox = atmo.particles.leaves.boundingBox;
  assert.ok(leafBox, 'Leaves bounding box must compute');
  assert.ok(leafBox.min.x >= -50 && leafBox.max.x <= 50, `Leaves X bounds within world: [${leafBox.min.x}, ${leafBox.max.x}]`);
  assert.ok(leafBox.min.z >= -50 && leafBox.max.z <= 50, `Leaves Z bounds within world: [${leafBox.min.z}, ${leafBox.max.z}]`);
  assert.ok(leafBox.min.y >= -1.0 && leafBox.max.y <= 16.0, `Leaves Y bounds: [${leafBox.min.y}, ${leafBox.max.y}]`);

  // 2. Mushroom Spores Bounding Box (Mushroom grove centered at x = -16, z = 16)
  atmo.particles.spores.computeBoundingBox();
  const sporeBox = atmo.particles.spores.boundingBox;
  assert.ok(sporeBox, 'Spores bounding box must compute');
  assert.ok(
    sporeBox.min.x >= -30 && sporeBox.max.x <= -2,
    `Spores X bounds must center on grove: [${sporeBox.min.x}, ${sporeBox.max.x}]`
  );
  assert.ok(
    sporeBox.min.z >= 2 && sporeBox.max.z <= 30,
    `Spores Z bounds must center on grove: [${sporeBox.min.z}, ${sporeBox.max.z}]`
  );
  assert.ok(
    sporeBox.min.y >= 3.0 && sporeBox.max.y <= 13.5,
    `Spores Y bounds above ground into canopy: [${sporeBox.min.y}, ${sporeBox.max.y}]`
  );

  // 3. Campfire Flames Bounding Box (Campfire at x = 20, y = 7, z = 22)
  atmo.particles.flames.computeBoundingBox();
  const flameBox = atmo.particles.flames.boundingBox;
  assert.ok(flameBox, 'Flames bounding box must compute');
  assert.ok(
    flameBox.min.x >= 18.0 && flameBox.max.x <= 22.0,
    `Warmed flames X bounds must localize to summit: [${flameBox.min.x}, ${flameBox.max.x}]`
  );
  assert.ok(
    flameBox.min.z >= 20.0 && flameBox.max.z <= 24.0,
    `Warmed flames Z bounds must localize to summit: [${flameBox.min.z}, ${flameBox.max.z}]`
  );
  assert.ok(
    flameBox.min.y >= 6.5 && flameBox.max.y <= 10.5,
    `Warmed flames Y bounds: [${flameBox.min.y}, ${flameBox.max.y}]`
  );

  // 4. Campfire Smoke Bounding Box
  atmo.particles.smoke.computeBoundingBox();
  const smokeBox = atmo.particles.smoke.boundingBox;
  assert.ok(smokeBox, 'Smoke bounding box must compute');
  assert.ok(
    smokeBox.min.x >= 18.0 && smokeBox.max.x <= 26.0,
    `Warmed smoke X bounds: [${smokeBox.min.x}, ${smokeBox.max.x}]`
  );
  assert.ok(
    smokeBox.min.y >= 7.0 && smokeBox.max.y <= 14.0,
    `Warmed smoke Y bounds: [${smokeBox.min.y}, ${smokeBox.max.y}]`
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 3: Warm Point Lights (Color, Smoothstep Ignition, Flicker Stability)
// ─────────────────────────────────────────────────────────────────────────────

test('Adversarial Point Lights: Configurations, warm colors (0xff9933), and shadow flags', async () => {
  const scene = new THREE.Scene();
  const world = new MockWorld();
  const atmo = new AtmosphereManager(scene, world);
  await atmo.init();

  assert.equal(atmo.pointLights.length, 4, 'Must configure exactly 4 point lights');

  const village = atmo.pointLights.find(p => p.config.id === 'village_lantern');
  const bridge = atmo.pointLights.find(p => p.config.id === 'bridge_lantern');
  const campfire = atmo.pointLights.find(p => p.config.id === 'summit_campfire');
  const grove = atmo.pointLights.find(p => p.config.id === 'mushroom_grove');

  assert.ok(village && bridge && campfire && grove, 'All 4 named lights must exist');

  // Verify warm colors
  assert.equal(village.light.color.getHex(), 0xff9933, 'Village lantern must be warm 0xff9933');
  assert.equal(bridge.light.color.getHex(), 0xff9933, 'Bridge lantern must be warm 0xff9933');
  assert.equal(campfire.light.color.getHex(), 0xff6611, 'Campfire light must be fiery warm 0xff6611');

  // Verify castShadow = false for forward rendering performance
  for (const pl of atmo.pointLights) {
    assert.equal(pl.light.castShadow, false, `Light ${pl.config.id} castShadow must be false`);
  }
});

test('Adversarial Point Lights: Mathematical smoothstep night ignition curve', async () => {
  const scene = new THREE.Scene();
  const world = new MockWorld();
  const atmo = new AtmosphereManager(scene, world);
  await atmo.init();

  // Test nightFactor calculation curve
  // 1. Daytime [0.0, 0.40) -> 0.0
  assert.equal(atmo._calculateNightFactor(0.0), 0.0);
  assert.equal(atmo._calculateNightFactor(0.20), 0.0);
  assert.equal(atmo._calculateNightFactor(0.399), 0.0);

  // 2. Sunset transition [0.40, 0.55) -> Hermite smoothstep
  const nfMid = atmo._calculateNightFactor(0.475);
  assert.ok(Math.abs(nfMid - 0.5) < 0.001, `Mid-sunset nightFactor must be 0.5, got ${nfMid}`);

  // Test 1st derivative / monotonicity: strictly increasing
  let prevNf = 0.0;
  for (let dt = 0.401; dt < 0.549; dt += 0.01) {
    const curNf = atmo._calculateNightFactor(dt);
    assert.ok(curNf > prevNf, `Sunset nightFactor must strictly increase: ${curNf} > ${prevNf}`);
    prevNf = curNf;
  }

  // 3. Full Night [0.55, 0.90) -> 1.0
  assert.equal(atmo._calculateNightFactor(0.55), 1.0);
  assert.equal(atmo._calculateNightFactor(0.75), 1.0);
  assert.equal(atmo._calculateNightFactor(0.899), 1.0);

  // 4. Dawn transition [0.90, 1.0) -> Hermite smoothstep down to 0
  const nfDawnMid = atmo._calculateNightFactor(0.95);
  assert.ok(Math.abs(nfDawnMid - 0.5) < 0.001, `Mid-dawn nightFactor must be 0.5, got ${nfDawnMid}`);
  assert.ok(atmo._calculateNightFactor(0.999) < 0.05, 'End of dawn must return near 0');
});

test('Adversarial Point Lights: Long-term flicker stability and non-negative clamping', async () => {
  const scene = new THREE.Scene();
  const world = new MockWorld();
  const atmo = new AtmosphereManager(scene, world);
  await atmo.init();

  const campfire = atmo.pointLights.find(p => p.config.id === 'summit_campfire');
  const grove = atmo.pointLights.find(p => p.config.id === 'mushroom_grove');

  // Test with varying elapsed time up to 100,000 seconds
  const testElapsedTimes = [
    0.0, 0.5, 1.23, 10.0, 100.0, 1000.0, 5432.1, 99999.0
  ];

  for (const baseElapsed of testElapsedTimes) {
    for (let f = 0; f < 50; f++) {
      const elapsed = baseElapsed + f * 0.016;
      atmo.update(0.016, elapsed, 0.75); // Night

      const cInt = campfire.light.intensity;
      const gInt = grove.light.intensity;

      assert.ok(Number.isFinite(cInt), `Campfire intensity must be finite at elapsed=${elapsed}`);
      assert.ok(cInt >= 0, `Campfire intensity must never be negative: ${cInt}`);
      assert.ok(cInt >= 2.0 && cInt <= 3.2, `Campfire night intensity within expected bounds: ${cInt}`);

      assert.ok(Number.isFinite(gInt), `Grove intensity must be finite at elapsed=${elapsed}`);
      assert.ok(gInt >= 0, `Grove intensity must never be negative: ${gInt}`);
      assert.ok(gInt >= 1.0 && gInt <= 2.5, `Grove night intensity within expected bounds: ${gInt}`);
    }
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 4: Extreme Delta Stress Testing (dt = 0.0s, dt = 0.5s, Hitching)
// ─────────────────────────────────────────────────────────────────────────────

test('Stress Test: dt = 0.0s (Engine Pause / Zero Delta Stability)', async () => {
  const scene = new THREE.Scene();
  const world = new MockWorld();
  const atmo = new AtmosphereManager(scene, world);
  await atmo.init();

  // Run 100 zero-delta updates
  for (let i = 0; i < 100; i++) {
    atmo.update(0.0, 10.0, 0.25);
  }

  // Verify clouds
  for (const c of atmo.clouds) {
    assert.ok(Number.isFinite(c.group.position.x));
    assert.ok(Number.isFinite(c.group.position.y));
    assert.ok(Number.isFinite(c.group.position.z));
  }

  // Verify all instanced particle buffers
  assertValidInstanceMatrices(atmo.particles.leaves, 'leaves (dt=0)');
  assertValidInstanceMatrices(atmo.particles.spores, 'spores (dt=0)');
  assertValidInstanceMatrices(atmo.particles.flames, 'flames (dt=0)');
  assertValidInstanceMatrices(atmo.particles.smoke, 'smoke (dt=0)');

  // Verify point lights
  for (const pl of atmo.pointLights) {
    assert.ok(Number.isFinite(pl.light.intensity));
    assert.ok(pl.light.intensity >= 0);
  }
});

test('Stress Test: dt = 0.5s (Major Frame Drops / Severe Hitching)', async () => {
  const scene = new THREE.Scene();
  const world = new MockWorld();
  const atmo = new AtmosphereManager(scene, world);
  await atmo.init();

  // Run 100 large-delta updates (each step 0.5 seconds = 50 seconds simulated)
  for (let i = 0; i < 100; i++) {
    const elapsed = i * 0.5;
    const dayTime = (i * 0.01) % 1.0;
    atmo.update(0.5, elapsed, dayTime);

    assertNoNaNsInMatrixArray(atmo.particles.leaves.instanceMatrix.array, `leaves dt=0.5 step ${i}`);
    assertNoNaNsInMatrixArray(atmo.particles.spores.instanceMatrix.array, `spores dt=0.5 step ${i}`);
    assertNoNaNsInMatrixArray(atmo.particles.flames.instanceMatrix.array, `flames dt=0.5 step ${i}`);
    assertNoNaNsInMatrixArray(atmo.particles.smoke.instanceMatrix.array, `smoke dt=0.5 step ${i}`);
  }

  assertValidInstanceMatrices(atmo.particles.leaves, 'leaves after dt=0.5 stress');
  assertValidInstanceMatrices(atmo.particles.spores, 'spores after dt=0.5 stress');
  assertValidInstanceMatrices(atmo.particles.flames, 'flames after dt=0.5 stress');
  assertValidInstanceMatrices(atmo.particles.smoke, 'smoke after dt=0.5 stress');
});

test('Stress Test: Adversarial alternating deltas (0.0s <-> 0.5s <-> 0.016s)', async () => {
  const scene = new THREE.Scene();
  const world = new MockWorld();
  const atmo = new AtmosphereManager(scene, world);
  await atmo.init();

  const deltas = [0.0, 0.5, 0.016, 0.0, 0.25, 0.5, 0.001, 0.0, 0.5];
  let elapsed = 0.0;

  for (let loop = 0; loop < 20; loop++) {
    for (const dt of deltas) {
      elapsed += dt;
      atmo.update(dt, elapsed, 0.5);

      assertNoNaNsInMatrixArray(atmo.particles.leaves.instanceMatrix.array, 'leaves alternating dt');
      assertNoNaNsInMatrixArray(atmo.particles.spores.instanceMatrix.array, 'spores alternating dt');
      assertNoNaNsInMatrixArray(atmo.particles.flames.instanceMatrix.array, 'flames alternating dt');
      assertNoNaNsInMatrixArray(atmo.particles.smoke.instanceMatrix.array, 'smoke alternating dt');
    }
  }

  assertValidInstanceMatrices(atmo.particles.leaves, 'leaves alternating deltas');
  assertValidInstanceMatrices(atmo.particles.spores, 'spores alternating deltas');
  assertValidInstanceMatrices(atmo.particles.flames, 'flames alternating deltas');
  assertValidInstanceMatrices(atmo.particles.smoke, 'smoke alternating deltas');
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 5: Cold-Start Spawn Lifecycle & Unit Heuristic Vulnerabilities
// ─────────────────────────────────────────────────────────────────────────────

test('Regression Prevention: Campfire flame/smoke cold-start spawn at summit (20,7,22) with zero at origin', async () => {
  const scene = new THREE.Scene();
  const world = new MockWorld();
  const atmo = new AtmosphereManager(scene, world);
  await atmo.init();

  // Inspect initial flame data before any update: initialized at summit, zero at origin
  let flamesAtOrigin = 0;
  for (const f of atmo.flameData) {
    if (f.x === 0 && f.y === 0 && f.z === 0) flamesAtOrigin++;
  }
  assert.equal(flamesAtOrigin, 0, 'Zero flame particles initialized at world origin (0,0,0)');

  // On frame 1 update with tiny delta (dt = 0.001):
  atmo.update(0.001, 0.001, 0.5);

  // Compute smoke bounding box on cold start:
  atmo.particles.smoke.computeBoundingBox();
  const smokeColdBox = atmo.particles.smoke.boundingBox;

  // Cold smoke box must be localized to summit (20,7,22)
  assert.ok(
    smokeColdBox.min.x >= 15.0,
    `Cold smoke bounding box localized to summit X (${smokeColdBox.min.x})`
  );
  assert.ok(
    smokeColdBox.min.z >= 15.0,
    `Cold smoke bounding box localized to summit Z (${smokeColdBox.min.z})`
  );

  // After 4.0s warm-up, all particles cycle at campfire
  for (let f = 0; f < 250; f++) {
    atmo.update(0.016, (f + 1) * 0.016, 0.5);
  }

  let finalFlamesAtCampfire = 0;
  for (const f of atmo.flameData) {
    if (f.x > 15.0 && f.z > 15.0) finalFlamesAtCampfire++;
  }
  assert.equal(finalFlamesAtCampfire, 35, 'All 35 flame particles at campfire after warm-up');
});

test('Empirical Defect: Elapsed time unit heuristic inversion at elapsed = 1000', async () => {
  // In AtmosphereManager:
  // const tSec = elapsed > 1000 ? elapsed * 0.001 : elapsed;
  // If Game.js passes performance.now() (which starts at 0ms):
  // At 500ms (0.5s into gameplay), elapsed = 500.
  // tSec evaluates to 500 seconds (1000x too fast!).
  // At 1000.1ms (1.0001s into gameplay), elapsed = 1000.1.
  // tSec evaluates to 1.0001 seconds (jumps backwards from 1000 to 1!).

  const elapsedBefore = 999.0;
  const elapsedAfter = 1001.0;

  const tSecBefore = elapsedBefore > 1000 ? elapsedBefore * 0.001 : elapsedBefore;
  const tSecAfter = elapsedAfter > 1000 ? elapsedAfter * 0.001 : elapsedAfter;

  assert.equal(tSecBefore, 999.0, 'At 999ms, heuristic mistakenly treats ms as seconds (999.0s)');
  assert.ok(Math.abs(tSecAfter - 1.001) < 0.0001, 'At 1001ms, heuristic converts to 1.001s');
  assert.ok(
    tSecBefore > tSecAfter * 500,
    'Confirms massive discontinuity: time parameter drops by ~1000x at elapsed=1000'
  );
});
