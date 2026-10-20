# Handoff Report — World Geometry, Terrain & Biomes Survey

**Agent**: `explorer_survey_2`  
**Recipient**: `parent` (orchestrator)  
**Date**: 2026-09-27  
**Artifact**: `c:/Users/vuodo/software/forest-runner/.agents/teamwork/explorer_survey_2/survey_report.md`  

---

## 1. Observation

Direct observations from inspecting the codebase:

1. **Active Game Architecture & Mode**:
   - `src/main.js:10` instantiates `const game = new Game(container)`.
   - `src/game/Game.js:23-38` initializes `Renderer`, `WorldManager`, `Player3D`, `ThirdPersonCamera`, `OpenWorldCollectibles`, `DialogueSystem`, `NPCManager`, `InputManager`, `AudioManager`, and `SaveManager`.
   - Legacy files `src/game/SceneManager.js`, `src/game/Player.js`, `src/game/ObstacleManager.js`, and `src/game/CollectibleManager.js` are from an older infinite runner prototype and are not referenced by `Game.js` or `main.js`.

2. **Map Dimensions & Coordinate Extents**:
   - `src/game/WorldManager.js:18`: `this.mapSize = 90; // 90m x 90m explorable valley`.
   - Ground floor: `PlaneGeometry(90, 90, 16, 16)` at `y = 0.0m` (`WorldManager.js:145-149`).
   - Movement bounds: clamped to `[-41.5, +41.5]` along X and Z (`Player3D.js:351`).
   - Center spawn: `(0, 0, 0)` (`Player3D.js:254`, `Game.js:116`).

3. **Plateaus, Cliffs & Boundary Walls**:
   - 4 plateaus defined as single rectangular boxes (`WorldManager.js:21-33`):
     - `p_north`: `x: -12, z: 18, w: 32, d: 26, height: 3.5`
     - `p_peak`: `x: 18, z: 22, w: 22, d: 20, height: 7.0`
     - `p_southwest`: `x: -18, z: -16, w: 26, d: 22, height: 3.5`
     - `p_southeast`: `x: 20, z: -18, w: 24, d: 24, height: 3.5`
   - Cliff bodies are monolithic vertical boxes (`BoxGeometry(p.w, p.height, p.d)`) with material `cliffMat` (`0x768574`, flat grey) and a flat box cap (`WorldManager.js:157-168`).
   - Boundaries are 4 monolithic flat box walls (`h: 12, d: 6`) along the perimeter (`WorldManager.js:200-219`).
   - Slopes/Ramps: 4 simple tilted box ramps (`WorldManager.js:36-48, 174-194`).
   - Suspension Bridge: 14 wood planks with sine droop spanning between SW and SE plateaus at `(1, 3.55, -17)` (`WorldManager.js:51-54, 249-286`).

4. **River Implementation**:
   - `WorldManager.js:223-245`: 5 disconnected flat planes hovering at `y = 0.04m` on top of the grass plane.
   - Material: `MeshStandardMaterial` (`0x18b5d6`, opacity 0.75).
   - Zero flow animation, zero ripples, zero depth/trench, zero pebbles, zero docks.

5. **NPCs & Existing Landmarks**:
   - Old Explorer Finn: `(-4.0, 0.0, -4.0)` (`NPCManager.js:24`).
   - Woodsman Bram: `(1.0, 3.5, -13.0)` (`NPCManager.js:137`).
   - Forest Spirit: `(18.0, 7.0, 18.0)` (`NPCManager.js:235`).
   - 4 Bouncy Mushrooms: `(-26, 8)`, `(6, 27)`, `(-5, -15)`, `(8, -8)` (`WorldManager.js:292-304`).
   - Collectibles: 18 Coins, 4 Emerald Gems, 2 Golden Chests (`(18, 7.45, 20)` on Peak, `(-24, 3.95, -20)` on SW Plateau) (`OpenWorldCollectibles.js:50-81`).

6. **Prop Assets & 3D Models**:
   - Only 10 KayKit Nature GLTFs exist in `/public/assets/forest/gltf/` (5 trees, 2 bushes, 3 rocks).
   - In `WorldManager.js:370-402`, 75 trees, 45 rocks, and 50 bushes are randomly placed across the map without zone differentiation.
   - No village buildings, no signposts, no lantern posts, no river docks, no giant fantasy mushrooms, no stone ruins, no altar, no summit lookout tower, and no campfire exist anywhere in the assets or codebase.

7. **Build & Performance Baseline**:
   - `npm run build` executed cleanly in 532ms with zero errors.

---

## 2. Logic Chain

1. **Mapping Requirement R2 to Existing Architecture**:
   - Requirement R2 mandates: 5 distinct scenic biomes (Whispering Village & Crossroads, Crystal River & Canyon, Luminescent Mushroom Grove, Ancient Sunken Ruins, Windy Peak & Lookout Tower), organic stepped cliffs, animated water, multi-tier summit tower, campfire, and ruins.
   - Observation 3 & 4 show that the existing terrain consists of flat boxes (`BoxGeometry`), 4 flat border walls, and 5 static water planes.
   - Observation 6 shows that no external 3D models exist for village houses, towers, ruins, or giant mushrooms.
   - However, Observation 1, 3, and 5 show that the player character, NPCs (Finn, Bram, Spirit), suspension bridge, bouncy mushrooms, and collectibles were all constructed procedurally in code using Three.js geometric primitives and stylized toon PBR materials.
   - Therefore, the 5 biomes and their architectural landmarks can and should be authored directly as **stylized procedural Three.js meshes** in `WorldManager.js` (and dedicated modular helper classes). This matches the visual art style, avoids third-party model loading overhead, and guarantees zero missing file bugs.

