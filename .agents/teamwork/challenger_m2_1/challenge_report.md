# Milestone 2 Adversarial Challenge Report: Boundary Mountains, Cliffs & Ramps

**Challenger**: `challenger_m2_1`  
**Role**: critic, specialist (Empirical Challenger)  
**Target Subject**: `src/game/WorldManager.js` & `src/game/Player3D.js`  
**Test Suite**: `tests/stress/m2_challenger_terrain_stress.test.mjs` (13 empirical tests executed via Node test runner)  
**Date**: 2026-09-27  
**Verdict**: **CHALLENGE_FAILED** *(Critical terrain navigation failure: 2 out of 4 ramps are physically impassable, violating Acceptance Criteria §R4 and Milestone 2 specification §F9)*.

---

## 1. Challenge Summary

**Overall Risk Assessment**: **CRITICAL**  
**Verdict**: **CHALLENGE_FAILED**

The Milestone 2 terrain implementation was subjected to an adversarial stress-testing harness. The empirical verification yielded the following findings:

1. **Double-Containment Verification**: **APPROVED (100% Containment)**  
   - 1,000 perimeter coordinates tested along $|x| \ge 41.5\text{m}$ and $|z| \ge 41.5\text{m}$ with zero boundary escape.
   - 500 frames of extreme horizontal sprint force ($100\text{ m/s}$) along 8 radial directions strictly clamped to $|x|, |z| \le 41.5\text{m}$.
   - High-altitude glider flights from the summit ($y = 11.5\text{m}$) towards all 4 borders were safely arrested at $41.5\text{m}$ without void-fall or tunneling.
   - Physical mountain rock geometry begins at $|coord| \ge 42.0\text{m}$, maintaining a safe $\ge 0.5\text{m}$ clearance buffer from player clamping limits, with Tier 1 base heights $2.9\text{m} - 4.3\text{m} \gg 1.2\text{m}$ forming an impassable secondary barrier.

2. **Plateau Cliff Face Step-Height Blocking**: **APPROVED (100% Blocking)**  
   - Tested 424 non-ramp perimeter sample points across all 4 plateaus at $0.25\text{m}$ resolution: 100% of sample points exhibited vertical step $\Delta y \ge 3.5\text{m} \gg 1.2\text{m}$ (up to $7.0\text{m}$ for Peak Summit).
   - 50 dynamic player approach collisions at base of cliffs confirmed horizontal velocity zeroing and zero clipping into plateau interiors.
   - Stepping downward off plateau edges allowed smooth forward motion, triggering falling physics and landing with zero tunneling.

3. **Ramp Traversal & Elevation Delta Verification**: **CRITICAL FAILURE (50% Ramp Failure Rate)**  
   - **Ramp 1 (North)**: PASS. Smooth linear slope from $0.0\text{m}$ to $3.5\text{m}$ ($\Delta y < 0.06\text{m}$ per frame), 100% climb and descent success.
   - **Ramp 2 (Peak)**: PASS. Smooth linear slope from $3.5\text{m}$ to $7.0\text{m}$ ($\Delta y < 0.06\text{m}$ per frame), 100% climb and descent success.
   - **Ramp 3 (Southwest)**: **CRITICAL DEFECT DETECTED**. The slope formula in `WorldManager.js:1468-1470` is mathematically inverted relative to its geographical orientation. The valley entrance at $z = +2.0\text{m}$ rises to $3.5\text{m}$ (forming an impassable $3.5\text{m}$ vertical cliff against the valley floor at $0.0\text{m}$), while the plateau border at $z = -8.0\text{m}$ drops to $0.0\text{m}$ (forming a second impassable $3.5\text{m}$ vertical cliff against Plateau Southwest at $3.5\text{m}$). Ramp 3 forms an isolated depression that cannot be climbed from either side.
   - **Ramp 4 (Southeast)**: **CRITICAL DEFECT DETECTED**. The Suspension Bridge bounding box ($x \in [-6, 8], z \in [-18.8, -15.2], y = 3.55\text{m}$) directly overlaps the northern half and centerline ($z = -18.0\text{m}$) of Ramp 4 ($x \in [1, 11], z \in [-21.5, -14.5]$). Because `WorldManager.getGroundHeight` checks `this.bridge` before `this.ramps`, any player traversing Ramp 4 along its centerline is hijacked to $y = 3.55\text{m}$, creating an impassable $3.55\text{m}$ step at the ramp entrance ($x = 1.05\text{m}$) and an abrupt $1.08\text{m}$ drop mid-ramp at $x = 8.01\text{m}$.

