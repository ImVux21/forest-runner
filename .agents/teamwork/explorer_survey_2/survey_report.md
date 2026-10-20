# Forest Runner — World Survey & Biome Exploration Report

**Date**: 2026-09-27  
**Agent**: `explorer_survey_2` (Read-Only Exploration Agent)  
**Target Project**: Forest Runner (Three.js 3D Open-World Adventure)  
**Reference Document**: `ORIGINAL_REQUEST.md` (Overhaul visuals, lighting, and environmental scenery)

---

## Executive Summary

Forest Runner is currently a stylized 3D open-world exploration adventure built with Three.js (`^0.186.1`) and Vite (`^8.3.0`). The active gameplay mode is driven by `Game.js`, `WorldManager.js`, `Player3D.js`, `NPCManager.js`, and `OpenWorldCollectibles.js` (legacy endless runner scripts `SceneManager.js`, `Player.js`, and `ObstacleManager.js` remain in the repo but are unused).

The current world geometry is largely composed of **flat, monocolor geometric boxes**:
- A single flat `90m x 90m` grass plane (`y = 0.0m`).
- 4 monolithic rectangular box plateaus with sheer vertical 90-degree cliffs (`y = 3.5m` and `y = 7.0m`).
- 4 giant rectangular box boundary walls (`12m` tall, `6m` thick) enclosing the world.
- 5 disjointed, static flat water planes hovering at `y = 0.04m` with zero animation.
- 170 randomly scattered KayKit nature models (trees, rocks, bushes) with no biome-specific clustering or environmental identity.

None of the 5 scenic biomes specified in Requirement R2 currently exist as distinct, polished environmental zones. However, the game possesses an excellent procedural mesh foundation: the player character, NPCs (Finn, Bram, Spirit), suspension bridge, bouncy mushrooms, and collectibles are all procedurally assembled from Three.js primitives and toon materials. This architecture provides the perfect framework to build out the 5 biomes, stepped cliffs, multi-tier lookout tower, active campfire, and organic landmarks using procedural Three.js meshes and shaders without requiring external asset downloads.

---

## 1. World Map / Terrain Architecture & Layout

### 1.1 Map Dimensions & Coordinate System
- **Total Explorable Area**: `90m x 90m` (`this.mapSize = 90` in `WorldManager.js:18`).
- **Coordinate Extents**:
  - `X`: `[-45.0m, +45.0m]` (West to East)
  - `Z`: `[-45.0m, +45.0m]` (In camera yaw convention, `-Z` is North, `+Z` is South)
  - `Y`: Elevation from `0.0m` (Valley Floor) to `7.0m` (Peak Summit)
- **Player Movement Clamping**: In `Player3D.js:351`, the player position is clamped to `[-41.5m, +41.5m]` (`(mapSize / 2) - 3.5m`), maintaining a 3.5m margin inside the boundary walls.
- **Spawn Point**: `(x: 0, y: 0, z: 0)` in the central valley floor.

### 1.2 Elevation Tiers
| Tier | Height (Y) | Region Description | Primary Landmark / Entities |
| :--- | :--- | :--- | :--- |
| **Tier 0** | `0.0m` | Central Valley Floor & Meadow | Player Spawn `(0, 0)`, Old Finn `(-4, -4)`, River Bed, Mushroom Launchers |
| **Tier 1** | `3.5m` | North Terrace, SW Overlook, SE Ridge | Woodsman Bram `(1, -13)`, Suspension Bridge `(1, -17)`, Emerald Gems |
| **Tier 2** | `7.0m` | High Eastern Peak (`p_peak`) | Forest Spirit `(18, 18)`, Golden Treasure Chest `(18, 20)`, Summit Jewel `(18, 26)` |
| **Bridge** | `3.55m` | Wooden Suspension Span (`y = 3.55m`) | Spans between SW Plateau (`x = -5`) and SE Plateau (`x = +8`) |

