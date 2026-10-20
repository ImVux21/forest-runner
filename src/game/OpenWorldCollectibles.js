// ===================================================
// OpenWorldCollectibles.js — Hidden Coins, Gems & Treasure Chests
// Distributed across elevation tiers, rewarding exploration and climbing
// ===================================================
import * as THREE from 'three';

export class OpenWorldCollectibles {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.items = []; // [{ mesh, box, type, points }]
    this.sparkles = [];

    // Shared Geometries & Materials
    this.coinGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.08, 12);
    this.coinGeo.rotateX(Math.PI / 2);
    this.coinMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.85,
      roughness: 0.2,
      emissive: 0xb8860b,
      emissiveIntensity: 0.3,
    });

    this.gemGeo = new THREE.OctahedronGeometry(0.55, 0);
    this.gemMat = new THREE.MeshStandardMaterial({
      color: 0x00e676, // Radiant Emerald Green
      metalness: 0.2,
      roughness: 0.1,
      emissive: 0x00c853,
      emissiveIntensity: 0.45,
    });

    this.chestGeo = new THREE.BoxGeometry(1.2, 0.9, 0.9);
    this.chestMat = new THREE.MeshStandardMaterial({
      color: 0x8d5b28,
      roughness: 0.8,
      metalness: 0.2,
    });
  }

  init() {
    this.spawnAll();
  }

  spawnAll() {
    this.reset();

    // 1. Coins along the Valley Floor & Ramps (18 coins)
    const valleyCoords = [
      [-12, -2], [-12, 1], [-12, 5], [-12, 9], // Along north ramp
      [-18, -4], [-18, -1], [-18, 2],           // Along south ramp
      [0, -8], [0, -4], [0, 0], [0, 4], [0, 8], // Center valley trail
      [-6, 12], [-3, 15], [3, 18], [5, 22],     // Climb to peak
      [10, -5], [14, -10],
    ];

    valleyCoords.forEach(([x, z]) => {
      const y = this.world.getGroundHeight(x, z) + 0.8;
      this._addCoin(x, y, z);
    });

    // 2. Rare Emerald Gems on Plateau Ledges (Tier 1 & Tier 2)
    const gemCoords = [
      { x: -14, z: 24, label: 'North Ridge' },
      { x: -22, z: -20, label: 'South Overlook' },
      { x: 24, z: -20, label: 'East Ridge' },
      { x: 18, z: 26, label: 'Peak Jewel' },
    ];

    gemCoords.forEach(g => {
      const y = this.world.getGroundHeight(g.x, g.z) + 1.1;
      this._addGem(g.x, y, g.z);
    });

    // 3. Golden Treasure Chests on the Highest Elevations
    // Top of Peak (Tier 2, y = 7.0m)
    this._addChest(18, 7.0 + 0.45, 20);
    // South-West Lookout
    this._addChest(-24, 3.5 + 0.45, -20);
  }

  _addCoin(x, y, z) {
    const mesh = new THREE.Mesh(this.coinGeo, this.coinMat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    this.scene.add(mesh);
    this.items.push({
      mesh,
      box: new THREE.Box3(),
      baseY: y,
      type: 'coin',
      points: 10,
      rotSpeed: 3.5,
    });
  }

  _addGem(x, y, z) {
    const mesh = new THREE.Mesh(this.gemGeo, this.gemMat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    this.scene.add(mesh);
    this.items.push({
      mesh,
      box: new THREE.Box3(),
      baseY: y,
      type: 'gem',
      points: 50,
      rotSpeed: 2.2,
    });
  }

  _addChest(x, y, z) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    const body = new THREE.Mesh(this.chestGeo, this.chestMat);
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Gold trim band
    const trim = new THREE.Mesh(
      new THREE.BoxGeometry(1.24, 0.2, 0.94),
      new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.8, roughness: 0.3 })
    );
    trim.position.y = 0.2;
    group.add(trim);

    this.scene.add(group);
    this.items.push({
      mesh: group,
      box: new THREE.Box3(),
      baseY: y,
      type: 'chest',
      points: 200,
      rotSpeed: 0,
    });
  }

  // ─── Update Loop ──────────────────────────────────────────────────────────

  update(delta) {
    const time = performance.now() * 0.004;

    this.items.forEach(item => {
      // Rotation
      if (item.rotSpeed > 0) {
        item.mesh.rotation.y += delta * item.rotSpeed;
        item.mesh.position.y = item.baseY + Math.sin(time + item.mesh.position.x) * 0.14;
      }
      item.box.setFromObject(item.mesh);
    });

    // Update sparkle particles
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

  // ─── Collection Detection ─────────────────────────────────────────────────

  checkCollection(playerBox) {
    let collectedInfo = { count: 0, points: 0, isChest: false };

    this.items = this.items.filter(item => {
      // Check collision
      if (playerBox.intersectsBox(item.box)) {
        this._burstParticles(item.mesh.position, item.type === 'gem' ? 0x00e676 : 0xffd700);
        this.scene.remove(item.mesh);

        collectedInfo.count++;
        collectedInfo.points += item.points;
        if (item.type === 'chest') collectedInfo.isChest = true;
        return false;
      }
      return true;
    });

    return collectedInfo;
  }

  _burstParticles(pos, color) {
    const geo = new THREE.DodecahedronGeometry(0.14, 0);
    const mat = new THREE.MeshBasicMaterial({ color });

    for (let i = 0; i < 8; i++) {
      const spark = new THREE.Mesh(geo, mat);
      spark.position.copy(pos);
      this.scene.add(spark);

      const angle = (i / 8) * Math.PI * 2;
      const velocity = new THREE.Vector3(
        Math.cos(angle) * (2.5 + Math.random() * 2),
        2.5 + Math.random() * 3,
        Math.sin(angle) * (2.5 + Math.random() * 2)
      );

      this.sparkles.push({ mesh: spark, velocity, life: 1.0 });
    }
  }

  reset() {
    this.items.forEach(item => this.scene.remove(item.mesh));
    this.items = [];
    this.sparkles.forEach(s => this.scene.remove(s.mesh));
    this.sparkles = [];
  }
}
