## 2026-09-27T15:57:40Z
You are worker_m2_it2, the Implementation Worker for Milestone 2 Iteration 2 (Remediation).
Your working directory is: c:/Users/vuodo/software/forest-runner/.agents/teamwork/worker_m2_it2
Domain skill: c:/Users/vuodo/software/forest-runner/.agents/skills/threejs-scene-setup/SKILL.md

You MUST read:
1. c:/Users/vuodo/software/forest-runner/.agents/teamwork/ORIGINAL_REQUEST.md
2. c:/Users/vuodo/software/forest-runner/PROJECT.md
3. c:/Users/vuodo/software/forest-runner/.agents/teamwork/explorer_m2_it2_1/recommendation.md (Ramps 3 & 4 Fixes)
4. c:/Users/vuodo/software/forest-runner/.agents/teamwork/explorer_m2_it2_2/recommendation.md (Dock 1 Relocation)
5. c:/Users/vuodo/software/forest-runner/.agents/teamwork/explorer_m2_it2_3/recommendation.md (Pebble Clamping & Tests)

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Exclusively Owned Files:
- src/game/WorldManager.js
- tests/helpers/analytical_models.mjs
- tests/stress/m2_challenger_terrain_stress.test.mjs
- tests/stress/m2_challenger_water_docks_stress.test.mjs
- tests/tier1_features/m2_environmental_features.test.mjs

Tasks:
1. In `src/game/WorldManager.js` and `tests/helpers/analytical_models.mjs`:
   - Ramp 3 Fix: Update Ramp 3 to `{ x: -18, z: -3, w: 7, d: 10, axis: 'z', startH: 3.5, endH: 0.0 }`. At z = -8, ground height is 3.5m (Plateau Southwest); at z = +2, ground height is 0.0m (Valley floor).
   - Ramp 4 Relocation: Relocate Ramp 4 away from the Suspension Bridge to the Eastern face of Plateau Southeast: `{ x: 32, z: -18, w: 10, d: 7, axis: 'x', startH: 3.5, endH: 0.0 }`. At x = 27, connects to Plateau Southeast (3.5m); at x = 37, connects to Eastern Valley (0.0m).
   - In `_buildSteppedRamps()`: Ensure Euler rotation signs for rampBase and curbs align with step pavers so they slope seamlessly.
   - Dock 1 Relocation: Move Dock 1 from (-2.2, 0.12, 8.0) to `(-2.2, 0.12, 3.5)` (or z = 3.2), with rotY = 0.35, w = 3.2, d = 1.8. Footprint must stay strictly at z < 5.0m so it rests 100% on valley ground (0.0m) outside Plateau North.
   - Riverbed Pebbles: In `_buildRiverPebbles()`, implement deterministic Mulberry32 PRNG (seed 42) and clamp coordinates strictly with `THREE.MathUtils.clamp(wx, -40.5, 40.5)` and `THREE.MathUtils.clamp(wz, -40.5, 40.5)`.
2. In `tests/helpers/analytical_models.mjs`:
   - Synchronize `TerrainModel.RAMPS` with updated Ramp 3 and Ramp 4.
   - Synchronize `DocksModel` with relocated Dock 1 at `(-2.2, 0.12, 3.5)`.
3. In `tests/stress/m2_challenger_terrain_stress.test.mjs`, `tests/stress/m2_challenger_water_docks_stress.test.mjs`, and `tests/tier1_features/m2_environmental_features.test.mjs`:
   - Update test coordinates and assertions per the explorers' recommendations (Ramp 4 at x=32, z=-18; Dock 1 at z=3.5; pebble bounds <= 40.5m).
4. Run Verification:
   - Run `npm run build` in PowerShell to ensure clean build.
   - Run `npm test` (`node --test tests/**/*.test.mjs`) in PowerShell to ensure 100% test pass rate across all suites.
5. Write `changes.md` and `handoff.md`.
6. Notify parent when finished.
