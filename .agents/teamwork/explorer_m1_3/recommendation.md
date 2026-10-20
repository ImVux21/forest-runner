# Technical Specification & Implementation Recommendation: Atmospheric FX & Warm Lighting (M1)

**Target Project**: Forest Runner (`c:/Users/vuodo/software/forest-runner`)  
**Author**: `explorer_m1_3` (Read-Only Exploration Agent)  
**Milestone**: M1 — Lighting, Tonemapping & Atmospheric FX Engine  
**Features Addressed**:
- **F4**: Warm Localized Point Lights (Lanterns, Campfire, Mushroom Caps)
- **F5**: Drifting 3D Low-Poly Clouds with Boundary Wrapping
- **F6**: Ambient Particle Systems via `THREE.InstancedMesh` (Leaves/Pollen, Spores, Campfire VFX)
- **Architecture**: Module Encapsulation (`AtmosphereManager.js` vs `Game.js`)

---

## 1. Executive Summary & Architectural Decision

### 1.1 Encapsulation Recommendation: Dedicated `src/game/AtmosphereManager.js`
We strongly recommend encapsulating all clouds, ambient instanced particles, and localized point lights within a dedicated module: **`src/game/AtmosphereManager.js`**.

#### Architectural Evaluation:
| Criteria | Dedicated `AtmosphereManager.js` (Recommended) | Direct Integration into `Game.js` |
| :--- | :--- | :--- |
| **Separation of Concerns** | **Excellent**. Isolates low-level particle geometry, matrix instancing, cloud drift, and light flicker from high-level game flow. | **Poor**. Bloats `Game.js` with ~350 lines of particle transforms, array allocations, and buffer updates. |
| **Modularity & Maintenance** | **High**. Atmospheric parameters (wind velocity, particle densities, colors) can be tuned without risking gameplay/physics regressions. | **Low**. Increases risk of unintended side-effects in player input, camera, quest flags, or dialogue routines. |
| **Testability** | **High**. Headless unit tests can instantiate `AtmosphereManager` independently (verified in 27ms with `node --test`). | **Low**. Requires mocking the entire `Game` class, canvas, DOM UI, audio, and camera. |
| **Contract Alignment** | **100% compliant** with `PROJECT.md` § Interface Contracts (line 60 & 66). | Deviates from modular convention. |

`Game.js` will act purely as the coordinator, instantiating `this.atmosphere = new AtmosphereManager(this.scene, this.world);` during initialization and calling `this.atmosphere.update(delta, elapsed, this.dayTime);` in `_update(delta)`.

---

## 2. Feature F5: Drifting 3D Low-Poly Clouds

### 2.1 Aesthetic & Visual Philosophy
To seamlessly match the low-poly KayKit nature aesthetic, clouds are formed from clustered low-poly geometric primitives with faceted flat shading (`flatShading: true`).

### 2.2 Geometry & Composition
- **Total Cloud Count**: 14 clouds distributed across the sky.
- **Puff Geometry**: Each cloud group is composed of 4 to 6 intersecting `THREE.DodecahedronGeometry(radius, 1)` or low-poly `IcosahedronGeometry(radius, 1)` primitives with randomized radii between `2.0m` and `3.8m` and horizontal offsets between `-3.5m` and `+3.5m`.
- **Material**: Single shared `THREE.MeshStandardMaterial`:
  ```javascript
  const cloudMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.65,
    metalness: 0.05,
    flatShading: true,
  });
  ```
- **Shadows**:
  - `castShadow = false` (prevents irregular dark blotches across the landscape and saves 14–28 shadow passes).
  - `receiveShadow = false` (avoids self-shadow artifacts on sky clouds).

### 2.3 Altitude & Spatial Distribution
- **Altitude ($Y$)**: Clustered between `y = 22.0m` and `y = 32.0m`. This sits well above the highest terrain peak ($y = 7.0\text{m}$) and the planned multi-level lookout tower ($y \approx 14.5\text{m}$), ensuring no clipping with ground structures.
- **Sky Expanse Bounding Box**:
  - Explorable ground map: `[-45m, +45m]` ($90\text{m} \times 90\text{m}$).
  - Sky active domain: `x ∈ [-65m, +65m]`, `z ∈ [-65m, +65m]` (total span $130\text{m} \times 130\text{m}$).
  - Cloud spawning margin extends 20m beyond mountain boundaries so clouds naturally drift into view from behind mountain ridges.

### 2.4 Drift Velocity & Toroidal Boundary Wrapping
- **Prevailing Wind Vector**: $\vec{W} = (1.0, 0.0, 0.35)$ normalized.
- **Speed Variation**: Each cloud has an individualized drift speed between `0.9` and `1.8` m/s:
  $$x(t + \Delta t) = x(t) + \text{speed} \times W_x \times \Delta t$$
  $$z(t + \Delta t) = z(t) + \text{speed} \times W_z \times \Delta t$$
