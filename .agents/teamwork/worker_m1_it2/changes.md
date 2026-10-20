# Changes Report — Milestone 1 Iteration 2 Remediation

**Author**: `worker_m1_it2`  
**Milestone**: Milestone 1 Iteration 2 (Remediation)  
**Date**: 2026-09-27  

---

## 1. Overview of Changes

Milestone 1 Iteration 2 targeted five core defects surfaced by the forensic auditor (`auditor_m1_1`) and adversarial challengers (`challenger_m1_2`):
1. **Workspace Layout & Test Separation Compliance**: Removed the rogue directory `.agents/teamwork/worker_m1/tests/` to guarantee `.agents/teamwork/` contains exclusively agent metadata, and established the canonical remediation test suite in `tests/tier1_features/f06_atmosphere_remediation.test.mjs`.
2. **Three.js r186 ShadowMap Deprecation Resolution**: Migrated `Renderer.js` from deprecated `THREE.PCFSoftShadowMap` to `THREE.PCFShadowMap`, eliminating runtime console warnings while retaining hardware-filtered soft shadows.
3. **Continuous 4-Phase Cloud Color Tinting**: Replaced the piecewise hard-branching in `AtmosphereManager.js` with Hermite smoothstep cubic interpolation across 4 keyframes: Dawn (`#ffccaa`), Day (`#ffffff`), Sunset (`#ff9966`), and Night (`#202b44`). Eliminates the 1.536 color step at $t = 0.55$, guaranteeing $C^0$ and $C^1$ continuity and smooth midnight wrap-around.
4. **Summit Campfire Particles Pre-Warming & Spatial Containment**: Initialized all 35 flame particles and 30 smoke puffs directly at summit campfire coordinates `(20.0, 7.0, 22.0)` with uniformly staggered lifecycles across $[0, 1)$ and immediate frame 0 instance matrix updates. Completely eliminated stray particles at Crossroads player spawn `(0, 0, 0)`.
5. **Time Unit Contract & Accumulator Standardization**: Standardized `Game.js` to pass seconds (`performance.now() * 0.001`), removed all ambiguous `elapsed > 1000 ? elapsed * 0.001 : elapsed` threshold heuristics from `AtmosphereManager.js`, and implemented an internal cumulative seconds accumulator (`this.elapsedTime`) for caller-independent smooth animation.
6. **Harmonized Challenger Test Suite**: Updated `tests/stress/m1_atmosphere_stress.test.mjs` in accordance with Explorer 1 §6.4 and Explorer 2 §5.3, converting Iteration 1 bug-reproduction tests to regression-prevention assertions.

---

## 2. File-by-File Details

### 2.1. Removed: `.agents/teamwork/worker_m1/tests/`
- **Action**: Deleted directory and its rogue contents (`m1_verification.test.mjs`).
- **Rationale**: Restores strict compliance with `PROJECT.md:70` and teamwork workspace conventions reserving `.agents/teamwork/` solely for metadata files.

### 2.2. Modified: `src/game/Renderer.js`
- **Lines changed**: 14–16
- **Modification**:
  ```javascript
  // Before:
  this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // After:
  // Three.js r186 deprecated and removed PCFSoftShadowMap in favor of PCFShadowMap.
  // Setting PCFShadowMap directly eliminates console warnings while providing hardware-filtered soft shadows.
  this.renderer.shadowMap.type = THREE.PCFShadowMap;
  ```
- **Rationale**: In Three.js r186.1, `PCFSoftShadowMap` is deprecated and logs a warning on render: `'WebGLShadowMap: PCFSoftShadowMap has been removed. Using PCFShadowMap instead.'`. Switching to `THREE.PCFShadowMap` eliminates all warnings and adheres to zero-console-warning acceptance criteria.

### 2.3. Modified: `src/game/Game.js`
- **Lines changed**: 99–101, 221–222
- **Modification**:
  ```javascript
  // In constructor:
  this.atmosphere = new AtmosphereManager(this.scene, this.world);
  this.atmosphereManager = this.atmosphere; // Alias contract

  // In _update(delta):
  // Before:
  this.atmosphere.update(delta, performance.now(), this.dayTime);
  // After:
  this.atmosphere.update(delta, performance.now() * 0.001, this.dayTime);
  ```
