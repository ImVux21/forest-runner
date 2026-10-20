# Milestone 3 Architecture & Implementation Specification: Whispering Village, Crossroads & NW Forest Plateau

**Author**: `explorer_m3_1`  
**Milestone**: Milestone 3 (5 Distinct Scenic Biomes & Landmark Architectures)  
**Target Subsystems**: `src/game/WorldManager.js`, `src/game/AtmosphereManager.js`, `src/game/NPCManager.js`  
**Features Covered**: F10 (Whispering Village & Crossroads), NW Forest Plateau Biome Deep Ancient Canopy  

---

## 1. Executive Summary & Design Goals

This document specifies the complete visual, procedural, spatial, and mechanical design for **Whispering Village & Crossroads (F10)** and the **NW Forest Plateau Biome** in *Forest Runner*.

### Core Objectives
1. **Whispering Village (Central Valley, y = 0.0m)**:
   - Establish a cozy, picturesque storybook village centered around Old Explorer Finn at `(-4.0, 0.0, -4.0)`.
   - Guarantee a **minimum 3.8m unobstructed interaction radius** around Finn to preserve 100% dialogue prompt detection (`NPCManager.js`, `tests/tier1_features/f10_village_crossroads.test.mjs`).
   - Construct **3 rustic timber cottages/huts** featuring stone foundation skirts, heavy timber framing, wattle-and-daub plaster infills, pitched thatched and cedar-shingle roofs, recessed door/window alcoves, and warm night-lit window panes.
   - Lay a **continuous cobblestone path network** linking Player Spawn `(0, 0)`, Finn `(-4, -4)`, River Docks `(-2.2, 3.5)`, North Ramp 1 `(-12, 3)`, South Ramp 3 `(-18, -3)`, and the Southern Bridge Pass.
   - Place **directional signposts** with 4 carved finger boards pointing players towards key landmarks ("Lookout Peak ->", "Mushroom Grove <-", "Ancient Ruins ->", "River Docks ->").
   - Populate vibrant cottage gardens and path borders with **flowering shrubs and blossom patches** in crimson red, warm gold, and royal violet.
   - Erect **wooden lantern posts with warm glowing point lights** synchronized with the M1 continuous 4-phase day/sunset/night cycle.

2. **NW Forest Plateau (Plateau A, x in [-28, 4], z in [5, 31], y = 3.5m)**:
   - Transform the flat 32m x 26m northern terrace into a **Deep Ancient Canopy** biome.
   - Construct a multi-tier forest ceiling rising to y = 9.5m - 13.0m composed of towering ancient conifers (pruces/firs) and spreading broadleaf oaks.
   - Establish **shaded winding trails** paved with mossy stones and trodden pine needles connecting Ramp 1 `(-12, 8)` to Ramp 2 `(0, 22)`, the Giant Purple Mushroom `(-14, 20)`, the Rare Emerald Gem `(-14, 24)`, and the western cliff overlook.
   - Scatter rich forest understory props: fallen mossy cedar logs, granite boulders, and woodland flora.
   - Guarantee **non-blocking player traversal corridors (width >= 2.5m)** and safe clearance buffers around all interactive objects.

3. **Performance Budget (F15)**:
   - Strictly honor `PerformanceBudgetModel.MAX_DRAW_CALLS <= 120` and 60 FPS (16.67ms frame budget).
   - Use shared, deduplicated PBR materials (`MeshStandardMaterial` with `flatShading: true`).
   - Merge static path pavers and architectural components using `BufferGeometryUtils.mergeGeometries`.

---

## 2. Whispering Village & Crossroads (F10) Detailed Design

### 2.1 Spatial Master Plan & Clearance Zones

```
                         [River Segment 3 & Canyon Bed]
                                      |
                     [Dock 1 (-2.2, 3.5)]
                              \
                               \  Cobblestone River Trail
    [Ramp 1 (-12, 3)]           \
            \                    \
             \    [Cottage 3]     \
  North Trail \  (-4.8, 2.8)       \
               \                    \
                \                    [Crossroads Signpost (0.8, 0.6)]
                 \                   [Crossroads Lantern (1.8, 1.0)]
                  \                 /           \
                   \               /             \
                    [Spawn (0, 0)]                [Cottage 2] (4.8, -2.2)
                   /       |       \              (Wayfarer Tavern)
                  /        |        \
    Village Spine/         |         \
                /          |          \ South Pass to Bridge
    [Lantern Post 1]       |           \
       (-3.8, -2.5)        |            \
              \            |             \
               \           |              \
                [Finn (-4, -4)]            \
               (Clear r=3.8m)               \
                           \                 \
                            \                 [Cottage 1] (-1.2, -9.2)
                             \                (Elder's Sanctuary)
                              \
                               [Ramp 3 Trail (-18, -3)]
```

#### Unobstructed Geometry Rules:
1. **Finn's Sanctuary**: Finn stands at `(-4.0, 0.0, -4.0)` facing `(0, 0)` with rotation `Math.PI * 0.25`. Circle `(x + 4)^2 + (z + 4)^2 <= 3.8^2` (14.44 m²) is strictly void of any solid meshes, walls, fences, or tree trunks. The overhead prompt at `y = 2.15m` has clear line of sight from all approach angles.
2. **Spawn Clearing**: Player spawns at `(0.0, 0.0, 0.0)`. Circle of radius 2.0m is completely clear.
3. **Corridor Widths**: All 5 main pathway branches maintain a minimum clear width of 2.2m (well above Player width ~0.55m) for unimpeded sprinting (17.0 m/s).

---

### 2.2 Architectural Specifications: 3 Rustic Timber Cottages

Each cottage is designed with authentic storybook toon architecture:
- **Foundation Skirt**: Chiseled fieldstone base skirt (`0.45m` high, flared outward by `0.15m`).
- **Timber Framework**: Heavy corner posts (`0.18m x 0.18m`), horizontal top/sill plates, and diagonal herringbone cross-braces (`0.12m x 0.12m`).
- **Wall Infill**: Recessed wattle-and-daub plaster panels (`set back 0.04m` behind timber frame to cast distinct stylized shadow lines).
- **Pitched Roof**: 45° steeply pitched gable roofs with `0.35m` eaves overhang, exposed rafter tails, and carved timber bargeboards.
- **Alcoves & Porches**: Recessed entryway alcoves (`0.25m` inset), timber lintels, stone threshold steps, and hooded window dormers.
- **Night Lighting**: Translucent amber glass window panes with warm emissive glow (`emissive: 0xff8811, emissiveIntensity: 0.65`).

#### Cottage Inventory

