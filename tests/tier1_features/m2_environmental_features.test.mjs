// ===================================================
// m2_environmental_features.test.mjs — Milestone 2 Verification Test Suite
// Verifies Stepped Mountain Boundaries, Rock Strata Plateaus, Stepped Ramps,
// River Canyon, Sunken Riverbed, 70 Pebbles, Docks, and Water Animation
// ===================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import '../helpers/headless_env.mjs';
import { createTestWorld } from '../helpers/test_fixtures.mjs';
import { TerrainModel, RiverModel } from '../helpers/analytical_models.mjs';

test('M2.1: 3-tier stepped mountain boundaries with merged geometries and 3 draw calls', () => {
  const { world } = createTestWorld();

  assert.ok(world.mountainMeshes, 'WorldManager should have mountainMeshes array');
  assert.equal(world.mountainMeshes.length, 3, 'Mountains merged into exactly 3 batched meshes (rock, grass, snow)');

  const [rockMesh, grassMesh, snowMesh] = world.mountainMeshes;

  // Verify meshes are Three.js Mesh instances
  assert.ok(rockMesh instanceof THREE.Mesh, 'rockMesh is THREE.Mesh');
  assert.ok(grassMesh instanceof THREE.Mesh, 'grassMesh is THREE.Mesh');
  assert.ok(snowMesh instanceof THREE.Mesh, 'snowMesh is THREE.Mesh');

  // Verify geometry vertices exist
  assert.ok(rockMesh.geometry.attributes.position.count > 1000, 'Rock mesh has >1000 merged vertices');
  assert.ok(grassMesh.geometry.attributes.position.count > 500, 'Grass shelf mesh has >500 merged vertices');
  assert.ok(snowMesh.geometry.attributes.position.count > 100, 'Snowcap mesh has >100 merged vertices');

  // Verify materials
  assert.equal(rockMesh.material, world.mountainRockMat);
  assert.equal(grassMesh.material, world.grassMat);
  assert.equal(snowMesh.material, world.mountainSnowMat);
  assert.equal(world.mountainRockMat.flatShading, true);
  assert.equal(world.mountainSnowMat.flatShading, true);
});

test('M2.2: 3-tier geological rock strata for plateaus with 45° corner buttresses', () => {
  const { world, scene } = createTestWorld();

  // Find plateau groups in scene (plateaus uniquely possess cliffLightMat)
  const plateauGroups = scene.children.filter(
    c => c instanceof THREE.Group && c.children.some(child => child.material === world.cliffLightMat)
  );

  assert.equal(plateauGroups.length, 4, 'All 4 plateaus generated with geological strata groups');

  for (const group of plateauGroups) {
    // Each plateau must have:
    // Stratum 1: base bedrock skirt (cliffDarkMat)
    // Stratum 2: mid sedimentary body (cliffMat)
    // Stratum 3: upper weathered rim (cliffLightMat)
    // Stratum 4: overhanging turf cap (grassMat)
    // 4 faceted corner buttresses (cliffDarkMat)
    const baseMeshes = group.children.filter(c => c.material === world.cliffDarkMat);
    const midMeshes = group.children.filter(c => c.material === world.cliffMat);
    const rimMeshes = group.children.filter(c => c.material === world.cliffLightMat);
    const capMeshes = group.children.filter(c => c.material === world.grassMat);

    // 1 base skirt + 4 corner buttresses = 5 cliffDarkMat meshes
    assert.equal(baseMeshes.length, 5, 'Plateau has 1 base skirt and 4 corner buttresses');
    assert.equal(midMeshes.length, 1, 'Plateau has mid sedimentary body mesh');
    assert.equal(rimMeshes.length, 1, 'Plateau has upper weathered rim mesh');
    assert.equal(capMeshes.length, 1, 'Plateau has overhanging turf cap mesh');

    // Total meshes per plateau = 8
    assert.equal(group.children.length, 8, 'Plateau group has exactly 8 component meshes');
  }
});