### 1.3 Plateau Coordinates & Geometry
Defined in `WorldManager.js:21-33`:
```javascript
// Plateau definition: { id, x, z, w, d, height }
plateaus = [
  { id: 'p_north', x: -12, z: 18, w: 32, d: 26, height: 3.5 },     // X: [-28, 4],   Z: [5, 31]
  { id: 'p_peak', x: 18, z: 22, w: 22, d: 20, height: 7.0 },       // X: [7, 29],    Z: [12, 32]
  { id: 'p_southwest', x: -18, z: -16, w: 26, d: 22, height: 3.5 },// X: [-31, -5],  Z: [-27, -5]
  { id: 'p_southeast', x: 20, z: -18, w: 24, d: 24, height: 3.5 }, // X: [8, 32],    Z: [-30, -6]
];
```

### 1.4 Ramps & Access Slopes
Defined in `WorldManager.js:36-48`:
1. **Ramp 1 (Valley -> North Plateau)**: `x: -12, z: 3, w: 7, d: 10`, axis `z`, `0.0m -> 3.5m`.
2. **Ramp 2 (North Plateau -> Peak Summit)**: `x: 5, z: 22, w: 10, d: 6`, axis `x`, `3.5m -> 7.0m`.
3. **Ramp 3 (Valley -> SW Plateau)**: `x: -18, z: -3, w: 7, d: 10`, axis `z`, `0.0m -> 3.5m`.
4. **Ramp 4 (Valley -> SE Plateau)**: `x: 6, z: -18, w: 10, d: 7`, axis `x`, `0.0m -> 3.5m`.

### 1.5 Physics & Ground Height Query Mechanism
In `WorldManager.js:434-469`, `getGroundHeight(x, z)` performs analytical point-in-box checks:
1. Checks Suspension Bridge bounds (`x ∈ [-6, 8]`, `z ∈ [-18.8, -15.2]`) -> returns `3.55`.
2. Checks Ramps -> linearly interpolates (`lerp`) height from `startH` to `endH` along axis `x` or `z`.
3. Checks Plateaus -> returns `p.height` if inside plateau AABB.
4. Default fallback: returns `0.0`.

In `Player3D.js:358-364`, player collision against terrain uses a step-height check:
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
**Key Gameplay Takeaway**: Any slope or stepped terrace where individual tier height is `<= 1.2m` allows the player to walk up smoothly. Steps `> 1.2m` block horizontal movement, requiring jump, ramp traversal, or bouncy mushroom launch.

---

## 2. Boundary Walls & Cliff Structure

### 2.1 Outer Boundary Walls
Defined in `WorldManager.js:200-219`:
- **Construction**: 4 monolithic `THREE.BoxGeometry` meshes with material `boundaryMat` (`0x4d6350`, roughness 0.95, flatShading true):
  - North Wall: `x: 0, z: -45, w: 102, h: 12, d: 6`
  - South Wall: `x: 0, z: 45, w: 102, h: 12, d: 6`
  - West Wall: `x: -45, z: 0, w: 6, h: 12, d: 102`
  - East Wall: `x: 45, z: 0, w: 6, h: 12, d: 102`
- **Visual Assessment**: Extremely rigid, unnatural, and claustrophobic. Resembles a concrete arena perimeter rather than an expansive alpine valley surrounded by majestic mountain ridges.

### 2.2 Plateau Cliffs
Defined in `WorldManager.js:152-171`:
- Each plateau consists of:
  - A cliff body: `new THREE.Mesh(new THREE.BoxGeometry(p.w, p.height, p.d), this.cliffMat)`. `this.cliffMat` color `0x768574` (dull grey).
  - A grass cap: `new THREE.Mesh(new THREE.BoxGeometry(p.w + 0.4, 0.25, p.d + 0.4), this.grassMat)` at `y = p.height + 0.12`.
- **Visual Assessment**: Sharp 90-degree rectilinear box walls. No rock layering, no stepped ledges, no bevels, no crags, and no natural overhangs.

---

## 3. Existing Landmarks, Zones, & Spatial Coordinates

Below is the definitive spatial map of all interactable entities, NPCs, structures, and collectibles currently active in the world:

