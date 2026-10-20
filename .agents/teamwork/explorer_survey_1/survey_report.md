# Technical Survey Report: Rendering, Lighting, Materials, Water, and VFX Architecture

**Target Project**: Forest Runner (`c:/Users/vuodo/software/forest-runner`)  
**Investigator**: `explorer_survey_1` (Read-Only Exploration Agent)  
**Date**: 2026-09-27  

---

## 1. Executive Summary

Forest Runner is currently structured as an open-world 3D stylized platforming adventure built on **Three.js r186.1** and bundled with **Vite 8.3.1**. The rendering pipeline currently uses standard Three.js forward rendering without post-processing, utilizing `NoToneMapping` and `PCFShadowMap`. The visual environment features low-poly KayKit nature assets, procedural box plateaus, and primitive character rigs.

While the foundation is functional and achieves fast 60 FPS builds (production build completes in ~350ms), significant gaps exist with respect to the user's aesthetic goals (R1 and R3):
- **Tonemapping & Color**: Tone mapping is disabled (`NoToneMapping`), risking blown-out highlights and washed-out color saturation under dynamic lighting.
- **Lighting & Shadows**: Shadows use basic PCF filtering with hard edges. A single directional light covers a 100x100 frustum at 2048x2048 resolution.
- **Day/Night Transition Bug**: When the day/night cycle passes into night, `sunLight.color` is switched to blue (`0x90caf9`). In the daytime branch, the color is **never restored** to warm sunlight, leaving the world permanently lit by blue moonlight after the first day cycle! Furthermore, sky/fog transitions pop abruptly between day and night, and hemisphere light (`hemiLight`) is never updated.
- **Water**: The river consists of 5 static planar rectangular meshes with semi-transparent cyan standard material. There is zero vertex animation, ripple effect, or flow shader.
- **VFX & Particles**: Clouds, ambient falling leaves, mushroom spores, and campfire smoke/flame particles do not exist in the active open world. The only active particle-like elements are 40 individual mesh-based fireflies and 8-mesh sparkle bursts on item pickup.

---

## 2. Three.js Version and Build Tooling (Question 1)

### Exact Versions (`package.json`)
```json
{
  "dependencies": {
    "@types/three": "^0.186.0",
    "three": "^0.186.1"
  },
  "devDependencies": {
    "vite": "^8.3.0"
  },
  "type": "module"
}
```

### Build & Bundling Setup (`vite.config.js`)
- **Bundler**: Vite v8.3.1 (using Rolldown internally for production bundling).
- **Public Directory**: `public/`, serving KayKit GLTF models and textures at `/assets/forest/...`.
- **Chunking**: `rollupOptions.output.manualChunks` splits `three` into a separate vendor chunk (`dist/assets/three-*.js`, minified ~619 kB, gzip ~156 kB).
- **Dev Server**: Runs on port 3000 (`open: true`).
- **Production Build Status**: Verified clean build with `npm run build` in 347ms.

---

## 3. WebGLRenderer, Camera, Scene, and Main Render Loop (Question 2)

### Initialization Flow
1. **Entry Point** (`src/main.js`):
   - DOMContentLoaded instantiates `const game = new Game(container);` where `container` is `#canvas-container` (`100vw` x `100vh`).
2. **Game Core** (`src/game/Game.js` lines 23–26, 74–78):
   - `this.renderer = new Renderer(container);`
   - `this.scene = new THREE.Scene();`
   - `this.camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 350);`
   - Calls `this._initScene();` and starts `this._animate();`
3. **Renderer Class** (`src/game/Renderer.js` lines 6–22):
   ```javascript
   this.renderer = new THREE.WebGLRenderer({
     antialias: true,
     powerPreference: 'high-performance',
   });
   this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
   this.renderer.shadowMap.enabled = true;
   this.renderer.shadowMap.type = THREE.PCFShadowMap;
   this.renderer.outputColorSpace = THREE.SRGBColorSpace;
   this.renderer.toneMapping = THREE.NoToneMapping;
   this.renderer.toneMappingExposure = 1.0;
   this.renderer.setSize(window.innerWidth, window.innerHeight);
   container.appendChild(this.renderer.domElement);
   ```