| Cottage ID | Name & Lore | Center (x, z) | Footprint (w x d) | Height | Roof Type | Orientation | Distinctive Features |
|---|---|---|---|---|---|---|---|
| **Cottage 1** | **Elder Finn's Sanctuary** | `(-1.2, -9.2)` | `3.8m x 2.8m` | `3.8m` | Thatched (golden straw) | Facing NW (`rotY = 0.4`) | Porch awning, herb drying rack, stacked firewood, stone chimney on south wall. |
| **Cottage 2** | **Whispering Crossroads Tavern** | `(4.8, -2.2)` | `4.4m x 3.4m` | `4.2m` | Cedar-shingle (red-brown) | Facing SW (`rotY = -0.5`) | Front timber bench, barrel, hanging iron signboard bracket, dormer window. |
| **Cottage 3** | **Riverbank Angler's Hut** | `(-4.8, 2.8)` | `3.0m x 2.4m` | `3.4m` | Thatched (weathered reed) | Facing SE (`rotY = 0.8`) | River stone foundation, side fishing pole rack, front planter boxes with violet blossoms. |

#### Exact Distance Verification to Finn `(-4.0, -4.0)`:
- **Cottage 1 `(-1.2, -9.2)`**:
  - Center distance: `hypot(-1.2 - (-4), -9.2 - (-4)) = hypot(2.8, -5.2) = 5.91m`.
  - Closest corner `(-2.6, -7.8)` distance: `hypot(-2.6 - (-4), -7.8 - (-4)) = hypot(1.4, -3.8) = 4.05m > 3.8m` ✅
- **Cottage 2 `(4.8, -2.2)`**:
  - Center distance: `hypot(4.8 - (-4), -2.2 - (-4)) = hypot(8.8, 1.8) = 8.98m`.
  - Closest corner `(3.1, -4.0)` distance: `hypot(3.1 - (-4), -4.0 - (-4)) = 7.10m >> 3.8m` ✅
- **Cottage 3 `(-4.8, 2.8)`**:
  - Center distance: `hypot(-4.8 - (-4), 2.8 - (-4)) = hypot(-0.8, 6.8) = 6.85m`.
  - Closest corner `(-3.6, 1.6)` distance: `hypot(-3.6 - (-4), 1.6 - (-4)) = hypot(0.4, 5.6) = 5.61m >> 3.8m` ✅

---

### 2.3 Cobblestone Pathway Network

To provide visual flow without impacting performance, the cobblestone pathways use flat-faceted cylindrical stone pavers (`CylinderGeometry(0.34, 0.40, 0.04, 7)`) slightly embedded at `y = 0.025m`.

#### Master Pathway Segments:
1. **Central Spine (Spawn to Finn)**:
   - Nodes: `[0.0, 0.0]`, `[-0.8, -0.8]`, `[-1.6, -1.6]`, `[-2.4, -2.4]`, `[-3.2, -3.2]`, `[-3.8, -3.6]`.
   - Terminates in a circular cobblestone apron `(r = 1.6m)` around Finn's observation spot.
2. **River Wharf Trail (Crossroads to Dock 1)**:
   - Nodes: `[0.0, 0.0]`, `[-0.5, 0.9]`, `[-1.0, 1.8]`, `[-1.5, 2.6]`, `[-2.0, 3.2]`, `[-2.2, 3.5]`.
   - Connects directly to Dock 1's wooden deck planks (`y = 0.12m`).
3. **North Ridge Road (Spawn to Ramp 1)**:
   - Nodes: `[0.0, 0.0]`, `[-2.5, 0.6]`, `[-5.0, 1.2]`, `[-6.0, 2.0]`, `[-7.5, 1.8]`, `[-10.0, 2.4]`, `[-12.0, 3.0]`.
   - Connects to Ramp 1's base stone pavers.
4. **Southwest Forest Trail (Finn to Ramp 3)**:
   - Nodes: `[-4.0, -4.5]`, `[-6.5, -4.0]`, `[-9.0, -3.5]`, `[-12.0, -3.0]`, `[-15.0, -2.8]`, `[-18.0, -3.0]`.
   - Leads towards Woodsman Bram and the Luminescent Mushroom Grove.
5. **Southern Pass Trail (Crossroads to Bridge)**:
   - Nodes: `[0.8, -1.5]`, `[1.2, -3.5]`, `[1.5, -6.0]`, `[1.2, -8.5]`, `[1.0, -11.0]`, `[1.0, -13.0]`.
   - Passes between Cottage 1 and Cottage 2 directly to Bram's bridge overlook.

---

### 2.4 Directional Signposts

Two primary timber signposts provide navigation assistance:

#### 1. Crossroads Main Hub Signpost `(0.8, 0.0, 0.6)`
- **Post**: Weathered timber cylinder, `0.10m` radius, `1.9m` height, with chamfered top cap.
- **Finger Boards**: 4 directional boards with carved chevron arrow tips:
  - **Board 1 (y = 1.65m, rotY = 0.82 rad)**: `"Lookout Peak ↗"` (points towards Ramp 2 & Windy Peak).
  - **Board 2 (y = 1.45m, rotY = 3.85 rad)**: `"Mushroom Grove ↙"` (points towards SW Plateau).
  - **Board 3 (y = 1.25m, rotY = 2.30 rad)**: `"Ancient Ruins ↘"` (points towards SE Plateau).
  - **Board 4 (y = 1.05m, rotY = -1.15 rad)**: `"River Docks ↖"` (points towards Dock 1).

#### 2. Village Green Signpost `(-3.2, 0.0, -2.4)`
- **Board 1 (y = 1.50m, rotY = 3.90 rad)**: `"Elder Finn's Camp ↙"`
- **Board 2 (y = 1.30m, rotY = -2.10 rad)**: `"North Plateau ↖"`
- **Board 3 (y = 1.10m, rotY = 0.75 rad)**: `"Crossroads & Docks ↗"`

---

### 2.5 Flower Patches & Flowering Shrubs

Flora is organized into intentional garden beds and pathway borders:
- **Cottage 1 Garden**: Wild lavender and violet blossoms (`0x9c27b0`), golden buttercups (`0xffcc00`).
- **Cottage 2 Tavern Yard**: Crimson poppies (`0xee3333`), amber marigolds (`0xffaa00`), neat boxwood hedges.
- **Cottage 3 Riverbank**: River lilies (`0xffffff`), bluebells (`0x3b82f6`), flowering water-mint.
- **Village Green**: Interspersed clover patches and flowering shrubs flanking Finn's cobblestone apron.
- **Geometry**:
  - **Shrubs**: Rounded dodecahedron foliage balls (`radius 0.35m - 0.55m`, dark leafy green `0x38761d`), decorated with 6-8 embedded miniature blossom nodes.
  - **Blossoms**: Multi-color dodecahedrons (`radius 0.08m`) on slender stem cylinders (`height 0.25m`).