```
                          [-45, -45] ────────── North Border ────────── [+45, -45]
                                     |                             |
                                     |     [SW Overlook (Tier 1)]  |  [SE Ridge (Tier 1)]
                                     |     Plateau C (-18, -16)    |  Plateau D (20, -18)
                                     |     Chest (-24, -20)        |  Gem (24, -20)
                                     |     Gem (-22, -20)          |
                                     |            \                /
                                     |          [Suspension Bridge] (1, -17)
                                     |          Bram NPC (1, -13)
                                     |                             |
                                     |      [Central Valley]       |
                                     |      Spawn (0, 0)           |
                                     |      Finn NPC (-4, -4)      |
                                     |      River S-Curve          |
                                     |                             |
                                     |   [North Plateau (Tier 1)]  |  [Windy Peak (Tier 2)]
                                     |   Plateau A (-12, 18)       |  Plateau B (18, 22)
                                     |   Gem (-14, 24)             |  Forest Spirit (18, 18)
                                     |   Mushroom #2 (6, 27) ───>  |  Summit Chest (18, 20)
                                     |                             |  Peak Jewel (18, 26)
                          [-45, +45] ────────── South Border ────────── [+45, +45]
```

### Detailed Coordinate Table:
| Category | Identifier | World Position (X, Y, Z) | Elevation Tier | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Player** | Spawn | `(0.0, 0.0, 0.0)` | Tier 0 | Faces camera yaw 0 (North) |
| **NPC** | Old Explorer Finn | `(-4.0, 0.0, -4.0)` | Tier 0 | Intro questgiver, wizard hat & staff |
| **NPC** | Woodsman Bram | `(1.0, 3.5, -13.0)` | Tier 1 | Bridge guardian, axe & lumberjack cap |
| **NPC** | Forest Spirit | `(18.0, 7.0, 18.0)` | Tier 2 | Summit climax, glowing halo & wisps |
| **Structure** | Suspension Bridge | `(1.0, 3.55, -17.0)` | Tier 1 | 14 wood planks, railing posts, ropes |
| **Chest** | Summit Treasure | `(18.0, 7.45, 20.0)` | Tier 2 | Reward on peak |
| **Chest** | SW Overlook Treasure | `(-24.0, 3.95, -20.0)` | Tier 1 | Reward across bridge |
| **Gem** | North Ridge Gem | `(-14.0, 4.6, 24.0)` | Tier 1 | Radiant emerald octahedron |
| **Gem** | South Overlook Gem | `(-22.0, 4.6, -20.0)` | Tier 1 | Radiant emerald octahedron |
| **Gem** | East Ridge Gem | `(24.0, 4.6, -20.0)` | Tier 1 | Radiant emerald octahedron |
| **Gem** | Peak Jewel | `(18.0, 8.1, 26.0)` | Tier 2 | Highest gem in the game |
| **Bouncy Pad** | Spot 1 (North Base) | `(-26.0, 0.0, 8.0)` | Tier 0 -> Tier 1 | Power 20 (targets H 4.5) |
| **Bouncy Pad** | Spot 2 (North Ridge) | `(6.0, 3.5, 27.0)` | Tier 1 -> Tier 2 | Power 22 (shoots to Peak summit) |
| **Bouncy Pad** | Spot 3 (SW Base) | `(-5.0, 0.0, -15.0)` | Tier 0 -> Tier 1 | Power 19 (targets H 4.5) |
| **Bouncy Pad** | Spot 4 (SE Base) | `(8.0, 0.0, -8.0)` | Tier 0 -> Tier 1 | Power 19 (targets H 4.5) |
| **Coins** | 18 Coins | Distributed | Tiers 0, 1, Ramps | Form guidance trails along paths |

---

## 4. Assessment of the 5 Target Biomes (R2)

