# Milestone 1 Remediation Strategy: Campfire Particles & Elapsed Time Tracking

**Author**: `explorer_m1_it2_2`  
**Mission**: Milestone 1 Iteration 2 — Campfire Particle Cold-Start Coordinates & Continuous Seconds-Based Elapsed Time Tracking  
**Target Files**: `src/game/AtmosphereManager.js`, `src/game/Game.js`  
**Date**: 2026-09-27  

---

## 1. Executive Summary

During the forensic audit of Milestone 1, `auditor_m1_1` and adversarial stress tester `challenger_m1_2` discovered two critical defects in `src/game/AtmosphereManager.js`:
1. **Cold-Start Campfire Particle Spatial Leak**: 34 out of 35 flame particles and 29 out of 30 smoke puffs initialized at world origin `(0, 0, 0)` rather than the summit campfire `(20, 7, 22)`. Consequently, the player spawns at the Crossroads enveloped by floating smoke and fire for up to 3.6 seconds.
2. **Elapsed Time Unit Inversion Glitch**: The threshold heuristic `const tSec = elapsed > 1000 ? elapsed * 0.001 : elapsed;` treated `performance.now()` milliseconds as seconds during the first second of gameplay (running oscillations at 1000x hyper-speed), followed by a sudden 998x frequency collapse and a 999-second phase leap at $t = 1.0\text{s}$. Furthermore, any gameplay session exceeding 1000 seconds ($16.6\text{ min}$) suffered an inverted 1000x slowdown.

This document provides a concrete, mathematically verified fix strategy that:
- Spatially bounds 100% of campfire particles strictly at `(20.0, 7.0, 22.0)` from Frame 0 using staggered lifecycle initialization and immediate instance matrix updates.
- Completely eliminates the flawed threshold heuristic in favor of unambiguous, continuous seconds-based tracking across both `Game.js` (callsite) and `AtmosphereManager.js` (subsystem consumer and internal fallback accumulator).

---

## 2. Issue 1: Campfire Particle Cold-Start Initialization

### 2.1 Direct Observation & Root Cause
In `src/game/AtmosphereManager.js:217-248`:
```javascript
// Lines 217-226:
for (let i = 0; i < fCount; i++) {
  this.flameData.push({
    x: 0, y: 0, z: 0,
    vx: 0, vy: 0, vz: 0,
    life: Math.random(),
    duration: 0.35 + Math.random() * 0.3,
    baseScale: 0.8 + Math.random() * 0.5,
  });
  fMesh.setColorAt(i, new THREE.Color(0xff6600));
}

// Lines 239-247:
for (let i = 0; i < sCount; i++) {
  this.smokeData.push({
    x: 0, y: 0, z: 0,
    vx: 0, vy: 0, vz: 0,
    life: Math.random(),
    duration: 2.2 + Math.random() * 1.4,
    baseScale: 0.7 + Math.random() * 0.6,
  });
}
```

#### Defect Mechanics:
1. **Origin Misplacement**: Particles were instantiated with `x: 0, y: 0, z: 0` and `vx: 0, vy: 0, vz: 0`.
2. **Delayed Respawn**: In `_updateCampfireParticles(delta)` (lines 420-435 and 450-464), particles ONLY relocate to `cPos` when `p.life + delta / p.duration >= 1.0`.
   - On frame 1 ($\Delta t = 0.016\text{s}$), a flame with duration $0.5\text{s}$ only respawns if initial `life >= 0.968` ($\approx 3\%$ probability). The remaining 34 flames stay at `(0, 0, 0)`.
   - A smoke puff with duration $3.0\text{s}$ only respawns on frame 1 if `life >= 0.994` ($\approx 0.5\%$ probability). The remaining 29-30 smoke puffs hover at `(0, 0, 0)`.
3. **Empty Initial Instance Matrices**: `fMesh.setMatrixAt` and `sMesh.setMatrixAt` were never called inside `_initCampfireParticles()`, leaving the GPU instance matrix buffer at identity `(0, 0, 0)`.

### 2.2 Concrete Remediation Design

