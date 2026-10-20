# Code Review & Adversarial Stress Report: Milestone 2

**Reviewer**: `reviewer_m2_2`  
**Roles**: Reviewer, Adversarial Critic  
**Date**: 2026-09-27T15:48:00Z  
**Verdict**: **REQUEST_CHANGES**  
**Overall Risk Assessment**: **CRITICAL**

---

## 1. Executive Summary

Milestone 2 aims to introduce a living water system, sunken riverbed canyon, riverbed pebbles, rustic wooden docks, stepped plateau rock strata, and stepped boundary mountains.

While visual asset generation, geometry merging, and the 5-child water mesh invariant at $y = 0.04\text{m}$ have been implemented cleanly and `npm run build` passes without errors, **empirical execution of the test suite and adversarial stress testing uncovered four critical functional defects that break player navigation and cause test suite failure (`npm test` exits with code 1)**:

1. **Ramp 3 Slope Inversion**: Ramp 3 (Valley $\to$ Southwest Plateau) is mathematically inverted in `WorldManager.js:49-50` and `TerrainModel`. It rises to $3.5\text{m}$ in the valley and drops to $0.0\text{m}$ at the plateau, forming impassable $3.5\text{m}$ vertical step barriers at both seams.
2. **Ramp 4 / Suspension Bridge Bounding Box Collision**: Ramp 4 (Valley $\to$ Southeast Plateau) occupies the same coordinate footprint as the overhead Suspension Bridge ($x \in [1, 8], z \in [-18.8, -15.2]$). Because `WorldManager.getGroundHeight(x, z)` evaluates the Bridge before Ramps, the entrance to Ramp 4 in the valley returns $3.55\text{m}$, creating an invisible $3.55\text{m}$ vertical barrier. Furthermore, Ramp 4 undercuts Plateau Southeast at $x = 8.07$ by returning $2.47\text{m}$ instead of $3.50\text{m}$.
3. **Dock 1 Embedded Inside Plateau North**: Dock 1 is placed at $(-2.2, 0.12, 8.0)$. Plateau North extends across $x \in [-28, 4], z \in [5, 31]$ with height $3.5\text{m}$. Dock 1 is positioned inside Plateau North's rock mass; approaching players are blocked by a $3.5\text{m}$ cliff at $z = 5.0\text{m}$, and any player placed on Dock 1 is snapped $3.38\text{m}$ into mid-air.
4. **Test Suite Failure (`npm test` code 1)**: `_buildRiverPebbles()` uses unconstrained `Math.random()`, placing pebbles beyond the map boundary ($z = -41.63\text{m} < -41.5\text{m}$), causing `tests/stress/m2_challenger_water_docks_stress.test.mjs` to fail.

Due to these critical defects, work cannot be approved. Changes must be requested.

---

## 2. Findings & Defects

### [Critical] Finding 1: Ramp 3 Slope Inversion (Impassable 3.5m Wall)

- **Location**: `src/game/WorldManager.js:49-50`, `WorldManager.js:1468-1473`, and `tests/helpers/analytical_models.mjs:169, 189-196`.
- **Observed Code**:
  ```javascript
  // Ramp 3: Valley (0m) -> Plateau Southwest (3.5m)
  { x: -18, z: -3, w: 7, d: 10, axis: 'z', startH: 0.0, endH: 3.5 },
  ```
  And in `getGroundHeight(x, z)`:
  ```javascript
  if (r.axis === 'z') {
    const t = THREE.MathUtils.clamp((z - (r.z - halfD)) / r.d, 0, 1);
    return THREE.MathUtils.lerp(r.startH, r.endH, t);
  }
  ```
