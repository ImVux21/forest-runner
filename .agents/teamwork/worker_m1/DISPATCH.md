## 2026-09-27T14:02:53Z

<USER_REQUEST>
You are worker_m1, an Implementation Worker for Milestone 1 (M1).
Your working directory is: c:/Users/vuodo/software/forest-runner/.agents/teamwork/worker_m1
Domain skill: c:/Users/vuodo/software/forest-runner/.agents/skills/threejs-materials-lighting/SKILL.md

You MUST read:
1. c:/Users/vuodo/software/forest-runner/.agents/teamwork/ORIGINAL_REQUEST.md
2. c:/Users/vuodo/software/forest-runner/PROJECT.md
3. c:/Users/vuodo/software/forest-runner/.agents/teamwork/explorer_m1_1/recommendation.md (Renderer)
4. c:/Users/vuodo/software/forest-runner/.agents/teamwork/explorer_m1_2/recommendation.md (Day/Night Lighting)
5. c:/Users/vuodo/software/forest-runner/.agents/teamwork/explorer_m1_3/recommendation.md (Atmosphere & Particles)

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Exclusively Owned Files:
- src/game/Renderer.js
- src/game/Game.js
- src/game/AtmosphereManager.js

Tasks:
1. Update `src/game/Renderer.js`:
   - Set `this.renderer.toneMapping = THREE.ACESFilmicToneMapping;`
   - Set `this.renderer.toneMappingExposure = 1.10;`
   - Set `this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;`
   - Ensure `outputColorSpace = THREE.SRGBColorSpace;`
   - Add helper methods `setExposure`, `getExposure`.
2. Implement `src/game/AtmosphereManager.js`:
   - 14 low-poly 3D clouds drifting smoothly with boundary wrapping and day/sunset/night color tinting.
   - Instanced ambient particles (`THREE.InstancedMesh`): floating leaves/pollen, mushroom spores, campfire smoke and flickering flames.
   - Warm localized point lights (lanterns, campfire) that ignite with smoothstep during sunset/night and provide warm illumination (0xff9933).
3. Update `src/game/Game.js`:
   - Eliminate the blue sunlight sticky color bug.
   - Implement the continuous 4-phase day/sunset/night lighting cycle (Dawn, Day, Sunset, Night) smoothly interpolating all 9 parameters with zero per-frame allocation.
   - Wire `AtmosphereManager` into initialization and the render update loop.
   - Configure shadow `normalBias = 0.03` and `bias = -0.0001` on `sunLight`.
4. Build & Verify:
   - Run `npm run build` in PowerShell to ensure zero build errors and valid Vite bundle output.
   - Run verification test scripts with Node (`node --test ...`).
5. Write detailed `changes.md` and `handoff.md` in your working directory.
6. Notify parent when done.
</USER_REQUEST>
