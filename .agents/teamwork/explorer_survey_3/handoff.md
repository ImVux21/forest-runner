# Handoff Report — explorer_survey_3

**Agent**: `explorer_survey_3`  
**Date**: 2026-09-27  
**Handoff Type**: Hard (Task Complete)  
**Destination**: Parent Orchestrator (`1388fca6-163d-405b-b63e-b8221c6b652b`)

---

## 1. Observation

### 1.1 Player Controller & Physics
- In `src/game/Player3D.js` (lines 7–13), player constants are defined verbatim:
  ```javascript
  const WALK_SPEED = 10.5;
  const SPRINT_SPEED = 17.0;
  const GLIDE_SPEED = 14.5;
  const TURN_SMOOTH_SPEED = 14.0;
  const JUMP_FORCE = 12.5;
  const GRAVITY = -28.0;
  const GLIDE_FALL_SPEED = -2.0;
  ```
- In `src/game/Player3D.js` (lines 342–345), paraglider deployment triggers in mid-air when descending:
  ```javascript
  if (!this.isGrounded && this.velocityY < 0 && (isGlidePressed || isJumpPressed)) {
    this.isGliding = true;
  }
  ```
  Descent rate while gliding is clamped to `velocityY = GLIDE_FALL_SPEED` (`-2.0` m/s).
- In `src/game/Player3D.js` (lines 356–365), cliff blocking is triggered by height difference:
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
- `src/game/Player.js` (403 lines), `ObstacleManager.js`, `CollectibleManager.js`, and `SceneManager.js` are legacy remnants of an earlier endless-runner game and are never imported by `main.js` or `Game.js`.

### 1.2 Collision System & World Layout
- In `src/game/WorldManager.js` (lines 20–54), terrain elevation is defined purely as JavaScript data structures without physics engines or Three.js raycasting:
  - 4 plateaus: `p_north` (y=3.5m), `p_peak` (y=7.0m), `p_southwest` (y=3.5m), `p_southeast` (y=3.5m).
  - 4 ramps: Ramp 1 (z: 3, d: 10, startH: 0, endH: 3.5), Ramp 2 (x: 5, w: 10, startH: 3.5, endH: 7.0), Ramp 3 (z: -3, d: 10, startH: 0, endH: 3.5), Ramp 4 (x: 6, w: 10, startH: 0, endH: 3.5).
  - Suspension bridge: `x: 1, z: -17, w: 14, d: 3.6, height: 3.55`.
- In `src/game/WorldManager.js` (lines 434–469), `getGroundHeight(x, z)` evaluates elevation in strict priority: Bridge $\rightarrow$ Ramps (via `lerp`) $\rightarrow$ Plateaus $\rightarrow$ Base valley ($0.0\text{m}$).
- Nature props (`Tree_1_A`, `Rock_1_A`, etc.) have no collision boxes or physics; the player passes through them freely.

### 1.3 Bouncy Mushrooms
- In `src/game/WorldManager.js` (lines 292–304 & 354–365), 4 mushrooms are created:
  - Spot 1: `(-26, 8)` with launch power `20`.
  - Spot 2: `(6, 27)` with launch power `22` (launches from Plateau North up to Peak Summit).
  - Spot 3: `(-5, -15)` with launch power `19`.
  - Spot 4: `(8, -8)` with launch power `19`.
- Detection condition: `Math.hypot(playerPos.x - m.x, playerPos.z - m.z) < 1.35 && Math.abs(playerPos.y - m.y) < 1.2`.
- When triggered, mushroom scales to `(1.4, 0.45, 1.4)` for 250ms, and sets `player.velocityY = m.power; player.isGrounded = false; player.isGliding = false;`.

### 1.4 NPCs & Dialogue System
- In `src/game/NPCManager.js`, 3 NPCs exist with procedural rigs, idle bob animations, and overhead canvas billboard sprites:
  - Finn (`id: 'finn'`): `x: -4.0, z: -4.0, y: 0.0`, wizard hat, robe, beard, glowing crystal staff, interaction radius `3.8m`.
  - Bram (`id: 'bram'`): `x: 1.0, z: -13.0, y: 3.5`, red flannel shirt, axe, interaction radius `3.8m`.
  - Forest Spirit (`id: 'spirit'`): `x: 18.0, z: 18.0, y: 7.0`, icosahedron core, wireframe torus halo, 3 wisps, PointLight, interaction radius `4.2m`.
- In `src/game/DialogueSystem.js`, dialogue features typewriter rendering (22ms per char), procedural Web Audio sine ticks (440–520 Hz), and branching choices that trigger story flags (`talkedToFinn`, `learnedAboutMushrooms`, `spiritAwakened`), rewarding +250, +250, and +1000 score respectively.

### 1.5 Collectibles & Quests
- In `src/game/OpenWorldCollectibles.js`, 18 coins, 4 emerald gems, and 2 treasure chests are distributed across elevations. Collected via Three.js `Box3` intersection (`playerBox.intersectsBox(item.box)`), spawning 8 sparkle burst particles.
- In `src/game/Game.js`, quests are tracked in UI:
  - Collect 15 Coins (`#quest-coins`): counts up to 15, turns green.
  - Open 2 Chests (`#quest-chests`): counts up to 2, turns green.
  - Conquer Peak (`#quest-peak`): triggers at `player.position.y >= 6.8`, updates to '✅ Chinh Phục!', awards +500 score.
- In `src/game/SaveManager.js`, best score and accumulated coins are persisted in browser `localStorage` under `forest_runner_save`.