4. **Camera Controller** (`src/game/ThirdPersonCamera.js`):
   - Smooth 3D orbit chase camera with pitch clamping (`-0.2` to `1.1` rad) and distance zoom (`4.5` to `16.0`m, default `9.0`m).
   - Frame-rate independent exponential smoothing follow (`decay = 12.0`).
5. **Main Animation Loop** (`src/game/Game.js` lines 146–155):
   ```javascript
   _animate() {
     requestAnimationFrame(() => this._animate());
     const now = performance.now();
     const delta = Math.min((now - this.lastTime) / 1000, 0.05);
     this.lastTime = now;
     this._update(delta);
     this.renderer.render(this.scene, this.camera);
   }
   ```
   - Direct rendering via `this.renderer.render(this.scene, this.camera)`. No `EffectComposer` or post-processing passes.

---

## 4. Current Lighting, Shadows, Tone Mapping & Exposure (Question 3)

### Scene Background & Fog (`Game.js` lines 83–85)
- `this.scene.background = new THREE.Color(0x6ec4f8);` (Day sky cyan-blue)
- `this.scene.fog = new THREE.Fog(0x8cd2fc, 70, 160);` (Linear fog, start 70m, end 160m)

### Directional Sun Light (`Game.js` lines 87–98)
- `this.sunLight = new THREE.DirectionalLight(0xfff7e2, 2.5);` (Warm cream white, intensity 2.5)
- Initial Position: `(30, 45, -20)`
- Shadows:
  - `castShadow = true;`
  - `mapSize = (2048, 2048)`
  - `shadow.camera.near = 0.5`, `far = 180`
  - Shadow camera orthographic bounds: `left = -50`, `right = 50`, `top = 50`, `bottom = -50`
  - `bias = -0.0005`

### Ambient & Hemisphere Lights (`Game.js` lines 101–105)
- `this.hemiLight = new THREE.HemisphereLight(0x7eccff, 0x488a28, 0.85);`
  - Sky: `0x7eccff` (soft sky blue)
  - Ground: `0x488a28` (grass green bounce)
  - Intensity: `0.85`
- `this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);` (Flat white ambient, intensity 0.5)

### Point Lights in the Scene
- `NPCManager.js` line 285: Forest Spirit has a single `THREE.PointLight(0x00ffaa, 1.8, 8)` illuminating its body on the peak summit.
- **No other point lights exist** in the world (no lantern posts, no campfire, no village lights).

### Tone Mapping & Shadow Filter Configuration (`Renderer.js` lines 14, 17–18)
- `this.renderer.shadowMap.type = THREE.PCFShadowMap;` (Harder, noisier shadow edges compared to `PCFSoftShadowMap`)
- `this.renderer.toneMapping = THREE.NoToneMapping;` (Linear raw output)
- `this.renderer.toneMappingExposure = 1.0;`

---

## 5. Day/Night Cycle and Time-of-Day System (Question 4)

### Logic Analysis (`Game.js` lines 45–46, 159–160, 265–309)
- **Time progression**:
  - `this.dayTime = 0.25;` (Normalized 0..1: 0.25 = noon, 0.5 = sunset, 0.75 = midnight, 1.0 = sunrise).
  - `this.dayDuration = 140;` (140 seconds per full cycle).
  - Advanced in `_update(delta)`: `this.dayTime = (this.dayTime + delta / this.dayDuration) % 1.0;`
- **Sun Orbit**:
  - `const angle = t * Math.PI * 2;`
  - `sunX = Math.cos(angle) * 50;`
  - `sunY = Math.sin(angle) * 50;`
  - `this.sunLight.position.set(sunX, Math.max(1, sunY), -20);`

### Identified Bugs and Weaknesses
1. **Critical Sun Light Color Bug (`Game.js` lines 277–298)**:
   - At night: `this.sunLight.color.set(0x90caf9);` (blue moonlight).
   - In day branch: `this.sunLight.color` is **never reset to `0xfff7e2`**. After the first night, the sun emits blue light forever.
