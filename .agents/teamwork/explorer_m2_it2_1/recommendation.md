# Geometric and Mathematical Recommendation Report
## Ramp 3 Slope Inversion & Ramp 4 Relocation Architecture

**Author**: `explorer_m2_it2_1`  
**Role**: Explorer, Mathematical & Geometric Analyst  
**Date**: 2026-09-27T15:56:00Z  
**Target Files**: `src/game/WorldManager.js`, `tests/helpers/analytical_models.mjs`, `tests/stress/m2_challenger_terrain_stress.test.mjs`

---

## 1. Executive Summary

Milestone 2 introduced stepped plateau rock strata, stepped stone paver ramps, naturalized boundary mountains, and a sunken riverbed canyon. During review and adversarial stress testing (`reviewer_m2_2` and `challenger_m2_1`), two critical geometric defects were identified:

1. **Ramp 3 Slope Inversion**: Ramp 3 (Southwest Plateau access) is defined with `startH: 0.0, endH: 3.5`. Because the Plateau Southwest is in the negative Z direction ($z \in [-27, -5]$) and the Valley floor is in the positive Z direction ($z > -5$), the ramp drops to $0.0\text{m}$ where it meets the $3.5\text{m}$ plateau at $z = -8$, and rises to $3.5\text{m}$ where it meets the $0.0\text{m}$ valley floor at $z = +2$. This forms impassable $3.5\text{m}$ vertical step walls at both ends.
2. **Ramp 4 / Suspension Bridge Footprint Collision**: Ramp 4 is placed at $x \in [1, 11], z \in [-21.5, -14.5]$. The Suspension Bridge spans $x \in [-6, 8], z \in [-18.8, -15.2]$ at height $y = 3.55\text{m}$. Because `WorldManager.getGroundHeight(x, z)` queries the bridge before ramps, the entire western ramp section along centerline $z = -18$ evaluates to $3.55\text{m}$, creating an invisible $3.55\text{m}$ cliff at $x = 1.05\text{m}$ and a $1.08\text{m}$ vertical drop mid-ramp at $x = 8.01\text{m}$.

This report provides the complete mathematical and geometric design to remediate both defects:
- **Ramp 3 Fix**: Invert heights to `startH: 3.5, endH: 0.0` with identical center $(-18, -3)$ and dimensions $(w=7, d=10)$. At $z = -8$ the ramp elevation is exactly $3.50\text{m}$ (matching Plateau Southwest), and at $z = +2$ the ramp elevation is exactly $0.00\text{m}$ (matching the Valley floor), with seamless $0.00\text{m}$ seam delta.
- **Ramp 4 Relocation**: Relocate Ramp 4 to the **Eastern face of Plateau Southeast** at center $(x = 32, z = -18)$ with dimensions $(w = 10, d = 7)$, `axis: 'x'`, and heights `startH: 3.5, endH: 0.0`. It connects Plateau Southeast at $x = 27$ ($3.50\text{m}$) down to the Eastern Valley floor at $x = 37$ ($0.00\text{m}$). This location is separated from the Suspension Bridge by $24\text{m}$, clear of the eastern boundary mountain by $5.0\text{m}$, completely free of river and ruins collisions, and creates a complete closed-loop traversal circuit around the open world.
- **Visual Mesh Rotation Alignment**: Fix the sign inversion in Three.js Euler rotations in `_buildSteppedRamps()` so the incline base slab (`rampBase`) and flanking curbs (`curb`) slope in unison with the stone step pavers.

---

## 2. Ramp 3 Slope Inversion Analysis & Fix

### 2.1 Root Cause & Geographical Layout

- **Plateau Southwest (`p_southwest`)**:
  - Center: $x = -18, z = -16$
  - Dimensions: $w = 26, d = 22$, elevation $h = 3.5\text{m}$
  - Boundary: $x \in [-31.0, -5.0]$, $z \in [-27.0, -5.0]$
  - Plateau Southwest lies in the **negative Z** direction ($z \le -5.0\text{m}$).
- **Valley Floor**:
  - Center Valley extends into the **positive Z** direction ($z > -5.0\text{m}$) at elevation $0.0\text{m}$.