test('M2.3: Naturalized stepped stone paver ramps with flanking curbs', () => {
  const { world, scene } = createTestWorld();

  // Find ramp groups in scene
  const rampGroups = scene.children.filter(
    c => c instanceof THREE.Group && c.children.some(child => child.material === world.rampMat)
  );

  assert.equal(rampGroups.length, 4, 'All 4 ramps generated with stepped groups');

  for (const group of rampGroups) {
    // 1 incline base slab (rampMat)
    // 10 stepped stone pavers (stoneStepMat)
    // 2 flanking stone curbs (cliffDarkMat)
    const baseSlabs = group.children.filter(c => c.material === world.rampMat);
    const stepPavers = group.children.filter(c => c.material === world.stoneStepMat);
    const curbs = group.children.filter(c => c.material === world.cliffDarkMat);

    assert.equal(baseSlabs.length, 1, 'Ramp has 1 incline base slab');
    assert.equal(stepPavers.length, 10, 'Ramp has exactly 10 stepped stone pavers');
    assert.equal(curbs.length, 2, 'Ramp has 2 flanking retaining curbs');
    assert.equal(group.children.length, 13, 'Ramp group has 13 component meshes');
  }
});

test('M2.4: Subdivided river water planes, sunken riverbed canyon, and 70 instanced pebbles', () => {
  const { world, scene } = createTestWorld();

  // 1. Water mesh invariant (F8.1)
  assert.ok(world.waterMesh, 'world.waterMesh exists');
  assert.equal(world.waterMesh.children.length, 5, 'world.waterMesh must contain exactly 5 children');
  for (const seg of world.waterMesh.children) {
    assert.equal(seg.position.y, 0.04, 'River segment base elevation is 0.04m');
    assert.ok(seg.geometry.attributes.position.count > 100, 'Water plane geometry is subdivided for wave animation');
  }

  // 2. Sunken riverbed mesh
  assert.ok(world.riverBedMesh, 'world.riverBedMesh exists');
  assert.ok(scene.children.includes(world.riverBedMesh), 'Riverbed mesh is added to the scene');
  assert.notEqual(world.riverBedMesh, world.waterMesh, 'Riverbed is separate from waterMesh');
  assert.equal(world.riverBedMesh.children.length, 5, 'Riverbed has 5 segment groups');

  // Verify riverbed trough elevation is below ground (-0.40m)
  const firstBedSeg = world.riverBedMesh.children[0];
  const bedFloor = firstBedSeg.children.find(c => c.geometry instanceof THREE.PlaneGeometry);
  assert.ok(bedFloor, 'Riverbed segment contains floor plane');
  assert.equal(bedFloor.position.y, -0.40, 'Riverbed floor sits at y = -0.40m');

  // 3. Submerged riverbed pebbles (InstancedMesh)
  assert.ok(world.riverPebblesMesh, 'world.riverPebblesMesh exists');
  assert.ok(world.riverPebblesMesh instanceof THREE.InstancedMesh, 'Pebbles use THREE.InstancedMesh');
  assert.equal(world.riverPebblesMesh.count, 70, 'Exactly 70 instanced pebbles along the riverbed');
  assert.ok(scene.children.includes(world.riverPebblesMesh), 'Pebbles mesh added to scene');
});

test('M2.5: Rustic wooden docks placement and construction', () => {
  const { world, scene } = createTestWorld();

  assert.ok(world.docks, 'world.docks array exists');
  assert.equal(world.docks.length, 2, 'Exactly 2 rustic wooden docks built');

  const dock1 = world.docks[0];
  const dock2 = world.docks[1];

  // Dock 1 position near Whispering Village crossing (satisfies F8.6)
  assert.ok(Math.abs(dock1.group.position.x - (-2.2)) < 0.1, 'Dock 1 X near -2.2');
  assert.ok(Math.abs(dock1.group.position.z - 3.5) < 0.1, 'Dock 1 Z near 3.5');
  assert.equal(dock1.baseY, 0.12, 'Dock 1 deck elevation is 0.12m');

  // Dock 2 position near Southern canyon approach
  assert.ok(Math.abs(dock2.group.position.x - 14.5) < 0.1, 'Dock 2 X near 14.5');
  assert.ok(Math.abs(dock2.group.position.z - (-2.5)) < 0.1, 'Dock 2 Z near -2.5');
  assert.equal(dock2.baseY, 0.12, 'Dock 2 deck elevation is 0.12m');

  // Verify dock elements: walkway planks, submerged pilings, bollards, rope
  for (const dock of world.docks) {
    const planks = dock.group.children.filter(
      c => c.geometry instanceof THREE.BoxGeometry && c.geometry.parameters.height < 0.1
    );
    assert.equal(planks.length, 8, 'Dock has 8 staggered walkway planks');

    const pilings = dock.group.children.filter(
      c => c.geometry instanceof THREE.CylinderGeometry && c.position.y < 0
    );
    assert.equal(pilings.length, 4, 'Dock has 4 submerged support pilings');

    const ropes = dock.group.children.filter(c => c.material === world.ropeMat);
    assert.ok(ropes.length >= 2, 'Dock has mooring bollards with rope coils');
  }
});

