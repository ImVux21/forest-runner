# Original User Request

## 2026-09-27T13:47:47Z

Overhaul the visuals, lighting, and environmental scenery of Forest Runner (a Three.js 3D web game) from a flat, sparse map into a vibrant, living open-world forest with 5 distinct scenic biomes and polished stylized toon graphics.

Working directory: c:/Users/vuodo/software/forest-runner
Integrity mode: development

## Requirements

### R1. Cinematic Stylized Lighting & Tonemapping
Upgrade Three.js renderer configuration with ACESFilmic tone mapping, calibrated exposure, soft PCF shadows, and dynamic sky/lighting transitions between day, sunset, and night. Ensure balanced contrast and rich colors without blown-out whites.

### R2. 5 Distinct Scenic Biomes & Landmarks
Replace flat monocolor boxes with organic stepped cliffs, scenic vistas, and 5 distinct zones:
1. **Whispering Village & Crossroads**: Cobblestone paths, rustic signposts, flower patches, and lantern posts.
2. **Crystal River & Canyon**: Flowing animated water surface with ripple movement, riverbed pebbles, and wooden docks.
3. **Luminescent Mushroom Grove**: Giant glowing fantasy mushrooms with ambient spore particles and glowing accents.
4. **Ancient Sunken Ruins**: Weathered mossy stone pillars, ancient altar, and floating magical runes/crystals.
5. **Windy Peak & Lookout Tower**: Multi-level wooden observation tower on the summit, active campfire with flickering fire and smoke, and panoramic valley overlook.

### R3. Dynamic Environment Life & Atmospheric Polish
Introduce low-poly 3D clouds drifting in the sky, ambient floating leaf/pollen particles, warm point lights for night-time lanterns and campfires, and naturalized boundary mountain ranges replacing the sharp outer walls.

### R4. Performance & Gameplay Integrity
Ensure stable 60 FPS performance on standard browsers, preserving all existing player movement, jump/glider physics, NPC dialogues, collectibles, and quest interactions.

## Acceptance Criteria

### Visual & Lighting Quality
- [ ] ACESFilmic tone mapping is enabled with calibrated exposure and soft PCF shadow maps.
- [ ] Day, sunset, and night transitions look visually balanced, with warm lantern/campfire point lights illuminating the dark at night.

### World Landmarks & Biomes
- [ ] All 5 biomes are fully integrated and distinguishable in the world map.
- [ ] Outer boundary walls and plateau cliffs feature stepped, naturalized rock contours rather than plain flat boxes.
- [ ] The river displays animated flow and surface ripple effects.
- [ ] The summit peak contains a multi-tier wooden lookout tower and an active campfire.

### Gameplay Integrity & Verification
- [ ] Player can traverse ramps, climb to the peak, talk to all NPCs (Finn, Bram, Spirit), use bouncy mushrooms, and collect items without clipping or collision bugs.
- [ ] `npm run build` succeeds with zero errors and no bundle corruption.
- [ ] The game launches with zero console errors.