- **Why this is a problem**:
  - Plateau Southwest (Plateau C) is located at $z \in [-27, -5]$. The Valley is at $z > 0$.
  - Ramp 3 spans from $z = -8$ (connecting to Plateau Southwest) to $z = +2$ (connecting to the Valley).
  - When $z = +2$ (the valley end), $t = (2 - (-8)) / 10 = 1.0$, so ground height evaluates to $3.5\text{m}$! However, the adjacent valley floor is at $0.0\text{m}$, creating a $3.5\text{m}$ vertical step ($3.5\text{m} \gg 1.2\text{m}$ step threshold), physically blocking player entry.
  - When $z = -8$ (the plateau end), $t = (-8 - (-8)) / 10 = 0.0$, so ground height evaluates to $0.0\text{m}$! However, Plateau Southwest is at $3.5\text{m}$, creating another $3.5\text{m}$ cliff drop.
  - The ramp is 180° reversed relative to the valley and plateau layout.
- **Suggested Remediation**:
  - Invert the slope for Ramp 3 so that `startH: 3.5, endH: 0.0` or adjust the coordinate evaluation such that $z = -8$ yields $3.5\text{m}$ and $z = +2$ yields $0.0\text{m}$. Update both `WorldManager.js` and `analytical_models.mjs`.

---

### [Critical] Finding 2: Ramp 4 & Suspension Bridge 2D Footprint Collision

- **Location**: `src/game/WorldManager.js:52-54, 57-59`, `WorldManager.js:1457-1476`, and `tests/helpers/analytical_models.mjs:172, 175`.
- **Observed Code**:
  ```javascript
  // Ramp 4: Valley (0m) -> Plateau Southeast (3.5m)
  { x: 6, z: -18, w: 10, d: 7, axis: 'x', startH: 0.0, endH: 3.5 },
  // Wooden Bridge: Spans between Plateau C and Plateau D at Tier 1 (y = 3.5m)
  this.bridge = {
    x: 1, z: -17, w: 14, d: 3.6, height: 3.55
  };
  ```
- **Why this is a problem**:
  - The Bridge bounding box covers $x \in [-6, 8], z \in [-18.8, -15.2]$.
  - Ramp 4 covers $x \in [1, 11], z \in [-21.5, -14.5]$.
  - Because `WorldManager.getGroundHeight(x, z)` queries the Bridge *first*:
    1. For $x \in [1, 8]$ at $z = -18$ (the valley entrance of Ramp 4), `getGroundHeight` matches the overhead bridge and returns $y = 3.55\text{m}$ instead of the ramp slope ($0.0\text{m} \to 2.45\text{m}$). A player walking at valley level hits an invisible $3.55\text{m}$ barrier at $x = 1.0$.
    2. At $x = 8.07$ (past the bridge on Plateau Southeast, which has flat elevation $3.50\text{m}$), Ramp 4 extends to $x = 11$. Because Ramps are checked before Plateaus, `getGroundHeight(8.07, -17)` returns $2.47\text{m}$ instead of $3.50\text{m}$, creating a $1.08\text{m}$ sunken trench on the plateau.
- **Suggested Remediation**:
  - Relocate Ramp 4 along Z so it does not overlap the Bridge's depth corridor $z \in [-18.8, -15.2]$ (e.g., place Ramp 4 on the north or east approach of Plateau Southeast, such as $z = -10$ or $x = 20, z = -5$).
  - Alternatively, make `getGroundHeight(x, z, currentY)` 3D-aware if multi-level overlapping structures are required, or strictly separate horizontal footprints of ramps and bridges.

---

### [Critical] Finding 3: Dock 1 Placed Inside Plateau North Cliff

- **Location**: `src/game/WorldManager.js:721`, `WorldManager.js:28-29`.
- **Observed Code**:
  ```javascript
  // Dock 1: Central Valley crossing near Whispering Village (satisfies F8.6)
  { x: -2.2, y: 0.12, z: 8.0, rotY: 0.35, w: 3.2, d: 1.8 },
  // Plateau North bounds:
  { id: 'p_north', x: -12, z: 18, w: 32, d: 26, height: 3.5 },
  ```
