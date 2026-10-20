# Handoff Report: Mountain Boundaries & Naturalized Stepped Perimeter

**Agent**: `explorer_m2_1`  
**Milestone**: M2 — River, Canyon & Organic Stepped Terrain/Boundaries  
**Type**: Hard (Task Complete)  
**Date**: 2026-09-27T15:19:30Z  
**Target File**: `src/game/WorldManager.js`  
**Working Directory**: `c:/Users/vuodo/software/forest-runner/.agents/teamwork/explorer_m2_1`

---

## 1. Observation

1. **Boundary Wall Code Location & Current Implementation**:
   - `src/game/WorldManager.js:196-219`:
     ```javascript
     // Mountain Boundaries
     this._buildBoundaryMountains(half);
     
     _buildBoundaryMountains(half) {
       const wallH = 12;
       const thickness = 6;
       const boundaryMat = new THREE.MeshStandardMaterial({ color: 0x4d6350, roughness: 0.95, flatShading: true });

       const borders = [
         { x: 0, z: -half, w: this.mapSize + thickness * 2, d: thickness },
         { x: 0, z: half, w: this.mapSize + thickness * 2, d: thickness },
         { x: -half, z: 0, w: thickness, d: this.mapSize + thickness * 2 },
         { x: half, z: 0, w: thickness, d: this.mapSize + thickness * 2 },
       ];

       borders.forEach(b => {
         const mesh = new THREE.Mesh(new THREE.BoxGeometry(b.w, wallH, b.d), boundaryMat);
         mesh.position.set(b.x, wallH / 2, b.z);
         mesh.castShadow = true;
         mesh.receiveShadow = true;
         this.scene.add(mesh);
       });
     }
     ```
   - *Line number reconciliation*: The dispatch requested inspection of lines 315–339. Lines 315–339 in `WorldManager.js` are mushroom cap decoration dots (`_buildBouncyMushrooms`). The actual boundary wall code is at lines 196–219.
   - The current walls are 4 individual flat `BoxGeometry` meshes with uniform height `12m`, uniform thickness `6m`, single color `0x4d6350`, and sharp 90° corner intersections.

2. **Player Movement, Clamping & Collision Thresholds**:
   - `src/game/Player3D.js:351-365`:
     ```javascript
     const halfBound = (world.mapSize / 2) - 3.5; // 41.5m
     const clampedX = THREE.MathUtils.clamp(nextX, -halfBound, halfBound);
     const clampedZ = THREE.MathUtils.clamp(nextZ, -halfBound, halfBound);

     // 5. Cliff Collision
     const nextGroundY = world.getGroundHeight(clampedX, clampedZ);
     const heightDiff = nextGroundY - this.position.y;

     if (heightDiff > 1.2 && this.isGrounded) {
       this.velocity.x = 0;
       this.velocity.z = 0;
     } else {
       this.position.x = clampedX;
       this.position.z = clampedZ;
     }
     ```
   - Maximum walkable step threshold is `1.2m`. Steps `heightDiff > 1.2m` block horizontal movement.
   - Horizontal coordinates are hard-clamped at `[-41.5, 41.5]` in both grounded and airborne states.
   - Map size is `90m`, so wall centers are at `±45m`. Inner edge of current 6m-thick wall is at `45 - 3 = 42.0m`. Clearance between player clamp (`41.5m`) and inner wall face (`42.0m`) is `0.5m`.

3. **Ground Height Query Contract**:
   - `tests/tier2_boundaries/coordinates_limits.test.mjs:65-72`:
     ```javascript
     test('T2.4: Out-of-bounds terrain query graceful return (valley fallback)', () => {
       const { world } = createTestWorld();
       assert.equal(world.getGroundHeight(500, 500), 0.0);
       assert.equal(world.getGroundHeight(-500, -500), 0.0);
       assert.equal(world.getGroundHeight(10000, 0), 0.0);
     });
     ```
   - `WorldManager.getGroundHeight(x, z)` must return `0.0` for out-of-bounds coordinates (valley fallback).

4. **Lighting & Shadow Environment**:
   - `src/game/Game.js:156-170`:
     - Fog: `new THREE.Fog(0x8cd2fc, 70, 160)` (fog starts at 70m, far distance 160m).
     - Directional Sun Shadow Camera: `left: -50, right: 50, top: 50, bottom: -50, near: 0.5, far: 180`, mapSize `2048x2048`, `PCFSoftShadowMap`.
     - Inner mountain tiers (`42m–48m`) sit directly inside the shadow camera frustum (`[-50, 50]`), enabling crisp, soft self-shadowing.

5. **Tool & Performance Verification**:
   - Tested procedural batching via Node:
     - `BufferGeometryUtils.mergeGeometries` successfully merged 124 rock pieces, 40 grass caps, and 22 snowcap pyramids into 3 `BufferGeometry` instances.
     - Total vertices: 4,430. Total triangles: ~2,800.
     - Elevation range: `0.0m` to `25.0m`.
     - Construction execution time: < 15ms.
   - Full test suite execution: `npm test` -> 163 tests passed, 0 failures.
   - Production build: `npm run build` -> succeeded in 1.16s.