- **Current Ramp 3 Definition**:
  ```javascript
  { x: -18, z: -3, w: 7, d: 10, axis: 'z', startH: 0.0, endH: 3.5 }
  ```
  - Bounds: $x \in [-21.5, -14.5]$, $z \in [-8.0, +2.0]$
  - Elevation evaluation in `getGroundHeight(x, z)`:
    $$t = \text{clamp}\left(\frac{z - (r.z - halfD)}{r.d}, 0, 1\right) = \text{clamp}\left(\frac{z - (-8.0)}{10.0}, 0, 1\right)$$
    $$\text{height} = \text{lerp}(r.startH, r.endH, t)$$

### 2.2 Mathematical Defect Demonstration

1. **At Plateau Southwest border ($z = -8.0\text{m}$)**:
   $$t = \frac{-8.0 - (-8.0)}{10.0} = 0.0 \implies \text{height} = \text{lerp}(0.0, 3.5, 0.0) = 0.0\text{m}$$
   - Plateau Southwest outside Ramp 3 at $z = -8.05\text{m}$: $\text{height} = 3.5\text{m}$.
   - Seam step: $|\Delta y| = |0.0 - 3.5| = 3.5\text{m} \gg 1.2\text{m}$ (Blocked).
2. **At Valley entrance ($z = +2.0\text{m}$)**:
   $$t = \frac{2.0 - (-8.0)}{10.0} = 1.0 \implies \text{height} = \text{lerp}(0.0, 3.5, 1.0) = 3.5\text{m}$$
   - Valley floor outside Ramp 3 at $z = +2.05\text{m}$: $\text{height} = 0.0\text{m}$.
   - Valley step: $|\Delta y| = |3.5 - 0.0| = 3.5\text{m} \gg 1.2\text{m}$ (Blocked).

### 2.3 Proposed Mathematical Fix

Set `startH: 3.5, endH: 0.0` for Ramp 3.  
Keep exact center and dimensions: $x = -18, z = -3, w = 7, d = 10, \text{axis} = \text{'z'}$.

$$\text{height}(z) = \text{lerp}\left(3.5, 0.0, \frac{z - (-8.0)}{10.0}\right) = 3.5 - 0.35 \times (z + 8.0)$$

#### Verification of Continuity:
- At $z = -8.00\text{m}$:
  $$\text{height}(-8.0) = 3.5 - 0.35 \times 0.0 = 3.50\text{m}$$
  Plateau Southwest elevation at $z = -8.05\text{m}$ is $3.50\text{m}$.  
  $$\Delta y_{\text{plateau}} = |3.50 - 3.50| = 0.00\text{m} \quad (\text{SEAMLESS})$$
- At $z = +2.00\text{m}$:
  $$\text{height}(+2.0) = 3.5 - 0.35 \times 10.0 = 0.00\text{m}$$
  Valley floor elevation at $z = +2.05\text{m}$ is $0.00\text{m}$.  
  $$\Delta y_{\text{valley}} = |0.00 - 0.00| = 0.00\text{m} \quad (\text{SEAMLESS})$$
- At midpoint $z = -3.00\text{m}$:
  $$\text{height}(-3.0) = 3.5 - 0.35 \times 5.0 = 1.75\text{m}$$
- Maximum slope gradient:
  $$\left|\frac{dy}{dz}\right| = 0.35\text{ m/m} \quad (\text{Incline angle } \theta = \arctan(0.35) \approx 19.29^\circ)$$
  Per-frame delta at sprinting speed ($17\text{ m/s}$, $\Delta t = 0.016\text{s}$):
  $$\Delta y = 17 \times 0.016 \times 0.35 \approx 0.095\text{m} \ll 0.20\text{m} \ll 1.20\text{m} \quad (\text{100\% WALKABLE})$$

---

## 3. Ramp 4 & Suspension Bridge Collision Analysis

### 3.1 Root Cause & Footprint Collision

