# Adversarial Challenge Report — Milestone 2 Iteration 2

**Challenger**: `challenger_m2_it2_2` (Empirical Challenger)  
**Roles**: critic, specialist  
**Timestamp**: 2026-09-27T16:14:00Z  
**Working Directory**: `c:/Users/vuodo/software/forest-runner/.agents/teamwork/challenger_m2_it2_2`  
**Target Under Review**: Remediated Dock 1 and Riverbed Pebbles (`src/game/WorldManager.js`, `tests/stress/m2_challenger_water_docks_stress.test.mjs`)  

---

## Executive Summary & Verdict

### Explicit Verdict: **APPROVE**

The remediated Dock 1 placement, approach path terrain, and riverbed pebble instancing system in `src/game/WorldManager.js` withstand all adversarial stress tests, boundary conditions, and mathematical invariant checks:
1. **Ground Height Invariant**: `world.getGroundHeight(x, z)` returns strictly $0.0\text{m}$ across all 600+ sampled points within the rotated Dock 1 footprint and 100+ points across the village approach corridor.
2. **Traversal & Grounding Integrity**: Simulated player movement onto Dock 1 from 4 independent directions (South, East, West, Spawn/SE) achieves clean stepping without collision blockage. Player elevation remains at valley floor ($0.0\text{m}$), visual deck height is $0.12\text{m} \pm 0.005\text{m} \le 0.20\text{m}$, and zero mid-air levitation or snapping occurs.
3. **Pebble Determinism & Strict Bounds**: Instantiating multiple independent `WorldManager` instances demonstrates bit-exact matrix equality across all 70 pebbles ($70 \times 16 = 1120$ float values). Mulberry32 PRNG and hard clamping strictly bound all pebble coordinates to $[-40.5, 40.5]\text{m}$, guaranteeing a minimum $1.0\text{m}$ clearance buffer inside the $\pm 41.5\text{m}$ boundary wall.

---

## 1. Challenge Assessment Matrix

| Challenge ID | Target Property | Adversarial Stress Vector | Observed Behavior | Status |
|---|---|---|---|---|
| **CH-DOCK-01** | Dock 1 Ground Flattening | Dense 2D grid sampling (0.1m step) across rotated footprint | All points return $h = 0.000\text{m}$ | **PASS** |
| **CH-DOCK-02** | Village Approach Corridor | Lateral swath $\pm 1.0\text{m}$ along Spawn-to-Dock path | All points return $h = 0.000\text{m}$ | **PASS** |
| **CH-DOCK-03** | Multi-Directional Traversal | Player approaches from South, East, West, and SE Spawn path | Grounded at all steps, zero blockage | **PASS** |
| **CH-DOCK-04** | Deck Elevation & Levitation | Player spawn on deck, 100-step physics run | Deck $y \in [0.115, 0.125]\text{m} \le 0.20\text{m}$, zero cliff snap | **PASS** |
| **CH-PEBBLE-01** | Multi-Instance Determinism | 3 independent `WorldManager` instances, all 16 matrix elements | 100% bit-exact matrix identity | **PASS** |
| **CH-PEBBLE-02** | Explorable Boundary Confinement | Extreme coordinate evaluation across all 70 pebbles | $\max(\|x\|, \|z\|) \le 40.50\text{m}$, buffer $\ge 1.0\text{m}$ | **PASS** |
| **CH-PEBBLE-03** | Submergence & Non-Degeneracy | Elevation Y and matrix determinant | $y \in [-0.43, -0.33]\text{m} < 0.04\text{m}$, $\det \ne 0$ | **PASS** |

---

## 2. Detailed Findings

### 2.1 Dock 1 Footprint & Approach Path Flattening

#### Geometric & Mathematical Analysis
- Dock 1 is configured at:
  $$\text{Center}: (x_c, y_c, z_c) = (-2.2, 0.12, 3.5), \quad \theta = 0.35\text{ rad}, \quad w = 3.2\text{m}, \quad d = 1.8\text{m}$$
- The 4 local corners $(u, v) \in \{\pm 1.6, \pm 0.9\}$ map to world coordinates via:
  $$x_w = x_c + u \cos\theta + v \sin\theta$$
  $$z_w = z_c - u \sin\theta + v \cos\theta$$
- Given $\cos(0.35) \approx 0.939373$ and $\sin(0.35) \approx 0.342898$:
  - Corner 1 $(+1.6, +0.9)$: $x = -0.3884\text{m}, z = 3.7968\text{m}$
  - Corner 2 $(-1.6, +0.9)$: $x = -3.3944\text{m}, z = 4.8941\text{m}$
  - Corner 3 $(-1.6, -0.9)$: $x = -4.0116\text{m}, z = 3.2032\text{m}$
  - Corner 4 $(+1.6, -0.9)$: $x = -1.0056\text{m}, z = 2.1059\text{m}$
- **Extreme Footprint Extents**:
  $$x \in [-4.012\text{m}, -0.388\text{m}], \quad z \in [2.106\text{m}, 4.894\text{m}]$$
