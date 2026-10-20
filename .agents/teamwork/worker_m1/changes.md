# Changes Summary: Milestone 1 Implementation

**Worker ID**: `worker_m1`  
**Milestone**: M1 — Lighting, Tonemapping & Atmospheric FX Engine  
**Date**: 2026-09-27  

---

## 1. Overview of Changes

Milestone 1 implements the complete cinematic lighting, tonemapping, and atmospheric effects overhaul for Forest Runner:
- Upgrades the WebGL renderer with ACESFilmic tone mapping, calibrated exposure (1.10), and soft PCF shadow filtering.
- Implements a continuous 4-phase day/sunset/night lighting cycle (Dawn, Day, Sunset, Night) across all 9 global lighting parameters with zero per-frame garbage collection allocation, permanently eliminating the sticky blue moonlight bug.
- Configures directional shadow bias (`-0.0001`) and normalBias (`0.03`) to eliminate shadow acne and peter-panning.
- Encapsulates atmospheric effects into `src/game/AtmosphereManager.js`, introducing 14 low-poly drifting clouds with toroidal boundary wrapping and dynamic day/sunset/night color tinting, 4 high-efficiency `THREE.InstancedMesh` particle systems (forest breeze leaves, glowing mushroom spores, summit campfire flames, and campfire smoke) plus consolidated night fireflies, and 4 warm localized point lights with smoothstep night ignition and organic harmonic flicker.

---

## 2. File-by-File Changes

### 2.1 `src/game/Renderer.js`
- **Modifications**:
  - `this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;` (upgraded from hard `PCFShadowMap`).
  - `this.renderer.toneMapping = THREE.ACESFilmicToneMapping;` (upgraded from `NoToneMapping`).
  - `this.renderer.toneMappingExposure = 1.10;` (calibrated midtone energy boost).
  - Maintained `outputColorSpace = THREE.SRGBColorSpace;`.
  - Added helper methods `setExposure(exposure)` and `getExposure()`.
  - Added convenience getters `domElement` and `instance`.
- **Rationale**:
  - Prevents color channel clipping and blown-out pure white highlights on sunlit surfaces.
  - Lifts midtones to compensate for the ACES toe curve, preserving vibrant toon saturation (grass `0x58aa32`, amber sunsets, wood tones).
  - Softens shadow silhouettes using 9-tap Poisson-disk sampling.

### 2.2 `src/game/AtmosphereManager.js` (New File)
- **Modifications**:
  - Created a modular manager class handling clouds, particles, and localized point lights.
  - **14 Low-Poly Clouds**: Clustered 4–6 dodecahedron puffs per cloud (`DodecahedronGeometry`), faceted flat shading, cruising at altitudes `y = 22.0m` to `31.0m`.
  - **Toroidal Wrapping**: Smooth wrap at $x > 65.0\text{m} \to x -= 130.0\text{m}$ with randomized $Z$, $Y$, and speed.
  - **Dynamic Cloud Tinting**: Smoothly interpolates `cloudMat.color` between crisp day white (`0xffffff`), warm sunset amber (`0xffaa88`), and midnight slate indigo (`0x242d4a`) with zero per-frame allocation.
  - **Instanced Particle Systems** (`THREE.InstancedMesh`):
    - 100 Forest Breeze Leaves/Pollen (`PlaneGeometry` with 4-color palette, terminal velocity, wind drift, 3-axis rotation, terrain height detection).
    - 60 Luminescent Mushroom Spores (`DodecahedronGeometry` with additive blending, cyan/magenta/lime colors, upward float, helical swirl, life scale curve).
    - 35 Campfire Flames (`OctahedronGeometry` with additive blending, rapid upward burst, amber glow).
    - 30 Campfire Smoke Puffs (`DodecahedronGeometry` with semi-transparency, billowing expansion, wind lean).
    - 40 Consolidated Night Fireflies (`DodecahedronGeometry`, active at night, scaling with `nightFactor`, replacing 40 individual meshes).
  - **4 Warm Localized Point Lights**:
    - `village_lantern`: `[-4.0, 2.3, -2.5]`, `0xff9933`, day: 0.1, night: 2.2, distance: 10m.
    - `bridge_lantern`: `[0.5, 4.9, -12.5]`, `0xff9933`, day: 0.1, night: 2.0, distance: 9m.
    - `summit_campfire`: `[20.0, 7.6, 22.0]`, `0xff6611`, day: 0.9, night: 2.6, distance: 13m, multi-octave harmonic flicker.
    - `mushroom_grove`: `[-16.0, 4.2, 16.0]`, `0x00e5ff`, day: 0.0, night: 1.8, distance: 11m, breathing pulse.
    - `castShadow = false`, `decay = 2.0`, smoothstep night ignition curve.
  - **Zero-Allocation Architecture**: Single reusable `_dummy = new THREE.Object3D()`, pre-allocated colors, `DynamicDrawUsage` buffers.
