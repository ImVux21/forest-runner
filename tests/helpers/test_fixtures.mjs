// ===================================================
// test_fixtures.mjs — Test Fixtures & Factories for Forest Runner Tests
// ===================================================

import './headless_env.mjs';
import * as THREE from 'three';
import { WorldManager } from '../../src/game/WorldManager.js';
import { Player3D } from '../../src/game/Player3D.js';
import { DialogueSystem } from '../../src/game/DialogueSystem.js';
import { OpenWorldCollectibles } from '../../src/game/OpenWorldCollectibles.js';
import { NPCManager } from '../../src/game/NPCManager.js';

export function createTestScene() {
  return new THREE.Scene();
}

export function createTestWorld(scene = createTestScene()) {
  const world = new WorldManager(scene);
  world._buildTerrain();
  world._buildRiver();
  world._buildSuspensionBridge();
  world._buildBouncyMushrooms();
  return { scene, world };
}

export function createTestPlayer(scene = createTestScene()) {
  const player = new Player3D(scene);
  player._createAdventurerMesh();
  return player;
}

export function createTestDialogueSystem() {
  const mockAudio = {
    playTalkBeep: () => {},
    playCollectSound: () => {},
    playJumpSound: () => {},
  };
  return new DialogueSystem(mockAudio);
}

export function createTestCollectibles(scene, world) {
  const collectibles = new OpenWorldCollectibles(scene, world);
  collectibles.spawnAll();
  return collectibles;
}

export function createTestNPCManager(scene, world) {
  const npcManager = new NPCManager(scene, world);
  npcManager.init();
  return npcManager;
}
