// ===================================================
// analytical_models.mjs — Authoritative Specifications & Mathematical Models
// Ground-truth contracts and analytical functions for Forest Runner E2E Tests
// ===================================================

import * as THREE from 'three';

// ─── F1: Tone Mapping & Exposure Models ─────────────────────────────────────
export const ToneMappingModel = {
  REQUIRED_TONE_MAPPING: THREE.ACESFilmicToneMapping, // Value 4
  EXPOSURE_TARGET: 1.1,
  EXPOSURE_MIN: 1.05,
  EXPOSURE_MAX: 1.20,
  REQUIRED_COLOR_SPACE: THREE.SRGBColorSpace,

  // Mathematical ACES Filmic tonemapping approximation (Krzysztof Narkowicz)
  // f(x) = (x * (2.51*x + 0.03)) / (x * (2.43*x + 0.59) + 0.14)
  acesFilmic(x) {
    const a = 2.51;
    const b = 0.03;
    const c = 2.43;
    const d = 0.59;
    const e = 0.14;
    return THREE.MathUtils.clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
  },

  applyExposureAndToneMap(linearLuminance, exposure = 1.1) {
    const exposed = linearLuminance * exposure;
    return this.acesFilmic(exposed);
  },
};

// ─── F2: Soft Shadows Specification ─────────────────────────────────────────
export const ShadowsModel = {
  REQUIRED_SHADOW_MAP_TYPE: THREE.PCFSoftShadowMap, // Value 2
  MIN_BIAS: -0.001,
  MAX_BIAS: -0.0001,
  MIN_MAP_SIZE: 2048,
  FRUSTUM_BOUNDS: {
    left: -50,
    right: 50,
    top: 50,
    bottom: -50,
    near: 0.5,
    far: 180,
  },
};

// ─── F3: 4-Phase Day / Night Cycle Model ────────────────────────────────────
export const DayNightModel = {
  DAY_DURATION: 140, // seconds
  PHASES: {
    DAWN: { t: 0.0, sunY: 0.0, label: 'Dawn' },
    NOON: { t: 0.25, sunY: 50.0, label: 'Noon' },
    SUNSET: { t: 0.50, sunY: 0.0, label: 'Sunset' },
    MIDNIGHT: { t: 0.75, sunY: -50.0, label: 'Midnight' },
  },

  calculateSunPosition(t, orbitRadius = 50) {
    const angle = t * Math.PI * 2;
    return {
      x: Math.cos(angle) * orbitRadius,
      y: Math.sin(angle) * orbitRadius,
      z: -20,
    };
  },

  isDaylight(t) {
    return Math.sin(t * Math.PI * 2) > 0;
  },

  getSunFactor(t) {
    const pos = this.calculateSunPosition(t);
    return THREE.MathUtils.clamp(pos.y / 30, 0, 1);
  },

  interpolateSkyColor(sunFactor) {
    const daySky = new THREE.Color(0x6ec4f8);
    const sunsetSky = new THREE.Color(0xe67e22);
    return sunsetSky.clone().lerp(daySky, sunFactor);
  },
};

// ─── F4: Warm Localized Point Lights Specification ──────────────────────────
export const PointLightsModel = {
  MAX_CONCURRENT_POINT_LIGHTS: 8, // WebGL mobile shader budget
  WARM_COLOR_RANGE: {
    minHex: 0xff8822,
    maxHex: 0xffcc66,
  },
  ATTENUATION_RANGE: {
    minDistance: 5.0,
    maxDistance: 15.0,
    decay: 2.0,
  },
  TARGET_POSITIONS: [
    { id: 'finn_lantern', x: -4, y: 1.8, z: -4, label: 'Village Lantern' },
    { id: 'camp_lantern', x: 2, y: 1.8, z: 2, label: 'Crossroads Lantern' },
    { id: 'peak_campfire', x: 17, y: 7.6, z: 21, label: 'Peak Campfire' },
    { id: 'spirit_glow', x: 18, y: 7.8, z: 18, label: 'Forest Spirit' },
    { id: 'mushroom_grove', x: -22, y: 2.0, z: -14, label: 'Grove Shroom' },
  ],
};

// ─── F5: Drifting 3D Low-Poly Clouds Model ──────────────────────────────────
export const CloudsModel = {
  MIN_ALTITUDE: 22.0,
  MAX_ALTITUDE: 35.0,
  WIND_VECTOR: { x: 1.2, z: 0.4 },
  WRAP_BOUND: 45.0, // Clouds wrap when exceeding +-45m
  MAX_POLY_COUNT: 120, // Low-poly budget per cloud

  updatePosition(currentPos, delta, wind = { x: 1.2, z: 0.4 }, bound = 45.0) {
    let nextX = currentPos.x + wind.x * delta;
    let nextZ = currentPos.z + wind.z * delta;

    if (nextX > bound) nextX = -bound;
    if (nextX < -bound) nextX = bound;
    if (nextZ > bound) nextZ = -bound;
    if (nextZ < -bound) nextZ = bound;

    return { x: nextX, y: currentPos.y, z: nextZ };
  },
};

