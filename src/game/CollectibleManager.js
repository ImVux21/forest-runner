// ===================================================
// CollectibleManager.js — Spawns & animates Golden Coins / Gems
// Engaging coin lines, jump arcs, and sparkle collection effects
// ===================================================
import * as THREE from 'three';

const LANE_WIDTH = 2.5;
// Screen-left is +X, center is 0, screen-right is -X
const LANES = [LANE_WIDTH, 0, -LANE_WIDTH];
const SPAWN_Z = 65;
const DESPAWN_Z = -8;

export class CollectibleManager {
  constructor(scene) {
    this.scene = scene;
    this.coins = [];          // Active coins [{mesh, box, z, rotSpeed}]
    this.sparkles = [];       // Active collection particle bursts
    this.spawnTimer = 1.0;
    this.coinGeometry = new THREE.CylinderGeometry(0.38, 0.38, 0.08, 12);
    // Rotate cylinder so coin faces forward
    this.coinGeometry.rotateX(Math.PI / 2);

    this.coinMaterial = new THREE.MeshStandardMaterial({
      color: 0xffd700,         // Pure gold
      metalness: 0.85,
      roughness: 0.2,
      emissive: 0xb8860b,
      emissiveIntensity: 0.25,
    });
  }

  // ─── Spawning Patterns ───────────────────────────────────────────────────

  _spawnPattern() {
    const patterns = ['line', 'arc', 'zigzag'];
    const p = patterns[Math.floor(Math.random() * patterns.length)];
    const baseLane = Math.floor(Math.random() * 3);

    if (p === 'line') {
      // 4 coins straight along one lane
      const count = 4;
      const x = LANES[baseLane];
      for (let i = 0; i < count; i++) {
        this._addCoin(x, 0.8, SPAWN_Z + i * 2.8);
      }
    } else if (p === 'arc') {
      // Jump arc: 5 coins rising up and down over a potential obstacle
      const x = LANES[baseLane];
      const heights = [0.8, 1.4, 2.0, 1.4, 0.8];
      for (let i = 0; i < heights.length; i++) {
        this._addCoin(x, heights[i], SPAWN_Z + i * 2.2);
      }
    } else if (p === 'zigzag') {
      // 3 coins shifting lanes
      let lane = baseLane;
      for (let i = 0; i < 3; i++) {
        this._addCoin(LANES[lane], 0.8, SPAWN_Z + i * 3.5);
        lane = (lane + 1) % 3;
      }
    }
  }

  _addCoin(x, y, z) {
    const mesh = new THREE.Mesh(this.coinGeometry, this.coinMaterial);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    this.scene.add(mesh);

    const box = new THREE.Box3();
    this.coins.push({
      mesh,
      box,
      baseY: y,
      bobOffset: Math.random() * Math.PI * 2,
    });
  }

  // ─── Update Loop ──────────────────────────────────────────────────────────

  update(delta, speed) {
    const moveAmount = speed * delta;
    const time = performance.now() * 0.005;

    // 1. Move & animate coins
    this.coins.forEach(c => {
      c.mesh.position.z -= moveAmount;
      // Fast spin
      c.mesh.rotation.y += delta * 4.5;
      // Gentle floating bob
      c.mesh.position.y = c.baseY + Math.sin(time * 2 + c.bobOffset) * 0.12;
      // Update hitbox
      c.box.setFromObject(c.mesh);
    });

    // Remove offscreen coins
    this.coins = this.coins.filter(c => {
      if (c.mesh.position.z < DESPAWN_Z) {
        this.scene.remove(c.mesh);
        return false;
      }
      return true;
    });

    // 2. Spawn rhythm
    this.spawnTimer -= delta;
    if (this.spawnTimer <= 0) {
      this._spawnPattern();
      this.spawnTimer = 2.2 + Math.random() * 1.5;
    }

    // 3. Update collection sparkle particles
    this.sparkles.forEach(s => {
      s.mesh.position.addScaledVector(s.velocity, delta);
      s.life -= delta * 3.0;
      s.mesh.scale.setScalar(Math.max(0, s.life));
    });

    this.sparkles = this.sparkles.filter(s => {
      if (s.life <= 0) {
        this.scene.remove(s.mesh);
        return false;
      }
      return true;
    });
  }

  // ─── Collision Check ──────────────────────────────────────────────────────

  checkCollection(playerBox) {
    let collectedCount = 0;

    this.coins = this.coins.filter(c => {
      // Only check nearby coins
      if (c.mesh.position.z < -2 || c.mesh.position.z > 3.5) return true;

      if (playerBox.intersectsBox(c.box)) {
        // Sparkle burst
        this._createSparkles(c.mesh.position);
        this.scene.remove(c.mesh);
        collectedCount++;
        return false;
      }
      return true;
    });

    return collectedCount;
  }

  _createSparkles(pos) {
    const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffea47 });
    const sparkGeo = new THREE.DodecahedronGeometry(0.12, 0);

    for (let i = 0; i < 6; i++) {
      const spark = new THREE.Mesh(sparkGeo, sparkMat);
      spark.position.copy(pos);
      this.scene.add(spark);

      const angle = (i / 6) * Math.PI * 2;
      const velocity = new THREE.Vector3(
        Math.cos(angle) * (2 + Math.random() * 2),
        2 + Math.random() * 3,
        (Math.random() - 0.5) * 2
      );

      this.sparkles.push({ mesh: spark, velocity, life: 1.0 });
    }
  }

  reset() {
    this.coins.forEach(c => this.scene.remove(c.mesh));
    this.coins = [];
    this.sparkles.forEach(s => this.scene.remove(s.mesh));
    this.sparkles = [];
    this.spawnTimer = 1.0;
  }
}
