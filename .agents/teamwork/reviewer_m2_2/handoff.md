# Handoff Report: Milestone 2 Code Review & Adversarial Critique

**Author**: `reviewer_m2_2`  
**Roles**: Reviewer, Adversarial Critic  
**Date**: 2026-09-27T15:48:30Z  
**Verdict**: **REQUEST_CHANGES**

---

## 1. Observation

1. **Production Build (`npm run build`)**:
   - Command: `npm run build`
   - Result: Exit code 0, completed in 414ms. Output:
     ```
     dist/index.html                 15.34 kB │ gzip:   4.35 kB
     dist/assets/index-DKjY7ypP.js   73.79 kB │ gzip:  22.37 kB
     dist/assets/three-CVrJDboc.js  623.51 kB │ gzip: 156.98 kB
     ✓ built in 414ms
     ```
2. **Automated Test Suite Execution (`npm test`)**:
   - Command: `node --test tests/**/*.test.mjs`
   - Result: Exit code 1. 191 tests passed, 1 test failed:
     ```
     ✖ failing tests:
     test at tests\stress\m2_challenger_water_docks_stress.test.mjs:117:1
     ✖ Challenger 2.1: Exactly 70 pebbles rendered with valid instance matrices and zero NaNs (20.2758ms)
       AssertionError [ERR_ASSERTION]: Pebble 5 position (-25.1315975189209, -41.6342887878418) exceeds map boundary
     ```
3. **Ramp 3 Elevation Discontinuity Observation**:
   - Code: `src/game/WorldManager.js:49-50`:
     `{ x: -18, z: -3, w: 7, d: 10, axis: 'z', startH: 0.0, endH: 3.5 }`
   - Code: `src/game/WorldManager.js:1468-1473`:
     ```javascript
     if (r.axis === 'z') {
       const t = THREE.MathUtils.clamp((z - (r.z - halfD)) / r.d, 0, 1);
       return THREE.MathUtils.lerp(r.startH, r.endH, t);
     }
     ```
   - Evaluation at $z = +2$ (Valley seam): `t = (2 - (-8)) / 10 = 1.0` $\implies$ height is $3.5\text{m}$.
   - Evaluation at $z = -8$ (Plateau Southwest seam): `t = (-8 - (-8)) / 10 = 0.0` $\implies$ height is $0.0\text{m}$.
   - Empirical test: `tests/stress/m2_challenger_terrain_stress.test.mjs:584-588` observed:
     `r3ValleyDiff = 3.500m`, `r3PlateauDiff = 3.500m`.
4. **Ramp 4 and Suspension Bridge Footprint Collision Observation**:
   - Code: `src/game/WorldManager.js:52-54`:
     `{ x: 6, z: -18, w: 10, d: 7, axis: 'x', startH: 0.0, endH: 3.5 }`
   - Code: `src/game/WorldManager.js:57-59`:
     `bridge = { x: 1, z: -17, w: 14, d: 3.6, height: 3.55 }`
   - Code: `src/game/WorldManager.js:1457-1476`: Bridge queried before Ramps in `getGroundHeight(x, z)`.
   - Bridge 2D bounds: $x \in [-6, 8], z \in [-18.8, -15.2]$.
   - Ramp 4 2D bounds: $x \in [1, 11], z \in [-21.5, -14.5]$.
   - Overlap at $x \in [1, 8], z \in [-18.8, -15.2]$.
   - At $x = 1.01, z = -18$ (Ramp 4 valley entrance): `getGroundHeight` returns $3.55\text{m}$ instead of $0.0035\text{m}$.
   - At $x = 8.07, z = -17$ (Plateau Southeast entrance past bridge): `getGroundHeight` returns $2.47\text{m}$ instead of $3.50\text{m}$.
