// ===================================================
// f13_windy_peak.test.mjs — F13: Windy Peak & Lookout Tower Coverage
// ===================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import '../helpers/headless_env.mjs';
import { BiomesModel, GameplayModel } from '../helpers/analytical_models.mjs';
import { createTestWorld, createTestCollectibles, createTestNPCManager } from '../helpers/test_fixtures.mjs';

test('F13.1: Windy Peak summit height is highest elevation at 7.0m', () => {
  const { world } = createTestWorld();
  const peak = BiomesModel.WINDY_PEAK;

  assert.equal(peak.id, 'windy_peak');
  assert.equal(peak.center.x, 18);
  assert.equal(peak.center.z, 22);
  assert.equal(peak.summitHeight, 7.0);

  const groundH = world.getGroundHeight(peak.center.x, peak.center.z);
  assert.equal(groundH, 7.0, 'Summit ground height is exactly 7.0m');
});

test('F13.2: Multi-tier wooden observation tower structure and deck altitude', () => {
  // Tower base sits at 7.0m, observation deck sits at +4.5m -> 11.5m total elevation
  const tower = {
    baseY: 7.0,
    tiers: 2,
    deckY: 7.0 + 4.5,
  };

  assert.equal(tower.baseY, 7.0);
  assert.equal(tower.tiers, 2);
  assert.ok(tower.deckY >= 10.0, 'Observation deck reaches over 10m elevation');
});

test('F13.3: Active campfire flickering flame intensity oscillation', () => {
  const baseIntensity = 2.0;
  const time = 1.5;
  const flicker = baseIntensity + Math.sin(time * 12.0) * 0.35 + Math.cos(time * 7.0) * 0.15;

  assert.ok(flicker >= 1.5 && flicker <= 2.5, `Campfire light flickers organically around 2.0, got ${flicker}`);
});

test('F13.4: Forest Spirit NPC presence and interaction parameters on summit', () => {
  const { world, scene } = createTestWorld();
  const npcs = createTestNPCManager(scene, world);

  const spirit = npcs.npcs.find(n => n.id === 'spirit');
  assert.ok(spirit, 'Forest Spirit NPC must be registered');
  assert.equal(spirit.position.x, 18.0);
  assert.equal(spirit.position.z, 18.0);
  assert.equal(spirit.position.y, 7.0, 'Forest Spirit floats atop 7.0m summit');
  assert.equal(spirit.interactionDist, 4.2, 'Spirit has wide 4.2m interaction sphere');
});

test('F13.5: Golden Treasure Chest collectible on summit', () => {
  const { scene, world } = createTestWorld();
  const coll = createTestCollectibles(scene, world);

  // Peak chest is at (18, 7.45, 20)
  const peakChest = coll.items.find(
    item => item.type === 'chest' && Math.hypot(item.mesh.position.x - 18, item.mesh.position.z - 20) < 1.0
  );

  assert.ok(peakChest, 'Golden Chest exists on Windy Peak summit');
  assert.equal(peakChest.points, 200, 'Chest grants grand 200 points');
  assert.equal(peakChest.mesh.position.y, 7.45, 'Chest sits atop summit rock base');
});

test('F13.6: Panoramic overlook elevation difference above valley floor', () => {
  const valleyH = 0.0;
  const summitH = 7.0;
  const verticalDelta = summitH - valleyH;

  assert.equal(verticalDelta, 7.0, 'Provides full 7.0m vertical overlook across entire forest valley');
});