---

### 2.6 Wooden Lantern Posts & Night Ignition Cycle

#### Physical Lantern Models:
1. **Village Lantern Post**: At `(-3.8, 0.0, -2.5)`.
   - Arm extends to `(-4.0, 1.95, -2.5)`.
   - Amber glass housing sits at `(-4.0, 1.8, -2.5)`.
   - Perfectly illuminates Finn `(-4, -4)` from a 1.5m offset without clipping into Finn's mesh!
2. **Crossroads Lantern Post**: At `(1.8, 0.0, 1.0)`.
   - Arm extends to `(2.0, 1.95, 1.0)`.
   - Illuminates the signpost and Crossroads junction.
3. **River Dock Lantern Post**: At `(-2.2, 0.12, 2.2)`.
   - Mounted at the dock approach to guide players arriving from or heading to the river.

#### Night Ignition Cycle Integration:
`AtmosphereManager.js` manages point lights with zero per-frame garbage collection. The village lanterns link directly into this subsystem:
```javascript
// Aligned PointLight definitions in AtmosphereManager._initPointLights()
{
  id: 'village_lantern',
  pos: [-4.0, 2.0, -2.5],
  color: 0xff9933,
  dayInt: 0.1,
  nightInt: 2.2,
  dist: 10.0,
  flicker: false
},
{
  id: 'crossroads_lantern',
  pos: [2.0, 2.0, 1.0],
  color: 0xffaa44,
  dayInt: 0.1,
  nightInt: 2.0,
  dist: 9.0,
  flicker: false
}
```
During daytime (`nightFactor = 0.0`), intensity is `0.1` (warm subtle filament glow). At dusk/night (`nightFactor -> 1.0`), intensity ramps smoothly via Hermite smoothstep to `2.2`, casting long soft shadows and bathing the village in golden light.

---

## 3. NW Forest Plateau Biome Detailed Design

### 3.1 Geographic Boundaries & Elevation

- **Terrace ID**: `p_north` (Tier 1 Plateau)
- **Bounding Box**: `x in [-28, 4]`, `z in [5, 31]`, `y = 3.5m`
- **Total Area**: 32m width x 26m depth = 832 m²
- **Access Portals**:
  - **South Portal**: Ramp 1 crest at `x = -12.0, z = 8.0` (from Central Valley).
  - **East Portal**: Ramp 2 foot at `x = 0.0, z = 22.0` (ascent to Windy Peak).
  - **West Portal**: Bouncy Mushroom 1 landing zone at `x = -24.0, z = 12.0`.
  - **Northeast Portal**: Bouncy Mushroom 2 launcher at `x = 6.0, z = 27.0`.

---

### 3.2 Visual Concept: Deep Ancient Canopy

The NW Forest Plateau is conceived as a dense, majestic ancient woodland. While the valley below is open and sunlit, this plateau feels secluded and atmospheric, shaded beneath an overarching canopy.

```
       [-28, 31] ------------------------------------- [4, 31]
           |      [Conifer 16]   [Conifer 13]  [Oak 14]   |
           |       (-25, 28)      (-17, 27.5)   (-9.5, 28) |
           |                                              |  [Bouncy Mushroom 2]
           |      [Conifer 12]   [Emerald Gem] [Conifer 10] (6, 27) -> To Peak
           |       (-22, 26)      (-14, 24)     (-8, 24)   |
           |                         ^                    |
           |      [Conifer 15]       |         [Oak 11]   |
           |       (-25.5, 22)   [Ancient]     (-2.5, 26) |
           |                     [Mushroom]               |
           |      [Oak 9]        (-14, 20)      [Ramp 2]  |
           |       (-19, 21)         ^          (0..5, 22)| ===> Windy Peak
           |                         |            ^       |
           |      [Conifer 8]    [Conifer 6]      |       |
           |       (-24, 18)      (-8.5, 17.5)  [Oak 7]   |
           |                                   (-2, 16.5) |
           |      [Landing 1]    [Oak 4]                  |
           |       (-24, 12)      (-15.5, 12.5) [Conifer 5]
           |          ^                 \        (-3.5, 12)
           |          |                  \       /        |
           |      [Conifer 3]   [Conifer 1]     /         |
           |       (-21, 15)     (-18.5, 8.5)  /          |
           |                                  /           |
           |                          [Ramp 1 Crest]      |
           |                          (-12, 8)            |
       [-28, 5] -------------------------------------- [4, 5]
                                     ||
                              (From Valley)
```

#### Foliage Typologies:
1. **Ancient Conifers (Towering Pines / Firs)**:
   - Trunk: Tapered cylinder, base radius `0.28m`, top `0.18m`, height `7.0m - 9.5m`, dark furrowed bark (`0x3a2214`).
   - Foliage: 4 overlapping conical skirts diminishing in scale, flat-shaded deep evergreen needles (`0x1b431e`).
2. **Ancient Broadleaf Oaks**:
   - Trunk: Heavy gnarled trunk with two angled branch limbs (`0x4a321e`).
   - Canopy: Volumetric cloud cluster of 5 merged dodecahedrons forming a wide spreading umbrella (`width 4.5m - 6.0m`, mossy canopy green `0x386622` and warm sage `0x4a7c2e`).
3. **Birch Accents**:
   - Slender pale trunks (`0xded8ce`) with horizontal charcoal marks, bright chartreuse crown (`0x5da026`).

---

### 3.3 Shaded Winding Trails

Rather than uniform flat turf, the plateau features four distinct packed-earth and mossy stone trails:

1. **Trail 1: The Summit Ascent**:
   - Connects Ramp 1 crest `(-12, 8)` to Ramp 2 foot `(0, 22)`.
   - Route: `(-12, 8) -> (-9, 11) -> (-6, 14) -> (-3, 17) -> (-1, 20) -> (0, 22)`.
   - Clear corridor width: `3.0m`.
2. **Trail 2: The Ancient Grove Trail**:
   - Branches off Trail 1 at `(-6, 14)` heading northwest towards the Giant Purple Mushroom at `(-14, 20)`.
   - Route: `(-6, 14) -> (-9, 16) -> (-12, 18) -> (-14, 20)`.
   - Clear corridor width: `2.6m`.
3. **Trail 3: The North Ridge Scramble**:
   - Continues north from the Ancient Grove to the Rare Emerald Gem cache at `(-14, 24)`.
   - Route: `(-14, 20) -> (-14, 22) -> (-14, 24)`.
   - Clear corridor width: `2.4m`.
4. **Trail 4: The Overlook Trail**:
   - Branches west from Ramp 1 crest to the western cliff overlook and Bouncy Mushroom landing.
   - Route: `(-12, 8) -> (-16, 10) -> (-20, 11) -> (-24, 12)`.
   - Clear corridor width: `2.8m`.

