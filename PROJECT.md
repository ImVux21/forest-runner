# Project: Forest Runner Visual & Environmental Overhaul

## Architecture
Forest Runner is a Three.js 3D web game structured as an open-world exploration adventure.
- **Entry & Runtime**: `index.html`, `src/main.js` boots `src/game/Game.js`.
- **Renderer**: `src/game/Renderer.js` initializes `THREE.WebGLRenderer`, tone mapping, shadows, and output color space.
- **Game Engine & Lighting**: `src/game/Game.js` coordinates the Three.js scene, camera, sun/moon/ambient/hemisphere lighting, day/night cycle, fireflies, and animation loop.
- **World & Biome Architecture**: `src/game/WorldManager.js` handles terrain geometry, cliffs, analytical ground heights (`getGroundHeight`), water planes, bridges, ramps, and environmental props.
- **Characters & Dialogues**: `src/game/Player3D.js` (active player controller, jumping, gliding, physics) and `src/game/NPCManager.js` (Finn, Bram, Spirit, procedural rigs, dialogues, quest prompts).
- **Collectibles & Quests**: `src/game/OpenWorldCollectibles.js` (coins, gems, chests, bouncy mushrooms, quest state).
- **UI HUD**: `src/ui/HUD.js` (stamina bar, quest logs, dialogue boxes, time-of-day indicator).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | ACESFilmic Tone Mapping | Upgrade WebGLRenderer with ACESFilmic tone mapping and calibrated exposure (~1.1) | M1 | ORIGINAL_REQUEST §R1 |
| F2 | Soft PCF Shadows | Switch shadow map type to `THREE.PCFSoftShadowMap` with tuned bias and frustum | M1 | ORIGINAL_REQUEST §R1 |
| F3 | Dynamic 4-Phase Day/Sunset/Night Transitions | Continuous smooth interpolation of sun color, ambient/hemi intensity, fog, sky, and dawn reset | M1 | ORIGINAL_REQUEST §R1 |
| F4 | Warm Localized Point Lights | Add warm point lights at village lanterns, campfires, and mushroom caps for night scenes | M1 | ORIGINAL_REQUEST §R1, R3 |
| F5 | Drifting 3D Low-Poly Clouds | Low-poly cloud meshes drifting across the sky with boundary wrapping | M1 | ORIGINAL_REQUEST §R3 |
| F6 | Ambient Particle Systems | Floating leaf/pollen particles, mushroom grove spores, campfire smoke and flame particles | M1 | ORIGINAL_REQUEST §R3 |
| F7 | Stepped Organic Cliffs & Boundaries | Replace flat 12m boundary boxes and flat plateau cliffs with stepped, naturalized rock contours | M2 | ORIGINAL_REQUEST §R2, R3 |
| F8 | Animated River Surface & Canyon | Continuous sunken riverbed, sinusoidal water wave/ripple animation, riverbed pebbles, and wooden docks | M2 | ORIGINAL_REQUEST §R2 |
| F9 | Analytical Terrain & Collision Integrity | Preserve `WorldManager.getGroundHeight(x, z)` analytical precision, ramps, and <=1.2m step threshold | M2 | ORIGINAL_REQUEST §R4 |
| F10 | Whispering Village & Crossroads | Cobblestone paths, rustic signposts, flower patches, and lantern posts centered around Finn | M3 | ORIGINAL_REQUEST §R2 |
| F11 | Luminescent Mushroom Grove | Giant glowing fantasy mushrooms with emissive caps, glowing flora, and ambient spore particles | M3 | ORIGINAL_REQUEST §R2 |
| F12 | Ancient Sunken Ruins | Weathered mossy stone pillars, ancient ceremonial altar, and floating rotating magical rune crystals | M3 | ORIGINAL_REQUEST §R2 |
| F13 | Windy Peak & Lookout Tower | Multi-tier wooden observation tower on the summit, active campfire with flickering fire/smoke and panoramic overlook | M3 | ORIGINAL_REQUEST §R2 |
| F14 | Gameplay & Quest Mechanics Preservation | Ensure player traversal, glider physics, 4 bouncy mushrooms, 3 quests, Finn/Bram/Spirit dialogues remain 100% functional | M4 | ORIGINAL_REQUEST §R4 |
| F15 | Performance 60 FPS & Draw Call Optimization | Geometry instancing (`THREE.InstancedMesh`), material reuse, draw call budget <= 120, zero console errors | M4 | ORIGINAL_REQUEST §R4 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Lighting, Tonemapping & Atmospheric FX Engine | F1, F2, F3, F4, F5, F6 (Renderer, Day/Night, Sky/Fog, Clouds, Particles, Point Lights) | none | DONE |
| M2 | River, Canyon & Organic Stepped Terrain/Boundaries | F7, F8, F9 (Naturalized cliffs, mountain boundaries, animated water, riverbed, docks, height integrity) | M1 | DONE |
| M3 | 5 Distinct Scenic Biomes & Landmark Architectures | F10, F11, F12, F13 (Village, Crossroads, Mushroom Grove, Ancient Ruins, Summit Lookout Tower, Campfire) | M2 | PLANNED |
| M4 | Gameplay Integration, Optimization & Final E2E Pass | F14, F15 (Collision verification, glider/climb tests, NPC/quest checks, 60 FPS optimization, build pass) | M3 | PLANNED |

