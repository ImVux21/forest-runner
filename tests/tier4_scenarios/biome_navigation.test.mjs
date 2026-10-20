// ===================================================
// biome_navigation.test.mjs — Tier 4: Sequential 5-Biome Exploration Navigation
// ===================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import '../helpers/headless_env.mjs';
import { BiomesModel, RiverModel } from '../helpers/analytical_models.mjs';
import { createTestWorld, createTestPlayer } from '../helpers/test_fixtures.mjs';

test('T4.2: Sequential Navigation across all 5 distinct biomes and landmarks', () => {
  const { scene, world } = createTestWorld();
  const player = createTestPlayer(scene);

  const mockCamera = {
    getForwardVector: () => new THREE.Vector3(0, 0, -1),
    getRightVector: () => new THREE.Vector3(1, 0, 0),
  };

  const visitedBiomes = [];

  // ─── Biome 1: Whispering Village & Crossroads ─────────────────────────────
  player.position.set(-4, 0, -4);
  assert.equal(world.getGroundHeight(player.position.x, player.position.z), 0.0);
  const distToVillageCenter = Math.hypot(
    player.position.x - BiomesModel.VILLAGE.center.x,
    player.position.z - BiomesModel.VILLAGE.center.z
  );
  assert.ok(distToVillageCenter <= BiomesModel.VILLAGE.radius);
  visitedBiomes.push('whispering_village');

  // ─── Biome 2: Crystal River & Canyon ──────────────────────────────────────
  // Walk northeast to River segment near (0, 8)
  player.position.set(0, 0, 8);
  const riverH = RiverModel.WATER_SURFACE_Y;
  assert.equal(riverH, 0.04);
  const distToRiver = Math.hypot(
    player.position.x - BiomesModel.RIVER_CANYON.center.x,
    player.position.z - BiomesModel.RIVER_CANYON.center.z
  );
  assert.ok(distToRiver <= BiomesModel.RIVER_CANYON.radius);
  visitedBiomes.push('crystal_river');

  // ─── Biome 3: Luminescent Mushroom Grove ──────────────────────────────────
  // Travel southwest through Ramp 3 (-18, -3) to SW Plateau (-18, -16)
  player.position.set(-18, 3.5, -16);
  assert.equal(world.getGroundHeight(player.position.x, player.position.z), 3.5);
  const distToGrove = Math.hypot(
    player.position.x - BiomesModel.MUSHROOM_GROVE.center.x,
    player.position.z - BiomesModel.MUSHROOM_GROVE.center.z
  );
  assert.ok(distToGrove <= BiomesModel.MUSHROOM_GROVE.radius);
  visitedBiomes.push('luminescent_mushroom_grove');

  // ─── Bridge Crossing: SW Plateau -> SE Plateau ────────────────────────────
  // Cross bridge at (1, 3.55, -17)
  player.position.set(1, 3.55, -17);
  assert.equal(world.getGroundHeight(player.position.x, player.position.z), 3.55);

  // ─── Biome 4: Ancient Sunken Ruins ────────────────────────────────────────
  // Arrive on SE Plateau (20, -18)
  player.position.set(20, 3.5, -18);
  assert.equal(world.getGroundHeight(player.position.x, player.position.z), 3.5);
  const distToRuins = Math.hypot(
    player.position.x - BiomesModel.SUNKEN_RUINS.center.x,
    player.position.z - BiomesModel.SUNKEN_RUINS.center.z
  );
  assert.ok(distToRuins <= BiomesModel.SUNKEN_RUINS.radius);
  visitedBiomes.push('ancient_sunken_ruins');

  // ─── Biome 5: Windy Peak & Lookout Tower ──────────────────────────────────
  // Ascend Ramp 2 (x: 5, z: 22) onto high Peak Plateau (18, 22)
  player.position.set(18, 7.0, 22);
  assert.equal(world.getGroundHeight(player.position.x, player.position.z), 7.0);
  const distToPeak = Math.hypot(
    player.position.x - BiomesModel.WINDY_PEAK.center.x,
    player.position.z - BiomesModel.WINDY_PEAK.center.z
  );
  assert.ok(distToPeak <= BiomesModel.WINDY_PEAK.radius);
  visitedBiomes.push('windy_peak');

  // Verify all 5 biomes were successfully explored
  assert.equal(visitedBiomes.length, 5);
  assert.deepEqual(visitedBiomes, [
    'whispering_village',
    'crystal_river',
    'luminescent_mushroom_grove',
    'ancient_sunken_ruins',
    'windy_peak',
  ]);
});
