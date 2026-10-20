// ===================================================
// physics_clamping.test.mjs — Tier 2: Physics Clamping & Trigger Margins
// ===================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import '../helpers/headless_env.mjs';
import { GameplayModel } from '../helpers/analytical_models.mjs';
import { createTestWorld, createTestPlayer } from '../helpers/test_fixtures.mjs';

test('T2.10: Bouncy mushroom exact radial trigger margin (1.34m vs 1.36m)', () => {
  const { world } = createTestWorld();
  const m1 = world.bouncyMushrooms[0]; // (-26, 8)

  // 1.34m offset (inside trigger threshold < 1.35)
  const insidePos = { x: m1.x + 1.34, y: m1.y, z: m1.z };
  const insideBounce = world.checkMushroomBounce(insidePos);
  assert.equal(insideBounce, m1.power, '1.34m distance triggers bounce');

  // 1.36m offset (outside trigger threshold)
  const outsidePos = { x: m1.x + 1.36, y: m1.y, z: m1.z };
  const outsideBounce = world.checkMushroomBounce(outsidePos);
  assert.equal(outsideBounce, 0, '1.36m distance does not trigger bounce');
});

test('T2.11: Bouncy mushroom vertical trigger window margin (1.1m vs 1.3m)', () => {
  const { world } = createTestWorld();
  const m1 = world.bouncyMushrooms[0];

  // Exactly over mushroom, but 1.1m above cap (< 1.2m vertical margin)
  const lowFlyover = { x: m1.x, y: m1.y + 1.1, z: m1.z };
  const lowBounce = world.checkMushroomBounce(lowFlyover);
  assert.equal(lowBounce, m1.power, 'Within 1.2m vertical margin triggers bounce');

  // 1.3m above cap (too high overhead)
  const highFlyover = { x: m1.x, y: m1.y + 1.3, z: m1.z };
  const highBounce = world.checkMushroomBounce(highFlyover);
  assert.equal(highBounce, 0, 'Above vertical margin does not trigger bounce');
});

test('T2.12: Paraglider clamps severe falling speed to -2.0 m/s', () => {
  const { scene, world } = createTestWorld();
  const player = createTestPlayer(scene);

  const mockCamera = {
    getForwardVector: () => new THREE.Vector3(0, 0, -1),
    getRightVector: () => new THREE.Vector3(1, 0, 0),
  };

  player.position.set(0, 50, 0);
  player.isGrounded = false;
  player.velocityY = -45.0; // Terminal free-fall

  // Deploy glider
  player.update(0.05, new THREE.Vector3(0, 0, 0), true, false, true, mockCamera, world);

  assert.equal(player.isGliding, true);
  assert.equal(player.velocityY, GameplayModel.PHYSICS.GLIDE_FALL_SPEED, 'Velocity clamped to -2.0 m/s');
});

test('T2.13: Horizontal velocity damping when player releases input', () => {
  const { scene, world } = createTestWorld();
  const player = createTestPlayer(scene);

  const mockCamera = {
    getForwardVector: () => new THREE.Vector3(0, 0, -1),
    getRightVector: () => new THREE.Vector3(1, 0, 0),
  };

  // Give player high forward velocity
  player.velocity.set(10.5, 0, 10.5);

  // Update without input (inputDir length = 0)
  player.update(0.1, new THREE.Vector3(0, 0, 0), false, false, false, mockCamera, world);

  // Velocity damped by factor of 0.1
  assert.ok(Math.abs(player.velocity.x) < 2.0, 'Velocity quickly damped');
  assert.ok(Math.abs(player.velocity.z) < 2.0, 'Velocity quickly damped');

  // Second frame damping
  player.update(0.1, new THREE.Vector3(0, 0, 0), false, false, false, mockCamera, world);
  assert.ok(Math.abs(player.velocity.x) < 0.2, 'Velocity settled to near zero');
});