// ─── F6: Ambient Particle Systems Model ─────────────────────────────────────
export const ParticlesModel = {
  SYSTEMS: {
    LEAVES: { count: 35, biome: 'forest_valley', speed: 0.6, maxLife: 6.0 },
    SPORES: { count: 30, biome: 'mushroom_grove', speed: 0.3, maxLife: 5.0 },
    CAMPFIRE_SMOKE: { count: 20, biome: 'peak_summit', speed: 1.5, maxLife: 3.0 },
  },
  MAX_TOTAL_PARTICLES: 150,

  stepParticle(p, delta) {
    p.age += delta;
    if (p.age >= p.maxLife) {
      p.age = 0;
      p.x = p.spawnX;
      p.y = p.spawnY;
      p.z = p.spawnZ;
    } else {
      p.x += p.vx * delta;
      p.y += p.vy * delta;
      p.z += p.vz * delta;
    }
    return p;
  },
};

// ─── F7 & F9: Terrain, Cliffs & Ground Height Model ─────────────────────────
export const TerrainModel = {
  MAP_SIZE: 180,
  EXPLORABLE_BOUND: 86.5, // [-86.5, +86.5]
  VALLEY_HEIGHT: 0.0,
  TIER1_HEIGHT: 3.5,
  TIER2_HEIGHT: 7.0,
  BRIDGE_HEIGHT: 3.55,
  MAX_WALKABLE_STEP: 1.2, // Step threshold blocking player horizontal movement

  PLATEAUS: [
    { id: 'p_north', x: -12, z: 18, w: 32, d: 26, height: 3.5 },
    { id: 'p_peak', x: 18, z: 22, w: 22, d: 20, height: 7.0 },
    { id: 'p_southwest', x: -18, z: -16, w: 26, d: 22, height: 3.5 },
    { id: 'p_southeast', x: 20, z: -18, w: 24, d: 24, height: 3.5 },
  ],

  RAMPS: [
    { id: 'ramp_north', x: -12, z: 3, w: 7, d: 10, axis: 'z', startH: 0.0, endH: 3.5 },
    { id: 'ramp_peak', x: 5, z: 22, w: 10, d: 6, axis: 'x', startH: 3.5, endH: 7.0 },
    { id: 'ramp_southwest', x: -18, z: -3, w: 7, d: 10, axis: 'z', startH: 3.5, endH: 0.0 },
    { id: 'ramp_southeast', x: 32, z: -18, w: 10, d: 7, axis: 'x', startH: 3.5, endH: 0.0 },
  ],

  BRIDGE: { x: 1, z: -17, w: 14, d: 3.6, height: 3.55 },

  getGroundHeight(x, z) {
    // 1. Suspension Bridge
    const b = this.BRIDGE;
    if (x >= b.x - b.w / 2 && x <= b.x + b.w / 2 && z >= b.z - b.d / 2 && z <= b.z + b.d / 2) {
      return b.height;
    }

    // 2. Ramps
    for (const r of this.RAMPS) {
      const halfW = r.w / 2;
      const halfD = r.d / 2;
      if (x >= r.x - halfW && x <= r.x + halfW && z >= r.z - halfD && z <= r.z + halfD) {
        if (r.axis === 'z') {
          const t = THREE.MathUtils.clamp((z - (r.z - halfD)) / r.d, 0, 1);
          return THREE.MathUtils.lerp(r.startH, r.endH, t);
        } else {
          const t = THREE.MathUtils.clamp((x - (r.x - halfW)) / r.w, 0, 1);
          return THREE.MathUtils.lerp(r.startH, r.endH, t);
        }
      }
    }

    // 3. Plateaus
    let highest = this.VALLEY_HEIGHT;
    for (const p of this.PLATEAUS) {
      const halfW = p.w / 2;
      const halfD = p.d / 2;
      if (x >= p.x - halfW && x <= p.x + halfW && z >= p.z - halfD && z <= p.z + halfD) {
        if (p.height > highest) highest = p.height;
      }
    }

    return highest;
  },

  isWalkableStep(currentY, targetY) {
    return (targetY - currentY) <= this.MAX_WALKABLE_STEP;
  },
};

