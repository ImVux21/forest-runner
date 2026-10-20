# Handoff Report: Dynamic 4-Phase Day/Sunset/Night Lighting Engine

**Agent**: `explorer_m1_2`  
**Milestone**: M1 — Lighting, Tonemapping & Atmospheric FX Engine (Feature F3)  
**Status**: Complete (Hard Handoff)  
**Artifact**: `c:/Users/vuodo/software/forest-runner/.agents/teamwork/explorer_m1_2/recommendation.md`  

---

## 1. Observation

Direct code observations from `src/game/Game.js`:

1. **Light Initialization** (`src/game/Game.js`, lines 86–105):
   ```javascript
   // Sun light
   this.sunLight = new THREE.DirectionalLight(0xfff7e2, 2.5);
   this.sunLight.position.set(30, 45, -20);
   ...
   // Hemisphere light
   this.hemiLight = new THREE.HemisphereLight(0x7eccff, 0x488a28, 0.85);
   this.scene.add(this.hemiLight);

   this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
   this.scene.add(this.ambientLight);
   ```

2. **The Sticky Moonlight Bug** (`src/game/Game.js`, lines 274–297):
   ```javascript
   const isDay = sunY > 0;
   const sunFactor = THREE.MathUtils.clamp(sunY / 30, 0, 1);

   if (isDay) {
     // Day / Sunset Sky transition
     const daySky = new THREE.Color(0x6ec4f8);
     const sunsetSky = new THREE.Color(0xe67e22);
     const currentSky = sunsetSky.clone().lerp(daySky, sunFactor);

     this.scene.background = currentSky;
     this.scene.fog.color = currentSky;
     this.sunLight.intensity = 0.5 + sunFactor * 2.0;
     this.ambientLight.intensity = 0.2 + sunFactor * 0.4;

     // Hide fireflies during bright daylight
     this.fireflies.forEach(f => { f.visible = false; });
   } else {
     // Night Sky
     const nightSky = new THREE.Color(0x0c1524);
     this.scene.background = nightSky;
     this.scene.fog.color = nightSky;
     this.sunLight.intensity = 0.2; // Dim blue moonlight
     this.sunLight.color.set(0x90caf9);
     this.ambientLight.intensity = 0.25;
   ```
   - In the `isDay` branch, `this.sunLight.color` is never assigned or restored.
   - In the `else` branch, `this.sunLight.color.set(0x90caf9)` sets the light color to blue moonlight.
   - When transitioning back to day, `sunLight.color` remains permanently stuck on `0x90caf9`.

3. **Binary Threshold & Missing Dawn**:
   - `const isDay = sunY > 0;` creates an abrupt pop between day and night colors at the horizon crossing.
   - Dawn is completely omitted; morning rises with sunset orange.

4. **Static Hemisphere Light and Horizontal Night Shadow**:
   - `this.hemiLight` is never modified during animation, casting full daylight hemisphere bounce (`sky: 0x7eccff, ground: 0x488a28, intensity: 0.85`) into night scenes.
   - At line 272: `this.sunLight.position.set(sunX, Math.max(1, sunY), -20);` clamps `sunY` to `1` when `sunY <= 0`, resulting in a near-horizontal light source at `y = 1` casting extreme stretched shadows.

5. **Garbage Collection Overhead in Animation Loop**:
   - Lines 279–281 allocate `new THREE.Color(0x6ec4f8)`, `new THREE.Color(0xe67e22)`, `sunsetSky.clone().lerp(...)`, creating allocations every frame at 60 FPS.

---

## 2. Logic Chain

1. **Bug Causation**:
   - Observation 1 shows `sunLight` starts with `0xfff7e2`.
   - Observation 2 shows `sunLight.color.set(0x90caf9)` executes at night, while the day branch has no statement touching `sunLight.color`.
   - Therefore, after one full night cycle, daylight will always be illuminated with `0x90caf9` (cold blue) rather than warm cream sunlight.
   - **Resolution**: Replace the binary branching logic with continuous keyframe interpolation on every frame, ensuring `sunLight.color` is continuously evaluated.

