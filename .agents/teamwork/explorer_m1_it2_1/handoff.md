# Handoff Report: Investigation & Fix Strategy for Cloud Color Tinting and Three.js r186 ShadowMap Deprecation

**Agent ID**: `explorer_m1_it2_1`  
**Role**: explorer (investigation, synthesis)  
**Working Directory**: `c:/Users/vuodo/software/forest-runner/.agents/teamwork/explorer_m1_it2_1`  
**Milestone**: Milestone 1 Iteration 2  
**Target Subsystems**: `src/game/AtmosphereManager.js`, `src/game/Renderer.js`, `src/game/Game.js`, `tests/stress/m1_atmosphere_stress.test.mjs`  
**Timestamp**: 2026-09-27T14:48:00Z  
**Handoff Type**: Hard (Investigation Complete)  

---

## 1. Observation

1. **Cloud Color Discontinuity at $t = 0.55$ (`src/game/AtmosphereManager.js:337-352`)**:
   - Source lines in `AtmosphereManager.js`:
     ```javascript
     338: if (dayTime >= 0.40 && dayTime < 0.55) {
     339:   const t = (dayTime - 0.40) / 0.15;
     340:   const blend = t * t * (3 - 2 * t);
     341:   this._cloudTargetColor.lerpColors(this._cloudDayColor, this._cloudSunsetColor, blend);
     342: } else if (dayTime >= 0.55 && dayTime < 0.90) {
     343:   this._cloudTargetColor.copy(this._cloudNightColor);
     344: } else if (dayTime >= 0.90) {
     345:   const t = (dayTime - 0.90) / 0.10;
     346:   const blend = t * t * (3 - 2 * t);
     347:   this._cloudTargetColor.lerpColors(this._cloudNightColor, this._cloudDayColor, blend);
     348: } else {
     349:   this._cloudTargetColor.copy(this._cloudDayColor);
     350: }
     ```
   - Color values in constructor (`AtmosphereManager.js:41-44`):
     ```javascript
     this._cloudDayColor = new THREE.Color(0xffffff);
     this._cloudSunsetColor = new THREE.Color(0xffaa88);
     this._cloudNightColor = new THREE.Color(0x242d4a);
     ```
   - Direct execution check:
     At $t = 0.5499$, `this._cloudTargetColor` evaluates to `#ffaa88` (linear RGB: $1.0, 0.4020, 0.2462$).
     At $t = 0.5501$, it executes `copy(this._cloudNightColor)` (`#242d4a`, linear RGB: $0.0176, 0.0262, 0.0685$).
     Manhattan RGB jump: $|1.0 - 0.0176| + |0.4020 - 0.0262| + |0.2462 - 0.0685| = 1.5359$ across a single frame (16.6ms).
   - In addition, at $t \ge 0.90$, clouds interpolate directly from night to day, completely bypassing dawn rose-gold tinting.

2. **Three.js r186 ShadowMap Deprecation Warning (`src/game/Renderer.js:14`)**:
   - `Renderer.js:14`:
     ```javascript
     this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
     ```
   - Package dependency (`package.json:17`): `"three": "^0.186.1"`.
   - Inspection of Three.js r186 core (`node_modules/three/src/renderers/webgl/WebGLShadowMap.js:99-104`):
     ```javascript
     if ( this.type === PCFSoftShadowMap ) {
       warn( 'WebGLShadowMap: PCFSoftShadowMap has been removed. Using PCFShadowMap instead.' );
       this.type = PCFShadowMap;
     }
     ```
   - Empirical Node/headless test:
     ```powershell
     node --input-type=module -e "import './tests/helpers/headless_env.mjs'; import * as THREE from 'three'; import { Renderer } from './src/game/Renderer.js'; const div = document.createElement('div'); const r = new Renderer(div); const scene = new THREE.Scene(); const cam = new THREE.PerspectiveCamera(); const light = new THREE.DirectionalLight(); light.castShadow = true; scene.add(light); r.render(scene, cam);"
     ```
     Result: Emits verbatim runtime warning:
     `THREE.WebGLShadowMap: PCFSoftShadowMap has been removed. Using PCFShadowMap instead.`
     After this initial warning, Three.js mutates `this.type` from `2` (`PCFSoftShadowMap`) to `1` (`PCFShadowMap`).
   - Testing direct assignment to `THREE.PCFShadowMap` (`r.shadowMap.type = THREE.PCFShadowMap`):
     Result: Executes render cleanly with zero warnings logged.

