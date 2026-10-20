# Changes Summary — Milestone 2 (worker_m2)

## 1. `src/game/WorldManager.js`
- **Imports**: Added `BufferGeometryUtils` from `'three/addons/utils/BufferGeometryUtils.js'`.
- **Constructor Materials**: Added shared, deduplicated materials:
  - `this.cliffDarkMat`: Dark basal foundation stone (`0x525c50`, roughness 0.95)
  - `this.cliffLightMat`: Sun-weathered sub-turf rim stone (`0x8a9987`, roughness 0.85)
  - `this.stoneStepMat`: Chiseled rock pavers (`0x7a6d59`, roughness 0.90)
  - `this.mountainRockMat`: Deep alpine granite slate (`0x526055`, roughness 0.90)
  - `this.mountainSnowMat`: Crisp alpine snow/frost (`0xdde6ed`, roughness 0.80)
  - `this.riverBedMat`: Dark wet silt and gravel (`0x3d473b`, roughness 0.90)
  - `this.pebbleMat`: Water-smoothed river stone (`0x626c70` palette, roughness 0.85)
  - `this.ropeMat`: Natural fiber mooring rope (`0xbaa482`, roughness 0.90)
- **Naturalized Stepped Mountain Boundaries (`_buildBoundaryMountains`)**:
  - Replaced the 4 flat 12m rectangular boundary boxes with 3-tier stepped mountain formations:
    - Tier 1: Foothill Cliff Base (2.9m–4.3m vertical cliff face > 1.2m step threshold, inner face at 42.0m, topped by horizontal grass shelf caps).
    - Tier 2: Mid Mountain Crag (6.7m–10.3m, stepped outward by 2.5m).
    - Tier 3: Alpine Mountain Peak Spires (12.0m–23.0m, 5-sided cones, stepped outward by 5.5m) with high-altitude snowcaps for peaks above 18m.
  - Four Corner Mountain Massifs: Massive 6-sided faceted pyramidal peak clusters (22m–25m summit height) at each map corner with snowcap cones, transforming the boxy corners into an organic amphitheater.
  - Geometry Batching: Merged all 186 mountain parts into exactly 3 draw calls (`rockMesh`, `grassMesh`, `snowMesh`) using `BufferGeometryUtils.mergeGeometries`, reducing draw calls from 4 to 3.
- **3-Tier Geological Rock Strata & Stepped Ramps (`_buildTieredPlateaus`, `_buildSteppedRamps`)**:
  - Replaced flat plateau boxes with 4-layer geological strata:
    - Stratum 1: Basal Bedrock Skirt (`cliffDarkMat`, flared foundation).
    - Stratum 2: Mid-Tier Sedimentary Body (`cliffMat`).
    - Stratum 3: Upper Weathered Rim (`cliffLightMat`).
    - Stratum 4: Overhanging Turf Cap (`grassMat`).
  - Added 4 faceted 45° chamfered rock buttresses (`cliffDarkMat`) per plateau to soften sharp 90° corners into natural rock shoulders.
  - Replaced flat ramp slabs with naturalized stepped ramps:
    - Continuous structural incline base slab (`rampMat`).
    - 10 stepped rock paver treads (`stoneStepMat`, rise 0.35m < 1.2m step threshold).
    - Flanking stone curbs / retaining parapets (`cliffDarkMat`) on both sides of each ramp.
- **Winding River, Canyon, Pebbles & Docks (`_buildRiver`, `_buildSunkenRiverbed`, `_buildRiverPebbles`, `_buildWoodenDocks`)**:
  - Subdivided water planes (`new THREE.PlaneGeometry(s.w, s.d, 12, 24)`) to enable smooth sinusoidal wave and ripple vertex displacement.
  - Preserved F8.1 invariant: `this.waterMesh` contains exactly 5 children at elevation $y = 0.04\text{m}$.
  - Added sunken riverbed trough (`this.riverBedMesh`) at $y = -0.40\text{m}$ with sloped left and right riverbank embankments rising to $+0.02\text{m}$.
  - Added 70 submerged water-smoothed river stones using a single `THREE.InstancedMesh` (`this.riverPebblesMesh`) with randomized scales and 5 distinct mineral colors.
  - Added 2 rustic wooden docks with staggered walkway planks, 4 submerged pilings driven into the riverbed, and mooring bollards with rope coils:
    - Dock 1: Central Valley crossing near Whispering Village (`(-2.2, 0.12, 8.0)`).
    - Dock 2: Southern canyon approach (`(14.5, 0.12, -2.5)`).
- **Per-Frame Simulation (`update(delta, elapsed)`)**:
  - Updates water plane vertex displacements using the primary wave + cross-ripple mathematical model adhering to `RiverModel` ($A \le 0.06\text{m}$).
  - Calls `geo.computeVertexNormals()` for real-time glistening specular highlights under directional sun lighting.
  - Subtle floating bobbing animation on wooden docks ($\Delta y \le 0.005\text{m}$).
- **Analytical Precision (`getGroundHeight`)**:
  - Strictly preserves valley floor at $0.0\text{m}$, bridge at $3.55\text{m}$, ramps at exact linear interpolation, and plateaus at $3.5\text{m}$ / $7.0\text{m}$.

## 2. `src/game/Game.js`
- **Render Loop Hook**: Added `this.world.update(delta, elapsedSeconds)` call in `Game._update(delta)` directly after atmosphere update, driving continuous wave ripples and dock bobbing in real time.

## 3. `tests/tier1_features/m2_environmental_features.test.mjs`
- Added 8 comprehensive verification test suites:
  - `M2.1`: Mountain boundaries merged into 3 draw calls with real vertex data and flat-shaded materials.
  - `M2.2`: 4 plateaus each with 4 strata layers + 4 corner buttresses (8 meshes each).
  - `M2.3`: 4 ramps each with base slab + 10 stone pavers + 2 curbs (13 meshes each).
  - `M2.4`: Subdivided water planes ($y = 0.04\text{m}$ invariant), sunken riverbed at $y = -0.40\text{m}$, and 70 instanced pebbles.
  - `M2.5`: 2 rustic wooden docks with planks, submerged pilings, bollards, and rope coils.
  - `M2.6`: Sinusoidal wave vertex displacement in `world.update()` adhering to amplitude bounds.
  - `M2.7`: Dock floating animation in `world.update()`.
  - `M2.8`: Material deduplication across all 13 core and geological materials.