#### A. Staggered Initial Life Distribution
To present an established, mature fire immediately upon scene boot without clustering or synchronous respawning, particle ages must be uniformly staggered across $[0.0, 1.0)$:
- Flame particle $i$: `life = (i + 0.5 * Math.random()) / fCount;`
- Smoke particle $i$: `life = (i + 0.5 * Math.random()) / sCount;`

#### B. World Coordinates Pre-Warmed to Lifecycle Phase
Each particle at age `life` has already traversed its ascent trajectory for `driftTime = life * duration`:
- **Flames** (`cPos = (20.0, 7.0, 22.0)`):
  - `vy = 2.0 + Math.random() * 1.5`
  - `x = cPos.x + (Math.random() - 0.5) * 0.35`
  - `z = cPos.z + (Math.random() - 0.5) * 0.35`
  - `y = cPos.y + 0.15 + (life * duration * vy * 0.8)` (flame column elevates naturally between $y = 7.15\text{m}$ and $8.8\text{m}$)
  - `vx = 0, vy = vy, vz = 0`
- **Smoke** (`cPos = (20.0, 7.0, 22.0)`):
  - `vy = 1.1 + Math.random() * 0.6`
  - `driftTime = life * duration`
  - `x = cPos.x + (Math.random() - 0.5) * 0.3 + this.wind.x * 0.75 * driftTime`
  - `z = cPos.z + (Math.random() - 0.5) * 0.3 + this.wind.z * 0.75 * driftTime`
  - `y = cPos.y + 0.75 + (vy * driftTime)` (smoke plume ascends between $y = 7.75\text{m}$ and $13.5\text{m}$)
  - `vx = this.wind.x * 0.75, vy = vy, vz = this.wind.z * 0.75`

#### C. Frame 0 Instance Matrix Construction
Compute the affine transform and upload to `InstancedMesh` during `init()`:
```javascript
const scale = Math.sin(life * Math.PI) * baseScale;
this._dummy.position.set(x, y, z);
this._dummy.rotation.set(0, 0, 0);
this._dummy.scale.setScalar(Math.max(0.001, scale));
this._dummy.updateMatrix();
fMesh.setMatrixAt(i, this._dummy.matrix);
```
Repeat for smoke puffs with scale `(0.3 + life * 1.8) * baseScale * (1.0 - life * 0.3)`.  
Set `fMesh.instanceMatrix.needsUpdate = true` and `sMesh.instanceMatrix.needsUpdate = true`.

---

## 3. Issue 2: Elapsed Time Tracking & Unit Inversion Glitch

### 3.1 Direct Observation & Root Cause
In `src/game/Game.js:221`:
```javascript
this.atmosphere.update(delta, performance.now(), this.dayTime);
```
In `src/game/AtmosphereManager.js:358, 485, 503`:
```javascript
const tSec = elapsed > 1000 ? elapsed * 0.001 : elapsed;
```

#### Defect Mechanics:
1. `performance.now()` measures milliseconds since document creation, starting at $0.0\text{ms}$.
2. During the first second of execution ($0 \le t \le 1000\text{ms}$), `elapsed <= 1000`. The code evaluates milliseconds as seconds.
   - At $t = 500\text{ms}$, `tSec = 500.0\text{s}` (1000x oscillation speed).
   - At $t = 1000.1\text{ms}$, `elapsed > 1000` evaluates to true, so `tSec = 1.0001\text{s}`.
   - Visual result: Severe strobe flickering for 1 second, followed by an abrupt, discontinuous animation jump.
3. Long sessions: Any game running longer than 1000 seconds ($16.6\text{ min}$) will trigger the `> 1000` condition even if passing seconds, collapsing `tSec` from $1000\text{s} \to 1\text{s}$ (1000x slowdown).

### 3.2 Concrete Remediation Design

#### A. Standardize Interface Contract to Seconds
Three.js and standard game loops specify time deltas and timestamps in seconds.
1. In `src/game/Game.js:221`: Convert `performance.now()` to seconds at callsite:
   ```javascript
   this.atmosphere.update(delta, performance.now() * 0.001, this.dayTime);
   ```
