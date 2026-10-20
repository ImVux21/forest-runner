// ===================================================
// bridge_canyon_river.test.mjs — Tier 3: Suspension Bridge + Canyon + River Interaction
// ===================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import '../helpers/headless_env.mjs';
import { RiverModel, TerrainModel } from '../helpers/analytical_models.mjs';
import { createTestWorld, createTestPlayer } from '../helpers/test_fixtures.mjs';

test('T3.3: Player traverses suspension bridge over canyon without falling into river below', () => {
  const { scene, world } = createTestWorld();
  const player = createTestPlayer(scene);

  const mockCamera = {
    getForwardVector: () => new THREE.Vector3(0, 0, -1),
    getRightVector: () => new THREE.Vector3(1, 0, 0),
  };

  // Bridge walkway is at y = 3.55m
  // River water plane below is at y = 0.04m
  const verticalClearance = TerrainModel.BRIDGE_HEIGHT - RiverModel.WATER_SURFACE_Y;
  assert.ok(
    verticalClearance > 3.5,
    `Vertical canyon drop under bridge is ${verticalClearance.toFixed(2)}m`
  );

  // Start on Southwest Plateau at (-6, 3.5, -17)
  player.position.set(-6, 3.55, -17);
  player.isGrounded = true;

  // Walk eastward across bridge (from -6 to +4)
  const walkEast = new THREE.Vector3(1, 0, 0);

  for (let step = 0; step < 10; step++) {
    player.update(0.08, walkEast, false, false, false, mockCamera, world);

    // Verify player is on bridge height
    const groundH = world.getGroundHeight(player.position.x, player.position.z);
    assert.equal(
      groundH,
      3.55,
      `Ground height along bridge path must remain bridge height (3.55m), got ${groundH}`
    );
  }

  // Final position is past bridge center
  assert.ok(player.position.x > 0, 'Player crossed bridge center');
});

test('T3.4: Leap from suspension bridge lands in canyon floor without clipping', () => {
  const { scene, world } = createTestWorld();
  const player = createTestPlayer(scene);

  const mockCamera = {
    getForwardVector: () => new THREE.Vector3(0, 0, -1),
    getRightVector: () => new THREE.Vector3(1, 0, 0),
  };

  // Mid-bridge position (1, 3.55, -17)
  player.position.set(1, 3.55, -17);
  player.isGrounded = true;

  // Leap northward off the bridge railing into canyon floor (z changes from -17 to -12)
  const jumpNorth = new THREE.Vector3(0, 0, 1);
  player.position.z = -12; // Out into open canyon air
  player.isGrounded = false;
  player.velocityY = 0;

  // Fall down to valley floor
  for (let f = 0; f < 30; f++) {
    player.update(0.05, new THREE.Vector3(0, 0, 0), false, false, false, mockCamera, world);
    if (player.isGrounded) break;
  }

  assert.equal(player.isGrounded, true, 'Player has landed on canyon floor');
  assert.equal(player.position.y, 0.0, 'Player elevation is canyon floor 0.0m');
});
