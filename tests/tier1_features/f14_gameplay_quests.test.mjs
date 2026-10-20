// ===================================================
// f14_gameplay_quests.test.mjs — F14: Gameplay & Quest Mechanics Preservation
// ===================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import '../helpers/headless_env.mjs';
import { GameplayModel } from '../helpers/analytical_models.mjs';
import { createTestWorld, createTestPlayer, createTestDialogueSystem, createTestCollectibles } from '../helpers/test_fixtures.mjs';

test('F14.1: Player horizontal movement speeds (walk, sprint, glide)', () => {
  const p = GameplayModel.PHYSICS;
  assert.equal(p.WALK_SPEED, 10.5, 'Walk speed is 10.5 m/s');
  assert.equal(p.SPRINT_SPEED, 17.0, 'Sprint speed is 17.0 m/s');
  assert.equal(p.GLIDE_SPEED, 14.5, 'Glide speed is 14.5 m/s');
  assert.ok(p.SPRINT_SPEED > p.GLIDE_SPEED, 'Sprint is fastest mode');
  assert.ok(p.GLIDE_SPEED > p.WALK_SPEED, 'Gliding is faster than normal walk');
});

test('F14.2: Jump impulse force and gravity dynamics', () => {
  const p = GameplayModel.PHYSICS;
  assert.equal(p.JUMP_FORCE, 12.5, 'Jump force is 12.5');
  assert.equal(p.GRAVITY, -28.0, 'Downward gravity is -28.0 m/s^2');

  // Peak jump height: v0^2 / (2 * g) = 12.5^2 / (2 * 28) = 156.25 / 56 ~ 2.79m
  const maxJumpHeight = (p.JUMP_FORCE * p.JUMP_FORCE) / (2 * Math.abs(p.GRAVITY));
  assert.ok(maxJumpHeight > 2.5 && maxJumpHeight < 3.0, `Jump height ~2.79m, got ${maxJumpHeight.toFixed(2)}m`);
  assert.ok(maxJumpHeight < 3.5, 'Player cannot jump onto 3.5m plateau directly without ramps/mushrooms');
});

test('F14.3: Paraglider aerodynamic terminal fall speed', () => {
  const p = GameplayModel.PHYSICS;
  assert.equal(p.GLIDE_FALL_SPEED, -2.0, 'Glider limits fall speed to gentle -2.0 m/s');

  const { scene, world } = createTestWorld();
  const player = createTestPlayer(scene);

  player.position.set(0, 10, 0);
  player.isGrounded = false;
  player.velocityY = -10.0; // Falling rapidly

  // When glider is engaged:
  const mockCamera = {
    getForwardVector: () => new THREE.Vector3(0, 0, -1),
    getRightVector: () => new THREE.Vector3(1, 0, 0),
  };
  const inputDir = new THREE.Vector3(0, 0, 0);
  player.update(0.1, inputDir, true, false, true, mockCamera, world);

  assert.equal(player.isGliding, true, 'Glider activates on fall while holding space/glide');
  assert.equal(player.velocityY, -2.0, 'Vertical velocity clamped to GLIDE_FALL_SPEED');
});

test('F14.4: 4 Bouncy mushrooms locations and launch power specifications', () => {
  const { world } = createTestWorld();
  assert.equal(world.bouncyMushrooms.length, 4);

  const m = world.bouncyMushrooms;
  assert.equal(m[0].power, 20); // Valley to North
  assert.equal(m[1].power, 22); // North to Peak
  assert.equal(m[2].power, 19); // Valley to SW
  assert.equal(m[3].power, 19); // Valley to SE

  // Launcher 2 (power 22) must launch higher than launcher 1 (power 20)
  assert.ok(m[1].power > m[0].power);
});

test('F14.5: Dialogue node graph and quest flag progression for 3 NPCs', () => {
  const dialogue = createTestDialogueSystem();
  const graph = dialogue.getDialogues();

  // Finn quest branch
  assert.ok(graph.finn_intro);
  assert.ok(graph.finn_quest);
  assert.equal(graph.finn_quest.flag, 'talkedToFinn');

  // Bram quest branch
  assert.ok(graph.bram_intro);
  assert.ok(graph.bram_hint);
  assert.equal(graph.bram_hint.flag, 'learnedAboutMushrooms');

  // Spirit quest branch
  assert.ok(graph.spirit_intro);
  assert.ok(graph.spirit_praise);
  assert.equal(graph.spirit_praise.flag, 'spiritAwakened');
});

test('F14.6: Collectible inventory totals and maximum achievable score', () => {
  const { scene, world } = createTestWorld();
  const coll = createTestCollectibles(scene, world);

  const coins = coll.items.filter(i => i.type === 'coin');
  const gems = coll.items.filter(i => i.type === 'gem');
  const chests = coll.items.filter(i => i.type === 'chest');

  assert.equal(coins.length, 18, 'Must have exactly 18 coins');
  assert.equal(gems.length, 4, 'Must have exactly 4 emerald gems');
  assert.equal(chests.length, 2, 'Must have exactly 2 golden chests');

  const totalPoints = coins.reduce((acc, c) => acc + c.points, 0)
    + gems.reduce((acc, g) => acc + g.points, 0)
    + chests.reduce((acc, ch) => acc + ch.points, 0);

  assert.equal(totalPoints, 780, 'Total collectible score must be exactly 780 points');
});