- **Suspension Bridge (`this.bridge`)**:
  - Center: $x = 1.0, z = -17.0$
  - Dimensions: $w = 14.0, d = 3.6$, elevation $h = 3.55\text{m}$
  - Bounding Box: $x \in [-6.0, +8.0]$, $z \in [-18.8, -15.2]$
- **Current Ramp 4 (`this.ramps[3]`)**:
  - Center: $x = 6.0, z = -18.0$
  - Dimensions: $w = 10.0, d = 7.0$, elevation $0.0\text{m} \to 3.5\text{m}$
  - Bounding Box: $x \in [1.0, 11.0]$, $z \in [-21.5, -14.5]$

#### Collision Mechanism in `WorldManager.getGroundHeight(x, z)`:
In `WorldManager.js:1457-1476`:
```javascript
// 1. Check Suspension Bridge (allows walking across canyon at y = 3.55)
const b = this.bridge;
if (x >= b.x - b.w / 2 && x <= b.x + b.w / 2 && z >= b.z - b.d / 2 && z <= b.z + b.d / 2) {
  return b.height; // 3.55m
}

// 2. Check Ramps
for (const r of this.ramps) { ... }
```
Because the bridge is checked in Step 1:
1. For $x \in [1.0, 8.0]$ and $z \in [-18.8, -15.2]$ (which includes the entire northern half and centerline $z = -18.0$ of Ramp 4), `getGroundHeight` returns $3.55\text{m}$.
2. A player approaching Ramp 4 from the valley at $x = 1.05, z = -18.0$ sees ground height suddenly leap from $0.0\text{m} \to 3.55\text{m}$ ($\Delta y = 3.55\text{m} \gg 1.2\text{m}$), forming an invisible stone wall.
3. At $x = 8.01, z = -18.0$ where the bridge ends, height drops from $3.55\text{m}$ to the ramp slope at $2.47\text{m}$ ($\Delta y = 1.08\text{m}$).
4. Across the ramp's width at $x = 2.0$: $y(z = -20) = 0.35\text{m}$ while $y(z = -18) = 3.55\text{m}$, creating a $3.20\text{m}$ lateral step slicing through the middle of the ramp.

---

## 4. Architectural Relocation of Ramp 4 along Plateau Southeast

### 4.1 Plateau Southeast Geographic Context

- **Plateau Southeast (`p_southeast`)**:
  - Center: $x = 20, z = -18$
  - Dimensions: $w = 24, d = 24$, height $h = 3.5\text{m}$
  - Bounding Box: $x \in [8.0, 32.0]$, $z \in [-30.0, -6.0]$
- **Surrounding Features**:
  - **West Face ($x = 8.0, z \in [-30, -6]$)**:
    - Suspension bridge connects at $x = 8.0, z \in [-18.8, -15.2]$.
    - Bouncy mushroom 4 is at $(8.0, -8.0)$.
    - Deep sunken canyon with river channel below at $y = 0.04\text{m}$.
  - **North Face ($z = -6.0, x \in [8, 32]$)**:
    - River segment 3 (`x: 18, z: -2, w: 8, d: 24, rot: 0.3`) extends south to $z \approx -14.6\text{m}$ and $x \in [10.6, 25.4]$.
    - Rustic Dock 2 is situated at $(14.5, -2.5)$.
    - Squeezes any northern ramp into a very narrow strip ($x \in [26, 31]$) right next to the river canyon bank and corner rock buttress.
  - **South Face ($z = -30.0, x \in [8, 32]$)**:
    - Faces the southern alpine boundary mountain range ($z \le -41.5\text{m}$).
  - **East Face ($x = 32.0, z \in [-30, -6]$)**:
    - Faces a wide, completely flat, dry valley floor corridor extending from $x = 32.0$ to the player clamping bound at $x = 41.5$ ($9.5\text{m}$ of open traversable clearance).
    - Mountain inner wall is at $x = 42.0\text{m}$.
    - Completely free of water planes, riverbeds, and cliffs.
    - Sits $24.0\text{m}$ east of the Suspension Bridge (100% decoupled).

### 4.2 Candidate Evaluation Matrix