2. **Abrupt Pop Between Day and Night**:
   - `const isDay = sunY > 0;`
   - When `sunY` transitions from `+0.01` to `-0.01`, the sky immediately snaps from sunset orange (`0xe67e22`) directly to dark midnight navy (`0x0c1524`).
3. **Static Hemisphere Light**:
   - `this.hemiLight` remains unchanged at full daylight intensity `0.85` even at midnight, creating excessive greenish upward ambient bounce in the dark.
4. **No Celestial Bodies**:
   - Neither the sun nor the moon are visually rendered as meshes or billboarding discs in the sky; only invisible light source positions exist.

---

## 6. Materials, Shaders & Visual Stylization (Question 5)

### Current Material Strategy
The game is 100% reliant on standard Three.js materials:
- **`MeshStandardMaterial`**:
  - Terrain: `grassMat` (`0x58aa32`, roughness 0.85, flatShading), `cliffMat` (`0x768574`, roughness 0.9, flatShading), `rampMat` (`0x8a7252`, roughness 0.95, flatShading), `boundaryMat` (`0x4d6350`).
  - Wood & Props: `woodMat` (`0x6d4c2d`, roughness 0.8), bridge ropes (`0xbaa482`).
  - Water: `waterMat` (`0x18b5d6`, roughness 0.1, metalness 0.6, transparent 0.75).
  - Characters & NPCs: Torso, jackets, skin, clothes, wizard robes, axe, glider.
  - KayKit Models: Loaded via `GLTFLoader`. Traverse sets `roughness = 0.65`, `metalness = 0.05`. Texture atlas is `forest_texture.png` with `colorSpace = THREE.SRGBColorSpace`.
- **`MeshBasicMaterial`**:
  - Used for eyes, fireflies, particle sparkles, and halo wireframes.
- **`SpriteMaterial`**:
  - Used with dynamic `CanvasTexture` for overhead NPC interaction prompts (e.g. `💬 [E] Cụ Finn`).

### Absence of Custom Shaders & Toon Materials
- Zero instances of `THREE.MeshToonMaterial`, `THREE.ShaderMaterial`, `THREE.RawShaderMaterial`, or `material.onBeforeCompile`.
- Stylization is currently achieved solely through **low-polygon geometry** combined with `flatShading: true` on `MeshStandardMaterial`.

---

## 7. Water Rendering Subsystem (Question 6)

### Implementation in `WorldManager.js` (lines 83–89, 223–245)
- River geometry is generated as 5 flat, overlapping `THREE.PlaneGeometry` rectangles rotated `-Math.PI / 2` and placed at elevation `y = 0.04`:
  ```javascript
  const segments = [
    { x: -28, z: -32, w: 7, d: 24, rot: 0.4 },
    { x: -16, z: -10, w: 8, d: 26, rot: 0.1 },
    { x: 0, z: 8, w: 9, d: 22, rot: -0.5 },
    { x: 18, z: -2, w: 8, d: 24, rot: 0.3 },
    { x: 32, z: 20, w: 10, d: 28, rot: 0.6 },
  ];
  ```
- **Animation**: **Completely static**. There is no time-based displacement, no wave oscillation, no UV scrolling, no normal maps, and no foam contour along the riverbank edges.

---

## 8. Particle Systems & VFX Survey (Question 7)