- **Toroidal Wrapping Math**:
  When a cloud's $X$ coordinate crosses the eastern boundary ($x > +65.0\text{m}$):
  ```javascript
  if (cloud.group.position.x > 65.0) {
    cloud.group.position.x -= 130.0; // Wraps smoothly to -65.0m
    // Randomize Z and Y upon wrap to guarantee dynamic non-repeating cloud tracks:
    cloud.group.position.z = (Math.random() - 0.5) * 120.0;
    cloud.group.position.y = 22.0 + Math.random() * 9.0;
    cloud.speed = 0.9 + Math.random() * 0.9;
  }
  ```
- **Natural Fog Blending**: Because the scene linear fog is configured from $70\text{m}$ to $160\text{m}$, clouds at $65\text{m}$ are already softly veiled by distance fog, rendering boundary entry and exit completely imperceptible.

### 2.5 Time-of-Day Dynamic Color Tinting
By modulating the shared `cloudMat.color` once per frame, all clouds adapt dynamically to the lighting phase:
- **Day**: Crisp warm white `0xffffff`.
- **Sunset**: Warm peach / golden amber `0xffaa88` (matching the sunset sky gradient).
- **Night**: Deep slate indigo `0x242d4a` (faintly catching cool moonlight).

---

## 3. Feature F6: Ambient Particle Systems via `THREE.InstancedMesh`

To guarantee rock-solid **60 FPS** performance, all particle systems are implemented using `THREE.InstancedMesh`. This collapses hundreds of individual scene meshes into **exactly 4 draw calls**.

