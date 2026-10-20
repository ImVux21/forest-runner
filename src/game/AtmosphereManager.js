// ===================================================
// AtmosphereManager.js — Atmospheric Polish & Environmental VFX
// Drifting 3D Low-Poly Clouds, Instanced Particles, & Warm Point Lights
// ===================================================
import * as THREE from 'three';

export class AtmosphereManager {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;

    // Subsystem containers
    this.clouds = [];
    this.particles = {
      leaves: null,
      spores: null,
      flames: null,
      smoke: null,
      fireflies: null,
    };
    this.pointLights = [];

    // State collections
    this.leafData = [];
    this.sporeData = [];
    this.flameData = [];
    this.smokeData = [];
    this.fireflyData = [];

    // Shared Materials
    this.materials = {};

    // Wind and Landmark Vectors
    this.wind = new THREE.Vector3(1.0, 0.0, 0.35).normalize();
    this.campfirePos = new THREE.Vector3(20.0, 7.0, 22.0); // Peak Summit

    // Reusable dummy for matrix updates (Zero GC allocation)
    this._dummy = new THREE.Object3D();

    // Pre-allocated 4-phase colors for zero-allocation continuous cloud tinting
    // Dawn: rose-gold (#ffccaa), Day: soft white (#ffffff), Sunset: warm apricot/amber (#ff9966), Night: deep slate navy (#202b44)
    this._cloudDawnColor = new THREE.Color(0xffccaa);
    this._cloudDayColor = new THREE.Color(0xffffff);
    this._cloudSunsetColor = new THREE.Color(0xff9966);
    this._cloudNightColor = new THREE.Color(0x202b44);
    this._cloudTargetColor = new THREE.Color();

    // Cyclic 4-phase array mirroring Game.js LIGHTING_PHASES keyframes
    this._cloudPhases = [
      this._cloudDawnColor,    // Index 0: t = 0.00 (Dawn)
      this._cloudDayColor,     // Index 1: t = 0.25 (Day / Noon)
      this._cloudSunsetColor,  // Index 2: t = 0.50 (Sunset)
      this._cloudNightColor,   // Index 3: t = 0.75 (Night / Midnight)
    ];

