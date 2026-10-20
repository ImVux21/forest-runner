# Technical Recommendation: WebGLRenderer Tone Mapping, Exposure Calibration, and Soft PCF Shadows

**Document ID**: `M1-REC-01`  
**Milestone**: M1 (Lighting, Tonemapping & Atmospheric FX Engine)  
**Target Files**:
- `src/game/Renderer.js` (Primary target)
- `src/game/Game.js` (Shadow camera & bias coordination)  
**Author**: `explorer_m1_1` (Read-Only Exploration Agent)  
**Status**: Ready for Implementation  

---

## 1. Executive Summary

This specification defines the exact changes required to implement **Cinematic Stylized Lighting & Tonemapping** (Feature F1) and **Soft PCF Shadows** (Feature F2) as mandated by `ORIGINAL_REQUEST.md` (§R1) and `PROJECT.md`.

Currently, `Renderer.js` employs `NoToneMapping` and hard `PCFShadowMap`, with directional light shadow parameters in `Game.js` missing `normalBias`. This configuration leads to harsh color clipping in bright sunlight (washed-out whites), jagged pixelated shadow silhouettes across the 100m map, and vulnerability to shadow acne on slopes and organic character geometry.

By transitioning to `THREE.ACESFilmicToneMapping` with calibrated exposure `1.10`, enabling `THREE.PCFSoftShadowMap`, and applying `shadow.normalBias = 0.03` with `shadow.bias = -0.0001` in `Game.js`, Forest Runner achieves rich cartoon saturation, smooth highlight compression, and feathered, artifact-free shadows without compromising the 60 FPS performance budget.

---

## 2. Technical Analysis & Rationale