- **Rationale**:
  - Delivers rich environmental life while saving 21 net draw calls compared to pre-M1 baseline.
  - Ensures robust separation of concerns, keeping `Game.js` lightweight.

### 2.3 `src/game/Game.js`
- **Modifications**:
  - Exported `LIGHTING_PHASES` palette constant defining Dawn, Day, Sunset, Night parameters.
  - Added pre-allocated scratch objects on `Game` instance (`_targetSunColor`, `_targetAmbientColor`, `_targetHemiSkyColor`, `_targetHemiGroundColor`, `_targetSkyColor`, `_targetFogColor`, `_targetSunPos`) for zero garbage collection overhead.
  - Configured `this.sunLight.shadow.bias = -0.0001;` and `this.sunLight.shadow.normalBias = 0.03;`.
  - Instantiated `this.atmosphere = new AtmosphereManager(this.scene, this.world);` in constructor and called `await this.atmosphere.init();` in `_initScene()`.
  - Replaced binary `_updateDayNightLighting(delta)` with continuous 4-phase C1 Hermite smoothstep keyframe interpolation:
    - Dawn (`t = 0.00`): Rose-gold sun (`0xffb88c`), peach sky (`0xf59e72`).
    - Day (`t = 0.25`): Solar cream sun (`0xfff6e5`), azure toon sky (`0x6ec4f8`).
    - Sunset (`t = 0.50`): Fiery amber sun (`0xff7a36`), crimson dusk sky (`0xe65c2b`).
    - Night (`t = 0.75`): Indigo moonlight (`0x8cb8ff`), deep navy sky (`0x0a101d`), high celestial elevation (`y = 50m`) preventing elongated ground shadows.
  - Wired `this.atmosphere.update(delta, performance.now(), this.dayTime);` into `_update(delta)`.
  - Added public state getters: `timeOfDay`, `currentPhase`, `isNight`, `getFormattedTime()`.
- **Rationale**:
  - Permanently eliminates the sticky blue sunlight bug.
  - Delivers smooth visual transitions between all phases without snapping.
  - Calibrated shadow parameters eradicate shadow acne on slopes and prevent peter-panning.

---

## 3. Verification & Quality Validation

1. **Vite Production Build**:
   - `npm run build` executed successfully.
   - Built in 391ms with 22 modules transformed.
   - Valid bundle generation without syntax or module errors.
2. **Automated Verification Test Suite**:
   - Authored `.agents/teamwork/worker_m1/tests/m1_verification.test.mjs`.
   - Verified ACESFilmic tone mapping, 1.10 exposure, PCFSoftShadowMap, SRGBColorSpace.
   - Verified 14 clouds with boundary wrapping and day/night tinting.
   - Verified InstancedMesh particle systems (leaves, spores, flames, smoke, fireflies).
   - Verified 4 localized point lights with smoothstep night ignition and harmonic flicker.
   - Verified directional light shadow bias and normalBias.
   - Verified permanent resolution of the moonlight sticky color bug across dawn, day, sunset, and night cycles.
   - Verified continuous parameter modulation and Hermite smoothstep boundary continuity.