| Criterion | Candidate A: Eastern Face ($x=32, z=-18$) [RECOMMENDED] | Candidate B: Northern Face ($x=28.5, z=-6$) | Candidate C: Southern West Face ($x=6, z=-23.5$) |
|---|---|---|---|
| **Decoupling from Bridge Corridor** | **24.0m separation** (Bridge ends at $x=8$) | **17.5m separation** (Bridge ends at $z=-15.2$) | **1.7m separation** (Bridge ends at $z=-18.8$) |
| **Clearance to River & Docks** | **> 12m clear** of River Seg 3 & Dock 2 | **< 0.2m clearance** to River Seg 3 corner ($x=25.4$) | Overlooks sunken canyon |
| **Clearance to Map Boundary** | **4.5m** to clamp limit ($41.5$), **5.0m** to mountain wall ($42.0$) | > 20m from boundary | > 20m from boundary |
| **Landmark & Ruins Alignment** | **Perfect axial alignment** with Ceremonial Altar at $z=-18$ | Offset from Ruins; faces canyon | Squeezed in canyon shadow |
| **Open-World Traversal Loop** | **Closes world loop**: Village $\to$ North $\to$ Summit $\to$ SW $\to$ Bridge $\to$ SE $\to$ East Ramp $\to$ East Valley $\to$ Village | Loops back into river basin | Redundant with Bridge crossing |
| **Collision Risk with Props/Gems** | **Zero**: East Ridge Gem is at $(24, -20)$, pillars at $x \le 23$ | Squeezed against corner buttress | Near canyon wall |

### 4.3 Detailed Specification of Recommended Relocation (Candidate A: Eastern Face)

#### 1. Analytical Ramp Definition
```javascript
{
  id: 'ramp_southeast',
  x: 32.0,
  z: -18.0,
  w: 10.0,
  d: 7.0,
  axis: 'x',
  startH: 3.5,
  endH: 0.0,
}
```

#### 2. Spatial Extents & Coordinates
- **Center**: $(x = 32.0, y = 1.75, z = -18.0)$
- **Length along X-axis ($w$)**: $10.0\text{m}$
  - Western boundary (Plateau top): $x_{min} = 32.0 - 5.0 = 27.0\text{m}$
  - Eastern boundary (Valley floor): $x_{max} = 32.0 + 5.0 = 37.0\text{m}$
- **Width along Z-axis ($d$)**: $7.0\text{m}$
  - Southern boundary: $z_{min} = -18.0 - 3.5 = -21.5\text{m}$
  - Northern boundary: $z_{max} = -18.0 + 3.5 = -14.5\text{m}$
- **Height profile**:
  - $x = 27.0\text{m} \implies y = 3.50\text{m}$ (Plateau Southeast)
  - $x = 37.0\text{m} \implies y = 0.00\text{m}$ (Eastern Valley floor)
  - Slope: $\Delta y / \Delta x = -0.35$ (Incline angle $\approx 19.29^\circ$)

#### 3. Height Evaluation Formula (`WorldManager.getGroundHeight(x, z)`)
For any $(x, z)$ with $x \in [27.0, 37.0]$ and $z \in [-21.5, -14.5]$:
$$t = \text{clamp}\left(\frac{x - 27.0}{10.0}, 0, 1\right)$$
$$\text{height}(x) = \text{lerp}(3.5, 0.0, t) = 3.5 - 0.35 \times (x - 27.0)$$

#### 4. Seam Continuity Proofs
1. **Western Seam (Plateau Southeast at $x = 27.0\text{m}$)**:
   - Inside Ramp 4 at $x = 27.00\text{m}, z = -18.0\text{m}$:
     $$\text{height} = \text{lerp}(3.5, 0.0, 0.0) = 3.50\text{m}$$
   - Outside Ramp 4 at $x = 26.99\text{m}, z = -18.0\text{m}$:
     Falls within Plateau Southeast bounds ($x \in [8, 32], z \in [-30, -6]$). Height is $3.50\text{m}$.
     $$\Delta y_{\text{plateau}} = |3.50 - 3.50| = 0.00\text{m} \quad (\text{PERFECT SEAM})$$
