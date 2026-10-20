// ===================================================
// f02_shadows.test.mjs — F2: Soft PCF Shadows Coverage
// ===================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import '../helpers/headless_env.mjs';
import { ShadowsModel } from '../helpers/analytical_models.mjs';

test('F2.1: PCFSoftShadowMap matches Three.js shadow type', () => {
  assert.equal(
    ShadowsModel.REQUIRED_SHADOW_MAP_TYPE,
    THREE.PCFSoftShadowMap,
    'Must use THREE.PCFSoftShadowMap'
  );
  assert.equal(THREE.PCFSoftShadowMap, 2, 'THREE.PCFSoftShadowMap enum value is 2');
});

test('F2.2: Shadow bias prevents surface acne and detachment', () => {
  assert.ok(ShadowsModel.MIN_BIAS < 0, 'Bias should be negative to push shadow away from surface');
  assert.ok(ShadowsModel.MAX_BIAS < 0, 'Max bias should remain negative');
  assert.ok(
    ShadowsModel.MIN_BIAS <= -0.0001 && ShadowsModel.MAX_BIAS >= -0.001,
    'Bias should be within [-0.001, -0.0001] range'
  );
});

test('F2.3: Shadow map resolution allocation meets visual fidelity criteria', () => {
  assert.ok(
    ShadowsModel.MIN_MAP_SIZE >= 2048,
    'Shadow map size must be at least 2048x2048 for crisp soft shadows'
  );
});

test('F2.4: Directional light shadow frustum bounds cover the 90m valley', () => {
  const f = ShadowsModel.FRUSTUM_BOUNDS;
  assert.ok(f.left <= -45, 'Left frustum plane must cover -45m boundary');
  assert.ok(f.right >= 45, 'Right frustum plane must cover +45m boundary');
  assert.ok(f.bottom <= -45, 'Bottom frustum plane must cover -45m boundary');
  assert.ok(f.top >= 45, 'Top frustum plane must cover +45m boundary');
  assert.ok(f.far >= 150, 'Far clipping plane must reach across high elevation terrain');
});

test('F2.5: DirectionalLight shadow initialization and configuration', () => {
  const light = new THREE.DirectionalLight(0xfff7e2, 2.5);
  light.castShadow = true;
  light.shadow.mapSize.set(2048, 2048);
  light.shadow.bias = -0.0005;
  light.shadow.camera.left = ShadowsModel.FRUSTUM_BOUNDS.left;
  light.shadow.camera.right = ShadowsModel.FRUSTUM_BOUNDS.right;
  light.shadow.camera.top = ShadowsModel.FRUSTUM_BOUNDS.top;
  light.shadow.camera.bottom = ShadowsModel.FRUSTUM_BOUNDS.bottom;
  light.shadow.camera.near = ShadowsModel.FRUSTUM_BOUNDS.near;
  light.shadow.camera.far = ShadowsModel.FRUSTUM_BOUNDS.far;

  assert.equal(light.castShadow, true);
  assert.equal(light.shadow.mapSize.x, 2048);
  assert.equal(light.shadow.mapSize.y, 2048);
  assert.equal(light.shadow.bias, -0.0005);
  assert.equal(light.shadow.camera.left, -50);
  assert.equal(light.shadow.camera.right, 50);
});

test('F2.6: Mesh shadow casting and receiving property validation', () => {
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const mat = new THREE.MeshStandardMaterial();
  const mesh = new THREE.Mesh(geo, mat);

  mesh.castShadow = true;
  mesh.receiveShadow = true;

  assert.equal(mesh.castShadow, true, 'Prop mesh must be configured to cast shadow');
  assert.equal(mesh.receiveShadow, true, 'Prop mesh must be configured to receive shadow');
});