Because Ramps 3 and 4 fail continuous traversal and trap the player, Milestone 2 cannot be approved in its current state.

---

## 2. Challenges & Empirical Defect Breakdown

### [Critical] Defect 1: Inverted Slope Formula on Ramp 3 (Southwest Plateau Access)

- **Assumption Challenged**: Ramp 3 allows players to walk from Valley floor ($0.0\text{m}$) up to Plateau Southwest ($3.5\text{m}$).
- **Root Cause & Code Location**:
  In `WorldManager.js:49-50`:
  ```javascript
  // Ramp 3: Valley (0m) -> Plateau Southwest (3.5m)
  { x: -18, z: -3, w: 7, d: 10, axis: 'z', startH: 0.0, endH: 3.5 },
  ```
  And in `WorldManager.js:1468-1470`:
  ```javascript
  if (r.axis === 'z') {
    const t = THREE.MathUtils.clamp((z - (r.z - halfD)) / r.d, 0, 1);
    return THREE.MathUtils.lerp(r.startH, r.endH, t);
  }
  ```
- **Mathematical Analysis**:
  - `r.z = -3`, `halfD = 5`, so $z$ spans from $z_{min} = -8.0\text{m}$ to $z_{max} = +2.0\text{m}$.
  - Plateau Southwest (`p_southwest`) is centered at $z = -16.0\text{m}$ with depth $22\text{m}$, spanning $z \in [-27.0, -5.0]\text{m}$ at elevation $3.5\text{m}$. It lies in the **negative Z** direction!
  - Valley floor is in the **positive Z** direction ($z > +2.0\text{m}$) at elevation $0.0\text{m}$.
  - When $z = -8.0\text{m}$ (touching Plateau Southwest): $t = \frac{-8 - (-8)}{10} = 0.0 \implies \text{height} = r.startH = 0.0\text{m}$.
  - When $z = +2.0\text{m}$ (touching Valley Floor): $t = \frac{2 - (-8)}{10} = 1.0 \implies \text{height} = r.endH = 3.5\text{m}$.
- **Empirical Measurement**:
  - `world.getGroundHeight(-18, 2.05) = 0.0m` (Valley Floor)
  - `world.getGroundHeight(-18, 2.00) = 3.5m` (Ramp 3 edge) $\implies \mathbf{\Delta y = 3.5m \gg 1.2m}$ (BLOCKED).
  - `world.getGroundHeight(-18, -8.00) = 0.0m` (Ramp 3 edge)
  - `world.getGroundHeight(-18, -8.05) = 3.5m` (Plateau edge) $\implies \mathbf{\Delta y = 3.5m \gg 1.2m}$ (BLOCKED).
- **Blast Radius**: Player attempting to ascend to Plateau Southwest via Ramp 3 hits a 3.5m stone wall and is completely prevented from entering the ramp. If falling onto Ramp 3 from above, the player is trapped inside a 3.5m pit.
- **Recommended Remediation**:
  Invert `startH` and `endH` for Ramp 3 in `WorldManager.js:50` and `TerrainModel.RAMPS` in `tests/helpers/analytical_models.mjs`:
  ```javascript
  // Ramp 3: Valley (0m at +Z) -> Plateau Southwest (3.5m at -Z)
  { x: -18, z: -3, w: 7, d: 10, axis: 'z', startH: 3.5, endH: 0.0 },
  ```
  *(Or adjust the interpolation parameter `t` based on whether the ramp rises in +Z or -Z direction).*

---

### [Critical] Defect 2: Suspension Bridge Bounding Box Collides with Ramp 4 Centerline (Southeast Plateau Access)

