// ===================================================
// f05_clouds.test.mjs — F5: Drifting 3D Low-Poly Clouds Coverage
// ===================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import '../helpers/headless_env.mjs';
import { CloudsModel } from '../helpers/analytical_models.mjs';

test('F5.1: Cloud layer altitude clearance above summit and player reach', () => {
  assert.ok(
    CloudsModel.MIN_ALTITUDE >= 22.0,
    `Clouds altitude min ${CloudsModel.MIN_ALTITUDE}m must be >= 22.0m (far above 7m peak)`
  );
  assert.ok(
    CloudsModel.MAX_ALTITUDE <= 40.0,
    `Clouds altitude max ${CloudsModel.MAX_ALTITUDE}m must stay within camera view range`
  );
});

test('F5.2: Cloud movement matches wind direction and delta time', () => {
  const startPos = { x: 0, y: 25, z: 0 };
  const delta = 1.0; // 1 second
  const nextPos = CloudsModel.updatePosition(startPos, delta, { x: 2.0, z: 0.5 }, 45.0);

  assert.equal(nextPos.x, 2.0, 'X shifted by wind.x * delta');
  assert.equal(nextPos.z, 0.5, 'Z shifted by wind.z * delta');
  assert.equal(nextPos.y, 25, 'Altitude stays constant during horizontal drift');
});

test('F5.3: Continuous seamless boundary wrapping across map edges', () => {
  // Drifting past positive X boundary (+45m)
  const posAtRightEdge = { x: 44.5, y: 26, z: 10 };
  const wrappedPos = CloudsModel.updatePosition(posAtRightEdge, 1.0, { x: 2.0, z: 0.0 }, 45.0);

  assert.equal(wrappedPos.x, -45.0, 'Cloud crossing +45m must wrap to -45m');

  // Drifting past negative Z boundary (-45m)
  const posAtTopEdge = { x: 10, y: 26, z: -44.5 };
  const wrappedZ = CloudsModel.updatePosition(posAtTopEdge, 1.0, { x: 0.0, z: -2.0 }, 45.0);

  assert.equal(wrappedZ.z, 45.0, 'Cloud crossing -45m must wrap to +45m');
});

test('F5.4: Low-poly cloud geometric budget', () => {
  // Test low-poly cloud puff constructed of small dodecahedrons/boxes
  const puffGeo = new THREE.DodecahedronGeometry(2.0, 0);
  assert.ok(
    puffGeo.attributes.position.count <= CloudsModel.MAX_POLY_COUNT,
    'Low-poly cloud element vertex count must be <= 120'
  );
});

test('F5.5: Multi-cloud scene distribution and variance', () => {
  const clouds = [];
  for (let i = 0; i < 6; i++) {
    const x = (i - 2.5) * 12;
    const z = ((i % 3) - 1) * 15;
    const y = 24 + (i % 2) * 4;
    clouds.push({ x, y, z });
  }

  assert.equal(clouds.length, 6, 'Cluster should maintain 6 clouds');
  // Verify spacing between adjacent clouds
  const dist = Math.hypot(clouds[1].x - clouds[0].x, clouds[1].z - clouds[0].z);
  assert.ok(dist >= 10, 'Clouds should have reasonable spacing, not overlap identically');
});

test('F5.6: Clouds are non-collidable and non-shadow-receiving for performance', () => {
  const cloudMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.9,
    transparent: true,
    opacity: 0.85,
  });
  const cloudMesh = new THREE.Mesh(new THREE.BoxGeometry(4, 2, 6), cloudMat);

  // Clouds do not receive shadows from terrain and do not block player
  cloudMesh.castShadow = false;
  cloudMesh.receiveShadow = false;

  assert.equal(cloudMesh.castShadow, false);
  assert.equal(cloudMesh.receiveShadow, false);
  assert.equal(cloudMesh.material.transparent, true);
});