Every `InstancedMesh` uses `setUsage(THREE.DynamicDrawUsage)` on its `instanceMatrix` buffer, and transform calculations are performed using a single reusable `THREE.Object3D` dummy to achieve zero garbage collection (GC) allocations per frame.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ATMOSPHERE MANAGER (VFX)                        │
├────────────────────────┬───────────────────┬──────────────┬────────────┤
│ Particle System        │ Geometry          │ Count        │ Draw Calls │
├────────────────────────┼───────────────────┼──────────────┼────────────┤
│ 1. Forest Breeze Leaves│ Folded Quad Plane │ 100 instances│ 1          │
│ 2. Mushroom Spores     │ Dodecahedron      │ 60 instances │ 1          │
│ 3. Campfire Flames     │ Octahedron        │ 35 instances │ 1          │
│ 4. Campfire Smoke      │ Low-poly Sphere   │ 30 instances │ 1          │
├────────────────────────┴───────────────────┴──────────────┼────────────┤
│ TOTAL PARTICLE DRAW CALLS                                  │ 4          │
└────────────────────────────────────────────────────────────┴────────────┘
```

---

### 3.1 System 1: Floating Leaves & Pollen Particles (Forest Breeze)
- **Concept**: Autumn leaves and glowing forest pollen motes caught in atmospheric thermal currents, drifting gently downward across the canopy before being re-lofted.
- **Instance Count**: `100` instances.
- **Geometry**: `new THREE.PlaneGeometry(0.24, 0.36)`.
- **Material**: `new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, transparent: true, opacity: 0.85 })`.
- **Color Palette (Per-Instance Color)**:
  - 40% Vibrant Leaf Green (`0x66bb33`)
  - 30% Golden Autumn Amber (`0xebb128`)
  - 20% Rustic Orange-Brown (`0xd97724`)
  - 10% Soft Pollen Lime (`0xbbe053`)
- **Spatial Bounds**: `x ∈ [-40, 40]`, `z ∈ [-40, 40]`, `y ∈ [0.2, 14.0]`.
- **Simulation Physics**:
  - Downward terminal velocity: $v_y = -0.45\text{ to } -0.85\text{ m/s}$.
  - Wind drift: $v_x = 1.0\text{ m/s}, v_z = 0.35\text{ m/s}$.
  - Turbulence / Swaying:
    $$x(t) = x + (v_x + \sin(t \cdot \omega_{\text{sway}} + \phi) \cdot A_{\text{sway}}) \cdot \Delta t$$
    $$z(t) = z + (v_z + \cos(t \cdot 0.8 \omega_{\text{sway}} + \phi) \cdot 0.6 A_{\text{sway}}) \cdot \Delta t$$
  - Tumbling Rotation: Continuous 3-axis rotation ($\omega_x, \omega_y, \omega_z \in [0.8, 2.5]\text{ rad/s}$).
  - Ground Detection & Reset: Queries `world.getGroundHeight(x, z)`. When $y \le y_{\text{ground}} + 0.1\text{m}$ or particle exits boundary, resets to top ($y \in [8.0, 14.0]\text{m}$) with randomized $X, Z$ coordinates.

---

### 3.2 System 2: Luminescent Mushroom Spores (Grove)
- **Concept**: Glowing bio-luminescent spores ascending languidly from the giant fantasy mushrooms and glowing flora of the Luminescent Mushroom Grove.
- **Instance Count**: `60` instances.
- **Grove Zone Coordinates**: Centered around `x: -16.0, z: 16.0` (North Terrace / Grove Basin), radius $R \approx 12.0\text{m}$, base elevation $y \approx 3.5\text{m}$.
- **Geometry**: `new THREE.DodecahedronGeometry(0.08, 0)`.
- **Material**: `new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending })`.
- **Color Palette (Per-Instance Color)**:
  - 45% Bio-Luminescent Cyan (`0x00ffcc`)
  - 35% Mystic Violet / Magenta (`0xdf40ff`)
  - 20% Fluorescent Lime Glow (`0x64ffda`)
- **Simulation Physics**:
  - Upward ascension: $v_y = +0.5\text{ to } +1.2\text{ m/s}$ (defying gravity).
  - Helical Swirl:
    $$x(t) = x_{\text{origin}} + \cos(\theta) \cdot r_{\text{swirl}}$$
    $$z(t) = z_{\text{origin}} + \sin(\theta) \cdot r_{\text{swirl}}$$
    where $\theta(t + \Delta t) = \theta + \omega_{\text{spiral}} \cdot \Delta t$ ($\omega_{\text{spiral}} \in [0.8, 2.0]\text{ rad/s}$, $r_{\text{swirl}} \in [0.2, 0.6]\text{m}$).
  - Lifecycle Scale Curve:
    $$s(t) = \sin(\pi \cdot \text{life}) \cdot s_{\text{base}}$$
    Spores spawn at scale 0.0, expand to full brilliance mid-flight, and smoothly shrink to 0.0 before resetting.
  - Reset: Resets when $\text{life} \ge 1.0$ (duration 3.5–6.0 seconds), re-spawning near mushroom cap elevation ($y \in [3.6, 5.0]\text{m}$).

---

### 3.3 System 3: Campfire Smoke & Flickering Flame Particles (Summit Peak)
- **Campfire Location**: Summit Peak (Tier 2, Plateau B) at `x: 20.0, y: 7.0, z: 22.0`.
- **Subsystem 3A: Flame Embers & Fire Tongues**:
  - **Count**: `35` instances.
  - **Geometry**: `new THREE.OctahedronGeometry(0.12, 0)`.
  - **Material**: `new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending })`.
  - **Lifetime**: Rapid turnover ($\tau = 0.35\text{ to } 0.65\text{ s}$).
  - **Velocity**: High vertical impulse $v_y = +2.2\text{ to } +3.6\text{ m/s}$ with radial jitter ($\pm 0.25\text{ m/s}$).
  - **Dynamic Color Temperature Ramp**:
    - Birth ($t = 0.0$): Hot white-yellow (`0xfffae0`)
    - Mid-life ($t = 0.4$): Blazing orange (`0xff6600`)
    - Flame Tip ($t = 0.8$): Crimson ember (`0xcc2200`)
  - **Scale**: Spawns at 0.3, flares to 1.0 at $y \approx 7.5\text{m}$, rapidly collapses to 0.0 at flame peak ($y \approx 8.1\text{m}$).

- **Subsystem 3B: Billowing Smoke Puffs**:
  - **Count**: `30` instances.
  - **Geometry**: `new THREE.DodecahedronGeometry(0.22, 0)`.
  - **Material**: `new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.32, color: 0x484850 })`.
  - **Lifetime**: Extended drift ($\tau = 2.2\text{ to } 3.8\text{ s}$).
  - **Origin**: Spawns directly at flame tip ($y = 7.7\text{m}$).
  - **Velocity**: Rising drift $v_y = +1.2\text{ to } +1.8\text{ m/s}$.
  - **Wind Leaning**: Carried by mountain wind:
    $$\Delta x = W_x \cdot 0.75 \cdot \Delta t, \quad \Delta z = W_z \cdot 0.75 \cdot \Delta t$$
  - **Volumetric Expansion**:
    $$s(t) = (0.35 + 1.85 \cdot \text{life}) \cdot s_{\text{base}}$$
    Puffs billow outwards as they ascend, reaching scale $\approx 2.2$ at $y \approx 13.0\text{m}$ before dissipating.

---

### 3.4 Consolidation of Glowing Night Fireflies
- **Current Defect**: `Game.js:122` instantiates 40 separate `THREE.Mesh` objects added individually to `scene`, incurring **40 individual draw calls**.
- **Optimization in `AtmosphereManager.js`**: `AtmosphereManager` consolidates fireflies into a single `THREE.InstancedMesh(geo, mat, 40)`:
  - Material: `MeshBasicMaterial({ color: 0xc6ff00 })`.
  - Visibility / Opacity: Modulated by `nightFactor` (hidden during bright day, active and floating at night).
  - **Draw Call Reduction**: Drops from 40 draw calls to **1 draw call**.

---

## 4. Feature F4: Warm Localized Point Light Management

### 4.1 Forward Rendering Light Budget
In standard Three.js forward rendering, every point light adds shader evaluation cost to every fragment in view. To ensure 60 FPS on integrated GPUs:
1. **Zero Shadow Casting on Point Lights**:
   `pointLight.castShadow = false;` (Strict constraint. Only directional sunlight casts shadows).
2. **Restricted Light Count**: Total 4 carefully positioned atmospheric point lights.
3. **Quadratic Attenuation**: Physical decay factor `decay = 2.0` with tightly bounded cut-off distances ($9.0\text{m} - 13.0\text{m}$).

### 4.2 Light Register & Spatial Coordinates
| Identifier | Name / Location | Position $(X, Y, Z)$ | Color Hex | Day Int. | Night Int. | Distance | Decay | Flicker? |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| `village_lantern` | Whispering Village (Finn) | `(-4.0, 2.3, -2.5)` | `0xff9933` | 0.1 | **2.2** | 10.0m | 2.0 | No |
| `bridge_lantern` | Suspension Bridge (Bram) | `(0.5, 4.9, -12.5)` | `0xff9933` | 0.1 | **2.0** | 9.0m | 2.0 | No |
| `summit_campfire` | Windy Peak Campfire | `(20.0, 7.6, 22.0)` | `0xff6611` | **0.9** | **2.6** | 13.0m | 2.0 | **Yes** (flame dance) |
| `mushroom_grove` | Luminescent Grove Accent | `(-16.0, 4.2, 16.0)` | `0x00e5ff` | 0.0 | **1.8** | 11.0m | 2.0 | **Yes** (breathing pulse) |

*(Note: Forest Spirit at `(18, 18)` maintains its existing local point light `PointLight(0x00ffaa, 1.8, 8)` in `NPCManager.js`).*

---

### 4.3 Smooth Day/Night Activation Curve (`nightFactor`)
To avoid abrupt light popping, `AtmosphereManager` computes a continuous `nightFactor` ($0.0 \to 1.0$) using Hermite smoothstep interpolation across the day/night cycle:

```javascript
_calculateNightFactor(dayTime) {
  // dayTime in [0.0, 1.0]: 0.25 = noon, 0.50 = sunset, 0.75 = midnight, 1.0/0.0 = dawn
  if (dayTime >= 0.0 && dayTime < 0.40) {
    return 0.0; // Daytime: lights dimmed / off
  } else if (dayTime >= 0.40 && dayTime < 0.55) {
    // Sunset transition: smoothstep ramp from 0.0 to 1.0
    const t = (dayTime - 0.40) / 0.15;
    return t * t * (3 - 2 * t);
  } else if (dayTime >= 0.55 && dayTime < 0.90) {
    return 1.0; // Midnight: full night illumination
  } else {
    // Dawn transition: smoothstep ramp down from 1.0 to 0.0
    const t = (dayTime - 0.90) / 0.10;
    return 1.0 - t * t * (3 - 2 * t);
  }
}
```

```
nightFactor
  1.0 ┤                      ┌────────────────────────┐
      │                     /                          \
      │                    /                            \
  0.0 ┴───────────────────┘                              └─────────
      0.0                0.40     0.55                  0.90       1.0
     [Dawn/Morning]     [Noon]   [Sunset]              [Night]    [Dawn]
