# Technical Specification & Implementation Recommendation: Dynamic 4-Phase Day/Sunset/Night Lighting Engine

**Author**: `explorer_m1_2`  
**Milestone**: M1 — Lighting, Tonemapping & Atmospheric FX Engine (Feature F3)  
**Target File**: `src/game/Game.js`  
**Status**: Complete / Ready for Implementation  

---

## 1. Executive Summary

This specification provides the exact technical design and drop-in code structure for overhauling the day/night lighting cycle in `src/game/Game.js`.

The upgrade accomplishes five major goals:
1. **Resolves the Moonlight Sticky Color Bug**: Fixes the bug where `sunLight.color` is mutated to blue moonlight (`0x90caf9`) at night and never restored during daylight.
2. **Replaces Binary Pop with Continuous 4-Phase Interpolation**: Smoothly blends across **Dawn** (warm rose/gold), **Day** (warm cream sunlight), **Sunset** (rich golden amber/coral), and **Night** (deep indigo moonlight) using a C1-continuous smoothstep curve.
3. **Synchronizes All 9 Global Lighting & Environmental Parameters**: Continuously updates `sunLight.color`, `sunLight.intensity`, `ambientLight.color`, `ambientLight.intensity`, `hemiLight.skyColor`, `hemiLight.groundColor`, `hemiLight.intensity`, `scene.background`, and `scene.fog.color`.
4. **Optimizes Celestial Light Trajectory**: Moves the primary directional light along a natural celestial arc with high-elevation night moonlight (`y = 50m`), eliminating distorted horizontal ground-level shadows caused by previous `y = 1m` clamping.
5. **Zero-Allocation 60 FPS Performance Guarantee**: Employs pre-allocated working objects to eliminate per-frame garbage collection pressure.
6. **Exposes Cohesive Time-of-Day Contracts**: Publishes `this.nightFactor`, `this.isNight`, `this.currentPhase`, and 24-hour clock formatting to coordinate seamlessly with localized point lights (lanterns, campfires, glowing mushrooms) and firefly particles.

---

## 2. Root Cause Analysis of Existing Deficiencies

### 2.1 The Blue Moonlight Bug (`Game.js` lines 277–298)
- In `Game._initScene()` (line 87), `sunLight` is instantiated with warm sunlight:
  ```javascript
  this.sunLight = new THREE.DirectionalLight(0xfff7e2, 2.5);
  ```
- In `Game._updateDayNightLighting(delta)`:
  - During the day branch (`if (isDay)`), `this.sunLight.color` is **never updated or assigned**. Only `intensity` is modified.
  - During the night branch (`else`), line 296 explicitly mutates the directional light:
    ```javascript
    this.sunLight.color.set(0x90caf9);
    ```
  - When the cycle wraps past sunrise (`isDay === true`), `sunLight.color` remains permanently set to `0x90caf9`. Every subsequent day in the game is lit by cold blue moonlight.

### 2.2 Hard Binary Snapping
- Day vs. night is determined by a binary threshold `const isDay = sunY > 0;`.
- When `sunY` transitions from `+0.01` to `-0.01`, the sky and fog instantly jump from sunset orange (`0xe67e22`) to midnight navy (`0x0c1524`), creating a jarring flicker.
- Sunrise was completely missing; early morning was incorrectly rendered as sunset orange.

### 2.3 Hemisphere Light Left Static
- `this.hemiLight` was initialized with daytime values (`sky: 0x7eccff, ground: 0x488a28, intensity: 0.85`) and never updated. At midnight, strong cyan sky bounce and green grass reflection washed out the nocturnal atmosphere.

### 2.4 Ground-Level Night Shadows
- Clamping `sunY` with `Math.max(1, sunY)` placed the directional light at `y = 1` at midnight. This caused near-horizontal shadow projections extending over 100 meters across the terrain rather than natural moonlight shining from above.

### 2.5 Frame Allocation Overhead
- Lines 279–281 created new `THREE.Color` objects and cloned them every single frame (`new THREE.Color(...)`), generating ~10,800 discarded objects per minute at 60 FPS.