2. **Eastern Seam (Valley Floor at $x = 37.0\text{m}$)**:
   - Inside Ramp 4 at $x = 37.00\text{m}, z = -18.0\text{m}$:
     $$\text{height} = \text{lerp}(3.5, 0.0, 1.0) = 0.00\text{m}$$
   - Outside Ramp 4 at $x = 37.01\text{m}, z = -18.0\text{m}$:
     Falls in the eastern valley floor. Height is $0.00\text{m}$.
     $$\Delta y_{\text{valley}} = |0.00 - 0.00| = 0.00\text{m} \quad (\text{PERFECT SEAM})$$
3. **Midpoint at Plateau Edge ($x = 32.0\text{m}$)**:
   $$\text{height}(32.0) = 3.5 - 0.35 \times 5.0 = 1.75\text{m}$$
4. **Boundary Clearance**:
   - Distance from ramp foot ($x = 37.0$) to player clamping bound ($x = 41.5$): $4.50\text{m}$.
   - Distance from ramp foot ($x = 37.0$) to mountain rock inner edge ($x = 42.0$): $5.00\text{m}$.
   - Player can sprint, jump, or turn around the foot of Ramp 4 without risking boundary clipping.

---

## 5. Three.js Visual Mesh Rotation Analysis & Sign Fix

### 5.1 Three.js Euler Angle Coordinate Transformation

In Three.js, rotations use right-handed Cartesian coordinates:
- $+X$ points Right
- $+Y$ points Up
- $+Z$ points Forward (towards viewer)

For a box centered at origin $(0, 0, 0)$:
1. **Rotation around X-axis by $\theta$ (`Euler(θ, 0, 0)` for `axis === 'z'`)**:
   $$\begin{bmatrix} x' \\ y' \\ z' \end{bmatrix} = \begin{bmatrix} 1 & 0 & 0 \\ 0 & \cos\theta & -\sin\theta \\ 0 & \sin\theta & \cos\theta \end{bmatrix} \begin{bmatrix} x \\ y \\ z \end{bmatrix}$$
   For points along the centerline ($x=0, y=0$):
   $$y'(z) = -z \sin\theta$$
   - If we want the ramp to slope up towards $+Z$ (like Ramp 1):
     At $z = +L/2$, we need $y' > 0 \implies - (L/2) \sin\theta > 0 \implies \sin\theta < 0 \implies \theta < 0$.
     Therefore, $\theta = -\arctan(\Delta h / L) = -\text{angle}$!
   - Currently, `WorldManager.js:390` sets `rampBase.rotation.x = angle`.
     When $\Delta h > 0$ (`angle > 0`), this makes $y'(+L/2) < 0$, rotating the base slab in reverse!
2. **Rotation around Z-axis by $\phi$ (`Euler(0, 0, φ)` for `axis === 'x'`)**:
   $$\begin{bmatrix} x' \\ y' \\ z' \end{bmatrix} = \begin{bmatrix} \cos\phi & -\sin\phi & 0 \\ \sin\phi & \cos\phi & 0 \\ 0 & 0 & 1 \end{bmatrix} \begin{bmatrix} x \\ y \\ z \end{bmatrix}$$
   For points along the centerline ($y=0, z=0$):
   $$y'(x) = x \sin\phi$$
   - If we want the ramp to slope up towards $+X$ (like Ramp 2):
     At $x = +L/2$, we need $y' > 0 \implies (L/2) \sin\phi > 0 \implies \sin\phi > 0 \implies \phi > 0$.
     Therefore, $\phi = +\arctan(\Delta h / L) = +\text{angle}$!
   - Currently, `WorldManager.js:392` sets `rampBase.rotation.z = -angle`.
     When $\Delta h > 0$, this makes $y'(+L/2) < 0$, rotating the base slab in reverse!

### 5.2 Corrected Rotation Logic for `_buildSteppedRamps()`

