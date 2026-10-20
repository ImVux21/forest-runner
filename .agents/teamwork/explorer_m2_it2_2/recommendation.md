# Technical Design & Recommendation: Dock 1 Relocation & Dock 2 Audit

**Author**: `explorer_m2_it2_2`  
**Milestone**: Milestone 2 Iteration 2  
**Date**: 2026-09-27  
**Status**: COMPLETE (Read-Only Investigation)  

---

## 1. Problem Statement & Root Cause Analysis

### 1.1 The Defect
In Milestone 2, Dock 1 was introduced as a rustic wooden pier at coordinates:
```javascript
{ x: -2.2, y: 0.12, z: 8.0, rotY: 0.35, w: 3.2, d: 1.8 }
```
Concurrently, Plateau North (`p_north`) was defined in `src/game/WorldManager.js:29` and `tests/helpers/analytical_models.mjs:162` as:
```javascript
{ id: 'p_north', x: -12, z: 18, w: 32, d: 26, height: 3.5 }
```

### 1.2 Mathematical Overlap
Plateau North's 2D bounding box is:
- $X \in [-12 - 16, -12 + 16] = [-28.0, +4.0]$
- $Z \in [18 - 13, 18 + 13] = [+5.0, +31.0]$
- Elevation: $Y = 3.50\text{m}$.

Because $x = -2.2 \in [-28.0, 4.0]$ and $z = 8.0 \in [5.0, 31.0]$, **Dock 1 sits squarely inside Plateau North's bounding volume**.

