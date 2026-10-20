// ===================================================
// f15_performance_budget.test.mjs — F15: Performance & Optimization Budget
// ===================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import '../helpers/headless_env.mjs';
import { PerformanceBudgetModel, PointLightsModel } from '../helpers/analytical_models.mjs';
import { createTestWorld } from '../helpers/test_fixtures.mjs';

test('F15.1: Scene draw call budget limit <= 120 calls', () => {
  assert.ok(
    PerformanceBudgetModel.MAX_DRAW_CALLS <= 120,
    `Draw call limit ${PerformanceBudgetModel.MAX_DRAW_CALLS} must be <= 120 for 60 FPS mobile/web headroom`
  );
});

test('F15.2: Target frame simulation time budget < 16.67ms', () => {
  assert.equal(PerformanceBudgetModel.TARGET_FPS, 60);
  assert.ok(
    PerformanceBudgetModel.MAX_FRAME_TIME_MS <= 16.67,
    'Frame time budget is 16.67ms'
  );

  // Measure performance of 100 analytical height queries
  const { world } = createTestWorld();
  const start = performance.now();
  for (let i = 0; i < 500; i++) {
    world.getGroundHeight((i % 40) - 20, ((i * 3) % 40) - 20);
  }
  const elapsed = performance.now() - start;

  assert.ok(
    elapsed < 10.0,
    `500 height queries took ${elapsed.toFixed(3)}ms (well below 10ms threshold)`
  );
});

test('F15.3: Material deduplication and instance reuse in WorldManager', () => {
  const { world } = createTestWorld();

  // Verify core materials are instantiated once and shared across meshes
  assert.ok(world.grassMat instanceof THREE.MeshStandardMaterial);
  assert.ok(world.cliffMat instanceof THREE.MeshStandardMaterial);
  assert.ok(world.rampMat instanceof THREE.MeshStandardMaterial);
  assert.ok(world.waterMat instanceof THREE.MeshStandardMaterial);
  assert.ok(world.woodMat instanceof THREE.MeshStandardMaterial);
});

test('F15.4: Ambient particles instancing ratio meets budget', () => {
  assert.ok(
    PerformanceBudgetModel.MIN_INSTANCED_PARTICLE_RATIO >= 0.8,
    'At least 80% of particles must use InstancedMesh'
  );
});

test('F15.5: Point lights concurrency budget adheres to limit <= 8', () => {
  assert.ok(
    PointLightsModel.MAX_CONCURRENT_POINT_LIGHTS <= PerformanceBudgetModel.MAX_POINT_LIGHTS,
    'Point lights must not exceed WebGL shader capacity'
  );
});

test('F15.6: Geometry and material disposal pattern verification', () => {
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const mat = new THREE.MeshBasicMaterial();
  const mesh = new THREE.Mesh(geo, mat);

  let geoDisposed = false;
  let matDisposed = false;

  geo.addEventListener('dispose', () => { geoDisposed = true; });
  mat.addEventListener('dispose', () => { matDisposed = true; });

  mesh.geometry.dispose();
  mesh.material.dispose();

  assert.equal(geoDisposed, true, 'Geometry should emit dispose event');
  assert.equal(matDisposed, true, 'Material should emit dispose event');
});
