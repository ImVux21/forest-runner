# Handoff Report: Milestone 1 Test Layout Compliance & Verification Suite Design

**Agent ID**: `explorer_m1_it2_3`  
**Role**: explorer  
**Working Directory**: `c:/Users/vuodo/software/forest-runner/.agents/teamwork/explorer_m1_it2_3`  
**Target**: Milestone 1 Remediation (Layout Compliance, Test Relocation, Test Suite Design)  
**Date**: 2026-09-27  
**Status**: COMPLETE (Hard Handoff)  

---

## 1. Observation

1. **Rogue Test Suite Location and Crash**:
   - `worker_m1` created `.agents/teamwork/worker_m1/tests/m1_verification.test.mjs`.
   - Running `node --test .agents/teamwork/worker_m1/tests/m1_verification.test.mjs` failed immediately:
     ```
     Error [ERR_MODULE_NOT_FOUND]: Cannot find module 'C:\Users\vuodo\software\forest-runner\.agents\tests\helpers\headless_env.mjs' imported from C:\Users\vuodo\software\forest-runner\.agents\teamwork\worker_m1\tests\m1_verification.test.mjs
     ```
   - Line 8 of that file uses `import '../../../tests/helpers/headless_env.mjs'`, which resolves to `.agents/tests/helpers/` (4 levels up needed `../../../../`).
   - Project layout rule in `PROJECT.md:70` stipulates: `tests/ — E2E and unit test suites.`
   - `.agents/teamwork/` is explicitly restricted to agent coordination metadata only.
   - Project test runner script in `package.json:10` is `"test": "node --test tests/**/*.test.mjs"`, which completely ignores `.agents/teamwork/`.

2. **Empirical Measurement of Atmospheric Defects via Prototype Suite**:
   - Executing our prototype verification suite (`.agents/teamwork/explorer_m1_it2_3/prototype_test.mjs`) on current codebase produced:
     ```
     [Diagnostic] Max cloud color delta observed: 1.5360 at dayTime=0.5500
     [Diagnostic] Initial Flames: 0/35 at summit, 35/35 near origin
     [Diagnostic] Initial Smoke: 0/30 at summit, 30/30 near origin
     [Diagnostic] Max flicker intensity step across [950ms, 1050ms]: 0.1376 at ms=1002
     ✖ Cloud Color: Continuous interpolation with max delta < 0.05 across full 1,000-step cycle (80.448ms)
     ✖ Campfire Particles: Initial positions strictly localized to Peak Summit (20, 7, 22) (9.5755ms)
     ✖ Timing Continuity: Millisecond inputs must scale smoothly to seconds without 1000x inversion (21.6235ms)
     ```
   - Cloud color hard-snaps from `#ffaa88` to `#242d4a` at `dayTime = 0.55` ($\Delta = 1.5360$), violating requirement $\max \Delta < 0.05$.
   - 100% of campfire flame and smoke particles (35/35 and 30/30) spawn at $(0, 0, 0)$ instead of summit campfire $(20, 7, 22)$.
   - The threshold heuristic `elapsed > 1000 ? elapsed * 0.001 : elapsed` causes a jump of $0.1376$ in light flicker at $1002\text{ms}$ (exceeding $0.05$).

3. **Remediation Prototype Validation**:
   - Subclassing `AtmosphereManager` with:
     1. 4-phase Hermite smoothstep palette (`_cloudDawnColor` `#ffd1b3`, `_cloudDayColor` `#ffffff`, `_cloudSunsetColor` `#ffaa88`, `_cloudNightColor` `#242d4a`).
     2. Initializing flame and smoke particles directly at `this.campfirePos` (`20, 7, 22`).
     3. Accumulating delta in `this.elapsedTime += delta`.
   - Running `.agents/teamwork/explorer_m1_it2_3/test_remediation_spec.mjs` resulted in:
     ```
     [Remediation Verified] Max cloud color delta: 0.0119 at dayTime=0.8760
     [Remediation Verified] Initial Flames: 35/35 at summit, 0/35 near origin
     [Remediation Verified] Initial Smoke: 30/30 at summit, 0/30 near origin
     [Remediation Verified] Max flicker intensity step: 0.0041 at ms=952
     ✔ Remediated Cloud Color: max delta < 0.05 across full 1,000 steps (85.4977ms)
     ✔ Remediated Campfire Particles: 100% localized to summit on cold-start (11.5586ms)
     ✔ Remediated Timing Continuity: smooth flicker and continuous accumulator (18.2719ms)
     ℹ pass 3, fail 0
     ```

