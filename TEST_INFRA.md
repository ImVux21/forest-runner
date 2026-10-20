# Forest Runner E2E Testing Infrastructure Specification

## 1. Overview & Testing Philosophy

Forest Runner is a 3D open-world adventure game powered by Three.js. To guarantee visual fidelity, procedural geometry accuracy, character physics, and quest flow without regressions, the project employs a high-performance, multi-tiered automated test suite running on Node.js native test runner (`node:test` and `node:assert/strict`).

### Key Principles
1. **Zero External Test Dependencies**: Leverages Node.js native test runner (`node --test`) with built-in ESM support, eliminating bulky framework dependencies (Jest/Mocha/Vitest).
2. **Headless Execution**: Fast, deterministic execution (~1-2 seconds total runtime for the entire suite) using a lightweight WebGL/DOM virtualization shim. No browser instances (Puppeteer/Playwright) are needed for core logic, physics, math, and contract verification.
3. **Multi-Tiered Verification**:
   - **Tier 1: Feature Coverage** — Exhaustive contract, mathematical, and behavioral verification for every feature (F1 through F15, >=5 tests per feature).
   - **Tier 2: Boundary & Corner Cases** — Extreme coordinate inputs, numerical singularities, collision thresholds, and altitude limits.
   - **Tier 3: Cross-Feature Subsystem Interactions** — Synchronous and asynchronous coupling between lighting, atmosphere, terrain, physics, and gameplay.
   - **Tier 4: Real-World E2E Scenarios** — Full gameplay journeys from spawn to summit, complete quest arcs, and multi-biome exploration.
4. **Progressive Testability & Authoritative Outputs**: Every test derives its expected values directly from mathematical definitions, physical formulas, or explicit interface contracts documented in `PROJECT.md` and `ORIGINAL_REQUEST.md`.

---

## 2. Headless Test Architecture

### 2.1 The Headless WebGL & DOM Virtualization Layer (`tests/helpers/headless_env.mjs`)
Three.js relies on standard browser globals (`window`, `document`, `navigator`, `HTMLCanvasElement`, `WebGLRenderingContext`). In a headless Node.js environment:
- **Mock DOM**: Provides global `window` and `document` shims, handling element creation, sizing, query selection, and event listener registration.
- **Proxy WebGL Context**: A JavaScript `Proxy` simulating WebGL 1.0 / 2.0 states, queries (`getParameter`, `getShaderPrecisionFormat`), and buffer allocations without GPU hardware.
- **Scene Isolation**: Each test suite instantiates fresh Three.js scenes, cameras, and managers to guarantee test independence.

### 2.2 Analytical Models & Contract Validators (`tests/helpers/analytical_models.mjs`)
For features spanning active milestones (M1 through M4), the testing harness maintains authoritative analytical models that define the ground-truth contracts:
- **ACESFilmic Curve**: Mathematical model of ACES tone mapping curve and exposure scaling.
- **Sun Orbit & Sky Interpolation**: Trigonometric sun trajectory and 4-phase sky/fog color lerp formulas.
- **Wave Displacement**: Analytical formula for animated river surface ripples:
  $$y(x, z, t) = y_0 + A \cdot \sin(k_x x + \omega t) \cdot \cos(k_z z + \omega t)$$
- **Analytical Terrain Query**: Pure mathematical height mapping function reflecting plateau geometry, ramps, and suspension bridge.
- **Draw Call & Performance Budget**: Budget auditing functions validating mesh count, material deduplication, and light counts.

---

## 3. Test Suite Organization

