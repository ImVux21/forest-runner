# Milestone 2 Code Review & Adversarial Stress Report

**Reviewer**: `reviewer_m2_1`  
**Milestone**: M2 (River, Canyon & Organic Stepped Terrain/Boundaries)  
**Date**: 2026-09-27T15:43:00Z  

---

## Review Summary

**Verdict**: **APPROVE**

Milestone 2 implementation satisfies all technical, architectural, and visual requirements specified in `ORIGINAL_REQUEST.md`, `PROJECT.md`, and the M2 review objectives. All 171 automated tests across 30 suites pass cleanly (0 failures), and `npm run build` completes with zero bundling errors. No integrity violations, shortcuts, facade implementations, or hardcoded mocks were detected.

---

## Detailed Findings & Feature Review

### 1. Boundary Mountains: 3-Tier Stepped Formation & Merged Geometries
- **Inspection (`src/game/WorldManager.js:448-575`)**:
  - Implemented 4 perimeter mountain ranges (North, South, East, West) with 10 segments each (~10.4m per segment) plus 4 massive corner mountain massifs.
  - **Tier 1 (Foothill Cliff Base)**: Box geometries with harmonic height variations between 2.9m and 4.3m (`h1 = 3.6 + Math.sin(seed * 1.5) * 0.7`) capped by a 0.3m alpine meadow shelf (`this.grassMat`).
  - **Tier 2 (Mid Mountain Crags)**: Box geometries stepped outward radially by 2.5m, rising 6.7m to 10.3m (`h2 = 8.5 + Math.cos(seed * 2.1) * 1.8`).
  - **Tier 3 (Alpine Mountain Peak Spires)**: 5-sided cone geometries stepped outward radially by 5.5m, rising up to 23.0m (`h3 = 17.5 + Math.sin(seed * 1.3) * 3.5 + Math.cos(seed * 2.7) * 2.0`). Peaks exceeding 18.0m are capped with crisp alpine snowcaps (`this.mountainSnowMat`).
  - **Corner Massifs**: 4 faceted 6-sided cone peaks reaching 22.0m to 25.0m elevation at $( \pm 47\text{m}, \pm 47\text{m} )$, each with 5.0m snowcap cones.
  - **Geometry Merging & Draw Call Optimization**: All 186 unmerged source geometries are merged into exactly 3 batched draw calls (`rockMesh` with `mountainRockMat`, `grassMesh` with `grassMat`, and `snowMesh` with `mountainSnowMat`) via `BufferGeometryUtils.mergeGeometries`. All temporary constituent geometries are explicitly disposed of via `g.dispose()`, preventing GPU memory leaks.
  - **Blocking Containment & Perimeter Integrity**:
    - Mountain base coordinate is at `baseCoord = half - 1.5 = 43.5m`.
    - Inner edge of the Tier 1 foothill cliff base begins at $|x|, |z| = 43.5 - 1.5 = 42.0\text{m}$.
    - `Player3D.js:351-353` enforces hard coordinate clamping to `halfBound = (mapSize / 2) - 3.5 = 41.5\text{m}`.
    - This provides a 0.5m buffer between the explorable boundary limit and the mountain cliff base, guaranteeing zero mesh clipping or boundary wall penetrations.
    - Even without the hard clamp, the Tier 1 cliff height ($2.9\text{m} - 4.3\text{m}$) far exceeds the $1.2\text{m}$ step threshold (`heightDiff > 1.2`), preventing horizontal passage.
    - Peak altitudes of 14m to 25m fully enclose the horizon, obscuring the skybox void even from the summit lookout tower ($y = 11.5\text{m}$).