| Feature | Current Status | Implementation Mechanism | Deficiencies |
|---|---|---|---|
| **Fireflies** | Present | 40 separate `THREE.Mesh` dodecahedrons added directly to `scene` (`Game.js:122`) | Performance inefficient (40 draw calls instead of 1 instanced mesh); only basic sine wave offset |
| **Coin/Gem Sparkles** | Present | 8 `THREE.Mesh` dodecahedrons spawned per pickup with velocity (`OpenWorldCollectibles.js:193`) | Ephemeral burst; individual meshes added/removed |
| **Forest Spirit Wisps** | Present | 3 `THREE.Mesh` dodecahedrons orbiting spirit | Simple group hierarchy |
| **Drifting Clouds** | **Absent** from active game | Present in dead/unused prototype file `SceneManager.js` (10 low-poly puffy cloud groups) | Not imported or instantiated in `Game.js` or `WorldManager.js` |
| **Ambient Leaves / Pollen** | **Absent** | None | World feels static; no gentle canopy movement |
| **Glowing Spores (Mushroom Grove)** | **Absent** | None | No fantasy aura around giant mushrooms |
| **Campfire Flame & Smoke** | **Absent** | None | No active campfire or summit particles |
| **Water Foam / Splash** | **Absent** | None | Water is an inert plastic plane |

---

## 9. Requirements Analysis & Proposed Changes (Question 8)

### To Satisfy R1: Cinematic Stylized Lighting & Tonemapping
1. **Renderer Upgrades (`Renderer.js`)**:
   - Set `this.renderer.toneMapping = THREE.ACESFilmicToneMapping;`
   - Set `this.renderer.toneMappingExposure = 1.1;` (calibrated to retain vibrant greens and warm tones without clipping highlights).
   - Set `this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;`
2. **Day/Night Cycle Overhaul (`Game.js`)**:
   - Replace binary `if (isDay)` logic with a smooth multi-phase keyframe interpolator:
     - **Dawn** (`t = 0.0 - 0.15`): Soft rose-gold light (`0xffd1a4`), sky `0xf9b17a` -> `0x8ac4e8`, fog `0xf5c6aa`.
     - **Noon** (`t = 0.15 - 0.40`): Warm crisp sunlight (`0xfff8e7`), sun intensity `2.2`, ambient `0.45`, hemi `sky: 0x87ceeb, ground: 0x4d7c2a, 0.7`, sky `0x6ec4f8`.
     - **Sunset / Golden Hour** (`t = 0.40 - 0.55`): Fiery amber sun (`0xff7a36`), sun intensity `2.5`, sky gradient `0xe67e22` blending to purple twilight, warm fog `0xd35400`.
     - **Night** (`t = 0.55 - 0.95`): Deep cool moonlight (`0x7fa2d8`), sun intensity `0.35`, ambient `0.2`, hemi `0x1f2c42`, sky `0x0c1524`, fog `0x0c1524`.
   - **Fix Sun Color Bug**: Explicitly interpolate `sunLight.color` across all phases so daylight is always warm and night is moonlight blue.
   - Dynamically modulate `hemiLight.intensity` and `hemiLight.color` to prevent excessive brightness at night.
3. **Warm Point Lights for Night-time Illuminations**:
   - Add warm non-shadow-casting PointLights (`0xff9933`, intensity `1.8 - 2.5`, distance `10 - 15m`) with slight procedural flicker at:
     - Crossroads lanterns / village signposts.
     - Summit campfire.
     - Luminescent mushroom clusters (cyan/magenta soft point lights).
   - Point lights can dynamically increase perceived brightness at night or stay active with subtle daytime contrast.

### To Satisfy R3: Dynamic Environment Life & Atmospheric Polish
1. **Low-Poly Drifting Clouds (`CloudSystem.js` or integrated into `WorldManager.js`)**:
   - Procedural clusters of low-poly dodecahedra / icospheres with stylized flat-shaded standard material.
   - 12–16 clouds floating at altitudes `26 - 38m`.
   - Continuous velocity drift along X/Z axis with toroidal wrapping at world bounds (`± (mapSize/2 + 25)`).
   - Dynamic cloud tinting: white/cream during day, amber/rose at sunset, deep purple-navy at night.
2. **Ambient Particle System (`ParticleSystem.js`)**:
   - Utilize `THREE.InstancedMesh` for 60 FPS performance:
     - **Forest Leaves & Pollen**: ~60 instanced green/gold leaf quads drifting downward with horizontal sine turbulence and resetting when hitting ground.
     - **Luminescent Spores**: ~50 instanced glowing cyan/lime specks floating gently upward around the Luminescent Mushroom Grove.