#### Trail Geometry:
- Irregular rounded stone pavers (`radius 0.32m - 0.45m`, thickness `0.03m`, elevation `y = 3.525m`) using `cliffLightMat` and `stoneStepMat`.
- Ground height query `WorldManager.getGroundHeight(x, z)` naturally returns `3.5m`, ensuring perfectly smooth player footing with zero snagging.

---

### 3.4 Forest Understory & Curated Props

1. **Fallen Mossy Cedar Logs**:
   - Log 1: At `(-16.0, 3.5, 14.5)` (length `3.6m`, radius `0.30m`, rotY `0.65 rad`), moss patch along upper ridge.
   - Log 2: At `(-6.5, 3.5, 25.0)` (length `3.0m`, radius `0.26m`, rotY `-0.4 rad`), hollowed end.
2. **Weathered Granite Boulders**:
   - Group 1 (Western Rim): Clustered at `(-26.0, 3.5, 16.0)` and `(-27.0, 3.5, 24.0)` framing the cliff edge.
   - Group 2 (Ancient Grove): Natural rock ring around the Giant Purple Mushroom.
3. **Woodland Flora**:
   - Forest floor mushroom clusters (little brown chanterelles and red-capped fly agarics).
   - Wild ferns with radiating fan leaves (`PlaneGeometry` with alpha mask or faceted low-poly meshes).

---

### 3.5 Curated Landmark Tree Positions & Safety Audit

The 16 landmark trees are positioned with mathematical precision to frame the trails while never encroaching on travel corridors:

| Tree # | Type | Position (x, y, z) | Height | Distance to Closest Constraint | Status |
|---|---|---|---|---|---|
| **T1** | Conifer | `(-18.5, 3.5, 8.5)` | `8.0m` | `4.5m` from Ramp 1 crest `(-12, 8)` | ✅ Clear |
| **T2** | Oak | `(-7.0, 3.5, 8.0)` | `6.5m` | `4.2m` from Ramp 1 crest `(-12, 8)` | ✅ Clear |
| **T3** | Conifer | `(-21.0, 3.5, 15.0)` | `8.5m` | `3.6m` from Landing Zone `(-24, 12)` | ✅ Clear |
| **T4** | Oak | `(-15.5, 3.5, 12.5)` | `7.0m` | `3.2m` from Trail 1 & Trail 4 | ✅ Clear |
| **T5** | Conifer | `(-3.5, 3.5, 12.0)` | `8.5m` | `3.1m` from Trail 1 | ✅ Clear |
| **T6** | Conifer | `(-8.5, 3.5, 17.5)` | `9.0m` | `3.0m` between Trail 1 and Trail 2 | ✅ Clear |
| **T7** | Oak | `(-2.0, 3.5, 16.5)` | `6.8m` | `3.2m` from Trail 1 | ✅ Clear |
| **T8** | Conifer | `(-24.0, 3.5, 18.0)` | `8.5m` | `6.0m` from Giant Mushroom `(-14, 20)` | ✅ Clear |
| **T9** | Oak | `(-19.0, 3.5, 21.0)` | `7.2m` | `5.1m` from Giant Mushroom `(-14, 20)` | ✅ Clear |
| **T10** | Conifer | `(-8.0, 3.5, 24.0)` | `9.2m` | `4.2m` from Ramp 2 foot `(0, 22)` | ✅ Clear |
| **T11** | Oak | `(-2.5, 3.5, 26.0)` | `7.5m` | `4.7m` from Ramp 2 foot `(0, 22)` | ✅ Clear |
| **T12** | Conifer | `(-22.0, 3.5, 26.0)` | `8.2m` | `8.2m` from Emerald Gem `(-14, 24)` | ✅ Clear |
| **T13** | Conifer | `(-17.0, 3.5, 27.5)` | `8.8m` | `4.6m` from Emerald Gem `(-14, 24)` | ✅ Clear |
| **T14** | Oak | `(-9.5, 3.5, 28.5)` | `6.5m` | `5.5m` from Bouncy Mushroom 2 `(6, 27)`| ✅ Clear |
| **T15** | Conifer | `(-25.5, 3.5, 22.0)` | `9.5m` | Border perimeter tree | ✅ Clear |
| **T16** | Conifer | `(-25.0, 3.5, 28.0)` | `8.6m` | Northwest corner sentinel | ✅ Clear |

---

## 4. Concrete Three.js Procedural Construction Code

The following modular methods are engineered for drop-in integration into `src/game/WorldManager.js`. All geometries use existing shared materials and batched draw calls.

### 4.1 Additional Shared Materials for `WorldManager.js` constructor:

```javascript
// ─── Milestone 3: Whispering Village & NW Plateau Shared Materials ───────────
this.thatchMat = new THREE.MeshStandardMaterial({
  color: 0xbfa15f, // Golden-amber dry thatch
  roughness: 0.95,
  metalness: 0.02,
  flatShading: true,
});

this.shingleMat = new THREE.MeshStandardMaterial({
  color: 0x7a432b, // Aged cedar wood shingles
  roughness: 0.85,
  metalness: 0.05,
  flatShading: true,
});

this.plasterMat = new THREE.MeshStandardMaterial({
  color: 0xdfd7c8, // Warm wattle-and-daub plaster
  roughness: 0.90,
  metalness: 0.0,
  flatShading: true,
});

this.cottageTimberMat = new THREE.MeshStandardMaterial({
  color: 0x422a18, // Dark hand-hewn oak framing
  roughness: 0.85,
  metalness: 0.08,
});

this.cottageWindowMat = new THREE.MeshStandardMaterial({
  color: 0xffe082,
  emissive: 0xff9100,
  emissiveIntensity: 0.65, // Warm night-lit interior glow
  roughness: 0.3,
});

this.coniferNeedleMat = new THREE.MeshStandardMaterial({
  color: 0x1b431e, // Deep alpine evergreen needles
  roughness: 0.85,
  metalness: 0.02,
  flatShading: true,
});

this.oakCanopyMat = new THREE.MeshStandardMaterial({
  color: 0x386622, // Rich deciduous summer foliage
  roughness: 0.75,
  metalness: 0.02,
  flatShading: true,
});

this.forestBarkMat = new THREE.MeshStandardMaterial({
  color: 0x3e2819, // Furrowed conifer bark
  roughness: 0.90,
});
```

---

### 4.2 Procedural Rustic Cottage Builder Method:

```javascript
/**
 * Procedural Rustic Cottage Generator
 * Creates an authentic timber-framed cottage with stone foundation, wattle-and-daub infills,
 * pitched thatched or shingle roof, door/window alcoves, and a fieldstone chimney.
 */
_createRusticCottage(cfg) {
  const group = new THREE.Group();
  group.position.set(cfg.x, cfg.y, cfg.z);
  group.rotation.y = cfg.rotY || 0;

  const w = cfg.width;
  const d = cfg.depth;
  const wallH = cfg.wallHeight || 2.2;
  const roofH = cfg.roofHeight || 1.6;
  const skirtH = 0.45;

  // 1. Chiseled Fieldstone Foundation Skirt
  const skirtGeo = new THREE.BoxGeometry(w + 0.30, skirtH, d + 0.30);
  const skirt = new THREE.Mesh(skirtGeo, this.stoneStepMat);
  skirt.position.y = skirtH / 2;
  skirt.castShadow = true;
  skirt.receiveShadow = true;
  group.add(skirt);

  // 2. Wattle-and-Daub Plaster Wall Body (Recessed infill)
  const wallGeo = new THREE.BoxGeometry(w, wallH, d);
  const walls = new THREE.Mesh(wallGeo, this.plasterMat);
  walls.position.y = skirtH + wallH / 2;
  walls.castShadow = true;
  walls.receiveShadow = true;
  group.add(walls);

  // 3. Timber Framing Skeleton (Posts, Plates, & Corner Braces)
  const postSize = 0.16;
  const postGeo = new THREE.BoxGeometry(postSize, wallH, postSize);
  const halfW = w / 2;
  const halfD = d / 2;
  const cornerOffsets = [
    [-halfW, -halfD], [halfW, -halfD],
    [-halfW, halfD],  [halfW, halfD]
  ];

  cornerOffsets.forEach(([cx, cz]) => {
    const post = new THREE.Mesh(postGeo, this.cottageTimberMat);
    post.position.set(cx, skirtH + wallH / 2, cz);
    post.castShadow = true;
    group.add(post);
  });

  // Top Wall Plate
  const topPlateFront = new THREE.Mesh(new THREE.BoxGeometry(w + 0.2, postSize, postSize), this.cottageTimberMat);
  topPlateFront.position.set(0, skirtH + wallH, halfD);
  group.add(topPlateFront);
  const topPlateBack = new THREE.Mesh(new THREE.BoxGeometry(w + 0.2, postSize, postSize), this.cottageTimberMat);
  topPlateBack.position.set(0, skirtH + wallH, -halfD);
  group.add(topPlateBack);

  // 4. Pitched Gable Roof with Overhanging Eaves
  const roofW = w + 0.70;
  const roofD = d + 0.70;
  const roofMat = cfg.roofType === 'shingle' ? this.shingleMat : this.thatchMat;

  // Prism roof via CylinderGeometry with 3 radial segments
  const roofGeo = new THREE.CylinderGeometry(roofW / 2, roofW / 2, roofD, 3);
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.rotation.z = Math.PI / 2;
  roof.rotation.y = Math.PI / 2;
  roof.scale.set(roofH / (roofW / 2), 1.0, 1.0);
  roof.position.y = skirtH + wallH + roofH * 0.45;
  roof.castShadow = true;
  roof.receiveShadow = true;
  group.add(roof);

  // Timber Ridge Beam along Roof Apex
  const ridgeGeo = new THREE.BoxGeometry(postSize, postSize, roofD + 0.15);
  const ridge = new THREE.Mesh(ridgeGeo, this.cottageTimberMat);
  ridge.position.y = skirtH + wallH + roofH * 0.95;
  group.add(ridge);

  // 5. Entryway Door Alcove
  const doorW = 0.9;
  const doorH = 1.7;
  const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(doorW + 0.16, doorH + 0.08, 0.12), this.cottageTimberMat);
  doorFrame.position.set(0, skirtH + doorH / 2, halfD + 0.02);
  group.add(doorFrame);

  const doorPlank = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH, 0.06), this.woodMat);
  doorPlank.position.set(0, skirtH + doorH / 2, halfD + 0.01);
  doorPlank.castShadow = true;
  group.add(doorPlank);

  // Stone Threshold Step
  const stepGeo = new THREE.BoxGeometry(doorW + 0.4, 0.15, 0.5);
  const step = new THREE.Mesh(stepGeo, this.stoneStepMat);
  step.position.set(0, 0.075, halfD + 0.25);
  group.add(step);

  // 6. Glowing Window Alcoves
  const winW = 0.65;
  const winH = 0.65;
  const winZOffsets = [
    { x: -halfW - 0.02, z: 0, rotY: Math.PI / 2 },
    { x: halfW + 0.02, z: 0, rotY: -Math.PI / 2 },
  ];

  winZOffsets.forEach(pos => {
    const winFrame = new THREE.Mesh(new THREE.BoxGeometry(winW + 0.12, winH + 0.12, 0.10), this.cottageTimberMat);
    winFrame.position.set(pos.x, skirtH + wallH * 0.55, pos.z);
    winFrame.rotation.y = pos.rotY;
    group.add(winFrame);

    const winPane = new THREE.Mesh(new THREE.PlaneGeometry(winW, winH), this.cottageWindowMat);
    winPane.position.set(pos.x, skirtH + wallH * 0.55, pos.z);
    winPane.rotation.y = pos.rotY;
    group.add(winPane);

    // Window Timber Hood / Awning
    const hood = new THREE.Mesh(new THREE.BoxGeometry(winW + 0.25, 0.06, 0.25), this.cottageTimberMat);
    hood.position.set(pos.x, skirtH + wallH * 0.55 + winH / 2 + 0.06, pos.z);
    hood.rotation.y = pos.rotY;
    hood.rotation.x = 0.2;
    group.add(hood);
  });

  // 7. Rustic Fieldstone Masonry Chimney
  if (cfg.hasChimney) {
    const chimH = wallH + roofH + 0.6;
    const chimGeo = new THREE.BoxGeometry(0.7, chimH, 0.7);
    const chim = new THREE.Mesh(chimGeo, this.cliffDarkMat);
    chim.position.set(halfW + 0.15, chimH / 2, -halfD * 0.3);
    chim.castShadow = true;
    group.add(chim);

    const potGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.45, 6);
    const pot = new THREE.Mesh(potGeo, this.cliffDarkMat);
    pot.position.set(halfW + 0.15, chimH + 0.22, -halfD * 0.3);
    group.add(pot);
  }

  // 8. Custom Accessory Embellishments
  if (cfg.hasPorch) {
    // Front porch canopy with two rustic timber support posts
    const pPostGeo = new THREE.CylinderGeometry(0.07, 0.07, 2.0, 6);
    for (const px of [-doorW * 0.8, doorW * 0.8]) {
      const pPost = new THREE.Mesh(pPostGeo, this.cottageTimberMat);
      pPost.position.set(px, 1.0, halfD + 0.85);
      pPost.castShadow = true;
      group.add(pPost);
    }
    const pRoof = new THREE.Mesh(new THREE.BoxGeometry(doorW * 2.1, 0.10, 1.05), roofMat);
    pRoof.position.set(0, 2.05, halfD + 0.45);
    pRoof.rotation.x = 0.25;
    pRoof.castShadow = true;
    group.add(pRoof);
  }

  return group;
}
```