| Biome | Target Requirements (R2) | Current Codebase State | Gap Analysis & Missing Elements |
| :--- | :--- | :--- | :--- |
| **1. Whispering Village & Crossroads** | Cobblestone paths, rustic signposts, flower patches, lantern posts, cozy village feel. | **MISSING**. Only Old Finn stands on bare grass near `(0, 0)`. No paths, no houses, no lanterns, no signs. | • Cobblestone crossroads texture/mesh linking spawn, river, ramps.<br>• 2-3 rustic wooden cottages with gabled roofs.<br>• Directional wooden signposts ("Summit", "Ruins", "Grove").<br>• Rustic lantern posts with warm point lights.<br>• Colorful flower patches & village props (barrels, fences). |
| **2. Crystal River & Canyon** | Flowing animated water surface with ripple movement, riverbed pebbles, wooden docks, canyon feel. | **RUDIMENTARY**. 5 static flat planes sitting at `y = 0.04m` on top of grass. No animation, no depth, no dock. | • Animated water shader / UV scroll / ripple displacement.<br>• Carved riverbed depression / sunken canyon rock banks.<br>• Smooth river pebbles & stones lining the bank.<br>• Wooden fishing dock with mooring posts & lantern.<br>• Reeds and water lily pads. |
| **3. Luminescent Mushroom Grove** | Giant glowing fantasy mushrooms, ambient spore particles, glowing accents, magical ambiance. | **PARTIAL/WEAK**. Only has 4 standard red bouncy gameplay mushrooms with flat colors. | • Giant bioluminescent canopy mushrooms (neon cyan, violet, magenta).<br>• Glowing under-cap gills and pulsating emissive spots.<br>• Ambient floating spore particle system with soft upward drift.<br>• Small cluster fungi illuminating the forest floor.<br>• Subdued, mystical ambient lighting in this grove. |
| **4. Ancient Sunken Ruins** | Weathered mossy stone pillars, ancient altar, floating magical runes/crystals. | **COMPLETELY MISSING**. Zero ruin assets exist. SE Plateau is currently an empty grass box. | • Weathered mossy stone pillars (upright, cracked, fallen).<br>• Ancient stone ceremonial dais/altar with stepped platform.<br>• Floating, rotating glowing arcane runes and floating crystals.<br>• Stone ruin perimeter low walls, broken arches, flagstones. |
| **5. Windy Peak & Lookout Tower** | Multi-level wooden observation tower on summit, active campfire with flickering fire/smoke, panoramic valley overlook. | **PARTIAL**. High peak exists (`y = 7.0m`) with Forest Spirit, but summit is completely bare flat grass cap. | • Multi-tier wooden lookout tower with climbing ramps/stairs & roof canopy.<br>• Active campfire: stone ring, logs, animated fire cone mesh, smoke wisps.<br>• Warm flickering point light illuminating the peak at night.<br>• Wooden overlook observation deck with railings facing the valley.<br>• Wind trail / gust particle streaks across the peak. |

---

## 5. Assets, 3D Models, & Procedural Meshes Inventory

### 5.1 KayKit Nature GLTF Assets Available in `/public/assets/forest/gltf/`
The project ships with 10 modular nature models by Kay Lousberg (CC0):
1. `Tree_1_A.gltf` (Large lush evergreen / pine style)
2. `Tree_2_A.gltf` (Medium multi-cluster pine)
3. `Tree_3_A.gltf` (Round deciduous canopy tree)
4. `Tree_4_A.gltf` (Stylized conical tree)
5. `Tree_Bare_1_A.gltf` (Spooky bare dead tree trunk with branches)
6. `Bush_1_A.gltf` (Dense green shrub)
7. `Bush_2_A.gltf` (Low rounded bush)
8. `Rock_1_A.gltf` (Large angular boulder)
9. `Rock_2_A.gltf` (Medium flat-topped rock)
10. `Rock_3_A.gltf` (Jagged rock formation)
- **Texture**: `forest_texture.png` (shared low-poly color palette texture).