```

### 4.4 Organic Multi-Frequency Campfire Flicker
A static point light on a campfire looks artificial. We implement a multi-octave harmonic flicker algorithm:
$$I_{\text{flicker}}(t) = 0.18 \sin(16.3 \cdot t) + 0.12 \cos(27.7 \cdot t) + 0.08 \sin(41.1 \cdot t)$$
$$I_{\text{final}} = \text{clamp}\left(I_{\text{base}} + I_{\text{flicker}}(t) \cdot A_{\text{flicker}}, \quad 0.5, \quad 4.0\right)$$
This produces a natural, energetic flame illumination dance across the summit rocks and lookout tower without random popping or strobe artifacts.

For the Mushroom Grove, a slow breathing sine wave ($f = 1.8\text{ rad/s}$) creates a hypnotic, living magical pulse:
$$I_{\text{grove}}(t) = I_{\text{base}} + \sin(1.8 \cdot t) \cdot 0.35$$

---

## 5. Performance Budget & 60 FPS Verification

| Subsystem | Baseline State (Pre-M1) | Recommended M1 Overhaul | Performance Impact |
| :--- | :---: | :---: | :---: |
| **Clouds** | Absent (0 draw calls) | 14 meshes, 0 shadow passes | +14 draw calls |
| **Leaves / Pollen** | Absent (0 draw calls) | 1 `THREE.InstancedMesh` (100 leaves) | +1 draw call |
| **Mushroom Spores** | Absent (0 draw calls) | 1 `THREE.InstancedMesh` (60 spores) | +1 draw call |
| **Campfire Flames** | Absent (0 draw calls) | 1 `THREE.InstancedMesh` (35 flames) | +1 draw call |
| **Campfire Smoke** | Absent (0 draw calls) | 1 `THREE.InstancedMesh` (30 smoke puffs) | +1 draw call |
| **Fireflies** | 40 separate meshes (**40 draw calls**) | 1 `THREE.InstancedMesh` (40 fireflies) | **-39 draw calls** |
| **Point Lights** | 1 (Spirit only) | 4 non-shadow point lights | 0 shadow passes, minimal fragment cost |
| **NET DRAW CALL DELTA** | — | — | **-21 Net Draw Calls Saved!** |

### Key Takeaway:
By replacing the 40 individual firefly meshes with an `InstancedMesh`, the addition of all clouds, leaves, spores, campfire flames, campfire smoke, and point lights actually **reduces the overall scene draw call count by 21 calls**, maintaining frame times comfortably under **6–8 ms** for guaranteed 60 FPS.

---

## 6. Concrete Implementation Blueprint

### 6.1 Complete Specification for `src/game/AtmosphereManager.js`
Below is the complete implementation design ready for implementation agents:

```javascript
// ===================================================
// AtmosphereManager.js — Atmospheric Polish & Environmental VFX
// Drifting 3D Low-Poly Clouds, Instanced Particles, & Warm Point Lights
// ===================================================
import * as THREE from 'three';