---

## 2. Logic Chain

1. **Visual Need for Multi-Tier Stepped Geometry (Observ. 1, 4)**:
   - Monolithic 12m boxes look artificial and fail to occlude the void from the upcoming Summit Lookout Tower (elevation 11.5m).
   - Designing a 3-tier stepped formation (Tier 1: 3.5m–4.5m; Tier 2: 7.5m–11.5m; Tier 3: 14m–23.5m) creates authentic alpine stratification that naturally rises away from the valley floor and towers above the player.
   - Four corner massifs (height 22m–25m) at `(±46m, ±46m)` soften the 90° square boundary into an organic mountain amphitheater.

2. **Containment & Void Prevention Mechanics (Observ. 2, 3)**:
   - The first mountain tier begins at `dist = 41.8m – 42.0m`, with a vertical cliff face rising `3.2m – 4.5m`.
   - Because `3.5m > 1.2m` (the maximum walkable step threshold), the step collision logic (`heightDiff > 1.2`) naturally and reliably rejects any forward player velocity at the boundary.
   - In mid-air, `Player3D.js` strictly clamps `nextX` and `nextZ` to `[-41.5, 41.5]`. Even during paraglider glides or mushroom spring launches, horizontal motion stops at 41.5m with a 0.3m–0.5m clearance before the rock geometry.
   - Keeping `WorldManager.getGroundHeight(x, z)` returning 0.0m for out-of-bounds queries satisfies test `T2.4`.

3. **Performance Optimization to 60 FPS (Observ. 1, 5)**:
   - Creating individual meshes for 186 rock components would consume ~96 draw calls, threatening the 120 draw call budget (`PROJECT.md §F15`).
   - By pre-merging all rock geometries into `mergedRockGeo` (with `this.mountainRockMat`), all shelf caps into `mergedGrassGeo` (with `this.grassMat`), and all snowcaps into `mergedSnowGeo` (with `this.mountainSnowMat`), the entire 360° perimeter requires **only 3 draw calls**.
   - This actually improves performance compared to the 4 draw calls of the legacy box walls, while rendering ~4,400 faceted vertices with zero runtime GC allocations.

---

## 3. Caveats

1. **Impassable Visual Perimeter**: The boundary mountains are non-walkable barrier scenery. The player is physically blocked at `dist = 41.5m`. If future milestones require climbing the outer mountains, dedicated ramp paths and analytical terrain height functions for the mountain slopes would need to be added to `getGroundHeight`.
2. **Lookout Tower Altitude Ceiling**: The mountain ridge peaks reach up to 25m. If future milestone implementations raise the Summit Lookout Tower beyond 22m, peak heights should be proportionally scaled to maintain skyline occlusion.
3. **Synchronous Initialization Requirement**: `_buildBoundaryMountains(half)` is called synchronously inside `_buildTerrain()`. It must not depend on asynchronous GLTF model loads, as test fixtures (`createTestWorld()`) invoke `_buildTerrain()` synchronously.

---

## 4. Conclusion

The legacy 12m flat boundary boxes should be replaced with the procedural 3-tier stepped mountain range detailed in `recommendation.md`:
- Tier 1 (3.5m–4.5m cliff + grass shelf cap) provides a step rise far exceeding the 1.2m blocking threshold.
- Tier 2 (7.5m–11.5m crags/buttresses) and Tier 3 (14m–23.5m alpine peaks + snowcaps) with 22m–25m corner massifs organically enclose the valley.
- Merged geometry using `BufferGeometryUtils.mergeGeometries` reduces draw calls from 4 to 3, locking 60 FPS.
- The concrete code is verified and ready for immediate implementation by `worker_m2`.

---

## 5. Verification Method

1. **Run Full Test Suite**:
   ```bash
   npm test
   ```
   *Expected*: All 163 tests pass with 0 failures, including `f07_stepped_cliffs.test.mjs`, `coordinates_limits.test.mjs`, `height_step_thresholds.test.mjs`, and `f15_performance_budget.test.mjs`.

2. **Verify Production Build**:
   ```bash
   npm run build
   ```
   *Expected*: Vite builds the client bundle cleanly with zero compilation errors.

3. **Verify Visual & Geometric Properties**:
   - Inspect `mergedRock.boundingBox`: Y max must be `>= 22.0m`, Y min must be `0.0m`.
   - Inspect draw calls: Total mountain mesh count added to `this.scene` must be exactly 3 (`this.mountainMeshes.length === 3`).
   - Inspect boundary coordinates: Inner face at `41.8m – 42.0m`, clearance to player clamp (41.5m) is `>= 0.3m`.
   - Invalidation conditions: Any test failure in `npm test` or bundle failure in `npm run build`.
