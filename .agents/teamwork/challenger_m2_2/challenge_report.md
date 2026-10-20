# Adversarial Challenge Report: Milestone 2 — River, Canyon, Pebbles & Docks

**Challenger**: `challenger_m2_2` (Adversarial Verification Challenger)  
**Date**: 2026-09-27T15:47:30Z  
**Target Milestone**: Milestone 2 (Environmental Detail & Landforms — River, Canyon, Pebbles, Docks)  
**Target Artifact**: `src/game/WorldManager.js`  
**Test Suite**: `tests/stress/m2_challenger_water_docks_stress.test.mjs`

---

## Challenge Summary

**Overall risk assessment**: **CRITICAL**

While mathematical displacement bounds for the water surface and bobbing amplitude for the rustic docks passed 10,000-step simulation tests with zero NaNs, and all 70 riverbed pebbles are structurally valid, **a critical gameplay and collision defect was empirically discovered in Dock 1**.

Specifically:
- **Dock 1 placement at `(-2.2, 0.12, 8.0)` collides directly with Plateau North (`p_north`)**. Plateau North spans $X \in [-28.0, 4.0]$ and $Z \in [5.0, 31.0]$ at elevation $Y = 3.5\text{m}$.
- Consequently, analytical ground query `world.getGroundHeight(-2.2, 8.0)` returns `3.5m` rather than valley floor `0.0m` (or dock deck `0.12m`).
- A sheer 3.5m vertical cliff face at $Z = 5.0\text{m}$ ($3.5\text{m} \gg 1.2\text{m}$ step threshold) **completely blocks the player from reaching Dock 1** from the Whispering Village / Crossroads / Spawn along the dedicated cobblestone pathway.
- If placed on Dock 1 at $Y = 0.12\text{m}$, the player is violently snapped 3.38m into mid-air to $Y = 3.5\text{m}$. Walking off southward triggers a 3.5m drop.

---

## Challenges

### [CRITICAL] Challenge 1: Dock 1 (`WorldManager.js:720`) Overlaps Plateau North (`WorldManager.js:29`), Blocking Player Access and Corrupting Ground Elevation

- **Assumption challenged**:  
  `worker_m2/handoff.md:49` asserts:  
  > *"Two rustic wooden docks provide riverbank access at $y = 0.12\text{m}$, easily stepped onto from valley floor ($0.0\text{m}$) with $\Delta y = 0.12\text{m} \ll 1.2\text{m}$."*  
  And `WorldManager.js:965` provides a cobblestone pathway explicitly designed to lead from Spawn `(0, 0)` to Dock 1 `(-2.2, 8.0)`.

- **Attack scenario**:  
  1. Inspect `WorldManager.js:27-39`:
     ```javascript
     this.plateaus = [
       // Plateau A: Large northern terrace (Tier 1: height 3.5m)
       { id: 'p_north', x: -12, z: 18, w: 32, d: 26, height: 3.5 },
       ...
     ];
     ```
     Bounding box of `p_north`:
     - $X_{\min} = -12 - 16 = -28.0$, $X_{\max} = -12 + 16 = +4.0$
     - $Z_{\min} = 18 - 13 = +5.0$, $Z_{\max} = 18 + 13 = +31.0$
     - Elevation: $Y = 3.5\text{m}$.
  2. Inspect `WorldManager.js:718-724`:
     ```javascript
     const dockConfigs = [
       // Dock 1: Central Valley crossing near Whispering Village (satisfies F8.6)
       { x: -2.2, y: 0.12, z: 8.0, rotY: 0.35, w: 3.2, d: 1.8 },
       ...
     ];
     ```
     Coordinates $(-2.2, 8.0)$ reside inside $X \in [-28, 4]$ and $Z \in [5, 31]$.
  3. Query `world.getGroundHeight(-2.2, 8.0)`: returns `3.5`!
  4. Drive a player controller (`Player3D.js`) from `(0, 0, 0)` along the vector towards `(-2.2, 0, 8.0)`.
     At $Z \approx 4.56\text{m}$ (approaching the $Z = 5.0\text{m}$ boundary), `nextGroundY` becomes $3.5\text{m}$.
     $\text{heightDiff} = 3.5\text{m} - 0.0\text{m} = 3.5\text{m} > 1.2\text{m}$.
     `Player3D.js:359-362` zeros horizontal velocity:
     ```javascript
     if (heightDiff > 1.2 && this.isGrounded) {
       this.velocity.x = 0;
       this.velocity.z = 0;
     }
     ```
     The player is permanently stopped at $Z = 4.56\text{m}$, $>3.0\text{m}$ away from Dock 1.
  5. If spawned directly on Dock 1 $(x = -2.2, y = 0.12, z = 8.0)$:
     `Player3D.js:389` checks `if (this.position.y <= groundY) { this.position.y = groundY; }`.
     The player instantly teleports up to $y = 3.5\text{m}$, floating 3.38m in the air above the dock deck.

- **Blast radius**:  
  - Complete failure of user requirement for Dock 1 traversal ("player can step onto/off docks cleanly").
  - Visual immersion breakage: Dock 1 sits visually at $Y = 0.12\text{m}$ while the underlying terrain query places the player at $Y = 3.5\text{m}$.
  - The cobblestone stepping stones at `[-1.7, 6.4]` and `[-2.2, 7.5]` are visually rendered at $Y = 0.02\text{m}$ while their analytical ground height is $3.5\text{m}$.
  - River segment 3 (`x: 0, z: 8, w: 9, d: 22`) also overlaps the south-eastern corner of Plateau North.