### 5.2 Procedural Meshes Already Implemented in Code
The codebase demonstrates high proficiency in composing stylized toon assets via Three.js primitives:
- **Player Character**: Rigged adventurer with jacket, headband, fringe hair, scarf ribbons, belt buckle, backpack, and folding delta-wing paraglider (`Player3D.js:57-248`).
- **Old Explorer Finn**: Cylinder torso, scarf collar, explorer cone hat, cone beard, walking staff, and rotating emissive octahedron crystal (`NPCManager.js:22-132`).
- **Woodsman Bram**: Flannel torso, vest, lumberjack pants, boots, trapper cap, and double-bladed axe (`NPCManager.js:135-230`).
- **Forest Spirit**: Glowing icosahedron core, floating torus halo, and 3 orbiting dodecahedron wisps with a turquoise point light (`NPCManager.js:233-326`).
- **Suspension Bridge**: 14 curved wood planks with sine catenary sag, upright wood cylinder posts, and handrail ropes (`WorldManager.js:249-286`).
- **Bouncy Mushrooms**: Tapered cylinder white stem, red cartoon dome cap (`SphereGeometry`), and 5 white dodecahedron polka dots (`WorldManager.js:290-351`).
- **Collectibles**: Rotated cylinders for gold coins, green octahedra for emeralds, and wood/gold banded treasure chests (`OpenWorldCollectibles.js:15-139`).
- **Fireflies**: 40 floating dodecahedron glowing yellow-green meshes animated with sine trajectories during night (`Game.js:122-142`).

### 5.3 Missing Props Needed for R2 & How to Build Them
Because external network asset downloads can introduce missing file errors or version mismatches, building all R2 landmarks via **stylized procedural Three.js compound meshes** matches the exact style of the game and guarantees 100% build reliability:
1. **Lookout Tower**: Multi-level post-and-beam construction using `BoxGeometry` and `CylinderGeometry`, floor deck planks, perimeter railing balustrades, diagonal bracing struts, a ladder/ramp connecting Tier 1 to Tier 2 observation deck, and a four-corner peaked hip roof canopy.
2. **Active Campfire**: Circular ring of 8-10 small `DodecahedronGeometry` river stones, 4 cross-laid charred brown/black `CylinderGeometry` wood logs, internal glowing ember dome, layered orange/yellow animated flame meshes with vertex pulse, and rising transparent smoke puffs (`DodecahedronGeometry` with upward velocity and fading opacity).
3. **Cottages / Village Buildings**: Stylized plaster/wood-framed walls (`BoxGeometry`), dark wooden corner pillars, angled timber roof with overhangs and shingles, front door with handle, warm glowing amber window panes (`emissive: 0xffaa33`), and stone chimneys.
4. **Signposts & Lantern Posts**: Carved wooden post (`CylinderGeometry`), horizontal directional arm boards with arrow cuts, hanging iron/brass lantern housing an emissive amber core and a soft `PointLight(0xffa233, 1.2, 8)`.
5. **Ancient Stone Pillars & Altar**: Fluted/beveled stone columns (`CylinderGeometry` with 8-12 segments), broken/tilted capital blocks, moss-tinted stone slab altar with stepped base (`BoxGeometry`), and hovering rotating glowing rune rings (`RingGeometry` or `TorusGeometry` with rune markings) and floating magic crystals.
6. **Giant Glowing Mushrooms**: Slender curved stalks (`CylinderGeometry`), wide curved parasol caps (`ConeGeometry` or `SphereGeometry`), glowing underside gill rings, emissive pulsing dots, and local point lights.
7. **Wooden Dock**: Heavy timber pilings driven into the river bed, crossbeams, weathered wooden deck planks, iron mooring cleat, and hanging dock lantern.
8. **Stepped Cliff Rock Formations**: Layered rocky terraces composed of bevelled boxes and clustered rock boulders surrounding plateau edges to turn 90-degree drops into stepped geological shelves.

---

## 6. The River: Current Placement & Required Overhaul