## Interface Contracts
### Renderer ↔ Game (`Renderer.js` ↔ `Game.js`)
- `Renderer.js` exports `initRenderer()` returning `{ renderer, composer }` (or setting up WebGLRenderer).
- Tone mapping set on `renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;`
- Shadow map set on `renderer.shadowMap.type = THREE.PCFSoftShadowMap;`

### Day/Night & Lighting ↔ Biomes / Props (`Game.js` ↔ `WorldManager.js`)
- `Game.js` manages global light sources (`sunLight`, `ambientLight`, `hemiLight`).
- `Game.js` exposes time-of-day state (`this.timeOfDay`, `this.isNight`) or callbacks for dynamic night-time point lights.
- Lanterns, campfire, and mushroom caps link point lights or toggle intensities smoothly based on `timeOfDay`.

### Terrain & Water ↔ Player Controller (`WorldManager.js` ↔ `Player3D.js`)
- `WorldManager.getGroundHeight(x, z)` remains the single source of truth for ground height.
- River water surface is visual at `y = 0.04m`; canyon bed is below river; bridge and ramps maintain exact connection heights.
- Stepped cliffs must maintain `step <= 1.2m` for deliberate paths/ramps and `step > 1.2m` for barrier walls.

### Water Animation ↔ Render Loop (`WorldManager.js` ↔ `Game.js`)
- `WorldManager.update(delta, elapsed)` updates animated water mesh (wave displacement / ripples) and floating props (docks, runes).

### Particles / Clouds ↔ Render Loop (`AtmosphereManager.js` / `Game.js`)
- `AtmosphereManager.update(delta, elapsed)` updates drifting clouds and instanced particles.

## Code Layout
- `src/game/Renderer.js` — WebGLRenderer setup, ACESFilmic tonemapping, shadow map configuration.
- `src/game/Game.js` — Game loop, camera, lighting, 4-phase day/night cycle, fireflies, atmosphere wiring.
- `src/game/WorldManager.js` — Terrain geometry, stepped cliffs, mountain boundaries, river, biomes, landmarks, props, `getGroundHeight`.
- `src/game/AtmosphereManager.js` (or integrated within `Game.js`) — Drifting 3D clouds, falling leaves, mushroom spores, campfire smoke/flame particles.
- `src/game/Player3D.js` — Player controller, jump/glide physics, step collision check.
- `src/game/NPCManager.js` — Finn, Bram, Spirit rigs and dialogues.
- `src/game/OpenWorldCollectibles.js` — Coins, gems, chests, bouncy mushrooms.
- `tests/` — E2E and unit test suites.