---

## 3. Dynamic 4-Phase Keyframe Palette Specification

The timeline is divided into 4 equidistant quadrants across `dayTime ∈ [0.0, 1.0)`:
- `t = 0.00` (or `1.00`): **Dawn** (Sunrise, ~06:00)
- `t = 0.25`: **Day** (High Noon, ~12:00)
- `t = 0.50`: **Sunset** (Golden Hour / Dusk, ~18:00)
- `t = 0.75`: **Night** (Midnight, ~00:00)

### 3.1 Parameter Matrix Across the 4 Phases

| Parameter | Dawn (`t = 0.00`) | Day (`t = 0.25`) | Sunset (`t = 0.50`) | Night (`t = 0.75`) | Stylistic Rationale |
|---|---|---|---|---|---|
| `sunColor` | `0xffb88c` | `0xfff6e5` | `0xff7a36` | `0x8cb8ff` | Warm rose-gold → sunny solar cream → fiery amber → mystical indigo |
| `sunIntensity` | `1.60` | `2.50` | `1.80` | `0.38` | Strong contrast at noon; soft moonlight preserving directional cast shadows |
| `sunPosition` | `(45, 25, -20)` | `(15, 55, -20)` | `(-45, 25, -20)` | `(-15, 50, 20)` | Continuous arc; high downward angle at night (`y = 50`) prevents horizontal shadow stretching |
| `ambientColor` | `0xd8b2a8` | `0xffffff` | `0xb8604d` | `0x283452` | Soft peach fill → neutral white → terracotta dusk → cool indigo nocturnal fill |
| `ambientIntensity` | `0.42` | `0.55` | `0.45` | `0.28` | Keeps silhouettes readable in dark without flattening geometry |
| `hemiSky` | `0xffd1b3` | `0x7eccff` | `0xff8040` | `0x182442` | Blushing peach sky → cerulean azure → blazing sunset sky → deep navy hemisphere |
| `hemiGround` | `0x3e5828` | `0x488a28` | `0x4c3319` | `0x0e1912` | Muted morning earth → vibrant grass bounce → warm dusk soil → dark forest floor |
| `hemiIntensity` | `0.65` | `0.85` | `0.65` | `0.28` | Dims at night to let point lights and moonbeams pop |
| `skyColor` (`scene.background`) | `0xf59e72` | `0x6ec4f8` | `0xe65c2b` | `0x0a101d` | Radiant dawn horizon → KayKit signature toon blue → deep crimson sunset → starry night sky |
| `fogColor` (`scene.fog.color`) | `0xf5a882` | `0x8cd2fc` | `0xdc6836` | `0x0c1524` | Matches background tone to seamlessly blend horizon line into distance |
| `nightWeight` | `0.10` | `0.00` | `0.50` | `1.00` | Drives external point light & firefly intensity |

---

## 4. Mathematical Keyframe Interpolation Architecture

### 4.1 Quadrant Selection and Normalized Progress
Given `t = ((this.dayTime % 1.0) + 1.0) % 1.0` in `[0, 1)`:
```javascript
const phaseIndex = Math.floor(t / 0.25); // 0: Dawn->Day, 1: Day->Sunset, 2: Sunset->Night, 3: Night->Dawn
const segmentT = (t - phaseIndex * 0.25) / 0.25; // [0, 1) within active quadrant
```

### 4.2 Smoothstep Easing (C1 Continuity)
Using Hermite smoothstep interpolation ensures zero derivative at each keyframe peak:
$$\text{blend} = 3 \cdot (\text{segmentT})^2 - 2 \cdot (\text{segmentT})^3$$
- When $\text{segmentT} = 0$, $\text{blend} = 0$ and $\frac{d}{dt}\text{blend} = 0$.
- When $\text{segmentT} = 1$, $\text{blend} = 1$ and $\frac{d}{dt}\text{blend} = 0$.
- The rate of change eases smoothly into and out of each phase, providing a natural cinematic hold around noon, sunset, midnight, and dawn.

