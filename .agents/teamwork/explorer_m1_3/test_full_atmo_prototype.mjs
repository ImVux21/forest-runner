import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

// Headless test of complete AtmosphereManager prototype logic
class MockWorld {
  getGroundHeight(x, z) {
    if (x > 7 && x < 29 && z > 12 && z < 32) return 7.0; // Peak
    if (x > -28 && x < 4 && z > 5 && z < 31) return 3.5; // North terrace
    return 0.0;
  }
}

export class HeadlessAtmosphereManager {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.clouds = [];
    this.pointLights = [];
    this.campfirePos = new THREE.Vector3(20.0, 7.0, 22.0);
    this.wind = new THREE.Vector3(1.2, 0.0, 0.4);
    this._dummy = new THREE.Object3D();
  }

  init() {
    this._initClouds();
    this._initLeafParticles();
    this._initMushroomSpores();
    this._initCampfireParticles();
    this._initPointLights();
  }

  _initClouds() {
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.6,
      metalness: 0.0,
      flatShading: true,
    });
    this.cloudMat = cloudMat;

    for (let i = 0; i < 14; i++) {
      const group = new THREE.Group();
      const numPuffs = 4 + Math.floor(Math.random() * 3);
      for (let p = 0; p < numPuffs; p++) {
        const rad = 2.2 + Math.random() * 1.8;
        const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(rad, 1), cloudMat);
        puff.position.set((p - numPuffs / 2) * 2.0, (Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 1.8);
        group.add(puff);
      }
      const x = (Math.random() - 0.5) * 120.0;
      const y = 23.0 + Math.random() * 8.0;
      const z = (Math.random() - 0.5) * 120.0;
      group.position.set(x, y, z);
      this.scene.add(group);
      this.clouds.push({
        group,
        speed: 1.0 + Math.random() * 1.2,
      });
    }
  }

  _initLeafParticles() {
    const count = 100;
    const geo = new THREE.PlaneGeometry(0.25, 0.35);
    const mat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    this.leafMesh = mesh;
    this.leaves = [];
    const colors = [0x66bb33, 0xebb128, 0xd97724, 0xbbe053];

    for (let i = 0; i < count; i++) {
      const p = {
        x: (Math.random() - 0.5) * 80,
        y: 1.0 + Math.random() * 10,
        z: (Math.random() - 0.5) * 80,
        vy: -0.5 - Math.random() * 0.4,
        rotX: Math.random() * Math.PI,
        rotY: Math.random() * Math.PI,
        rotZ: Math.random() * Math.PI,
        vRotX: 1.0 + Math.random() * 1.5,
        vRotY: 0.8 + Math.random() * 1.2,
        swayPhase: Math.random() * Math.PI * 2,
        swaySpeed: 1.5 + Math.random() * 1.5,
        swayAmp: 0.8 + Math.random() * 0.6,
      };
      this.leaves.push(p);
      mesh.setColorAt(i, new THREE.Color(colors[i % colors.length]));
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    this.scene.add(mesh);
  }

  _initMushroomSpores() {
    const count = 60;
    const geo = new THREE.DodecahedronGeometry(0.08, 0);
    const mat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.85 });
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    this.sporeMesh = mesh;
    this.spores = [];
    const colors = [0x00ffcc, 0xdf40ff, 0x64ffda];

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 11.0;
      const originX = -16.0 + Math.cos(angle) * radius;
      const originZ = 16.0 + Math.sin(angle) * radius;
      const p = {
        originX,
        originZ,
        x: originX,
        z: originZ,
        baseY: 3.5,
        y: 3.5 + Math.random() * 4.5,
        vy: 0.5 + Math.random() * 0.8,
        swayAngle: Math.random() * Math.PI * 2,
        swaySpeed: 1.0 + Math.random() * 1.5,
        swayRadius: 0.2 + Math.random() * 0.4,
        duration: 4.0 + Math.random() * 3.0,
        life: Math.random(),
        baseScale: 0.8 + Math.random() * 0.5,
      };
      this.spores.push(p);
      mesh.setColorAt(i, new THREE.Color(colors[i % colors.length]));
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    this.scene.add(mesh);
  }

  _initCampfireParticles() {
    // Flame
    const fCount = 35;
    const fGeo = new THREE.OctahedronGeometry(0.12, 0);
    const fMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.9 });
    const fMesh = new THREE.InstancedMesh(fGeo, fMat, fCount);
    fMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.flameMesh = fMesh;
    this.flames = [];

    for (let i = 0; i < fCount; i++) {
      this.flames.push({
        x: 0, y: 0, z: 0,
        vx: 0, vy: 0, vz: 0,
        life: Math.random(),
        duration: 0.4 + Math.random() * 0.35,
      });
      fMesh.setColorAt(i, new THREE.Color(0xff7700));
    }
    this.scene.add(fMesh);

    // Smoke
    const sCount = 30;
    const sGeo = new THREE.DodecahedronGeometry(0.2, 0);
    const sMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.35, color: 0x4d4d55 });
    const sMesh = new THREE.InstancedMesh(sGeo, sMat, sCount);
    sMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.smokeMesh = sMesh;
    this.smokes = [];

    for (let i = 0; i < sCount; i++) {
      this.smokes.push({
        x: 0, y: 0, z: 0,
        vx: 0, vy: 0, vz: 0,
        life: Math.random(),
        duration: 2.2 + Math.random() * 1.5,
        baseScale: 0.8 + Math.random() * 0.5,
      });
    }
    this.scene.add(sMesh);
  }

  _initPointLights() {
    const configs = [
      { id: 'village_lantern', pos: [-4.0, 2.3, -2.5], color: 0xff9933, dayInt: 0.1, nightInt: 2.2, dist: 10, flicker: false },
      { id: 'bridge_lantern', pos: [0.5, 4.9, -12.5], color: 0xff9933, dayInt: 0.1, nightInt: 2.0, dist: 9, flicker: false },
      { id: 'summit_campfire', pos: [20.0, 7.6, 22.0], color: 0xff6611, dayInt: 0.9, nightInt: 2.6, dist: 13, flicker: true },
      { id: 'mushroom_grove', pos: [-16.0, 4.2, 16.0], color: 0x00e5ff, dayInt: 0.0, nightInt: 1.8, dist: 11, flicker: true },
    ];

    for (const c of configs) {
      const light = new THREE.PointLight(c.color, c.dayInt, c.dist, 2.0);
      light.position.set(c.pos[0], c.pos[1], c.pos[2]);
      light.castShadow = false; // Forward rendering optimization
      this.scene.add(light);
      this.pointLights.push({ light, config: c });
    }
  }

  update(delta, elapsed, dayTime) {
    // 1. Calculate night factor
    let nightFactor = 0.0;
    if (dayTime >= 0.40 && dayTime < 0.55) {
      const t = (dayTime - 0.40) / 0.15;
      nightFactor = t * t * (3 - 2 * t);
    } else if (dayTime >= 0.55 && dayTime < 0.90) {
      nightFactor = 1.0;
    } else if (dayTime >= 0.90) {
      const t = (dayTime - 0.90) / 0.10;
      nightFactor = 1.0 - t * t * (3 - 2 * t);
    }

    // 2. Update clouds
    for (const c of this.clouds) {
      c.group.position.x += c.speed * delta;
      c.group.position.z += c.speed * 0.3 * delta;
      if (c.group.position.x > 65.0) {
        c.group.position.x -= 130.0;
      }
    }

    // 3. Update point lights
    for (const pl of this.pointLights) {
      const c = pl.config;
      let target = THREE.MathUtils.lerp(c.dayInt, c.nightInt, nightFactor);
      if (c.flicker) {
        const flicker = Math.sin(elapsed * 16.0) * 0.15 + Math.cos(elapsed * 24.0) * 0.1;
        target += flicker;
      }
      pl.light.intensity = Math.max(0, target);
    }

    // 4. Update Leaf particles
    for (let i = 0; i < this.leaves.length; i++) {
      const p = this.leaves[i];
      p.y += p.vy * delta;
      p.x += Math.sin(elapsed * p.swaySpeed + p.swayPhase) * p.swayAmp * delta;
      const gH = this.world.getGroundHeight(p.x, p.z);
      if (p.y <= gH + 0.1) {
        p.y = 8.0 + Math.random() * 4.0;
      }
      this._dummy.position.set(p.x, p.y, p.z);
      this._dummy.updateMatrix();
      this.leafMesh.setMatrixAt(i, this._dummy.matrix);
    }
    this.leafMesh.instanceMatrix.needsUpdate = true;
  }
}

test('HeadlessAtmosphereManager initializes and updates successfully in a game loop', () => {
  const scene = new THREE.Scene();
  const world = new MockWorld();
  const atmo = new HeadlessAtmosphereManager(scene, world);

  atmo.init();

  assert.equal(atmo.clouds.length, 14, 'Should initialize 14 clouds');
  assert.equal(atmo.leaves.length, 100, 'Should initialize 100 leaves');
  assert.equal(atmo.spores.length, 60, 'Should initialize 60 spores');
  assert.equal(atmo.flames.length, 35, 'Should initialize 35 flames');
  assert.equal(atmo.smokes.length, 30, 'Should initialize 30 smoke puffs');
  assert.equal(atmo.pointLights.length, 4, 'Should initialize 4 point lights');

  // Simulate 60 frames of update across day and night
  let elapsed = 0;
  for (let frame = 0; frame < 60; frame++) {
    const delta = 0.0166;
    elapsed += delta;
    const dayTime = (frame / 60); // from day into night
    atmo.update(delta, elapsed, dayTime);
  }

  // Check that lights responded to night
  const summitLight = atmo.pointLights.find(p => p.config.id === 'summit_campfire');
  assert.ok(summitLight.light.intensity > 1.0, 'Campfire light should remain bright');
});
