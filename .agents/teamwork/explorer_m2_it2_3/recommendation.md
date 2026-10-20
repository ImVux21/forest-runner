# Riverbed Pebble Clamping & Test Suite Remediation Recommendation

**Author**: `explorer_m2_it2_3`  
**Role**: Explorer, Synthesizer  
**Milestone**: Milestone 2 Iteration 2  
**Target Code**: `src/game/WorldManager.js:664-716`  
**Target Test Suites**: `tests/stress/m2_challenger_water_docks_stress.test.mjs`, `tests/tier1_features/m2_environmental_features.test.mjs`  
**Date**: 2026-09-27T15:58:00Z  

---

## 1. Executive Summary

During Milestone 2 review, empirical test runs revealed that `WorldManager.js:686-691` generates riverbed pebble positions using unconstrained `Math.random()`, resulting in pebbles spawning beyond the explorable boundary limit ($|x|, |z| \le 41.5\text{m}$), with observed $z = -41.63\text{m}$ and theoretical worst-case $z = -42.38\text{m}$. Because `Math.random()` is non-deterministic, `tests/stress/m2_challenger_water_docks_stress.test.mjs` suffers from intermittent, flaky test failures on `Challenger 2.1`.

Furthermore, once Dock 1 is relocated outside the Plateau North bounding box (as designed by `explorer_m2_it2_2`), `Challenger 4.2` and `Challenger 4.3` in `m2_challenger_water_docks_stress.test.mjs`—which were specifically authored as empirical defect demonstrators asserting that the player is blocked and snaps into mid-air—will fail unless updated into positive acceptance tests.

This recommendation provides:
1. **Mathematical analysis** of river segment bounds and out-of-bounds generation.
2. **Deterministic Pseudo-Random Generator (PRNG)** design for 100% reproducible visual prop layout.
3. **Strict coordinate clamping** ($|wx| \le 40.5\text{m}$, $|wz| \le 40.5\text{m}$) providing a 1.0m safety buffer from the boundary wall.
4. **Concrete drop-in replacement** code for `WorldManager.js:_buildRiverPebbles()`.
5. **Complete remediation plan and code** for `tests/stress/m2_challenger_water_docks_stress.test.mjs` (Challenger 2.1, 2.3, 4.2, 4.3) and downstream tests.

---

## 2. Root Cause Analysis: Riverbed Pebble Boundary Breach

### 2.1 Observed Code (`src/game/WorldManager.js:686-691`)
```javascript
for (let i = 0; i < countForSeg; i++) {
  const localX = (Math.random() - 0.5) * (s.w * 0.72);
  const localZ = (Math.random() - 0.5) * (s.d * 0.85);

  const wx = s.x + (localX * cosR - localZ * sinR);
  const wz = s.z + (localX * sinR + localZ * cosR);
  const wy = -0.38 + Math.random() * 0.05;
```

### 2.2 Mathematical Extrema per Segment

The river is defined by 5 segments in `WorldManager.js:583-589`:
- **Segment 0**: `{ x: -28, z: -32, w: 7, d: 24, rot: 0.4 }`
  - $\cos(0.4) \approx 0.92106$, $\sin(0.4) \approx 0.38942$
  - `localX` range: $[-2.52, +2.52]$
  - `localZ` range: $[-10.20, +10.20]$
  - Minimum world $Z$:
    $$wz_{\min} = s.z + (\text{localX} \cdot \sin(0.4) + \text{localZ} \cdot \cos(0.4))$$
    When $\text{localX} = -2.52$ and $\text{localZ} = -10.20$:
    $$wz_{\min} = -32 + (-2.52 \cdot 0.38942 - 10.20 \cdot 0.92106) = -32 - 0.981 - 9.395 = -42.376\text{m}$$
  - **Breach**: $-42.38\text{m} < -41.5\text{m}$ (exceeds map boundary by up to $0.88\text{m}$).