test('M2.6: Sinusoidal wave vertex displacement in world.update(delta, elapsed)', () => {
  const { world } = createTestWorld();

  assert.equal(typeof world.update, 'function', 'world.update method exists');

  const seg0 = world.waterGeometries[0];
  const posAttr = seg0.posAttr;

  // Record initial Z (height) at sample vertex
  const zBefore = posAttr.getZ(10);

  // Update simulation with elapsed = 1.0s
  world.update(0.016, 1.0);
  const zAfter1 = posAttr.getZ(10);

  // Update simulation with elapsed = 2.0s
  world.update(0.016, 2.0);
  const zAfter2 = posAttr.getZ(10);

  // Vertices should animate dynamically
  assert.notEqual(zBefore, zAfter1, 'Vertex displacement changes with time');
  assert.notEqual(zAfter1, zAfter2, 'Wave moves continuously as time advances');

  // Maximum displacement should adhere to RiverModel.MAX_WAVE_AMPLITUDE (0.06m)
  for (let i = 0; i < posAttr.count; i++) {
    const disp = Math.abs(posAttr.getZ(i));
    assert.ok(
      disp <= RiverModel.MAX_WAVE_AMPLITUDE + 1e-4,
      `Displacement ${disp} must not exceed MAX_WAVE_AMPLITUDE (0.06m)`
    );
  }
});

test('M2.7: Dock floating animation in world.update(delta, elapsed)', () => {
  const { world } = createTestWorld();

  const dock = world.docks[0];
  const baseY = dock.baseY;

  world.update(0.016, 0.0);
  const y0 = dock.group.position.y;

  world.update(0.016, 1.0);
  const y1 = dock.group.position.y;

  assert.notEqual(y0, y1, 'Dock group elevation bobs slightly with wave motion');
  assert.ok(Math.abs(y1 - baseY) <= 0.01, 'Dock bobbing amplitude is subtle (<= 0.01m)');
});

test('M2.8: Material deduplication covers all M2 geological and environmental materials', () => {
  const { world } = createTestWorld();

  // Core M1 materials
  assert.ok(world.grassMat instanceof THREE.MeshStandardMaterial);
  assert.ok(world.cliffMat instanceof THREE.MeshStandardMaterial);
  assert.ok(world.rampMat instanceof THREE.MeshStandardMaterial);
  assert.ok(world.waterMat instanceof THREE.MeshStandardMaterial);
  assert.ok(world.woodMat instanceof THREE.MeshStandardMaterial);

  // M2 geological & environmental materials
  assert.ok(world.cliffDarkMat instanceof THREE.MeshStandardMaterial);
  assert.ok(world.cliffLightMat instanceof THREE.MeshStandardMaterial);
  assert.ok(world.stoneStepMat instanceof THREE.MeshStandardMaterial);
  assert.ok(world.mountainRockMat instanceof THREE.MeshStandardMaterial);
  assert.ok(world.mountainSnowMat instanceof THREE.MeshStandardMaterial);
  assert.ok(world.riverBedMat instanceof THREE.MeshStandardMaterial);
  assert.ok(world.pebbleMat instanceof THREE.MeshStandardMaterial);
  assert.ok(world.ropeMat instanceof THREE.MeshStandardMaterial);
});