5. **Dock 1 Placement Overlap with Plateau North Observation**:
   - Code: `src/game/WorldManager.js:721`:
     `{ x: -2.2, y: 0.12, z: 8.0, rotY: 0.35, w: 3.2, d: 1.8 }`
   - Code: `src/game/WorldManager.js:28-29`:
     `p_north = { id: 'p_north', x: -12, z: 18, w: 32, d: 26, height: 3.5 }`
   - Plateau North bounds: $x \in [-28, 4], z \in [5, 31]$.
   - Evaluation at Dock 1 coordinates $(-2.2, 8.0)$: `world.getGroundHeight(-2.2, 8.0) === 3.5`.
   - Empirical test: `tests/stress/m2_challenger_water_docks_stress.test.mjs:308-312, 362-366` observed player blocked at $z = 5.0\text{m}$ ($> 3\text{m}$ from dock) and snapped to $y = 3.5\text{m}$ when placed on dock.
6. **Water System Invariants Observation**:
   - Code: `src/game/WorldManager.js:594-614`: `this.waterMesh` is a Group with 5 children at $y = 0.04\text{m}$.
   - Geometries subdivided with $12 \times 24$ vertex resolution (1,625 vertices total).
   - In `world.update(delta, elapsed)`: Sinusoidal wave and ripple vertex displacements animate continuously with maximum observed displacement $0.048\text{m} \le 0.05\text{m}$.
   - Code: `src/game/Game.js:226-228`: `this.world.update(delta, elapsedSeconds)` is executed every frame in the main animation loop.

---

## 2. Logic Chain

1. **Ramp 3 Impassable Barrier**:
   - From Observation 3, Plateau Southwest is situated south of $z = -5$ ($z \in [-27, -5]$), while the valley floor is north ($z > 0$).
   - Ramp 3 spans $z \in [-8, +2]$.
   - Because $t = (z - (r.z - halfD)) / r.d$, $t = 1.0$ at the northern valley seam ($z = +2$) and $t = 0.0$ at the southern plateau seam ($z = -8$).
   - As a direct result, Ramp 3 reaches its maximum height of $3.5\text{m}$ in the valley (adjacent to $0.0\text{m}$ valley floor) and drops to $0.0\text{m}$ at the plateau edge (adjacent to $3.5\text{m}$ plateau).
   - Since $3.5\text{m} - 0.0\text{m} = 3.5\text{m} \gg 1.2\text{m}$ (maximum walkable step threshold in `Player3D.js:359`), the player cannot enter Ramp 3 from the valley or exit it onto Plateau Southwest.
2. **Ramp 4 Invisible Barrier & Plateau Hole**:
   - From Observation 4, the Suspension Bridge bounding box covers $x \in [-6, 8], z \in [-18.8, -15.2]$ at height $3.55\text{m}$.
   - Ramp 4 covers $x \in [1, 11], z \in [-21.5, -14.5]$.
   - In `WorldManager.getGroundHeight(x, z)`, the Bridge is checked before Ramps.
   - Therefore, at $x \in [1, 8]$ along $z = -18$ (the valley entrance of Ramp 4), `getGroundHeight` returns $3.55\text{m}$ instead of the ramp slope. Players walking along the valley floor to access Ramp 4 hit an invisible $3.55\text{m}$ vertical step.
   - For $x \in [8, 11]$ past the bridge, Ramp 4 extends into Plateau Southeast. Because Ramps are checked before Plateaus, `getGroundHeight` returns the ramp slope ($2.47\text{m}$) instead of the plateau height ($3.50\text{m}$), producing an artificial $1.08\text{m}$ drop on the plateau.
3. **Dock 1 Traversal Block & Elevation Glitch**:
   - From Observation 5, Dock 1 is located at $(-2.2, 8.0)$.
   - This point is enclosed within Plateau North ($x \in [-28, 4], z \in [5, 31]$).
   - `getGroundHeight` therefore evaluates $(-2.2, 8.0)$ as $3.5\text{m}$ rather than the valley riverbank height ($0.0\text{m}$ / $0.12\text{m}$).
   - Any player walking towards Dock 1 is halted at $z = 5.0\text{m}$ by the $3.5\text{m}$ cliff face, rendering Dock 1 completely inaccessible from the ground.
   - Any player spawned on Dock 1 is snapped to $y = 3.5\text{m}$, levitating $3.38\text{m}$ above the dock.