### 6.1 Current River Implementation
Defined in `WorldManager.js:223-245`:
```javascript
// S-curve river segments along valley floor
const segments = [
  { x: -28, z: -32, w: 7, d: 24, rot: 0.4 },
  { x: -16, z: -10, w: 8, d: 26, rot: 0.1 },
  { x: 0, z: 8, w: 9, d: 22, rot: -0.5 },
  { x: 18, z: -2, w: 8, d: 24, rot: 0.3 },
  { x: 32, z: 20, w: 10, d: 28, rot: 0.6 },
];
```
- **Geometry**: 5 disjointed rectangular planes positioned at `y = 0.04m` with manual Z rotations.
- **Material**: `MeshStandardMaterial` (`color: 0x18b5d6, roughness: 0.1, metalness: 0.6, transparent: true, opacity: 0.75`).
- **Deficiencies**:
  - Overlapping seams and sharp angular junctions where segments meet.
  - Hovering 4cm above the flat grass plane rather than sitting in a carved riverbed.
  - Totally static: no wave undulation, no flow motion, no ripples, no foam edges.
  - No riverbanks, no pebbles, no wooden dock, no canyon walls.

### 6.2 Target River Overhaul
1. **Geometry**: A continuous polygonal river ribbon or segmented curved mesh with subdivided vertices along the river flow line.
2. **Sunken Riverbed / Canyon**: Shallow embankment walls (`y = -0.3m` bed, water surface at `y = -0.05m` or `0.02m` with rock edging) so the water looks genuinely sunken into the terrain.
3. **Animated Water Shader / Material**:
   - Time-driven vertex undulation using sine waves in `update(delta, time)`.
   - Animated water surface with dynamic ripple movement (procedural canvas wave texture or dual-layer scrolling normal/ripple map).
   - Crisp stylized foam lines along the shore edges.
4. **Scenic Props**:
   - Clusters of smooth riverbed pebbles and rounded river rocks along the shallow edges.
   - A wooden dock extending into the water near `x: 0, z: 8` with wooden mooring posts and planks.

---

## 7. Concrete Architectural Blueprint for R2 Implementation

To achieve complete compliance with Requirement R2 while honoring R1 (Lighting), R3 (Atmosphere), and R4 (Performance/Gameplay), the overhaul should be structured into clear modular extensions within `WorldManager.js` (or cleanly separated helper modules in `src/game/`):

### 7.1 Stepped Organic Cliffs & Boundary Mountains
- **Outer Mountain Ridge**: Replace the 4 flat boundary boxes in `_buildBoundaryMountains()` with a perimeter ring of stylized jagged mountain peaks (pyramidal low-poly cones/dodecahedra grouped at varying heights `14m - 22m` along `x = ±44` and `z = ±44`, covered in alpine rock tones `0x4a5d4e` and pine trees).
- **Stepped Terraces**: Replace the monolithic boxes of `p_north`, `p_southwest`, and `p_southeast` with 2-3 tiered rock shelves (e.g. Lower shelf at `1.75m`, Upper shelf at `3.5m`), populated with boulder buttresses along the perimeter.
- **Summit Approach**: Structure Plateau B (`p_peak`, `7.0m`) with stepped rocky ledges and natural rock stairs flanking Ramp 2, creating an impressive alpine peak.

### 7.2 Biome Distribution Map (90m x 90m)
```
  [X: -45, Z: -45] ────────────────────────────────────────── [X: +45, Z: -45]
  │                                                                          │
  │   BIOME 3: LUMINESCENT MUSHROOM GROVE    BIOME 4: ANCIENT SUNKEN RUINS   │
  │   • Location: SW Plateau (-18, -16)      • Location: SE Plateau (20, -18)│
  │   • Giant bioluminescent mushrooms       • Weathered mossy stone pillars │
  │   • Glowing spores, purple/cyan light    • Ancient altar & dais          │
  │   • Bouncy pads & magical undergrowth    • Floating glowing rune crystals│
  │                         \                      /                         │
  │                          [SUSPENSION BRIDGE]                             │
  │                          (1, 3.55, -17)                                  │
  │                                                                          │
  │                   BIOME 1: WHISPERING VILLAGE & CROSSROADS               │
  │                   • Location: Center Valley (-4, 0, -4)                  │
  │                   • Cobblestone paths, rustic signposts                  │
  │                   • Old Finn NPC, rustic cottages, fences                │
  │                   • Warm night lanterns & flower beds                    │
  │                                                                          │
  │   BIOME 2: CRYSTAL RIVER & CANYON        BIOME 5: WINDY PEAK & LOOKOUT   │
  │   • Location: Meandering S-Curve         • Location: High Summit (18, 22)│
  │   • Animated flowing water with ripples  • Multi-tier wooden tower       │
  │   • Sunken riverbed & pebbles            • Active campfire (fire/smoke)  │
  │   • Wooden fishing dock & reeds          • Forest Spirit NPC & overlook  │
  │                                                                          │
  [X: -45, Z: +45] ────────────────────────────────────────── [X: +45, Z: +45]
```

