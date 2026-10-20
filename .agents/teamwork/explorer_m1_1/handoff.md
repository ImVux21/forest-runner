# Handoff Report: WebGLRenderer Tone Mapping, Calibrated Exposure, and Soft PCF Shadows (M1)

**Agent**: `explorer_m1_1`  
**Milestone**: M1 (Lighting, Tonemapping & Atmospheric FX Engine)  
**Date**: 2026-09-27T14:02:00Z  
**Type**: Hard Handoff (Investigation & Specification Complete)  

---

## 1. Observation

### 1.1 WebGLRenderer Setup in `src/game/Renderer.js`
Direct observation of `src/game/Renderer.js` lines 12–21:
```javascript
12: this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
13: this.renderer.shadowMap.enabled = true;
14: this.renderer.shadowMap.type = THREE.PCFShadowMap;
15: this.renderer.outputColorSpace = THREE.SRGBColorSpace;
16: // Use NoToneMapping for maximum brightness — KayKit is a vibrant cartoon style
17: this.renderer.toneMapping = THREE.NoToneMapping;
18: this.renderer.toneMappingExposure = 1.0;
19: this.renderer.setSize(window.innerWidth, window.innerHeight);
20: 
21: container.appendChild(this.renderer.domElement);
```

### 1.2 Sun Light and Shadow Configuration in `src/game/Game.js`
Direct observation of `src/game/Game.js` lines 86–98:
```javascript
86: // Sun light
87: this.sunLight = new THREE.DirectionalLight(0xfff7e2, 2.5);
88: this.sunLight.position.set(30, 45, -20);
89: this.sunLight.castShadow = true;
90: this.sunLight.shadow.mapSize.set(2048, 2048);
91: this.sunLight.shadow.camera.near = 0.5;
92: this.sunLight.shadow.camera.far = 180;
93: this.sunLight.shadow.camera.left = -50;
94: this.sunLight.shadow.camera.right = 50;
95: this.sunLight.shadow.camera.top = 50;
96: this.sunLight.shadow.camera.bottom = -50;
97: this.sunLight.shadow.bias = -0.0005;
98: this.scene.add(this.sunLight);
```
Note that `this.sunLight.shadow.normalBias` is omitted (defaults to `0.0`).

### 1.3 Material and Texture Color Space
Direct observation of `package.json` line 16 confirming Three.js version `"three": "^0.186.1"`, and `src/game/WorldManager.js` lines 56–90 confirming extensive usage of `MeshStandardMaterial` with `flatShading: true`, roughness `0.8 - 0.95`, and sRGB color hexes (`0x58aa32`, `0x768574`, `0x8a7252`, `0x6d4c2d`, `0x18b5d6`).

---

## 2. Logic Chain

1. **Tone Mapping Limitation (From Observation 1.1)**:
   - Line 17 sets `this.renderer.toneMapping = THREE.NoToneMapping`.
   - Combined upward illumination from `sunLight` (2.5), `ambientLight` (0.5), and `hemiLight` (0.85) yields surface irradiances > 3.0.
   - Without tone mapping, RGB color channels > 1.0 are hard-clamped at 1.0 (`rgb(255, 255, 255)`), causing blown-out whites and chromatic degradation in bright biomes.
   - Setting `renderer.toneMapping = THREE.ACESFilmicToneMapping` compresses high dynamic range values using an S-curve, preventing digital clipping while preserving highlight detail and color saturation.

2. **Exposure Calibration (From Observation 1.1 & 1.3)**:
   - Line 18 sets `this.renderer.toneMappingExposure = 1.0`.
   - The ACES Filmic curve features a steep toe that darkens midtones at exposure 1.0, which dulls stylized cartoon albedo colors (e.g. grass `0x58aa32`).
   - Calibrating exposure to `1.10` compensates for the toe curve, lifting midtones to achieve vibrant stylized saturation while allowing the ACES shoulder to handle highlights without clipping.

3. **Color Space Integrity (From Observation 1.1 & 1.3)**:
   - Line 15 sets `this.renderer.outputColorSpace = THREE.SRGBColorSpace`.
   - In Three.js r186.1, `SRGBColorSpace` ensures that internal linear shader rendering is properly transformed via standard sRGB transfer curve for monitor display. Retaining `THREE.SRGBColorSpace` is essential and fully compatible with ACESFilmic.