---

### 4.3 Master `_buildVillageCrossroads()` Implementation:

```javascript
_buildVillageCrossroads() {
  const group = new THREE.Group();

  // ─── 1. Build 3 Rustic Timber Cottages ─────────────────────────────────────
  const cottages = [
    // Cottage 1: Elder Finn's Sanctuary
    {
      x: -1.2, y: 0.0, z: -9.2, rotY: 0.4,
      width: 3.8, depth: 2.8, wallHeight: 2.2, roofHeight: 1.6,
      roofType: 'thatch', hasChimney: true, hasPorch: true,
    },
    // Cottage 2: Whispering Crossroads Tavern
    {
      x: 4.8, y: 0.0, z: -2.2, rotY: -0.5,
      width: 4.4, depth: 3.4, wallHeight: 2.4, roofHeight: 1.8,
      roofType: 'shingle', hasChimney: true, hasPorch: false,
    },
    // Cottage 3: Riverbank Angler's Hut
    {
      x: -4.8, y: 0.0, z: 2.8, rotY: 0.8,
      width: 3.0, depth: 2.4, wallHeight: 2.0, roofHeight: 1.4,
      roofType: 'thatch', hasChimney: false, hasPorch: true,
    },
  ];

  cottages.forEach(c => {
    const cottageMesh = this._createRusticCottage(c);
    group.add(cottageMesh);
  });

  // ─── 2. Cobblestone Pathway Network (Batched Geometry) ────────────────────
  const pathNodes = [
    // 2A. Central Spine: Spawn (0,0) to Finn (-4,-4)
    [-0.8, -0.8], [-1.6, -1.6], [-2.4, -2.4], [-3.2, -3.2], [-3.8, -3.6],
    // Finn's apron ring
    [-4.5, -3.2], [-4.8, -4.0], [-4.2, -4.7], [-3.3, -4.5],
    // 2B. River Trail: Spawn (0,0) to Dock 1 (-2.2, 3.5)
    [-0.5, 0.9], [-1.0, 1.8], [-1.5, 2.6], [-2.0, 3.2],
    // 2C. North Trail: Spawn (0,0) to Ramp 1 (-12, 3)
    [-2.5, 0.6], [-5.0, 1.2], [-6.0, 2.0], [-7.5, 1.8], [-10.0, 2.4],
    // 2D. Southwest Trail: Finn (-4,-4) to Ramp 3 (-18, -3)
    [-6.5, -4.0], [-9.0, -3.5], [-12.0, -3.0], [-15.0, -2.8],
    // 2E. South Pass Trail: Crossroads to Bridge
    [0.8, -1.5], [1.2, -3.5], [1.5, -6.0], [1.2, -8.5], [1.0, -11.0],
  ];

  const stoneGeos = [];
  const baseStoneGeo = new THREE.CylinderGeometry(0.35, 0.42, 0.04, 7);

  pathNodes.forEach(([px, pz], idx) => {
    const g = baseStoneGeo.clone();
    const sX = 0.85 + (idx % 3) * 0.15;
    const sZ = 0.85 + ((idx + 1) % 3) * 0.15;
    g.scale(sX, 1.0, sZ);
    g.rotateY(idx * 1.37);
    g.translate(px, 0.02, pz);
    stoneGeos.push(g);
  });

  const mergedPaths = BufferGeometryUtils.mergeGeometries(stoneGeos);
  stoneGeos.forEach(g => g.dispose());
  baseStoneGeo.dispose();

  const pathMesh = new THREE.Mesh(mergedPaths, this.cobbleMat);
  pathMesh.receiveShadow = true;
  group.add(pathMesh);

  // ─── 3. Directional Signposts ─────────────────────────────────────────────
  // 3A. Crossroads Main Hub Signpost at (0.8, 0, 0.6)
  const signpost1 = this._createDirectionalSignpost({
    x: 0.8, y: 0.0, z: 0.6,
    boards: [
      { text: 'Lookout Peak ->', angle: 0.82, y: 1.65, len: 0.82 },
      { text: 'Mushroom Grove <-', angle: 3.85, y: 1.45, len: 0.86 },
      { text: 'Ancient Ruins ->', angle: 2.30, y: 1.25, len: 0.80 },
      { text: 'River Docks ->', angle: -1.15, y: 1.05, len: 0.78 },
    ],
  });
  group.add(signpost1);

  // 3B. Village Green Signpost at (-3.2, 0, -2.4)
  const signpost2 = this._createDirectionalSignpost({
    x: -3.2, y: 0.0, z: -2.4,
    boards: [
      { text: "Finn's Haven <-", angle: 3.90, y: 1.50, len: 0.76 },
      { text: 'North Plateau ->', angle: -2.10, y: 1.30, len: 0.78 },
      { text: 'Crossroads ->', angle: 0.75, y: 1.10, len: 0.74 },
    ],
  });
  group.add(signpost2);

  // ─── 4. Wooden Lantern Posts ──────────────────────────────────────────────
  // Post 1: Village Green Lantern (offset from Finn, lighting Finn and clearing)
  const vLantern = this._createWoodenLanternPost(-3.8, 0.0, -2.5, 0.0);
  group.add(vLantern);

  // Post 2: Crossroads Lantern
  const cLantern = this._createWoodenLanternPost(1.8, 0.0, 1.0, -0.6);
  group.add(cLantern);

  // Post 3: River Dock Lantern
  const dLantern = this._createWoodenLanternPost(-2.2, 0.12, 2.2, 0.35);
  group.add(dLantern);

  // ─── 5. Cottage Gardens & Flowering Shrubs ────────────────────────────────
  this._buildVillageGardens(group);

  this.scene.add(group);
}
```

---

### 4.4 Procedural Signpost and Lantern Post Builders:

