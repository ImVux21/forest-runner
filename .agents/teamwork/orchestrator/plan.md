# Orchestration Plan: Forest Runner Visual & Environmental Overhaul

## 1. Objectives & Scope
Transform Forest Runner from a flat, sparse Three.js map into a vibrant, living open-world forest with:
- **R1: Stylized Lighting & Tonemapping**: ACESFilmic, calibrated exposure, soft PCF shadows, dynamic day/sunset/night sky & lighting transitions.
- **R2: 5 Distinct Scenic Biomes & Landmarks**:
  1. Whispering Village & Crossroads (cobblestone paths, rustic signposts, flower patches, lantern posts)
  2. Crystal River & Canyon (flowing animated water with ripple movement, riverbed pebbles, wooden docks)
  3. Luminescent Mushroom Grove (giant glowing mushrooms, ambient spore particles, glowing accents)
  4. Ancient Sunken Ruins (weathered mossy stone pillars, ancient altar, floating magical runes/crystals)
  5. Windy Peak & Lookout Tower (multi-level wooden tower on summit, active campfire with flickering fire & smoke, panoramic overlook)
- **R3: Dynamic Environment Life & Atmospheric Polish**: 3D low-poly clouds drifting, ambient floating leaf/pollen particles, warm point lights for night lanterns/campfires, stepped organic cliffs/mountains replacing flat boxes.
- **R4: Performance & Gameplay Integrity**: Stable 60 FPS, preserving all player physics, glider, NPCs (Finn, Bram, Spirit), bouncy mushrooms, collectibles, and quest interactions.

## 2. High-Level Phases
- **Phase 0: Survey & Codebase Exploration**
  - Dispatch 3 parallel Explorers:
    - Explorer 1: Rendering, Lighting, Materials, Shaders, Day/Night system, Particles, Post-processing/Renderer configs.
    - Explorer 2: World geometry, Biomes, Terrain generation/placement, Cliffs, Water mesh, Props, Tower/Ruins/Village structure.
    - Explorer 3: Physics, Collision system, Player controls/glider, NPCs, Quests, Collectibles, Performance benchmarks.
- **Phase 1: Architecture & Decomposition (PROJECT.md & TEST_INFRA.md)**
  - Synthesize feature inventory and define interface contracts.
  - Decompose into 3-5 focused implementation milestones.
  - Stand up E2E / headless testing strategy.
- **Phase 2: Milestone Iteration Loops**
  - For each milestone: 3 Explorers -> 1 Worker -> 2 Reviewers -> 2 Challengers -> 1 Auditor -> Gate.
- **Phase 3: Final Integration & E2E Validation**
  - E2E test verification, 60 FPS validation, zero console errors, build integrity check (`npm run build`).
- **Phase 4: Adversarial Coverage Hardening & Handoff**
  - Final Challenger + Auditor checks, complete handoff report.