- **Mitigation (for Worker)**:  
  1. Relocate Dock 1 south of Plateau North into the open valley floor (e.g. $Z \le 4.0\text{m}$, such as $(-2.2, 0.12, 3.5)$) where $Z < 5.0\text{m}$, ensuring `getGroundHeight` evaluates to `0.0m`, OR
  2. Adjust Plateau North's southern boundary or carve an explicit river corridor in `getGroundHeight` so that river and dock coordinates return the true riverbank elevation ($0.0\text{m}$ or $0.12\text{m}$).

---

### [LOW / PASS] Challenge 2: Water Wave Displacement Numerical Stability & Bounds (10,000 Steps)

- **Assumption tested**:  
  Sinusoidal primary wave + ripple displacement in `WorldManager.update(delta, elapsed)` remains strictly bounded by $\le 0.05\text{m}$ with zero NaNs or infinities across extended simulation.
- **Attack scenario**:  
  Simulated 10,000 consecutive frames with $\Delta t = 0.016\text{s}$ across all 1,625 subdivided vertices ($5 \text{ segments} \times 13 \times 25 \text{ vertices}$). Tested timestamp extremes ($t \in [0, 10^6\text{s}]$) and irregular frame deltas ($\Delta t \in [0.001\text{s}, 0.5\text{s}]$).
- **Result**: **PASS**  
  - Max displacement observed: $0.047941\text{m} \le 0.05\text{m}$.
  - NaN count: 0 across $1.625 \times 10^7$ vertex evaluations.
  - Non-finite count: 0.

---

### [LOW / PASS] Challenge 3: Riverbed Pebbles Allocation & Transform Integrity

- **Assumption tested**:  
  70 pebbles rendered with valid instance matrices, bounding boxes, and zero NaNs.
- **Attack scenario**:  
  Decomposed all 70 instance matrices into position, quaternion, and scale vectors. Evaluated matrix determinants, scale positivity, non-degeneracy, and elevation confinement within the sunken riverbed.
- **Result**: **PASS**  
  - Total count: exactly 70.
  - All 70 matrices are non-singular ($\det \ge 0.027$).
  - Zero NaNs across all matrix elements, positions, quaternions, and scales.
  - All pebble elevations lie within $Y \in [-0.379\text{m}, -0.330\text{m}]$, firmly seated on the sunken riverbed floor (nominal $Y = -0.40\text{m}$).
  - Geometry bounding box is valid: $[-0.24, +0.24]^3$.

---

### [LOW / PASS] Challenge 4: Floating Dock Bobbing Amplitude (10,000 Steps)

- **Assumption tested**:  
  Floating dock vertical oscillation amplitude remains strictly bounded by $\le 0.04\text{m}$ with zero NaNs.
- **Attack scenario**:  
  Simulated 10,000 consecutive frames ($160\text{s}$ elapsed time). Monitored $\Delta Y = |y(t) - y_{\text{base}}|$ for both Dock 1 and Dock 2.
- **Result**: **PASS**  
  - Max bobbing amplitude observed: $0.005000\text{m} \le 0.04\text{m}$.
  - NaN count: 0.

---

## Stress Test Results

| Test ID | Scenario | Expected Behavior | Actual Behavior | Verdict |
|---|---|---|---|---|
| **Challenger 1.1** | 10,000 steps of `world.update(0.016, elapsed)` on 1,625 water vertices | Max disp $\le 0.05\text{m}$, 0 NaNs | Max disp $= 0.047941\text{m}$, 0 NaNs | **PASS** |
| **Challenger 1.2** | Timestamp extremes ($t = 0 \dots 10^6\text{s}$) & irregular $\Delta t$ ($0.001 \dots 0.5\text{s}$) | Stable wave displacement $\le 0.05\text{m}$, 0 NaNs | Stable, max disp $= 0.047839\text{m}$, 0 NaNs | **PASS** |
| **Challenger 2.1** | Decompose 70 pebble instance matrices | 70 instances, invertible, positive scale, $Y \in [-0.45, -0.25]$, 0 NaNs | 70 instances, det $> 0.027$, scale $> 0$, $Y \in [-0.38, -0.33]$, 0 NaNs | **PASS** |
| **Challenger 2.2** | Pebbles geometry bounding box & instance colors | Bounding box finite, 70 valid RGB color instances | Bounding box $[-0.24, 0.24]^3$, 70 valid RGB colors | **PASS** |
| **Challenger 3.1** | 10,000 steps of dock bobbing oscillation | Max amplitude $\le 0.04\text{m}$, 0 NaNs | Max amplitude $= 0.005000\text{m}$, 0 NaNs | **PASS** |
| **Challenger 4.1** | Player walks onto & off Dock 2 at $(14.5, -2.5)$ | Enters dock cleanly, remains grounded, exits cleanly | Traversed onto dock at $x=14.5$, exited to $x=12.5$ cleanly | **PASS** |
| **Challenger 4.2** | Player walks along cobblestone path from $(0, 0)$ to Dock 1 at $(-2.2, 8.0)$ | Player reaches dock deck cleanly | **BLOCKED** at $Z \approx 4.56\text{m}$ by $3.5\text{m}$ cliff of Plateau North | **FAIL (CRITICAL)** |
| **Challenger 4.3** | Spawn player on Dock 1 $(x=-2.2, y=0.12, z=8.0)$ | Player rests at dock deck height $y \approx 0.12\text{m}$ | **SNAPPED** to $y = 3.5\text{m}$ ($3.38\text{m}$ in mid-air above dock) | **FAIL (CRITICAL)** |

---

## Unchallenged Areas

- **Dynamic fluid swimming physics**: The current game engine does not support swimming or buoyancy for the player controller (water is visual-only, with canyon drop beneath). This was excluded as it is outside the Milestone 2 specification scope.
