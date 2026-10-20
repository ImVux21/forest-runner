# Handoff Report: Milestone 2 Adversarial Challenge (Water, Canyon, Pebbles & Docks)

**Author**: `challenger_m2_2` (Adversarial Verification Challenger)  
**Milestone**: M2 (Environmental Detail & Landforms)  
**Date**: 2026-09-27T15:48:00Z  
**Verdict**: **CHALLENGE_FAILED**

---

## 1. Observation

1. **Water Surface Simulation**:
   - `WorldManager.js:1498-1529`: Implements 2-tier sinusoidal wave and ripple displacement:
     ```javascript
     const primary = ampPrimary * Math.sin(wx * freqPrimary + elapsed * speedPrimary) * Math.cos(wz * freqPrimary + elapsed * speedPrimary);
     const ripple = ampRipple * Math.sin((wx + wz) * freqRipple + elapsed * speedRipple) * Math.cos((wx - wz) * 0.8 + elapsed * 2.4);
     posAttr.setZ(i, primary + ripple);
     ```
     where `ampPrimary = 0.036`, `ampRipple = 0.012`.
   - Verified across 10,000 simulation steps in `tests/stress/m2_challenger_water_docks_stress.test.mjs` (test `Challenger 1.1`):
     - Maximum observed vertex displacement: `0.047941m` (strictly $\le 0.05\text{m}$).
     - Total vertices evaluated: `1,625` ($5 \text{ planes} \times 13 \times 25 \text{ vertices}$).
     - Zero NaNs, zero infinities across $1.625 \times 10^7$ vertex evaluations.

2. **Riverbed Pebbles**:
   - `WorldManager.js:663-715`: Instantiates 70 riverbed pebbles via `THREE.InstancedMesh(pebbleGeo, this.pebbleMat, 70)`.
   - Verified in test `Challenger 2.1`:
     - Exactly 70 instances with non-singular transformation matrices ($\det \ge 0.027$).
     - Decomposed scales are strictly positive ($s_x, s_y, s_z \in [0.3, 1.4]$).
     - Elevations are strictly confined to the sunken riverbed trough: $y \in [-0.379\text{m}, -0.330\text{m}]$.
     - Geometry bounding box is finite: $[-0.24, +0.24]^3$. Zero NaNs detected.

3. **Rustic Docks Oscillation**:
   - `WorldManager.js:1536-1537`: Implements dock bobbing animation:
     ```javascript
     dock.group.position.y = dock.baseY + Math.sin(elapsed * 1.5 + dock.index * 1.8) * 0.005;
     ```
   - Verified in test `Challenger 3.1`:
     - 10,000 steps executed with $\Delta t = 0.016\text{s}$.
     - Maximum bobbing amplitude: `0.005000m` (strictly $\le 0.04\text{m}$). Zero NaNs.