- **Assumption Challenged**: Ramp 4 allows continuous, smooth ascent from Valley floor ($0.0\text{m}$) to Plateau Southeast ($3.5\text{m}$) with per-frame $\Delta y < 0.2\text{m}$.
- **Root Cause & Code Location**:
  In `WorldManager.js:52-59`:
  ```javascript
  // Ramp 4: Valley (0m) -> Plateau Southeast (3.5m)
  { x: 6, z: -18, w: 10, d: 7, axis: 'x', startH: 0.0, endH: 3.5 },

  // Wooden Bridge: Spans between Plateau C and Plateau D at Tier 1 (y = 3.5m)
  this.bridge = {
    x: 1, z: -17, w: 14, d: 3.6, height: 3.55
  };
  ```
  And in `WorldManager.js:1456-1466`:
  ```javascript
  getGroundHeight(x, z) {
    // 1. Check Suspension Bridge (allows walking across canyon at y = 3.55)
    const b = this.bridge;
    if (x >= b.x - b.w / 2 && x <= b.x + b.w / 2 && z >= b.z - b.d / 2 && z <= b.z + b.d / 2) {
      return b.height;
    }

    // 2. Check Ramps
    for (const r of this.ramps) { ... }
  ```
- **Spatial Geometry Conflict**:
  - Ramp 4 is centered at $(x = 6.0, z = -18.0)$, with $w = 10\text{m}$ (along X) and $d = 7\text{m}$ (along Z).
    - Ramp 4 bounds: $x \in [1.0, 11.0]\text{m}$, $z \in [-21.5, -14.5]\text{m}$.
  - The Suspension Bridge is centered at $(x = 1.0, z = -17.0)$, with $w = 14\text{m}$ and $d = 3.6\text{m}$.
    - Bridge bounds: $x \in [-6.0, 8.0]\text{m}$, $z \in [-18.8, -15.2]\text{m}$.
  - The entire northern half of Ramp 4, including its exact centerline ($z = -18.0\text{m}$) from $x = 1.0\text{m}$ to $x = 8.0\text{m}$, lies inside the Bridge bounding box!
  - Because `this.bridge` is evaluated in step 1 before `this.ramps` in step 2:
    - At $x \in [1.0, 8.0]\text{m}$ along $z = -18.0\text{m}$, `getGroundHeight` returns $3.55\text{m}$ instead of the ramp's incline ($0.0\text{m} \to 2.45\text{m}$).
- **Empirical Measurement**:
  - `world.getGroundHeight(0.95, -18.0) = 0.0m` (Valley Floor)
  - `world.getGroundHeight(1.05, -18.0) = 3.55m` (Bridge override) $\implies \mathbf{\Delta y = 3.55m \gg 1.2m}$ (BLOCKED).
  - Mid-ramp at $x = 8.0\text{m}$:
    - `world.getGroundHeight(7.99, -18.0) = 3.55m`
    - `world.getGroundHeight(8.05, -18.0) = 2.47m` $\implies \mathbf{\text{Discontinuous drop of } 1.08m}$!
  - Transverse cross-section of Ramp 4 at $x = 2.0\text{m}$:
    - At $z = -20.0\text{m}$ (outside bridge): $y = 0.35\text{m}$
    - At $z = -18.0\text{m}$ (inside bridge): $y = 3.55\text{m} \implies \mathbf{3.20m \text{ vertical cliff across the ramp width!}}$
- **Blast Radius**: Any player attempting to walk up Ramp 4 along its centerline $z = -18.0\text{m}$ is completely blocked by a $3.55\text{m}$ barrier. A player walking diagonally hits a $3.2\text{m}$ cliff or experiences a $1.08\text{m}$ drop mid-ramp.
- **Recommended Remediation**:
  1. Offset Ramp 4 southward to clear the bridge (e.g. shift Ramp 4 center from $z = -18.0$ to $z = -22.0$ with $d = 6$, leaving $>0.5\text{m}$ gap to the bridge edge $z = -18.8$).
  2. Alternatively, narrow the bridge depth from $d = 3.6$ to $d = 2.4$ (spanning $z \in [-18.2, -15.8]$) and offset Ramp 4 to $z = -21.0$.
  3. Ensure in `getGroundHeight` that ramp queries take precedence over bridge bounds in areas where canyon floor access is intended, or ensure zero spatial intersection between bridge and ramp bounding boxes.

