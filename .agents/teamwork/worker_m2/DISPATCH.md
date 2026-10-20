## 2026-09-27T15:19:48Z

You are worker_m2, the Implementation Worker for Milestone 2.
Your working directory is: c:/Users/vuodo/software/forest-runner/.agents/teamwork/worker_m2
Domain skill: c:/Users/vuodo/software/forest-runner/.agents/skills/threejs-scene-setup/SKILL.md

You MUST read:
1. c:/Users/vuodo/software/forest-runner/.agents/teamwork/ORIGINAL_REQUEST.md
2. c:/Users/vuodo/software/forest-runner/PROJECT.md
3. c:/Users/vuodo/software/forest-runner/.agents/teamwork/explorer_m2_1/recommendation.md (Mountain Boundaries)
4. c:/Users/vuodo/software/forest-runner/.agents/teamwork/explorer_m2_2/recommendation.md (Stepped Cliffs & Ramps)
5. c:/Users/vuodo/software/forest-runner/.agents/teamwork/explorer_m2_3/recommendation.md (River, Water, Canyon & Docks)

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Exclusively Owned Files:
- src/game/WorldManager.js
- src/game/Player3D.js
- src/game/Game.js

Critical Technical Invariants:
1. `world.waterMesh` must contain exactly 5 children at base elevation y=0.04m (test F8.1 invariant). Riverbed, pebbles, and docks should be separate groups in the scene.
2. `WorldManager.getGroundHeight(x, z)` must strictly return 0.0m across valley floor and preserve exact coordinates/elevations for all 4 plateaus, bridge (3.55m), and 4 ramps (tests F9.1, F9.6, T2.4).
3. Do NOT place any test or code files in `.agents/teamwork/`. Place test suites only under `tests/`.

Tasks:
1. In `src/game/WorldManager.js`:
   - Replace the 4 flat 12m boundary boxes with 3-tier stepped mountain formations (base cliff, crag buttresses, alpine spires/snowcaps) using merged geometries for performance.
   - Upgrade plateau boxes into 3-tier geological rock strata (bedrock skirt, sedimentary body, weathered rim, turf cap) with faceted 45° corner buttresses and natural stepped stone paver ramps.
   - Upgrade water planes with subdivided geometries and sinusoidal wave/ripple vertex displacement in `update(delta, elapsed)`, sunken riverbed canyon ($y=-0.40$ to $+0.02$), 70 instanced pebbles, and 2 rustic wooden docks.
2. In `src/game/Game.js`:
   - Ensure `this.world.update(delta, elapsed)` is called in the render loop to drive animated water ripples.
3. Verification:
   - Run `npm run build` in PowerShell to ensure 0 build errors.
   - Run `npm test` (`node --test tests/**/*.test.mjs`) to ensure all test suites pass with 100% rate.
4. Write `changes.md` and `handoff.md`.
5. Notify parent when finished.