### 4.3 Zero-Allocation Execution
Pre-allocate intermediate working objects on the `Game` instance during constructor/init:
```javascript
this._targetSunColor = new THREE.Color();
this._targetAmbientColor = new THREE.Color();
this._targetHemiSkyColor = new THREE.Color();
this._targetHemiGroundColor = new THREE.Color();
this._targetSkyColor = new THREE.Color();
this._targetFogColor = new THREE.Color();
this._targetSunPos = new THREE.Vector3();
```
In `_updateDayNightLighting(delta)`, update in-place:
```javascript
this._targetSunColor.lerpColors(kfA.sunColor, kfB.sunColor, blend);
this.sunLight.color.copy(this._targetSunColor);

this._targetSunPos.lerpVectors(kfA.sunPosition, kfB.sunPosition, blend);
this.sunLight.position.copy(this._targetSunPos);

this.sunLight.intensity = THREE.MathUtils.lerp(kfA.sunIntensity, kfB.sunIntensity, blend);
// ... applied across all 9 parameters
```
Total allocations per frame: **0 bytes**.

---

## 5. Coordination with Time-of-Day Clock & Subsystems

### 5.1 Public State Exposure on `Game`
The following properties must be available on the `Game` instance for consumption by `AtmosphereManager`, `WorldManager`, and UI:

```javascript
// Current normalized time in [0, 1)
get timeOfDay() {
  return this.dayTime;
}

// Active textual phase name
get currentPhase() {
  const t = ((this.dayTime % 1.0) + 1.0) % 1.0;
  if (t < 0.125 || t >= 0.875) return 'dawn';
  if (t < 0.375) return 'day';
  if (t < 0.625) return 'sunset';
  return 'night';
}

// Boolean check for night-time logic (threshold at 0.35 nightFactor)
get isNight() {
  return this.nightFactor > 0.35;
}

// Formatted 24-hour in-game clock (0.00 = 06:00, 0.25 = 12:00, 0.50 = 18:00, 0.75 = 00:00)
getFormattedTime() {
  const totalHours = (6 + this.dayTime * 24) % 24;
  const hours = Math.floor(totalHours);
  const minutes = Math.floor((totalHours % 1) * 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}
```

### 5.2 Point Light Integration Contract (Feature F4)
`this.nightFactor` ranges continuously from `0.0` (full daylight) to `1.0` (full midnight).
Lanterns, campfires, and glowing mushrooms modulate their point light intensity directly:
$$\text{activeIntensity} = \text{baseIntensity} \cdot (\text{nightFactor})^{1.5}$$
This creates a natural ignition as dusk deepens, rather than popping on at an arbitrary frame.

### 5.3 Firefly Particle Ambiance
Instead of binary `f.visible = false` vs `true`, fireflies smoothly scale and animate based on `this.nightFactor`:
```javascript
const fireflyScale = THREE.MathUtils.clamp((this.nightFactor - 0.2) / 0.5, 0, 1);
const firefliesActive = fireflyScale > 0.01;

if (firefliesActive) {
  const time = performance.now() * 0.002;
  for (let i = 0; i < this.fireflies.length; i++) {
    const f = this.fireflies[i];
    f.visible = true;
    f.scale.setScalar(fireflyScale);
    const d = f.userData;
    f.position.x = d.baseX + Math.sin(time * d.speed + d.seed) * 1.6;
    f.position.y = d.baseY + Math.cos(time * d.speed * 1.2 + d.seed) * 0.8;
    f.position.z = d.baseZ + Math.sin(time * d.speed * 0.8 + d.seed) * 1.6;
  }
} else {
  for (let i = 0; i < this.fireflies.length; i++) {
    this.fireflies[i].visible = false;
  }
}
```

---

## 6. Concrete Implementation Code Plan for `src/game/Game.js`