2. In `src/game/AtmosphereManager.js`: Remove all threshold ternaries (`elapsed > 1000 ? ...`).

#### B. Internal Cumulative Accumulator (Defensive Engineering)
In `AtmosphereManager.js`:
1. In `constructor()`: Initialize `this.elapsedTime = 0.0;`
2. In `update(delta, elapsed, dayTime)`:
   ```javascript
   if (Number.isFinite(delta) && delta > 0) {
     this.elapsedTime += delta;
   }
   const tSec = (typeof elapsed === 'number' && Number.isFinite(elapsed))
     ? elapsed
     : this.elapsedTime;
   ```
3. Pass `tSec` cleanly to `_updateLeafParticles`, `_updateFireflies`, and `_updatePointLights`:
   - `_updateLeafParticles(delta, tSec)`
   - `_updateFireflies(tSec, nightFactor)` (uses `const time = tSec * 2.0;`)
   - `_updatePointLights(tSec, nightFactor)` (uses `tSec` directly for campfire flicker and mushroom pulse)

This guarantees:
- 100% smooth, continuous seconds under all conditions.
- Zero jumps across $1000\text{ms}$ or $1000\text{s}$.
- If `elapsed` is omitted by future callers or unit tests, the internal accumulator guarantees continuous animation.
- If explicit seconds are passed by tests (e.g. `atmo.update(0.016, 99999.0, 0.75)`), the test values are accurately honored without distortion.

---

## 4. Code Changes: Concrete Specification

### 4.1 Target File: `src/game/Game.js`
**Line 221**:
```diff
--- a/src/game/Game.js
+++ b/src/game/Game.js
@@ -218,4 +218,4 @@
     // 1. Advance Day/Night Cycle
     this.dayTime = (this.dayTime + delta / this.dayDuration) % 1.0;
     this._updateDayNightLighting(delta);
-    this.atmosphere.update(delta, performance.now(), this.dayTime);
+    this.atmosphere.update(delta, performance.now() * 0.001, this.dayTime);
```

### 4.2 Target File: `src/game/AtmosphereManager.js`
**Lines 43-46 (Constructor)**:
```diff
--- a/src/game/AtmosphereManager.js
+++ b/src/game/AtmosphereManager.js
@@ -43,3 +43,6 @@
     this._cloudNightColor = new THREE.Color(0x242d4a);
     this._cloudTargetColor = new THREE.Color();
+
+    // Internal cumulative seconds tracking (ensures smooth continuity if elapsed is omitted)
+    this.elapsedTime = 0.0;
   }
```

