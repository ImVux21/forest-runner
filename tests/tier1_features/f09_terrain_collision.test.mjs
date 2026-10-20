// ===================================================
// f09_terrain_collision.test.mjs — F9: Analytical Terrain & Collision Coverage
// ===================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import '../helpers/headless_env.mjs';
import { TerrainModel } from '../helpers/analytical_models.mjs';
import { createTestWorld } from '../helpers/test_fixtures.mjs';

test('F9.1: Valley floor analytical height query is 0.0m', () => {
  const { world } = createTestWorld();
  assert.equal(world.getGroundHeight(0, 0), 0.0);
  assert.equal(world.getGroundHeight(10, 5), 0.0);
  assert.equal(world.getGroundHeight(-30, -30), 0.0);
});

test('F9.2: Plateaus analytical height queries across all 4 zones', () => {
  const { world } = createTestWorld();

  // North Plateau (center: -12, 18, h: 3.5)
  assert.equal(world.getGroundHeight(-12, 18), 3.5);
  // Peak Summit (center: 18, 22, h: 7.0)
  assert.equal(world.getGroundHeight(18, 22), 7.0);
  // Southwest Plateau (center: -18, -16, h: 3.5)
  assert.equal(world.getGroundHeight(-18, -16), 3.5);
  // Southeast Plateau (center: 20, -18, h: 3.5)
  assert.equal(world.getGroundHeight(20, -18), 3.5);
});

test('F9.3: Suspension bridge deck height query is 3.55m', () => {
  const { world } = createTestWorld();
  // Bridge spans (1, -17) with w: 14, d: 3.6, h: 3.55
  assert.equal(world.getGroundHeight(1, -17), 3.55);
  assert.equal(world.getGroundHeight(-3, -17), 3.55);
  assert.equal(world.getGroundHeight(5, -17), 3.55);
});

test('F9.4: Ramp 1 (Z-axis) linear slope height calculation', () => {
  const { world } = createTestWorld();
  // Ramp 1: x: -12, z: 3, w: 7, d: 10 (z spans from -2 to +8), startH: 0.0, endH: 3.5
  const startH = world.getGroundHeight(-12, -2);
  const midH = world.getGroundHeight(-12, 3);
  const endH = world.getGroundHeight(-12, 8);

  assert.ok(Math.abs(startH - 0.0) < 0.01, `Start of ramp should be 0.0m, got ${startH}`);
  assert.ok(Math.abs(midH - 1.75) < 0.01, `Midpoint should be 1.75m, got ${midH}`);
  assert.ok(Math.abs(endH - 3.5) < 0.01, `End of ramp should be 3.5m, got ${endH}`);
});

test('F9.5: Ramp 2 (X-axis) linear slope from Tier 1 to Peak', () => {
  const { world } = createTestWorld();
  // Ramp 2: x: 5, z: 22, w: 10, d: 6 (x spans 0 to 10), startH: 3.5, endH: 7.0
  const startH = world.getGroundHeight(0, 22);
  const midH = world.getGroundHeight(5, 22);
  const endH = world.getGroundHeight(10, 22);

  assert.ok(Math.abs(startH - 3.5) < 0.01, `Start of ramp should be 3.5m, got ${startH}`);
  assert.ok(Math.abs(midH - 5.25) < 0.01, `Midpoint should be 5.25m, got ${midH}`);
  assert.ok(Math.abs(endH - 7.0) < 0.01, `End of ramp should be 7.0m, got ${endH}`);
});

test('F9.6: Terrain query consistency between analytical model and WorldManager', () => {
  const { world } = createTestWorld();
  const testCoords = [
    [0, 0], [-12, 18], [18, 22], [-18, -16], [20, -18],
    [1, -17], [-12, 3], [5, 22], [-30, 20], [35, -35]
  ];

  for (const [x, z] of testCoords) {
    const wmH = world.getGroundHeight(x, z);
    const modelH = TerrainModel.getGroundHeight(x, z);
    assert.equal(
      wmH,
      modelH,
      `WorldManager height at (${x}, ${z}) should match analytical model: ${wmH} === ${modelH}`
    );
  }
});