4. **Dock 1 Placement & Traversal Defect**:
   - `WorldManager.js:720`:
     ```javascript
     // Dock 1: Central Valley crossing near Whispering Village (satisfies F8.6)
     { x: -2.2, y: 0.12, z: 8.0, rotY: 0.35, w: 3.2, d: 1.8 }
     ```
   - `WorldManager.js:29`:
     ```javascript
     // Plateau A: Large northern terrace (Tier 1: height 3.5m)
     { id: 'p_north', x: -12, z: 18, w: 32, d: 26, height: 3.5 }
     ```
   - `WorldManager.js:1477-1488` (`getGroundHeight(x, z)`):
     - For `p_north`, bounding box check:
       $x \in [-12 - 16, -12 + 16] = [-28.0, +4.0]$
       $z \in [18 - 13, 18 + 13] = [+5.0, +31.0]$
     - When evaluated at Dock 1 coordinates $(-2.2, 8.0)$, `world.getGroundHeight(-2.2, 8.0)` returns `3.5`!
   - `Player3D.js:356-365`:
     ```javascript
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
   - In test `Challenger 4.2`: A player moving from Spawn `(0, 0)` towards Dock 1 `(-2.2, 8.0)` encounters `heightDiff = 3.5m > 1.2m` at $z = 5.0\text{m}$ and is physically blocked at $z = 4.56\text{m}$, remaining over 3.0m away from the dock.
   - In test `Challenger 4.3`: A player placed at Dock 1 $(x = -2.2, y = 0.12, z = 8.0)$ is snapped to $y = 3.5\text{m}$ (3.38m in the air above the dock).

---

## 2. Logic Chain

1. **Water Wave Compliance**:
   - `WorldManager.js:1499-1525` computes $z(t) = A_1 \sin(\dots)\cos(\dots) + A_2 \sin(\dots)\cos(\dots)$.
   - Since $|A_1 \sin(\dots)\cos(\dots)| \le A_1 = 0.036\text{m}$ and $|A_2 \sin(\dots)\cos(\dots)| \le A_2 = 0.012\text{m}$, the maximum theoretical displacement is $A_1 + A_2 = 0.048\text{m}$.
   - Empirical simulation over 10,000 steps reached $0.047941\text{m}$, confirming mathematical fidelity, strict adherence to $\le 0.05\text{m}$, and zero NaN corruption.

2. **Pebble Allocation Compliance**:
   - `WorldManager.js:664` instantiates 70 pebbles into `THREE.InstancedMesh`.
   - Each matrix was decomposed and checked; all are non-singular with valid orientation, scale, and positioned along the river canyon bed at $Y \in [-0.38\text{m}, -0.33\text{m}]$.

3. **Dock Bobbing Compliance**:
   - The bobbing formula uses amplitude $0.005\text{m}$, which is well within the required limit ($\le 0.04\text{m}$). 10,000 frames verified maximum oscillation of $0.005000\text{m}$ with zero NaNs.

4. **Failure of Traversal Contract at Dock 1**:
   - The user specification mandates: *"Rustic docks: verify both docks are positioned correctly, floating dock bobbing amplitude <= 0.04m, and player can step onto/off docks cleanly."*
   - Dock 1 is positioned at $X = -2.2, Z = 8.0$.
   - Plateau North (`p_north`) occupies the entire rectangular footprint $X \in [-28, 4]$ and $Z \in [5, 31]$ at elevation $Y = 3.5\text{m}$.
   - Because $(-2.2, 8.0)$ falls squarely inside this footprint, `WorldManager.getGroundHeight` identifies $(-2.2, 8.0)$ as belonging to Plateau North at $Y = 3.5\text{m}$.
   - A player walking from the village floor ($Y = 0.0\text{m}$) encounters a 3.5m vertical cliff at $Z = 5.0\text{m}$. Because $3.5\text{m} > 1.2\text{m}$ (the engine's walkable step limit), the player controller halts horizontal progress.
   - Therefore, the player cannot step onto Dock 1 from the valley floor.
   - If positioned directly on Dock 1, the player snaps to $Y = 3.5\text{m}$, hovering 3.38m above the dock surface.
   - Hence, Dock 1 fails the positioning correctness and clean stepping requirement.

---

## 3. Caveats

- Dock 2 at $(14.5, 0.12, -2.5)$ allows clean bidirectional player traversal without collision blockage. The issue is localized to Dock 1 and its overlap with the Plateau North bounding box.
- No source code changes were made, in strict adherence to the Challenger role constraints.

---

## 4. Conclusion

**Verdict**: **CHALLENGE_FAILED**

The implementation succeeds on water wave displacement bounds, pebble rendering integrity, and dock bobbing oscillation limits. However, it fails the critical gameplay traversal contract:
- **Dock 1 at `(-2.2, 0.12, 8.0)` cannot be stepped onto or off cleanly**.
- It is blocked by an impassable 3.5m cliff barrier caused by spatial overlap with Plateau North (`p_north`).
- Remediation is required by `worker_m2` to either relocate Dock 1 to $Z \le 4.0\text{m}$ in the open valley floor or carve out a riverbank exclusion zone in Plateau North's collision model.

---

## 5. Verification Method

1. **Run Challenger Water, Pebbles & Docks Stress Suite**:
   ```powershell
   node --test tests/stress/m2_challenger_water_docks_stress.test.mjs
   ```
   *Expected Result*: All 8 tests pass, proving:
   - 10,000 steps water displacement $\le 0.05\text{m}$ (0 NaNs).
   - 70 pebbles validated with valid instance matrices.
   - 10,000 steps dock bobbing amplitude $\le 0.04\text{m}$.
   - Test `Challenger 4.2` proves Dock 1 ground height is 3.5m and player traversal from spawn is blocked at $z = 4.56\text{m}$.
   - Test `Challenger 4.3` proves player placed at Dock 1 snaps 3.38m into mid-air.

2. **Run Full Test Suite**:
   ```powershell
   node --test tests/**/*.test.mjs
   ```
   *Expected Result*: 192 tests pass across all test suites.

3. **Run Production Build**:
   ```powershell
   npm run build
   ```
   *Expected Result*: Clean build in ~360ms with zero errors.