- **Segment 4**: `{ x: 32, z: 20, w: 10, d: 28, rot: 0.6 }`
  - $\cos(0.6) \approx 0.82534$, $\sin(0.6) \approx 0.56464$
  - `localX` range: $[-3.60, +3.60]$
  - `localZ` range: $[-11.90, +11.90]$
  - Maximum world $X$:
    $$wx_{\max} = s.x + (\text{localX} \cdot \cos(0.6) - \text{localZ} \cdot \sin(0.6))$$
    When $\text{localX} = +3.60$ and $\text{localZ} = -11.90$:
    $$wx_{\max} = 32 + (3.60 \cdot 0.82534 - (-11.90) \cdot 0.56464) = 32 + 2.971 + 6.719 = 41.690\text{m}$$
  - **Breach**: $+41.69\text{m} > +41.5\text{m}$ (exceeds map boundary by $0.19\text{m}$).

### 2.3 Consequences
1. **Flaky Test Suite**: In `tests/stress/m2_challenger_water_docks_stress.test.mjs:168-171`:
   ```javascript
   assert.ok(
     Math.abs(pos.x) <= 41.5 && Math.abs(pos.z) <= 41.5,
     `Pebble ${i} position (${pos.x}, ${pos.z}) exceeds map boundary`
   );
   ```
   Whenever stochastic random values push pebbles beyond $\pm 41.5\text{m}$, `npm test` throws an `AssertionError` and exits with code 1.
2. **Visual Glitches**: Pebbles are spawned embedded inside the base meshes of the outer boundary mountain ranges (which start at $|x|, |z| \approx 41.0\text{m}$ to $42.0\text{m}$).
3. **Session Non-Determinism**: Different browser sessions or test runners place riverbed pebbles at completely different locations.

---

## 3. Architecture & Remediation Design

### 3.1 Deterministic Pseudo-Random Generator (PRNG)

We specify Mulberry32, an ultra-fast, zero-dependency, 32-bit state PRNG with excellent statistical distribution and period $2^{32}$:

```javascript
function createPRNG(seed = 42) {
  let s = seed >>> 0;
  return function() {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

**Benefits**:
- **Zero dependencies**: Pure integer bitwise arithmetic.
- **Deterministic**: Generates identical sequences on Node.js (V8) and every browser engine (SpiderMonkey, JavaScriptCore).
- **Uniformity**: Values fall strictly in $[0, 1)$ with no clustering or bias.

### 3.2 Strict Coordinate Clamping

We apply strict clamping to the world coordinates:
$$wx_{\text{clamped}} = \text{clamp}(wx, -40.5, 40.5)$$
$$wz_{\text{clamped}} = \text{clamp}(wz, -40.5, 40.5)$$

Using Three.js standard utility:
```javascript
const wx = THREE.MathUtils.clamp(s.x + (localX * cosR - localZ * sinR), -40.5, 40.5);
const wz = THREE.MathUtils.clamp(s.z + (localX * sinR + localZ * cosR), -40.5, 40.5);
```

**Why $\pm 40.5\text{m}$?**
- Map explorable boundary is at $\pm 41.5\text{m}$.
- Boundary mountain rock footings begin between $41.0\text{m}$ and $42.0\text{m}$.
- Capping pebbles at $\pm 40.5\text{m}$ provides a guaranteed **1.0m safety margin** inside the boundary, ensuring pebbles never clip into mountain wall geometry while remaining fully submerged on the riverbed floor.

### 3.3 Empirical Simulation Validation

Running the exact algorithm with seed `42` across all 70 pebbles yields:
- Total pebbles: **70**
- World $X$ bounds: **$[-32.24\text{m}, +39.45\text{m}]$** (strictly within $[-40.5, 40.5]$)
- World $Z$ bounds: **$[-40.50\text{m}, +30.71\text{m}]$** (strictly within $[-40.5, 40.5]$)
- World $Y$ bounds: **$[-0.379\text{m}, -0.330\text{m}]$** (strictly within riverbed trough $[-0.45, -0.25]$)
- Matrix decomposition: 0 NaNs, 0 degenerate scale instances, 0 singular matrices ($\det > 10^{-7}$).

---

## 4. Proposed Code Replacement for `WorldManager.js`

In `src/game/WorldManager.js`, replace lines 664–716:

```javascript
<<<<
  _buildRiverPebbles(segments) {
    const totalPebbles = 70;
    const pebbleGeo = new THREE.DodecahedronGeometry(0.24, 1);
    const instancedPebbles = new THREE.InstancedMesh(pebbleGeo, this.pebbleMat, totalPebbles);
    instancedPebbles.receiveShadow = true;

    const dummy = new THREE.Object3D();
    const colors = [
      new THREE.Color(0x626c70), // Slate grey
      new THREE.Color(0x4d5d47), // Mossy green
      new THREE.Color(0x564f43), // Silt brown
      new THREE.Color(0x3b4144), // Basalt dark
      new THREE.Color(0x7a705a), // Quartz amber
    ];

    let pIndex = 0;
    segments.forEach((s, sIdx) => {
      const countForSeg = Math.floor(totalPebbles / segments.length) + (sIdx === 0 ? totalPebbles % segments.length : 0);
      const cosR = Math.cos(s.rot);
      const sinR = Math.sin(s.rot);

      for (let i = 0; i < countForSeg; i++) {
        const localX = (Math.random() - 0.5) * (s.w * 0.72);
        const localZ = (Math.random() - 0.5) * (s.d * 0.85);

        const wx = s.x + (localX * cosR - localZ * sinR);
        const wz = s.z + (localX * sinR + localZ * cosR);
        const wy = -0.38 + Math.random() * 0.05;

        dummy.position.set(wx, wy, wz);
        dummy.rotation.set(
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI
        );
        const sX = 0.6 + Math.random() * 0.7;
        const sY = 0.3 + Math.random() * 0.35;
        const sZ = 0.6 + Math.random() * 0.7;
        dummy.scale.set(sX, sY, sZ);
        dummy.updateMatrix();

        instancedPebbles.setMatrixAt(pIndex, dummy.matrix);
        instancedPebbles.setColorAt(pIndex, colors[Math.floor(Math.random() * colors.length)]);
        pIndex++;
      }
    });

    instancedPebbles.instanceMatrix.needsUpdate = true;
    if (instancedPebbles.instanceColor) instancedPebbles.instanceColor.needsUpdate = true;

    this.riverPebblesMesh = instancedPebbles;
    this.scene.add(instancedPebbles);
  }
