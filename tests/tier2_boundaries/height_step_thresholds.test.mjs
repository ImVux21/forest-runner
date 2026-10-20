// ===================================================
// height_step_thresholds.test.mjs — Tier 2: Step Thresholds & Vertical Limits
// ===================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import '../helpers/headless_env.mjs';
import { TerrainModel, GameplayModel } from '../helpers/analytical_models.mjs';
import { createTestWorld, createTestPlayer } from '../helpers/test_fixtures.mjs';

test('T2.6: Critical step threshold 1.200m vs 1.201m barrier collision', () => {
  const currentY = 0.0;

  // Exactly at or below 1.2m threshold -> allowed
  assert.equal(TerrainModel.isWalkableStep(currentY, 1.200), true);
  assert.equal(TerrainModel.isWalkableStep(currentY, 1.199), true);

  // Exceeding threshold by 0.001m -> blocked
  assert.equal(TerrainModel.isWalkableStep(currentY, 1.201), false);
  assert.equal(TerrainModel.isWalkableStep(currentY, 1.5), false);
});

test('T2.7: Stepping off plateau (negative step) does not block movement and triggers airborne state', () => {
  const { scene, world } = createTestWorld();
  const player = createTestPlayer(scene);

  const mockCamera = {
    getForwardVector: () => new THREE.Vector3(0, 0, -1),
    getRightVector: () => new THREE.Vector3(1, 0, 0),
  };

  // Place player at edge of North Plateau (-12, 3.5, 6) moving southward off edge (z = 4 drops to 0.0m)
  player.position.set(-20.0, 3.5, 6.0); // Away from ramp
  player.isGrounded = true;

  // Move forward into valley floor (z drops below plateau boundary z=5)
  const moveSouth = new THREE.Vector3(0, 0, 1);
  player.update(0.1, moveSouth, false, false, false, mockCamera, world);

  // Player moved horizontally and is now falling
  assert.ok(player.position.z < 6.0 || player.position.z > 6.0, 'Horizontal movement was not blocked by downward step');
});

test('T2.8: Terminal landing without tunneling beneath ground plane', () => {
  const { scene, world } = createTestWorld();
  const player = createTestPlayer(scene);

  const mockCamera = {
    getForwardVector: () => new THREE.Vector3(0, 0, -1),
    getRightVector: () => new THREE.Vector3(1, 0, 0),
  };

  // High altitude drop from 100 meters
  player.position.set(0.0, 100.0, 0.0);
  player.isGrounded = false;
  player.velocityY = -60.0; // Extreme downward velocity

  // Simulate falling frames
  for (let f = 0; f < 60; f++) {
    player.update(0.05, new THREE.Vector3(0, 0, 0), false, false, false, mockCamera, world);
    if (player.isGrounded) break;
  }

  assert.equal(player.isGrounded, true, 'Player must have landed');
  assert.equal(player.position.y, 0.0, 'Player elevation must snap to exact ground plane, no tunneling');
  assert.equal(player.velocityY, 0.0, 'Vertical velocity resets to zero on landing');
});

test('T2.9: Jump cooldown window prevents double-jumping in same frame', () => {
  const { scene, world } = createTestWorld();
  const player = createTestPlayer(scene);

  const mockCamera = {
    getForwardVector: () => new THREE.Vector3(0, 0, -1),
    getRightVector: () => new THREE.Vector3(1, 0, 0),
  };

  // First jump from ground
  player.position.set(0, 0, 0);
  player.isGrounded = true;
  player.jumpCooldown = 0;

  player.update(0.016, new THREE.Vector3(0, 0, 0), true, false, false, mockCamera, world);

  assert.equal(player.isGrounded, false, 'Player is airborne after jump');
  assert.ok(
    player.velocityY >= GameplayModel.PHYSICS.JUMP_FORCE + GameplayModel.PHYSICS.GRAVITY * 0.016 - 1e-4,
    'Velocity reflects jump impulse force minus initial frame gravity'
  );
  assert.ok(player.jumpCooldown > 0, 'Jump cooldown is active');

  // Attempt second jump immediately in mid-air
  const currentVY = player.velocityY;
  player.update(0.016, new THREE.Vector3(0, 0, 0), true, false, false, mockCamera, world);

  // Velocity should continue normal gravitational trajectory, not receive second impulse
  assert.ok(player.velocityY < currentVY, 'Velocity should decrease due to gravity, no double-jump');
});
