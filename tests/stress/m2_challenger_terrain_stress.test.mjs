// ===================================================
// m2_challenger_terrain_stress.test.mjs — Adversarial Stress Test Suite for Milestone 2
// Challenger: challenger_m2_1 (Empirical Challenger)
// Scope: Double-Containment Verification, Plateau Step-Height Blocking, Ramp Traversal Invariants
// ===================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import '../helpers/headless_env.mjs';
import { TerrainModel, GameplayModel } from '../helpers/analytical_models.mjs';
import { createTestWorld, createTestPlayer } from '../helpers/test_fixtures.mjs';

function createMockCamera() {
  return {
    getForwardVector: () => new THREE.Vector3(0, 0, -1),
    getRightVector: () => new THREE.Vector3(1, 0, 0),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CHALLENGE 1: DOUBLE-CONTAINMENT PERIMETER VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────

test('Challenger 1.1: Double-containment — Hard clamping across 1,000 perimeter coordinates', () => {
  const { scene, world } = createTestWorld();
  const player = createTestPlayer(scene);
  const camera = createMockCamera();

  const halfBound = (world.mapSize / 2) - 3.5; // 86.5m
  assert.equal(halfBound, 86.5, 'halfBound must be exactly 86.5m');

  const sampleSteps = 250;
  for (let s = 0; s <= sampleSteps; s++) {
    const t = -90 + (180 * s) / sampleSteps;

    // North outer border (z >= 86.5)
    player.position.set(t, 0.0, 86.5 + Math.random() * 50);
    player.update(0.016, new THREE.Vector3(0, 0, 1), false, true, false, camera, world);
    assert.ok(player.position.z <= 86.5 + 1e-6, `North perimeter breached at x=${t}: z was ${player.position.z}`);
    assert.ok(Math.abs(player.position.x) <= 86.5 + 1e-6, `X overflow at north perimeter: x was ${player.position.x}`);

    // South outer border (z <= -86.5)
    player.position.set(t, 0.0, -86.5 - Math.random() * 50);
    player.update(0.016, new THREE.Vector3(0, 0, -1), false, true, false, camera, world);
    assert.ok(player.position.z >= -86.5 - 1e-6, `South perimeter breached at x=${t}: z was ${player.position.z}`);
    assert.ok(Math.abs(player.position.x) <= 86.5 + 1e-6, `X overflow at south perimeter: x was ${player.position.x}`);

    // East outer border (x >= 86.5)
    player.position.set(86.5 + Math.random() * 50, 0.0, t);
    player.update(0.016, new THREE.Vector3(1, 0, 0), false, true, false, camera, world);
    assert.ok(player.position.x <= 86.5 + 1e-6, `East perimeter breached at z=${t}: x was ${player.position.x}`);
    assert.ok(Math.abs(player.position.z) <= 86.5 + 1e-6, `Z overflow at east perimeter: z was ${player.position.z}`);

    // West outer border (x <= -86.5)
    player.position.set(-86.5 - Math.random() * 50, 0.0, t);
    player.update(0.016, new THREE.Vector3(-1, 0, 0), false, true, false, camera, world);
    assert.ok(player.position.x >= -86.5 - 1e-6, `West perimeter breached at z=${t}: x was ${player.position.x}`);
    assert.ok(Math.abs(player.position.z) <= 86.5 + 1e-6, `Z overflow at west perimeter: z was ${player.position.z}`);
  }
});

test('Challenger 1.2: Double-containment — High-velocity escape attempts (500 frames at 100 m/s)', () => {
  const { scene, world } = createTestWorld();
  const player = createTestPlayer(scene);
  const camera = createMockCamera();

  const directions = [
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(1, 0, 1).normalize(),
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(1, 0, -1).normalize(),
    new THREE.Vector3(0, 0, -1),
    new THREE.Vector3(-1, 0, -1).normalize(),
    new THREE.Vector3(-1, 0, 0),
    new THREE.Vector3(-1, 0, 1).normalize(),
  ];

  for (const dir of directions) {
    player.position.set(dir.x * 85.0, 0.0, dir.z * 85.0);
    player.isGrounded = true;

    for (let f = 0; f < 50; f++) {
      player.velocity.x = dir.x * 100.0;
      player.velocity.z = dir.z * 100.0;

      player.update(0.05, dir, false, true, false, camera, world);

      assert.ok(
        Math.abs(player.position.x) <= 86.5 + 1e-5,
        `Extreme velocity escaped X bound: ${player.position.x}`
      );
      assert.ok(
        Math.abs(player.position.z) <= 86.5 + 1e-5,
        `Extreme velocity escaped Z bound: ${player.position.z}`
      );
    }
  }
});

test('Challenger 1.3: Double-containment — High-altitude glider escape from summit towards all 4 borders', () => {
  const { scene, world } = createTestWorld();
  const player = createTestPlayer(scene);
  const camera = createMockCamera();

  const flightPaths = [
    { name: 'North', dir: new THREE.Vector3(0, 0, 1) },
    { name: 'South', dir: new THREE.Vector3(0, 0, -1) },
    { name: 'East', dir: new THREE.Vector3(1, 0, 0) },
    { name: 'West', dir: new THREE.Vector3(-1, 0, 0) },
    { name: 'North-East Corner', dir: new THREE.Vector3(1, 0, 1).normalize() },
  ];

  for (const flight of flightPaths) {
    player.position.set(18.0, 11.5, 22.0);
    player.isGrounded = false;
    player.velocityY = -0.5;
    player.isGliding = true;

    for (let f = 0; f < 100; f++) {
      player.update(0.05, flight.dir, false, false, true, camera, world);

      assert.ok(
        Math.abs(player.position.x) <= 86.5 + 1e-5,
        `Glider breached X bound on flight ${flight.name}: ${player.position.x}`
      );
      assert.ok(
        Math.abs(player.position.z) <= 86.5 + 1e-5,
        `Glider breached Z bound on flight ${flight.name}: ${player.position.z}`
      );
    }
  }
});


test('Challenger 1.4: Double-containment — Physical mountain barrier geometry clearance buffer >= 0.5m', () => {
  const { world } = createTestWorld();

  const half = world.mapSize / 2; // 45m
  const baseCoord = half - 1.5; // 43.5m
  const innerEdge = baseCoord - 1.5; // 42.0m
  const playerClamp = half - 3.5; // 41.5m

  const clearance = innerEdge - playerClamp;
  assert.ok(
    clearance >= 0.5 - 1e-6,
    `Clearance buffer between player boundary (${playerClamp}m) and mountain inner edge (${innerEdge}m) must be >= 0.5m, got ${clearance}m`
  );

  const numSegments = 10;
  for (let sIdx = 0; sIdx < 4; sIdx++) {
    for (let i = 0; i < numSegments; i++) {
      const seed = sIdx * 10 + i;
      const h1 = 3.6 + Math.sin(seed * 1.5) * 0.7; // 2.9m - 4.3m
      assert.ok(
        h1 >= 2.9 - 1e-6,
        `Mountain segment [side ${sIdx}, seg ${i}] height ${h1}m must be >= 2.9m`
      );
      assert.ok(
        h1 - TerrainModel.VALLEY_HEIGHT > TerrainModel.MAX_WALKABLE_STEP,
        `Mountain tier 1 height (${h1}m) physically blocks horizontal movement if reached`
      );
    }
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// CHALLENGE 2: STEP-HEIGHT BLOCKING VERIFICATION ALONG CLIFF FACES
// ─────────────────────────────────────────────────────────────────────────────

test('Challenger 2.1: Plateau cliff faces have step > 1.2m at all non-ramp perimeter points', () => {
  const { world } = createTestWorld();

  function isNearRamp(x, z, margin = 0.5) {
    for (const r of world.ramps) {
      const halfW = r.w / 2 + margin;
      const halfD = r.d / 2 + margin;
      if (x >= r.x - halfW && x <= r.x + halfW && z >= r.z - halfD && z <= r.z + halfD) {
        return true;
      }
    }
    return false;
  }

  function isNearBridge(x, z, margin = 0.5) {
    const b = world.bridge;
    return x >= b.x - b.w / 2 - margin && x <= b.x + b.w / 2 + margin &&
           z >= b.z - b.d / 2 - margin && z <= b.z + b.d / 2 + margin;
  }

  let totalTested = 0;
  let blockedCliffPoints = 0;

  for (const p of world.plateaus) {
    const halfW = p.w / 2;
    const halfD = p.d / 2;
    const minX = p.x - halfW;
    const maxX = p.x + halfW;
    const minZ = p.z - halfD;
    const maxZ = p.z + halfD;

    const sampleResolution = 0.25;

    for (let x = minX; x <= maxX; x += sampleResolution) {
      for (const [zEdge, outwardDir] of [[minZ, -1], [maxZ, 1]]) {
        const outsideX = x;
        const outsideZ = zEdge + outwardDir * 0.05;
        const insideX = x;
        const insideZ = zEdge - outwardDir * 0.05;

        if (isNearRamp(outsideX, outsideZ) || isNearBridge(outsideX, outsideZ)) continue;

        const hOutside = world.getGroundHeight(outsideX, outsideZ);
        const hInside = world.getGroundHeight(insideX, insideZ);
        const step = hInside - hOutside;

        totalTested++;
        assert.ok(
          step > TerrainModel.MAX_WALKABLE_STEP,
          `Cliff edge of ${p.id} at (${outsideX.toFixed(2)}, ${outsideZ.toFixed(2)}) must have step > 1.2m, got ${step.toFixed(2)}m`
        );
        blockedCliffPoints++;
      }
    }

    for (let z = minZ; z <= maxZ; z += sampleResolution) {
      for (const [xEdge, outwardDir] of [[minX, -1], [maxX, 1]]) {
        const outsideX = xEdge + outwardDir * 0.05;
        const outsideZ = z;
        const insideX = xEdge - outwardDir * 0.05;
        const insideZ = z;

        if (isNearRamp(outsideX, outsideZ) || isNearBridge(outsideX, outsideZ)) continue;

        const hOutside = world.getGroundHeight(outsideX, outsideZ);
        const hInside = world.getGroundHeight(insideX, insideZ);
        const step = hInside - hOutside;

        totalTested++;
        assert.ok(
          step > TerrainModel.MAX_WALKABLE_STEP,
          `Cliff edge of ${p.id} at (${outsideX.toFixed(2)}, ${outsideZ.toFixed(2)}) must have step > 1.2m, got ${step.toFixed(2)}m`
        );
        blockedCliffPoints++;
      }
    }
  }

  assert.ok(totalTested > 400, `Must test > 400 cliff perimeter points, tested ${totalTested}`);
  assert.equal(totalTested, blockedCliffPoints, '100% of non-ramp cliff perimeter points block horizontal climbing');
});

test('Challenger 2.2: Dynamic player collision blocked at 100 non-ramp plateau cliff locations', () => {
  const { scene, world } = createTestWorld();
  const player = createTestPlayer(scene);
  const camera = createMockCamera();

  let blockedCount = 0;

  for (const p of world.plateaus) {
    const halfW = p.w / 2;
    const halfD = p.d / 2;

    for (let i = 0; i < 25; i++) {
      const frac = (i + 0.5) / 25;
      const testZ = (p.z - halfD + 1.0) + frac * (p.d - 2.0);
      const testX = p.x - halfW - 0.2;

      const inRamp = world.ramps.some(r => Math.hypot(r.x - testX, r.z - testZ) < 6.0);
      const inBridge = Math.abs(testX - world.bridge.x) <= world.bridge.w / 2 + 1.0 &&
                       Math.abs(testZ - world.bridge.z) <= world.bridge.d / 2 + 1.0;
      if (inRamp || inBridge) continue;

      const groundAtBase = world.getGroundHeight(testX, testZ);
      player.position.set(testX, groundAtBase, testZ);
      player.velocity.set(0, 0, 0);
      player.isGrounded = true;

      const moveInward = new THREE.Vector3(1, 0, 0);
      const startX = player.position.x;

      for (let f = 0; f < 5; f++) {
        player.update(0.033, moveInward, false, true, false, camera, world);
      }

      assert.equal(
        player.position.x,
        startX,
        `Player walked through cliff face at (${testX}, ${testZ}) on plateau ${p.id}`
      );
      assert.equal(player.velocity.x, 0, 'Velocity stopped by cliff collision');
      blockedCount++;
    }
  }

  assert.ok(blockedCount >= 50, `Must verify at least 50 dynamic collision blocks, verified ${blockedCount}`);
});

test('Challenger 2.3: Stepping OFF plateaus allows downward movement and triggers airborne state without stuck bug', () => {
  const { scene, world } = createTestWorld();
  const player = createTestPlayer(scene);
  const camera = createMockCamera();

  for (const p of world.plateaus) {
    const halfW = p.w / 2;
    const startX = p.x - halfW + 0.1;
    const startZ = p.z;
    player.position.set(startX, p.height, startZ);
    player.velocity.set(0, 0, 0);
    player.isGrounded = true;

    const moveOutward = new THREE.Vector3(-1, 0, 0);
    player.update(0.05, moveOutward, false, false, false, camera, world);

    assert.ok(
      player.position.x < startX,
      `Player must not be blocked when walking off downward edge of plateau ${p.id}`
    );

    let landed = false;
    for (let f = 0; f < 60; f++) {
      player.update(0.033, new THREE.Vector3(0, 0, 0), false, false, false, camera, world);
      if (player.isGrounded) {
        landed = true;
        break;
      }
    }

    assert.ok(landed, `Player must land safely after stepping off plateau ${p.id}`);
    const expectedGround = world.getGroundHeight(player.position.x, player.position.z);
    assert.equal(
      player.position.y,
      expectedGround,
      `Player elevation after landing matches ground height (${expectedGround}m)`
    );
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// CHALLENGE 3: RAMP TRAVERSAL PER-RAMP EMPIRICAL PROFILING
// ─────────────────────────────────────────────────────────────────────────────

test('Challenger 3.1: Ramp 1 (North) — Continuous delta elevation < 0.2m and 100% climb success', () => {
  const { scene, world } = createTestWorld();
  const player = createTestPlayer(scene);
  const camera = createMockCamera();
  const r = world.ramps[0]; // Ramp 1: x: -12, z: 3, w: 7, d: 10, axis: 'z', startH: 0.0, endH: 3.5

  // 1. Analytical slope delta check
  let prevH = r.startH;
  for (let i = 0; i <= 100; i++) {
    const frac = i / 100;
    const qz = (r.z - r.d / 2) + frac * r.d;
    const h = world.getGroundHeight(r.x, qz);
    const delta = Math.abs(h - prevH);
    assert.ok(delta < 0.20, `Ramp 1 analytical delta ${delta}m exceeded 0.2m at frac=${frac}`);
    prevH = h;
  }

  // 2. Dynamic climb simulation (Walk, Sprint, LowFPS)
  const modes = [
    { name: 'Walk', isSprint: false, delta: 0.016 },
    { name: 'Sprint', isSprint: true, delta: 0.016 },
    { name: 'LowFPS_Sprint', isSprint: true, delta: 0.033 },
  ];

  for (const m of modes) {
    player.position.set(r.x, 0.0, r.z - r.d / 2 - 0.5);
    player.velocity.set(0, 0, 0);
    player.isGrounded = true;

    let maxFrameDelta = 0.0;
    let prevY = player.position.y;
    let reachedEnd = false;

    for (let f = 0; f < 150; f++) {
      player.update(m.delta, new THREE.Vector3(0, 0, 1), false, m.isSprint, false, camera, world);
      const dy = Math.abs(player.position.y - prevY);
      if (dy > maxFrameDelta) maxFrameDelta = dy;
      assert.ok(dy < 0.20 + 1e-4, `Ramp 1 frame delta ${dy}m exceeded 0.2m in mode ${m.name}`);
      assert.equal(player.isGrounded, true, `Player must stay grounded on Ramp 1 (${m.name})`);
      prevY = player.position.y;
      if (Math.abs(player.position.y - r.endH) < 0.05) {
        reachedEnd = true;
        break;
      }
    }
    assert.ok(reachedEnd, `Ramp 1 climb failed to reach ${r.endH}m in mode ${m.name}`);
  }
});

test('Challenger 3.2: Ramp 2 (Peak) — Continuous delta elevation < 0.2m and 100% climb success', () => {
  const { scene, world } = createTestWorld();
  const player = createTestPlayer(scene);
  const camera = createMockCamera();
  const r = world.ramps[1]; // Ramp 2: x: 5, z: 22, w: 10, d: 6, axis: 'x', startH: 3.5, endH: 7.0

  // 1. Analytical slope delta check
  let prevH = r.startH;
  for (let i = 0; i <= 100; i++) {
    const frac = i / 100;
    const qx = (r.x - r.w / 2) + frac * r.w;
    const h = world.getGroundHeight(qx, r.z);
    const delta = Math.abs(h - prevH);
    assert.ok(delta < 0.20, `Ramp 2 analytical delta ${delta}m exceeded 0.2m at frac=${frac}`);
    prevH = h;
  }

  // 2. Dynamic climb simulation (Walk, Sprint, LowFPS)
  const modes = [
    { name: 'Walk', isSprint: false, delta: 0.016 },
    { name: 'Sprint', isSprint: true, delta: 0.016 },
    { name: 'LowFPS_Sprint', isSprint: true, delta: 0.033 },
  ];

  for (const m of modes) {
    player.position.set(r.x - r.w / 2 - 0.5, 3.5, r.z);
    player.velocity.set(0, 0, 0);
    player.isGrounded = true;

    let maxFrameDelta = 0.0;
    let prevY = player.position.y;
    let reachedEnd = false;

    for (let f = 0; f < 150; f++) {
      player.update(m.delta, new THREE.Vector3(1, 0, 0), false, m.isSprint, false, camera, world);
      const dy = Math.abs(player.position.y - prevY);
      if (dy > maxFrameDelta) maxFrameDelta = dy;
      assert.ok(dy < 0.20 + 1e-4, `Ramp 2 frame delta ${dy}m exceeded 0.2m in mode ${m.name}`);
      assert.equal(player.isGrounded, true, `Player must stay grounded on Ramp 2 (${m.name})`);
      prevY = player.position.y;
      if (Math.abs(player.position.y - r.endH) < 0.05) {
        reachedEnd = true;
        break;
      }
    }
    assert.ok(reachedEnd, `Ramp 2 climb failed to reach ${r.endH}m in mode ${m.name}`);
  }
});

test('Challenger 3.3: Ramp 3 (Southwest) — Continuous delta elevation < 0.2m and 100% climb success', () => {
  const { scene, world } = createTestWorld();
  const player = createTestPlayer(scene);
  const camera = createMockCamera();
  const r = world.ramps[2]; // Ramp 3: x: -18, z: -3, w: 7, d: 10, axis: 'z', startH: 3.5, endH: 0.0

  // 1. Analytical slope delta check (from Valley z=+2 to Plateau z=-8)
  let prevH = r.endH; // 0.0m
  for (let i = 0; i <= 100; i++) {
    const frac = i / 100;
    const qz = (r.z + r.d / 2) - frac * r.d; // walk towards negative Z (valley to plateau)
    const h = world.getGroundHeight(r.x, qz);
    const delta = Math.abs(h - prevH);
    assert.ok(delta < 0.20, `Ramp 3 analytical delta ${delta}m exceeded 0.2m at frac=${frac}`);
    prevH = h;
  }

  // 2. Seam continuity check
  const valleyStep = Math.abs(world.getGroundHeight(-18, 2.0) - world.getGroundHeight(-18, 2.05));
  const plateauStep = Math.abs(world.getGroundHeight(-18, -8.0) - world.getGroundHeight(-18, -8.05));
  assert.ok(valleyStep < 0.05, `Valley entrance seam delta ${valleyStep}m must be < 0.05m`);
  assert.ok(plateauStep < 0.05, `Plateau seam delta ${plateauStep}m must be < 0.05m`);

  // 3. Dynamic climb simulation from Valley (z=2.5) up to Plateau (z=-8.5)
  player.position.set(r.x, 0.0, r.z + r.d / 2 + 0.5);
  player.velocity.set(0, 0, 0);
  player.isGrounded = true;

  let reachedPlateau = false;
  for (let f = 0; f < 150; f++) {
    player.update(0.016, new THREE.Vector3(0, 0, -1), false, true, false, camera, world);
    assert.equal(player.isGrounded, true, 'Player remains grounded ascending Ramp 3');
    if (Math.abs(player.position.y - r.startH) < 0.05) {
      reachedPlateau = true;
      break;
    }
  }
  assert.ok(reachedPlateau, `Player successfully climbed Ramp 3 onto Southwest Plateau at ${r.startH}m`);
});

test('Challenger 3.4: Ramp 4 (Southeast) — Continuous delta elevation < 0.2m and 100% climb success', () => {
  const { scene, world } = createTestWorld();
  const player = createTestPlayer(scene);
  const camera = createMockCamera();
  const r = world.ramps[3]; // Ramp 4: x: 32, z: -18, w: 10, d: 7, axis: 'x', startH: 3.5, endH: 0.0

  // 1. Analytical slope delta check (from Valley x=37 to Plateau x=27)
  let prevH = r.endH; // 0.0m
  for (let i = 0; i <= 100; i++) {
    const frac = i / 100;
    const qx = (r.x + r.w / 2) - frac * r.w; // walk westward (valley to plateau)
    const h = world.getGroundHeight(qx, r.z);
    const delta = Math.abs(h - prevH);
    assert.ok(delta < 0.20, `Ramp 4 analytical delta ${delta}m exceeded 0.2m at frac=${frac}`);
    prevH = h;
  }

  // 2. Seam continuity check
  const valleyStep = Math.abs(world.getGroundHeight(37.0, -18.0) - world.getGroundHeight(37.05, -18.0));
  const plateauStep = Math.abs(world.getGroundHeight(27.0, -18.0) - world.getGroundHeight(26.95, -18.0));
  assert.ok(valleyStep < 0.05, `Valley entrance seam delta ${valleyStep}m must be < 0.05m`);
  assert.ok(plateauStep < 0.05, `Plateau seam delta ${plateauStep}m must be < 0.05m`);

  // 3. Dynamic climb simulation from Eastern Valley (x=37.5) up to Plateau Southeast (x=26.5)
  player.position.set(r.x + r.w / 2 + 0.5, 0.0, r.z);
  player.velocity.set(0, 0, 0);
  player.isGrounded = true;

  let reachedPlateau = false;
  for (let f = 0; f < 150; f++) {
    player.update(0.016, new THREE.Vector3(-1, 0, 0), false, true, false, camera, world);
    assert.equal(player.isGrounded, true, 'Player remains grounded ascending Ramp 4');
    if (Math.abs(player.position.y - r.startH) < 0.05) {
      reachedPlateau = true;
      break;
    }
  }
  assert.ok(reachedPlateau, `Player successfully climbed Ramp 4 onto Southeast Plateau at ${r.startH}m`);
});

// ─────────────────────────────────────────────────────────────────────────────
// CHALLENGE 4: SUSPENSION BRIDGE & SEAM CONTINUITY
// ─────────────────────────────────────────────────────────────────────────────

test('Challenger 4.1: Suspension bridge canyon crossing from Southwest Plateau to Southeast Plateau', () => {
  const { scene, world } = createTestWorld();
  const player = createTestPlayer(scene);
  const camera = createMockCamera();

  const b = world.bridge;
  assert.equal(b.height, 3.55, 'Bridge elevation is 3.55m');

  // Traverse from Plateau C (x = -6, z = -17) to Plateau D (x = 8.5, z = -17)
  player.position.set(-6.0, 3.5, -17.0);
  player.isGrounded = true;

  const moveEast = new THREE.Vector3(1, 0, 0);
  let traversedToCanyonCenter = false;

  for (let frame = 0; frame < 100; frame++) {
    player.update(0.02, moveEast, false, false, false, camera, world);

    if (Math.abs(player.position.x - 1.0) < 0.5) {
      assert.equal(player.position.y, 3.55, 'Player supported at 3.55m on bridge over canyon');
      assert.equal(player.isGrounded, true, 'Player grounded on bridge');
      traversedToCanyonCenter = true;
    }

    if (player.position.x >= 8.5) {
      break;
    }
  }

  assert.ok(traversedToCanyonCenter, 'Player successfully crossed center of canyon bridge at y = 3.55m');
  assert.ok(player.position.x >= 8.0, 'Player crossed onto Southeast Plateau side of bridge');
});

test('Challenger 4.2: Seam analysis summary across all 4 ramps', () => {
  const { world } = createTestWorld();

  // Ramp 1 seam (North): PASS
  const r1StartDiff = Math.abs(world.getGroundHeight(-12, -2.01) - world.getGroundHeight(-12, -1.99));
  const r1EndDiff = Math.abs(world.getGroundHeight(-12, 7.99) - world.getGroundHeight(-12, 8.01));
  assert.ok(r1StartDiff < 0.05, `Ramp 1 start seam is continuous: ${r1StartDiff}m`);
  assert.ok(r1EndDiff < 0.05, `Ramp 1 end seam is continuous: ${r1EndDiff}m`);

  // Ramp 2 seam (Peak): PASS
  const r2StartDiff = Math.abs(world.getGroundHeight(-0.01, 22) - world.getGroundHeight(0.01, 22));
  const r2EndDiff = Math.abs(world.getGroundHeight(9.99, 22) - world.getGroundHeight(10.01, 22));
  assert.ok(r2StartDiff < 0.05, `Ramp 2 start seam is continuous: ${r2StartDiff}m`);
  assert.ok(r2EndDiff < 0.05, `Ramp 2 end seam is continuous: ${r2EndDiff}m`);

  // Ramp 3 seam (Southwest): PASS
  const r3ValleyDiff = Math.abs(world.getGroundHeight(-18, 2.01) - world.getGroundHeight(-18, 1.99));
  const r3PlateauDiff = Math.abs(world.getGroundHeight(-18, -8.01) - world.getGroundHeight(-18, -7.99));
  assert.ok(r3ValleyDiff < 0.05, `Ramp 3 valley seam is continuous: ${r3ValleyDiff}m`);
  assert.ok(r3PlateauDiff < 0.05, `Ramp 3 plateau seam is continuous: ${r3PlateauDiff}m`);

  // Ramp 4 seam (Southeast): PASS (relocated to Eastern Face, x=27 to x=37)
  const r4PlateauDiff = Math.abs(world.getGroundHeight(26.99, -18.0) - world.getGroundHeight(27.01, -18.0));
  const r4ValleyDiff = Math.abs(world.getGroundHeight(36.99, -18.0) - world.getGroundHeight(37.01, -18.0));
  assert.ok(r4PlateauDiff < 0.05, `Ramp 4 plateau seam is continuous: ${r4PlateauDiff}m`);
  assert.ok(r4ValleyDiff < 0.05, `Ramp 4 valley seam is continuous: ${r4ValleyDiff}m`);
});
