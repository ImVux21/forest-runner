// Test harness to independently verify Forest Runner physics, ramps, mushrooms, dialogues
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { WorldManager } from '../../../src/game/WorldManager.js';
import { DialogueSystem } from '../../../src/game/DialogueSystem.js';

test('WorldManager: Analytical Height & Ramp Queries', () => {
  const scene = new THREE.Scene();
  const world = new WorldManager(scene);

  // Valley floor
  assert.equal(world.getGroundHeight(0, 0), 0.0, 'Valley floor should be 0.0m');

  // North Plateau (Tier 1: 3.5m)
  assert.equal(world.getGroundHeight(-12, 18), 3.5, 'North Plateau should be 3.5m');

  // Peak Summit (Tier 2: 7.0m)
  assert.equal(world.getGroundHeight(18, 22), 7.0, 'Peak Summit should be 7.0m');

  // Southwest Plateau (Tier 1: 3.5m)
  assert.equal(world.getGroundHeight(-18, -16), 3.5, 'Southwest Plateau should be 3.5m');

  // Suspension Bridge (Tier 1 span: 3.55m)
  assert.equal(world.getGroundHeight(1, -17), 3.55, 'Bridge walkway should be 3.55m');

  // Ramp 1: Valley -> North Plateau (z: 3, d: 10, startH: 0, endH: 3.5)
  // At midpoint z = 3, height should be 1.75
  const rampMidH = world.getGroundHeight(-12, 3);
  assert.ok(Math.abs(rampMidH - 1.75) < 0.01, `Ramp midpoint should be 1.75m, got ${rampMidH}`);

  // Ramp 2: North Plateau -> Peak (x: 5, w: 10, startH: 3.5, endH: 7.0)
  // At midpoint x = 5, height should be 5.25
  const ramp2MidH = world.getGroundHeight(5, 22);
  assert.ok(Math.abs(ramp2MidH - 5.25) < 0.01, `Ramp 2 midpoint should be 5.25m, got ${ramp2MidH}`);
});

test('WorldManager: Bouncy Mushroom Trigger & Power', () => {
  const scene = new THREE.Scene();
  const world = new WorldManager(scene);
  world._buildBouncyMushrooms();

  assert.equal(world.bouncyMushrooms.length, 4, 'Should have 4 bouncy mushrooms');

  // Spot 1: [-26, 8] with power 20
  const m1 = world.bouncyMushrooms[0];
  assert.equal(m1.x, -26);
  assert.equal(m1.z, 8);
  assert.equal(m1.power, 20);

  // Spot 2: [6, 27] with power 22 (shoots to Peak)
  const m2 = world.bouncyMushrooms[1];
  assert.equal(m2.x, 6);
  assert.equal(m2.z, 27);
  assert.equal(m2.power, 22);

  // Test trigger detection
  const bouncePower = world.checkMushroomBounce({ x: -26, y: m1.y, z: 8 });
  assert.equal(bouncePower, 20, 'Stepping on mushroom should return bounce power 20');

  // Test non-trigger when far
  const noBounce = world.checkMushroomBounce({ x: 0, y: 0, z: 0 });
  assert.equal(noBounce, 0, 'Standing far away should return 0 bounce power');
});

test('DialogueSystem: Graph Integrity & Story Flags', () => {
  const proto = DialogueSystem.prototype;
  const dialogues = proto.getDialogues();

  // NPC 1: Finn
  assert.ok(dialogues.finn_intro, 'finn_intro exists');
  assert.ok(dialogues.finn_story, 'finn_story exists');
  assert.ok(dialogues.finn_quest, 'finn_quest exists');
  assert.equal(dialogues.finn_quest.flag, 'talkedToFinn');

  // NPC 2: Bram
  assert.ok(dialogues.bram_intro, 'bram_intro exists');
  assert.ok(dialogues.bram_hint, 'bram_hint exists');
  assert.equal(dialogues.bram_hint.flag, 'learnedAboutMushrooms');

  // NPC 3: Forest Spirit
  assert.ok(dialogues.spirit_intro, 'spirit_intro exists');
  assert.ok(dialogues.spirit_praise, 'spirit_praise exists');
  assert.equal(dialogues.spirit_praise.flag, 'spiritAwakened');
});