### 1.3 Gameplay Impact
1. **Analytical Ground Height Corruption**: `WorldManager.getGroundHeight(-2.2, 8.0)` returns $3.5\text{m}$ rather than valley floor $0.0\text{m}$ (or dock deck $0.12\text{m}$).
2. **Access Blockade**: A player attempting to walk from Spawn $(0, 0)$ or Whispering Village toward Dock 1 encounters an impassable vertical cliff face at $Z = 5.0\text{m}$. Because $\Delta y = 3.5\text{m} > 1.2\text{m}$ (the engine's `STEP_THRESHOLD`), the player controller (`Player3D.js:359-362`) halts horizontal velocity, blocking the player $> 3.0\text{m}$ away from the dock.
3. **Mid-Air Levitation**: Spawning or placing the player on Dock 1 snaps `player.position.y` to $3.5\text{m}$, suspending the character $3.38\text{m}$ in mid-air above the dock deck ($0.12\text{m}$). Stepping off southward triggers an uncontrolled $3.5\text{m}$ drop.
4. **Pathway Submersion**: The cobblestone stepping stones at `[-1.7, 6.4]` and `[-2.2, 7.5]` are rendered at $y = 0.02\text{m}$ while their analytical ground collision is $3.5\text{m}$.

---

## 2. Terrain & River Layout Analysis

### 2.1 River Geometry Around the Valley Crossing
In `WorldManager.js:583-589`, the river is modeled as an S-curve comprising 5 planar segments:
- Segment 0: `{ x: -28, z: -32, w: 7, d: 24, rot: 0.4 }`
- Segment 1: `{ x: -16, z: -10, w: 8, d: 26, rot: 0.1 }`
- Segment 2: `{ x: 0, z: 8, w: 9, d: 22, rot: -0.5 }`
- Segment 3: `{ x: 18, z: -2, w: 8, d: 24, rot: 0.3 }`
- Segment 4: `{ x: 32, z: 20, w: 10, d: 28, rot: 0.6 }`

Segment 2 (`x: 0, z: 8, w: 9, d: 22, rot: -0.5`) forms the primary watercourse passing Whispering Village and the central valley.
The transformation from local segment coordinates $(lx, ly)$ to world coordinates $(wx, wz)$ is:
$$\begin{aligned}
wx &= s.x + (lx \cos(rot) - ly \sin(rot)) = 0 + (0.87758 \cdot lx + 0.47943 \cdot ly) \\
wz &= s.z - (lx \sin(rot) + ly \cos(rot)) = 8.0 - (-0.47943 \cdot lx + 0.87758 \cdot ly) = 8.0 + 0.47943 \cdot lx - 0.87758 \cdot ly
\end{aligned}$$

At $wz \in [3.0, 4.0]$ (south of Plateau North):
- For $ly \approx 3.0 \dots 3.5$ and $lx = -4.0 \dots -3.0$ (the western riverbank):
  - $wz \approx 3.2 \dots 3.6\text{m}$
  - $wx \approx -2.4 \dots -1.2\text{m}$
- The valley floor grass extends from $x < -2.4\text{m}$ at $y = 0.0\text{m}$.
- The sloping river embankment descends from $x \approx -2.4\text{m}$ to $x \approx -1.2\text{m}$.
- The water surface plane sits at $y = 0.04\text{m}$ for $x > -1.2\text{m}$, with the sunken bed at $y = -0.40\text{m}$.

### 2.2 Segment 1 vs Segment 2 Comparison
- **Segment 1**: Reaches its northern terminus near $(-14.7, 2.94)$. A dock here would sit in the narrow corridor between Ramp 1 ($x \in [-15.5, -8.5]$) and Ramp 3 ($x \in [-21.5, -14.5]$), $> 15\text{m}$ away from Spawn and Whispering Village, disrupting ramp approaches.
- **Segment 2**: Passes directly past Whispering Village ($x = -4, z = -4$), Spawn $(0, 0)$, and the Crossroads Signpost $(0.8, 0.8)$. Moving Dock 1 south along Segment 2 preserves the canonical village crossing identity (F8.6) and maintains a direct line of sight from Spawn.

---

## 3. Proposed Dock 1 Position Design

### 3.1 Recommended Configuration
We recommend relocating Dock 1 to:
```javascript
{ x: -2.2, y: 0.12, z: 3.5, rotY: 0.35, w: 3.2, d: 1.8 }
```
*(Conservative Alternative with larger cliff safety margin: $z = 3.2$, i.e. `{ x: -2.2, y: 0.12, z: 3.2, rotY: 0.35, w: 3.2, d: 1.8 }`)*

### 3.2 Clearance & Mathematical Ground Proof
With center $(x_0, z_0) = (-2.2, 3.5)$, dimensions $w = 3.2, d = 1.8$, and rotation $\theta = 0.35\text{ rad}$:
$$\Delta z_{\max} = \frac{w}{2} |\sin(0.35)| + \frac{d}{2} |\cos(0.35)| = 1.6 \times 0.3429 + 0.9 \times 0.9394 = 0.549 + 0.845 = 1.394\text{m}$$
$$\Delta x_{\max} = \frac{w}{2} |\cos(0.35)| + \frac{d}{2} |\sin(0.35)| = 1.6 \times 0.9394 + 0.9 \times 0.3429 = 1.503 + 0.309 = 1.812\text{m}$$

- **Dock Z Extent**: $[3.5 - 1.394, 3.5 + 1.394] = [2.106, 4.894]$
- **Dock X Extent**: $[-2.2 - 1.812, -2.2 + 1.812] = [-4.012, -0.388]$
- **Plateau North Z-min**: $z = 5.0\text{m}$.
- **Cliff Separation Margin**: $5.000\text{m} - 4.894\text{m} = +0.106\text{m}$ (with $z = 3.2$, margin expands to $+0.406\text{m}$).

**Ground Height Evaluation**:
In `WorldManager.getGroundHeight(x, z)`:
- Plateau North ($z \ge 5.0$): Condition false ($z \le 4.894 < 5.0$).
- Plateau Southwest ($z \le -5.0$): Condition false.
- Plateau Southeast ($z \le -6.0$): Condition false.
- Plateau Peak ($z \ge 12.0$): Condition false.
- Ramp 1 ($x \in [-15.5, -8.5]$): Condition false ($x \ge -4.012 > -8.5$).
- Ramps 2, 3, 4 & Bridge: All conditions false.
- **Result**: `getGroundHeight(x, z) === 0.0m` across 100% of Dock 1's footprint and surrounding valley approaches.

### 3.3 Structural & Visual Alignment
1. **Walkway & Riverbank Spanning**:
   - The shore end (local $-X$) reaches $x = -3.8\text{m}$, resting on flat valley grass ($y = 0.0\text{m}$).
   - The outer river end (local $+X$ with mooring bollards) reaches $x = -0.6\text{m}$, cantilevering gracefully over the water plane ($y = 0.04\text{m}$).
   - Deck elevation $y = 0.12\text{m}$ provides $0.08\text{m}$ clearance over water and a gentle $0.12\text{m}$ step up from valley turf ($\Delta y = 0.12\text{m} \ll 1.2\text{m}$).
2. **Submerged Stilts**:
   - The 4 cylindrical pilings extend to $y = -0.32\text{m}$, bedding solidly into the sunken canyon floor ($y = -0.40\text{m}$).

---

## 4. Village Pathway Reconfiguration

In `src/game/WorldManager.js:966-967`, the existing cobblestone stepping stones lead straight north toward the old coordinates $( -2.2, 8.0 )$, sending stones into Plateau North at $z = 6.4$ and $7.5$.

### Proposed Stepping Stone Path
Replace `WorldManager.js:966-967` with:
```javascript
      // Spawn (0,0) to Dock 1 (-2.2, 3.5)
      [-0.5, 0.9], [-1.0, 1.8], [-1.5, 2.6], [-2.0, 3.2],
```

**Benefits**:
- Connects Spawn `(0, 0)` smoothly to Dock 1's shore entrance at `(-2.0, 3.2)`.
- All nodes remain within $z \in [0.9, 3.2] < 5.0$, ensuring analytical ground elevation is exactly $0.0\text{m}$.
- Stones render flush at $y = 0.02\text{m}$ on top of valley grass without clipping.

---

## 5. Comprehensive Audit of Dock 2

### 5.1 Dock 2 Parameters
```javascript
{ x: 14.5, y: 0.12, z: -2.5, rotY: -0.6, w: 3.0, d: 1.8 }
```
- Center: $(14.5, 0.12, -2.5)$
- Half-width $h_w = 1.5\text{m}$, half-depth $h_d = 0.9\text{m}$, rotation $\theta = -0.6\text{ rad}$.
- $\Delta x_{\max} = 1.5 |\cos(-0.6)| + 0.9 |\sin(-0.6)| = 1.5(0.8253) + 0.9(0.5646) = 1.746\text{m}$
- $\Delta z_{\max} = 1.5 |\sin(-0.6)| + 0.9 |\cos(-0.6)| = 1.5(0.5646) + 0.9(0.8253) = 1.590\text{m}$
- **Footprint Envelope**:
  - $X \in [12.754, 16.246]$
  - $Z \in [-4.090, -0.910]$

### 5.2 Clearance Audit Matrix

| Structure | Footprint ($X, Z$) | Height ($Y$) | Dock 2 Separation Margin | Status |
|---|---|---|---|---|
| **Plateau North (`p_north`)** | $X \in [-28, 4], Z \in [5, 31]$ | $3.5\text{m}$ | $\Delta X = +8.75\text{m}, \Delta Z = +5.91\text{m}$ | **PASS (CLEAR)** |
| **Plateau Peak (`p_peak`)** | $X \in [7, 29], Z \in [12, 32]$ | $7.0\text{m}$ | $\Delta Z = +12.91\text{m}$ | **PASS (CLEAR)** |
| **Plateau Southwest (`p_southwest`)** | $X \in [-31, -5], Z \in [-27, -5]$ | $3.5\text{m}$ | $\Delta X = +17.75\text{m}$ | **PASS (CLEAR)** |
| **Plateau Southeast (`p_southeast`)** | $X \in [8, 32], Z \in [-30, -6]$ | $3.5\text{m}$ | $\Delta Z = -4.09 - (-6.00) = \mathbf{+1.91\text{m}}$ | **PASS (CLEAR)** |
| **Ramp 1 (`ramp_north`)** | $X \in [-15.5, -8.5], Z \in [-2, 8]$ | $0.0 \to 3.5\text{m}$ | $\Delta X = +21.25\text{m}$ | **PASS (CLEAR)** |
| **Ramp 2 (`ramp_peak`)** | $X \in [0, 10], Z \in [19, 25]$ | $3.5 \to 7.0\text{m}$ | $\Delta Z = +19.91\text{m}$ | **PASS (CLEAR)** |
| **Ramp 3 (`ramp_southwest`)** | $X \in [-21.5, -14.5], Z \in [-8, 2]$ | $0.0 \to 3.5\text{m}$ | $\Delta X = +27.25\text{m}$ | **PASS (CLEAR)** |
| **Ramp 4 (`ramp_southeast`)** | $X \in [1, 11], Z \in [-21.5, -14.5]$ | $0.0 \to 3.5\text{m}$ | $\Delta X = +1.75\text{m}, \Delta Z = +10.41\text{m}$ | **PASS (CLEAR)** |
| **Suspension Bridge** | $X \in [-6, 8], Z \in [-18.8, -15.2]$ | $3.55\text{m}$ | $\Delta X = +4.75\text{m}, \Delta Z = +11.11\text{m}$ | **PASS (CLEAR)** |

### 5.3 Audit Conclusion
Dock 2 at $(14.5, 0.12, -2.5)$ evaluates to `getGroundHeight(x, z) === 0.0m` everywhere across its bounds. It possesses a generous $+1.91\text{m}$ clearance buffer from Plateau Southeast's northern cliff face, fully confirming its spatial validity.

---

## 6. Downstream Test & Specification Adjustments

To ensure zero test regressions and full CI pass, the following test and model files must be updated by the implementer:

### 6.1 `tests/helpers/analytical_models.mjs`
Add `DocksModel` as a formal ground-truth specification:
```javascript
// ─── F8.6: Wooden Docks Specification ───────────────────────────────────────
export const DocksModel = {
  DOCK_DECK_Y: 0.12,
  DOCKS: [
    { id: 'dock_village', x: -2.2, y: 0.12, z: 3.5, rotY: 0.35, w: 3.2, d: 1.8, label: 'Whispering Village Crossing' },
    { id: 'dock_canyon', x: 14.5, y: 0.12, z: -2.5, rotY: -0.6, w: 3.0, d: 1.8, label: 'Southern Canyon Approach' },
  ],
};
```

### 6.2 `tests/tier1_features/m2_environmental_features.test.mjs`
Update line 139:
```javascript
- assert.ok(Math.abs(dock1.group.position.z - 8.0) < 0.1, 'Dock 1 Z near 8.0');
+ assert.ok(Math.abs(dock1.group.position.z - 3.5) < 0.1, 'Dock 1 Z near 3.5');
```

### 6.3 `tests/stress/m2_challenger_water_docks_stress.test.mjs`
Convert Challenger 4.2 & 4.3 from vulnerability demonstrations into passing verification tests:
- Update target coordinates from `(-2.2, 8.0)` to `(-2.2, 3.5)`.
- Assert `world.getGroundHeight(-2.2, 3.5) === 0.0`.
- Assert player traversing from `(0, 0)` toward `(-2.2, 3.5)` reaches the dock deck without being stopped by cliff barriers.
- Assert player spawned at `(-2.2, 0.12, 3.5)` rests at deck height without snapping to $3.5\text{m}$.
