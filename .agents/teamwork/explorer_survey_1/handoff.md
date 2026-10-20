# Handoff Report: Rendering & VFX Architectural Survey

**Agent**: `explorer_survey_1`  
**To**: `parent` (ID: `1388fca6-163d-405b-b63e-b8221c6b652b`)  
**Type**: Hard Handoff (Investigation Complete)  
**Date**: 2026-09-27  

---

## 1. Observation

1. **Three.js & Build System**:
   - `package.json` lines 12–17:
     ```json
     "devDependencies": { "vite": "^8.3.0" },
     "dependencies": {
       "@types/three": "^0.186.0",
       "three": "^0.186.1"
     }
     ```
   - Running `npm run build` executed Vite 8.3.1 with zero errors in 347ms, producing `dist/assets/index-*.js` (46.11 kB) and `dist/assets/three-*.js` (619.73 kB).
2. **Renderer Configuration**:
   - `src/game/Renderer.js` lines 8–22:
     - `this.renderer.shadowMap.enabled = true;`
     - `this.renderer.shadowMap.type = THREE.PCFShadowMap;`
     - `this.renderer.outputColorSpace = THREE.SRGBColorSpace;`
     - `this.renderer.toneMapping = THREE.NoToneMapping;`
     - `this.renderer.toneMappingExposure = 1.0;`
3. **Scene, Camera, and Lighting**:
   - `src/game/Game.js` lines 23–26:
     - `this.scene = new THREE.Scene();`
     - `this.camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 350);`
   - `src/game/Game.js` lines 83–106:
     - `this.scene.background = new THREE.Color(0x6ec4f8);`
     - `this.scene.fog = new THREE.Fog(0x8cd2fc, 70, 160);`
     - `this.sunLight = new THREE.DirectionalLight(0xfff7e2, 2.5);` with shadow map size `2048x2048`, frustum `left: -50, right: 50, top: 50, bottom: -50, near: 0.5, far: 180, bias: -0.0005`.
     - `this.hemiLight = new THREE.HemisphereLight(0x7eccff, 0x488a28, 0.85);`
     - `this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);`
   - `src/game/NPCManager.js` line 285:
     - `const spiritLight = new THREE.PointLight(0x00ffaa, 1.8, 8);` on Forest Spirit.
4. **Day/Night Cycle Bug**:
   - `src/game/Game.js` lines 277–308:
     - Line 296 sets `this.sunLight.color.set(0x90caf9);` (moonlight blue) when `sunY <= 0`.
     - In the `isDay` branch (lines 277–290), `this.sunLight.color` is **never reset** to daylight cream `0xfff7e2`.
     - `this.hemiLight` intensity and colors are never adjusted over time.
     - Sky snaps abruptly between day and night without twilight blending.
5. **Materials**:
   - 100% standard materials (`MeshStandardMaterial` with `flatShading: true` or smooth shading) across `WorldManager.js`, `Player3D.js`, `NPCManager.js`, and `OpenWorldCollectibles.js`.
   - Zero instances of `MeshToonMaterial`, `ShaderMaterial`, or `onBeforeCompile`.
6. **Water Subsystem**:
   - `src/game/WorldManager.js` lines 83–89 and 223–245:
     - `waterMat = new THREE.MeshStandardMaterial({ color: 0x18b5d6, roughness: 0.1, metalness: 0.6, transparent: true, opacity: 0.75 });`
     - Built as 5 flat rectangular `PlaneGeometry` segments at `y = 0.04`.
     - No animation, no displacement, no wave movement, no UV scrolling.
7. **Particles & VFX**:
   - Active particles: 40 individual `Mesh` fireflies (`Game.js:122`) and 8 `Mesh` sparkle bursts (`OpenWorldCollectibles.js:193`).
   - Clouds, falling leaves, mushroom spores, campfire smoke, and flame particles are completely absent. (Only an unused cloud prototype exists in the abandoned `SceneManager.js:174`).

---

## 2. Logic Chain