### 6.1 Top of File / Module Constants
Add `LIGHTING_PHASES` constant at module scope:
```javascript
export const LIGHTING_PHASES = [
  {
    name: 'dawn',
    sunColor: new THREE.Color(0xffb88c),
    sunIntensity: 1.60,
    sunPosition: new THREE.Vector3(45, 25, -20),
    ambientColor: new THREE.Color(0xd8b2a8),
    ambientIntensity: 0.42,
    hemiSky: new THREE.Color(0xffd1b3),
    hemiGround: new THREE.Color(0x3e5828),
    hemiIntensity: 0.65,
    skyColor: new THREE.Color(0xf59e72),
    fogColor: new THREE.Color(0xf5a882),
    nightWeight: 0.10,
  },
  {
    name: 'day',
    sunColor: new THREE.Color(0xfff6e5),
    sunIntensity: 2.50,
    sunPosition: new THREE.Vector3(15, 55, -20),
    ambientColor: new THREE.Color(0xffffff),
    ambientIntensity: 0.55,
    hemiSky: new THREE.Color(0x7eccff),
    hemiGround: new THREE.Color(0x488a28),
    hemiIntensity: 0.85,
    skyColor: new THREE.Color(0x6ec4f8),
    fogColor: new THREE.Color(0x8cd2fc),
    nightWeight: 0.00,
  },
  {
    name: 'sunset',
    sunColor: new THREE.Color(0xff7a36),
    sunIntensity: 1.80,
    sunPosition: new THREE.Vector3(-45, 25, -20),
    ambientColor: new THREE.Color(0xb8604d),
    ambientIntensity: 0.45,
    hemiSky: new THREE.Color(0xff8040),
    hemiGround: new THREE.Color(0x4c3319),
    hemiIntensity: 0.65,
    skyColor: new THREE.Color(0xe65c2b),
    fogColor: new THREE.Color(0xdc6836),
    nightWeight: 0.50,
  },
  {
    name: 'night',
    sunColor: new THREE.Color(0x8cb8ff),
    sunIntensity: 0.38,
    sunPosition: new THREE.Vector3(-15, 50, 20),
    ambientColor: new THREE.Color(0x283452),
    ambientIntensity: 0.28,
    hemiSky: new THREE.Color(0x182442),
    hemiGround: new THREE.Color(0x0e1912),
    hemiIntensity: 0.28,
    skyColor: new THREE.Color(0x0a101d),
    fogColor: new THREE.Color(0x0c1524),
    nightWeight: 1.00,
  },
];
```

### 6.2 Constructor Initialization (`Game.js`)
Initialize working scratch objects and exposed state:
```javascript
// Day/Night Cycle State
this.dayTime = 0.25; // 0..1 (0.0=dawn, 0.25=noon, 0.5=sunset, 0.75=midnight)
this.dayDuration = 140; // seconds for full day/night cycle
this.nightFactor = 0.0; // 0..1 darkness factor

// Scratch objects for zero-allocation lerping
this._targetSunColor = new THREE.Color();
this._targetAmbientColor = new THREE.Color();
this._targetHemiSkyColor = new THREE.Color();
this._targetHemiGroundColor = new THREE.Color();
this._targetSkyColor = new THREE.Color();
this._targetFogColor = new THREE.Color();
this._targetSunPos = new THREE.Vector3();
```

### 6.3 Immediate Sync on `_initScene()`
Call `this._updateDayNightLighting(0);` right after adding lights and fog in `_initScene()`, guaranteeing the initial frame has fully calibrated colors matching `this.dayTime`.