    // Internal cumulative seconds tracking (ensures smooth continuity if elapsed is omitted)
    this.elapsedTime = 0.0;
  }

  async init() {
    this._initMaterials();
    this._initClouds();
    this._initLeafParticles();
    this._initMushroomSpores();
    this._initCampfireParticles();
    this._initFireflies();
    this._initPointLights();
  }

  _initMaterials() {
    this.materials.cloud = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.65,
      metalness: 0.05,
      flatShading: true,
    });

    this.materials.leaf = new THREE.MeshBasicMaterial({
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.72,
    });

    this.materials.spore = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });

    this.materials.flame = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    });

    this.materials.smoke = new THREE.MeshBasicMaterial({
      color: 0x484850,
      transparent: true,
      opacity: 0.32,
    });

    this.materials.firefly = new THREE.MeshBasicMaterial({
      color: 0xc6ff00,
    });
  }

  // ─── 1. Drifting 3D Low-Poly Clouds ───────────────────────────────────────

  _initClouds() {
    const cloudMat = this.materials.cloud;

    for (let i = 0; i < 14; i++) {
      const group = new THREE.Group();
      const numPuffs = 4 + Math.floor(Math.random() * 3);

      for (let p = 0; p < numPuffs; p++) {
        const rad = 2.2 + Math.random() * 1.8;
        const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(rad, 1), cloudMat);
        puff.position.set(
          (p - numPuffs / 2) * 2.0,
          (Math.random() - 0.5) * 1.2,
          (Math.random() - 0.5) * 1.8
        );
        puff.castShadow = false;
        puff.receiveShadow = false;
        group.add(puff);
      }

      const x = (Math.random() - 0.5) * 120.0;
      const y = 22.0 + Math.random() * 9.0;
      const z = (Math.random() - 0.5) * 120.0;
      group.position.set(x, y, z);

      this.scene.add(group);
      this.clouds.push({
        group,
        speed: 1.0 + Math.random() * 0.8,
      });
    }
  }

  // ─── 2. Ambient Particles: Leaves & Pollen ────────────────────────────────

  _initLeafParticles() {
    const count = 100;
    // Botanical 3D leaf blade with central crease, curved flanks, and tapered tip
    const leafVertices = new Float32Array([
      // Left lower flank (Stem to Left to Crease)
       0.0,   -0.12,  0.0,
      -0.065,  0.0,   0.015,
       0.0,    0.0,  -0.012,

      // Right lower flank (Stem to Crease to Right)
       0.0,   -0.12,  0.0,
       0.0,    0.0,  -0.012,
       0.065,  0.0,   0.015,

      // Left upper flank (Crease to Left to Tip)
       0.0,    0.0,  -0.012,
      -0.065,  0.0,   0.015,
       0.0,    0.15,  0.0,

      // Right upper flank (Crease to Tip to Right)
       0.0,    0.0,  -0.012,
       0.0,    0.15,  0.0,
       0.065,  0.0,   0.015,
    ]);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(leafVertices, 3));
    geo.computeVertexNormals();

    const mesh = new THREE.InstancedMesh(geo, this.materials.leaf, count);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.castShadow = false;
    mesh.receiveShadow = false;

    this.particles.leaves = mesh;
    // Natural foliage earthy tones (no harsh fluorescent yellow confetti)
    const colors = [0x386b2d, 0x4a7c36, 0x7a6b28, 0x6b441f, 0x2e5c26];

    for (let i = 0; i < count; i++) {
      const p = {
        x: (Math.random() - 0.5) * 80.0,
        y: 2.0 + Math.random() * 11.0,
        z: (Math.random() - 0.5) * 80.0,
        vy: -0.35 - Math.random() * 0.35,
        rotX: Math.random() * Math.PI,
        rotY: Math.random() * Math.PI,
        rotZ: Math.random() * Math.PI,
        vRotX: 1.0 + Math.random() * 1.5,
        vRotY: 0.8 + Math.random() * 1.2,
        swayPhase: Math.random() * Math.PI * 2,
        swaySpeed: 1.4 + Math.random() * 1.6,
        swayAmp: 0.8 + Math.random() * 0.6,
        scale: 0.6 + Math.random() * 0.35,
      };
      this.leafData.push(p);
      mesh.setColorAt(i, new THREE.Color(colors[i % colors.length]));
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    this.scene.add(mesh);
  }

  // ─── 3. Ambient Particles: Mushroom Spores ────────────────────────────────

  _initMushroomSpores() {
    const count = 60;
    const geo = new THREE.DodecahedronGeometry(0.08, 0);
    const mesh = new THREE.InstancedMesh(geo, this.materials.spore, count);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.castShadow = false;
    mesh.receiveShadow = false;

    this.particles.spores = mesh;
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
        y: 3.5 + Math.random() * 4.0,
        vy: 0.55 + Math.random() * 0.75,
        swayAngle: Math.random() * Math.PI * 2,
        swaySpeed: 1.0 + Math.random() * 1.4,
        swayRadius: 0.2 + Math.random() * 0.4,
        duration: 3.5 + Math.random() * 2.5,
        life: Math.random(),
        baseScale: 0.8 + Math.random() * 0.5,
      };
      this.sporeData.push(p);
      mesh.setColorAt(i, new THREE.Color(colors[i % colors.length]));
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    this.scene.add(mesh);
  }

  // ─── 4. Campfire VFX: Flames & Smoke ──────────────────────────────────────

  _initCampfireParticles() {
    const cPos = this.campfirePos; // Vector3(20.0, 7.0, 22.0)

    // 4A. Flame Embers
    const fCount = 35;
    const fGeo = new THREE.OctahedronGeometry(0.12, 0);
    const fMesh = new THREE.InstancedMesh(fGeo, this.materials.flame, fCount);
    fMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    fMesh.castShadow = false;
    fMesh.receiveShadow = false;
    this.particles.flames = fMesh;

    for (let i = 0; i < fCount; i++) {
      const duration = 0.35 + Math.random() * 0.3;
      const life = (i + 0.5 * Math.random()) / fCount; // Evenly staggered lifecycle across [0, 1)
      const vy = 2.0 + Math.random() * 1.5;
      const baseScale = 0.8 + Math.random() * 0.5;

      // Position particle along its natural ascent trajectory at summit campfire
      const x = cPos.x + (Math.random() - 0.5) * 0.35;
      const z = cPos.z + (Math.random() - 0.5) * 0.35;
      const y = cPos.y + 0.15 + (life * duration * vy * 0.8);

      this.flameData.push({
        x, y, z,
        vx: (Math.random() - 0.5) * 0.1,
        vy,
        vz: (Math.random() - 0.5) * 0.1,
        life,
        duration,
        baseScale,
      });

      // Initialize instance matrix at summit coordinates on frame 0
      const scale = Math.sin(life * Math.PI) * baseScale;
      this._dummy.position.set(x, y, z);
      this._dummy.rotation.set(0, 0, 0);
      this._dummy.scale.setScalar(Math.max(0.001, scale));
      this._dummy.updateMatrix();
      fMesh.setMatrixAt(i, this._dummy.matrix);

      fMesh.setColorAt(i, new THREE.Color(0xff6600));
    }
    fMesh.instanceMatrix.needsUpdate = true;
    if (fMesh.instanceColor) fMesh.instanceColor.needsUpdate = true;
    this.scene.add(fMesh);

    // 4B. Smoke Puffs
    const sCount = 30;
    const sGeo = new THREE.DodecahedronGeometry(0.2, 0);
    const sMesh = new THREE.InstancedMesh(sGeo, this.materials.smoke, sCount);
    sMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    sMesh.castShadow = false;
    sMesh.receiveShadow = false;
    this.particles.smoke = sMesh;

    for (let i = 0; i < sCount; i++) {
      const duration = 2.2 + Math.random() * 1.4;
      const life = (i + 0.5 * Math.random()) / sCount; // Evenly staggered lifecycle across [0, 1)
      const vy = 1.1 + Math.random() * 0.6;
      const baseScale = 0.7 + Math.random() * 0.6;

      // Position smoke puff directly at summit campfire with staggered vertical plume
      const x = cPos.x + (Math.random() - 0.5) * 0.3;
      const z = cPos.z + (Math.random() - 0.5) * 0.3;
      const y = cPos.y + 0.75 + (life * duration * vy * 0.5);

      this.smokeData.push({
        x, y, z,
        vx: this.wind.x * 0.75,
        vy,
        vz: this.wind.z * 0.75,
        life,
        duration,
        baseScale,
      });

      // Initialize instance matrix at summit coordinates on frame 0
      const scale = (0.3 + life * 1.8) * baseScale * (1.0 - life * 0.3);
      this._dummy.position.set(x, y, z);
      this._dummy.rotation.set(0, 0, 0);
      this._dummy.scale.setScalar(Math.max(0.001, scale));
      this._dummy.updateMatrix();
      sMesh.setMatrixAt(i, this._dummy.matrix);
    }
    sMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(sMesh);
  }

  // ─── 5. Consolidated Night Fireflies ──────────────────────────────────────

  _initFireflies() {
    const count = 40;
    const geo = new THREE.DodecahedronGeometry(0.09, 0);
    const mesh = new THREE.InstancedMesh(geo, this.materials.firefly, count);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    this.particles.fireflies = mesh;

    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 60.0;
      const z = (Math.random() - 0.5) * 60.0;
      const groundH = this.world && typeof this.world.getGroundHeight === 'function' ? this.world.getGroundHeight(x, z) : 0.0;
      const y = groundH + 0.6 + Math.random() * 2.5;

      this.fireflyData.push({
        baseX: x, baseY: y, baseZ: z,
        seed: Math.random() * Math.PI * 2,
        speed: 0.8 + Math.random() * 1.2,
      });
    }
    this.scene.add(mesh);
  }

  // ─── 6. Warm Point Lights ─────────────────────────────────────────────────

  _initPointLights() {
    const configs = [
      { id: 'village_lantern', pos: [-4.0, 2.3, -2.5], color: 0xff9933, dayInt: 0.1, nightInt: 2.2, dist: 10.0, flicker: false },
      { id: 'bridge_lantern', pos: [0.5, 4.9, -12.5], color: 0xff9933, dayInt: 0.1, nightInt: 2.0, dist: 9.0, flicker: false },
      { id: 'summit_campfire', pos: [20.0, 7.6, 22.0], color: 0xff6611, dayInt: 0.9, nightInt: 2.6, dist: 13.0, flicker: true, flickerAmp: 0.35 },
      { id: 'mushroom_grove', pos: [-16.0, 4.2, 16.0], color: 0x00e5ff, dayInt: 0.0, nightInt: 1.8, dist: 11.0, flicker: true, flickerAmp: 0.25 },
    ];

    for (const c of configs) {
      const light = new THREE.PointLight(c.color, c.dayInt, c.dist, 2.0);
      light.position.set(c.pos[0], c.pos[1], c.pos[2]);
      light.castShadow = false; // Forward rendering optimization
      this.scene.add(light);
      this.pointLights.push({ light, config: c });
    }
  }

  // ─── 7. Main Update Cycle ─────────────────────────────────────────────────

  update(delta, elapsed, dayTime) {
    if (Number.isFinite(delta) && delta > 0) {
      this.elapsedTime += delta;
    }
    const tSec = (typeof elapsed === 'number' && Number.isFinite(elapsed)) ? elapsed : this.elapsedTime;
    const nightFactor = this._calculateNightFactor(dayTime);

    this._updateClouds(delta, dayTime, nightFactor);
    this._updateLeafParticles(delta, tSec);
    this._updateMushroomSpores(delta);
    this._updateCampfireParticles(delta);
    this._updateFireflies(tSec, nightFactor);
    this._updatePointLights(tSec, nightFactor);
  }

  _calculateNightFactor(dayTime) {
    if (dayTime >= 0.0 && dayTime < 0.40) {
      return 0.0;
    } else if (dayTime >= 0.40 && dayTime < 0.55) {
      const t = (dayTime - 0.40) / 0.15;
      return t * t * (3 - 2 * t);
    } else if (dayTime >= 0.55 && dayTime < 0.90) {
      return 1.0;
    } else {
      const t = (dayTime - 0.90) / 0.10;
      return 1.0 - t * t * (3 - 2 * t);
    }
  }

  _updateClouds(delta, dayTime, nightFactor) {
    // 1. Move and wrap clouds
    for (const c of this.clouds) {
      c.group.position.x += this.wind.x * c.speed * delta;
      c.group.position.z += this.wind.z * c.speed * delta;

      if (c.group.position.x > 65.0) {
        c.group.position.x -= 130.0;
        c.group.position.z = (Math.random() - 0.5) * 120.0;
        c.group.position.y = 22.0 + Math.random() * 9.0;
        c.speed = 1.0 + Math.random() * 0.8;
      }
    }

    // 2. Continuous 4-Phase Cloud Color Interpolation using Hermite smoothstep (Zero GC allocation)
    const t = ((dayTime % 1.0) + 1.0) % 1.0;
    const phaseIndex = Math.floor(t / 0.25);
    const segmentT = (t - phaseIndex * 0.25) / 0.25;
    const blend = segmentT * segmentT * (3.0 - 2.0 * segmentT);

    const kfA = this._cloudPhases[phaseIndex];
    const kfB = this._cloudPhases[(phaseIndex + 1) % 4];

    this._cloudTargetColor.lerpColors(kfA, kfB, blend);
    this.materials.cloud.color.copy(this._cloudTargetColor);
  }

  _updateLeafParticles(delta, tSec) {
    const mesh = this.particles.leaves;
    if (!mesh) return;

    for (let i = 0; i < this.leafData.length; i++) {
      const p = this.leafData[i];
      p.y += p.vy * delta;
      p.x += (this.wind.x * 0.9 + Math.sin(tSec * p.swaySpeed + p.swayPhase) * p.swayAmp) * delta;
      p.z += (this.wind.z * 0.9 + Math.cos(tSec * p.swaySpeed * 0.8 + p.swayPhase) * (p.swayAmp * 0.6)) * delta;

      p.rotX += p.vRotX * delta;
      p.rotY += p.vRotY * delta;

      const groundY = this.world && typeof this.world.getGroundHeight === 'function' ? this.world.getGroundHeight(p.x, p.z) : 0.0;
      if (p.y <= groundY + 0.1 || p.x < -43 || p.x > 43 || p.z < -43 || p.z > 43) {
        p.x = (Math.random() - 0.5) * 80.0;
        p.z = (Math.random() - 0.5) * 80.0;
        p.y = 8.5 + Math.random() * 5.0;
      }

      this._dummy.position.set(p.x, p.y, p.z);
      this._dummy.rotation.set(p.rotX, p.rotY, p.rotZ);
      const s = p.scale || 0.75;
      this._dummy.scale.set(s, s, s);
      this._dummy.updateMatrix();
      mesh.setMatrixAt(i, this._dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  _updateMushroomSpores(delta) {
    const mesh = this.particles.spores;
    if (!mesh) return;

    for (let i = 0; i < this.sporeData.length; i++) {
      const p = this.sporeData[i];
      p.life += delta / p.duration;

      if (p.life >= 1.0) {
        p.life = 0.0;
        p.y = p.baseY + Math.random() * 0.8;
      } else {
        p.y += p.vy * delta;
        p.swayAngle += p.swaySpeed * delta;
        p.x = p.originX + Math.cos(p.swayAngle) * p.swayRadius;
        p.z = p.originZ + Math.sin(p.swayAngle) * p.swayRadius;
      }

      const scale = Math.sin(p.life * Math.PI) * p.baseScale;
      this._dummy.position.set(p.x, p.y, p.z);
      this._dummy.rotation.set(0, 0, 0);
      this._dummy.scale.setScalar(Math.max(0.001, scale));
      this._dummy.updateMatrix();
      mesh.setMatrixAt(i, this._dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  _updateCampfireParticles(delta) {
    const cPos = this.campfirePos;

    // 1. Flames
    const fMesh = this.particles.flames;
    if (fMesh) {
      for (let i = 0; i < this.flameData.length; i++) {
        const p = this.flameData[i];
        p.life += delta / p.duration;

        if (p.life >= 1.0) {
          p.life = 0.0;
          p.x = cPos.x + (Math.random() - 0.5) * 0.35;
          p.z = cPos.z + (Math.random() - 0.5) * 0.35;
          p.y = cPos.y + 0.15;
          p.vy = 2.0 + Math.random() * 1.5;
        } else {
          p.y += p.vy * delta;
          p.x += (Math.random() - 0.5) * 0.2 * delta;
          p.z += (Math.random() - 0.5) * 0.2 * delta;
        }

        const scale = Math.sin(p.life * Math.PI) * p.baseScale;
        this._dummy.position.set(p.x, p.y, p.z);
        this._dummy.rotation.set(0, 0, 0);
        this._dummy.scale.setScalar(Math.max(0.001, scale));
        this._dummy.updateMatrix();
        fMesh.setMatrixAt(i, this._dummy.matrix);
      }
      fMesh.instanceMatrix.needsUpdate = true;
    }

    // 2. Smoke
    const sMesh = this.particles.smoke;
    if (sMesh) {
      for (let i = 0; i < this.smokeData.length; i++) {
        const p = this.smokeData[i];
        p.life += delta / p.duration;

        if (p.life >= 1.0) {
          p.life = 0.0;
          p.x = cPos.x + (Math.random() - 0.5) * 0.3;
          p.z = cPos.z + (Math.random() - 0.5) * 0.3;
          p.y = cPos.y + 0.75;
          p.vy = 1.1 + Math.random() * 0.6;
        } else {
          p.y += p.vy * delta;
          p.x += this.wind.x * 0.75 * delta;
          p.z += this.wind.z * 0.75 * delta;
        }

        const scale = (0.3 + p.life * 1.8) * p.baseScale * (1.0 - p.life * 0.3);
        this._dummy.position.set(p.x, p.y, p.z);
        this._dummy.rotation.set(0, 0, 0);
        this._dummy.scale.setScalar(Math.max(0.001, scale));
        this._dummy.updateMatrix();
        sMesh.setMatrixAt(i, this._dummy.matrix);
      }
      sMesh.instanceMatrix.needsUpdate = true;
    }
  }

  _updateFireflies(tSec, nightFactor) {
    const mesh = this.particles.fireflies;
    if (!mesh) return;

    if (nightFactor < 0.05) {
      mesh.visible = false;
      return;
    }
    mesh.visible = true;

    const time = tSec * 2.0;

    for (let i = 0; i < this.fireflyData.length; i++) {
      const d = this.fireflyData[i];
      const x = d.baseX + Math.sin(time * d.speed + d.seed) * 1.6;
      const y = d.baseY + Math.cos(time * d.speed * 1.2 + d.seed) * 0.8;
      const z = d.baseZ + Math.sin(time * d.speed * 0.8 + d.seed) * 1.6;

      this._dummy.position.set(x, y, z);
      this._dummy.rotation.set(0, 0, 0);
      this._dummy.scale.setScalar(nightFactor);
      this._dummy.updateMatrix();
      mesh.setMatrixAt(i, this._dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  _updatePointLights(tSec, nightFactor) {
    for (const pl of this.pointLights) {
      const c = pl.config;
      let target = THREE.MathUtils.lerp(c.dayInt, c.nightInt, nightFactor);

      if (c.flicker) {
        if (c.id === 'summit_campfire') {
          const flicker = Math.sin(tSec * 16.3) * 0.18 + Math.cos(tSec * 27.7) * 0.12 + Math.sin(tSec * 41.1) * 0.08;
          target += flicker * c.flickerAmp;
        } else {
          // Gentle breathing pulse for mushroom grove
          const pulse = Math.sin(tSec * 1.8) * 0.35;
          target += pulse * c.flickerAmp * nightFactor;
        }
      }

      pl.light.intensity = Math.max(0, target);
    }
  }
}