3. **Windy Peak Campfire VFX**:
   - Campfire log structure with glowing red coal base.
   - Fire particles (instanced rising warm orange/yellow flame embers with scale decay).
   - Smoke particles (instanced rising translucent grey puffs with upward expansion).
   - Flickering PointLight (`0xff7020`) with randomized noise intensity.
4. **Animated Water Surface**:
   - Convert static water plane segments into a cohesive animated mesh or multi-segment river bed with:
     - Vertex wave displacement in a custom material or update loop (`y = baseY + Math.sin(x * freq + time) * amp`).
     - Procedural ripple / foam bands scrolling along the river flow direction.
     - Low-poly riverbed pebbles and wooden dock piers along the riverbank.
5. **Naturalized Mountain Boundaries**:
   - Replace the 4 massive monocolor box walls (`BoxGeometry(96, 12, 6)`) with stepped rock bluffs, rocky pinnacles, and layered cliff formations using cloned KayKit rock models and stepped plateau geometries.

---

## 10. Performance, Compatibility & Risk Assessment (R4)

1. **Draw Call Budget**:
   - Current draw calls: ~200 (75 trees, 45 rocks, 50 bushes, 40 fireflies, terrain, collectibles, characters).
   - Risk: If leaf particles, spores, and clouds are added as hundreds of individual `THREE.Mesh` objects, draw calls will spike to 600+, risking mobile/low-end browser stutter.
   - **Recommendation**: Mandate `THREE.InstancedMesh` for all ambient particles (leaves, spores, smoke, fire embers). One instanced mesh for leaves (1 draw call) and one for spores (1 draw call).
2. **Shadow Map Performance**:
   - Directional light shadow map is `2048x2048`. `PCFSoftShadowMap` incurs a slight GPU sample overhead (~5% shader cost) but eliminates hard banding artifacts. It is well within the 60 FPS budget for WebGL on modern laptops and phones.
   - Point lights MUST have `castShadow = false`. Only the sun/moon directional light should cast shadows.
3. **Bundle Size**:
   - Build output is currently `46 kB` app code + `619 kB` Three.js chunk. Adding procedural particles, animated water, and cloud systems will add `<15 kB` of JavaScript, keeping well under any size threshold.

---

## 11. File & Component Reference Table

| File Path | Role | Key Components / Line Numbers |
|---|---|---|
| `package.json` | Dependencies & Scripts | Lines 12–17 (`three: ^0.186.1`, `vite: ^8.3.0`) |
| `vite.config.js` | Bundler Configuration | Lines 9–17 (three chunk splitting, publicDir) |
| `src/main.js` | Application Entry Point | Lines 8–11 (Game instantiation, UI bindings) |
| `src/game/Game.js` | Main Coordinator & Day/Night | Lines 23–26 (Scene/Camera/Renderer), 82–106 (`_initScene`), 146–155 (`_animate`), 265–309 (`_updateDayNightLighting`) |
| `src/game/Renderer.js` | WebGLRenderer Configuration | Lines 8–22 (toneMapping, shadows, antialias, sRGB) |
| `src/game/WorldManager.js` | World Geometry, Biomes & Water | Lines 21–54 (Plateaus/Ramps/Bridge), 56–90 (Materials), 223–245 (`_buildRiver`), 368–430 (Props & Boundary) |
| `src/game/NPCManager.js` | NPCs & Light Sources | Lines 233–294 (`ForestSpirit` and summit `PointLight`) |
| `src/game/OpenWorldCollectibles.js` | Items & Sparkle VFX | Lines 14–40 (Materials), 193–211 (`_burstParticles`) |
| `src/game/Player3D.js` | Player Rig & Physics | Lines 57–150 (Procedural player mesh & materials) |
| `src/game/ThirdPersonCamera.js` | Orbit Camera Controller | Lines 109–136 (Tracking, smoothing, spherical coords) |
| `src/game/SceneManager.js` | Legacy Endless Runner Prototype | Lines 174–205 (Reference implementation for low-poly clouds) |
