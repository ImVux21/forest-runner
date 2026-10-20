# Dispatch: Milestone 1 Explorer 3 - Atmospheric Life & Particle FX

Milestone: M1 - Lighting, Tonemapping & Atmospheric FX Engine
Task: Explore atmospheric particle systems (floating leaves/pollen, mushroom grove spores, campfire smoke/flames), 3D drifting clouds, and warm point light management for lanterns and campfire.
Path to original user request: c:/Users/vuodo/software/forest-runner/.agents/teamwork/ORIGINAL_REQUEST.md
Path to project specification: c:/Users/vuodo/software/forest-runner/PROJECT.md
Working directory: c:/Users/vuodo/software/forest-runner/.agents/teamwork/explorer_m1_3
Output report: c:/Users/vuodo/software/forest-runner/.agents/teamwork/explorer_m1_3/recommendation.md
Handoff: c:/Users/vuodo/software/forest-runner/.agents/teamwork/explorer_m1_3/handoff.md

## 2026-09-27T13:56:19Z

Investigate and design the exact technical specification for Atmospheric FX (drifting 3D low-poly clouds, ambient particles: floating leaves/pollen, mushroom spores, campfire smoke/flames) and warm point lights for night-time lanterns and campfire.

Requirements to address:
- Design low-poly 3D clouds drifting in the sky across the map with smooth wrapping boundaries.
- Design ambient particle systems using `THREE.InstancedMesh` for 60 FPS performance:
  - Floating leaf/pollen particles gently wafting in the forest breeze.
  - Luminescent mushroom spores drifting upward in the grove.
  - Campfire smoke and flickering flame particles on the summit peak.
- Design warm point light management (lanterns, campfire) that turn on at sunset/night and provide warm localized illumination (`0xff9933`).
- Specify whether to encapsulate this in `src/game/AtmosphereManager.js` or integrate with `Game.js`.