// ─── F8: Animated River & Wave Model ────────────────────────────────────────
export const RiverModel = {
  WATER_SURFACE_Y: 0.04,
  MAX_WAVE_AMPLITUDE: 0.06,
  FREQUENCY: 0.5,
  SPEED: 2.0,
  SEGMENTS: [
    { x: -28, z: -32, w: 7, d: 24 },
    { x: -16, z: -10, w: 8, d: 26 },
    { x: 0, z: 8, w: 9, d: 22 },
    { x: 18, z: -2, w: 8, d: 24 },
    { x: 32, z: 20, w: 10, d: 28 },
  ],

  calculateWaveDisplacement(x, z, time, amplitude = 0.04, freq = 0.5, speed = 2.0) {
    return amplitude * Math.sin(x * freq + time * speed) * Math.cos(z * freq + time * speed);
  },

  getWaterElevation(x, z, time) {
    return this.WATER_SURFACE_Y + this.calculateWaveDisplacement(x, z, time);
  },
};

// ─── F8.6: Wooden Docks Specification ───────────────────────────────────────
export const DocksModel = {
  DOCK_DECK_Y: 0.12,
  DOCKS: [
    { id: 'dock_village', x: -2.2, y: 0.12, z: 3.5, rotY: 0.35, w: 3.2, d: 1.8, label: 'Whispering Village Crossing' },
    { id: 'dock_canyon', x: 14.5, y: 0.12, z: -2.5, rotY: -0.6, w: 3.0, d: 1.8, label: 'Southern Canyon Approach' },
  ],
};

// ─── F10 to F13: Biome & Landmark Specifications ───────────────────────────
export const BiomesModel = {
  VILLAGE: {
    id: 'whispering_village',
    center: { x: -4, z: -4 },
    radius: 12.0,
    npc: 'finn',
    expectedHeight: 0.0,
  },
  RIVER_CANYON: {
    id: 'crystal_river',
    center: { x: 0, z: 8 },
    radius: 14.0,
    waterPlaneY: 0.04,
  },
  MUSHROOM_GROVE: {
    id: 'mushroom_grove',
    center: { x: -18, z: -16 },
    radius: 15.0,
    springMushrooms: [{ x: -26, z: 8, power: 20 }],
  },
  SUNKEN_RUINS: {
    id: 'sunken_ruins',
    center: { x: 20, z: -18 },
    radius: 14.0,
    expectedHeight: 3.5,
  },
  WINDY_PEAK: {
    id: 'windy_peak',
    center: { x: 18, z: 22 },
    radius: 12.0,
    npc: 'spirit',
    summitHeight: 7.0,
  },
};

// ─── F14: Gameplay, Physics, Collectibles & Quest Specification ─────────────
export const GameplayModel = {
  PHYSICS: {
    WALK_SPEED: 10.5,
    SPRINT_SPEED: 17.0,
    GLIDE_SPEED: 14.5,
    JUMP_FORCE: 12.5,
    GRAVITY: -28.0,
    GLIDE_FALL_SPEED: -2.0,
    STEP_THRESHOLD: 1.2,
  },

  MUSHROOMS: [
    { x: -26, z: 8, power: 20, label: 'Valley to Tier 1' },
    { x: 6, z: 27, power: 22, label: 'Tier 1 to Peak Summit' },
    { x: -5, z: -15, power: 19, label: 'Valley SW' },
    { x: 8, z: -8, power: 19, label: 'Valley SE' },
  ],

  NPCS: [
    { id: 'finn', pos: { x: -4.0, y: 0.0, z: -4.0 }, interactionDist: 3.5, flag: 'talkedToFinn' },
    { id: 'bram', pos: { x: 1.0, y: 3.5, z: -13.0 }, interactionDist: 3.5, flag: 'learnedAboutMushrooms' },
    { id: 'spirit', pos: { x: 18.0, y: 7.0, z: 18.0 }, interactionDist: 4.2, flag: 'spiritAwakened' },
  ],

  COLLECTIBLES: {
    COINS_COUNT: 18,
    COIN_POINTS: 10,
    GEMS_COUNT: 4,
    GEM_POINTS: 50,
    CHESTS_COUNT: 2,
    CHEST_POINTS: 200,
    TOTAL_SCORE: 18 * 10 + 4 * 50 + 2 * 200, // 180 + 200 + 400 = 780
  },
};

// ─── F15: Performance & Optimization Budget ─────────────────────────────────
export const PerformanceBudgetModel = {
  MAX_DRAW_CALLS: 120,
  TARGET_FPS: 60,
  MAX_FRAME_TIME_MS: 16.67,
  MAX_POINT_LIGHTS: 8,
  MIN_INSTANCED_PARTICLE_RATIO: 0.8, // 80%+ particles should use InstancedMesh
};