```javascript
const isZ = r.axis === 'z';
const length = isZ ? r.d : r.w;
const width = isZ ? r.w : r.d;
const heightDiff = r.endH - r.startH;
const angle = Math.atan2(heightDiff, length);

// 1. Continuous structural incline ramp base
const rampBase = new THREE.Mesh(
  new THREE.BoxGeometry(isZ ? width : length, 0.35, isZ ? length : width),
  this.rampMat
);
if (isZ) {
  rampBase.rotation.x = -angle; // FIXED: -angle ensures positive slope matches +Z
} else {
  rampBase.rotation.z = angle;  // FIXED: +angle ensures positive slope matches +X
}
rampBase.position.set(0, (r.startH + r.endH) / 2, 0);
...
// 3. Flanking Stone Curbs (Left & Right Retaining Borders)
for (const side of [-width / 2 + 0.15, width / 2 - 0.15]) {
  const curb = new THREE.Mesh(curbGeo, this.cliffDarkMat);
  if (isZ) {
    curb.rotation.x = -angle; // FIXED: matches rampBase
    curb.position.set(side, (r.startH + r.endH) / 2 + 0.12, 0);
  } else {
    curb.rotation.z = angle;  // FIXED: matches rampBase
    curb.position.set(0, (r.startH + r.endH) / 2 + 0.12, side);
  }
  ...
}
```

#### Verification Across All 4 Ramps:
- **Ramp 1** (`axis: 'z', startH: 0.0, endH: 3.5`):
  $heightDiff = +3.5, angle > 0 \implies rotation.x = -angle < 0 \implies y'(+5) > 0$. **Matches steps**.
- **Ramp 2** (`axis: 'x', startH: 3.5, endH: 7.0`):
  $heightDiff = +3.5, angle > 0 \implies rotation.z = +angle > 0 \implies y'(+5) > 0$. **Matches steps**.
- **Ramp 3** (`axis: 'z', startH: 3.5, endH: 0.0`):
  $heightDiff = -3.5, angle < 0 \implies rotation.x = -angle > 0 \implies y'(+5) < 0$. **Matches steps**.
- **Ramp 4** (`axis: 'x', startH: 3.5, endH: 0.0`):
  $heightDiff = -3.5, angle < 0 \implies rotation.z = +angle < 0 \implies y'(+5) < 0$. **Matches steps**.

---

## 6. Exact Code Changes

### 6.1 `src/game/WorldManager.js`

#### Diff 1: Lines 48–55 (Ramps Definition in Constructor)
```diff
<<<<
     // Ramp 3: Valley (0m) -> Plateau Southwest (3.5m)
     { x: -18, z: -3, w: 7, d: 10, axis: 'z', startH: 0.0, endH: 3.5 },

     // Ramp 4: Valley (0m) -> Plateau Southeast (3.5m)
     { x: 6, z: -18, w: 10, d: 7, axis: 'x', startH: 0.0, endH: 3.5 },
====
     // Ramp 3: Plateau Southwest (3.5m at z=-8) -> Valley (0m at z=+2)
     { x: -18, z: -3, w: 7, d: 10, axis: 'z', startH: 3.5, endH: 0.0 },

     // Ramp 4: Plateau Southeast (3.5m at x=27) -> Eastern Valley (0m at x=37)
     { x: 32, z: -18, w: 10, d: 7, axis: 'x', startH: 3.5, endH: 0.0 },
>>>>
```

#### Diff 2: Lines 389–393 (Visual Base Mesh Rotation)
```diff
<<<<
      if (isZ) {
        rampBase.rotation.x = angle;
      } else {
        rampBase.rotation.z = -angle;
      }
====
      if (isZ) {
        rampBase.rotation.x = -angle;
      } else {
        rampBase.rotation.z = angle;
      }
>>>>
```

#### Diff 3: Lines 432–438 (Visual Flanking Curb Rotation)
```diff
<<<<
        if (isZ) {
          curb.rotation.x = angle;
          curb.position.set(side, (r.startH + r.endH) / 2 + 0.12, 0);
        } else {
          curb.rotation.z = -angle;
          curb.position.set(0, (r.startH + r.endH) / 2 + 0.12, side);
        }
====
        if (isZ) {
          curb.rotation.x = -angle;
          curb.position.set(side, (r.startH + r.endH) / 2 + 0.12, 0);
        } else {
          curb.rotation.z = angle;
          curb.position.set(0, (r.startH + r.endH) / 2 + 0.12, side);
        }
>>>>
```