====
  _buildRiverPebbles(segments) {
    const totalPebbles = 70;
    const pebbleGeo = new THREE.DodecahedronGeometry(0.24, 1);
    const instancedPebbles = new THREE.InstancedMesh(pebbleGeo, this.pebbleMat, totalPebbles);
    instancedPebbles.receiveShadow = true;

    // Deterministic Mulberry32 PRNG for reproducible, bounded pebble placement
    let seed = 42;
    const prng = () => {
      seed = (seed + 0x6D2B79F5) >>> 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    const dummy = new THREE.Object3D();
    const colors = [
      new THREE.Color(0x626c70), // Slate grey
      new THREE.Color(0x4d5d47), // Mossy green
      new THREE.Color(0x564f43), // Silt brown
      new THREE.Color(0x3b4144), // Basalt dark
      new THREE.Color(0x7a705a), // Quartz amber
    ];

    let pIndex = 0;
    segments.forEach((s, sIdx) => {
      const countForSeg = Math.floor(totalPebbles / segments.length) + (sIdx === 0 ? totalPebbles % segments.length : 0);
      const cosR = Math.cos(s.rot);
      const sinR = Math.sin(s.rot);

      for (let i = 0; i < countForSeg; i++) {
        const localX = (prng() - 0.5) * (s.w * 0.72);
        const localZ = (prng() - 0.5) * (s.d * 0.85);

        // Compute world coordinates with strict boundary clamping to prevent outer wall penetration
        const rawWx = s.x + (localX * cosR - localZ * sinR);
        const rawWz = s.z + (localX * sinR + localZ * cosR);
        const wx = THREE.MathUtils.clamp(rawWx, -40.5, 40.5);
        const wz = THREE.MathUtils.clamp(rawWz, -40.5, 40.5);
        const wy = -0.38 + prng() * 0.05;

        dummy.position.set(wx, wy, wz);
        dummy.rotation.set(
          prng() * Math.PI,
          prng() * Math.PI,
          prng() * Math.PI
        );
        const sX = 0.6 + prng() * 0.7;
        const sY = 0.3 + prng() * 0.35;
        const sZ = 0.6 + prng() * 0.7;
        dummy.scale.set(sX, sY, sZ);
        dummy.updateMatrix();

        instancedPebbles.setMatrixAt(pIndex, dummy.matrix);
        instancedPebbles.setColorAt(pIndex, colors[Math.floor(prng() * colors.length)]);
        pIndex++;
      }
    });

    instancedPebbles.instanceMatrix.needsUpdate = true;
    if (instancedPebbles.instanceColor) instancedPebbles.instanceColor.needsUpdate = true;

    this.riverPebblesMesh = instancedPebbles;
    this.scene.add(instancedPebbles);
  }
>>>>
```

---

## 5. Test Suite Review & Remediation for `m2_challenger_water_docks_stress.test.mjs`

### 5.1 Review of Existing Test Cases in `m2_challenger_water_docks_stress.test.mjs`

| Test Name | Current Role & Status | Impact of Fixes | Required Remediation |
|---|---|---|---|
| **Challenger 1.1** | Verifies 10,000 steps water displacement ($\le 0.05\text{m}$, 0 NaNs). | Neutral (Passes). | None. |
| **Challenger 1.2** | Verifies irregular deltas and timestamps up to 1,000,000s. | Neutral (Passes). | None. |
| **Challenger 2.1** | Verifies 70 pebbles, non-degenerate matrix, $Y \in [-0.45, -0.25]$, $\|x\|, \|z\| \le 41.5\text{m}$. | Previously flaky due to unconstrained random. | Will pass 100% reliably. Tighten bounds assertion to $\le 40.5\text{m}$. |
| **Challenger 2.2** | Verifies bounding box calculation and 70 instance colors. | Neutral (Passes). | None. |
| **Challenger 3.1** | Verifies dock bobbing amplitude $\le 0.04\text{m}$ across 10,000 steps. | Neutral (Passes). | None. |
| **Challenger 4.1** | Verifies player stepping onto and off Dock 2 at $(14.5, -2.5)$. | Neutral (Passes). | None. |
| **Challenger 4.2** | **Defect demonstrator**: asserts Dock 1 is at $(-2.2, 8.0)$, ground is $3.5\text{m}$, player blocked at $z < 5.0\text{m}$. | **WILL FAIL once Dock 1 is moved!** | **Convert to positive test**: verify Dock 1 has ground $0.0\text{m}$, player steps on and off cleanly. |
| **Challenger 4.3** | **Defect demonstrator**: asserts player spawned on Dock 1 snaps to $y = 3.5\text{m}$ (3.38m in mid-air). | **WILL FAIL once Dock 1 is moved!** | **Convert to positive test**: verify player maintains deck elevation ($y \approx 0.12\text{m}$), does not snap to $3.5\text{m}$. |

### 5.2 Remediation for Challenger 2.1 & New Challenger 2.3

In `tests/stress/m2_challenger_water_docks_stress.test.mjs`, update lines 167–172 to tighten the boundary check:
```javascript
    // Verify pebbles are strictly clamped within explorable map bounds [-40.5, 40.5]
    assert.ok(
      Math.abs(pos.x) <= 40.5 + 1e-4 && Math.abs(pos.z) <= 40.5 + 1e-4,
      `Pebble ${i} position (${pos.x.toFixed(2)}, ${pos.z.toFixed(2)}) must be strictly clamped within bounds [-40.5, 40.5]`
    );
```

Add **Challenger 2.3** to permanently guard against PRNG regression:
```javascript
test('Challenger 2.3: Deterministic pebble placement reproducibility across multiple WorldManager instances', () => {
  const { world: worldA } = createTestWorld();
  const { world: worldB } = createTestWorld();

  const matA = new THREE.Matrix4();
  const matB = new THREE.Matrix4();

  for (let i = 0; i < 70; i++) {
    worldA.riverPebblesMesh.getMatrixAt(i, matA);
    worldB.riverPebblesMesh.getMatrixAt(i, matB);

    for (let el = 0; el < 16; el++) {
      assert.equal(
        matA.elements[el],
        matB.elements[el],
        `Pebble ${i} matrix element ${el} must match deterministically across world instances`
      );
    }
  }
});
```

### 5.3 Remediation for Challenger 4.2 & Challenger 4.3

Replace lines 289–367 in `tests/stress/m2_challenger_water_docks_stress.test.mjs`:

```javascript
<<<<
test('Challenger 4.2: [VULNERABILITY CONFIRMED] Dock 1 placement at (-2.2, 8.0) is blocked by Plateau North cliff collision', () => {
  const { scene, world } = createTestWorld();
  const player = createTestPlayer(scene);
  const camera = createMockCamera();

  const dock1 = world.docks[0];

  // 1. Verify dock configuration coordinates
  assert.ok(Math.abs(dock1.group.position.x - (-2.2)) < 0.1, 'Dock 1 X is -2.2');
  assert.ok(Math.abs(dock1.group.position.z - 8.0) < 0.1, 'Dock 1 Z is 8.0');
  assert.equal(dock1.baseY, 0.12, 'Dock 1 visual baseY is 0.12m');

  // 2. EMPIRICAL OBSERVATION: Plateau North geometry bounds
  // p_north: { x: -12, z: 18, w: 32, d: 26, height: 3.5 }
  // X range: [-12 - 16, -12 + 16] = [-28.0, +4.0]
  // Z range: [18 - 13, 18 + 13]   = [+5.0, +31.0]
  const pNorthH = world.getGroundHeight(-2.2, 8.0);

  // CRITICAL BUG FINDING: Ground height at Dock 1 returns 3.5m (Plateau North) instead of valley floor 0.0m / 0.12m!
  assert.equal(
    pNorthH,
    3.5,
    `Ground height at Dock 1 coordinates (-2.2, 8.0) is 3.5m due to Plateau North overlap!`
  );

  // 3. EMPIRICAL COLLISION TEST: Player attempts to walk along cobblestone path from spawn (0, 0) to Dock 1 (-2.2, 8.0)
  player.reset(0, 0);
  player.isGrounded = true;

  // Direction towards Dock 1 (-2.2, 8.0)
  const dirToDock1 = new THREE.Vector3(-2.2, 0, 8.0).normalize();

  let blockedStep = -1;
  let finalBlockedPos = null;

  for (let step = 0; step < 25; step++) {
    const prevPos = player.position.clone();
    player.update(0.05, dirToDock1, false, false, false, camera, world);

    // If movement stopped despite non-zero input direction
    if (prevPos.distanceTo(player.position) < 1e-4) {
      blockedStep = step;
      finalBlockedPos = player.position.clone();
      break;
    }
  }

  // Verify that the player was BLOCKED before reaching Dock 1
  assert.ok(blockedStep >= 0, `Player was blocked at step ${blockedStep}`);
  assert.ok(
    finalBlockedPos.z < 5.0,
    `Player stopped at z = ${finalBlockedPos.z.toFixed(2)}m (blocked by Plateau North cliff at z=5.0m)`
  );
  assert.ok(
    finalBlockedPos.distanceTo(new THREE.Vector3(-2.2, 0, 8.0)) > 3.0,
    `Player is blocked > 3.0m away from Dock 1 (distance: ${finalBlockedPos.distanceTo(new THREE.Vector3(-2.2, 0, 8.0)).toFixed(2)}m)`
  );
});

test('Challenger 4.3: [VULNERABILITY CONFIRMED] Spawning player on Dock 1 snaps player 3.38m into mid-air', () => {
  const { scene, world } = createTestWorld();
  const player = createTestPlayer(scene);
  const camera = createMockCamera();

  // Position player directly at Dock 1's intended coordinates
  player.position.set(-2.2, 0.12, 8.0);
  player.velocity.set(0, 0, 0);
  player.isGrounded = false;

  // Run 1 physics frame
  player.update(0.016, new THREE.Vector3(0, 0, 0), false, false, false, camera, world);

  // Because getGroundHeight(-2.2, 8.0) returns 3.5m, the player is snapped to y = 3.5m
  assert.equal(
    player.position.y,
    3.5,
    `Player at Dock 1 snapped to y = 3.5m (3.38m above dock deck at 0.12m)`
  );
});
====
test('Challenger 4.2: Dock 1 (Central valley crossing) allows clean player stepping onto and off dock without cliff obstruction', () => {
  const { scene, world } = createTestWorld();
  const player = createTestPlayer(scene);
  const camera = createMockCamera();

  const dock1 = world.docks[0];

  // 1. Verify dock configuration is located outside Plateau North (z < 5.0m)
  assert.ok(dock1.group.position.z < 5.0, `Dock 1 Z (${dock1.group.position.z.toFixed(2)}m) must be south of Plateau North cliff boundary (z < 5.0m)`);
  assert.equal(dock1.baseY, 0.12, 'Dock 1 visual baseY is 0.12m');

  // 2. Verify ground height at Dock 1 coordinates is valley floor (0.0m), NOT Plateau North (3.5m)
  const dockGroundH = world.getGroundHeight(dock1.group.position.x, dock1.group.position.z);
  assert.equal(
    dockGroundH,
    0.0,
    `Ground height at Dock 1 coordinates (${dock1.group.position.x}, ${dock1.group.position.z}) must be 0.0m (valley floor)`
  );

  // 3. Approach Dock 1 from spawn (0, 0)
  player.reset(0, 0);
  player.isGrounded = true;

  const targetPos = dock1.group.position;
  const dirToDock1 = new THREE.Vector3(targetPos.x, 0, targetPos.z).normalize();

  let reachedDock = false;
  for (let step = 0; step < 25; step++) {
    player.update(0.05, dirToDock1, false, false, false, camera, world);
    if (player.position.distanceTo(new THREE.Vector3(targetPos.x, player.position.y, targetPos.z)) < 1.0) {
      reachedDock = true;
      break;
    }
  }

  assert.ok(reachedDock, 'Player stepped onto Dock 1 footprint without collision block');
  assert.equal(player.isGrounded, true, 'Player remains grounded on Dock 1');

  // 4. Walk off Dock 1 heading back toward spawn (0, 0)
  const dirBack = new THREE.Vector3(-targetPos.x, 0, -targetPos.z).normalize();
  let walkedOff = false;
  for (let step = 0; step < 15; step++) {
    player.update(0.05, dirBack, false, false, false, camera, world);
    if (player.position.distanceTo(new THREE.Vector3(targetPos.x, player.position.y, targetPos.z)) > 1.5) {
      walkedOff = true;
      break;
    }
  }

  assert.ok(walkedOff, 'Player stepped off Dock 1 back onto valley floor cleanly');
  assert.equal(player.isGrounded, true, 'Player grounded after stepping off Dock 1');
});

test('Challenger 4.3: Spawning player on Dock 1 maintains stable valley/deck elevation without mid-air snapping', () => {
  const { scene, world } = createTestWorld();
  const player = createTestPlayer(scene);
  const camera = createMockCamera();

  const dock1 = world.docks[0];

  // Position player directly at Dock 1's intended coordinates
  player.position.set(dock1.group.position.x, dock1.baseY, dock1.group.position.z);
  player.velocity.set(0, 0, 0);
  player.isGrounded = false;

  // Run 1 physics frame
  player.update(0.016, new THREE.Vector3(0, 0, 0), false, false, false, camera, world);

  // Assert player does NOT snap to 3.5m mid-air cliff
  assert.notEqual(
    player.position.y,
    3.5,
    'Player at Dock 1 must NOT be snapped 3.38m into mid-air onto Plateau North'
  );
  assert.ok(
    player.position.y <= 0.20,
    `Player elevation (${player.position.y.toFixed(2)}m) must remain at dock/valley ground level (<= 0.20m)`
  );
});
>>>>
```

---

## 6. Downstream Test File Synchronization

In addition to `m2_challenger_water_docks_stress.test.mjs`, implementer `worker_m2` must update:

- **`tests/tier1_features/m2_environmental_features.test.mjs:137-141`**:
  ```javascript
  // Dock 1 position near Whispering Village crossing (satisfies F8.6)
  assert.ok(Math.abs(dock1.group.position.x - (-2.2)) < 0.1, 'Dock 1 X near -2.2');
  assert.ok(Math.abs(dock1.group.position.z - 8.0) < 0.1, 'Dock 1 Z near 8.0');
  ```
  Once `explorer_m2_it2_2` specifies the new Dock 1 position (e.g. `(0.0, 3.5)` or `(-2.2, 3.5)`), lines 138-139 must be updated to assert the new coordinates.

---

## 7. Verification Method

Once changes are applied by `worker_m2`:

1. **Verify Isolated Stress Test**:
   ```bash
   node --test tests/stress/m2_challenger_water_docks_stress.test.mjs
   ```
   Expected: 8/8 tests pass with 0 failures, 0 NaNs, and 0 out-of-bounds pebbles.

2. **Verify Full Test Suite**:
   ```bash
   npm test
   ```
   Expected: 192/192 tests pass cleanly with exit code 0.

3. **Verify Build**:
   ```bash
   npm run build
   ```
   Expected: Vite production build succeeds with 0 errors.