**Lines 206-250 (`_initCampfireParticles`)**:
```diff
--- a/src/game/AtmosphereManager.js
+++ b/src/game/AtmosphereManager.js
@@ -206,45 +206,69 @@
   _initCampfireParticles() {
+    const cPos = this.campfirePos;
+
     // 4A. Flame Embers
     const fCount = 35;
     const fGeo = new THREE.OctahedronGeometry(0.12, 0);
     const fMesh = new THREE.InstancedMesh(fGeo, this.materials.flame, fCount);
     fMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
     fMesh.castShadow = false;
     fMesh.receiveShadow = false;
     this.particles.flames = fMesh;
 
     for (let i = 0; i < fCount; i++) {
+      const duration = 0.35 + Math.random() * 0.3;
+      const life = (i + 0.5 * Math.random()) / fCount; // Evenly staggered lifecycle across [0, 1)
+      const vy = 2.0 + Math.random() * 1.5;
+      const baseScale = 0.8 + Math.random() * 0.5;
+
+      // Position particle along its natural ascent trajectory at summit campfire
+      const x = cPos.x + (Math.random() - 0.5) * 0.35;
+      const z = cPos.z + (Math.random() - 0.5) * 0.35;
+      const y = cPos.y + 0.15 + (life * duration * vy * 0.8);
+
       this.flameData.push({
-        x: 0, y: 0, z: 0,
-        vx: 0, vy: 0, vz: 0,
-        life: Math.random(),
-        duration: 0.35 + Math.random() * 0.3,
-        baseScale: 0.8 + Math.random() * 0.5,
+        x, y, z,
+        vx: 0, vy, vz: 0,
+        life,
+        duration,
+        baseScale,
       });
+
+      // Initialize instance matrix at summit coordinates on frame 0
+      const scale = Math.sin(life * Math.PI) * baseScale;
+      this._dummy.position.set(x, y, z);
+      this._dummy.rotation.set(0, 0, 0);
+      this._dummy.scale.setScalar(Math.max(0.001, scale));
+      this._dummy.updateMatrix();
+      fMesh.setMatrixAt(i, this._dummy.matrix);
+
       fMesh.setColorAt(i, new THREE.Color(0xff6600));
     }
+    fMesh.instanceMatrix.needsUpdate = true;
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
+      const duration = 2.2 + Math.random() * 1.4;
+      const life = (i + 0.5 * Math.random()) / sCount; // Evenly staggered lifecycle across [0, 1)
+      const vy = 1.1 + Math.random() * 0.6;
+      const baseScale = 0.7 + Math.random() * 0.6;
+
+      // Position smoke puff along its rising wind-drift plume at summit campfire
+      const driftTime = life * duration;
+      const x = cPos.x + (Math.random() - 0.5) * 0.3 + this.wind.x * 0.75 * driftTime;
+      const z = cPos.z + (Math.random() - 0.5) * 0.3 + this.wind.z * 0.75 * driftTime;
+      const y = cPos.y + 0.75 + (vy * driftTime);
+
       this.smokeData.push({
-        x: 0, y: 0, z: 0,
-        vx: 0, vy: 0, vz: 0,
-        life: Math.random(),
-        duration: 2.2 + Math.random() * 1.4,
-        baseScale: 0.7 + Math.random() * 0.6,
+        x, y, z,
+        vx: this.wind.x * 0.75, vy, vz: this.wind.z * 0.75,
+        life,
+        duration,
+        baseScale,
       });
+
+      // Initialize instance matrix at summit coordinates on frame 0
+      const scale = (0.3 + life * 1.8) * baseScale * (1.0 - life * 0.3);
+      this._dummy.position.set(x, y, z);
+      this._dummy.rotation.set(0, 0, 0);
+      this._dummy.scale.setScalar(Math.max(0.001, scale));
+      this._dummy.updateMatrix();
+      sMesh.setMatrixAt(i, this._dummy.matrix);
     }
+    sMesh.instanceMatrix.needsUpdate = true;
     this.scene.add(sMesh);
   }
```

**Lines 298-307 (`update`)**:
```diff
--- a/src/game/AtmosphereManager.js
+++ b/src/game/AtmosphereManager.js
@@ -298,9 +298,13 @@
   update(delta, elapsed, dayTime) {
+    if (Number.isFinite(delta) && delta > 0) {
+      this.elapsedTime += delta;
+    }
+    const tSec = (typeof elapsed === 'number' && Number.isFinite(elapsed)) ? elapsed : this.elapsedTime;
     const nightFactor = this._calculateNightFactor(dayTime);
 
     this._updateClouds(delta, dayTime, nightFactor);
-    this._updateLeafParticles(delta, elapsed);
+    this._updateLeafParticles(delta, tSec);
     this._updateMushroomSpores(delta);
     this._updateCampfireParticles(delta);
-    this._updateFireflies(elapsed, nightFactor);
-    this._updatePointLights(elapsed, nightFactor);
+    this._updateFireflies(tSec, nightFactor);
+    this._updatePointLights(tSec, nightFactor);
   }
```