2. **Terrain Stepping & Player Physics Compatibility**:
   - Observation 2 & 3 show that `Player3D.js:358-364` enforces a step-height threshold: if `heightDiff > 1.2 && isGrounded`, horizontal movement is blocked.
   - `WorldManager.js:434-469` determines terrain collision analytically via `getGroundHeight(x, z)`.
   - Therefore, introducing organic stepped cliffs with tier increments `<= 1.2m` (or stepped terrace ledges with accessible ramps/stairs) will allow natural climbing while preserving the required exploration gating.

3. **Biome Distribution Logic**:
   - Observation 5 maps the 4 existing plateaus and landmarks:
     - Center Valley `(-4, -4)` is anchored by Finn -> Natural location for **Whispering Village & Crossroads**.
     - River S-curve runs across the valley floor -> Natural location for **Crystal River & Canyon**.
     - SW Plateau `(-18, -16)` -> Natural location for **Luminescent Mushroom Grove** (adjacent to bouncy mushroom launchers and suspension bridge).
     - SE Plateau `(20, -18)` -> Natural location for **Ancient Sunken Ruins** (secluded plateau across the bridge with gem reward).
     - Peak Plateau `(18, 22)` (`y = 7.0m`) is anchored by Forest Spirit and Golden Chest -> Natural location for **Windy Peak & Lookout Tower** and active campfire.

---

## 3. Caveats

1. **Collision Precision**: In the current codebase, collision is not mesh-based (no Havok/Cannon/Rapier/BVH); it is driven by `world.getGroundHeight(x, z)` returning heights of registered rectangular zones. Any new terrain tiers or stepped rock ledges that the player can walk on must be registered in `getGroundHeight()`.
2. **Point Light Performance**: Point lights with shadow casting are heavy on mobile WebGL. Night-time point lights for lanterns, campfire, and glowing mushrooms should have reasonable attenuation ranges (`distance: 6m - 12m`) and `castShadow = false` (relying on the main directional sun/moon light for shadows) to preserve 60 FPS.
3. **Legacy Files**: `SceneManager.js`, `ObstacleManager.js`, and `CollectibleManager.js` in `src/game/` are inactive and should not be modified.

---

## 4. Conclusion

1. **Current State**: The game world is functionally an open-world sandbox with solid player mechanics (WASD move, sprint, jump, paraglider, camera orbit, dialogue, and coin/gem collection), but environmentally it is a bare prototype consisting of 4 flat box plateaus, 4 flat wall boxes, and 5 static flat water planes.
2. **Readiness for R2 Overhaul**: The codebase is cleanly structured and well-suited for procedural world generation. All 5 biomes can be authored without external dependencies by creating modular procedural Three.js meshes and shaders that fit into `WorldManager.js`.
3. **Actionable Implementation Order for Downstream Agents**:
   - **Step 1**: Upgrade renderer tonemapping & PCF soft shadows (`Renderer.js`).
   - **Step 2**: Rebuild terrain boundaries into low-poly mountain ranges and plateaus into stepped rock shelves (`WorldManager.js`).
   - **Step 3**: Rebuild the river with animated flowing ripple surface, sunken riverbed, pebbles, and wooden dock (`WorldManager.js`).
   - **Step 4**: Construct the 5 distinct biomes with their thematic landmarks (Village cottages/signposts/lanterns, Mushroom Grove canopy fungi/spores, Sunken Ruins pillars/altar/crystals, Windy Peak multi-tier lookout tower and active campfire).
   - **Step 5**: Introduce dynamic atmospheric polish (low-poly sky clouds, falling leaves/pollen, night point lights) and verify 60 FPS performance and gameplay integrity.

---

## 5. Verification Method

To verify the findings and validate subsequent implementations:

1. **Build Verification**:
   ```bash
   npm run build
   ```
   *Expected outcome*: Exits with code 0, 0 errors.

2. **File & Structure Verification**:
   - Inspect `survey_report.md` at `c:/Users/vuodo/software/forest-runner/.agents/teamwork/explorer_survey_2/survey_report.md`.
   - Inspect `src/game/WorldManager.js`, `src/game/Renderer.js`, and `src/game/Game.js` to cross-reference dimensions, coordinates, and entity positions.

3. **Runtime Invalidation Conditions**:
   - Any change that alters the exact positions of Finn `(-4, 0, -4)`, Bram `(1, 3.5, -13)`, or Spirit `(18, 7, 18)` without updating dialogue and quest logic.
   - Any cliff step `> 1.2m` that lacks a ramp or bouncy mushroom, trapping the player.
   - Any build error or console exception.
