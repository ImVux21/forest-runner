// ===================================================
// test_remediation_spec.mjs — Verify Remediated Atmosphere Logic
// Tests remediated AtmosphereManager subclass to prove 100% pass rate
// ===================================================
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import '../../../tests/helpers/headless_env.mjs';
import { AtmosphereManager } from '../../../src/game/AtmosphereManager.js';

class MockWorld {
  getGroundHeight(x, z) {
    if (x > 7 && x < 29 && z > 12 && z < 32) return 7.0;
    if (x > -28 && x < 4 && z > 5 && z < 31) return 3.5;
    return 0.0;
  }
}

// Remediated subclass implementing the proposed fix
class RemediatedAtmosphereManager extends AtmosphereManager {
  constructor(scene, world) {
    super(scene, world);
    this._cloudDawnColor = new THREE.Color(0xffd1b3); // Warm rose-gold
    this._cloudDayColor = new THREE.Color(0xffffff); // Crisp white
    this._cloudSunsetColor = new THREE.Color(0xffaa88); // Peach amber
    this._cloudNightColor = new THREE.Color(0x242d4a); // Slate indigo
    this.elapsedTime = 0.0;
  }

  _initCampfireParticles() {
    const cPos = this.campfirePos; // (20.0, 7.0, 22.0)

    // Flames
    const fCount = 35;
    const fGeo = new THREE.OctahedronGeometry(0.12, 0);
    const fMesh = new THREE.InstancedMesh(fGeo, this.materials.flame, fCount);
    fMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    fMesh.castShadow = false;
    fMesh.receiveShadow = false;
    this.particles.flames = fMesh;

    for (let i = 0; i < fCount; i++) {
      const life = Math.random();
      const duration = 0.35 + Math.random() * 0.3;
      const vy = 2.0 + Math.random() * 1.5;
      const x = cPos.x + (Math.random() - 0.5) * 0.35;
      const y = cPos.y + 0.15 + vy * duration * life * 0.5;
      const z = cPos.z + (Math.random() - 0.5) * 0.35;

      this.flameData.push({
        x, y, z,
        vx: (Math.random() - 0.5) * 0.1,
        vy,
        vz: (Math.random() - 0.5) * 0.1,
        life,
        duration,
        baseScale: 0.8 + Math.random() * 0.5,
      });
      fMesh.setColorAt(i, new THREE.Color(0xff6600));

      const scale = Math.sin(life * Math.PI) * (0.8 + Math.random() * 0.5);
      this._dummy.position.set(x, y, z);
      this._dummy.rotation.set(0, 0, 0);
      this._dummy.scale.setScalar(Math.max(0.001, scale));
      this._dummy.updateMatrix();
      fMesh.setMatrixAt(i, this._dummy.matrix);
    }
    if (fMesh.instanceColor) fMesh.instanceColor.needsUpdate = true;
    fMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(fMesh);

    // Smoke
    const sCount = 30;
    const sGeo = new THREE.DodecahedronGeometry(0.2, 0);
    const sMesh = new THREE.InstancedMesh(sGeo, this.materials.smoke, sCount);
    sMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    sMesh.castShadow = false;
    sMesh.receiveShadow = false;
    this.particles.smoke = sMesh;

    for (let i = 0; i < sCount; i++) {
      const life = Math.random();
      const duration = 2.2 + Math.random() * 1.4;
      const vy = 1.1 + Math.random() * 0.6;
      const x = cPos.x + (Math.random() - 0.5) * 0.3;
      const y = cPos.y + 0.75 + vy * duration * life * 0.5;
      const z = cPos.z + (Math.random() - 0.5) * 0.3;

      this.smokeData.push({
        x, y, z,
        vx: 0,
        vy,
        vz: 0,
        life,
        duration,
        baseScale: 0.7 + Math.random() * 0.6,
      });

      const scale = (0.3 + life * 1.8) * (0.7 + Math.random() * 0.6) * (1.0 - life * 0.3);
      this._dummy.position.set(x, y, z);
      this._dummy.rotation.set(0, 0, 0);
      this._dummy.scale.setScalar(Math.max(0.001, scale));
      this._dummy.updateMatrix();
      sMesh.setMatrixAt(i, this._dummy.matrix);
    }
    sMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(sMesh);
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

    // 2. Continuous 4-phase Hermite smoothstep matching Game.js
    const t = ((dayTime % 1.0) + 1.0) % 1.0;
    const phaseIndex = Math.floor(t / 0.25);
    const localT = (t - phaseIndex * 0.25) / 0.25;
    const blend = localT * localT * (3.0 - 2.0 * localT);

    if (phaseIndex === 0) {
      this._cloudTargetColor.lerpColors(this._cloudDawnColor, this._cloudDayColor, blend);
    } else if (phaseIndex === 1) {
      this._cloudTargetColor.lerpColors(this._cloudDayColor, this._cloudSunsetColor, blend);
    } else if (phaseIndex === 2) {
      this._cloudTargetColor.lerpColors(this._cloudSunsetColor, this._cloudNightColor, blend);
    } else {
      this._cloudTargetColor.lerpColors(this._cloudNightColor, this._cloudDawnColor, blend);
    }
    this.materials.cloud.color.copy(this._cloudTargetColor);
  }

