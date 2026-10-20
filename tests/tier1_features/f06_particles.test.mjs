// ===================================================
// f06_particles.test.mjs — F6: Ambient Particle Systems Coverage
// ===================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import '../helpers/headless_env.mjs';
import { ParticlesModel } from '../helpers/analytical_models.mjs';

test('F6.1: InstancedMesh setup reduces particle draw calls to 1', () => {
  const count = 30;
  const geo = new THREE.DodecahedronGeometry(0.1, 0);
  const mat = new THREE.MeshBasicMaterial({ color: 0x88ff88 });
  const instancedMesh = new THREE.InstancedMesh(geo, mat, count);

  assert.equal(instancedMesh.count, 30, 'InstancedMesh contains 30 instances');
  assert.equal(instancedMesh.isInstancedMesh, true, 'Object is THREE.InstancedMesh');
  assert.equal(instancedMesh.instanceMatrix.count, 30, 'Matrix buffer allocated for 30 instances');
});

test('F6.2: Particle population budgets per biome', () => {
  const s = ParticlesModel.SYSTEMS;
  assert.equal(s.LEAVES.count, 35);
  assert.equal(s.SPORES.count, 30);
  assert.equal(s.CAMPFIRE_SMOKE.count, 20);

  const total = s.LEAVES.count + s.SPORES.count + s.CAMPFIRE_SMOKE.count;
  assert.ok(
    total <= ParticlesModel.MAX_TOTAL_PARTICLES,
    `Total ambient particles ${total} within limit ${ParticlesModel.MAX_TOTAL_PARTICLES}`
  );
});

test('F6.3: Particle lifecycle respawn logic', () => {
  const p = {
    spawnX: 0, spawnY: 1, spawnZ: 0,
    x: 0, y: 1, z: 0,
    vx: 0, vy: 2, vz: 0,
    age: 0,
    maxLife: 3.0,
  };

  // Step for 1 second
  ParticlesModel.stepParticle(p, 1.0);
  assert.equal(p.age, 1.0);
  assert.equal(p.y, 3.0);

  // Step past maxLife (e.g. +2.5s -> age 3.5s >= 3.0s)
  ParticlesModel.stepParticle(p, 2.5);
  assert.equal(p.age, 0.0, 'Particle must respawn with age 0');
  assert.equal(p.y, p.spawnY, 'Particle must reset to spawn position');
});

test('F6.4: Campfire smoke upward drift velocity', () => {
  const smoke = {
    spawnX: 17, spawnY: 7.5, spawnZ: 21,
    x: 17, y: 7.5, z: 21,
    vx: 0.1, vy: 1.8, vz: 0.05,
    age: 0,
    maxLife: 2.5,
  };

  ParticlesModel.stepParticle(smoke, 0.5);
  assert.ok(smoke.y > 7.5, 'Smoke particle must rise upwards');
  assert.ok(Math.abs(smoke.y - (7.5 + 1.8 * 0.5)) < 0.01, 'Correct displacement calculation');
});

test('F6.5: Spores ambient hovering behavior', () => {
  // Spores bob gently within radius
  const sporeCenter = { x: -18, y: 3.5, z: -16 };
  const spore = {
    spawnX: sporeCenter.x, spawnY: sporeCenter.y, spawnZ: sporeCenter.z,
    x: sporeCenter.x, y: sporeCenter.y, z: sporeCenter.z,
    vx: 0.2, vy: 0.1, vz: -0.1,
    age: 0,
    maxLife: 5.0,
  };

  ParticlesModel.stepParticle(spore, 2.0);
  const distFromCenter = Math.hypot(spore.x - sporeCenter.x, spore.z - sporeCenter.z);
  assert.ok(distFromCenter < 5.0, 'Spore stays within local mushroom grove volume');
});

test('F6.6: Batch transform matrix update on InstancedMesh', () => {
  const count = 5;
  const instancedMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial(), count);
  const dummy = new THREE.Object3D();

  for (let i = 0; i < count; i++) {
    dummy.position.set(i * 2, i, 0);
    dummy.updateMatrix();
    instancedMesh.setMatrixAt(i, dummy.matrix);
  }
  instancedMesh.instanceMatrix.needsUpdate = true;

  const readMatrix = new THREE.Matrix4();
  instancedMesh.getMatrixAt(2, readMatrix);
  const pos = new THREE.Vector3().setFromMatrixPosition(readMatrix);

  assert.equal(pos.x, 4);
  assert.equal(pos.y, 2);
  assert.equal(pos.z, 0);
});
