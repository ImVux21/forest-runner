// ===================================================
// ObstacleManager.js — Spawns KayKit forest obstacles
// Low rocks (jumpable), bushes (jumpable), and tall trees (dodge-only)
// ===================================================
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const LANE_WIDTH = 2.5;
// Screen-left is +X, center is 0, screen-right is -X
const LANES = [LANE_WIDTH, 0, -LANE_WIDTH];
const SPAWN_Z = 65;         // How far ahead to spawn
const DESPAWN_Z = -10;      // When to remove

const OBSTACLE_MODELS = {
  tree:  ['Tree_1_A', 'Tree_2_A', 'Tree_3_A'],
  rock:  ['Rock_1_A', 'Rock_2_A', 'Rock_3_A'],
  bush:  ['Bush_1_A', 'Bush_2_A'],
};

// Carefully tuned obstacle configurations:
// - Trees: Tall, CANNOT be jumped, must switch lanes
// - Rocks & Bushes: Low profile, CAN be jumped over
const OBSTACLE_TYPES = [
  // Low rock — jump over or dodge
  { type: 'rock', scale: [0.75, 0.95], pattern: 'single', weight: 4 },
  // Bush — jump over or dodge
  { type: 'bush', scale: [0.75, 0.95], pattern: 'single', weight: 4 },
  // Single tall tree — dodge to adjacent lane
  { type: 'tree', scale: [0.95, 1.2],  pattern: 'single', weight: 3 },
  // Double tree/rock — blocks 2 lanes, leaving 1 safe lane
  { type: 'tree', scale: [0.9, 1.1],   pattern: 'double', weight: 2 },
  // Jump test: 2 rocks blocking 2 lanes or 3 low rocks across all 3
  { type: 'rock', scale: [0.7, 0.85],  pattern: 'triple', weight: 1 },
];

export class ObstacleManager {
  constructor(scene) {
    this.scene = scene;
    this.obstacles = [];     // Active obstacles [{mesh, box, z}]
    this.models = {};        // Loaded templates
    this.loader = new GLTFLoader();
    this.spawnTimer = 1.8;
    this.minSpawnInterval = 1.9;
    this.totalDistance = 0;
  }

  async init() {
    await this._loadModels();
  }

  async _loadModels() {
    const basePath = './assets/forest/gltf/';

    const allModels = [
      ...OBSTACLE_MODELS.tree,
      ...OBSTACLE_MODELS.rock,
      ...OBSTACLE_MODELS.bush,
    ];

    await Promise.all(allModels.map(name =>
      this._loadGLTF(`${basePath}${name}.gltf`)
        .then(mesh => { this.models[name] = mesh; })
        .catch(err => {
          console.warn(`[ObstacleManager] Fallback used for ${name}:`, err);
          this.models[name] = this._createFallback(name);
        })
    ));
  }

  _loadGLTF(path) {
    return new Promise((resolve, reject) => {
      this.loader.load(path, gltf => {
        const model = gltf.scene;
        model.traverse(child => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            // Retain original KayKit PBR shading
            if (child.material) {
              child.material.roughness = 0.65;
              child.material.metalness = 0.05;
              if (child.material.map) {
                child.material.map.colorSpace = THREE.SRGBColorSpace;
              }
            }
          }
        });
        resolve(model);
      }, undefined, reject);
    });
  }

  _createFallback(name) {
    const isRock = name.includes('Rock');
    const isBush = name.includes('Bush');
    let geo;
    let color;
    if (isRock) {
      geo = new THREE.DodecahedronGeometry(0.7, 0);
      color = 0x777777;
    } else if (isBush) {
      geo = new THREE.SphereGeometry(0.6, 6, 5);
      color = 0x338833;
    } else {
      geo = new THREE.ConeGeometry(0.7, 3.5, 6);
      color = 0x226622;
    }
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.7, flatShading: true });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  // ─── Spawning ─────────────────────────────────────────────────────────────

  _selectObstacleType() {
    const totalWeight = OBSTACLE_TYPES.reduce((s, t) => s + t.weight, 0);
    let r = Math.random() * totalWeight;
    for (const t of OBSTACLE_TYPES) {
      r -= t.weight;
      if (r <= 0) return t;
    }
    return OBSTACLE_TYPES[0];
  }

  _getModelName(type) {
    const pool = OBSTACLE_MODELS[type];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  _spawnObstacles(speed) {
    const typeDef = this._selectObstacleType();
    let lanesToBlock;

    if (typeDef.pattern === 'single') {
      const lane = Math.floor(Math.random() * 3);
      lanesToBlock = [lane];
    } else if (typeDef.pattern === 'double') {
      // Block 2 lanes, leave at least 1 free
      const free = Math.floor(Math.random() * 3);
      lanesToBlock = [0, 1, 2].filter(l => l !== free);
    } else {
      // Triple (jump challenge) — only with low rocks or bushes
      lanesToBlock = [0, 1, 2];
    }

    const [minS, maxS] = typeDef.scale;

    lanesToBlock.forEach(laneIdx => {
      const name = this._getModelName(typeDef.type);
      const template = this.models[name];
      if (!template) return;

      const mesh = template.clone();
      const scale = minS + Math.random() * (maxS - minS);
      mesh.scale.setScalar(scale);

      // Place in designated lane
      const x = LANES[laneIdx];
      const zOffset = (Math.random() - 0.5) * 1.5;
      mesh.position.set(x, 0, SPAWN_Z + zOffset);
      mesh.rotation.y = Math.random() * Math.PI * 2;

      this.scene.add(mesh);

      // Compute bounding box
      const box = new THREE.Box3().setFromObject(mesh);
      // Fair hitbox shrinking: trees get slightly narrower, rocks get shorter top buffer
      const shrinkX = 0.28;
      const shrinkZ = 0.28;
      const shrinkY = typeDef.type === 'rock' ? 0.15 : 0.2;
      box.min.x += shrinkX; box.min.z += shrinkZ;
      box.max.x -= shrinkX; box.max.z -= shrinkZ; box.max.y -= shrinkY;

      this.obstacles.push({ mesh, box, z: mesh.position.z });
    });
  }

  // ─── Update Loop ──────────────────────────────────────────────────────────

  update(delta, speed) {
    const moveAmount = speed * delta;
    this.totalDistance += moveAmount;

    // Move obstacles towards camera
    this.obstacles.forEach(obs => {
      obs.mesh.position.z -= moveAmount;
      obs.box.min.z -= moveAmount;
      obs.box.max.z -= moveAmount;
    });

    // Remove obstacles that scrolled behind player
    this.obstacles = this.obstacles.filter(obs => {
      if (obs.mesh.position.z < DESPAWN_Z) {
        this.scene.remove(obs.mesh);
        return false;
      }
      return true;
    });

    // Spawn new obstacles dynamically based on runner speed
    this.spawnTimer -= delta;
    const interval = Math.max(0.85, this.minSpawnInterval - (speed - 8) * 0.045);
    if (this.spawnTimer <= 0) {
      this._spawnObstacles(speed);
      this.spawnTimer = interval;
    }
  }

  // ─── Collision Check ──────────────────────────────────────────────────────

  checkCollision(playerBox) {
    return this.obstacles.some(obs => {
      // Only test obstacles in active collision window
      const z = obs.mesh.position.z;
      if (z < -2.0 || z > 3.2) return false;
      return playerBox.intersectsBox(obs.box);
    });
  }

  reset() {
    this.obstacles.forEach(obs => this.scene.remove(obs.mesh));
    this.obstacles = [];
    this.spawnTimer = 1.8; // Brief grace period at start
    this.totalDistance = 0;
  }
}