---

## 3. Stress Test Results Summary

Executed via: `node --test tests/stress/m2_challenger_terrain_stress.test.mjs`

| # | Test Scenario | Expected Behavior | Actual Behavior | Result |
|---|---------------|-------------------|-----------------|:------:|
| 1 | Double-Containment Clamping (1,000 coords) | Clamped to $[-41.5, 41.5]$ | Max coord $41.500000\text{m}$; zero breach | **PASS** |
| 2 | High-Velocity Escape (500 frames @ 100 m/s) | Clamped to $[-41.5, 41.5]$ | Zero tunneling; strictly arrested at boundary | **PASS** |
| 3 | Summit Glider Boundary Escape (5 flight paths) | Glider flight arrested at $41.5\text{m}$ | Glider stopped at $41.5\text{m}$; zero void-fall | **PASS** |
| 4 | Mountain Physical Barrier Clearance | Clearance $\ge 0.5\text{m}$, cliff height $\ge 2.9\text{m}$ | Clearance exactly $0.50\text{m}$; $h_1 \in [2.9, 4.3]\text{m}$ | **PASS** |
| 5 | Plateau Cliff Face Sampling (424 non-ramp points) | Step $> 1.2\text{m}$ everywhere | 100% of sample points have step $\ge 3.5\text{m}$ | **PASS** |
| 6 | Dynamic Cliff Face Collision (50 points) | Player velocity halted, position blocked | 50/50 approach attempts blocked; zero clipping | **PASS** |
| 7 | Plateau Downward Step-off (4 plateaus) | Player moves horizontally, lands cleanly | Airborne state triggered, landed on floor without tunneling | **PASS** |
| 8 | Ramp 1 (North) Traversal & Elevation Delta | Continuous $\Delta y < 0.2\text{m}$, 100% climb | $\Delta y < 0.06\text{m}$; 100% climb success | **PASS** |
| 9 | Ramp 2 (Peak) Traversal & Elevation Delta | Continuous $\Delta y < 0.2\text{m}$, 100% climb | $\Delta y < 0.06\text{m}$; 100% climb success | **PASS** |
| 10 | **Ramp 3 (Southwest) Traversal** | Continuous $\Delta y < 0.2\text{m}$, 100% climb | **Inverted slope: 3.5m wall at entrance and seam** | **DEFECT REPRODUCED** |
| 11 | **Ramp 4 (Southeast) Traversal** | Continuous $\Delta y < 0.2\text{m}$, 100% climb | **Bridge collision: 3.55m wall & 1.08m mid-ramp drop** | **DEFECT REPRODUCED** |
| 12 | Suspension Bridge Canyon Crossing | Supported at $y = 3.55\text{m}$ across canyon | Grounded at $3.55\text{m}$; crossed canyon to Plateau D | **PASS** |
| 13 | Ramp Seams Mathematical Continuity | Seam delta $< 0.05\text{m}$ | Ramps 1 & 2 continuous; Ramps 3 & 4 discontinuous | **PASS (Diagnostic)** |

---

## 4. Verdict & Next Steps

**VERDICT**: **CHALLENGE_FAILED**

The implementation of Milestone 2 cannot be approved due to the two critical defects identified above. Ramps 3 and 4 are fundamental navigational arteries connecting the central valley to the Southwest Overlook (Plateau C) and the Southeast Sunken Ruins (Plateau D). 

The worker agent (`worker_m2`) must remediate:
1. **Ramp 3**: Correct slope interpolation orientation between valley ($z \approx +2$) and Plateau Southwest ($z \approx -8$).
2. **Ramp 4 & Bridge**: Resolve the spatial bounding box conflict between the Suspension Bridge and Ramp 4 so the ramp is fully climbable along its entire width and centerline with smooth continuous gradient $\Delta y < 0.2\text{m}$.