**Subsystem Updates (`_updateLeafParticles`, `_updateFireflies`, `_updatePointLights`)**:
```diff
--- a/src/game/AtmosphereManager.js
+++ b/src/game/AtmosphereManager.js
@@ -354,6 +354,4 @@
-  _updateLeafParticles(delta, elapsed) {
+  _updateLeafParticles(delta, tSec) {
     const mesh = this.particles.leaves;
     if (!mesh) return;
-
-    const tSec = elapsed > 1000 ? elapsed * 0.001 : elapsed;
@@ -475,10 +473,8 @@
-  _updateFireflies(elapsed, nightFactor) {
+  _updateFireflies(tSec, nightFactor) {
     const mesh = this.particles.fireflies;
     if (!mesh) return;
 
     if (nightFactor < 0.05) {
       mesh.visible = false;
       return;
     }
     mesh.visible = true;
-
-    const time = elapsed > 1000 ? elapsed * 0.002 : elapsed * 2.0;
+    const time = tSec * 2.0;
@@ -502,3 +498,1 @@
-  _updatePointLights(elapsed, nightFactor) {
-    const tSec = elapsed > 1000 ? elapsed * 0.001 : elapsed;
+  _updatePointLights(tSec, nightFactor) {
```

---

## 5. Verification & Test Alignment

### 5.1 Cold-Start Particle Verification
```javascript
// Test Assertion 1: Zero particles near origin
const flamesNearOrigin = atmo.flameData.filter(p => Math.hypot(p.x, p.z) < 5.0).length;
const smokeNearOrigin = atmo.smokeData.filter(p => Math.hypot(p.x, p.z) < 5.0).length;
assert.equal(flamesNearOrigin, 0, 'Zero flame particles near origin on cold-start');
assert.equal(smokeNearOrigin, 0, 'Zero smoke particles near origin on cold-start');

// Test Assertion 2: 100% of particles at summit campfire
const flamesAtSummit = atmo.flameData.filter(p => Math.hypot(p.x - 20.0, p.z - 22.0) < 2.0).length;
assert.equal(flamesAtSummit, 35, 'All 35 flame particles initialized strictly at summit campfire');

// Test Assertion 3: Immediate bounding box validity on frame 0 (before update)
atmo.particles.flames.computeBoundingBox();
const flameBox = atmo.particles.flames.boundingBox;
assert.ok(flameBox.min.x >= 19.0 && flameBox.max.x <= 21.0);
assert.ok(flameBox.min.z >= 21.0 && flameBox.max.z <= 23.0);
assert.ok(flameBox.min.y >= 7.0 && flameBox.max.y <= 9.5);
```

### 5.2 Time Continuity Verification
```javascript
// Test Assertion: Continuous time tracking across the 1000ms boundary
const t0 = 0.999;
const t1 = 1.001;
atmo.update(0.016, t0, 0.5);
const lightBefore = campfireLight.intensity;
atmo.update(0.016, t1, 0.5);
const lightAfter = campfireLight.intensity;

const deltaIntensity = Math.abs(lightAfter - lightBefore);
assert.ok(deltaIntensity < 0.05, `Light intensity is continuous across 1.0s (delta = ${deltaIntensity})`);
```

### 5.3 Test Suite Coordination with Peer Agents
- Peer agent `explorer_m1_it2_3` is designing `tests/tier1_features/f06_atmosphere_remediation.test.mjs`.
- The test assertions above provide the exact verification contracts for `f06_atmosphere_remediation.test.mjs`.
- In `tests/stress/m1_atmosphere_stress.test.mjs`:
  - Lines 517-557 (`Empirical Defect: Campfire flame/smoke cold-start spawn at world origin`) and lines 559-580 (`Empirical Defect: Elapsed time unit heuristic inversion`) were written by `challenger_m1_2` to empirically reproduce the bugs.
  - When the worker applies these fixes, those two challenger tests should be updated to assert the remediated behaviors:
    1. `flamesAtOrigin === 0` (instead of `flamesAtOrigin === 35`).
    2. `Math.abs(tSecAfter - tSecBefore) < 0.005` (instead of `tSecBefore > tSecAfter * 500`).

---

## 6. Conclusion

By fixing the initialization coordinates and frame-0 instance matrices of flame and smoke particles to `(20, 7, 22)` with staggered life, and standardizing elapsed time tracking to continuous seconds throughout `Game.js` and `AtmosphereManager.js`:
1. Player spawn at `(0, 0, 0)` is 100% free of stray fire and smoke.
2. The summit campfire displays a fully developed, natural particle plume on Frame 0.
3. Leaf sway, fireflies, and campfire flicker oscillate smoothly and continuously without hyper-speed buzzing, phase warps, or session decay.
