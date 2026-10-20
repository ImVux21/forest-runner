// ===================================================
// m2_challenger_water_docks_stress.test.mjs — Adversarial Stress Test Suite for Milestone 2
// Challenger: challenger_m2_2 (Empirical Challenger)
// Scope: Water Displacement 10,000 Steps, 70 Riverbed Pebbles Validity,
//        Dock Bobbing Amplitude 10,000 Steps, Dock Placement & Player Traversal
// ===================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import '../helpers/headless_env.mjs';
import { RiverModel, TerrainModel, GameplayModel } from '../helpers/analytical_models.mjs';
import { createTestWorld, createTestPlayer } from '../helpers/test_fixtures.mjs';

function createMockCamera() {
  return {
    getForwardVector: () => new THREE.Vector3(0, 0, -1),
    getRightVector: () => new THREE.Vector3(1, 0, 0),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CHALLENGE 1: WATER DISPLACEMENT BOUNDS OVER 10,000 SIMULATION STEPS
// ─────────────────────────────────────────────────────────────────────────────

test('Challenger 1.1: Water displacement bounds — 10,000 steps of world.update(delta, elapsed)', () => {
  const { world } = createTestWorld();

  assert.ok(world.waterGeometries, 'world.waterGeometries array exists');
  assert.equal(world.waterGeometries.length, 5, '5 river segments subdivided');

  let totalVertices = 0;
  for (const g of world.waterGeometries) {
    totalVertices += g.count;
  }
  assert.equal(totalVertices, 5 * 13 * 25, 'Total 1,625 subdivided vertices across 5 water segments');

  const numSteps = 10000;
  const dt = 0.016; // 60 FPS frame time
  let maxDisplacement = 0.0;
  let nanCount = 0;
  let infCount = 0;

  for (let s = 0; s < numSteps; s++) {
    const elapsed = s * dt;
    world.update(dt, elapsed);

    for (let gIdx = 0; gIdx < world.waterGeometries.length; gIdx++) {
      const { posAttr, count } = world.waterGeometries[gIdx];
      for (let v = 0; v < count; v++) {
        const z = posAttr.getZ(v);
        if (Number.isNaN(z)) {
          nanCount++;
        }
        if (!Number.isFinite(z)) {
          infCount++;
        }
        const absZ = Math.abs(z);
        if (absZ > maxDisplacement) {
          maxDisplacement = absZ;
        }
      }
    }
  }

  assert.equal(nanCount, 0, `Zero NaNs detected across ${numSteps} steps and ${totalVertices} vertices`);
  assert.equal(infCount, 0, `Zero non-finite values detected across ${numSteps} steps`);
  assert.ok(
    maxDisplacement <= 0.05,
    `Max vertex displacement must be strictly <= 0.05m, observed: ${maxDisplacement.toFixed(6)}m`
  );
  assert.ok(
    maxDisplacement >= 0.045,
    `Wave displacement is actively animating near theoretical maximum (0.048m), observed: ${maxDisplacement.toFixed(6)}m`
  );
});

test('Challenger 1.2: Water displacement invariance under extreme timestamps and irregular frame deltas', () => {
  const { world } = createTestWorld();

  const extremeTimestamps = [
    0.0,
    0.0001,
    0.5,
    140.0,      // Day cycle completion
    3600.0,     // 1 hour
    86400.0,    // 1 day
    1000000.0,  // 1 million seconds
  ];

  const irregularDeltas = [0.001, 0.016, 0.033, 0.05, 0.1, 0.5];

  for (const t of extremeTimestamps) {
    for (const dt of irregularDeltas) {
      world.update(dt, t);

      for (let gIdx = 0; gIdx < world.waterGeometries.length; gIdx++) {
        const { posAttr, count } = world.waterGeometries[gIdx];
        for (let v = 0; v < count; v++) {
          const z = posAttr.getZ(v);
          assert.ok(!Number.isNaN(z), `NaN detected at t=${t}, dt=${dt}`);
          assert.ok(Number.isFinite(z), `Non-finite displacement at t=${t}, dt=${dt}`);
          assert.ok(
            Math.abs(z) <= 0.05,
            `Displacement ${z} exceeded 0.05m bound at t=${t}, dt=${dt}`
          );
        }
      }
    }
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// CHALLENGE 2: RIVERBED PEBBLES INSTANCING, MATRICES & BOUNDING BOX VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

test('Challenger 2.1: Exactly 70 pebbles rendered with valid instance matrices and zero NaNs', () => {
  const { world, scene } = createTestWorld();

  const pebblesMesh = world.riverPebblesMesh;
  assert.ok(pebblesMesh instanceof THREE.InstancedMesh, 'pebblesMesh is THREE.InstancedMesh');
  assert.equal(pebblesMesh.count, 70, 'Exactly 70 riverbed pebbles allocated');
  assert.ok(scene.children.includes(pebblesMesh), 'pebblesMesh added to scene');

  const mat = new THREE.Matrix4();
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const scale = new THREE.Vector3();

  let nanCount = 0;
  let zeroScaleCount = 0;

  for (let i = 0; i < pebblesMesh.count; i++) {
    pebblesMesh.getMatrixAt(i, mat);

    // Verify matrix elements are all valid numbers
    for (const val of mat.elements) {
      if (Number.isNaN(val) || !Number.isFinite(val)) {
        nanCount++;
      }
    }

    // Verify matrix is invertible (non-degenerate)
    const det = mat.determinant();
    assert.ok(
      Math.abs(det) > 1e-7,
      `Pebble instance ${i} has singular / degenerate transformation matrix (det = ${det})`
    );

    // Decompose transform
    mat.decompose(pos, quat, scale);

    if (Number.isNaN(pos.x) || Number.isNaN(pos.y) || Number.isNaN(pos.z)) nanCount++;
    if (Number.isNaN(quat.x) || Number.isNaN(quat.y) || Number.isNaN(quat.z) || Number.isNaN(quat.w)) nanCount++;
    if (Number.isNaN(scale.x) || Number.isNaN(scale.y) || Number.isNaN(scale.z)) nanCount++;

    if (scale.x <= 0 || scale.y <= 0 || scale.z <= 0) {
      zeroScaleCount++;
    }

    // Verify pebbles are submerged in sunken riverbed (y between -0.45m and -0.25m)
    assert.ok(
      pos.y >= -0.45 && pos.y <= -0.25,
      `Pebble ${i} elevation Y (${pos.y.toFixed(3)}m) must be situated in sunken riverbed trough [-0.45m, -0.25m]`
    );

    // Verify pebbles are strictly clamped within explorable map bounds [-40.5, 40.5]
    assert.ok(
      Math.abs(pos.x) <= 40.5 + 1e-4 && Math.abs(pos.z) <= 40.5 + 1e-4,
      `Pebble ${i} position (${pos.x.toFixed(2)}, ${pos.z.toFixed(2)}) must be strictly clamped within bounds [-40.5, 40.5]`
    );
  }

  assert.equal(nanCount, 0, 'Zero NaNs in pebble instance matrices');
  assert.equal(zeroScaleCount, 0, 'Zero degenerate scale pebble instances');
});

test('Challenger 2.2: Pebbles bounding boxes and color buffer validation', () => {
  const { world } = createTestWorld();
  const pebblesMesh = world.riverPebblesMesh;

  pebblesMesh.geometry.computeBoundingBox();
  const geoBox = pebblesMesh.geometry.boundingBox;

  assert.ok(geoBox, 'Geometry bounding box computed');
  assert.ok(Number.isFinite(geoBox.min.x) && !Number.isNaN(geoBox.min.x));
  assert.ok(Number.isFinite(geoBox.max.x) && !Number.isNaN(geoBox.max.x));

  // Verify instance colors
  assert.ok(pebblesMesh.instanceColor, 'Pebbles have instanceColor buffer');
  assert.equal(pebblesMesh.instanceColor.count, 70, '70 instance color elements');

  const color = new THREE.Color();
  for (let i = 0; i < pebblesMesh.count; i++) {
    pebblesMesh.getColorAt(i, color);
    assert.ok(!Number.isNaN(color.r) && !Number.isNaN(color.g) && !Number.isNaN(color.b));
    assert.ok(color.r >= 0 && color.r <= 1.0);
    assert.ok(color.g >= 0 && color.g <= 1.0);
    assert.ok(color.b >= 0 && color.b <= 1.0);
  }
});

test('Challenger 2.3: Deterministic pebble placement reproducibility across multiple WorldManager instances', () => {
  const { world: worldA } = createTestWorld();
  const { world: worldB } = createTestWorld();

  const matA = new THREE.Matrix4();
  const matB = new THREE.Matrix4();

  for (let i = 0; i < 70; i++) {
    worldA.riverPebblesMesh.getMatrixAt(i, matA);
    worldB.riverPebblesMesh.getMatrixAt(i, matB);

    for (let el = 0; el < 16; el++) {
      assert.equal(
        matA.elements[el],
        matB.elements[el],
        `Pebble ${i} matrix element ${el} must match deterministically across world instances`
      );
    }
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// CHALLENGE 3: RUSTIC DOCKS FLOATING BOBBING AMPLITUDE OVER 10,000 STEPS
// ─────────────────────────────────────────────────────────────────────────────

test('Challenger 3.1: Floating dock bobbing amplitude strictly <= 0.04m with 0 NaNs over 10,000 steps', () => {
  const { world } = createTestWorld();

  assert.ok(world.docks, 'world.docks exists');
  assert.equal(world.docks.length, 2, 'Exactly 2 docks configured');

  const numSteps = 10000;
  const dt = 0.016;
  let maxBobbing = 0.0;
  let nanCount = 0;

  for (let s = 0; s < numSteps; s++) {
    const elapsed = s * dt;
    world.update(dt, elapsed);

    for (let d = 0; d < world.docks.length; d++) {
      const dock = world.docks[d];
      const y = dock.group.position.y;
      if (Number.isNaN(y) || !Number.isFinite(y)) {
        nanCount++;
      }
      const bobbing = Math.abs(y - dock.baseY);
      if (bobbing > maxBobbing) {
        maxBobbing = bobbing;
      }
    }
  }

  assert.equal(nanCount, 0, 'Zero NaNs in dock group elevation over 10,000 steps');
  assert.ok(
    maxBobbing <= 0.04,
    `Floating dock bobbing amplitude must be <= 0.04m, observed: ${maxBobbing.toFixed(6)}m`
  );
  assert.ok(
    maxBobbing >= 0.0049,
    `Dock actively oscillates with intended subtle wave motion (0.005m amplitude), observed: ${maxBobbing.toFixed(6)}m`
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// CHALLENGE 4: RUSTIC DOCKS POSITIONING & PLAYER STEPPING TRAVERSAL
// ─────────────────────────────────────────────────────────────────────────────

test('Challenger 4.1: Dock 2 (Southern canyon approach) allows clean player stepping onto and off dock', () => {
  const { scene, world } = createTestWorld();
  const player = createTestPlayer(scene);
  const camera = createMockCamera();

  const dock2 = world.docks[1];
  assert.equal(dock2.baseY, 0.12, 'Dock 2 elevation is 0.12m');

  // Approach Dock 2 from valley floor at (12.0, 0.0, -2.5) walking East (+X) onto dock at (14.5, -2.5)
  player.reset(12.0, -2.5);
  player.isGrounded = true;

  const moveEast = new THREE.Vector3(1, 0, 0);

  let steppedOntoDock = false;
  for (let step = 0; step < 10; step++) {
    player.update(0.05, moveEast, false, false, false, camera, world);
    if (Math.abs(player.position.x - 14.5) < 0.5) {
      steppedOntoDock = true;
    }
  }

  assert.ok(steppedOntoDock, 'Player stepped onto Dock 2 footprint without collision block');
  assert.equal(player.isGrounded, true, 'Player remains grounded on Dock 2');

  // Walk off Dock 2 heading West (-X) back to valley floor
  const moveWest = new THREE.Vector3(-1, 0, 0);
  let steppedOffDock = false;
  for (let step = 0; step < 10; step++) {
    player.update(0.05, moveWest, false, false, false, camera, world);
    if (player.position.x <= 12.5) {
      steppedOffDock = true;
    }
  }

  assert.ok(steppedOffDock, 'Player stepped off Dock 2 back onto valley floor cleanly');
  assert.equal(player.isGrounded, true, 'Player grounded after stepping off Dock 2');
});

test('Challenger 4.2: Dock 1 (Central valley crossing) allows clean player stepping onto and off dock without cliff obstruction', () => {
  const { scene, world } = createTestWorld();
  const player = createTestPlayer(scene);
  const camera = createMockCamera();

  const dock1 = world.docks[0];

  // 1. Verify dock configuration is located outside Plateau North (z < 5.0m)
  assert.ok(dock1.group.position.z < 5.0, `Dock 1 Z (${dock1.group.position.z.toFixed(2)}m) must be south of Plateau North cliff boundary (z < 5.0m)`);
  assert.equal(dock1.baseY, 0.12, 'Dock 1 visual baseY is 0.12m');

  // 2. Verify ground height at Dock 1 coordinates is valley floor (0.0m), NOT Plateau North (3.5m)
  const dockGroundH = world.getGroundHeight(dock1.group.position.x, dock1.group.position.z);
  assert.equal(
    dockGroundH,
    0.0,
    `Ground height at Dock 1 coordinates (${dock1.group.position.x}, ${dock1.group.position.z}) must be 0.0m (valley floor)`
  );

  // 3. Approach Dock 1 from spawn (0, 0)
  player.reset(0, 0);
  player.isGrounded = true;

  const targetPos = dock1.group.position;
  const dirToDock1 = new THREE.Vector3(targetPos.x, 0, targetPos.z).normalize();

  let reachedDock = false;
  for (let step = 0; step < 25; step++) {
    player.update(0.05, dirToDock1, false, false, false, camera, world);
    if (player.position.distanceTo(new THREE.Vector3(targetPos.x, player.position.y, targetPos.z)) < 1.0) {
      reachedDock = true;
      break;
    }
  }

  assert.ok(reachedDock, 'Player stepped onto Dock 1 footprint without collision block');
  assert.equal(player.isGrounded, true, 'Player remains grounded on Dock 1');

  // 4. Walk off Dock 1 heading back toward spawn (0, 0)
  const dirBack = new THREE.Vector3(-targetPos.x, 0, -targetPos.z).normalize();
  let walkedOff = false;
  for (let step = 0; step < 15; step++) {
    player.update(0.05, dirBack, false, false, false, camera, world);
    if (player.position.distanceTo(new THREE.Vector3(targetPos.x, player.position.y, targetPos.z)) > 1.5) {
      walkedOff = true;
      break;
    }
  }

  assert.ok(walkedOff, 'Player stepped off Dock 1 back onto valley floor cleanly');
  assert.equal(player.isGrounded, true, 'Player grounded after stepping off Dock 1');
});

test('Challenger 4.3: Spawning player on Dock 1 maintains stable valley/deck elevation without mid-air snapping', () => {
  const { scene, world } = createTestWorld();
  const player = createTestPlayer(scene);
  const camera = createMockCamera();

  const dock1 = world.docks[0];

  // Position player directly at Dock 1's intended coordinates
  player.position.set(dock1.group.position.x, dock1.baseY, dock1.group.position.z);
  player.velocity.set(0, 0, 0);
  player.isGrounded = false;

  // Run 1 physics frame
  player.update(0.016, new THREE.Vector3(0, 0, 0), false, false, false, camera, world);

  // Assert player does NOT snap to 3.5m mid-air cliff
  assert.notEqual(
    player.position.y,
    3.5,
    'Player at Dock 1 must NOT be snapped 3.38m into mid-air onto Plateau North'
  );
  assert.ok(
    player.position.y <= 0.20,
    `Player elevation (${player.position.y.toFixed(2)}m) must remain at dock/valley ground level (<= 0.20m)`
  );
});

test('Challenger 2.4: Multi-instance deterministic pebble matrices (3 instances) and strict [-40.5, 40.5]m boundary enforcement', () => {
  const { world: w1 } = createTestWorld();
  const { world: w2 } = createTestWorld();
  const { world: w3 } = createTestWorld();

  const m1 = new THREE.Matrix4();
  const m2 = new THREE.Matrix4();
  const m3 = new THREE.Matrix4();
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const scale = new THREE.Vector3();

  assert.equal(w1.riverPebblesMesh.count, 70, 'Instance 1 count is 70');
  assert.equal(w2.riverPebblesMesh.count, 70, 'Instance 2 count is 70');
  assert.equal(w3.riverPebblesMesh.count, 70, 'Instance 3 count is 70');

  for (let i = 0; i < 70; i++) {
    w1.riverPebblesMesh.getMatrixAt(i, m1);
    w2.riverPebblesMesh.getMatrixAt(i, m2);
    w3.riverPebblesMesh.getMatrixAt(i, m3);

    // 1. Bit-exact determinism across 3 separate instances
    for (let el = 0; el < 16; el++) {
      assert.equal(
        m1.elements[el],
        m2.elements[el],
        `Pebble ${i} matrix el ${el} mismatch between w1 and w2`
      );
      assert.equal(
        m1.elements[el],
        m3.elements[el],
        `Pebble ${i} matrix el ${el} mismatch between w1 and w3`
      );
    }

    // 2. Strict spatial bounds
    m1.decompose(pos, quat, scale);
    assert.ok(
      pos.x >= -40.5 && pos.x <= 40.5,
      `Pebble ${i} pos.x (${pos.x}) must be strictly within [-40.5, 40.5]m`
    );
    assert.ok(
      pos.z >= -40.5 && pos.z <= 40.5,
      `Pebble ${i} pos.z (${pos.z}) must be strictly within [-40.5, 40.5]m`
    );
    assert.ok(
      pos.y >= -0.45 && pos.y <= -0.25,
      `Pebble ${i} pos.y (${pos.y}) must be strictly within sunken bed [-0.45, -0.25]m`
    );
    assert.ok(scale.x > 0 && scale.y > 0 && scale.z > 0, `Pebble ${i} scale must be positive`);
  }
});

test('Challenger 4.4: Dense grid sampling across Dock 1 rotated footprint and village approach path asserting getGroundHeight === 0.0m', () => {
  const { world } = createTestWorld();
  const dock1 = world.docks[0];
  const { x: cx, z: cz } = dock1.group.position;
  const rotY = dock1.group.rotation.y;
  const w = 3.2;
  const d = 1.8;
  const cosR = Math.cos(rotY);
  const sinR = Math.sin(rotY);

  // 1. Dense grid over Dock 1 rotated rectangle (step size 0.1m)
  let sampledPoints = 0;
  for (let u = -w / 2; u <= w / 2 + 1e-6; u += 0.1) {
    for (let v = -d / 2; v <= d / 2 + 1e-6; v += 0.1) {
      const wx = cx + (u * cosR + v * sinR);
      const wz = cz + (-u * sinR + v * cosR);
      const gh = world.getGroundHeight(wx, wz);

      assert.equal(
        gh,
        0.0,
        `Ground height at Dock 1 sample point (${wx.toFixed(3)}, ${wz.toFixed(3)}) [local u=${u.toFixed(2)}, v=${v.toFixed(2)}] must be strictly 0.0m, got ${gh}m`
      );
      sampledPoints++;
    }
  }
  assert.ok(sampledPoints >= 600, `Sampled ${sampledPoints} points across Dock 1 footprint`);

  // 2. Dense sampling along village approach path from spawn (0, 0) through stepping stones to Dock 1
  const pathNodes = [
    [0.0, 0.0],
    [-0.5, 0.9],
    [-1.0, 1.8],
    [-1.5, 2.6],
    [-2.0, 3.2],
    [cx, cz],
  ];

  let pathSamples = 0;
  for (let n = 0; n < pathNodes.length - 1; n++) {
    const [p0x, p0z] = pathNodes[n];
    const [p1x, p1z] = pathNodes[n + 1];

    for (let t = 0; t <= 1.0; t += 0.05) {
      // Centerline sample
      const px = THREE.MathUtils.lerp(p0x, p1x, t);
      const pz = THREE.MathUtils.lerp(p0z, p1z, t);

      // Check centerline and lateral corridor +/- 1.0m
      for (let offset = -1.0; offset <= 1.0; offset += 0.5) {
        const gh = world.getGroundHeight(px + offset, pz);
        assert.equal(
          gh,
          0.0,
          `Approach path sample at (${(px + offset).toFixed(2)}, ${pz.toFixed(2)}) must be strictly 0.0m, got ${gh}m`
        );
        pathSamples++;
      }
    }
  }
  assert.ok(pathSamples >= 100, `Sampled ${pathSamples} points along village approach path`);
});

test('Challenger 4.5: Multi-directional player stepping onto Dock 1 from valley asserting deck height <= 0.20m and zero levitation', () => {
  const { scene, world } = createTestWorld();
  const camera = createMockCamera();
  const dock1 = world.docks[0];
  const targetX = dock1.group.position.x;
  const targetZ = dock1.group.position.z;

  // Assert deck visual elevation is <= 0.20m across time
  for (let s = 0; s < 100; s++) {
    world.update(0.016, s * 0.016);
    const deckY = dock1.group.position.y;
    assert.ok(
      deckY <= 0.20 && deckY >= 0.10,
      `Dock 1 deck height (${deckY.toFixed(4)}m) must be within [0.10m, 0.20m]`
    );
  }

  // Test player approaches from 4 different directions: South, East, West, and Spawn (SE)
  const approaches = [
    { name: 'South', start: [targetX, targetZ - 2.5] },
    { name: 'East', start: [targetX + 2.5, targetZ] },
    { name: 'West', start: [targetX - 2.0, targetZ] },
    { name: 'SpawnPath', start: [0.0, 0.0] },
  ];

  for (const appr of approaches) {
    const player = createTestPlayer(scene);
    player.reset(appr.start[0], appr.start[1]);
    player.isGrounded = true;

    const dir = new THREE.Vector3(targetX - appr.start[0], 0, targetZ - appr.start[1]).normalize();

    let reachedDock = false;
    for (let step = 0; step < 30; step++) {
      player.update(0.05, dir, false, false, false, camera, world);

      // Verify zero levitation at every single physics step
      assert.ok(
        player.position.y <= 0.20,
        `[${appr.name}] Player levitated to ${player.position.y}m during approach (must be <= 0.20m)`
      );
      assert.equal(
        player.isGrounded,
        true,
        `[${appr.name}] Player must remain grounded during step ${step}`
      );

      const dist = Math.hypot(player.position.x - targetX, player.position.z - targetZ);
      if (dist < 1.0) {
        reachedDock = true;
        break;
      }
    }

    assert.ok(reachedDock, `[${appr.name}] Player failed to step onto Dock 1 footprint`);
    assert.ok(
      player.position.y <= 0.20,
      `[${appr.name}] Player height on Dock 1 (${player.position.y}m) must be <= 0.20m`
    );
    assert.notEqual(
      player.position.y,
      3.5,
      `[${appr.name}] Player snapped to Plateau North 3.5m cliff!`
    );
  }
});