1. From Observation 1: The engine is Three.js r186.1 bundled via Vite 8.3.1. Standard modern Three.js features (`ACESFilmicToneMapping`, `PCFSoftShadowMap`, `InstancedMesh`, `SRGBColorSpace`) are natively supported and fully available.
2. From Observation 2: Because `toneMapping` is currently `THREE.NoToneMapping`, linear light calculations output directly to the frame buffer. With a sun intensity of 2.5 and ambient 0.5, bright surfaces wash out. Enabling `ACESFilmicToneMapping` with calibrated exposure (~1.1) will compress dynamic range, preserve vibrant colors, and satisfy R1.
3. From Observation 2 and 3: The shadow map is set to `PCFShadowMap` on a 100x100 orthographic frustum. Switching to `PCFSoftShadowMap` will soften shadow edges across the valley with minimal GPU cost, satisfying R1.
4. From Observation 4: The current day/night cycle causes a persistent discoloration bug (permanent blue sun) and abrupt sky snaps. Implementing smooth 4-phase keyframe interpolation (Dawn, Noon, Sunset, Night) that modulates `sunLight.color`, `sunLight.intensity`, `ambientLight.intensity`, `hemiLight.intensity`, `scene.background`, and `scene.fog.color` resolves the bug and creates cinematic transitions.
5. From Observation 3 & 4: Adding warm point lights (`0xff9933`, non-shadow-casting) at village lanterns, campfires, and mushroom caps will bring rich contrast and localized illumination to night scenes.
6. From Observation 6: Water is currently static rectangles. Enhancing the river with animated sinusoidal vertex displacement or scrolling procedural wave textures will satisfy R2.
7. From Observation 7: Ambient life (clouds, leaves, spores, campfire smoke/flames) is missing. Using `THREE.InstancedMesh` for particles guarantees 60 FPS performance by keeping draw calls to 1 per particle type rather than 40+ individual meshes.

---

## 3. Caveats

1. **Custom Shaders vs PBR**: While `MeshToonMaterial` or custom `ShaderMaterial` could be used, the KayKit 3D models were authored for PBR standard materials (`forest_texture.png` atlas). Retaining `MeshStandardMaterial` with `flatShading: true` preserves asset texture compatibility while enabling ACESFilmic tone mapping to do the stylized color grading.
2. **Point Light Limit**: WebGL standard shaders have limits on maximum active lights per material (~8 concurrent point lights without clustered shading). We should avoid adding dozens of point lights; 4–6 strategic warm lights (campfire, 2–3 village lanterns, 1 spirit, 1 mushroom grove) is the sweet spot.
3. **Legacy Files**: `src/game/SceneManager.js`, `Player.js`, `ObstacleManager.js`, and `CollectibleManager.js` are unused remnants of an earlier endless-runner prototype and should not be modified or confused with active systems (`WorldManager.js`, `Player3D.js`, `OpenWorldCollectibles.js`).

---

## 4. Conclusion

The Forest Runner rendering and visual pipeline is clean, functional, and primed for the R1 and R3 overhauls. The primary changes required are:
1. **Renderer (`Renderer.js`)**: Switch to `ACESFilmicToneMapping` (exposure `1.1`) and `PCFSoftShadowMap`.
2. **Lighting & Day/Night (`Game.js`)**: Fix the sun color bug and implement smooth 4-keyframe continuous sky, fog, sun, and hemisphere transitions, plus warm point lights.
3. **Environment Systems (`WorldManager.js` / Subsystems)**:
   - Dynamic drifting low-poly clouds with boundary wrapping.
   - Instanced ambient particle systems (floating leaves/pollen in forest, luminescent spores in grove, campfire fire/smoke on peak).
   - Animated flowing river surface with ripples.
   - Stepped, naturalized rock contours replacing flat box boundary walls.

---

## 5. Verification Method

1. **Build Verification**:
   - Run `npm run build` in PowerShell / terminal.
   - Expected output: Vite bundle generates cleanly with exit code 0 and no bundle size errors.
2. **Inspection of Config**:
   - Check `Renderer.js` for `renderer.toneMapping === THREE.ACESFilmicToneMapping` and `renderer.shadowMap.type === THREE.PCFSoftShadowMap`.
   - Inspect `Game.js` day/night cycle to ensure `this.sunLight.color` is interpolated and never stays frozen on blue.
3. **Visual Verification in Browser**:
   - Run `npm run dev` (or `npx vite --port 3000 --no-open`).
   - Open browser at `http://localhost:3000`.
   - Verify smooth transitions from day (warm sunlight) -> sunset (coral/amber) -> night (deep blue with glowing lanterns, fireflies, and campfire) -> dawn without color corruption.
   - Verify animated water ripples, drifting clouds, and floating particle instances.