---

## 2. Logic Chain

1. **Layout Violation Remediation (Observation 1)**:
   - Because `package.json` executes `tests/**/*.test.mjs`, tests in `.agents/teamwork/` are neither standard nor executable in CI.
   - Deleting `.agents/teamwork/worker_m1/tests/` completely eliminates the workspace layout violation and prevents dead code accumulation.
   - All tests belong in `tests/tier1_features/`, where relative paths like `../helpers/headless_env.mjs` and `../../src/game/` resolve cleanly and reliably.

2. **Test Suite Scope & Design (Observation 2, Observation 3)**:
   - The test suite must be positioned at `tests/tier1_features/f06_atmosphere_remediation.test.mjs`.
   - By testing 1,000 discrete steps across `dayTime` $\in [0, 1)$, any discontinuous hard-switch (such as the $1.536$ jump at $0.55$) is mathematically guaranteed to trip an assertion failure.
   - By inspecting both raw data arrays (`flameData`, `smokeData`) immediately after `init()` and instance matrices after the first simulation step ($dt = 0.001\text{s}$), cold-start leaks at the player's spawn point $(0, 0, 0)$ are impossible to disguise.
   - By stepping through the $950\text{ms} \to 1050\text{ms}$ interval in 2ms increments, any discrete threshold switch (like `elapsed > 1000`) is immediately exposed via a large step delta ($\Delta > 0.05$).

3. **Remediation Feasibility**:
   - The empirical proof in `test_remediation_spec.mjs` establishes that the proposed 4-phase Hermite smoothstep drops max color delta to $0.0119$ ($< 0.05$), ensures 100% summit containment of particles, and stabilizes timing step delta to $0.0041$ ($< 0.05$), without any garbage-collection overhead.

---

## 3. Caveats

- **Read-Only Constraint**: As an explorer agent, I did not modify `src/game/AtmosphereManager.js` or create files directly under `tests/`. The test file implementation and source changes must be executed by the designated worker/test writer.
- **Existing Tests**: The existing 135 tests in `tests/` pass with zero failures. When `tests/tier1_features/f06_atmosphere_remediation.test.mjs` is added, total test count will increase to 142 tests.

---

## 4. Conclusion

1. **Cleanup Action**: Execute `Remove-Item -Recurse -Force .agents/teamwork/worker_m1/tests` to restore layout compliance.
2. **Test File Placement**: Place the comprehensive test suite documented in `recommendation.md:Section 2` into `tests/tier1_features/f06_atmosphere_remediation.test.mjs`.
3. **Remediation Implementation**: Implement the 3-point remediation blueprint in `src/game/AtmosphereManager.js` detailed in `recommendation.md:Section 3`.

---

## 5. Verification Method

1. **Verify Rogue Tests Removal**:
   ```powershell
   Test-Path c:/Users/vuodo/software/forest-runner/.agents/teamwork/worker_m1/tests
   # Must return False
   ```

2. **Verify Remediation Test Suite on Current Code (Confirms Test Catches Bugs)**:
   ```powershell
   node --test .agents/teamwork/explorer_m1_it2_3/prototype_test.mjs
   # Expect 3 failing assertions (cloud jump 1.536, 35 flames at origin, timing jump 0.138)
   ```

3. **Verify Proposed Fix Logic Passes 100%**:
   ```powershell
   node --test .agents/teamwork/explorer_m1_it2_3/test_remediation_spec.mjs
   # Expect: 3 passed, 0 failed
   ```

4. **Verify Integrated Project Test Suite After Placement in `tests/`**:
   ```powershell
   node --test tests/tier1_features/f06_atmosphere_remediation.test.mjs
   npm test
   # Expect 142 tests passing across all tiers
   ```