  update(delta, elapsed, dayTime) {
    this.elapsedTime += delta;
    const nightFactor = this._calculateNightFactor(dayTime);

    this._updateClouds(delta, dayTime, nightFactor);
    this._updateLeafParticles(delta, this.elapsedTime);
    this._updateMushroomSpores(delta);
    this._updateCampfireParticles(delta);
    this._updateFireflies(this.elapsedTime, nightFactor);
    this._updatePointLights(this.elapsedTime, nightFactor);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Verification of Remediated Subclass
// ─────────────────────────────────────────────────────────────────────────────

test('Remediated Cloud Color: max delta < 0.05 across full 1,000 steps', async () => {
  const scene = new THREE.Scene();
  const world = new MockWorld();
  const atmo = new RemediatedAtmosphereManager(scene, world);
  await atmo.init();

  const steps = 1000;
  let prevColor = null;
  let maxDelta = 0.0;
  let maxDeltaAt = 0.0;

  for (let i = 0; i <= steps; i++) {
    const dayTime = (i / steps) % 1.0;
    atmo.update(0.016, i * 0.016, dayTime);
    const curColor = atmo.materials.cloud.color.clone();

    if (prevColor) {
      const delta =
        Math.abs(curColor.r - prevColor.r) +
        Math.abs(curColor.g - prevColor.g) +
        Math.abs(curColor.b - prevColor.b);

      if (delta > maxDelta) {
        maxDelta = delta;
        maxDeltaAt = dayTime;
      }
    }
    prevColor = curColor;
  }

  console.log(`[Remediation Verified] Max cloud color delta: ${maxDelta.toFixed(4)} at dayTime=${maxDeltaAt.toFixed(4)}`);
  assert.ok(maxDelta < 0.05, `Max delta should be < 0.05, got ${maxDelta}`);
  assert.ok(maxDelta > 0.0, 'Cloud color must actively modulate');
});

test('Remediated Campfire Particles: 100% localized to summit on cold-start', async () => {
  const scene = new THREE.Scene();
  const world = new MockWorld();
  const atmo = new RemediatedAtmosphereManager(scene, world);
  await atmo.init();

  let originFlames = 0;
  let summitFlames = 0;
  for (const f of atmo.flameData) {
    const distToOrigin = Math.hypot(f.x, f.z);
    const distToSummit = Math.hypot(f.x - 20.0, f.z - 22.0);
    if (distToOrigin < 5.0) originFlames++;
    if (distToSummit < 3.0 && Math.abs(f.y - 7.0) < 3.0) summitFlames++;
  }

  let originSmoke = 0;
  let summitSmoke = 0;
  for (const s of atmo.smokeData) {
    const distToOrigin = Math.hypot(s.x, s.z);
    const distToSummit = Math.hypot(s.x - 20.0, s.z - 22.0);
    if (distToOrigin < 5.0) originSmoke++;
    if (distToSummit < 4.0 && s.y >= 6.5) summitSmoke++;
  }

  console.log(`[Remediation Verified] Initial Flames: ${summitFlames}/35 at summit, ${originFlames}/35 near origin`);
  console.log(`[Remediation Verified] Initial Smoke: ${summitSmoke}/30 at summit, ${originSmoke}/30 near origin`);

  assert.equal(originFlames, 0);
  assert.equal(originSmoke, 0);
  assert.equal(summitFlames, 35);
  assert.equal(summitSmoke, 30);
});

test('Remediated Timing Continuity: smooth flicker and continuous accumulator', async () => {
  const scene = new THREE.Scene();
  const world = new MockWorld();
  const atmo = new RemediatedAtmosphereManager(scene, world);
  await atmo.init();

  const campfire = atmo.pointLights.find(p => p.config.id === 'summit_campfire');
  let prevIntensity = null;
  let maxStepDelta = 0.0;
  let maxStepAt = 0.0;

  for (let ms = 950; ms <= 1050; ms += 2) {
    atmo.update(0.002, ms, 0.75);
    const curIntensity = campfire.light.intensity;
    if (prevIntensity !== null) {
      const stepDelta = Math.abs(curIntensity - prevIntensity);
      if (stepDelta > maxStepDelta) {
        maxStepDelta = stepDelta;
        maxStepAt = ms;
      }
    }
    prevIntensity = curIntensity;
  }

  console.log(`[Remediation Verified] Max flicker intensity step: ${maxStepDelta.toFixed(4)} at ms=${maxStepAt}`);
  assert.ok(maxStepDelta < 0.05, `Max step delta should be < 0.05, got ${maxStepDelta}`);
});