- **Why this is a problem**:
  - Plateau North's X range is $[-28.0, +4.0]$ and Z range is $[+5.0, +31.0]$.
  - Dock 1 is positioned at $(-2.2, 8.0)$, which lies squarely inside Plateau North's bounding box!
  - `getGroundHeight(-2.2, 8.0)` returns $3.5\text{m}$ rather than the river/valley elevation ($0.0\text{m}$ or $0.12\text{m}$).
  - A player walking from Whispering Village / spawn at $(0, 0)$ towards Dock 1 is blocked by a $3.5\text{m}$ cliff at $z = 5.0\text{m}$ ($> 3.0\text{m}$ away from the dock).
  - If a player is spawned or steps onto Dock 1, physics snaps the player to $y = 3.5\text{m}$, levitating $3.38\text{m}$ above the dock deck.
- **Suggested Remediation**:
  - Move Dock 1 outside Plateau North's southern cliff ($z < 5.0$, e.g. at $(0.0, 0.12, 3.5)$ or $(-6.0, 0.12, 4.0)$ along the river curve) where ground height is reliably $0.0\text{m}$.

---

### [Critical] Finding 4: Riverbed Pebble Coordinates Exceed Explorable Bounds (`npm test` Failure)

- **Location**: `src/game/WorldManager.js:686-691`, `tests/stress/m2_challenger_water_docks_stress.test.mjs:168-171`.
- **Observed Code**:
  ```javascript
  const localX = (Math.random() - 0.5) * (s.w * 0.72);
  const localZ = (Math.random() - 0.5) * (s.d * 0.85);

  const wx = s.x + (localX * cosR - localZ * sinR);
  const wz = s.z + (localX * sinR + localZ * cosR);
  ```
- **Why this is a problem**:
  - Segment 0 is centered at $(-28, -32)$ with depth $d = 24$ and rotation $0.4\text{rad}$.
  - The unconstrained random offset causes pebbles to spawn at $z \approx -41.63\text{m}$, breaching the explorable boundary of $41.5\text{m}$ and embedding pebbles into the mountain boundary wall.
  - This directly causes `Challenger 2.1` to throw an `AssertionError` in `tests/stress/m2_challenger_water_docks_stress.test.mjs`, making `npm test` fail with exit code 1.
  - Furthermore, using unseeded `Math.random()` causes non-deterministic visual prop placement across sessions.
- **Suggested Remediation**:
  - Clamp generated pebble coordinates to `[-41.0, 41.0]` or scale segment offsets so that `|wx| <= 41.0` and `|wz| <= 41.0`.
  - Use a deterministic seeded PRNG for consistent placement.

---

### [Major] Finding 5: CPU Performance Overhead from Per-Frame Vertex Displacement

- **Location**: `src/game/WorldManager.js:1499-1530`.
- **Observed Code**:
  - Iterates over 5 water meshes $\times 13 \times 25 = 1,625$ vertices in JavaScript on every frame.
  - Calls `posAttr.getX()`, `posAttr.getY()`, multiple trigonometric functions (`Math.sin`, `Math.cos`), `posAttr.setZ()`, sets `posAttr.needsUpdate = true`, and executes `geo.computeVertexNormals()` for all 5 meshes every frame.
- **Why this is a problem**:
  - While it fits within the 16.6ms frame budget on powerful desktop CPUs, running 1,625 trigonometric calculations and recomputing vertex normals on 5 separate BufferGeometries on the CPU causes unnecessary garbage collection and frame pacing jitter on mobile or lower-spec devices.
- **Suggested Remediation**:
  - For Milestone 4 optimization, consider driving water wave displacement via a vertex shader on the GPU (or only recomputing vertex normals every $N$ frames or caching precomputed normal tables).

---

## 3. Verification of Requirements & Invariants