3. **Campfire Particle Origin Leak (`src/game/AtmosphereManager.js:218-248`)**:
   - `_initCampfireParticles` creates 35 flame particles and 30 smoke puffs initialized with:
     ```javascript
     { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: Math.random(), ... }
     ```
   - Result: 64 out of 65 particles spawn at world origin `(0, 0, 0)` (Crossroads player spawn point) on game startup and remain there until their random initial life duration completes (up to 3.6s for smoke).

4. **Elapsed Time Inversion Heuristic (`src/game/AtmosphereManager.js:358, 485, 503`)**:
   - Heuristic used: `const tSec = elapsed > 1000 ? elapsed * 0.001 : elapsed;`
   - In `Game.js:221`: `this.atmosphere.update(delta, performance.now(), this.dayTime);` passes milliseconds.
   - For $0 \le \text{elapsed} \le 1000\text{ms}$, `elapsed > 1000` evaluates to false, so milliseconds are used directly as seconds (e.g., $500\text{ms} \to 500\text{s}$, producing 1000x oscillation speed).
   - At $\text{elapsed} = 1000.1\text{ms}$, `tSec` instantly drops from $1000\text{s}$ down to $1.0001\text{s}$ (a 998x jump backwards).

5. **Existing Test Suite State**:
   - `npm test`: 135 tests passing across `tests/`.
   - `tests/stress/m1_atmosphere_stress.test.mjs`: Contains 15 tests. Tests 4, 14, and 15 are explicit adversarial bug reproduction tests created by `challenger_m1_2` that assert the presence of the bugs (e.g. `assert.ok(colorJump > 1.0)`).
   - `tests/tier1_features/f02_shadows.test.mjs`: Tests `ShadowsModel.REQUIRED_SHADOW_MAP_TYPE` against `THREE.PCFSoftShadowMap` (2). It does not import or instantiate `Renderer.js`.

---

## 2. Logic Chain

1. **Discontinuous Cloud Visuals (Observation 1)**:
   - Atmospheric requirements (R1, R3 in `ORIGINAL_REQUEST.md`) mandate continuous, living transitions between day, sunset, and night.
   - The current piecewise implementation creates an instantaneous visual pop ($\Delta = 1.536$) at $t = 0.55$ and completely omits dawn tinting.
   - `Game.js:326-334` already demonstrates a proven, robust cyclic 4-phase architecture using Hermite cubic smoothstep ($S(u) = 3u^2 - 2u^3$) over 4 quadrants ($t \in [0, 0.25), [0.25, 0.50), [0.50, 0.75), [0.75, 1.00)$).
   - Adopting this exact cyclic formulation in `AtmosphereManager.js` with the 4 user-specified keyframes (Dawn: `#ffccaa`, Day: `#ffffff`, Sunset: `#ff9966`, Night: `#202b44`) guarantees $C^0$ continuity (identical values at boundaries), $C^1$ continuity (zero derivatives at all boundaries), and seamless cyclic wrap-around ($t = 1.0 \to 0.0$).
   - Numerical simulation confirms that the single-frame delta at $t = 0.55$ is reduced from $1.536$ down to $0.00104$ ($1475\times$ smoother), with maximum frame step $\le 0.00122$ everywhere.

2. **Shadow Map Type Deprecation Warning (Observation 2)**:
   - In Three.js r186, `THREE.PCFSoftShadowMap` is deprecated and decommissioned. The runtime automatically forces the shadow map to `THREE.PCFShadowMap` on every render while outputting a console warning.
   - The acceptance criteria require that the game launches and runs with zero console warnings and errors.
   - Setting `this.renderer.shadowMap.type = THREE.PCFShadowMap;` in `Renderer.js` avoids the deprecation warning entirely, aligns directly with Three.js r186's internal implementation, and retains hardware-filtered soft shadows.
   - Because `tests/tier1_features/f02_shadows.test.mjs` tests `ShadowsModel` in `analytical_models.mjs` and does not import `Renderer.js`, updating `Renderer.js` does not break any existing tests in the suite.

3. **Campfire Cold-Start and Time Unit Coherence (Observations 3, 4)**:
   - Initializing particles at `this.campfirePos` (`20.0, 7.0, 22.0`) in `_initCampfireParticles` ensures zero particles spawn at the player start `(0, 0, 0)`.
   - Passing `performance.now() * 0.001` from `Game.js:221` and using `const tSec = elapsed;` in `AtmosphereManager.js` standardizes time in seconds across the entire game and test suites, eliminating the 1000x frequency spike and phase jump.