### 2. Plateau Cliffs: Geological Rock Strata & Stepped Ramps
- **Inspection (`src/game/WorldManager.js:304-369`)**:
  - Replaced single monolithic 90° boxes with 4 stratified layers per plateau:
    - **Stratum 1 (Basal Bedrock Skirt)**: `this.cliffDarkMat` (`0x525c50`), flared by $+0.5\text{m}$, height $0.35h$.
    - **Stratum 2 (Mid-Tier Sedimentary Body)**: `this.cliffMat` (`0x768574`), un-flared, height $0.40h$.
    - **Stratum 3 (Upper Weathered Rim)**: `this.cliffLightMat` (`0x8a9987`), flared by $+0.1\text{m}$, height $0.25h$.
    - **Stratum 4 (Overhanging Grass Turf Cap)**: `this.grassMat` (`0x58aa32`), flared by $+0.45\text{m}$, thickness $0.22\text{m}$.
  - **45° Corner Buttresses**: 4 chamfered rock shoulder boxes (`1.6m x cornerH x 1.6m`, rotated by $\pi/4$) placed at each plateau corner, breaking rectangular silhouettes into natural faceted rock geology.
  - **Stepped Stone Paver Ramps (`WorldManager.js:372-444`)**:
    - Continuous incline base rotated to exact slope angle.
    - 10 chiseled stone pavers (`this.stoneStepMat`) along each ramp with step rise $\approx 0.35\text{m} \ll 1.2\text{m}$ step threshold, offset $+0.08\text{m}$ above the base to eliminate z-fighting.
    - Flanking stone curbs (`this.cliffDarkMat`) on both sides providing structural containment.

### 3. River Canyon, Pebbles, Docks & Animated Water
- **Inspection (`src/game/WorldManager.js:578-780, 1495-1548`)**:
  - River water planes subdivided into $12 \times 24$ vertex grids across all 5 segments, maintaining the baseline invariant `this.waterMesh` containing 5 children at $y = 0.04\text{m}$.
  - Continuous sunken riverbed trough at $y = -0.40\text{m}$ with angled embankments rising to $+0.02\text{m}$.
  - 70 instanced water-smoothed pebbles (`THREE.InstancedMesh`) scattered on the riverbed floor with multi-color slate/moss/amber palette.
  - 2 rustic wooden docks built with 8 planks, 4 pilings, mooring bollards, and coiled rope at $(-2.2, 0.12, 8.0)$ and $(14.5, 0.12, -2.5)$.
  - `world.update(delta, elapsed)` updates sinusoidal wave and ripple vertex displacements (amplitude $\le 0.048\text{m} \le 0.06\text{m}$) and subtle dock bobbing.
  - `Game.js:226-228` invokes `this.world.update(delta, elapsedSeconds)` in the main render loop.

### 4. Analytical Collision Integrity (`world.getGroundHeight(x, z)`)
- **Inspection (`src/game/WorldManager.js:1456-1491`)**:
  - Priority order strictly preserved:
    1. Bridge deck ($y = 3.55\text{m}$) for $x \in [-6, 8], z \in [-18.8, -15.2]$.
    2. Ramps 1-4 via normalized parameter $t = \text{clamp}(\dots, 0, 1)$ and `lerp(startH, endH, t)`.
    3. Plateaus North ($3.5\text{m}$), Peak ($7.0\text{m}$), Southwest ($3.5\text{m}$), Southeast ($3.5\text{m}$).
    4. Default fallback: Valley floor ($0.0\text{m}$).
  - Seamless elevation transitions verified:
    - Ramp 1: $0.0\text{m} \to 3.5\text{m}$ matches valley floor and North Plateau.
    - Ramp 2: $3.5\text{m} \to 7.0\text{m}$ matches North Plateau and Peak Summit.
    - Suspension bridge step onto plateaus is $3.55\text{m} - 3.50\text{m} = 0.05\text{m} \ll 1.2\text{m}$.
    - Out-of-bounds queries return $0.0\text{m}$ without errors or exceptions.

---

## Verified Claims

- **Claim 1 (worker_m2)**: Mountain geometries merged into 3 batched draw calls (`mountainRockMat`, `grassMat`, `mountainSnowMat`).  
  → **Verified**: Checked `WorldManager.js:549-574` and test `M2.1`. `world.mountainMeshes.length === 3` and vertex counts confirm merged geometry. **PASS**.
- **Claim 2 (worker_m2)**: Boundary mountains block player escape via $2.9\text{m}-4.3\text{m}$ cliff face and 41.5m player clamp.  
  → **Verified**: Checked `WorldManager.js:457, 473` and `Player3D.js:351-353` and tests `T2.1, T2.5`. **PASS**.