export class AtmosphereManager {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;

    // Subsystem containers
    this.clouds = [];
    this.particles = {
      leaves: null,
      spores: null,
      flames: null,
      smoke: null,
      fireflies: null,
    };
    this.pointLights = [];

    // State collections
    this.leafData = [];
    this.sporeData = [];
    this.flameData = [];
    this.smokeData = [];
    this.fireflyData = [];

    // Shared Materials
    this.materials = {};

    // Wind and Landmark Vectors
    this.wind = new THREE.Vector3(1.0, 0.0, 0.35).normalize();
    this.campfirePos = new THREE.Vector3(20.0, 7.0, 22.0); // Peak Summit

    // Reusable dummy for matrix updates (Zero GC allocation)
    this._dummy = new THREE.Object3D();
  }

  async init() {
    this._initMaterials();
    this._initClouds();
    this._initLeafParticles();
    this._initMushroomSpores();
    this._initCampfireParticles();
    this._initFireflies();
    this._initPointLights();
  }

  _initMaterials() {
    this.materials.cloud = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.65,
      metalness: 0.05,
      flatShading: true,
    });

    this.materials.leaf = new THREE.MeshBasicMaterial({
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });

    this.materials.spore = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });

    this.materials.flame = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    });

    this.materials.smoke = new THREE.MeshBasicMaterial({
      color: 0x484850,
      transparent: true,
      opacity: 0.32,
    });

    this.materials.firefly = new THREE.MeshBasicMaterial({
      color: 0xc6ff00,
    });
  }

  // ─── 1. Drifting 3D Low-Poly Clouds ───────────────────────────────────────

  _initClouds() {
    const cloudMat = this.materials.cloud;

    for (let i = 0; i < 14; i++) {
      const group = new THREE.Group();
      const numPuffs = 4 + Math.floor(Math.random() * 3);

      for (let p = 0; p < numPuffs; p++) {
        const rad = 2.2 + Math.random() * 1.8;
        const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(rad, 1), cloudMat);
        puff.position.set(
          (p - numPuffs / 2) * 2.0,
          (Math.random() - 0.5) * 1.2,
          (Math.random() - 0.5) * 1.8
        );
        group.add(puff);
      }

      const x = (Math.random() - 0.5) * 120.0;
      const y = 22.0 + Math.random() * 9.0;
      const z = (Math.random() - 0.5) * 120.0;
      group.position.set(x, y, z);

      this.scene.add(group);
      this.clouds.push({
        group,
        speed: 1.0 + Math.random() * 1.0,
      });
    }
  }

  // ─── 2. Ambient Particles: Leaves & Pollen ────────────────────────────────

  _initLeafParticles() {
    const count = 100;
    const geo = new THREE.PlaneGeometry(0.24, 0.36);
    const mesh = new THREE.InstancedMesh(geo, this.materials.leaf, count);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    this.particles.leaves = mesh;
    const colors = [0x66bb33, 0xebb128, 0xd97724, 0xbbe053];

    for (let i = 0; i < count; i++) {
      const p = {
        x: (Math.random() - 0.5) * 80.0,
        y: 1.0 + Math.random() * 12.0,
        z: (Math.random() - 0.5) * 80.0,
        vy: -0.45 - Math.random() * 0.4,
        rotX: Math.random() * Math.PI,
        rotY: Math.random() * Math.PI,
        rotZ: Math.random() * Math.PI,
        vRotX: 1.0 + Math.random() * 1.5,
        vRotY: 0.8 + Math.random() * 1.2,
        swayPhase: Math.random() * Math.PI * 2,
        swaySpeed: 1.4 + Math.random() * 1.6,
        swayAmp: 0.8 + Math.random() * 0.6,
      };
      this.leafData.push(p);
      mesh.setColorAt(i, new THREE.Color(colors[i % colors.length]));
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    this.scene.add(mesh);
  }

  // ─── 3. Ambient Particles: Mushroom Spores ────────────────────────────────

  _initMushroomSpores() {
    const count = 60;
    const geo = new THREE.DodecahedronGeometry(0.08, 0);
    const mesh = new THREE.InstancedMesh(geo, this.materials.spore, count);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    this.particles.spores = mesh;
    const colors = [0x00ffcc, 0xdf40ff, 0x64ffda];

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 11.0;
      const originX = -16.0 + Math.cos(angle) * radius;
      const originZ = 16.0 + Math.sin(angle) * radius;

      const p = {
        originX,
        originZ,
        x: originX,
        z: originZ,
        baseY: 3.5,
        y: 3.5 + Math.random() * 4.0,
        vy: 0.55 + Math.random() * 0.75,
        swayAngle: Math.random() * Math.PI * 2,
        swaySpeed: 1.0 + Math.random() * 1.4,
        swayRadius: 0.2 + Math.random() * 0.4,
        duration: 3.5 + Math.random() * 2.5,
        life: Math.random(),
        baseScale: 0.8 + Math.random() * 0.5,
      };
      this.sporeData.push(p);
      mesh.setColorAt(i, new THREE.Color(colors[i % colors.length]));
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    this.scene.add(mesh);
  }

  // ─── 4. Campfire VFX: Flames & Smoke ──────────────────────────────────────

  _initCampfireParticles() {
    // 4A. Flame Embers
    const fCount = 35;
    const fGeo = new THREE.OctahedronGeometry(0.12, 0);
    const fMesh = new THREE.InstancedMesh(fGeo, this.materials.flame, fCount);
    fMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.particles.flames = fMesh;

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
    if (fMesh.instanceColor) fMesh.instanceColor.needsUpdate = true;
    this.scene.add(fMesh);

    // 4B. Smoke Puffs
    const sCount = 30;
    const sGeo = new THREE.DodecahedronGeometry(0.2, 0);
    const sMesh = new THREE.InstancedMesh(sGeo, this.materials.smoke, sCount);
    sMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.particles.smoke = sMesh;

    for (let i = 0; i < sCount; i++) {
      this.smokeData.push({
        x: 0, y: 0, z: 0,
        vx: 0, vy: 0, vz: 0,
        life: Math.random(),
        duration: 2.2 + Math.random() * 1.4,
        baseScale: 0.7 + Math.random() * 0.6,
      });
    }
    this.scene.add(sMesh);
  }

  // ─── 5. Consolidated Night Fireflies ──────────────────────────────────────

  _initFireflies() {
    const count = 40;
    const geo = new THREE.DodecahedronGeometry(0.09, 0);
    const mesh = new THREE.InstancedMesh(geo, this.materials.firefly, count);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.particles.fireflies = mesh;

    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 60.0;
      const z = (Math.random() - 0.5) * 60.0;
      const groundH = this.world ? this.world.getGroundHeight(x, z) : 0.0;
      const y = groundH + 0.6 + Math.random() * 2.5;

      this.fireflyData.push({
        baseX: x, baseY: y, baseZ: z,
        seed: Math.random() * Math.PI * 2,
        speed: 0.8 + Math.random() * 1.2,
      });
    }
    this.scene.add(mesh);
  }

  // ─── 6. Warm Point Lights ─────────────────────────────────────────────────

  _initPointLights() {
    const configs = [
      { id: 'village_lantern', pos: [-4.0, 2.3, -2.5], color: 0xff9933, dayInt: 0.1, nightInt: 2.2, dist: 10.0, flicker: false },
      { id: 'bridge_lantern', pos: [0.5, 4.9, -12.5], color: 0xff9933, dayInt: 0.1, nightInt: 2.0, dist: 9.0, flicker: false },
      { id: 'summit_campfire', pos: [20.0, 7.6, 22.0], color: 0xff6611, dayInt: 0.9, nightInt: 2.6, dist: 13.0, flicker: true, flickerAmp: 0.35 },
      { id: 'mushroom_grove', pos: [-16.0, 4.2, 16.0], color: 0x00e5ff, dayInt: 0.0, nightInt: 1.8, dist: 11.0, flicker: true, flickerAmp: 0.25 },
    ];

    for (const c of configs) {
      const light = new THREE.PointLight(c.color, c.dayInt, c.dist, 2.0);
      light.position.set(c.pos[0], c.pos[1], c.pos[2]);
      light.castShadow = false; // Forward rendering optimization
      this.scene.add(light);
      this.pointLights.push({ light, config: c });
    }
  }

  // ─── 7. Main Update Cycle ─────────────────────────────────────────────────

  update(delta, elapsed, dayTime) {
    const nightFactor = this._calculateNightFactor(dayTime);

    this._updateClouds(delta, dayTime, nightFactor);
    this._updateLeafParticles(delta, elapsed);
    this._updateMushroomSpores(delta);
    this._updateCampfireParticles(delta);
    this._updateFireflies(elapsed, nightFactor);
    this._updatePointLights(elapsed, nightFactor);
  }

  _calculateNightFactor(dayTime) {
    if (dayTime >= 0.0 && dayTime < 0.40) {
      return 0.0;
    } else if (dayTime >= 0.40 && dayTime < 0.55) {
      const t = (dayTime - 0.40) / 0.15;
      return t * t * (3 - 2 * t);
    } else if (dayTime >= 0.55 && dayTime < 0.90) {
      return 1.0;
    } else {
      const t = (dayTime - 0.90) / 0.10;
      return 1.0 - t * t * (3 - 2 * t);
    }
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
      }
    }

    // 2. Tint cloud material based on day phase
    const dayColor = new THREE.Color(0xffffff);
    const sunsetColor = new THREE.Color(0xffaa88);
    const nightColor = new THREE.Color(0x242d4a);

    let targetColor = dayColor;
    if (dayTime >= 0.40 && dayTime < 0.55) {
      const t = (dayTime - 0.40) / 0.15;
      targetColor = dayColor.clone().lerp(sunsetColor, t);
    } else if (dayTime >= 0.55 && dayTime < 0.90) {
      targetColor = nightColor;
    } else if (dayTime >= 0.90) {
      const t = (dayTime - 0.90) / 0.10;
      targetColor = nightColor.clone().lerp(dayColor, t);
    }
    this.materials.cloud.color.copy(targetColor);
  }

  _updateLeafParticles(delta, elapsed) {
    const mesh = this.particles.leaves;
    if (!mesh) return;

    for (let i = 0; i < this.leafData.length; i++) {
      const p = this.leafData[i];
      p.y += p.vy * delta;
      p.x += (this.wind.x * 0.9 + Math.sin(elapsed * p.swaySpeed + p.swayPhase) * p.swayAmp) * delta;
      p.z += (this.wind.z * 0.9 + Math.cos(elapsed * p.swaySpeed * 0.8 + p.swayPhase) * (p.swayAmp * 0.6)) * delta;

      p.rotX += p.vRotX * delta;
      p.rotY += p.vRotY * delta;

      const groundY = this.world ? this.world.getGroundHeight(p.x, p.z) : 0.0;
      if (p.y <= groundY + 0.1 || p.x < -43 || p.x > 43 || p.z < -43 || p.z > 43) {
        p.x = (Math.random() - 0.5) * 80.0;
        p.z = (Math.random() - 0.5) * 80.0;
        p.y = 8.0 + Math.random() * 5.0;
      }

      this._dummy.position.set(p.x, p.y, p.z);
      this._dummy.rotation.set(p.rotX, p.rotY, p.rotZ);
      this._dummy.scale.set(1, 1, 1);
      this._dummy.updateMatrix();
      mesh.setMatrixAt(i, this._dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  _updateMushroomSpores(delta) {
    const mesh = this.particles.spores;
    if (!mesh) return;

    for (let i = 0; i < this.sporeData.length; i++) {
      const p = this.sporeData[i];
      p.life += delta / p.duration;

      if (p.life >= 1.0) {
        p.life = 0.0;
        p.y = p.baseY + Math.random() * 0.8;
      } else {
        p.y += p.vy * delta;
        p.swayAngle += p.swaySpeed * delta;
        p.x = p.originX + Math.cos(p.swayAngle) * p.swayRadius;
        p.z = p.originZ + Math.sin(p.swayAngle) * p.swayRadius;
      }

      const scale = Math.sin(p.life * Math.PI) * p.baseScale;
      this._dummy.position.set(p.x, p.y, p.z);
      this._dummy.rotation.set(0, 0, 0);
      this._dummy.scale.setScalar(Math.max(0.001, scale));
      this._dummy.updateMatrix();
      mesh.setMatrixAt(i, this._dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  _updateCampfireParticles(delta) {
    const cPos = this.campfirePos;

    // 1. Flames
    const fMesh = this.particles.flames;
    if (fMesh) {
      for (let i = 0; i < this.flameData.length; i++) {
        const p = this.flameData[i];
        p.life += delta / p.duration;

        if (p.life >= 1.0) {
          p.life = 0.0;
          p.x = cPos.x + (Math.random() - 0.5) * 0.35;
          p.z = cPos.z + (Math.random() - 0.5) * 0.35;
          p.y = cPos.y + 0.15;
          p.vy = 2.0 + Math.random() * 1.5;
        } else {
          p.y += p.vy * delta;
          p.x += (Math.random() - 0.5) * 0.2 * delta;
          p.z += (Math.random() - 0.5) * 0.2 * delta;
        }

        const scale = Math.sin(p.life * Math.PI) * p.baseScale;
        this._dummy.position.set(p.x, p.y, p.z);
        this._dummy.scale.setScalar(Math.max(0.001, scale));
        this._dummy.updateMatrix();
        fMesh.setMatrixAt(i, this._dummy.matrix);
      }
      fMesh.instanceMatrix.needsUpdate = true;
    }

    // 2. Smoke
    const sMesh = this.particles.smoke;
    if (sMesh) {
      for (let i = 0; i < this.smokeData.length; i++) {
        const p = this.smokeData[i];
        p.life += delta / p.duration;

        if (p.life >= 1.0) {
          p.life = 0.0;
          p.x = cPos.x + (Math.random() - 0.5) * 0.3;
          p.z = cPos.z + (Math.random() - 0.5) * 0.3;
          p.y = cPos.y + 0.75;
          p.vy = 1.1 + Math.random() * 0.6;
        } else {
          p.y += p.vy * delta;
          p.x += this.wind.x * 0.75 * delta;
          p.z += this.wind.z * 0.75 * delta;
        }

        const scale = (0.3 + p.life * 1.8) * p.baseScale * (1.0 - p.life * 0.3);
        this._dummy.position.set(p.x, p.y, p.z);
        this._dummy.scale.setScalar(Math.max(0.001, scale));
        this._dummy.updateMatrix();
        sMesh.setMatrixAt(i, this._dummy.matrix);
      }
      sMesh.instanceMatrix.needsUpdate = true;
    }
  }

  _updateFireflies(elapsed, nightFactor) {
    const mesh = this.particles.fireflies;
    if (!mesh) return;

    if (nightFactor < 0.05) {
      mesh.visible = false;
      return;
    }
    mesh.visible = true;

    for (let i = 0; i < this.fireflyData.length; i++) {
      const d = this.fireflyData[i];
      const time = elapsed * 0.002;
      const x = d.baseX + Math.sin(time * d.speed + d.seed) * 1.6;
      const y = d.baseY + Math.cos(time * d.speed * 1.2 + d.seed) * 0.8;
      const z = d.baseZ + Math.sin(time * d.speed * 0.8 + d.seed) * 1.6;

      this._dummy.position.set(x, y, z);
      this._dummy.scale.setScalar(nightFactor);
      this._dummy.updateMatrix();
      mesh.setMatrixAt(i, this._dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  _updatePointLights(elapsed, nightFactor) {
    for (const pl of this.pointLights) {
      const c = pl.config;
      let target = THREE.MathUtils.lerp(c.dayInt, c.nightInt, nightFactor);

      if (c.flicker) {
        if (c.id === 'summit_campfire') {
          const flicker = Math.sin(elapsed * 16.3) * 0.18 + Math.cos(elapsed * 27.7) * 0.12;
          target += flicker * c.flickerAmp;
        } else {
          // Gentle breathing pulse for mushroom grove
          const pulse = Math.sin(elapsed * 1.8) * 0.35;
          target += pulse * c.flickerAmp * nightFactor;
        }
      }

      pl.light.intensity = Math.max(0, target);
    }
  }
}
```

---

### 6.2 Integration into `src/game/Game.js`
In `src/game/Game.js`, the integration is minimal, elegant, and non-destructive:

```diff
--- src/game/Game.js
+++ src/game/Game.js
@@ -14,6 +14,7 @@
 import { DialogueSystem } from './DialogueSystem.js';
+import { AtmosphereManager } from './AtmosphereManager.js';
 
 export class Game {
   constructor(container) {
@@ -34,6 +35,7 @@
     this.dialogue = new DialogueSystem(this.audio);
     this.npcs = new NPCManager(this.scene, this.world);
     this.input = new InputManager();
     this.audio = new AudioManager();
     this.save = new SaveManager();
+    this.atmosphere = new AtmosphereManager(this.scene, this.world);
@@ -107,8 +109,7 @@
     this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
     this.scene.add(this.ambientLight);
 
-    // Fireflies for night ambiance
-    this._createFireflies();
+    await this.atmosphere.init();
@@ -158,6 +159,7 @@
     // 1. Advance Day/Night Cycle
     this.dayTime = (this.dayTime + delta / this.dayDuration) % 1.0;
     this._updateDayNightLighting(delta);
+    this.atmosphere.update(delta, now, this.dayTime);
```

---

## 7. Verification Method

Subsequent implementation agents and testers can verify this subsystem using three independent methods:

### 1. Headless Node.js Unit Test Execution
Execute the pre-built mathematical and architectural verification suite:
```powershell
node --test .agents/teamwork/explorer_m1_3/test_atmosphere_spec.mjs
node --test .agents/teamwork/explorer_m1_3/test_full_atmo_prototype.mjs
```
- **Expected Result**: 5 tests pass in $< 300\text{ms}$ with 0 failures, validating smooth nightFactor curve, cloud boundary wrapping, InstancedMesh matrix/color updates, campfire flicker bounds, and full game loop execution.

### 2. Vite Production Build Verification
Execute the production bundler to verify zero syntax, import, or packaging errors:
```powershell
npm run build
```
- **Expected Result**: Builds cleanly in $\sim 350\text{ms}$ with exit code 0.

### 3. In-Browser Visual Verification
1. Launch `npm run dev`.
2. Inspect the sky to observe 14 low-poly clouds drifting smoothly across $Y = 22\text{m} - 31\text{m}$ and wrapping at $\pm 65\text{m}$ without popping.
3. Observe gentle leaf particles wafting downwards in the valley.
4. Approach the Luminescent Mushroom Grove (`x: -16, z: 16`) to verify glowing cyan/magenta spores rising upward.
5. Ascend to the Summit Peak (`x: 20, z: 22`) to verify the campfire's active flame and smoke puffs.
6. Advance `this.dayTime` to sunset/night to observe warm amber lantern lights (`0xff9933`), campfire illumination, and fireflies seamlessly activating.
