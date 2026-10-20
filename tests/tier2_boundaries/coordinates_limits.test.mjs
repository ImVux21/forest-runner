// ===================================================
// coordinates_limits.test.mjs — Tier 2: Coordinate Extremes & Boundary Limits
// ===================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import '../helpers/headless_env.mjs';
import { TerrainModel } from '../helpers/analytical_models.mjs';
import { createTestWorld, createTestPlayer } from '../helpers/test_fixtures.mjs';

test('T2.1: Extreme coordinate inputs clamp strictly to map bounds [-86.5, 86.5]', () => {
  const { scene, world } = createTestWorld();
  const player = createTestPlayer(scene);

  const mockCamera = {
    getForwardVector: () => new THREE.Vector3(0, 0, -1),
    getRightVector: () => new THREE.Vector3(1, 0, 0),
  };

  // Teleport player near positive extreme
  player.position.set(1000.0, 0.0, 5000.0);
  const inputDir = new THREE.Vector3(1, 0, 1);
  player.update(0.1, inputDir, false, false, false, mockCamera, world);

  assert.equal(player.position.x, 86.5, 'X clamped to +86.5');
  assert.equal(player.position.z, 86.5, 'Z clamped to +86.5');

  // Negative extreme
  player.position.set(-9999.0, 0.0, -8888.0);
  player.update(0.1, inputDir, false, false, false, mockCamera, world);

  assert.equal(player.position.x, -86.5, 'X clamped to -86.5');
  assert.equal(player.position.z, -86.5, 'Z clamped to -86.5');
});

test('T2.2: Boundary border corners diagonal containment', () => {
  const corners = [
    { x: 86.5, z: 86.5 },
    { x: -86.5, z: 86.5 },
    { x: 86.5, z: -86.5 },
    { x: -86.5, z: -86.5 },
  ];

  for (const c of corners) {
    const clampedX = THREE.MathUtils.clamp(c.x, -TerrainModel.EXPLORABLE_BOUND, TerrainModel.EXPLORABLE_BOUND);
    const clampedZ = THREE.MathUtils.clamp(c.z, -TerrainModel.EXPLORABLE_BOUND, TerrainModel.EXPLORABLE_BOUND);
    assert.equal(clampedX, c.x);
    assert.equal(clampedZ, c.z);
  }
});

test('T2.3: Zero and negative-zero coordinate precision', () => {
  const { world } = createTestWorld();

  const hZero = world.getGroundHeight(0.0, 0.0);
  const hNegZero = world.getGroundHeight(-0.0, +0.0);
  const hEpsilon = world.getGroundHeight(1e-12, -1e-12);

  assert.equal(hZero, 0.0);
  assert.equal(hNegZero, 0.0);
  assert.equal(hEpsilon, 0.0);
});

test('T2.4: Out-of-bounds terrain query graceful return (valley fallback)', () => {
  const { world } = createTestWorld();

  // Queries far beyond map borders should safely return valley base 0.0m without throwing
  assert.equal(world.getGroundHeight(500, 500), 0.0);
  assert.equal(world.getGroundHeight(-500, -500), 0.0);
  assert.equal(world.getGroundHeight(10000, 0), 0.0);
});

test('T2.5: Near-border motion does not leak outside perimeter wall', () => {
  const { scene, world } = createTestWorld();
  const player = createTestPlayer(scene);

  const mockCamera = {
    getForwardVector: () => new THREE.Vector3(0, 0, -1),
    getRightVector: () => new THREE.Vector3(1, 0, 0),
  };

  // Place player right at edge (86.4, 0, 0) and sprint outward (+X)
  player.position.set(86.4, 0.0, 0.0);
  const sprintRight = new THREE.Vector3(1, 0, 0);

  // Update multiple frames outward
  for (let f = 0; f < 10; f++) {
    player.update(0.05, sprintRight, false, true, false, mockCamera, world);
    assert.ok(
      player.position.x <= 86.5,
      `Player X ${player.position.x} must never exceed 86.5m perimeter wall`
    );
  }
});