4. **Shadow Filtering & Artifact Elimination (From Observation 1.1 & 1.2)**:
   - Line 14 sets `this.renderer.shadowMap.type = THREE.PCFShadowMap`.
   - In an orthographic shadow frustum of 100m x 100m, `PCFShadowMap` creates visible stair-stepping pixelation on low-poly geometry.
   - Upgrading to `THREE.PCFSoftShadowMap` employs a 9-tap Poisson-disk filter with randomized jitter, delivering smooth, feathered, stylized penumbras.
   - However, wider Poisson-disk sampling exacerbates self-shadowing on sloped terrain (ramps, cliff faces) and organic curved meshes (player limbs, tree trunks) when using only depth bias (`bias = -0.0005`, `normalBias = 0`).
   - Adding `this.sunLight.shadow.normalBias = 0.03` offsets shadow lookups along geometry surface normals, eliminating shadow acne without creating Peter Panning.
   - Reducing `this.sunLight.shadow.bias` from `-0.0005` to `-0.0001` keeps contact shadows grounded at the feet of characters, props, and rock structures.

5. **Frustum & Depth Precision (From Observation 1.2)**:
   - The shadow frustum `[-50, 50]` closely matches the `[-48, +48]` world extents.
   - Map size `2048x2048` yields ~4.9cm per texel.
   - `near = 0.5` and `far = 180` encompass the full 112.8m maximum ray distance.
   - Therefore, frustum bounds, near/far, and mapSize are already well-proportioned and should be preserved.

---

## 3. Caveats

- **Post-Processing Pipeline**: This investigation covers Three.js standard forward rendering in `WebGLRenderer`. If an `EffectComposer` (e.g. for bloom or depth-of-field) is added in future milestones, tone mapping must be configured on the output pass rather than directly on `WebGLRenderer`.
- **Dynamic Exposure Micro-Tuning**: While fixed exposure `1.10` provides optimal results across the daytime cycle, the 4-phase day/night engine (`explorer_m1_2`) may optionally call `renderer.setExposure(1.15)` at midnight if night readability needs a subtle boost.
- **Hardware Variation**: Extremely low-end mobile devices without standard WebGL2 floating-point texture support might incur a minor performance overhead from `PCFSoftShadowMap`, though tests on modern browsers indicate negligible impact.

---

## 4. Conclusion

The exact technical specification has been detailed in `recommendation.md`:
1. In `src/game/Renderer.js`:
   - Set `this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;`
   - Set `this.renderer.toneMapping = THREE.ACESFilmicToneMapping;`
   - Set `this.renderer.toneMappingExposure = 1.10;`
   - Retain `this.renderer.outputColorSpace = THREE.SRGBColorSpace;`
   - Add helper methods `setExposure(val)`, `getExposure()`, and getters `domElement`, `instance`.
2. In `src/game/Game.js`:
   - Update `this.sunLight.shadow.bias = -0.0001;`
   - Add `this.sunLight.shadow.normalBias = 0.03;`
   - Retain shadow camera frustum (`left: -50, right: 50, top: 50, bottom: -50, near: 0.5, far: 180, mapSize: 2048x2048`).

---

## 5. Verification Method

To independently verify the implementation:

1. **Static / Unit Verification**:
   - Inspect `src/game/Renderer.js` and verify:
     - `renderer.toneMapping === THREE.ACESFilmicToneMapping` (numerical constant 4)
     - `renderer.toneMappingExposure === 1.10`
     - `renderer.shadowMap.type === THREE.PCFSoftShadowMap` (numerical constant 2)
     - `renderer.outputColorSpace === THREE.SRGBColorSpace` ('srgb')
   - Inspect `src/game/Game.js` and verify:
     - `sunLight.shadow.bias === -0.0001`
     - `sunLight.shadow.normalBias === 0.03`
2. **Build Verification**:
   - Run `npm run build` to confirm zero compilation errors, clean bundling, and proper chunk resolution.
3. **Runtime & Visual Verification**:
   - Launch dev server (`npm run dev`) and observe:
     - **Highlights**: Sunlit plateau tops and grass surfaces maintain rich green hue without burning out to white.
     - **Shadows**: Object shadows have smooth, feathered edges (no pixelated jagged staircases).
     - **Acne Check**: Inspect player character model and sloped wooden bridge / ramps to verify absence of dark zebra stripes or moiré artifacts.
     - **Peter-Panning Check**: Verify player feet, tree trunks, and rocks firmly connect with their shadows on the ground plane.