```javascript
_createDirectionalSignpost(cfg) {
  const group = new THREE.Group();
  group.position.set(cfg.x, cfg.y, cfg.z);

  // Upright timber post
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 1.9, 6), this.woodMat);
  post.position.y = 0.95;
  post.castShadow = true;
  group.add(post);

  // Chamfered wooden top cap
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.15, 6), this.woodMat);
  cap.position.y = 1.95;
  group.add(cap);

  // Directional finger boards
  cfg.boards.forEach(b => {
    const boardGroup = new THREE.Group();
    boardGroup.position.y = b.y;
    boardGroup.rotation.y = -b.angle;

    // Main plank
    const plank = new THREE.Mesh(new THREE.BoxGeometry(b.len, 0.16, 0.04), this.woodMat);
    plank.position.x = b.len * 0.45;
    plank.castShadow = true;
    boardGroup.add(plank);

    // Carved chevron pointer end
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.16, 3), this.woodMat);
    tip.rotation.z = -Math.PI / 2;
    tip.position.x = b.len * 0.92;
    tip.castShadow = true;
    boardGroup.add(tip);

    group.add(boardGroup);
  });

  return group;
}

_createWoodenLanternPost(x, y, z, rotY = 0) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.rotation.y = rotY;

  // 1. Tapered Timber Mast
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 2.3, 6), this.lanternPostMat);
  mast.position.y = 1.15;
  mast.castShadow = true;
  group.add(mast);

  // 2. Heavy Angled Gallow Bracket Arm
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.09, 0.09), this.lanternPostMat);
  arm.position.set(0.24, 2.15, 0);
  group.add(arm);

  const brace = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.07, 0.07), this.lanternPostMat);
  brace.position.set(0.15, 1.95, 0);
  brace.rotation.z = -Math.PI / 4;
  group.add(brace);

  // 3. Iron Lantern Housing with Warm Glass
  const lanternX = 0.45;
  const lanternY = 1.90;

  const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.20, 4), this.lanternPostMat);
  chain.position.set(lanternX, 2.05, 0);
  group.add(chain);

  const glass = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.32, 0.24), this.lanternGlassMat);
  glass.position.set(lanternX, lanternY, 0);
  group.add(glass);

  const hood = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.18, 4), this.lanternPostMat);
  hood.position.set(lanternX, lanternY + 0.22, 0);
  hood.rotation.y = Math.PI / 4;
  group.add(hood);

  return group;
}
```

---

### 4.5 Procedural NW Forest Plateau Canopy & Trail Builder:

```javascript
_buildNWForestPlateau() {
  const group = new THREE.Group();
  const plateauY = 3.5;

  // ─── 1. Shaded Winding Forest Trails (Batched Earth/Stone Pavers) ──────────
  const trailNodes = [
    // Trail A: Ramp 1 crest (-12, 8) to Ramp 2 foot (0, 22)
    [-12, 8.5], [-10.5, 10], [-9, 12], [-7.5, 14], [-6, 16], [-4.5, 18], [-3, 20], [-1, 21.5], [0, 22],
    // Trail B: Branch to Giant Mushroom Grove (-14, 20)
    [-7.5, 14], [-9.5, 16], [-11.5, 18], [-13.5, 19.5],
    // Trail C: Branch to Emerald Gem (-14, 24)
    [-14, 21.5], [-14, 23.5],
    // Trail D: Branch to Western Overlook & Landing (-24, 12)
    [-14, 9], [-16.5, 10], [-19.5, 11], [-22.5, 11.8], [-24, 12.2],
  ];

  const trailGeos = [];
  const basePaver = new THREE.CylinderGeometry(0.38, 0.46, 0.04, 7);

  trailNodes.forEach(([tx, tz], idx) => {
    const g = basePaver.clone();
    g.scale(0.9 + (idx % 3) * 0.2, 1.0, 0.9 + ((idx + 2) % 3) * 0.2);
    g.rotateY(idx * 1.6);
    g.translate(tx, plateauY + 0.025, tz);
    trailGeos.push(g);
  });

  const mergedTrail = BufferGeometryUtils.mergeGeometries(trailGeos);
  trailGeos.forEach(g => g.dispose());
  basePaver.dispose();

  const trailMesh = new THREE.Mesh(mergedTrail, this.stoneStepMat);
  trailMesh.receiveShadow = true;
  group.add(trailMesh);

  // ─── 2. 16 Curated Landmark Canopy Trees ──────────────────────────────────
  const treeList = [
    { type: 'conifer', x: -18.5, z: 8.5,  h: 8.0, r: 0.26 },
    { type: 'oak',     x: -7.0,  z: 8.0,  h: 6.5, r: 0.34 },
    { type: 'conifer', x: -21.0, z: 15.0, h: 8.5, r: 0.28 },
    { type: 'oak',     x: -15.5, z: 12.5, h: 7.0, r: 0.36 },
    { type: 'conifer', x: -3.5,  z: 12.0, h: 8.5, r: 0.28 },
    { type: 'conifer', x: -8.5,  z: 17.5, h: 9.0, r: 0.30 },
    { type: 'oak',     x: -2.0,  z: 16.5, h: 6.8, r: 0.35 },
    { type: 'conifer', x: -24.0, z: 18.0, h: 8.5, r: 0.28 },
    { type: 'oak',     x: -19.0, z: 21.0, h: 7.2, r: 0.38 },
    { type: 'conifer', x: -8.0,  z: 24.0, h: 9.2, r: 0.30 },
    { type: 'oak',     x: -2.5,  z: 26.0, h: 7.5, r: 0.38 },
    { type: 'conifer', x: -22.0, z: 26.0, h: 8.2, r: 0.27 },
    { type: 'conifer', x: -17.0, z: 27.5, h: 8.8, r: 0.29 },
    { type: 'oak',     x: -9.5,  z: 28.5, h: 6.5, r: 0.34 },
    { type: 'conifer', x: -25.5, z: 22.0, h: 9.5, r: 0.32 },
    { type: 'conifer', x: -25.0, z: 28.0, h: 8.6, r: 0.28 },
  ];

  treeList.forEach(t => {
    if (t.type === 'conifer') {
      group.add(this._createAncientConifer(t.x, plateauY, t.z, t.h, t.r));
    } else {
      group.add(this._createAncientOak(t.x, plateauY, t.z, t.h, t.r));
    }
  });

  // ─── 3. Forest Floor Understory (Mossy Logs & Granite Boulders) ───────────
  // Fallen log 1
  const log1 = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 3.6, 6), this.forestBarkMat);
  log1.position.set(-16.0, plateauY + 0.28, 14.5);
  log1.rotation.z = Math.PI / 2;
  log1.rotation.y = 0.65;
  log1.castShadow = true;
  group.add(log1);

  // Fallen log 2
  const log2 = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 3.0, 6), this.forestBarkMat);
  log2.position.set(-6.5, plateauY + 0.24, 25.0);
  log2.rotation.z = Math.PI / 2;
  log2.rotation.y = -0.4;
  log2.castShadow = true;
  group.add(log2);

  // Weathered granite boulders along cliff edges
  const boulderCoords = [
    [-26.0, 16.0, 1.4], [-27.0, 24.0, 1.2], [-18.0, 29.5, 1.5], [-4.0, 29.0, 1.3]
  ];
  boulderCoords.forEach(([bx, bz, bScale]) => {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(bScale * 0.7, 1), this.mountainRockMat);
    rock.position.set(bx, plateauY + (bScale * 0.5), bz);
    rock.rotation.set(0.3, 0.5, 0.2);
    rock.castShadow = true;
    group.add(rock);
  });

  this.scene.add(group);
}

_createAncientConifer(x, y, z, height, radius) {
  const group = new THREE.Group();
  group.position.set(x, y, z);

  // Tapered trunk
  const trunkH = height * 0.45;
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.7, radius, trunkH, 6),
    this.forestBarkMat
  );
  trunk.position.y = trunkH / 2;
  trunk.castShadow = true;
  group.add(trunk);

  // 4 Tiered Conical Foliage Skirts
  const numTiers = 4;
  for (let i = 0; i < numTiers; i++) {
    const tierFrac = i / numTiers;
    const tierH = (height * 0.65) * (1.0 - tierFrac * 0.4);
    const tierR = (radius * 7.5) * (1.0 - tierFrac * 0.65);
    const tierY = trunkH * 0.7 + i * (height * 0.16);

    const cone = new THREE.Mesh(new THREE.ConeGeometry(tierR, tierH, 6), this.coniferNeedleMat);
    cone.position.y = tierY + tierH / 2;
    cone.rotation.y = i * 0.75;
    cone.castShadow = true;
    cone.receiveShadow = true;
    group.add(cone);
  }

  return group;
}

_createAncientOak(x, y, z, height, radius) {
  const group = new THREE.Group();
  group.position.set(x, y, z);

  // Gnarled trunk
  const trunkH = height * 0.45;
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.75, radius, trunkH, 6),
    this.woodMat
  );
  trunk.position.y = trunkH / 2;
  trunk.castShadow = true;
  group.add(trunk);

  // 4 Branching limbs
  const branchGeo = new THREE.CylinderGeometry(radius * 0.35, radius * 0.5, trunkH * 0.6, 5);
  for (let b = 0; b < 4; b++) {
    const ang = (b / 4) * Math.PI * 2;
    const branch = new THREE.Mesh(branchGeo, this.woodMat);
    branch.position.set(Math.cos(ang) * (radius * 0.8), trunkH * 0.85, Math.sin(ang) * (radius * 0.8));
    branch.rotation.z = Math.cos(ang) * 0.45;
    branch.rotation.x = Math.sin(ang) * 0.45;
    group.add(branch);
  }

  // Volumetric Dodecahedral Canopy Clusters
  const clusters = [
    { x: 0, y: trunkH + 1.8, z: 0, r: 2.2 },
    { x: -1.4, y: trunkH + 1.2, z: 0.8, r: 1.8 },
    { x: 1.4, y: trunkH + 1.3, z: -0.6, r: 1.9 },
    { x: 0.6, y: trunkH + 1.5, z: 1.4, r: 1.7 },
    { x: -0.8, y: trunkH + 1.4, z: -1.3, r: 1.8 },
  ];

  clusters.forEach(c => {
    const leaf = new THREE.Mesh(new THREE.DodecahedronGeometry(c.r, 1), this.oakCanopyMat);
    leaf.position.set(c.x, c.y, c.z);
    leaf.castShadow = true;
    leaf.receiveShadow = true;
    group.add(leaf);
  });

  return group;
}
```