4. **Test Suite Adaptation (Observation 5)**:
   - Because `tests/stress/m1_atmosphere_stress.test.mjs` contains bug-reproduction assertions (`colorJump > 1.0`, `flamesAtOrigin === 35`), fixing the bugs will cause these tests to fail unless they are converted into regression-prevention assertions (`colorJump < 0.02`, `flamesAtOrigin === 0`, night color `'202b44'`).

---

## 3. Caveats

1. **Read-Only Scope**:
   - As an explorer agent, no project source code files outside of `.agents/teamwork/explorer_m1_it2_1/` have been modified.
   - Concrete replacement code snippets and diff patches are fully prepared in `recommendation.md` for `worker_m1_it2_1` to implement.
2. **Stress Test File Status**:
   - `tests/stress/m1_atmosphere_stress.test.mjs` is located within `tests/` and is picked up by `npm test`. Because it was authored to prove defects, the implementing agent must update lines 154, 158–164, 189, 528, and 574 to verify that the defects are resolved.
3. **Headless WebGL Environment**:
   - Headless Node tests verify CPU mathematical logic, matrices, and Three.js object properties. Visual appearance on physical GPU hardware in browser viewports should be verified in manual preview.

---

## 4. Conclusion

The visual popping in `AtmosphereManager.js` and the Three.js shadowMap deprecation warning in `Renderer.js` have been comprehensively investigated, with root causes identified and fully documented.

A complete fix strategy has been designed and specified in `recommendation.md`:
1. Implement cyclic 4-phase Hermite smoothstep color interpolation in `AtmosphereManager.js` using Dawn (`0xffccaa`), Day (`0xffffff`), Sunset (`0xff9966`), and Night (`0x202b44`).
2. Update `Renderer.js:14` to `this.renderer.shadowMap.type = THREE.PCFShadowMap;`.
3. Initialize campfire flame and smoke particles at `this.campfirePos` in `AtmosphereManager.js:_initCampfireParticles`.
4. Enforce clean second-based elapsed time units across `Game.js` and `AtmosphereManager.js`.
5. Update `tests/stress/m1_atmosphere_stress.test.mjs` from bug reproduction to regression prevention assertions, and relocate the verification suite to `tests/m1_verification.test.mjs`.

---

## 5. Verification Method

To independently verify the investigation and the proposed fix strategy:

1. **Verify Deprecation Warning in Current Code vs Clean Fix**:
   ```powershell
   # 1A. Reproduce Three.js r186 deprecation warning:
   node --input-type=module -e "import './tests/helpers/headless_env.mjs'; import * as THREE from 'three'; import { Renderer } from './src/game/Renderer.js'; const div = document.createElement('div'); const r = new Renderer(div); const scene = new THREE.Scene(); const cam = new THREE.PerspectiveCamera(); const light = new THREE.DirectionalLight(); light.castShadow = true; scene.add(light); r.render(scene, cam);"
   # Output: Prints 'THREE.WebGLShadowMap: PCFSoftShadowMap has been removed. Using PCFShadowMap instead.'

   # 1B. Verify zero warning with PCFShadowMap:
   node --input-type=module -e "import './tests/helpers/headless_env.mjs'; import * as THREE from 'three'; const r = new THREE.WebGLRenderer(); r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFShadowMap; const scene = new THREE.Scene(); const cam = new THREE.PerspectiveCamera(); const light = new THREE.DirectionalLight(); light.castShadow = true; scene.add(light); r.render(scene, cam); console.log('Clean render without warning!');"
   ```

2. **Verify Proposed 4-Phase Color Interpolation Math**:
   ```powershell
   node --input-type=module -e "import * as THREE from 'three'; const palette = [new THREE.Color(0xffccaa), new THREE.Color(0xffffff), new THREE.Color(0xff9966), new THREE.Color(0x202b44)]; function getCol(t) { const u = ((t%1)+1)%1; const idx = Math.floor(u/0.25); const seg = (u - idx*0.25)/0.25; const blend = seg*seg*(3 - 2*seg); return new THREE.Color().lerpColors(palette[idx], palette[(idx+1)%4], blend); } const c1 = getCol(0.5499); const c2 = getCol(0.5501); const jump = Math.abs(c1.r - c2.r) + Math.abs(c1.g - c2.g) + Math.abs(c1.b - c2.b); console.log('Jump across dt=0.0002:', jump);"
   # Expected Output: 'Jump across dt=0.0002: 0.00104...' (< 0.002, smooth C1)
   ```

3. **Verify Full Existing Test Suite**:
   ```powershell
   npm test
   ```
   *Expected Output*: Passes all 135 tests.