- **Clearance to Plateau North (`p_north`)**:
  - Plateau North occupies $x \in [-28.0, 4.0]\text{m}$ and $z \in [5.0, 31.0]\text{m}$ at elevation $3.5\text{m}$.
  - The maximum Z-extent of Dock 1 is $z_{\max} = 4.8941\text{m} < 5.0\text{m}$.
  - Clearance margin: $\Delta z = 5.0 - 4.8941 = 0.1059\text{m} > 0.10\text{m}$.
  - Clearance to Ramp 1 ($x \le -8.5\text{m}$): $\Delta x = -4.012 - (-8.5) = 4.488\text{m}$.
  - Clearance to Plateau C ($z \le -5.0\text{m}$): $\Delta z = 2.106 - (-5.0) = 7.106\text{m}$.
- **Grid Sampling**:
  - Over 627 discrete points sampled at $0.1\text{m}$ resolution across $(u, v)$ yield $h = 0.000\text{m}$ uniformly.
  - Stepping stone path from $(0, 0)$ via `[-0.5, 0.9]`, `[-1.0, 1.8]`, `[-1.5, 2.6]`, `[-2.0, 3.2]` to $(-2.2, 3.5)$ with $\pm 1.0\text{m}$ lateral margin yields $h = 0.000\text{m}$ across all 100+ sample points.

### 2.2 Player Traversal, Grounding & Zero Levitation

#### Dynamic Traversal Stress
- In `Player3D.js`, the step-climb threshold is $\Delta y \le 1.2\text{m}$.
- When approaching Dock 1 across valley floor ($y = 0.0\text{m}$):
  $$\Delta y = \text{nextGroundY} - \text{position.y} = 0.0\text{m} - 0.0\text{m} = 0.0\text{m} \ll 1.2\text{m}$$
- Tested 4 attack vectors:
  1. **South Approach** $(-2.2, 1.0) \to (-2.2, 3.5)$
  2. **East Approach** $(0.3, 3.5) \to (-2.2, 3.5)$
  3. **West Approach** $(-4.2, 3.5) \to (-2.2, 3.5)$
  4. **Spawn Path (SE)** $(0.0, 0.0) \to (-2.2, 3.5)$
- Across all 4 vectors, the player maintains `isGrounded === true` on every single physics frame ($0.05\text{s}$ step). Zero collision pauses, zero bounce, zero velocity stalls.

#### Deck Height & Levitation Immunity
- Visual deck height: $baseY = 0.12\text{m}$.
- Idle water bobbing amplitude: $\pm 0.005\text{m}$.
- Total deck elevation range: $[0.115\text{m}, 0.125\text{m}] \le 0.20\text{m}$.
- When spawning directly on the dock at $y = 0.12\text{m}$:
  $$\Delta y = |0.12 - 0.00| = 0.12\text{m} < 0.60\text{m} \quad (\text{Player3D snap threshold})$$
- The player smoothly attaches to ground level $y = 0.0\text{m}$ without launching or jittering.
- The previous defect where player snapped to $3.5\text{m}$ Plateau North (3.38m above deck) is 100% eliminated.

### 2.3 Riverbed Pebble Determinism & Spatial Confinement

#### Multi-Instance PRNG Determinism
- `WorldManager._buildRiverPebbles` initializes a local 32-bit Mulberry32 PRNG with `seed = 42`.
- Three separate `WorldManager` instances (`w1`, `w2`, `w3`) were generated and audited.
- Every instance generates identical 70 pebble matrices:
  $$\forall i \in [0, 69], \forall el \in [0, 15]: \quad M_{w1}[i][el] \equiv M_{w2}[i][el] \equiv M_{w3}[i][el]$$
- No cross-instance variation, no date/time dependence, and no global `Math.random()` leakage.

#### Spatial Bounds Audit
- The 5 river segments generate 14 pebbles each ($5 \times 14 = 70$).
- Raw coordinates are explicitly constrained via:
  $$wx = \text{clamp}(rawWx, -40.5, 40.5)$$
  $$wz = \text{clamp}(rawWz, -40.5, 40.5)$$
- Observed bounds across all 70 pebbles:
  $$\min(wx) \ge -40.50\text{m}, \quad \max(wx) \le 40.50\text{m}$$
  $$\min(wz) \ge -40.50\text{m}, \quad \max(wz) \le 40.50\text{m}$$
- Clearance relative to explorable player boundary ($\pm 41.5\text{m}$): $\Delta \ge 1.0\text{m}$.
- Clearance relative to mountain barrier wall ($\pm 42.0\text{m}$): $\Delta \ge 1.5\text{m}$.
- Vertical submergence: $wy \in [-0.38, -0.33]\text{m}$, resting on the sunken riverbed floor ($-0.40\text{m}$) and well below the water surface ($+0.04\text{m}$).

---

## 3. Unchallenged Areas

- **NPC Dialogue Triggers**: Interaction ranges for Finn, Bram, and Spirit remain governed by M3/M4 scopes and were not modified during M2 Iteration 2.
- **Atmospheric Spore/Pollen Particle Cycles**: Verified in M1 and unaffected by dock or pebble repositioning.

---

## 4. Conclusion & Sign-Off

The remediated implementation of Dock 1 and riverbed pebbles in `src/game/WorldManager.js` fully satisfies all functional, physical, and visual contracts:
- Deck height $\le 0.20\text{m}$ with zero levitation: **VERIFIED**.
- `world.getGroundHeight` strictly $0.0\text{m}$ across dock and approach path: **VERIFIED**.
- Deterministic 70-pebble instancing strictly inside $[-40.5, 40.5]\text{m}$: **VERIFIED**.

**Final Verdict**: **APPROVE**