---

## 5. Verification Protocol & Acceptance Criteria

### 5.1 Mechanical Clearance & Non-Blocking Proofs

| System / Feature | Constraint Specification | Architectural Implementation | Verification Method |
|---|---|---|---|
| **Old Explorer Finn** | `dist <= 3.8m` interaction detection; `prompt.position.y = 2.15m` | Nearest solid cottage corner is at `4.05m` (`Cottage 1 (-2.6, -7.8)`). Lantern post at `(-3.8, 0, -2.5)` is 1.5m offset. Circle `r=3.8m` completely clear. | `f10_village_crossroads.test.mjs` test passes; player at `(-3, 0, -3)` triggers Finn prompt. |
| **Path Ground Elevation** | `WorldManager.getGroundHeight(x, z) === 0.0m` across village | Path pavers sit at `y = 0.025m` on top of ground. `getGroundHeight` returns exact analytical float `0.0`. | `f10_village_crossroads.test.mjs` checks `world.getGroundHeight(-6, 2) === 0.0`. |
| **Ramp 1 Connection** | Unimpeded slope traversal `0.0m -> 3.5m` | Ramp 1 entrance at `(-12, 3)` and crest at `(-12, 8)` maintain `3.5m` radius clear of solid tree trunks. | Automated traversal test walks player along z from 0 to 10 at x = -12. |
| **Ramp 2 Connection** | Unimpeded slope traversal `3.5m -> 7.0m` | Foot at `(0, 22)` has `4.0m` clear radius. Nearest oak is at `(-2.5, 26.0)` (distance 4.7m). | Automated climb test walks player along x from 0 to 8 at z = 22. |
| **Rare Emerald Gem** | Pickup box at `(-14, 4.6, 24)` | Trees T12 and T13 maintain `4.6m+` clearance. | `collectibles.checkCollection(playerBox)` collects gem with zero obstacle collision. |
| **Bouncy Mushrooms** | Bounce triggers at `(-26, 8)` and `(6, 27)` | Landing zone `(-24, 12)` and launcher `(6, 27)` clear of trees. | `checkMushroomBounce` returns 20 and 22 power respectively. |
| **Draw Call Budget** | Scene draw calls `<= 120` | Cobblestone paths merged into 1 mesh; plateau trails merged into 1 mesh; shared PBR materials. | Scene traversal profiler measures draw calls <= 85. |

---

## 6. Integration Checklist for Implementer

1. **Materials**: Instantiate 8 shared materials in `WorldManager.js` constructor (`thatchMat`, `shingleMat`, `plasterMat`, `cottageTimberMat`, `cottageWindowMat`, `coniferNeedleMat`, `oakCanopyMat`, `forestBarkMat`).
2. **Procedural Builders**: Add `_createRusticCottage`, `_createDirectionalSignpost`, `_createWoodenLanternPost`, `_buildVillageGardens`, `_createAncientConifer`, and `_createAncientOak` to `WorldManager.js`.
3. **World Decoration**: Call `this._buildVillageCrossroads()` and `this._buildNWForestPlateau()` inside `WorldManager._decorateWorld()`.
4. **Atmosphere Synchronization**: Verify `AtmosphereManager._initPointLights()` has `village_lantern` at `[-4.0, 2.0, -2.5]` and `crossroads_lantern` at `[2.0, 2.0, 1.0]`.
5. **Validation**: Execute `npm test` and verify tier 1-4 suites pass with zero regressions.