---

### 6.2 `tests/helpers/analytical_models.mjs`

#### Diff 1: Lines 168–173 (`TerrainModel.RAMPS`)
```diff
<<<<
   RAMPS: [
     { id: 'ramp_north', x: -12, z: 3, w: 7, d: 10, axis: 'z', startH: 0.0, endH: 3.5 },
     { id: 'ramp_peak', x: 5, z: 22, w: 10, d: 6, axis: 'x', startH: 3.5, endH: 7.0 },
     { id: 'ramp_southwest', x: -18, z: -3, w: 7, d: 10, axis: 'z', startH: 0.0, endH: 3.5 },
     { id: 'ramp_southeast', x: 6, z: -18, w: 10, d: 7, axis: 'x', startH: 0.0, endH: 3.5 },
   ],
====
   RAMPS: [
     { id: 'ramp_north', x: -12, z: 3, w: 7, d: 10, axis: 'z', startH: 0.0, endH: 3.5 },
     { id: 'ramp_peak', x: 5, z: 22, w: 10, d: 6, axis: 'x', startH: 3.5, endH: 7.0 },
     { id: 'ramp_southwest', x: -18, z: -3, w: 7, d: 10, axis: 'z', startH: 3.5, endH: 0.0 },
     { id: 'ramp_southeast', x: 32, z: -18, w: 10, d: 7, axis: 'x', startH: 3.5, endH: 0.0 },
   ],
>>>>
```

---

### 6.3 `tests/stress/m2_challenger_terrain_stress.test.mjs`

When the fix is implemented, Challenger 3.3 and Challenger 3.4 (which currently assert the presence of defects) should be converted to positive traversal assertion tests matching Challenger 3.1 and Challenger 3.2:

```javascript
test('Challenger 3.3: Ramp 3 (Southwest) — Continuous delta elevation < 0.2m and 100% climb success', () => {
  const { scene, world } = createTestWorld();
  const player = createTestPlayer(scene);
  const camera = createMockCamera();
  const r = world.ramps[2]; // Ramp 3: x: -18, z: -3, w: 7, d: 10, axis: 'z', startH: 3.5, endH: 0.0

  // 1. Analytical slope delta check (from Valley z=+2 to Plateau z=-8)
  let prevH = r.endH; // 0.0m
  for (let i = 0; i <= 100; i++) {
    const frac = i / 100;
    const qz = (r.z + r.d / 2) - frac * r.d; // walk towards negative Z (valley to plateau)
    const h = world.getGroundHeight(r.x, qz);
    const delta = Math.abs(h - prevH);
    assert.ok(delta < 0.20, `Ramp 3 analytical delta ${delta}m exceeded 0.2m at frac=${frac}`);
    prevH = h;
  }

  // 2. Seam continuity check
  const valleyStep = Math.abs(world.getGroundHeight(-18, 2.0) - world.getGroundHeight(-18, 2.05));
  const plateauStep = Math.abs(world.getGroundHeight(-18, -8.0) - world.getGroundHeight(-18, -8.05));
  assert.ok(valleyStep < 0.05, `Valley entrance seam delta ${valleyStep}m must be < 0.05m`);
  assert.ok(plateauStep < 0.05, `Plateau seam delta ${plateauStep}m must be < 0.05m`);

  // 3. Dynamic climb simulation from Valley (z=2.5) up to Plateau (z=-8.5)
  player.position.set(r.x, 0.0, r.z + r.d / 2 + 0.5);
  player.velocity.set(0, 0, 0);
  player.isGrounded = true;

  let reachedPlateau = false;
  for (let f = 0; f < 150; f++) {
    player.update(0.016, new THREE.Vector3(0, 0, -1), false, true, false, camera, world);
    assert.equal(player.isGrounded, true, 'Player remains grounded ascending Ramp 3');
    if (Math.abs(player.position.y - r.startH) < 0.05) {
      reachedPlateau = true;
      break;
    }
  }
  assert.ok(reachedPlateau, `Player successfully climbed Ramp 3 onto Southwest Plateau at ${r.startH}m`);
});

test('Challenger 3.4: Ramp 4 (Southeast) — Continuous delta elevation < 0.2m and 100% climb success', () => {
  const { scene, world } = createTestWorld();
  const player = createTestPlayer(scene);
  const camera = createMockCamera();
  const r = world.ramps[3]; // Ramp 4: x: 32, z: -18, w: 10, d: 7, axis: 'x', startH: 3.5, endH: 0.0

  // 1. Analytical slope delta check (from Valley x=37 to Plateau x=27)
  let prevH = r.endH; // 0.0m
  for (let i = 0; i <= 100; i++) {
    const frac = i / 100;
    const qx = (r.x + r.w / 2) - frac * r.w; // walk westward (valley to plateau)
    const h = world.getGroundHeight(qx, r.z);
    const delta = Math.abs(h - prevH);
    assert.ok(delta < 0.20, `Ramp 4 analytical delta ${delta}m exceeded 0.2m at frac=${frac}`);
    prevH = h;
  }

  // 2. Seam continuity check
  const valleyStep = Math.abs(world.getGroundHeight(37.0, -18.0) - world.getGroundHeight(37.05, -18.0));
  const plateauStep = Math.abs(world.getGroundHeight(27.0, -18.0) - world.getGroundHeight(26.95, -18.0));
  assert.ok(valleyStep < 0.05, `Valley entrance seam delta ${valleyStep}m must be < 0.05m`);
  assert.ok(plateauStep < 0.05, `Plateau seam delta ${plateauStep}m must be < 0.05m`);

  // 3. Dynamic climb simulation from Eastern Valley (x=37.5) up to Plateau Southeast (x=26.5)
  player.position.set(r.x + r.w / 2 + 0.5, 0.0, r.z);
  player.velocity.set(0, 0, 0);
  player.isGrounded = true;

  let reachedPlateau = false;
  for (let f = 0; f < 150; f++) {
    player.update(0.016, new THREE.Vector3(-1, 0, 0), false, true, false, camera, world);
    assert.equal(player.isGrounded, true, 'Player remains grounded ascending Ramp 4');
    if (Math.abs(player.position.y - r.startH) < 0.05) {
      reachedPlateau = true;
      break;
    }
  }
  assert.ok(reachedPlateau, `Player successfully climbed Ramp 4 onto Southeast Plateau at ${r.startH}m`);
});
```

---

## 7. Cross-System Impact & Blast Radius Audit

| System / Component | Impact Assessment | Mitigation / Verification |
|---|---|---|
| **Suspension Bridge** | **No impact / Positive** | Bridge corridor $x \in [-6, 8], z \in [-18.8, -15.2]$ is completely vacated. Traversals across canyon at $y = 3.55\text{m}$ remain 100% functional. |
| **Plateau North / Peak Summit** | **Zero impact** | Ramp 1 and Ramp 2 are completely untouched. |
| **Plateau Southwest** | **Positive** | Ramp 3 now seamlessly connects the valley floor to the plateau top without cliffs. |
| **Plateau Southeast & Sunken Ruins** | **Positive** | Ancient Ruins altar at $(20, -18)$ and pillars at $x \in [17, 23]$ sit comfortably west of the new ramp ($x \in [27, 37]$). East Ridge Gem at $(24, -20)$ is unaffected. |
| **River & Docks** | **Zero impact** | River segment 3 ends at $x \le 25.4$; Eastern Ramp at $x \in [27, 37]$ is completely on dry land. |
| **Map Boundaries & Clamping** | **Zero impact** | Eastern ramp foot is at $x = 37.0\text{m}$, retaining $4.5\text{m}$ clearance to player clamp ($41.5\text{m}$) and $5.0\text{m}$ to mountain inner edge ($42.0\text{m}$). |
| **Collectibles & Quests** | **Zero impact** | Coins, gems, chests, and dialogue nodes remain outside the new ramp footprints. |
| **Performance Budget** | **Zero impact** | Mesh counts, geometries, draw calls, and vertex calculations remain identical. |