- **Claim 3 (worker_m2)**: Plateaus feature 4 geological strata and 45° corner buttresses.  
  → **Verified**: Checked `WorldManager.js:304-369` and test `M2.2`. 8 meshes per plateau group. **PASS**.
- **Claim 4 (worker_m2)**: Ramps feature 10 stone pavers and flanking curbs.  
  → **Verified**: Checked `WorldManager.js:372-444` and test `M2.3`. 13 meshes per ramp group. **PASS**.
- **Claim 5 (worker_m2)**: Subdivided river water planes, sunken canyon bed at $-0.40\text{m}$, 70 pebbles, and 2 docks.  
  → **Verified**: Checked `WorldManager.js:578-780` and tests `M2.4, M2.5`. **PASS**.
- **Claim 6 (worker_m2)**: Vertex wave displacement driven via `world.update()` in `Game.js`.  
  → **Verified**: Checked `Game.js:226-228`, `WorldManager.js:1495-1548`, and test `M2.6`. **PASS**.
- **Claim 7 (worker_m2)**: Analytical collision height in `world.getGroundHeight(x, z)` matches `TerrainModel`.  
  → **Verified**: Checked `WorldManager.js:1456-1491` and tests `F9.1` through `F9.6`. **PASS**.
- **Claim 8 (worker_m2)**: Build and test suites pass 100% cleanly.  
  → **Verified**: Ran `npm run build` (325ms, code 0) and `npm test` (171 tests passed, 0 failures, code 0). **PASS**.

---

## Adversarial Stress Testing & Attack Scenarios

### Challenge 1: Ramp-to-Plateau Boundary Precedence
- **Assumption**: Ramps overlapping plateau bounding boxes provide monotonic, smooth height queries without abrupt step cliffs.
- **Scenario**: Player ascends Ramp 2 from North Plateau ($x=0$) to Peak ($x=10$). Between $x=0$ and $x=4$, coordinates fall within North Plateau's bounding box ($[-28, 4]$); between $x=7$ and $x=10$, coordinates fall within Peak's bounding box ($[7, 29]$).
- **Result**: Because `getGroundHeight(x, z)` evaluates Ramps prior to Plateaus, Ramp 2's linear interpolation overrides the plateaus' flat heights throughout the ramp footprint. At $x=0$, ramp height is $3.5\text{m}$ (matching North Plateau); at $x=10$, ramp height is $7.0\text{m}$ (matching Peak). Transition step is precisely $0.0\text{m}$. **PASS**.

### Challenge 2: Boundary Collision Clipping & Glider High Altitude Escaping
- **Assumption**: A player paragliding from Peak Summit ($y=7.0\text{m}$) or Tower ($y=11.5\text{m}$) cannot escape or clip through the perimeter mountains.
- **Scenario**: Player glides with maximum sprint speed toward the outer perimeter.
- **Result**: `Player3D.js:352-353` clamps proposed coordinates to `[-41.5, 41.5]`. The mountain foothill cliff inner wall begins at coordinate $42.0\text{m}$, creating a permanent $0.5\text{m}$ safety void. Moreover, mountain ridges reach heights of $12\text{m}-25\text{m}$, ensuring complete visual occlusion of the outer void. **PASS**.

### Challenge 3: Negative Z Fall Off Bridge Into Canyon
- **Assumption**: Leaping or falling from the suspension bridge ($y=3.55\text{m}$) into the canyon river does not cause tunneling through the floor.
- **Scenario**: Player runs off the bridge railing at $(1, 3.55, -17)$ toward $z=-12$.
- **Result**: Once outside bridge depth $d=3.6\text{m}$ ($z \in [-18.8, -15.2]$), ground height drops to $0.0\text{m}$. Player falls and lands cleanly at $y=0.0\text{m}$ without penetration (`T3.4`). **PASS**.

---

## Integrity Check

- Hardcoded test outputs in source code: **None detected**.
- Facade or dummy implementations: **None detected**.
- Shortcuts bypassing core requirements: **None detected**.
- Fabricated verification outputs: **None detected**.
- Independent verification: **100% verified via direct CLI build and execution**.

---

## Final Recommendation
Milestone 2 is robust, high quality, and ready for Milestone 3 (Biomes & Landmark Architectures).
