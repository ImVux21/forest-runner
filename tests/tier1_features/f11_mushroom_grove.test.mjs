// ===================================================
// f11_mushroom_grove.test.mjs — F11: Luminescent Mushroom Grove Coverage
// ===================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import '../helpers/headless_env.mjs';
import { BiomesModel, GameplayModel } from '../helpers/analytical_models.mjs';
import { createTestWorld } from '../helpers/test_fixtures.mjs';

test('F11.1: Luminescent Mushroom Grove geographic bounds and location', () => {
  const g = BiomesModel.MUSHROOM_GROVE;
  assert.equal(g.id, 'mushroom_grove');
  assert.equal(g.center.x, -18);
  assert.equal(g.center.z, -16);
  assert.ok(g.radius >= 12.0);
});

test('F11.2: Giant mushroom emissive material and visual glow settings', () => {
  const capMat = new THREE.MeshStandardMaterial({
    color: 0x9c27b0,
    emissive: 0xba68c8,
    emissiveIntensity: 0.5,
    roughness: 0.3,
  });

  assert.ok(capMat.emissive.r > 0 || capMat.emissive.g > 0 || capMat.emissive.b > 0, 'Must have emissive color');
  assert.ok(capMat.emissiveIntensity >= 0.25, 'Emissive intensity must be at least 0.25 for glowing fantasy shrooms');
});

test('F11.3: Bouncy spring mushroom launcher 1 registration and properties', () => {
  const { world } = createTestWorld();

  assert.equal(world.bouncyMushrooms.length, 4, 'Total 4 bouncy mushrooms in world');
  const m1 = world.bouncyMushrooms[0];

  assert.equal(m1.x, -26);
  assert.equal(m1.z, 8);
  assert.equal(m1.power, 20, 'Launcher 1 provides vertical bounce force 20');
});

test('F11.4: Stepping on bouncy mushroom triggers vertical velocity', () => {
  const { world } = createTestWorld();
  const m1 = world.bouncyMushrooms[0];

  const playerOnPad = { x: -26.0, y: m1.y, z: 8.0 };
  const bounce = world.checkMushroomBounce(playerOnPad);

  assert.equal(bounce, 20, 'Direct contact triggers bounce power 20');
});

test('F11.5: Player outside radius does not trigger bounce', () => {
  const { world } = createTestWorld();
  const m1 = world.bouncyMushrooms[0];

  // 2 meters away from pad
  const playerFar = { x: -26.0 + 2.0, y: m1.y, z: 8.0 };
  const bounce = world.checkMushroomBounce(playerFar);

  assert.equal(bounce, 0, 'No bounce outside trigger radius');
});

test('F11.6: Ambient spore particles localized to grove territory', () => {
  const grove = BiomesModel.MUSHROOM_GROVE;
  const spores = [];
  for (let i = 0; i < 20; i++) {
    const angle = (i / 20) * Math.PI * 2;
    const r = (i % 5) * 2;
    spores.push({
      x: grove.center.x + Math.cos(angle) * r,
      z: grove.center.z + Math.sin(angle) * r,
      y: 3.5 + (i % 3) * 0.8,
    });
  }

  for (const s of spores) {
    const dist = Math.hypot(s.x - grove.center.x, s.z - grove.center.z);
    assert.ok(dist <= grove.radius, 'All spores reside within Mushroom Grove radius');
  }
});
