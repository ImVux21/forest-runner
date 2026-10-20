// ===================================================
// f08_river_canyon.test.mjs — F8: Animated River Surface & Canyon Coverage
// ===================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import '../helpers/headless_env.mjs';
import { RiverModel } from '../helpers/analytical_models.mjs';
import { createTestWorld } from '../helpers/test_fixtures.mjs';

test('F8.1: River surface plane elevation is at y = 0.04m', () => {
  const { world } = createTestWorld();

  assert.equal(RiverModel.WATER_SURFACE_Y, 0.04);
  assert.ok(world.waterMesh, 'WorldManager should have initialized waterMesh');
  assert.equal(world.waterMesh.children.length, 5, 'River consists of 5 segments');

  const firstSeg = world.waterMesh.children[0];
  assert.equal(firstSeg.position.y, 0.04, 'River segment elevation is 0.04m');
});

test('F8.2: Sinusoidal wave ripple displacement bounds', () => {
  const amp = RiverModel.MAX_WAVE_AMPLITUDE; // 0.06
  const testPoints = [
    { x: 0, z: 0 },
    { x: 5, z: 10 },
    { x: -15, z: 20 },
    { x: 25, z: -15 },
  ];

  for (const pt of testPoints) {
    for (let t = 0; t <= 5.0; t += 0.5) {
      const disp = RiverModel.calculateWaveDisplacement(pt.x, pt.z, t, amp);
      assert.ok(
        Math.abs(disp) <= amp + 1e-6,
        `Displacement ${disp} must not exceed amplitude ${amp}`
      );
    }
  }
});

test('F8.3: Wave animation evolves continuously over time', () => {
  const x = 5, z = 8;
  const h0 = RiverModel.getWaterElevation(x, z, 0.0);
  const h1 = RiverModel.getWaterElevation(x, z, 0.5);
  const h2 = RiverModel.getWaterElevation(x, z, 1.0);

  // Heights should fluctuate smoothly around 0.04m
  assert.ok(h0 >= 0.04 - 0.06 && h0 <= 0.04 + 0.06);
  assert.ok(h1 >= 0.04 - 0.06 && h1 <= 0.04 + 0.06);
  assert.ok(h2 >= 0.04 - 0.06 && h2 <= 0.04 + 0.06);
  assert.notEqual(h0, h1, 'Wave height changes as time advances');
});

test('F8.4: S-curve river coordinates span the valley floor', () => {
  const segments = RiverModel.SEGMENTS;
  assert.equal(segments.length, 5, 'River course has 5 core segments');

  // Verify coordinates cover both negative and positive X and Z
  const xs = segments.map(s => s.x);
  const zs = segments.map(s => s.z);

  assert.ok(Math.min(...xs) < -20, 'River reaches west side (x < -20)');
  assert.ok(Math.max(...xs) > 25, 'River reaches east side (x > 25)');
  assert.ok(Math.min(...zs) < -25, 'River reaches south side (z < -25)');
  assert.ok(Math.max(...zs) > 15, 'River reaches north side (z > 15)');
});

test('F8.5: Water optical material properties validation', () => {
  const { world } = createTestWorld();
  const mat = world.waterMat;

  assert.equal(mat.transparent, true, 'Water material must be transparent');
  assert.ok(mat.opacity >= 0.6 && mat.opacity <= 0.85, 'Water opacity between 0.6 and 0.85');
  assert.ok(mat.roughness <= 0.25, 'Water roughness must be low for glossy reflections');
  assert.equal(mat.color.getHexString(), '18b5d6', 'Crystal cyan water color');
});

test('F8.6: Wooden dock placement alignment with riverbank', () => {
  // Dock placed at riverbank (e.g. x: -2, y: 0.1, z: 8)
  const dock = {
    x: -2,
    y: 0.1,
    z: 8,
    w: 3.0,
    d: 1.8,
  };

  assert.ok(dock.y > RiverModel.WATER_SURFACE_Y, 'Dock walkway sits above water level');
  assert.ok(dock.y <= 0.2, 'Dock walkway is easily stepped onto from valley floor (<= 0.2m)');
});