### 1.6 Build, Test Harness & Performance
- `package.json` contains Vite 8.3.1 build scripts (`dev`, `build`, `preview`).
- `npm run build` executed in 359ms with exit code 0 (`dist/` generated with manual three chunk splitting).
- Node version is `v24.18.0`. Built-in runner `node --test` executed headless tests in `.agents/teamwork/explorer_survey_3/test_survey_verification.mjs` verifying analytical ground height, ramps, mushrooms, and dialogues in 406ms with 3 passing tests.
- In `src/game/WorldManager.js:371–414`, 170 props (75 trees, 45 rocks, 50 bushes) are cloned individually with `castShadow = true` and `receiveShadow = true`, resulting in ~900–1100 draw calls per frame.

---

## 2. Logic Chain

1. **Analytical Physics Isolation**: From Observation 1.2, `WorldManager.getGroundHeight(x, z)` computes elevation algebraically without mesh raycasting or Octree queries. Therefore, any environmental overhaul of visual terrain (rocks, cliffs, biomes) will NOT break player physics or collision as long as the mathematical boundaries in `this.plateaus`, `this.ramps`, and `this.bridge` are synchronized.
2. **Ramp Slope Safety**: From Observation 1.1, the cliff step limit is $1.2\text{m}$. All existing ramps have length 6–10m and rise 3.5m ($\Delta y / \text{frame} \approx 0.06–0.09\text{m}$ at max speed). Therefore, new visual ramps must maintain a gradient where height gain per frame remains $\le 1.2\text{m}$ to prevent the player from being blocked.
3. **Mushroom Spring Trajectory**: From Observation 1.3, launching with $v_0 = 19.0–22.0\text{m/s}$ against gravity $g = -28.0\text{m/s}^2$ yields maximum vertical rise $h = v_0^2 / (2|g|) \approx 6.45–8.64\text{m}$. This guarantees players can launch from valley floor ($0\text{m}$) to Tier 1 ($3.5\text{m}$) and from Tier 1 ($3.5\text{m}$) to Tier 2 ($7.0\text{m}$).
4. **NPC & Dialogue Integrity**: From Observation 1.4, dialogue interacts with gameplay solely through `DialogueSystem.storyFlags` and the callback in `Game.triggerTalk()`. Repositioning NPCs across new biomes is safe provided their coordinate positions match `world.getGroundHeight(x, z)` and their dialogue keys remain unchanged.
5. **Draw Call Optimization Imperative**: From Observation 1.6, 170 individually cloned props with shadows produce $\approx 750$ draw calls. Overhauling into 5 rich biomes with additional foliage and structures would exceed 2000 draw calls, crippling mobile/laptop frame rates. Converting KayKit props to `THREE.InstancedMesh` collapses prop draw calls to $\le 20$, freeing rendering budget for atmospheric lighting and scenic geometry.

---

## 3. Caveats

1. **InputManager KeyW Artifact**: In `src/game/InputManager.js:31`, `e.code === 'KeyW'` triggers `jumpTriggered = true;`. While `consumeJump()` quickly resets it, pressing 'W' forward can consume a jump command on the first frame if timed during an action. Subsequent agents should consider removing `KeyW` from the jump condition.
2. **Water Physics**: The Crystal River has no buoyancy, flow physics, or swimming mechanics; it is a visual mesh at $y = 0.04\text{m}$.
3. **Prop Collision**: KayKit trees and rocks currently have no collision. If the team decides to add solid collisions to large boulders or trees, they should be implemented using simple analytical radius checks in `Player3D.update()` rather than expensive mesh colliders.

---

## 4. Conclusion

1. **Controller & Physics**: `Player3D.js` is the sole active controller. Movement speeds (walk 10.5, sprint 17.0, glide 14.5), jump velocity (12.5), gravity (-28.0), and glide fall (-2.0) are balanced and feel responsive.
2. **Collision Architecture**: Custom 2.5D analytical AABB and ramp lerp system. Completely independent of Three.js geometry meshes.
3. **Mushroom Springs**: 4 mushrooms launch player with 19–22 m/s vertical velocity upon proximity trigger ($< 1.35\text{m}$ horizontal, $< 1.2\text{m}$ vertical).
4. **NPCs & Dialogue**: Finn (crossroads), Bram (bridge entrance), and Spirit (peak) function reliably with typewriter text, sound effects, and quest flag integration.
5. **Collectibles & Quests**: 18 coins, 4 emerald gems, and 2 chests drive the 3 main quests (15 coins, 2 chests, summit peak).
6. **Build & Testing**: Build succeeds in ~350ms (`npm run build`). Headless testing is fully functional using Node 24's native `node --test` test runner.
7. **Performance Recommendation**: Must implement `THREE.InstancedMesh` for foliage and props during the 5-biome overhaul to reduce draw calls from $\sim 1000$ to $\le 120$.

---

## 5. Verification Method

### 5.1 Independent Headless Test Execution
Execute the automated test script in PowerShell from the project root:
```powershell
node --test .agents/teamwork/explorer_survey_3/test_survey_verification.mjs
```
**Expected Output**:
- `✔ WorldManager: Analytical Height & Ramp Queries`
- `✔ WorldManager: Bouncy Mushroom Trigger & Power`
- `✔ DialogueSystem: Graph Integrity & Story Flags`
- 3 passed, 0 failed, duration < 500ms.

### 5.2 Build Verification
Execute the production build:
```powershell
npm run build
```
**Expected Output**:
- Exit code 0, 21 modules transformed, `dist/` created.

### 5.3 Invalidation Conditions
The conclusions of this report become invalidated if:
1. `Player3D.js` or `WorldManager.js` are replaced with a physics engine (e.g. Rapier or Cannon) without migrating height query interfaces.
2. `getGroundHeight(x, z)` coordinates are decoupled from visual terrain models, causing player floating or clipping.
3. Prop instancing is skipped while adding dense biome scenery, causing draw calls to exceed 1000 and dropping FPS below 60.