4. **Test Suite Failure via Boundary Breach**:
   - From Observation 2, `_buildRiverPebbles()` uses `Math.random()` to distribute 70 pebbles along river segments.
   - Segment 0 extends to the southwestern border. The unconstrained random displacement pushes pebble 5 to $z = -41.63\text{m}$, outside the $41.5\text{m}$ explorable boundary and into the boundary mountain geometry.
   - This assertion failure breaks `npm test`, violating the core requirement that all test suites pass.

---

## 3. Caveats

- `npm run build` succeeds cleanly without bundle or syntax errors.
- Visual elements (stepped mountain tiers, rock strata on plateaus, subdivided wave displacement, wooden docks, bridge geometry) conform to the visual style guidelines in PROJECT.md.
- The defects reside specifically in the mathematical coordinate definitions, bounding box intersections, and analytical height queries in `WorldManager.js`.

---

## 4. Conclusion

**Verdict: REQUEST_CHANGES**

Milestone 2 cannot be approved in its current state. The following remediations are required:
1. **Ramp 3**: Invert the slope equation or `startH`/`endH` assignment so that $z = +2$ is $0.0\text{m}$ and $z = -8$ is $3.5\text{m}$ in both `WorldManager.js` and `analytical_models.mjs`.
2. **Ramp 4 / Bridge**: Move Ramp 4 along Z away from the Bridge depth footprint $z \in [-18.8, -15.2]$ to eliminate the bounding box collision.
3. **Dock 1**: Relocate Dock 1 south of $z = 5.0\text{m}$ (e.g. $z \approx 3.5\text{m}$) so that it is situated entirely within the valley floor ($y = 0.0\text{m}$).
4. **Pebble Coordinates**: Clamp pebble instance positions to $|x|, |z| \le 41.0\text{m}$ in `_buildRiverPebbles()`.
5. **Test Suite**: Ensure `npm test` (`node --test tests/**/*.test.mjs`) passes with 100% success rate.

---

## 5. Verification Method

To verify whether changes address these findings:

1. **Run full automated test suite**:
   ```powershell
   node --test tests/**/*.test.mjs
   ```
   *Expected Result*: All 192+ tests pass with exit code 0.
2. **Run specific stress test suites**:
   ```powershell
   node --test tests/stress/m2_challenger_terrain_stress.test.mjs
   node --test tests/stress/m2_challenger_water_docks_stress.test.mjs
   ```
   *Expected Result*: All tests pass without assertion failures.
3. **Verify Ramp 3 climbing and seam continuity**:
   ```powershell
   node -e "import('./tests/helpers/test_fixtures.mjs').then(({ createTestWorld }) => { const { world } = createTestWorld(); console.log('R3 Valley z=2:', world.getGroundHeight(-18, 2), 'R3 Plateau z=-8:', world.getGroundHeight(-18, -8)); });"
   ```
   *Expected Result*: R3 Valley $z = 2$ returns $0.0\text{m}$; R3 Plateau $z = -8$ returns $3.5\text{m}$.
4. **Verify Ramp 4 entrance**:
   ```powershell
   node -e "import('./tests/helpers/test_fixtures.mjs').then(({ createTestWorld }) => { const { world } = createTestWorld(); console.log('R4 entrance x=1.01, z=-18:', world.getGroundHeight(1.01, -18)); });"
   ```
   *Expected Result*: Returns near $0.0\text{m}$, NOT $3.55\text{m}$.
5. **Verify Dock 1 ground height**:
   ```powershell
   node -e "import('./tests/helpers/test_fixtures.mjs').then(({ createTestWorld }) => { const { world } = createTestWorld(); const d = world.docks[0]; console.log('Dock 1 pos:', d.group.position, 'GroundH:', world.getGroundHeight(d.group.position.x, d.group.position.z)); });"
   ```
   *Expected Result*: Ground height at Dock 1 position returns $0.0\text{m}$, NOT $3.5\text{m}$.