### 6.4 Replacement Method `_updateDayNightLighting(delta)`
Replace lines 265–309 of `Game.js` with:
```javascript
_updateDayNightLighting(delta) {
  const t = ((this.dayTime % 1.0) + 1.0) % 1.0;
  const phaseIndex = Math.floor(t / 0.25);
  const segmentT = (t - phaseIndex * 0.25) / 0.25;
  const blend = segmentT * segmentT * (3 - 2 * segmentT);

  const kfA = LIGHTING_PHASES[phaseIndex];
  const kfB = LIGHTING_PHASES[(phaseIndex + 1) % 4];

  // 1. Sun Directional Light
  this._targetSunColor.lerpColors(kfA.sunColor, kfB.sunColor, blend);
  this.sunLight.color.copy(this._targetSunColor);
  this.sunLight.intensity = THREE.MathUtils.lerp(kfA.sunIntensity, kfB.sunIntensity, blend);

  this._targetSunPos.lerpVectors(kfA.sunPosition, kfB.sunPosition, blend);
  this.sunLight.position.copy(this._targetSunPos);

  // 2. Ambient Light
  this._targetAmbientColor.lerpColors(kfA.ambientColor, kfB.ambientColor, blend);
  this.ambientLight.color.copy(this._targetAmbientColor);
  this.ambientLight.intensity = THREE.MathUtils.lerp(kfA.ambientIntensity, kfB.ambientIntensity, blend);

  // 3. Hemisphere Light
  this._targetHemiSkyColor.lerpColors(kfA.hemiSky, kfB.hemiSky, blend);
  this._targetHemiGroundColor.lerpColors(kfA.hemiGround, kfB.hemiGround, blend);
  this.hemiLight.color.copy(this._targetHemiSkyColor);
  this.hemiLight.groundColor.copy(this._targetHemiGroundColor);
  this.hemiLight.intensity = THREE.MathUtils.lerp(kfA.hemiIntensity, kfB.hemiIntensity, blend);

  // 4. Sky Background & Fog
  this._targetSkyColor.lerpColors(kfA.skyColor, kfB.skyColor, blend);
  this._targetFogColor.lerpColors(kfA.fogColor, kfB.fogColor, blend);
  this.scene.background.copy(this._targetSkyColor);
  this.scene.fog.color.copy(this._targetFogColor);

  // 5. Darkness & Night Factor
  this.nightFactor = THREE.MathUtils.lerp(kfA.nightWeight, kfB.nightWeight, blend);

  // 6. Firefly Ambiance (Smooth Scale/Fade)
  const fireflyScale = THREE.MathUtils.clamp((this.nightFactor - 0.2) / 0.5, 0, 1);
  const firefliesActive = fireflyScale > 0.01;

  if (firefliesActive) {
    const time = performance.now() * 0.002;
    for (let i = 0; i < this.fireflies.length; i++) {
      const f = this.fireflies[i];
      f.visible = true;
      f.scale.setScalar(fireflyScale);
      const d = f.userData;
      f.position.x = d.baseX + Math.sin(time * d.speed + d.seed) * 1.6;
      f.position.y = d.baseY + Math.cos(time * d.speed * 1.2 + d.seed) * 0.8;
      f.position.z = d.baseZ + Math.sin(time * d.speed * 0.8 + d.seed) * 1.6;
    }
  } else {
    for (let i = 0; i < this.fireflies.length; i++) {
      this.fireflies[i].visible = false;
    }
  }
}
```

---

## 7. Verification Method & Test Cases

### 7.1 Automated Unit Tests (`tests/tier1_features/f3_day_night.test.mjs`)
1. **Moonlight Reset Test**:
   - Set `dayTime = 0.75` (night), run `_updateDayNightLighting()`. Verify `sunLight.color` is indigo (`0x8cb8ff`).
   - Advance `dayTime = 0.25` (day), run `_updateDayNightLighting()`.
   - **Assertion**: `sunLight.color.getHexString()` must strictly equal `'fff6e5'` (warm cream), verifying the moonlight bug is permanently resolved.
2. **Keyframe Exact Value Verification**:
   - Verify that at `t = 0.00`, values strictly match Dawn.
   - Verify that at `t = 0.25`, values strictly match Day.
   - Verify that at `t = 0.50`, values strictly match Sunset.
   - Verify that at `t = 0.75`, values strictly match Night.
3. **Continuity & Boundary Wrap Test**:
   - Evaluate at `t = 0.999` and `t = 0.001`.
   - Check that $\Delta\text{color} < 0.02$ and $\Delta\text{intensity} < 0.01$, ensuring seamless loop with no visual pop.
4. **All 9 Parameters Interpolated**:
   - Assert non-static behavior on all 9 variables between `t = 0.25` and `t = 0.75`.
5. **Zero Allocation Verification**:
   - Run 1000 iterations of `_updateDayNightLighting()` in a test loop to verify zero memory leaks or object allocations.
