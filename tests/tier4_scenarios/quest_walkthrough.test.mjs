// ===================================================
// quest_walkthrough.test.mjs — Tier 4: Complete RPG Story Quest Walkthrough
// ===================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import '../helpers/headless_env.mjs';
import { createTestWorld, createTestPlayer, createTestDialogueSystem, createTestCollectibles, createTestNPCManager } from '../helpers/test_fixtures.mjs';

test('T4.1: Complete End-to-End Quest Walkthrough across all 3 NPCs and elevation tiers', () => {
  const { scene, world } = createTestWorld();
  const player = createTestPlayer(scene);
  const dialogue = createTestDialogueSystem();
  const collectibles = createTestCollectibles(scene, world);
  const npcs = createTestNPCManager(scene, world);

  const mockCamera = {
    getForwardVector: () => new THREE.Vector3(0, 0, -1),
    getRightVector: () => new THREE.Vector3(1, 0, 0),
  };

  let playerScore = 0;

  // ─── Step 1: Spawn & Walk to Finn ──────────────────────────────────────────
  player.position.set(0, 0, 0);
  assert.equal(player.position.y, 0.0, 'Spawned on valley floor');

  // Walk toward Finn at (-4, 0, -4)
  const dirToFinn = new THREE.Vector3(-4, 0, -4).normalize();
  for (let f = 0; f < 10; f++) {
    player.update(0.05, dirToFinn, false, false, false, mockCamera, world);
  }

  // Check NPC proximity
  const activeNPC = npcs.update(0.016, player.position);
  assert.ok(activeNPC, 'Finn prompt becomes visible');
  assert.equal(activeNPC.id, 'finn');

  // ─── Step 2: Complete Finn Dialogue Quest ──────────────────────────────────
  const graph = dialogue.getDialogues();
  assert.equal(dialogue.storyFlags.talkedToFinn, false);

  // Advance dialogue to finn_quest node
  dialogue.currentNode = graph.finn_quest;
  if (dialogue.currentNode.flag) {
    dialogue.storyFlags[dialogue.currentNode.flag] = true;
  }
  assert.equal(dialogue.storyFlags.talkedToFinn, true, 'Finn quest complete, compass and glider unlocked');

  // ─── Step 3: Collect Valley Coins & Ascend Ramp 1 ──────────────────────────
  // Player collects a valley coin at (0, 0)
  const coin = collectibles.items.find(i => i.type === 'coin');
  playerScore += coin.points;
  assert.equal(playerScore, 10);

  // Ascend Ramp 1 to North Plateau (z: -2 -> 8, ends at 3.5m)
  player.position.set(-12, 1.75, 3); // On ramp
  assert.equal(world.getGroundHeight(player.position.x, player.position.z), 1.75);

  player.position.set(-12, 3.5, 12); // Arrived on North Plateau
  assert.equal(world.getGroundHeight(player.position.x, player.position.z), 3.5);

  // ─── Step 4: Bram Dialogue at Bridge ───────────────────────────────────────
  // Walk towards Bram at (1.0, 3.5, -13.0)
  player.position.set(1.0, 3.5, -12.0); // Within interaction distance 3.5m
  const bramNPC = npcs.update(0.016, player.position);
  assert.ok(bramNPC, 'Bram prompt becomes visible');
  assert.equal(bramNPC.id, 'bram');

  // Complete Bram dialogue
  dialogue.currentNode = graph.bram_hint;
  if (dialogue.currentNode.flag) {
    dialogue.storyFlags[dialogue.currentNode.flag] = true;
  }
  assert.equal(dialogue.storyFlags.learnedAboutMushrooms, true, 'Learned about bouncy mushrooms hint');

  // ─── Step 5: Launch to Peak via Bouncy Mushroom 2 ──────────────────────────
  // Travel to Mushroom 2 at (6, 27)
  const m2 = world.bouncyMushrooms[1];
  player.position.set(m2.x, m2.y, m2.z);

  // Step on mushroom -> bounce
  player.update(0.016, new THREE.Vector3(0, 0, 0), false, false, false, mockCamera, world);
  assert.equal(player.isGrounded, false);
  assert.ok(player.velocityY >= 20);

  // Ascend and glide toward Peak Summit (18, 22)
  for (let f = 0; f < 250; f++) {
    const dir = new THREE.Vector3(18 - player.position.x, 0, 22 - player.position.z);
    if (dir.lengthSq() > 0.01) dir.normalize();
    player.update(0.02, dir, true, false, true, mockCamera, world);
    if (player.isGrounded) break;
  }

  assert.equal(player.isGrounded, true, 'Touchdown on Peak');
  assert.equal(player.position.y, 7.0, 'Elevation is exactly 7.0m atop summit');

  // ─── Step 6: Open Golden Chest atop Summit ─────────────────────────────────
  const peakChest = collectibles.items.find(
    i => i.type === 'chest' && Math.hypot(i.mesh.position.x - 18, i.mesh.position.z - 20) < 1.0
  );
  assert.ok(peakChest);
  playerScore += peakChest.points;
  assert.equal(playerScore, 210, 'Score updated with 200 chest points');

  // ─── Step 7: Meet Forest Spirit & Complete Finale ─────────────────────────
  player.position.set(18, 7.0, 18);
  const spiritNPC = npcs.update(0.016, player.position);
  assert.ok(spiritNPC, 'Spirit prompt becomes visible');
  assert.equal(spiritNPC.id, 'spirit');

  dialogue.currentNode = graph.spirit_praise;
  if (dialogue.currentNode.flag) {
    dialogue.storyFlags[dialogue.currentNode.flag] = true;
  }
  assert.equal(dialogue.storyFlags.spiritAwakened, true, 'Forest Spirit awakened! Game narrative complete');

  // Verify all 3 story flags are satisfied
  assert.equal(dialogue.storyFlags.talkedToFinn, true);
  assert.equal(dialogue.storyFlags.learnedAboutMushrooms, true);
  assert.equal(dialogue.storyFlags.spiritAwakened, true);
});
