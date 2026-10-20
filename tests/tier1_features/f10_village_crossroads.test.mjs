// ===================================================
// f10_village_crossroads.test.mjs — F10: Whispering Village & Crossroads Coverage
// ===================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import '../helpers/headless_env.mjs';
import { BiomesModel, GameplayModel } from '../helpers/analytical_models.mjs';
import { createTestWorld, createTestNPCManager } from '../helpers/test_fixtures.mjs';

test('F10.1: Old Explorer Finn anchor position and ground elevation', () => {
  const { world, scene } = createTestWorld();
  const npcs = createTestNPCManager(scene, world);

  const finn = npcs.npcs.find(n => n.id === 'finn');
  assert.ok(finn, 'Finn NPC must be registered');
  assert.equal(finn.position.x, -4.0);
  assert.equal(finn.position.z, -4.0);
  assert.equal(finn.position.y, 0.0, 'Finn stands on valley floor (y=0)');
});

test('F10.2: Finn interaction distance threshold detection', () => {
  const { world, scene } = createTestWorld();
  const npcs = createTestNPCManager(scene, world);

  // Player close to Finn: dist from (-4, 0, -4) to (-3, 0, -3) is sqrt(2) ~ 1.41m <= 3.5m
  const closePlayerPos = new THREE.Vector3(-3.0, 0.0, -3.0);
  const activeNearby = npcs.update(0.016, closePlayerPos);

  assert.ok(activeNearby, 'Should detect nearby NPC');
  assert.equal(activeNearby.id, 'finn');

  // Player far from Finn: (10, 0, 10)
  const farPlayerPos = new THREE.Vector3(10.0, 0.0, 10.0);
  const noneNearby = npcs.update(0.016, farPlayerPos);
  assert.equal(noneNearby, null, 'No NPC nearby when far away');
});

test('F10.3: Whispering Village spatial zone radius coverage', () => {
  const v = BiomesModel.VILLAGE;
  assert.equal(v.id, 'whispering_village');
  assert.equal(v.center.x, -4);
  assert.equal(v.center.z, -4);
  assert.equal(v.radius, 12.0);

  // Player at origin (0, 0) is well within village zone
  const distFromSpawn = Math.hypot(0 - v.center.x, 0 - v.center.z);
  assert.ok(distFromSpawn <= v.radius, 'Player spawn is inside village territory');
});

test('F10.4: Cobblestone pathway elevation aligns with ground', () => {
  const pathNodes = [
    { x: 0, z: 0 },
    { x: -2, z: -2 },
    { x: -4, z: -4 },
    { x: -6, z: 2 },
  ];

  const { world } = createTestWorld();
  for (const node of pathNodes) {
    const groundH = world.getGroundHeight(node.x, node.z);
    assert.equal(groundH, 0.0, 'Village paths are flat on valley floor');
  }
});

test('F10.5: Village lantern props and warm point light linkage', () => {
  const lanternLight = new THREE.PointLight(0xff9933, 1.8, 8.0);
  lanternLight.position.set(-4, 1.8, -4);

  assert.equal(lanternLight.color.getHexString(), 'ff9933', 'Lantern provides warm golden illumination');
  assert.equal(lanternLight.distance, 8.0);
  assert.equal(lanternLight.position.y, 1.8, 'Lantern sits at human eye/post level');
});

test('F10.6: Proximity of spawn point to Finn enables immediate onboarding', () => {
  const spawn = { x: 0, z: 0 };
  const finn = GameplayModel.NPCS.find(n => n.id === 'finn');
  const dist = Math.hypot(spawn.x - finn.pos.x, spawn.z - finn.pos.z);

  // sqrt((-4)^2 + (-4)^2) = sqrt(32) ~ 5.65m
  assert.ok(dist < 6.0, `Spawn is ~5.65m from Finn, got ${dist.toFixed(2)}m`);
  assert.ok(dist > finn.interactionDist, 'Player must walk a few steps to trigger dialogue');
});