| Requirement / Invariant | Status | Evidence |
|---|---|---|
| **5-child `world.waterMesh` at $y = 0.04\text{m}$** | **PASS** | `world.waterMesh.children.length === 5`, all child mesh positions at $y = 0.04\text{m}$. Subdivided into $12 \times 24$ grids. |
| **Sinusoidal wave and ripple vertex displacement** | **PASS** | `world.update(delta, elapsed)` dynamically displaces vertices with amplitude $0.048\text{m} \le 0.06\text{m}$ max bound. |
| **Sunken riverbed canyon at $y = -0.40\text{m}$** | **PASS** | `world.riverBedMesh` has 5 segment groups with floor at $y = -0.40\text{m}$ and angled embankments up to $+0.02\text{m}$. |
| **70 instanced pebbles** | **FAIL** | 70 instances exist in `THREE.InstancedMesh`, but pebbles spawn out of boundary ($z = -41.63\text{m}$), failing automated tests. |
| **2 rustic wooden docks** | **FAIL** | Dock 2 at $(14.5, 0.12, -2.5)$ functions properly; Dock 1 at $(-2.2, 0.12, 8.0)$ is buried inside Plateau North, impassable and levitating. |
| **Suspension bridge at $y = 3.55\text{m}$** | **PASS (Visuals) / FAIL (Path)** | Visual structure spans $14\text{m}$ with 14 planks, upright posts, ropes, and $3.51\text{m}$ clearance over water. However, its 2D footprint conflicts with Ramp 4. |
| **Stepped ramps traversal** | **FAIL** | Ramp 1 & Ramp 2 climb cleanly. Ramp 3 has inverted slope ($3.5\text{m}$ cliff). Ramp 4 blocked by bridge bounding box overlap. |
| **`npm run build`** | **PASS** | Vite production build finishes with 0 errors in 414ms. |
| **`npm test`** | **FAIL** | Full test suite exits with code 1 due to `m2_challenger_water_docks_stress.test.mjs:168`. |

---

## 4. Adversarial Stress-Test Summary

- **Double Containment Stress**: Passed. Hard boundary clamping at $|x|, |z| \le 41.5\text{m}$ with mountain barrier inner edge at $42.0\text{m}$ reliably contains 500 frames of $100\text{m/s}$ velocity and high-altitude glider flights.
- **Plateau Cliff Blocking**: Passed. All non-ramp perimeter points have step $> 1.2\text{m}$ ($2.9\text{m} \to 4.3\text{m}$), blocking horizontal traversal.
- **Ramp Traversal & Seam Continuity**: FAILED.
  - Ramp 3: Inverted slope produces $3.5\text{m}$ discontinuity at valley entrance and plateau seam.
  - Ramp 4: Bridge bounding box collision creates $3.55\text{m}$ discontinuity at ramp entrance.
- **Dock Player Access**: FAILED.
  - Dock 1: Player blocked $> 3.0\text{m}$ away by Plateau North boundary cliff.
- **Pebble Boundary Clamping**: FAILED.
  - Pebble 5 spawned at $z = -41.63\text{m}$, exceeding map boundary limits.

---

## 5. Verdict & Required Actions

**Verdict**: **REQUEST_CHANGES**

### Action Items for `worker_m2`:
1. **Fix Ramp 3**: Reverse Ramp 3 slope so that $z = +2$ (valley) is $0.0\text{m}$ and $z = -8$ (Plateau Southwest) is $3.5\text{m}$. Update both `WorldManager.js` and `analytical_models.mjs`.
2. **Fix Ramp 4 & Bridge Conflict**: Displace Ramp 4 away from the bridge depth corridor $z \in [-18.8, -15.2]$ so that Ramp 4 and Bridge bounding boxes do not intersect. Ensure Ramp 4 terminates smoothly at Plateau Southeast.
3. **Relocate Dock 1**: Move Dock 1 south of $z = 5.0$ (e.g., $z \approx 3.5$) along the river curve so that it sits entirely in the valley floor ($0.0\text{m}$) outside Plateau North.
4. **Constrain Riverbed Pebbles**: Clamp pebble coordinates in `_buildRiverPebbles()` within $|x|, |z| \le 41.0\text{m}$ so that no pebbles spawn out of bounds or inside perimeter rock walls.
5. **Verify Full Test Pass**: Ensure `npm test` (`node --test tests/**/*.test.mjs`) exits with code 0 and all tests pass cleanly.