2. **Phase Design & Visual Balance**:
   - Observation 3 shows the binary pop between `sunY > 0` and `sunY <= 0`.
   - By creating 4 equidistant keyframes (`t = 0.00` Dawn, `t = 0.25` Day, `t = 0.50` Sunset, `t = 0.75` Night) on `dayTime ∈ [0, 1)` and wrapping smoothly at `t = 1.00`, all transitions become continuous.
   - Incorporating Hermite smoothstep easing ($\text{blend} = 3u^2 - 2u^3$) ensures zero velocity at keyframe knots, creating cinematic holds at noon and midnight.

3. **Complete 9-Parameter Environmental Integration**:
   - Observation 4 shows `hemiLight`, `ambientLight.color`, `background`, and `fog` are currently decoupled or static.
   - Interpolating all 9 parameters (`sunLight.color`, `sunLight.intensity`, `ambientLight.color`, `ambientLight.intensity`, `hemiLight.skyColor`, `hemiLight.groundColor`, `hemiLight.intensity`, `scene.background`, and `scene.fog.color`) creates a unified atmosphere where skies, ambient bounces, and fog harmonize across all times of day.

4. **Shadow and Trajectory Correction**:
   - Observation 4 shows `y = Math.max(1, sunY)` clamps the light to `y = 1` at night.
   - By mapping celestial light positions across the keyframes:
     - Dawn: `(45, 25, -20)`
     - Day: `(15, 55, -20)`
     - Sunset: `(-45, 25, -20)`
     - Night: `(-15, 50, 20)`
   - The directional light remains high overhead at night (`y = 50`), illuminating the scene with natural downward moonbeams and avoiding horizontal shadow artifacts.

5. **Performance & Cross-System Coordination**:
   - Observation 5 shows per-frame object instantiations.
   - Pre-allocating working target objects on the `Game` instance (`_targetSunColor`, `_targetSunPos`, etc.) reduces per-frame heap allocations to **0 bytes**.
   - Interpolating a continuous scalar `nightFactor` ($0.0 \to 1.0$) provides the exact contract needed by `AtmosphereManager` / `WorldManager` to smoothly modulate campfire and lantern point lights (Feature F4) and fade firefly particles.

---

## 3. Caveats

1. **Weather Effects**: Rain and overcast weather systems are not part of Milestone 1; the lighting table is calibrated for clear/stylized cartoon conditions.
2. **Point Light Limit**: Directional light and hemisphere light are global. Localized point lights (lanterns, campfires) are handled in Feature F4; `Game.js` exposes `nightFactor` to control their intensity, but the point light instances themselves reside in `WorldManager`/props.
3. **Renderer Exposure Coupling**: Colors are calibrated assuming `Renderer.js` enables ACESFilmic tone mapping with exposure ~1.1 (Milestone 1 Task F1 / `explorer_m1_1`).

---

## 4. Conclusion

The specification documented in `recommendation.md` completely solves the blue moonlight bug, eliminates visual snapping, delivers a 4-phase day/night lighting system with smoothstep interpolation of all 9 lighting and environmental parameters, fixes night shadow angles, optimizes 60 FPS render loop performance with zero allocations, and establishes a clean integration API for downstream features.

---

## 5. Verification Method

1. **Direct Inspection**:
   - Verify `src/game/Game.js` replaces lines 265–309 with the zero-allocation keyframe interpolation logic specified in `recommendation.md`.
2. **Automated Test Run**:
   - Execute: `node --test tests/tier1_features/f3_day_night.test.mjs` (or via the complete test suite runner `node --test tests/**/*.test.mjs`).
   - Invalidation condition: Test fails if `sunLight.color` does not return to `'fff6e5'` at `dayTime = 0.25` after a night cycle at `dayTime = 0.75`.
3. **Continuous Smoothness & Wrap Check**:
   - Run Node verification:
     ```bash
     node -e "import('./src/game/Game.js').then(...)"
     ```
   - Invalidation condition: Discontinuous jumps in color hex or intensity when evaluating across `t = 0.999` to `t = 0.001`.