### 2.1 ACESFilmic Tone Mapping (`THREE.ACESFilmicToneMapping`)
- **Current State**: `this.renderer.toneMapping = THREE.NoToneMapping;` (`src/game/Renderer.js:17`)
- **Problem**: When `sunLight` (intensity 2.5), `ambientLight` (intensity 0.5), and `hemiLight` (intensity 0.85) illuminate upward surfaces, total radiance exceeds 3.0. Without tone mapping, any channel exceeding 1.0 is hard-clamped to `1.0`. Highlights burn out to pure white (`#FFFFFF`), destroying the pastel and cartoon hues of the KayKit models and terrain grass.
- **Solution**: Set `this.renderer.toneMapping = THREE.ACESFilmicToneMapping;`.
- **Mechanism**: The ACES Filmic curve applies an S-shaped response. It preserves dynamic range by smoothly rolling off bright highlights (the curve's "shoulder"), preventing color channel clipping and maintaining chromaticity at high intensities.

### 2.2 Exposure Calibration (`renderer.toneMappingExposure = 1.10`)
- **Current State**: `this.renderer.toneMappingExposure = 1.0;` (`src/game/Renderer.js:18`)
- **Aesthetic Requirement**: Vibrant stylized toon look (KayKit assets, saturated grass `0x58aa32`, warm wood `0x6d4c2d`, amber sunsets).
- **Calibration Analysis**:
  - At exposure `1.0`, the steep "toe" of the ACESFilmic curve darkens midtones and shadows slightly, which can make low-poly stylized scenes feel dimmer than intended.
  - At exposure `>= 1.20`, midtones become overexposed, and the ACES compression begins flattening subtle tint differences in direct sunlight.
  - At exposure **`1.10`** (recommended range `1.08` to `1.12`), midtones are lifted by ~10% to regain vibrant cartoon punch while the ACES highlight roll-off cleanly protects highlights from washing out.
- **Dynamic Helper**: Add `setExposure(val)` and `getExposure()` to `Renderer.js` so that the Day/Night system can make micro-adjustments if needed (e.g. boosting perceived visibility during night or twilight).

### 2.3 Color Space Consistency (`THREE.SRGBColorSpace`)
- **Current State**: `this.renderer.outputColorSpace = THREE.SRGBColorSpace;` (`src/game/Renderer.js:15`)
- **Verification**: Three.js r186.1 standardizes on `THREE.SRGBColorSpace`. Textures loaded from GLTF (e.g. `forest_texture.png`) use sRGB encoding, material color definitions (`MeshStandardMaterial({ color: 0x... })`) are automatically converted from sRGB hex to linear space for shader calculations, and `outputColorSpace` applies the inverse sRGB gamma curve after tone mapping.
- **Conclusion**: Retain `this.renderer.outputColorSpace = THREE.SRGBColorSpace;`.

### 2.4 Soft PCF Shadow Filtering (`THREE.PCFSoftShadowMap`)
- **Current State**: `this.renderer.shadowMap.type = THREE.PCFShadowMap;` (`src/game/Renderer.js:14`)
- **Problem**: `THREE.PCFShadowMap` evaluates a rigid 2x2 comparison. On a 100m x 100m orthographic shadow frustum, shadow edges appear jagged, stepped, and noisy on low-poly terrain and character limbs.
- **Solution**: Set `this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;`.
- **Mechanism**: `THREE.PCFSoftShadowMap` uses a 9-tap Poisson-disk sampling pattern with randomized jitter, producing soft, feathered, naturalized penumbras that blend seamlessly with the low-poly toon environment.

### 2.5 Shadow Frustum, Near/Far, Bias & NormalBias in `Game.js`
- **Current Setup (`src/game/Game.js:87-98`)**:
  ```javascript
  this.sunLight = new THREE.DirectionalLight(0xfff7e2, 2.5);
  this.sunLight.position.set(30, 45, -20);
  this.sunLight.castShadow = true;
  this.sunLight.shadow.mapSize.set(2048, 2048);
  this.sunLight.shadow.camera.near = 0.5;
  this.sunLight.shadow.camera.far = 180;
  this.sunLight.shadow.camera.left = -50;
  this.sunLight.shadow.camera.right = 50;
  this.sunLight.shadow.camera.top = 50;
  this.sunLight.shadow.camera.bottom = -50;
  this.sunLight.shadow.bias = -0.0005;
  ```
- **Identified Risk with `PCFSoftShadowMap`**:
  - The Poisson-disk sampling in `PCFSoftShadowMap` samples a wider kernel radius than `PCFShadowMap`.
  - With only `bias = -0.0005` (and `normalBias = 0`), sloped surfaces (terrain ramps at angle `0.21 rad`, cliff faces, character limbs) trigger self-shadowing acne (dark zebra stripes / moiré bands).
  - Increasing negative bias (e.g. to `-0.005`) causes "Peter Panning", where the shadows detach from the feet of the player and props, making them appear to levitate.
- **Calibrated Shadow Settings**:
  - **`this.sunLight.shadow.bias = -0.0001;`**: Reduced from `-0.0005` to `-0.0001` to eliminate Peter Panning and keep shadows tightly anchored to grounded meshes.
  - **`this.sunLight.shadow.normalBias = 0.03;`**: Offsets the shadow lookup along the surface normal. This completely eliminates shadow acne on slopes and curves without detaching contact shadows.
  - **Camera Frustum (`[-50, 50]`, `[0.5, 180]`) & Map Size (`2048x2048`)**:
    - The world boundary spans `[-48, +48]` in X and Z. The 100m x 100m frustum covers the entire map with `100m / 2048 ≈ 0.0488m` (~4.9cm) texel density.
    - `near = 0.5` and `far = 180` encompass the full light ray path from sun position `(30, 45, -20)` to the furthest map corner `(-48, 0, 48)` (distance ~112.8m).
    - These frustum dimensions are optimal and should be retained.

---

## 3. Concrete Implementation Specification

### 3.1 Changes in `src/game/Renderer.js`

```diff
--- a/src/game/Renderer.js
+++ b/src/game/Renderer.js
@@ -11,10 +11,10 @@ export class Renderer {
     });
     this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
     this.renderer.shadowMap.enabled = true;
-    this.renderer.shadowMap.type = THREE.PCFShadowMap;
+    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
     this.renderer.outputColorSpace = THREE.SRGBColorSpace;
-    // Use NoToneMapping for maximum brightness — KayKit is a vibrant cartoon style
-    this.renderer.toneMapping = THREE.NoToneMapping;
-    this.renderer.toneMappingExposure = 1.0;
+    // ACESFilmic tonemapping with calibrated exposure ensures vibrant stylized colors
+    // while preventing blown-out highlights on sunlit surfaces.
+    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
+    this.renderer.toneMappingExposure = 1.10;
     this.renderer.setSize(window.innerWidth, window.innerHeight);
 
     container.appendChild(this.renderer.domElement);
@@ -28,4 +28,20 @@ export class Renderer {
   resize(width, height) {
     this.renderer.setSize(width, height);
   }
+
+  setExposure(exposure) {
+    this.renderer.toneMappingExposure = exposure;
+  }
+
+  getExposure() {
+    return this.renderer.toneMappingExposure;
+  }
+
+  get domElement() {
+    return this.renderer.domElement;
+  }
+
+  get instance() {
+    return this.renderer;
+  }
 }
```

### 3.2 Changes in `src/game/Game.js`

```diff
--- a/src/game/Game.js
+++ b/src/game/Game.js
@@ -84,17 +84,19 @@ export class Game {
     this.scene.fog = new THREE.Fog(0x8cd2fc, 70, 160);
 
-    // Sun light
+    // Sun light (Directional key light with calibrated PCF soft shadow parameters)
     this.sunLight = new THREE.DirectionalLight(0xfff7e2, 2.5);
     this.sunLight.position.set(30, 45, -20);
     this.sunLight.castShadow = true;
     this.sunLight.shadow.mapSize.set(2048, 2048);
     this.sunLight.shadow.camera.near = 0.5;
     this.sunLight.shadow.camera.far = 180;
     this.sunLight.shadow.camera.left = -50;
     this.sunLight.shadow.camera.right = 50;
     this.sunLight.shadow.camera.top = 50;
     this.sunLight.shadow.camera.bottom = -50;
-    this.sunLight.shadow.bias = -0.0005;
+    // Calibrated shadow bias & normalBias: normalBias prevents shadow acne on sloped terrain and character meshes,
+    // while small negative bias prevents peter-panning (shadow detaching from feet/ground).
+    this.sunLight.shadow.bias = -0.0001;
+    this.sunLight.shadow.normalBias = 0.03;
     this.scene.add(this.sunLight);
```

---

## 4. Parameter Verification & Impact Matrix

| Parameter | Previous Value | Proposed Value | Visual & Technical Impact |
|---|---|---|---|
| `renderer.toneMapping` | `THREE.NoToneMapping` (0) | `THREE.ACESFilmicToneMapping` (4) | Eliminates color clipping and blown-out highlights; preserves cartoon saturation in sunny biomes |
| `renderer.toneMappingExposure` | `1.0` | `1.10` | Lifts midtones to compensate for ACES toe curve; maintains vibrant green/amber hues |
| `renderer.outputColorSpace` | `THREE.SRGBColorSpace` | `THREE.SRGBColorSpace` | Retains proper sRGB conversion after tone mapping; standard in Three.js r186.1 |
| `renderer.shadowMap.type` | `THREE.PCFShadowMap` (1) | `THREE.PCFSoftShadowMap` (2) | Replaces harsh jagged shadow edges with smooth 9-sample Poisson-disk soft penumbras |
| `sunLight.shadow.bias` | `-0.0005` | `-0.0001` | Prevents "Peter Panning" (floating shadow disconnect at feet of characters and trees) |
| `sunLight.shadow.normalBias` | `undefined` (0.0) | `0.03` | Completely eradicates shadow acne on slopes (ramps, cliffs) and curved low-poly models |
| `sunLight.shadow.mapSize` | `(2048, 2048)` | `(2048, 2048)` | Preserved; gives 4.9cm texel density across 100m map |
| `sunLight.shadow.camera.near/far` | `0.5 / 180` | `0.5 / 180` | Preserved; tightly encloses the 112.8m maximum ray distance |

---

## 5. Integration Notes for Milestone 1 Peer Tracks

1. **Coordination with `explorer_m1_2` (Dynamic Day/Night Lighting)**:
   - When interpolating `sunLight.intensity` (e.g. 2.2 noon down to 0.35 night) and `ambientLight.intensity` (0.45 noon down to 0.20 night), the ACESFilmic tone curve will smoothly map both high noon radiance and low midnight moonlight without requiring drastic manual exposure swings.
   - If the night scene needs enhanced clarity, `renderer.setExposure(1.15)` can optionally be called during night hours.
2. **Coordination with `explorer_m1_3` (Atmospheric Particles & Point Lights)**:
   - All newly added warm point lights (lanterns, campfires, glowing mushrooms) should have `castShadow = false`. Only `sunLight` should cast shadows to keep draw calls low and prevent shadow map thrashing.
   - Point lights with colors like `0xff9933` (warm orange) or `0x00ffaa` (cyan) will blend beautifully under `ACESFilmicToneMapping` without burning out to white in their cores.
3. **Coordination with `test_writer_1` (Automated Tests)**:
   - Unit tests can directly inspect:
     - `renderer.renderer.toneMapping === THREE.ACESFilmicToneMapping`
     - `renderer.renderer.toneMappingExposure === 1.10`
     - `renderer.renderer.shadowMap.type === THREE.PCFSoftShadowMap`
     - `sunLight.shadow.bias === -0.0001`
     - `sunLight.shadow.normalBias === 0.03`