### 7.3 Detailed Biome Components & Specifications

#### Biome 1: Whispering Village & Crossroads (`x: [-14..8]`, `z: [-12..4]`)
- **Centerpiece**: The Village Crossroads right outside Finn’s post `(-4, -4)`.
- **Cobblestone Road Network**: Segmented stone path tiles (`0x8b8577`) branching in 4 directions:
  - North branch toward the Suspension Bridge.
  - South branch toward the River Dock and Canyon.
  - East branch toward the Mountain Path to Windy Peak.
  - West branch toward the Mushroom Grove ramp.
- **Village Structures**: 2 stylized rustic cottages (`BoxGeometry` body, dark wood trim, steep gable roof `0x8c432a`, glowing windows, stone chimney).
- **Decorations**:
  - 3 Wooden Signposts with carved pointing arrows.
  - 4 Rustic Wooden Lantern Posts with warm point lights (`0xff9933`, intensity `1.2`, distance `8m`) that activate at sunset/night.
  - Clustered vibrant flower patches (red, yellow, purple, white) around cottage fences.

#### Biome 2: Crystal River & Canyon (`x: [-32..32]`, `z: [-35..25]`)
- **River Course**: Smooth continuous S-curve with shallow embankment walls.
- **Animated Water Surface**: Subdivided plane with vertex wave movement (`position.y = Math.sin(x * 0.3 + time * 2) * 0.08`) and scrolling water ripple texture/material.
- **Wooden Dock**: `(x: -8, z: -10)` extending into the river with 4 support pilings, plank deck, mooring post, and hanging lantern.
- **Canyon Features**: Flanking stone slabs, riverbed pebbles, and river reeds.

#### Biome 3: Luminescent Mushroom Grove (`x: [-30..-8]`, `z: [-26..-6]`)
- **Location**: Southwest Plateau and surrounding valley approach.
- **Giant Fantasy Mushrooms**:
  - 6 large mushroom trees (`height: 3.5m - 6.0m`) with undulating caps in cyan (`0x00f0ff`), deep violet (`0x9b51e0`), and magenta (`0xff007f`).
  - Emissive undersides with pulsating glow.
  - 2-3 local colored point lights illuminating the grove in neon hues during twilight and night.
- **Spore Particle System**: 35-50 slow-drifting glowing spore particles floating gently upwards with subtle horizontal turbulence.

#### Biome 4: Ancient Sunken Ruins (`x: [10..30]`, `z: [-28..-8]`)
- **Location**: Southeast Plateau (Tier 1).
- **Stone Pillars**:
  - 6 standing fluted stone pillars (`height: 3.0m - 4.5m`) with weathered mossy stone material (`0x687465`).
  - 3 broken/tilted fallen pillar segments half-sunken in the earth.
- **Ceremonial Altar**: A 2-tier circular/octagonal stone dais with a central engraved sacrificial/relic altar stone.
- **Arcane Magic**:
  - 3 hovering, slowly revolving glowing runic crystals (`OctahedronGeometry` and `TorusGeometry`, emissive cyan/gold).
  - Subtle rotating energy particles.

