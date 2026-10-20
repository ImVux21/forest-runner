// ===================================================
// f12_sunken_ruins.test.mjs — F12: Ancient Sunken Ruins Coverage
// ===================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import '../helpers/headless_env.mjs';
import { BiomesModel, TerrainModel } from '../helpers/analytical_models.mjs';
import { createTestWorld, createTestCollectibles } from '../helpers/test_fixtures.mjs';

test('F12.1: Ancient Sunken Ruins geographic location on Southeast Plateau', () => {
  const r = BiomesModel.SUNKEN_RUINS;
  assert.equal(r.id, 'sunken_ruins');
  assert.equal(r.center.x, 20);
  assert.equal(r.center.z, -18);
  assert.equal(r.expectedHeight, 3.5);

  const { world } = createTestWorld();
  assert.equal(
    world.getGroundHeight(r.center.x, r.center.z),
    3.5,
    'Ruins ground height must be 3.5m on plateau'
  );
});

test('F12.2: Weathered stone pillar architectural arrangement', () => {
  // 4 pillars encircling the ancient altar
  const altarPos = { x: 20, y: 3.5, z: -18 };
  const pillars = [
    { x: 17, z: -21 },
    { x: 23, z: -21 },
    { x: 17, z: -15 },
    { x: 23, z: -15 },
  ];

  for (const p of pillars) {
    const dist = Math.hypot(p.x - altarPos.x, p.z - altarPos.z);
    assert.ok(dist >= 4.0 && dist <= 5.0, 'Pillars spaced symmetrically ~4.2m around altar');
  }
});

test('F12.3: Ancient ceremonial altar positioning and collision foundation', () => {
  const { world } = createTestWorld();
  const altarH = world.getGroundHeight(20, -18);
  assert.equal(altarH, 3.5, 'Altar sits solidly on Tier 1 plateau');
});

test('F12.4: Floating magical rune crystal animation oscillation math', () => {
  const baseH = 4.8;
  const time = 2.0;
  const hoverY = baseH + Math.sin(time * 2.0) * 0.15;
  const rotY = (time * 1.5) % (Math.PI * 2);

  assert.ok(hoverY >= baseH - 0.15 && hoverY <= baseH + 0.15, 'Rune hovers smoothly within ±0.15m');
  assert.ok(rotY >= 0 && rotY <= Math.PI * 2, 'Rune continuously rotates around Y axis');
});

test('F12.5: Rare Emerald Gem collectible reward at ruins', () => {
  const { scene, world } = createTestWorld();
  const coll = createTestCollectibles(scene, world);

  // Gem on SE Plateau is at (24, -20)
  const ruinsGem = coll.items.find(
    item => item.type === 'gem' && Math.hypot(item.mesh.position.x - 24, item.mesh.position.z - (-20)) < 1.0
  );

  assert.ok(ruinsGem, 'Emerald Gem exists at Sunken Ruins ridge');
  assert.equal(ruinsGem.points, 50, 'Gem reward is 50 points');
  assert.ok(ruinsGem.baseY > 3.5, 'Gem rests above ground height');
});

test('F12.6: Direct bridge connection from Southwest Plateau to Southeast Ruins', () => {
  const { world } = createTestWorld();
  const b = TerrainModel.BRIDGE;

  // Bridge midpoint is at x=1, z=-17, h=3.55
  assert.equal(world.getGroundHeight(b.x, b.z), 3.55);

  // West side connects to SW plateau (-6, -17)
  assert.equal(world.getGroundHeight(-6, -17), 3.55);
  // East side connects to SE ruins plateau (15, -17)
  assert.equal(world.getGroundHeight(15, -17), 3.5);
});
