// ===================================================
// summit_glider_journey.test.mjs — Tier 4: Summit Lookout to Valley Floor Paraglider Flight
// ===================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import '../helpers/headless_env.mjs';
import { GameplayModel } from '../helpers/analytical_models.mjs';
import { createTestWorld, createTestPlayer } from '../helpers/test_fixtures.mjs';

test('T4.3: High-Altitude Paraglider Flight from Summit Tower to Valley Crossroads', () => {
  const { scene, world } = createTestWorld();
  const player = createTestPlayer(scene);

  const mockCamera = {
    getForwardVector: () => new THREE.Vector3(0, 0, -1),
    getRightVector: () => new THREE.Vector3(1, 0, 0),
  };

  // 1. Position player at top of Summit Lookout Tower (18, 11.5, 22)
  player.position.set(18.0, 11.5, 22.0);
  player.isGrounded = false;
  player.velocityY = 0;

  const targetCrossroads = new THREE.Vector3(0.0, 0.0, 0.0);
  const totalHorizontalDist = Math.hypot(
    player.position.x - targetCrossroads.x,
    player.position.z - targetCrossroads.z
  );

  assert.ok(totalHorizontalDist > 25.0, `Flight distance ~28.4m, got ${totalHorizontalDist.toFixed(2)}m`);

  // 2. Leap off tower and deploy paraglider
  // Step for 1 frame to begin descent
  player.update(0.05, new THREE.Vector3(0, 0, 0), false, false, false, mockCamera, world);
  assert.ok(player.velocityY < 0, 'Beginning descent');

  // 3. Steer with paraglider toward valley floor crossroads (0, 0)
  let flightFrames = 0;
  while (!player.isGrounded && flightFrames < 350) {
    const flightDir = new THREE.Vector3(
      targetCrossroads.x - player.position.x,
      0,
      targetCrossroads.z - player.position.z
    );
    if (flightDir.lengthSq() > 0.01) flightDir.normalize();

    player.update(0.02, flightDir, true, false, true, mockCamera, world);
    flightFrames++;

    // While in mid-air with glider, descent rate is clamped to -2.0 m/s
    if (!player.isGrounded) {
      assert.equal(
        player.velocityY,
        GameplayModel.PHYSICS.GLIDE_FALL_SPEED,
        'Descent rate strictly clamped to -2.0 m/s'
      );
    }
  }

  // 4. Touchdown verification
  assert.equal(player.isGrounded, true, 'Player has landed on ground');
  assert.equal(player.position.y, 0.0, 'Landed on valley floor elevation 0.0m');

  // Verify landing spot is near crossroads (0, 0)
  const landingDist = Math.hypot(player.position.x, player.position.z);
  assert.ok(
    landingDist < 12.0,
    `Landed in village / crossroads territory (${landingDist.toFixed(2)}m from center)`
  );
  assert.equal(player.isGliding, false, 'Paraglider automatically stows upon landing');
});
