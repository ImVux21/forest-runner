// ===================================================
// mushroom_glider_elevation.test.mjs — Tier 3: Bouncy Mushroom + Glider + Peak Summit Interaction
// ===================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import '../helpers/headless_env.mjs';
import { createTestWorld, createTestPlayer } from '../helpers/test_fixtures.mjs';

test('T3.2: Mushroom 2 launch on North Plateau propels player to apex and glides to Peak summit', () => {
  const { scene, world } = createTestWorld();
  const player = createTestPlayer(scene);

  const mockCamera = {
    getForwardVector: () => new THREE.Vector3(0, 0, -1),
    getRightVector: () => new THREE.Vector3(1, 0, 0),
  };

  // Mushroom 2 is at (6, 27) with power 22, located on Tier 1 (y = 3.5m)
  const m2 = world.bouncyMushrooms[1];
  assert.equal(m2.x, 6);
  assert.equal(m2.z, 27);
  assert.equal(m2.power, 22);

  // 1. Player steps on pad
  player.position.set(m2.x, m2.y, m2.z);
  player.update(0.016, new THREE.Vector3(0, 0, 0), false, false, false, mockCamera, world);

  assert.equal(player.isGrounded, false, 'Player becomes airborne');
  assert.ok(player.velocityY > 20.0, `Player launched with upward impulse > 20, got ${player.velocityY}`);

  // 2. Ascend to apex (simulate ~0.7 seconds of flight)
  for (let f = 0; f < 35; f++) {
    player.update(0.02, new THREE.Vector3(0, 0, 0), false, false, false, mockCamera, world);
  }

  // Peak apex altitude reached (power 22 from y=4.7 gives apex at y ~ 4.7 + 22^2 / 56 ~ 13.3m)
  assert.ok(
    player.position.y > 10.0,
    `Player apex altitude ${player.position.y.toFixed(2)}m is well above 7.0m peak summit`
  );

  // 3. Deploy paraglider while descending and steer toward Windy Peak summit (18, 22)
  // Glide descent from ~13.3m to 7.0m takes ~3.15s at -2m/s
  for (let f = 0; f < 250; f++) {
    const dirToPeak = new THREE.Vector3(18 - player.position.x, 0, 22 - player.position.z);
    if (dirToPeak.lengthSq() > 0.01) dirToPeak.normalize();
    player.update(0.02, dirToPeak, true, false, true, mockCamera, world);
    if (player.isGrounded) break;
  }

  // 4. Player lands on Peak Summit (Tier 2, y = 7.0m)
  assert.equal(player.isGrounded, true, 'Player has landed safely on summit');
  assert.equal(player.position.y, 7.0, 'Player elevation is exactly 7.0m on Peak Summit');
});