- **Rationale**: Standardizes callsite time input to seconds rather than raw milliseconds.

### 2.4. Modified: `src/game/AtmosphereManager.js`
- **Lines changed**:
  - Constructor (lines 40–58): Added pre-allocated 4-phase color definitions for Dawn (`#ffccaa`), Day (`#ffffff`), Sunset (`#ff9966`), Night (`#202b44`), cyclic `_cloudPhases` array, and `this.elapsedTime = 0.0`.
  - `_initCampfireParticles` (lines 220–290): Pre-warmed all 35 flame particles and 30 smoke puffs directly at `cPos` `(20.0, 7.0, 22.0)` with uniformly staggered lifecycles `(i + 0.5 * Math.random()) / count`, computed frame 0 transforms into `_dummy`, and set `fMesh.setMatrixAt` and `sMesh.setMatrixAt` with `needsUpdate = true`.
  - `update` (lines 355–370): Added delta accumulation to `this.elapsedTime`, sanitized `tSec` (seconds), and forwarded `tSec` cleanly to sub-systems.
  - `_updateClouds` (lines 395–412): Implemented continuous 4-phase Hermite smoothstep cubic blending with zero GC allocations.
  - `_updateLeafParticles`, `_updateFireflies`, `_updatePointLights` (lines 415–435, 532–580): Replaced `elapsed > 1000 ? ...` heuristics with direct `tSec` usage.

### 2.5. Authored: `tests/tier1_features/f06_atmosphere_remediation.test.mjs`
- **Tests Added**:
  - `F6.Remediation.1.1`: Cloud color continuous modulation with max delta < 0.05 across 1,000 steps.
  - `F6.Remediation.1.2`: Smooth transition across sunset-to-night boundary (`dayTime = 0.5499 -> 0.5501`) with delta < 0.01.
  - `F6.Remediation.1.3`: Dawn tinting presence and smooth wrap-around across midnight (`0.999 -> 0.001`).
  - `F6.Remediation.1.4`: Exact 4-phase keyframe cloud color fidelity (Dawn `#ffccaa`, Day `#ffffff`, Sunset `#ff9966`, Night `#202b44`).
  - `F6.Remediation.2.1`: Cold-start particle data strictly initialized at Summit Campfire `(20, 7, 22)` (0 at origin, 35/35 flames and 30/30 smoke at summit).
  - `F6.Remediation.2.2`: First-frame InstancedMesh transform matrices localized to summit (`distToSummit < 3.0m`, `distToOrigin > 20.0m`).
  - `F6.Remediation.2.3`: Sustained lifecycle respawn confinement over 200 simulation frames.
  - `F6.Remediation.3.1`: Continuous light flicker across elapsed = 1.0s / 1000ms boundary (< 0.05 per 2ms step).
  - `F6.Remediation.3.2`: Internal animation time accumulation is strictly monotonic and yields finite leaf matrices.

### 2.6. Harmonized: `tests/stress/m1_atmosphere_stress.test.mjs`
- **Lines changed**: 151–193, 514–555
- **Modifications**:
  - Updated Night cloud color expectation to `#202b44`.
  - Converted `Cloud sunset-to-night discontinuity at dayTime = 0.55` from asserting jump > 1.0 to asserting delta < 0.02.
  - Converted `Campfire flame/smoke cold-start spawn at world origin` from asserting 35 at origin to asserting 0 at origin, and bounding box localized to summit.

---

## 3. Verification Summary

1. `node --test tests/tier1_features/f06_atmosphere_remediation.test.mjs`:
   - 9 passed, 0 failed (356ms)
2. `npm test` (`node --test tests/**/*.test.mjs`):
   - 144 passed, 0 failed (2285ms)
3. `npm run build`:
   - 22 modules transformed, built in 379ms, exit code 0
4. Three.js r186 Deprecation Warning Check:
   - Output: `Shadow type: 1`, 0 warnings in stderr.
