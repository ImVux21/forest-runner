import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

// 1. Test Night Factor calculation curve
function calculateNightFactor(dayTime) {
  // dayTime in [0, 1]: 0.25 noon, 0.50 sunset, 0.75 midnight, 1.0/0.0 dawn
  if (dayTime >= 0.0 && dayTime < 0.40) {
    return 0.0; // Broad daylight
  } else if (dayTime >= 0.40 && dayTime < 0.55) {
    // Sunset ramp up
    const t = (dayTime - 0.40) / 0.15;
    return t * t * (3 - 2 * t); // smoothstep
  } else if (dayTime >= 0.55 && dayTime < 0.90) {
    return 1.0; // Midnight
  } else {
    // Dawn ramp down (0.90 to 1.00)
    const t = (dayTime - 0.90) / 0.10;
    return 1.0 - t * t * (3 - 2 * t); // smoothstep
  }
}

test('Night Factor curve satisfies smooth transitions', () => {
  // Noon: fully daytime
  assert.equal(calculateNightFactor(0.25), 0.0);
  // Early sunset: starting to ramp
  assert.ok(calculateNightFactor(0.45) > 0.1 && calculateNightFactor(0.45) < 0.6);
  // Full sunset end: near 1.0
  assert.ok(calculateNightFactor(0.54) > 0.9);
  // Midnight: fully night
  assert.equal(calculateNightFactor(0.75), 1.0);
  // Dawn: ramping down
  assert.ok(calculateNightFactor(0.95) > 0.2 && calculateNightFactor(0.95) < 0.8);
  // Near dawn end: near 0.0
  assert.ok(calculateNightFactor(0.99) < 0.1);
});

// 2. Test Cloud Toroidal Wrapping
test('Cloud wrapping maintains bounds within sky expanse [-65, 65]', () => {
  let cloudX = 64.0;
  const speed = 2.0;
  const delta = 1.0;
  cloudX += speed * delta; // now 66.0

  const minX = -65.0, maxX = 65.0;
  const spanX = maxX - minX; // 130.0

  if (cloudX > maxX) {
    cloudX -= spanX;
  }
  assert.equal(cloudX, -64.0);
  assert.ok(cloudX >= minX && cloudX <= maxX);
});

// 3. Test THREE.InstancedMesh lifecycle and matrix transforms headlessly
test('THREE.InstancedMesh sets matrices and colors correctly', () => {
  const count = 10;
  const geo = new THREE.PlaneGeometry(0.2, 0.4);
  const mat = new THREE.MeshBasicMaterial();
  const instancedMesh = new THREE.InstancedMesh(geo, mat, count);
  instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  const dummy = new THREE.Object3D();
  const matrix = new THREE.Matrix4();
  const color = new THREE.Color(0xff9933);

  for (let i = 0; i < count; i++) {
    dummy.position.set(i * 2, 5, -i);
    dummy.rotation.set(0.1 * i, 0, 0);
    dummy.scale.setScalar(1.0 + i * 0.1);
    dummy.updateMatrix();

    instancedMesh.setMatrixAt(i, dummy.matrix);
    instancedMesh.setColorAt(i, color);
  }

  instancedMesh.instanceMatrix.needsUpdate = true;
  if (instancedMesh.instanceColor) instancedMesh.instanceColor.needsUpdate = true;

  // Verify matrix retrieval for index 3
  instancedMesh.getMatrixAt(3, matrix);
  const pos = new THREE.Vector3();
  pos.setFromMatrixPosition(matrix);
  assert.equal(pos.x, 6);
  assert.equal(pos.y, 5);
  assert.equal(pos.z, -3);

  // Verify color retrieval
  const retColor = new THREE.Color();
  instancedMesh.getColorAt(3, retColor);
  assert.equal(retColor.getHex(), 0xff9933);
});

// 4. Test Campfire Flicker Math stability
test('Campfire flicker produces bounded non-zero intensity', () => {
  const baseDay = 0.8;
  const baseNight = 2.5;

  for (let t = 0; t < 10; t += 0.1) {
    const nightFactor = 1.0; // night
    const targetIntensity = THREE.MathUtils.lerp(baseDay, baseNight, nightFactor);
    const flicker = Math.sin(t * 16.3) * 0.18 + Math.cos(t * 27.7) * 0.12;
    const finalIntensity = THREE.MathUtils.clamp(targetIntensity + flicker * 0.35, 0.5, 4.0);

    assert.ok(finalIntensity > 1.5, `Campfire night intensity too low: ${finalIntensity}`);
    assert.ok(finalIntensity < 3.2, `Campfire night intensity too high: ${finalIntensity}`);
  }
});
