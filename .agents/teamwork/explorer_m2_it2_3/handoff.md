# Handoff Report: Pebble Coordinate Clamping & Test Suite Remediation

**Agent**: `explorer_m2_it2_3`  
**Milestone**: Milestone 2 Iteration 2  
**Working Directory**: `c:/Users/vuodo/software/forest-runner/.agents/teamwork/explorer_m2_it2_3`  
**Handoff Type**: Hard (Investigation & Design Complete)  
**Date**: 2026-09-27T15:58:30Z  

---

## 1. Observation

1. **Unconstrained Math.random() in WorldManager.js:686-691**:
   ```javascript
   for (let i = 0; i < countForSeg; i++) {
     const localX = (Math.random() - 0.5) * (s.w * 0.72);
     const localZ = (Math.random() - 0.5) * (s.d * 0.85);

     const wx = s.x + (localX * cosR - localZ * sinR);
     const wz = s.z + (localX * sinR + localZ * cosR);
     const wy = -0.38 + Math.random() * 0.05;
   ```
2. **Mathematical Extrema for River Segments (`WorldManager.js:583-589`)**:
   - Segment 0 (`s.x = -28, s.z = -32, s.w = 7, s.d = 24, rot = 0.4`):
     $\cos(0.4) \approx 0.92106$, $\sin(0.4) \approx 0.38942$.
     For `localX = -2.52` and `localZ = -10.20`:
     $$wz = -32 + (-2.52 \cdot 0.38942 - 10.20 \cdot 0.92106) = -42.376\text{m}$$
     Breaches map boundary $|z| \le 41.5\text{m}$ by $0.88\text{m}$.
   - Segment 4 (`s.x = 32, s.z = 20, s.w = 10, s.d = 28, rot = 0.6`):
     $\cos(0.6) \approx 0.82534$, $\sin(0.6) \approx 0.56464$.
     For `localX = +3.60` and `localZ = -11.90`:
     $$wx = 32 + (3.60 \cdot 0.82534 - (-11.90) \cdot 0.56464) = 41.690\text{m}$$
     Breaches map boundary $|x| \le 41.5\text{m}$ by $0.19\text{m}$.
3. **Flaky Assertion in `tests/stress/m2_challenger_water_docks_stress.test.mjs:168-171`**:
   ```javascript
   assert.ok(
     Math.abs(pos.x) <= 41.5 && Math.abs(pos.z) <= 41.5,
     `Pebble ${i} position (${pos.x}, ${pos.z}) exceeds map boundary`
   );
   ```
   Intermittently fails whenever `Math.random()` places a pebble at $z < -41.5\text{m}$ or $x > 41.5\text{m}$.
4. **Vulnerability Demonstration Tests in `tests/stress/m2_challenger_water_docks_stress.test.mjs:289-367`**:
   - `Challenger 4.2`: Asserts Dock 1 is at `(-2.2, 8.0)`, asserts ground height is $3.5\text{m}$, and asserts player is blocked before reaching dock.
   - `Challenger 4.3`: Asserts player spawned on Dock 1 snaps to $y = 3.5\text{m}$ in mid-air.
   - Once Dock 1 is relocated south of $z = 5.0\text{m}$, these tests will fail if they continue expecting defective behavior.
5. **Hardcoded Dock 1 Assertion in `tests/tier1_features/m2_environmental_features.test.mjs:138-139`**:
   ```javascript
   assert.ok(Math.abs(dock1.group.position.x - (-2.2)) < 0.1, 'Dock 1 X near -2.2');
   assert.ok(Math.abs(dock1.group.position.z - 8.0) < 0.1, 'Dock 1 Z near 8.0');
   ```

---

## 2. Logic Chain

1. **From Observation 1 & 2 to Pebble Containment**:
   Unconstrained random positioning along rotated river segments mathematically produces coordinates up to $|z| = 42.38\text{m}$ and $|x| = 41.69\text{m}$. Applying `THREE.MathUtils.clamp(wx, -40.5, 40.5)` and `THREE.MathUtils.clamp(wz, -40.5, 40.5)` guarantees that all 70 pebbles remain strictly within $[-40.5, 40.5]$, providing a 1.0m margin from the boundary wall ($41.5\text{m}$) and preventing rock mesh embedding.
2. **From Observation 1 & 3 to Deterministic PRNG**:
   Because `Math.random()` produces stochastic values, test execution is non-deterministic (tests pass on some runs and fail on others). Implementing Mulberry32 seeded at 42 ensures zero test flakiness, bitwise reproducibility across Node.js and web browsers, and identical visual pebble placement across game sessions.
3. **From Simulation to Matrix Invariance**:
   Simulating 70 pebbles with Mulberry32 and strict clamping confirmed:
   - $X \in [-32.24, 39.45]$, $Z \in [-40.50, 30.71]$, $Y \in [-0.379, -0.330]$.
   - Determinant $> 10^{-7}$, 0 NaNs, 0 zero/negative scale instances.
4. **From Observation 4 to Test Suite Remediation**:
   Challenger 4.2 and 4.3 were created to prove the existence of the Plateau North overlap defect. When Dock 1 is fixed, these tests must be converted to positive acceptance tests verifying clean player entry, grounding, departure, and absence of mid-air levitation.
5. **From Observation 5 to Implementation Coherence**:
   When `worker_m2` updates Dock 1's position based on `explorer_m2_it2_2`'s design, `tests/tier1_features/m2_environmental_features.test.mjs:138-139` must be updated concurrently to prevent secondary test failures.

---

## 3. Caveats

- **Dock 1 Exact Coordinates**: Dock 1's new target coordinates are being finalized by peer `explorer_m2_it2_2`. The proposed test remediation in `recommendation.md` dynamically reads `dock1.group.position` and asserts $z < 5.0\text{m}$, ground $= 0.0\text{m}$, and unobstructed navigation, making it resilient to any valid position selected by `explorer_m2_it2_2`.
- **Ramp 3 and Ramp 4 Work**: Handled by peer `explorer_m2_it2_1`. Once Ramp 3, Ramp 4, Dock 1, and pebbles are updated, the entire test suite will pass cleanly.

---

## 4. Conclusion

1. Implement Mulberry32 PRNG (seed 42) and clamp $|wx| \le 40.5, |wz| \le 40.5$ in `WorldManager.js:_buildRiverPebbles()`.
2. Update `tests/stress/m2_challenger_water_docks_stress.test.mjs`:
   - Tighten Challenger 2.1 assertion to $\le 40.5\text{m}$.
   - Add Challenger 2.3 for deterministic multi-instance matrix equality.
   - Refactor Challenger 4.2 and 4.3 from defect demonstrators to positive player traversal tests.
3. Synchronize `tests/tier1_features/m2_environmental_features.test.mjs:138-139` with the newly assigned Dock 1 coordinates.

---

## 5. Verification Method

1. **Verify Riverbed Pebbles & Docks Stress Tests**:
   ```bash
   node --test tests/stress/m2_challenger_water_docks_stress.test.mjs
   ```
   *Expected*: All 8 (or 9 with Challenger 2.3) tests pass cleanly.
2. **Verify Full Test Suite**:
   ```bash
   npm test
   ```
   *Expected*: 100% pass across all 192+ tests with exit code 0.
3. **Verify Build**:
   ```bash
   npm run build
   ```
   *Expected*: Build completes with 0 errors.
