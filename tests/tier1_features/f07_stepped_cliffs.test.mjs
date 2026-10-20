// ===================================================
// f07_stepped_cliffs.test.mjs — F7: Stepped Organic Cliffs & Boundaries Coverage
// ===================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import '../helpers/headless_env.mjs';
import { TerrainModel } from '../helpers/analytical_models.mjs';
import { createTestWorld } from '../helpers/test_fixtures.mjs';

test('F7.1: Tiered elevation hierarchy verification', () => {
  const { world } = createTestWorld();

  assert.equal(TerrainModel.VALLEY_HEIGHT, 0.0);
  assert.equal(TerrainModel.TIER1_HEIGHT, 3.5);
  assert.equal(TerrainModel.TIER2_HEIGHT, 7.0);

  assert.equal(world.getGroundHeight(0, 0), TerrainModel.VALLEY_HEIGHT);
  assert.equal(world.getGroundHeight(-12, 18), TerrainModel.TIER1_HEIGHT);
  assert.equal(world.getGroundHeight(18, 22), TerrainModel.TIER2_HEIGHT);
});

test('F7.2: Walkable step height threshold (step <= 1.2m)', () => {
  // 1.1m step is walkable
  assert.equal(TerrainModel.isWalkableStep(0.0, 1.1), true);
  // 1.2m step is exactly at threshold
  assert.equal(TerrainModel.isWalkableStep(0.0, 1.2), true);
  // 1.3m step is blocked
  assert.equal(TerrainModel.isWalkableStep(0.0, 1.3), false);
  // 3.5m vertical cliff face is impassable without ramp
  assert.equal(TerrainModel.isWalkableStep(0.0, 3.5), false);
});

test('F7.3: Inaccessible cliff barrier gating without ramps', () => {
  const { world } = createTestWorld();

  // Position right in front of North Plateau cliff (-12, 4) at floor height 0.0m
  // Plateau begins at z = 5 (w=32, d=26, center z=18 -> minZ = 18 - 13 = 5)
  const floorY = world.getGroundHeight(-20, 4); // away from ramp at x=-12
  const cliffTopY = world.getGroundHeight(-20, 6); // onto plateau

  assert.equal(floorY, 0.0, 'Base of cliff is valley floor 0m');
  assert.equal(cliffTopY, 3.5, 'Top of cliff is plateau 3.5m');
  assert.equal(
    TerrainModel.isWalkableStep(floorY, cliffTopY),
    false,
    'Player cannot walk directly up the 3.5m vertical cliff'
  );
});

test('F7.4: Explorable boundary clamping limits', () => {
  const halfBound = TerrainModel.EXPLORABLE_BOUND; // 86.5m
  assert.equal(halfBound, 86.5);

  const clampCoords = (x, z) => ({
    x: THREE.MathUtils.clamp(x, -halfBound, halfBound),
    z: THREE.MathUtils.clamp(z, -halfBound, halfBound),
  });

  const normal = clampCoords(10, -20);
  assert.equal(normal.x, 10);
  assert.equal(normal.z, -20);

  const outside = clampCoords(150, -160);
  assert.equal(outside.x, 86.5);
  assert.equal(outside.z, -86.5);
});


test('F7.5: Stepped terrace intermediate step calculation', () => {
  // Stepped contours: 0m -> 1.1m -> 2.3m -> 3.5m (all steps <= 1.2m)
  const steps = [0.0, 1.1, 2.3, 3.5];
  for (let i = 1; i < steps.length; i++) {
    const diff = steps[i] - steps[i - 1];
    assert.ok(
      diff <= TerrainModel.MAX_WALKABLE_STEP + 1e-6,
      `Step ${i} diff ${diff.toFixed(2)} must be <= ${TerrainModel.MAX_WALKABLE_STEP}`
    );
  }
});

test('F7.6: Ramp incline slope angle calculation', () => {
  // North ramp: length 10m, rise 3.5m
  const length = 10.0;
  const rise = 3.5;
  const slopeAngleRad = Math.atan2(rise, length);
  const slopeAngleDeg = (slopeAngleRad * 180) / Math.PI;

  assert.ok(slopeAngleDeg > 15 && slopeAngleDeg < 25, `Ramp angle should be ~19.3°, got ${slopeAngleDeg}`);
});