#### Biome 5: Windy Peak & Lookout Tower (`x: [10..28]`, `z: [14..30]`)
- **Location**: High Summit Plateau B (`y = 7.0m`).
- **Multi-Level Wooden Lookout Tower**:
  - 4 heavy timber corner stilts rising to `y = 13.5m`.
  - Mid-level landing platform with safety balustrades.
  - High observation deck at `y = 12.0m` with 360-degree panoramic view of the entire 90m valley.
  - Peaked pyramid wood shingle roof canopy.
  - Wooden stairs/ladder for player access.
- **Active Campfire**:
  - Located near Forest Spirit `(18, 18)` and the Golden Chest `(18, 20)`.
  - Stone ring with charred firewood logs.
  - Multi-cone animated flickering flame mesh (`emissive: 0xff4500`).
  - Upward drifting translucent smoke particle system.
  - Warm flickering point light (`0xff7722`, radius `10m`, intensity oscillating `1.5 - 2.2`).
- **Valley Overlook**: Cantilevered wooden scenic platform projecting off the cliff edge.

### 7.4 Preservation of Gameplay Integrity (R4)
- **Player Controller**: All movement velocities, jump force (`12.5`), gravity (`-28.0`), paraglider aerodynamics (`GLIDE_FALL_SPEED = -2.0`), sprint speeds, and 360-degree camera orbit remain 100% intact.
- **Quests & NPCs**:
  - Finn remains at `(-4.0, 0.0, -4.0)` with full dialogue and quest triggers.
  - Bram remains at `(1.0, 3.5, -13.0)` guarding the bridge.
  - Forest Spirit remains at `(18.0, 7.0, 18.0)` atop Windy Peak.
- **Collectibles**:
  - All 18 Coins, 4 Emerald Gems, and 2 Golden Chests retain their exact world coordinates and elevation relative to the ground.
  - All 4 Bouncy Mushrooms retain their exact locations and spring launch trajectories.
- **Performance Budget**:
  - Use shared geometries and shared materials across village huts, stone pillars, and mushrooms.
  - Limit point lights to essential nighttime sources (lanterns, campfire, spirit, mushrooms) with appropriate attenuation distance to maintain solid 60 FPS in WebGL.

---

## 8. Summary Table of Verification Targets

| Verification Item | Current Value | Target Overhaul Value | Verification Method |
| :--- | :--- | :--- | :--- |
| **Renderer Tonemapping** | `NoToneMapping` | `ACESFilmicToneMapping` | `view_file` on `Renderer.js` |
| **Renderer Shadows** | `PCFShadowMap` | `PCFSoftShadowMap` | `view_file` on `Renderer.js` |
| **World Boundaries** | 4 flat box walls (`h: 12, d: 6`) | Clustered low-poly mountain ranges | `WorldManager.js` inspection & visual render |
| **Plateau Cliffs** | Monolithic vertical boxes | Stepped multi-tier organic rock shelves | `getGroundHeight()` logic & mesh structure |
| **River Water** | 5 static flat planes | Subdivided animated mesh with flow/ripples | `update()` animation loop & visual render |
| **River Dock** | None | Wooden dock with pilings & mooring | Mesh coordinates & collision check |
| **Lookout Tower** | None | Multi-tier wooden tower with roof & deck | WorldManager mesh hierarchy & summit coords |
| **Campfire** | None | Stone ring, burning logs, fire & smoke particles | Animation update & point light flicker |
| **Mushroom Grove** | 4 gameplay mushrooms | Giant bioluminescent canopy mushrooms + spores | SW Plateau coordinates & spore particle array |
| **Sunken Ruins** | None | Mossy stone pillars, altar, floating crystals | SE Plateau coordinates & rotation update |
| **Village** | None | Cobblestone paths, huts, signposts, lanterns | Valley center coordinates & night point lights |
| **Drifting Clouds** | Only in unused `SceneManager.js` | Low-poly 3D clouds drifting over open world | Active in `Game.js` or `WorldManager.js` |
| **Build Integrity** | 0 errors (`npm run build`) | 0 errors (`npm run build`) | `run_command` terminal test |