```
tests/
├── helpers/
│   ├── headless_env.mjs           # Virtualized WebGL & DOM environment shim
│   ├── analytical_models.mjs      # Authoritative mathematical models & validators
│   └── test_fixtures.mjs          # Scene & world manager factories
├── tier1_features/                # Tier 1: Unit & Feature Coverage (>=5 tests per feature)
│   ├── f01_tonemapping.test.mjs   # F1: ACESFilmic tone mapping & exposure
│   ├── f02_shadows.test.mjs       # F2: Soft PCF shadows & frustum
│   ├── f03_day_night.test.mjs     # F3: 4-phase day/night transitions
│   ├── f04_point_lights.test.mjs  # F4: Warm localized point lights & budget
│   ├── f05_clouds.test.mjs        # F5: Drifting 3D low-poly clouds
│   ├── f06_particles.test.mjs     # F6: Ambient particle systems (leaves/spores/smoke)
│   ├── f07_stepped_cliffs.test.mjs# F7: Stepped organic cliffs & boundaries
│   ├── f08_river_canyon.test.mjs  # F8: Animated river wave ripples & canyon
│   ├── f09_terrain_collision.test.mjs # F9: Analytical terrain height & step threshold
│   ├── f10_village_crossroads.test.mjs# F10: Whispering Village & Finn landmark
│   ├── f11_mushroom_grove.test.mjs# F11: Luminescent Mushroom Grove & spring pads
│   ├── f12_sunken_ruins.test.mjs  # F12: Ancient Sunken Ruins & floating runes
│   ├── f13_windy_peak.test.mjs    # F13: Summit lookout tower & campfire
│   ├── f14_gameplay_quests.test.mjs # F14: Player traversal, glider, quests & NPCs
│   └── f15_performance_budget.test.mjs # F15: Draw calls, instancing & material reuse
├── tier2_boundaries/              # Tier 2: Boundary & Corner Cases
│   ├── coordinates_limits.test.mjs      # Map boundary clamping, extreme coords
│   ├── height_step_thresholds.test.mjs  # 1.2m step block, fall velocity, vertical limits
│   └── physics_clamping.test.mjs        # Glider speed limits, bounce radii
├── tier3_interactions/            # Tier 3: Cross-Feature Subsystem Interactions
│   ├── day_night_point_lights.test.mjs  # Night trigger -> lantern/campfire illumination
│   ├── mushroom_glider_elevation.test.mjs # Spring bounce -> peak altitude -> paraglider
│   └── bridge_canyon_river.test.mjs     # Bridge elevation vs river depth
└── tier4_scenarios/               # Tier 4: Real-World Scenarios
    ├── quest_walkthrough.test.mjs       # Complete 3-NPC story quest progression
    ├── biome_navigation.test.mjs        # Sequential 5-biome traversal
    └── summit_glider_journey.test.mjs   # Summit launch -> paraglider valley flight
```

---

## 4. Execution Commands

### 4.1 Running the Full Test Suite
To execute all test tiers:
```bash
node --test tests/**/*.test.mjs
```

### 4.2 Running Specific Test Tiers
```bash
# Tier 1: Feature Coverage only
node --test tests/tier1_features/*.test.mjs

# Tier 2: Boundary & Corner Cases only
node --test tests/tier2_boundaries/*.test.mjs

# Tier 3: Cross-Feature Interactions only
node --test tests/tier3_interactions/*.test.mjs

# Tier 4: Real-World Scenarios only
node --test tests/tier4_scenarios/*.test.mjs
```

### 4.3 Running with Verbose Spec Reporter
```bash
node --test --test-reporter=spec tests/**/*.test.mjs
```

---

## 5. Authoritative Expected Outputs

| Feature | Input / Condition | Authoritative Source | Expected Value / Behavior |
|---------|-------------------|----------------------|---------------------------|
| **F1** | `renderer.toneMapping` | `PROJECT.md § Interface Contracts` | `THREE.ACESFilmicToneMapping` (4) |
| **F1** | `renderer.toneMappingExposure` | `ORIGINAL_REQUEST.md § R1` | `1.05 <= exposure <= 1.20` (nominally 1.1) |
| **F2** | `renderer.shadowMap.type` | `PROJECT.md § Interface Contracts` | `THREE.PCFSoftShadowMap` (2) |
| **F3** | `dayTime = 0.25` (Noon) | `Game.js:274-287` | `isDay === true`, `sunLight.intensity >= 2.0` |
| **F3** | `dayTime = 0.75` (Midnight) | `Game.js:291-298` | `isDay === false`, `sunLight.intensity <= 0.3`, night sky |
| **F4** | Point lights count | Performance Budget | `<= 8` concurrent active point lights |
| **F7** | Walkable cliff step | `Player3D.js:359` | `stepHeight <= 1.2m` |
| **F8** | River water elevation | `WorldManager.js:239` | `y = 0.04m` |
| **F9** | Valley floor height | `WorldManager.js:468` | `0.0m` |
| **F9** | Peak summit height | `WorldManager.js:26` | `7.0m` |
| **F9** | Suspension bridge height | `WorldManager.js:52` | `3.55m` |
| **F14** | Jump impulse force | `Player3D.js:11` | `12.5 m/s` |
| **F14** | Glider descent rate | `Player3D.js:13` | `-2.0 m/s` |
| **F14** | Bouncy mushroom spot 1 | `WorldManager.js:294` | `power = 20` |
| **F15** | Maximum draw calls | Performance Budget | `<= 120` draw calls |

---

## 6. Continuous Integration & Quality Gates

In CI and pre-commit checks:
1. `node --test tests/**/*.test.mjs` must exit with return code `0`.
2. Total test duration must not exceed 5 seconds.
3. Zero unhandled promise rejections or console errors.
