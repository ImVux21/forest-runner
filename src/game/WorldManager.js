// ===================================================
// WorldManager.js — Living Multi-Tiered Open-World Forest
// Plateaus, Cliffs, Ramps, Suspension Bridge, Winding Stream, and Bouncy Mushrooms
// ===================================================
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

export class WorldManager {
  constructor(scene) {
    this.scene = scene;
    this.models = {};
    this.loader = new GLTFLoader();
    this.props = [];
    this.bouncyMushrooms = []; // Interactive spring pads
    this.waterMesh = null;
    this.waterGeometries = [];
    this.riverBedMesh = null;
    this.docks = [];
    this.mountainMeshes = [];
    this.windRings = []; // Aerial thermal boost rings
    this.birds = []; // Soaring mountain raptors
    this.butterflies = []; // Meadow butterflies
    this.steppingStones = []; // River hopping stones
    this.skyIslands = []; // Floating Celestial Sky Islands
    this.updraftVents = []; // Updraft Thermal Vents

    // ─── Map Dimensions & Terrain Layout ────────────────────────────────────
    this.mapSize = 180; // 180m x 180m explorable valley

    // Plateau definition: { id, x, z, w, d, height }
    this.plateaus = [
      // Plateau A: Large northern terrace (Tier 1: height 3.5m)
      { id: 'p_north', x: -12, z: 18, w: 32, d: 26, height: 3.5 },

      // Plateau B: High eastern peak on top of Tier 1 (Tier 2: height 7.0m)
      { id: 'p_peak', x: 18, z: 22, w: 22, d: 20, height: 7.0 },

      // Plateau C: South-west overlook (Tier 1: height 3.5m)
      { id: 'p_southwest', x: -18, z: -16, w: 26, d: 22, height: 3.5 },

      // Plateau D: Southeast campsite ridge (Tier 1: height 3.5m)
      { id: 'p_southeast', x: 20, z: -18, w: 24, d: 24, height: 3.5 },
    ];

    // Ramps (slopes connecting heights):
    this.ramps = [
      // Ramp 1: Valley (0m) -> Plateau North (3.5m)
      { x: -12, z: 3, w: 7, d: 10, axis: 'z', startH: 0.0, endH: 3.5 },

      // Ramp 2: Plateau North (3.5m) -> Peak (7.0m)
      { x: 5, z: 22, w: 10, d: 6, axis: 'x', startH: 3.5, endH: 7.0 },

      // Ramp 3: Plateau Southwest (3.5m at z=-8) -> Valley (0m at z=+2)
      { x: -18, z: -3, w: 7, d: 10, axis: 'z', startH: 3.5, endH: 0.0 },

      // Ramp 4: Plateau Southeast (3.5m at x=27) -> Eastern Valley (0m at x=37)
      { x: 32, z: -18, w: 10, d: 7, axis: 'x', startH: 3.5, endH: 0.0 },
    ];

    // Wooden Bridge: Spans between Plateau C and Plateau D at Tier 1 (y = 3.5m)
    this.bridge = {
      x: 1, z: -17, w: 14, d: 3.6, height: 3.55
    };

    // Materials
    this.grassMat = new THREE.MeshStandardMaterial({
      color: 0x58aa32,
      roughness: 0.85,
      metalness: 0.05,
      flatShading: true,
    });

    this.cliffMat = new THREE.MeshStandardMaterial({
      color: 0x768574,
      roughness: 0.9,
      metalness: 0.05,
      flatShading: true,
    });

    this.rampMat = new THREE.MeshStandardMaterial({
      color: 0x8a7252,
      roughness: 0.95,
      metalness: 0.0,
      flatShading: true,
    });

    this.woodMat = new THREE.MeshStandardMaterial({
      color: 0x6d4c2d, // Dark aged wood
      roughness: 0.8,
      metalness: 0.1,
    });

    this.waterMat = new THREE.MeshStandardMaterial({
      color: 0x18b5d6, // Crystal cyan water
      roughness: 0.1,
      metalness: 0.6,
      transparent: true,
      opacity: 0.75,
    });

    // Geological strata materials
    this.cliffDarkMat = new THREE.MeshStandardMaterial({
      color: 0x525c50, // Dark basal foundation stone
      roughness: 0.95,
      metalness: 0.05,
      flatShading: true,
    });

    this.cliffLightMat = new THREE.MeshStandardMaterial({
      color: 0x8a9987, // Sun-weathered sub-turf rim stone
      roughness: 0.85,
      metalness: 0.05,
      flatShading: true,
    });

    this.stoneStepMat = new THREE.MeshStandardMaterial({
      color: 0x7a6d59, // Chiseled rock pavers
      roughness: 0.90,
      metalness: 0.02,
      flatShading: true,
    });

    // Naturalized mountain boundary materials
    this.mountainRockMat = new THREE.MeshStandardMaterial({
      color: 0x526055, // Deep alpine granite slate
      roughness: 0.90,
      metalness: 0.05,
      flatShading: true,
    });

    this.mountainSnowMat = new THREE.MeshStandardMaterial({
      color: 0xdde6ed, // Crisp alpine snow/frost
      roughness: 0.80,
      metalness: 0.05,
      flatShading: true,
    });

    // River environment materials
    this.riverBedMat = new THREE.MeshStandardMaterial({
      color: 0x3d473b, // Dark wet silt and river gravel
      roughness: 0.90,
      metalness: 0.05,
      flatShading: true,
    });

    this.pebbleMat = new THREE.MeshStandardMaterial({
      roughness: 0.85,
      metalness: 0.10,
      flatShading: true,
    });

    this.ropeMat = new THREE.MeshStandardMaterial({
      color: 0xbaa482,
      roughness: 0.90,
    });

    // ─── Landmark & Biome Materials (Milestone 3) ─────────────────────────
    this.stonePillarMat = new THREE.MeshStandardMaterial({
      color: 0x828b80,
      roughness: 0.85,
      metalness: 0.05,
      flatShading: true,
    });
    this.runeCrystalMat = new THREE.MeshStandardMaterial({
      color: 0x00e5ff,
      emissive: 0x0099cc,
      emissiveIntensity: 0.85,
      roughness: 0.15,
      metalness: 0.2,
    });
    this.shroomCapMatCyan = new THREE.MeshStandardMaterial({
      color: 0x00e5ff,
      emissive: 0x0088aa,
      emissiveIntensity: 0.65,
      roughness: 0.35,
    });
    this.shroomCapMatPurple = new THREE.MeshStandardMaterial({
      color: 0x9c27b0,
      emissive: 0xba68c8,
      emissiveIntensity: 0.65,
      roughness: 0.35,
    });
    this.shroomStemMat = new THREE.MeshStandardMaterial({
      color: 0xf3e5f5,
      emissive: 0x7b1fa2,
      emissiveIntensity: 0.18,
      roughness: 0.5,
    });
    this.cobbleMat = new THREE.MeshStandardMaterial({
      color: 0x768078,
      roughness: 0.9,
      metalness: 0.05,
      flatShading: true,
    });
    this.lanternPostMat = new THREE.MeshStandardMaterial({
      color: 0x4a321e,
      roughness: 0.85,
    });
    this.lanternGlassMat = new THREE.MeshStandardMaterial({
      color: 0xffaa22,
      emissive: 0xff7700,
      emissiveIntensity: 1.0,
      roughness: 0.2,
    });
    this.flowerMatRed = new THREE.MeshStandardMaterial({ color: 0xee3333, roughness: 0.5 });
    this.flowerMatYellow = new THREE.MeshStandardMaterial({ color: 0xffcc00, roughness: 0.5 });
    this.flowerMatBlue = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.5 });
    this.flowerMatWhite = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
    this.flowerStemMat = new THREE.MeshStandardMaterial({ color: 0x388e3c, roughness: 0.7 });
    this.bannerMat = new THREE.MeshStandardMaterial({
      color: 0x2563eb,
      emissive: 0x1d4ed8,
      emissiveIntensity: 0.3,
      side: THREE.DoubleSide,
    });
    this.tentMat = new THREE.MeshStandardMaterial({
      color: 0xe5d4b8,
      roughness: 0.9,
      side: THREE.DoubleSide,
    });
    this.campfireRockMat = new THREE.MeshStandardMaterial({
      color: 0x333538,
      roughness: 0.95,
      flatShading: true,
    });
    this.campfireLogMat = new THREE.MeshStandardMaterial({
      color: 0x211710,
      roughness: 0.9,
    });
    this.emberMat = new THREE.MeshStandardMaterial({
      color: 0xff4400,
      emissive: 0xff5500,
      emissiveIntensity: 1.2,
    });

    this.runeCrystal = null;
  }

  async init() {
    await this._loadPropModels();
    this._buildTerrain();
    this._buildRiver();
    this._buildRiverSteppingStones();
    this._buildSuspensionBridge();
    this._buildBouncyMushrooms();
    this._buildFaunaAndAtmosphere();
    this._decorateWorld();
  }

  // ─── 1. Load KayKit Nature Models ─────────────────────────────────────────

  async _loadPropModels() {
    const basePath = './assets/forest/gltf/';
    const modelNames = [
      'Tree_1_A', 'Tree_2_A', 'Tree_3_A', 'Tree_4_A', 'Tree_Bare_1_A',
      'Tree_1_B_Color1', 'Tree_2_B_Color1', 'Tree_2_C_Color1', 'Tree_3_B_Color1', 'Tree_4_B_Color1', 'Tree_Bare_2_A_Color1',
      'Bush_1_A', 'Bush_2_A', 'Bush_3_A_Color1', 'Bush_4_A_Color1',
      'Rock_1_A', 'Rock_2_A', 'Rock_3_A', 'Rock_1_B_Color1', 'Rock_2_C_Color1', 'Rock_3_B_Color1', 'Rock_3_E_Color1',
      'Grass_1_A_Color1', 'Grass_2_A_Color1',
    ];

    const promises = modelNames.map(name =>
      new Promise(resolve => {
        this.loader.load(
          `${basePath}${name}.gltf`,
          gltf => {
            const model = gltf.scene;
            model.traverse(child => {
              if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                if (child.material) {
                  child.material.roughness = 0.65;
                  child.material.metalness = 0.05;
                }
              }
            });
            this.models[name] = model;
            resolve();
          },
          undefined,
          () => resolve()
        );
      })
    );

    // Additional architectural, monster, and terrain tile models from extracted assets
    const extraModels = [
      { name: 'house', path: './assets/medieval/house.gltf.glb' },
      { name: 'well', path: './assets/medieval/well.gltf.glb' },
      { name: 'watchtower', path: './assets/medieval/watchtower.gltf.glb' },
      { name: 'lumbermill', path: './assets/medieval/lumbermill.gltf.glb' },
      { name: 'mushroomKing', path: './assets/monsters/MushroomKing.gltf' },
      { name: 'castle', path: './assets/medieval/castle.gltf.glb' },
      { name: 'market', path: './assets/medieval/market.gltf.glb' },
      { name: 'barracks', path: './assets/medieval/barracks.gltf.glb' },
      { name: 'farm_plot', path: './assets/medieval/farm_plot.gltf.glb' },
      { name: 'archeryrange', path: './assets/medieval/archeryrange.gltf.glb' },
      { name: 'watermill', path: './assets/medieval/watermill.gltf.glb' },
      { name: 'mine', path: './assets/medieval/mine.gltf.glb' },
      { name: 'wall_straight', path: './assets/medieval/wall_straight.gltf.glb' },
      { name: 'wall_corner', path: './assets/medieval/wall_corner.gltf.glb' },
      { name: 'wall_gate', path: './assets/medieval/wall_gate.gltf.glb' },
      { name: 'dragon', path: './assets/monsters/Dragon.gltf' },
      { name: 'demon', path: './assets/monsters/Demon.gltf' },
      { name: 'ghost', path: './assets/monsters/Ghost.gltf' },
      { name: 'yeti', path: './assets/monsters/Yeti.gltf' },
      { name: 'orc', path: './assets/monsters/Orc.gltf' },
      { name: 'alpaking', path: './assets/monsters/Alpaking.gltf' },
      { name: 'tile_road', path: './assets/medieval/tiles/square_forest_roadA.gltf.glb' },
      { name: 'tile_sand', path: './assets/medieval/tiles/square_sand.gltf.glb' },
      { name: 'tile_rock', path: './assets/medieval/tiles/square_rock.gltf.glb' },
    ];
    extraModels.forEach(m => {
      promises.push(
        new Promise(resolve => {
          this.loader.load(
            m.path,
            gltf => {
              const model = gltf.scene;
              model.traverse(child => {
                if (child.isMesh) {
                  child.castShadow = true;
                  child.receiveShadow = true;
                }
              });
              this.models[m.name] = model;
              resolve();
            },
            undefined,
            () => resolve()
          );
        })
      );
    });

    await Promise.all(promises);
  }

  // ─── 2. Build Multi-Tiered Terrain ────────────────────────────────────────

  _buildTerrain() {
    const half = this.mapSize / 2;

    // Expansive Floor (Spans 380m x 380m across the explorable valley into distant mountain foothills)
    const floorGeo = new THREE.PlaneGeometry(380, 380, 24, 24);
    const floor = new THREE.Mesh(floorGeo, this.grassMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Stepped Organic Plateaus with Tiered Rock Strata
    this._buildTieredPlateaus();

    // Naturalized Stepped Ramps
    this._buildSteppedRamps();

    // Mountain Boundaries
    this._buildBoundaryMountains(half);
  }

  // ─── Procedural Tiered Plateau Generator ──────────────────────────────────
  _buildTieredPlateaus() {
    this.plateaus.forEach(p => {
      const group = new THREE.Group();
      group.position.set(p.x, 0, p.z);

      const h = p.height;
      const h1 = h * 0.35; // Base strata height (~1.22m for h=3.5)
      const h2 = h * 0.40; // Mid strata height (~1.40m)
      const h3 = h - h1 - h2; // Upper strata height (~0.88m)

      // Stratum 1: Basal Bedrock Skirt (slightly flared foundation)
      const skirtMargin = 0.5;
      const baseGeo = new THREE.BoxGeometry(p.w + skirtMargin, h1, p.d + skirtMargin);
      const baseMesh = new THREE.Mesh(baseGeo, this.cliffDarkMat);
      baseMesh.position.y = h1 / 2;
      baseMesh.castShadow = true;
      baseMesh.receiveShadow = true;
      group.add(baseMesh);

      // Stratum 2: Mid-Tier Sedimentary Body
      const midGeo = new THREE.BoxGeometry(p.w, h2, p.d);
      const midMesh = new THREE.Mesh(midGeo, this.cliffMat);
      midMesh.position.y = h1 + h2 / 2;
      midMesh.castShadow = true;
      midMesh.receiveShadow = true;
      group.add(midMesh);

      // Stratum 3: Upper Weathered Rim
      const rimGeo = new THREE.BoxGeometry(p.w + 0.1, h3, p.d + 0.1);
      const rimMesh = new THREE.Mesh(rimGeo, this.cliffLightMat);
      rimMesh.position.y = h1 + h2 + h3 / 2;
      rimMesh.castShadow = true;
      rimMesh.receiveShadow = true;
      group.add(rimMesh);

      // Stratum 4: Overhanging Grass Turf Cap
      const capThickness = 0.22;
      const capGeo = new THREE.BoxGeometry(p.w + 0.45, capThickness, p.d + 0.45);
      const cap = new THREE.Mesh(capGeo, this.grassMat);
      cap.position.y = h + capThickness / 2;
      cap.castShadow = true;
      cap.receiveShadow = true;
      group.add(cap);

      // Faceted Corner Rock Buttresses (Softens 90° corners)
      const halfW = p.w / 2;
      const halfD = p.d / 2;
      const cornerOffsets = [
        [-halfW, -halfD], [halfW, -halfD],
        [-halfW, halfD],  [halfW, halfD]
      ];

      cornerOffsets.forEach(([cx, cz]) => {
        const cornerH = h * 0.55;
        const cornerGeo = new THREE.BoxGeometry(1.6, cornerH, 1.6);
        const cornerMesh = new THREE.Mesh(cornerGeo, this.cliffDarkMat);
        cornerMesh.position.set(cx, cornerH / 2, cz);
        cornerMesh.rotation.y = Math.PI / 4; // 45° chamfer
        cornerMesh.castShadow = true;
        cornerMesh.receiveShadow = true;
        group.add(cornerMesh);
      });

      this.scene.add(group);
    });
  }

  // ─── Procedural Stepped Ramp Generator ────────────────────────────────────
  _buildSteppedRamps() {
    this.ramps.forEach(r => {
      const group = new THREE.Group();
      group.position.set(r.x, 0, r.z);

      const isZ = r.axis === 'z';
      const length = isZ ? r.d : r.w;
      const width = isZ ? r.w : r.d;
      const heightDiff = r.endH - r.startH;
      const angle = Math.atan2(heightDiff, length);

      // 1. Continuous structural incline ramp base
      const rampBase = new THREE.Mesh(
        new THREE.BoxGeometry(isZ ? width : length, 0.35, isZ ? length : width),
        this.rampMat
      );
      if (isZ) {
        rampBase.rotation.x = -angle;
      } else {
        rampBase.rotation.z = angle;
      }
      rampBase.position.set(0, (r.startH + r.endH) / 2, 0);
      rampBase.castShadow = true;
      rampBase.receiveShadow = true;
      group.add(rampBase);

      // 2. Stepped Rock Paver Treads (10 natural stone steps)
      const numSteps = 10;
      const stepLength = length / numSteps;
      const stepGeo = new THREE.BoxGeometry(
        isZ ? width * 0.92 : stepLength * 0.95,
        0.22,
        isZ ? stepLength * 0.95 : width * 0.92
      );

      for (let i = 0; i < numSteps; i++) {
        const t = (i + 0.5) / numSteps;
        const stepH = THREE.MathUtils.lerp(r.startH, r.endH, t);
        const offset = -length / 2 + (i + 0.5) * stepLength;

        const stepMesh = new THREE.Mesh(stepGeo, this.stoneStepMat);
        if (isZ) {
          stepMesh.position.set(0, stepH + 0.08, offset);
        } else {
          stepMesh.position.set(offset, stepH + 0.08, 0);
        }
        stepMesh.castShadow = true;
        stepMesh.receiveShadow = true;
        group.add(stepMesh);
      }

      // 3. Flanking Stone Curbs (Left & Right Retaining Borders)
      const curbGeo = new THREE.BoxGeometry(
        isZ ? 0.35 : length,
        0.45,
        isZ ? length : 0.35
      );
      for (const side of [-width / 2 + 0.15, width / 2 - 0.15]) {
        const curb = new THREE.Mesh(curbGeo, this.cliffDarkMat);
        if (isZ) {
          curb.rotation.x = -angle;
          curb.position.set(side, (r.startH + r.endH) / 2 + 0.12, 0);
        } else {
          curb.rotation.z = angle;
          curb.position.set(0, (r.startH + r.endH) / 2 + 0.12, side);
        }
        curb.castShadow = true;
        curb.receiveShadow = true;
        group.add(curb);
      }

      this.scene.add(group);
    });
  }

  // ─── Procedural Naturalized Stepped Mountain Ranges ─────────────────────────
  _buildBoundaryMountains(half) {
    const rockGeos = [];
    const grassGeos = [];
    const snowGeos = [];

    const numSegments = 10;
    const segWidth = (this.mapSize + 14) / numSegments; // ~10.4m per segment

    // Center Tier 1 at 43.5m so inner face begins at 42.0m (> 41.5m player clamp)
    const baseCoord = half - 1.5;

    const sides = [
      { name: 'north', axis: 'x', constCoord: baseCoord, dir: 1 },
      { name: 'south', axis: 'x', constCoord: -baseCoord, dir: -1 },
      { name: 'east',  axis: 'z', constCoord: baseCoord, dir: 1 },
      { name: 'west',  axis: 'z', constCoord: -baseCoord, dir: -1 },
    ];

    // 1. Generate 4 undulating perimeter mountain ranges
    sides.forEach((side, sIdx) => {
      for (let i = 0; i < numSegments; i++) {
        const coord = -(half + 7) + (i + 0.5) * segWidth;
        const seed = sIdx * 10 + i;

        // Multi-tier height harmonic variations
        const h1 = 3.6 + Math.sin(seed * 1.5) * 0.7; // Tier 1: 2.9m - 4.3m (> 1.2m step)
        const h2 = 8.5 + Math.cos(seed * 2.1) * 1.8; // Tier 2: 6.7m - 10.3m
        const h3 = 17.5 + Math.sin(seed * 1.3) * 3.5 + Math.cos(seed * 2.7) * 2.0; // Tier 3: 12.0m - 23.0m

        // Tier 1: Foothill Cliff Base (Inner edge at |coord| ~ 42m)
        const t1Geo = new THREE.BoxGeometry(
          side.axis === 'x' ? segWidth * 1.05 : 3.0,
          h1,
          side.axis === 'x' ? 3.0 : segWidth * 1.05
        );
        const t1X = side.axis === 'x' ? coord : side.constCoord;
        const t1Z = side.axis === 'x' ? side.constCoord : coord;
        t1Geo.translate(t1X, h1 / 2, t1Z);
        rockGeos.push(t1Geo);

        // Tier 1: Alpine Meadow Shelf Cap
        const capGeo = new THREE.BoxGeometry(
          side.axis === 'x' ? segWidth * 1.06 : 3.2,
          0.3,
          side.axis === 'x' ? 3.2 : segWidth * 1.06
        );
        capGeo.translate(t1X, h1 + 0.15, t1Z);
        grassGeos.push(capGeo);

        // Tier 2: Mid Mountain Crag (Stepped outward by 2.5m)
        const t2Offset = side.dir * 2.5;
        const t2X = side.axis === 'x' ? coord : side.constCoord + t2Offset;
        const t2Z = side.axis === 'x' ? side.constCoord + t2Offset : coord;
        const t2H = h2 - h1;
        const t2Geo = new THREE.BoxGeometry(
          side.axis === 'x' ? segWidth * 1.08 : 3.5,
          t2H,
          side.axis === 'x' ? 3.5 : segWidth * 1.08
        );
        t2Geo.translate(t2X, h1 + t2H / 2, t2Z);
        rockGeos.push(t2Geo);

        // Tier 3: Alpine Mountain Peak Spires (Stepped outward by 5.5m)
        const t3Offset = side.dir * 5.5;
        const t3X = side.axis === 'x' ? coord : side.constCoord + t3Offset;
        const t3Z = side.axis === 'x' ? side.constCoord + t3Offset : coord;
        const peakH = h3 - h2;
        const peakGeo = new THREE.ConeGeometry(segWidth * 0.7, peakH, 5);
        peakGeo.translate(t3X, h2 + peakH / 2, t3Z);
        rockGeos.push(peakGeo);

        // High Altitude Snowcaps (for peaks rising above 18m)
        if (h3 > 18.0) {
          const snowH = (h3 - 18.0) * 0.85;
          const snowGeo = new THREE.ConeGeometry(segWidth * 0.35, snowH, 5);
          snowGeo.translate(t3X, h3 - snowH / 2, t3Z);
          snowGeos.push(snowGeo);
        }
      }
    });

    // 2. Generate 4 Corner Mountain Massifs (Massive 6-sided faceted peak clusters)
    const corners = [
      { x: half + 2, z: half + 2 },
      { x: -(half + 2), z: half + 2 },
      { x: half + 2, z: -(half + 2) },
      { x: -(half + 2), z: -(half + 2) },
    ];

    corners.forEach((c, cIdx) => {
      const cornerH = 22.0 + (cIdx % 2) * 3.0; // 22m - 25m corner summits
      const cGeo = new THREE.ConeGeometry(14.0, cornerH, 6);
      cGeo.translate(c.x, cornerH / 2, c.z);
      rockGeos.push(cGeo);

      const snowGeo = new THREE.ConeGeometry(5.0, 5.0, 6);
      snowGeo.translate(c.x, cornerH - 2.5, c.z);
      snowGeos.push(snowGeo);
    });

    // 2b. Panoramic Mid-Range Mountain Ridges (Ring 2: radius 75m - 95m, heights 28m - 38m)
    const midPeakCount = 16;
    for (let m = 0; m < midPeakCount; m++) {
      const angle = (m / midPeakCount) * Math.PI * 2 + 0.18;
      const radius = 78.0 + (m % 3) * 6.5;
      const mx = Math.cos(angle) * radius;
      const mz = Math.sin(angle) * radius;
      const mh = 28.0 + (m % 4) * 3.5;
      const mBase = 18.0 + (m % 2) * 4.0;

      const peakGeo = new THREE.ConeGeometry(mBase, mh, 6);
      peakGeo.translate(mx, mh / 2, mz);
      rockGeos.push(peakGeo);

      if (mh > 29.0) {
        const snowH = mh * 0.28;
        const snowGeo = new THREE.ConeGeometry(mBase * 0.32, snowH, 6);
        snowGeo.translate(mx, mh - snowH / 2, mz);
        snowGeos.push(snowGeo);
      }
    }

    // 2c. Epic Distant Alpine Horizon Spire Massifs (Ring 3: radius 130m - 175m, heights 50m - 72m)
    const farPeakCount = 20;
    for (let f = 0; f < farPeakCount; f++) {
      const angle = (f / farPeakCount) * Math.PI * 2 + 0.12;
      const radius = 135.0 + (f % 5) * 8.5;
      const fx = Math.cos(angle) * radius;
      const fz = Math.sin(angle) * radius;
      const fh = 50.0 + (f % 6) * 4.5;
      const fBase = 28.0 + (f % 3) * 5.5;

      const farGeo = new THREE.ConeGeometry(fBase, fh, 6);
      farGeo.translate(fx, fh / 2, fz);
      rockGeos.push(farGeo);

      // Alpine Glacial Crests
      const snowH = fh * 0.36;
      const snowGeo = new THREE.ConeGeometry(fBase * 0.38, snowH, 6);
      snowGeo.translate(fx, fh - snowH / 2, fz);
      snowGeos.push(snowGeo);
    }

    // 3. Merge geometries into 3 batched draw calls
    const mergedRock = BufferGeometryUtils.mergeGeometries(rockGeos);
    const mergedGrass = BufferGeometryUtils.mergeGeometries(grassGeos);
    const mergedSnow = BufferGeometryUtils.mergeGeometries(snowGeos);

    // Dispose unmerged source geometries
    rockGeos.forEach(g => g.dispose());
    grassGeos.forEach(g => g.dispose());
    snowGeos.forEach(g => g.dispose());

    const rockMesh = new THREE.Mesh(mergedRock, this.mountainRockMat);
    rockMesh.castShadow = true;
    rockMesh.receiveShadow = true;
    this.scene.add(rockMesh);

    const grassMesh = new THREE.Mesh(mergedGrass, this.grassMat);
    grassMesh.castShadow = true;
    grassMesh.receiveShadow = true;
    this.scene.add(grassMesh);

    const snowMesh = new THREE.Mesh(mergedSnow, this.mountainSnowMat);
    snowMesh.castShadow = true;
    snowMesh.receiveShadow = true;
    this.scene.add(snowMesh);

    this.mountainMeshes = [rockMesh, grassMesh, snowMesh];
  }

  // ─── 3. Winding Crystal Stream (River, Canyon, Pebbles & Docks) ────────────

  _buildRiver() {
    const group = new THREE.Group();

    // S-curve river segments along valley floor
    const segments = [
      { x: -28, z: -32, w: 7, d: 24, rot: 0.4 },
      { x: -16, z: -10, w: 8, d: 26, rot: 0.1 },
      { x: 0, z: 8, w: 9, d: 22, rot: -0.5 },
      { x: 18, z: -2, w: 8, d: 24, rot: 0.3 },
      { x: 32, z: 20, w: 10, d: 28, rot: 0.6 },
    ];

    this.waterGeometries = [];

    // 1. Water Surface Planes (Subdivided for Wave Animation)
    segments.forEach(s => {
      const geo = new THREE.PlaneGeometry(s.w, s.d, 12, 24);
      const mesh = new THREE.Mesh(geo, this.waterMat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.rotation.z = s.rot;
      mesh.position.set(s.x, 0.04, s.z);
      mesh.receiveShadow = true;
      group.add(mesh);

      this.waterGeometries.push({
        geo,
        segment: s,
        posAttr: geo.attributes.position,
        count: geo.attributes.position.count,
      });
    });

    // Invariant F8.1: waterMesh must have exactly 5 children at elevation y=0.04m
    this.waterMesh = group;
    this.scene.add(group);

    // 2. Continuous Sunken Riverbed Trough & Embankments
    this._buildSunkenRiverbed(segments);

    // 3. Submerged Riverbed Pebbles (InstancedMesh)
    this._buildRiverPebbles(segments);

    // 4. Rustic Wooden Docks
    this._buildWoodenDocks();
  }

  _buildSunkenRiverbed(segments) {
    const bedGroup = new THREE.Group();

    segments.forEach(s => {
      const segGroup = new THREE.Group();
      segGroup.position.set(s.x, 0, s.z);
      segGroup.rotation.y = s.rot;

      // Sunken bed floor at y = -0.40m
      const bedGeo = new THREE.PlaneGeometry(s.w * 0.78, s.d, 4, 8);
      const bedMesh = new THREE.Mesh(bedGeo, this.riverBedMat);
      bedMesh.rotation.x = -Math.PI / 2;
      bedMesh.position.y = -0.40;
      bedMesh.receiveShadow = true;
      segGroup.add(bedMesh);

      // Sloping banks: left and right embankments rising from -0.40m to +0.02m
      const bankW = s.w * 0.18;
      const bankGeo = new THREE.BoxGeometry(bankW, 0.42, s.d);

      const leftBank = new THREE.Mesh(bankGeo, this.riverBedMat);
      leftBank.position.set(-s.w * 0.42, -0.19, 0);
      leftBank.rotation.z = 0.35;
      leftBank.receiveShadow = true;
      segGroup.add(leftBank);

      const rightBank = new THREE.Mesh(bankGeo, this.riverBedMat);
      rightBank.position.set(s.w * 0.42, -0.19, 0);
      rightBank.rotation.z = -0.35;
      rightBank.receiveShadow = true;
      segGroup.add(rightBank);

      bedGroup.add(segGroup);
    });

    this.riverBedMesh = bedGroup;
    this.scene.add(bedGroup);
  }

  _buildRiverPebbles(segments) {
    const totalPebbles = 70;
    const pebbleGeo = new THREE.DodecahedronGeometry(0.24, 1);
    const instancedPebbles = new THREE.InstancedMesh(pebbleGeo, this.pebbleMat, totalPebbles);
    instancedPebbles.receiveShadow = true;

    // Deterministic Mulberry32 PRNG for reproducible, bounded pebble placement
    let seed = 42;
    const prng = () => {
      seed = (seed + 0x6D2B79F5) >>> 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    const dummy = new THREE.Object3D();
    const colors = [
      new THREE.Color(0x626c70), // Slate grey
      new THREE.Color(0x4d5d47), // Mossy green
      new THREE.Color(0x564f43), // Silt brown
      new THREE.Color(0x3b4144), // Basalt dark
      new THREE.Color(0x7a705a), // Quartz amber
    ];

    let pIndex = 0;
    segments.forEach((s, sIdx) => {
      const countForSeg = Math.floor(totalPebbles / segments.length) + (sIdx === 0 ? totalPebbles % segments.length : 0);
      const cosR = Math.cos(s.rot);
      const sinR = Math.sin(s.rot);

      for (let i = 0; i < countForSeg; i++) {
        const localX = (prng() - 0.5) * (s.w * 0.72);
        const localZ = (prng() - 0.5) * (s.d * 0.85);

        // Compute world coordinates with strict boundary clamping to prevent outer wall penetration
        const rawWx = s.x + (localX * cosR - localZ * sinR);
        const rawWz = s.z + (localX * sinR + localZ * cosR);
        const wx = THREE.MathUtils.clamp(rawWx, -40.5, 40.5);
        const wz = THREE.MathUtils.clamp(rawWz, -40.5, 40.5);
        const wy = -0.38 + prng() * 0.05;

        dummy.position.set(wx, wy, wz);
        dummy.rotation.set(
          prng() * Math.PI,
          prng() * Math.PI,
          prng() * Math.PI
        );
        const sX = 0.6 + prng() * 0.7;
        const sY = 0.3 + prng() * 0.35;
        const sZ = 0.6 + prng() * 0.7;
        dummy.scale.set(sX, sY, sZ);
        dummy.updateMatrix();

        instancedPebbles.setMatrixAt(pIndex, dummy.matrix);
        instancedPebbles.setColorAt(pIndex, colors[Math.floor(prng() * colors.length)]);
        pIndex++;
      }
    });

    instancedPebbles.instanceMatrix.needsUpdate = true;
    if (instancedPebbles.instanceColor) instancedPebbles.instanceColor.needsUpdate = true;

    this.riverPebblesMesh = instancedPebbles;
    this.scene.add(instancedPebbles);
  }

  _buildWoodenDocks() {
    const dockConfigs = [
      // Dock 1: Central Valley crossing near Whispering Village (satisfies F8.6)
      { x: -2.2, y: 0.12, z: 3.5, rotY: 0.35, w: 3.2, d: 1.8 },
      // Dock 2: Southern canyon approach
      { x: 14.5, y: 0.12, z: -2.5, rotY: -0.6, w: 3.0, d: 1.8 },
    ];

    dockConfigs.forEach((cfg, idx) => {
      const dockGroup = new THREE.Group();
      dockGroup.position.set(cfg.x, cfg.y, cfg.z);
      dockGroup.rotation.y = cfg.rotY;

      // 1. Walkway Planks
      const numPlanks = 8;
      const plankW = cfg.w / numPlanks;
      for (let p = 0; p < numPlanks; p++) {
        const plank = new THREE.Mesh(
          new THREE.BoxGeometry(plankW * 0.90, 0.07, cfg.d),
          this.woodMat
        );
        const jitterY = (Math.random() - 0.5) * 0.01;
        const jitterZ = (Math.random() - 0.5) * 0.02;
        plank.position.set(-cfg.w / 2 + p * plankW + plankW / 2, jitterY, jitterZ);
        plank.castShadow = true;
        plank.receiveShadow = true;
        dockGroup.add(plank);
      }

      // 2. Submerged Support Pilings (Stilts extending to sunken bed)
      const pilingGeo = new THREE.CylinderGeometry(0.08, 0.09, 0.85, 6);
      const pilingOffsets = [
        { x: -cfg.w * 0.38, z: -cfg.d * 0.38 },
        { x: -cfg.w * 0.38, z: cfg.d * 0.38 },
        { x: cfg.w * 0.38, z: -cfg.d * 0.38 },
        { x: cfg.w * 0.38, z: cfg.d * 0.38 },
      ];

      pilingOffsets.forEach(po => {
        const piling = new THREE.Mesh(pilingGeo, this.woodMat);
        piling.position.set(po.x, -0.32, po.z);
        piling.castShadow = true;
        dockGroup.add(piling);

        // Mooring Bollard Posts (rise above deck on outer river end)
        if (po.x > 0) {
          const bollard = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.42, 6), this.woodMat);
          bollard.position.set(po.x, 0.22, po.z);
          bollard.castShadow = true;
          dockGroup.add(bollard);

          // Rope coil around bollard
          const rope = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.028, 6, 12), this.ropeMat);
          rope.rotation.x = Math.PI / 2;
          rope.position.set(po.x, 0.16, po.z);
          dockGroup.add(rope);
        }
      });

      this.scene.add(dockGroup);
      this.docks.push({ group: dockGroup, baseY: cfg.y, index: idx });
    });
  }

  // ─── 4. Suspension Wooden Bridge Across Canyon ─────────────────────────────

  _buildSuspensionBridge() {
    const b = this.bridge;
    const group = new THREE.Group();
    group.position.set(b.x, b.height, b.z);

    // Main walkway planks
    const numPlanks = 14;
    const plankW = b.w / numPlanks;
    for (let i = 0; i < numPlanks; i++) {
      const plank = new THREE.Mesh(
        new THREE.BoxGeometry(plankW * 0.9, 0.18, b.d),
        this.woodMat
      );
      // Slight gentle sag in center of suspension bridge
      const sag = Math.sin((i / (numPlanks - 1)) * Math.PI) * -0.22;
      plank.position.set(-b.w / 2 + i * plankW + plankW / 2, sag, 0);
      plank.castShadow = true;
      plank.receiveShadow = true;
      group.add(plank);
    }

    // Railing posts & ropes (reusing this.ropeMat)
    for (let side of [-b.d / 2 + 0.1, b.d / 2 - 0.1]) {
      // 4 upright posts
      for (let p = 0; p < 4; p++) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.2, 6), this.woodMat);
        post.position.set(-b.w / 2 + (p / 3) * b.w, 0.5, side);
        group.add(post);
      }
      // Top handrail rope
      const rope = new THREE.Mesh(new THREE.BoxGeometry(b.w, 0.08, 0.08), this.ropeMat);
      rope.position.set(0, 1.05, side);
      group.add(rope);
    }

    this.scene.add(group);
  }

  // ─── 5. Bouncy Spring Mushrooms ───────────────────────────────────────────

  _buildBouncyMushrooms() {
    // 4 Spring Launchers in Strategic Spots:
    const spots = [
      // 1. Valley base under North Cliff (shoots to Tier 1)
      { x: -26, z: 8, targetH: 4.5, power: 20 },

      // 2. On Plateau North (shoots all the way to Tier 2 Peak!)
      { x: 6, z: 27, targetH: 8.5, power: 22 },

      // 3. Valley base near Southwest Cliff
      { x: -5, z: -15, targetH: 4.5, power: 19 },

      // 4. Valley base near Southeast Cliff
      { x: 8, z: -8, targetH: 4.5, power: 19 },
    ];

    const stemMat = new THREE.MeshStandardMaterial({ color: 0xfff3e0, roughness: 0.7 });
    const capMat = new THREE.MeshStandardMaterial({
      color: 0xff3b30, // Bright cartoon red
      roughness: 0.35,
      metalness: 0.1,
      emissive: 0xaa0000,
      emissiveIntensity: 0.25,
    });
    const spotMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    spots.forEach(s => {
      const y = this.getGroundHeight(s.x, s.z);
      const group = new THREE.Group();
      group.position.set(s.x, y, s.z);

      // Thick white stem
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 1.1, 8), stemMat);
      stem.position.y = 0.55;
      stem.castShadow = true;
      group.add(stem);

      // Bouncy Red Cap
      const cap = new THREE.Mesh(new THREE.SphereGeometry(1.2, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), capMat);
      cap.position.y = 1.05;
      cap.castShadow = true;
      group.add(cap);

      // White polka dots
      for (let i = 0; i < 5; i++) {
        const dot = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18, 0), spotMat);
        const ang = (i / 5) * Math.PI * 2;
        dot.position.set(Math.cos(ang) * 0.75, 1.45, Math.sin(ang) * 0.75);
        group.add(dot);
      }

      this.scene.add(group);
      this.bouncyMushrooms.push({
        x: s.x,
        y: y + 1.2,
        z: s.z,
        power: s.power,
        group,
        baseScaleY: 1.0,
      });
    });
  }

  // Check if player stepped on a bouncy mushroom
  checkMushroomBounce(playerPos) {
    for (const m of this.bouncyMushrooms) {
      const dist = Math.hypot(playerPos.x - m.x, playerPos.z - m.z);
      if (dist < 1.35 && Math.abs(playerPos.y - m.y) < 1.2) {
        // Trigger squish animation
        m.group.scale.set(1.4, 0.45, 1.4);
        setTimeout(() => m.group.scale.set(1, 1, 1), 250);
        return m.power;
      }
    }
    return 0;
  }

  // ─── 6. Decorate World with 5 Biome Landmarks & KayKit Props ────────────

  _decorateWorld() {
    // 1. Build Distinct Scenic Landmarks & Biomes (Milestone 3)
    this._buildVillageCrossroads();
    this._buildMushroomGroveLandmarks();
    this._buildSunkenRuins();
    this._buildWindyPeakTowerAndCampfire();
    this._buildWoodsmanCamp();
    this._buildFlowerPatches();

    // 2. Build 4 Extended Biome Zones & Connecting Road Network
    this._buildStartingVillageZone();
    this._buildDragonPeakZone();
    this._buildCursedForestZone();
    this._buildDarkSwampZone();
    this._buildRoadNetwork();

    // 3. Quần Đảo Bay (Sky Islands) & Vùng Đất Ngoại Vi Mở Rộng
    this._buildSkyIslands();
    this._buildOutlandExpansionZones();
    this._buildUpdraftVents();
    this._buildAerialWindRings();

    // 4. Spawn Trees, Rocks & Foliage with Clearance Checks
    const treeTypes = [
      'Tree_1_A', 'Tree_2_A', 'Tree_3_A', 'Tree_4_A',
      'Tree_1_B_Color1', 'Tree_2_B_Color1', 'Tree_2_C_Color1', 'Tree_3_B_Color1', 'Tree_4_B_Color1',
      'Tree_Bare_1_A', 'Tree_Bare_2_A_Color1'
    ];
    for (let i = 0; i < 150; i++) {
      const x = (Math.random() - 0.5) * (this.mapSize - 14);
      const z = (Math.random() - 0.5) * (this.mapSize - 14);
      if (this._isNearRamp(x, z, 3.5) || this._isNearBridge(x, z, 4.0) || this._isNearLandmark(x, z, 4.0)) continue;

      const y = this.getGroundHeight(x, z);
      const treeName = treeTypes[Math.floor(Math.random() * treeTypes.length)];
      this._spawnProp(treeName, x, y, z, 0.85 + Math.random() * 0.6);
    }

    const rockTypes = [
      'Rock_1_A', 'Rock_2_A', 'Rock_3_A',
      'Rock_1_B_Color1', 'Rock_2_C_Color1', 'Rock_3_B_Color1', 'Rock_3_E_Color1'
    ];
    for (let i = 0; i < 85; i++) {
      const x = (Math.random() - 0.5) * (this.mapSize - 10);
      const z = (Math.random() - 0.5) * (this.mapSize - 10);
      if (this._isNearRamp(x, z, 3.0) || this._isNearLandmark(x, z, 3.0)) continue;

      const y = this.getGroundHeight(x, z);
      const rockName = rockTypes[Math.floor(Math.random() * rockTypes.length)];
      this._spawnProp(rockName, x, y, z, 0.7 + Math.random() * 0.7);
    }

    const bushTypes = ['Bush_1_A', 'Bush_2_A', 'Bush_3_A_Color1', 'Bush_4_A_Color1'];
    for (let i = 0; i < 90; i++) {
      const x = (Math.random() - 0.5) * (this.mapSize - 10);
      const z = (Math.random() - 0.5) * (this.mapSize - 10);
      if (this._isNearRamp(x, z, 2.5) || this._isNearLandmark(x, z, 2.5)) continue;

      const y = this.getGroundHeight(x, z);
      const bushName = bushTypes[Math.floor(Math.random() * bushTypes.length)];
      this._spawnProp(bushName, x, y, z, 0.6 + Math.random() * 0.5);
    }

    // 4. Dense 3D Wild Grass Tufts & Riverbank Flora
    const grassTypes = ['Grass_1_A_Color1', 'Grass_2_A_Color1'];
    for (let i = 0; i < 120; i++) {
      const x = (Math.random() - 0.5) * (this.mapSize - 12);
      const z = (Math.random() - 0.5) * (this.mapSize - 12);
      if (this._isNearRamp(x, z, 2.0) || this._isNearBridge(x, z, 2.5)) continue;

      const y = this.getGroundHeight(x, z);
      const grassName = grassTypes[Math.floor(Math.random() * grassTypes.length)];
      this._spawnProp(grassName, x, y, z, 0.75 + Math.random() * 0.5);
    }
  }

  _isNearLandmark(x, z, buffer = 2.0) {
    const landmarks = [
      { x: -4.0, z: -4.0, r: 4.5 },   // Village center
      { x: 20.0, z: -18.0, r: 6.0 },  // Sunken Ruins
      { x: 18.0, z: 22.0, r: 7.0 },   // Windy Peak Tower & Campfire
      { x: -18.0, z: -16.0, r: 5.5 }, // Mushroom Grove & Woodsman Camp
      { x: 0.0, z: 0.0, r: 2.5 },     // Spawn point
      { x: -62.0, z: 0.0, r: 18.0 },  // Starting Village
      { x: 65.0, z: 50.0, r: 16.0 },  // Dragon Peak & Castle
      { x: 0.0, z: 62.0, r: 18.0 },   // Cursed Forest
      { x: 0.0, z: -62.0, r: 18.0 },  // Dark Swamp
    ];
    return landmarks.some(lm => Math.hypot(x - lm.x, z - lm.z) < lm.r + buffer);
  }

  // ─── Extended Biome Zones & Road Network ─────────────────────────────────

  _buildStartingVillageZone() {
    const group = new THREE.Group();

    // Central Market
    if (this.models['market']) {
      const market = this.models['market'].clone();
      market.position.set(-62, 0, 0);
      market.scale.setScalar(2.2);
      market.rotation.y = 0.4;
      group.add(market);
    }

    // Three Medieval Village Houses
    if (this.models['house']) {
      const h1 = this.models['house'].clone();
      h1.position.set(-54, 0, 10);
      h1.scale.setScalar(2.2);
      h1.rotation.y = -0.5;
      group.add(h1);

      const h2 = this.models['house'].clone();
      h2.position.set(-68, 0, 12);
      h2.scale.setScalar(2.4);
      h2.rotation.y = 0.8;
      group.add(h2);

      const h3 = this.models['house'].clone();
      h3.position.set(-58, 0, -14);
      h3.scale.setScalar(2.0);
      h3.rotation.y = 1.6;
      group.add(h3);
    }

    // Village Well
    if (this.models['well']) {
      const well = this.models['well'].clone();
      well.position.set(-62, 0, -6);
      well.scale.setScalar(2.0);
      group.add(well);
    }

    // Barracks & Archery Range
    if (this.models['barracks']) {
      const b = this.models['barracks'].clone();
      b.position.set(-72, 0, -12);
      b.scale.setScalar(2.2);
      b.rotation.y = 0.3;
      group.add(b);
    }

    if (this.models['archeryrange']) {
      const ar = this.models['archeryrange'].clone();
      ar.position.set(-70, 0, 4);
      ar.scale.setScalar(2.0);
      ar.rotation.y = -0.4;
      group.add(ar);
    }

    // Farm Plot with crops
    if (this.models['farm_plot']) {
      const farm = this.models['farm_plot'].clone();
      farm.position.set(-54, 0, -18);
      farm.scale.setScalar(2.2);
      group.add(farm);
    }

    this.scene.add(group);
  }

  _buildDragonPeakZone() {
    const group = new THREE.Group();

    // 1. Towering Elevated Mountain Citadel Foundation (Plateau y=12m)
    const baseRockGeo = new THREE.BoxGeometry(42, 9, 42);
    const baseRock = new THREE.Mesh(baseRockGeo, this.cliffMat);
    baseRock.position.set(65, 4.5, 50);
    baseRock.castShadow = true;
    baseRock.receiveShadow = true;
    group.add(baseRock);

    const midRockGeo = new THREE.BoxGeometry(36, 3.5, 36);
    const midRock = new THREE.Mesh(midRockGeo, this.cliffDarkMat);
    midRock.position.set(65, 10.75, 50);
    midRock.castShadow = true;
    midRock.receiveShadow = true;
    group.add(midRock);

    const turfGeo = new THREE.BoxGeometry(38, 0.5, 38);
    const turf = new THREE.Mesh(turfGeo, this.grassMat);
    turf.position.set(65, 12.75, 50);
    turf.receiveShadow = true;
    group.add(turf);

    // 2. Majestic Mountain Castle perched high on the citadel (y = 13.0m)
    if (this.models['castle']) {
      const castle = this.models['castle'].clone();
      castle.position.set(65, 13.0, 50);
      castle.scale.setScalar(3.2);
      castle.rotation.y = -0.7;
      group.add(castle);
    }

    // Castle Walls & Gate
    if (this.models['wall_gate']) {
      const gate = this.models['wall_gate'].clone();
      gate.position.set(55, 13.0, 42);
      gate.scale.setScalar(2.4);
      gate.rotation.y = 0.9;
      group.add(gate);
    }

    if (this.models['wall_straight']) {
      const w1 = this.models['wall_straight'].clone();
      w1.position.set(62, 13.0, 36);
      w1.scale.setScalar(2.4);
      w1.rotation.y = 0.9;
      group.add(w1);
    }

    if (this.models['watchtower']) {
      const wt = this.models['watchtower'].clone();
      wt.position.set(74, 13.0, 40);
      wt.scale.setScalar(2.4);
      group.add(wt);
    }

    // Dragon perched dramatically on the highest castle battlement (y = 22.0m)
    if (this.models['dragon']) {
      const dragon = this.models['dragon'].clone();
      dragon.position.set(65, 22.0, 50);
      dragon.scale.setScalar(3.2);
      dragon.rotation.y = Math.PI * 0.75;
      group.add(dragon);
    }

    // 3. Four Flaming Dragon Braziers illuminating the mountain citadel
    const brazierPositions = [
      { x: 48, z: 34 },
      { x: 80, z: 34 },
      { x: 48, z: 66 },
      { x: 80, z: 66 },
    ];
    brazierPositions.forEach(bp => {
      const bMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.35, 1.2, 6), this.campfireRockMat);
      bMesh.position.set(bp.x, 13.6, bp.z);
      group.add(bMesh);

      const fireMesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.35), this.emberMat);
      fireMesh.position.set(bp.x, 14.3, bp.z);
      group.add(fireMesh);
    });

    this.scene.add(group);
  }

  _buildCursedForestZone() {
    const group = new THREE.Group();

    // 1. Towering Ancient Purple Runic Monolith & Sky Beacon (Visible from afar)
    const dais = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 5.5, 1.6, 6), this.cliffDarkMat);
    dais.position.set(0, 0.8, 62);
    dais.receiveShadow = true;
    group.add(dais);

    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0x9333ea,
      emissive: 0x7c3aed,
      emissiveIntensity: 0.9,
      roughness: 0.2,
      metalness: 0.8,
    });

    const spireGeo = new THREE.ConeGeometry(2.4, 18.0, 4);
    const spire = new THREE.Mesh(spireGeo, crystalMat);
    spire.position.set(0, 10.6, 62);
    spire.rotation.y = Math.PI / 4;
    spire.castShadow = true;
    group.add(spire);

    // Ethereal vertical sky beam piercing the clouds (y=15m to 55m)
    const beamGeo = new THREE.CylinderGeometry(0.8, 1.8, 40, 8, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xc084fc,
      transparent: true,
      opacity: 0.32,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.set(0, 22.0, 62);
    group.add(beam);
    this.cursedForestBeam = beam;

    // Glowing purple magic circle platform at the base of the spire
    const circleDisc = new THREE.Mesh(
      new THREE.CircleGeometry(3.8, 16),
      new THREE.MeshBasicMaterial({
        color: 0xc084fc,
        transparent: true,
        opacity: 0.65,
        side: THREE.DoubleSide,
      })
    );
    circleDisc.rotation.x = -Math.PI / 2;
    circleDisc.position.set(0, 0.18, 62);
    group.add(circleDisc);

    // Glowing purple energy ring around base
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(3.8, 0.22, 8, 24),
      new THREE.MeshStandardMaterial({
        color: 0xa855f7,
        emissive: 0x9333ea,
        emissiveIntensity: 0.9,
      })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, 0.22, 62);
    group.add(ring);

    // Floating spectral ghosts
    const ghostPositions = [
      { x: -15, z: 58, s: 1.6 },
      { x: 12, z: 65, s: 1.8 },
      { x: -5, z: 72, s: 2.2 },
      { x: 22, z: 56, s: 1.5 },
      { x: -25, z: 66, s: 1.7 },
    ];

    if (this.models['ghost']) {
      ghostPositions.forEach(gp => {
        const ghost = this.models['ghost'].clone();
        ghost.position.set(gp.x, 2.2, gp.z);
        ghost.scale.setScalar(gp.s);
        group.add(ghost);
      });
    }

    // Alpaking Patrol in deep woods
    if (this.models['alpaking']) {
      const alp = this.models['alpaking'].clone();
      alp.position.set(0, 0, 62);
      alp.scale.setScalar(2.0);
      alp.rotation.y = Math.PI;
      group.add(alp);
    }

    // Orbiting curse crystals around the obelisk
    const smallCrystalGeo = new THREE.OctahedronGeometry(0.65, 0);
    for (let i = 0; i < 6; i++) {
      const cr = new THREE.Mesh(smallCrystalGeo, crystalMat);
      const angle = (i / 6) * Math.PI * 2;
      cr.position.set(Math.cos(angle) * 7.0, 2.5 + (i % 2) * 1.5, 62 + Math.sin(angle) * 7.0);
      group.add(cr);
    }

    this.scene.add(group);
  }

  _buildDarkSwampZone() {
    const group = new THREE.Group();

    // 1. Ominous Cursed Demon Obelisks (Visible from across the valley)
    const swampPillarMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.9,
      metalness: 0.2,
      flatShading: true,
    });
    for (let i = 0; i < 4; i++) {
      const ang = (i / 4) * Math.PI * 2 + 0.35;
      const px = Math.cos(ang) * 9.0;
      const pz = -62 + Math.sin(ang) * 9.0;
      const pGeo = new THREE.ConeGeometry(1.6, 14.0, 5);
      const pillar = new THREE.Mesh(pGeo, swampPillarMat);
      pillar.position.set(px, 7.0, pz);
      pillar.castShadow = true;
      group.add(pillar);

      // Will-o'-the-wisp green flame on each pillar
      const wispMat = new THREE.MeshStandardMaterial({
        color: 0x10b981,
        emissive: 0x059669,
        emissiveIntensity: 1.2,
      });
      const wisp = new THREE.Mesh(new THREE.DodecahedronGeometry(0.4), wispMat);
      wisp.position.set(px, 14.2, pz);
      group.add(wisp);
    }

    // Watermill and Mine entrance
    if (this.models['watermill']) {
      const wm = this.models['watermill'].clone();
      wm.position.set(-15, 0, -60);
      wm.scale.setScalar(2.2);
      wm.rotation.y = 0.5;
      group.add(wm);
    }

    if (this.models['mine']) {
      const mine = this.models['mine'].clone();
      mine.position.set(22, 0, -65);
      mine.scale.setScalar(2.4);
      mine.rotation.y = -0.6;
      group.add(mine);
    }

    // Swamp Monsters: Demon, Yeti, Orc
    if (this.models['demon']) {
      const demon = this.models['demon'].clone();
      demon.position.set(0, 0, -68);
      demon.scale.setScalar(2.5);
      demon.rotation.y = 0;
      group.add(demon);
    }

    if (this.models['yeti']) {
      const yeti = this.models['yeti'].clone();
      yeti.position.set(-25, 0, -65);
      yeti.scale.setScalar(2.2);
      yeti.rotation.y = 0.8;
      group.add(yeti);
    }

    if (this.models['orc']) {
      const orc = this.models['orc'].clone();
      orc.position.set(15, 0, -56);
      orc.scale.setScalar(2.0);
      orc.rotation.y = -0.5;
      group.add(orc);
    }

    this.scene.add(group);
  }

  _buildRoadNetwork() {
    const group = new THREE.Group();

    // 1. Cobblestone Trail Waypoints to 4 Extended Biomes
    const roadWaypoints = [];
    // West branch -> Starting Village (-62, 0)
    for (let x = -58; x <= -6; x += 3.2) {
      roadWaypoints.push({ x, z: Math.sin(x * 0.15) * 1.2 });
    }
    // East branch -> Dragon Peak Approach (52, 38)
    for (let x = 4; x <= 50; x += 3.2) {
      roadWaypoints.push({ x, z: (x * 0.76) + Math.cos(x * 0.2) * 1.1 });
    }
    // North branch -> Cursed Forest (0, 58)
    for (let z = 8; z <= 56; z += 3.2) {
      roadWaypoints.push({ x: Math.sin(z * 0.18) * 1.8, z });
    }
    // South branch -> Dark Swamp (0, -58)
    for (let z = -8; z >= -56; z -= 3.2) {
      roadWaypoints.push({ x: Math.cos(z * 0.18) * 1.8, z });
    }

    // 2. Smooth Flagstone Pavers (Flat cylinders embedded at ground level y = 0.025m)
    const stoneGeos = [
      new THREE.CylinderGeometry(0.42, 0.48, 0.035, 7),
      new THREE.CylinderGeometry(0.35, 0.40, 0.035, 6),
      new THREE.CylinderGeometry(0.50, 0.56, 0.035, 8),
    ];

    roadWaypoints.forEach((wp, idx) => {
      if (Math.abs(wp.x) < 2.5 && Math.abs(wp.z) < 2.5) return; // Keep spawn clean

      // Center stepping stone
      const gIdx = idx % stoneGeos.length;
      const s1 = new THREE.Mesh(stoneGeos[gIdx], this.cobbleMat);
      s1.position.set(wp.x, 0.025, wp.z);
      s1.rotation.y = idx * 0.8;
      s1.receiveShadow = true;
      group.add(s1);

      // Flanking stepping stone for wider, natural path
      const s2 = new THREE.Mesh(stoneGeos[(gIdx + 1) % stoneGeos.length], this.cobbleMat);
      const sideOffset = ((idx % 2 === 0) ? 0.45 : -0.45);
      s2.position.set(wp.x + sideOffset, 0.022, wp.z + sideOffset * 0.5);
      s2.rotation.y = idx * 1.3;
      s2.scale.set(0.85, 1.0, 0.85);
      s2.receiveShadow = true;
      group.add(s2);
    });

    // 3. Wooden Wayfinder Lantern Posts along the trails (Every ~14m)
    const lanternSpots = [
      // West path
      { x: -16, z: 0.8 }, { x: -32, z: 0.8 }, { x: -46, z: 0.8 },
      // East path
      { x: 16, z: 13.5 }, { x: 30, z: 24.5 }, { x: 44, z: 35.5 },
      // North path
      { x: 1.8, z: 18 }, { x: 1.8, z: 34 }, { x: 1.8, z: 48 },
      // South path
      { x: -1.8, z: -18 }, { x: -1.8, z: -34 }, { x: -1.8, z: -48 },
    ];

    lanternSpots.forEach(lp => {
      const postMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.9, 6), this.lanternPostMat);
      postMesh.position.set(lp.x, 0.95, lp.z);
      postMesh.castShadow = true;
      group.add(postMesh);

      const crossArm = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.07, 0.07), this.lanternPostMat);
      crossArm.position.set(lp.x + 0.14, 1.85, lp.z);
      group.add(crossArm);

      const lanternGlass = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.28, 0.22), this.lanternGlassMat);
      lanternGlass.position.set(lp.x + 0.24, 1.7, lp.z);
      group.add(lanternGlass);
    });

    // 4. Grand Crossroads Wayfinder Signpost at Spawn (1.2, 0, 1.2)
    const signGroup = new THREE.Group();
    signGroup.position.set(1.2, 0, 1.2);

    // Carved rustic wooden post
    const signPost = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 2.7, 8), this.woodMat);
    signPost.position.y = 1.35;
    signPost.castShadow = true;
    signGroup.add(signPost);

    // 4 Directional Wooden Pointer Boards
    const signBoards = [
      { y: 2.35, rot: 0, text: 'W: Oakvale Village (60m)', w: 1.5, col: 0x854d0e },
      { y: 2.05, rot: Math.PI * 0.35, text: 'E: Dragon Fortress (70m)', w: 1.5, col: 0xb91c1c },
      { y: 1.75, rot: Math.PI * 0.5, text: 'N: Cursed Forest (60m)', w: 1.4, col: 0x7e22ce },
      { y: 1.45, rot: -Math.PI * 0.5, text: 'S: Murky Swamp (60m)', w: 1.4, col: 0x0f766e },
    ];

    signBoards.forEach(sb => {
      const board = new THREE.Mesh(
        new THREE.BoxGeometry(sb.w, 0.24, 0.06),
        new THREE.MeshStandardMaterial({ color: sb.col, roughness: 0.85 })
      );
      board.position.set(0, sb.y, 0);
      board.rotation.y = sb.rot;
      board.castShadow = true;
      signGroup.add(board);
    });

    // Hanging brass lantern at the apex
    const apexLantern = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.32, 0.24), this.lanternGlassMat);
    apexLantern.position.set(0, 2.65, 0);
    signGroup.add(apexLantern);

    group.add(signGroup);
    this.scene.add(group);
  }

  // ─── Quần Đảo Bay (Celestial Sky Islands of Eldoria) ───────────────────────
  _buildSkyIslands() {
    this.skyIslands = [
      // 1. Celestial Sky Temple (Thiên Cung Eldoria) — Floating directly above crossroads at y = 16.0m
      { id: 'sky_temple', name: 'Thiên Cung Eldoria', x: 0, z: 0, w: 16, d: 16, height: 16.0, radius: 7.5 },

      // 2. Falcon Crest Roost (Đảo Cánh Ưng) — Floating Northwest overlooking Oakvale & Grove at y = 14.5m
      { id: 'sky_falcon', name: 'Đảo Cánh Ưng', x: -38, z: 28, w: 14, d: 14, height: 14.5, radius: 6.5 },

      // 3. Dragon Blood Aerie (Đảo Huyết Long) — Floating East high above Dragon Peak at y = 18.0m
      { id: 'sky_dragon', name: 'Đảo Huyết Long', x: 40, z: -20, w: 14, d: 14, height: 18.0, radius: 7.0 },
    ];

    const group = new THREE.Group();

    // Shared crystal materials
    const skyRuneMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.85,
      roughness: 0.2,
      metalness: 0.4,
    });

    const fireRuneMat = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      emissive: 0xe11d48,
      emissiveIntensity: 0.9,
      roughness: 0.2,
      metalness: 0.4,
    });

    this.skyIslands.forEach(island => {
      const islandGroup = new THREE.Group();
      islandGroup.position.set(island.x, island.height, island.z);

      // 1. Top Plateau Surface (Octagonal cylinder slab)
      const topGeo = new THREE.CylinderGeometry(island.radius, island.radius * 0.92, 1.4, 8);
      const topMesh = new THREE.Mesh(topGeo, this.grassMat);
      topMesh.position.y = -0.7;
      topMesh.receiveShadow = true;
      islandGroup.add(topMesh);

      // 2. Rock rim paver ring
      const rimGeo = new THREE.CylinderGeometry(island.radius * 1.02, island.radius * 0.98, 0.4, 8);
      const rimMesh = new THREE.Mesh(rimGeo, this.stoneStepMat);
      rimMesh.position.y = -0.2;
      islandGroup.add(rimMesh);

      // 3. Inverted Hanging Mountain Underbelly (Stalactite crag pointing into clouds)
      const underGeo = new THREE.ConeGeometry(island.radius * 0.92, island.radius * 1.4, 8);
      underGeo.rotateX(Math.PI);
      const underMesh = new THREE.Mesh(underGeo, this.cliffDarkMat);
      underMesh.position.y = -1.4 - (island.radius * 0.7);
      islandGroup.add(underMesh);

      // 4. Minor floating stepping shard stones
      for (let s = 0; s < 3; s++) {
        const angle = (s / 3) * Math.PI * 2 + 0.4;
        const dist = island.radius + 2.5 + (s * 0.8);
        const shardGeo = new THREE.DodecahedronGeometry(0.85 + s * 0.2, 0);
        const shard = new THREE.Mesh(shardGeo, this.cliffLightMat);
        shard.position.set(Math.cos(angle) * dist, -0.6 - (s * 0.35), Math.sin(angle) * dist);
        islandGroup.add(shard);
      }

      // 5. Unique Landmark Props per Sky Island
      if (island.id === 'sky_temple') {
        // Celestial Altar: 4 Stone Pillars & Central Sky Archon Crystal
        for (let p = 0; p < 4; p++) {
          const ang = (p / 4) * Math.PI * 2 + Math.PI / 4;
          const px = Math.cos(ang) * 4.2;
          const pz = Math.sin(ang) * 4.2;
          const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 3.2, 8), this.stonePillarMat);
          pillar.position.set(px, 1.6, pz);
          pillar.castShadow = true;
          islandGroup.add(pillar);

          const cap = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.25, 1.2), this.rampMat);
          cap.position.set(px, 3.2, pz);
          islandGroup.add(cap);
        }

        // Central floating Sky Archon Crystal
        const crystalGeo = new THREE.OctahedronGeometry(1.2, 0);
        this.skyTempleCrystal = new THREE.Mesh(crystalGeo, skyRuneMat);
        this.skyTempleCrystal.position.set(0, 2.2, 0);
        islandGroup.add(this.skyTempleCrystal);

        // Circular stone paver dais
        const dais = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.6, 0.4, 12), this.stoneStepMat);
        dais.position.set(0, 0.2, 0);
        islandGroup.add(dais);
      } else if (island.id === 'sky_falcon') {
        // Falcon Crest Roost: Wooden watchtower perch and wind ribbon pole
        const perch = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 3.5, 6), this.woodMat);
        perch.position.set(0, 1.75, 0);
        islandGroup.add(perch);

        const banner = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.8, 0.8), skyRuneMat);
        banner.position.set(0.4, 2.4, 0);
        islandGroup.add(banner);

        // Ancient stone ring
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.4, 0), this.stoneStepMat);
          rock.position.set(Math.cos(a) * 2.2, 0.3, Math.sin(a) * 2.2);
          islandGroup.add(rock);
        }
      } else if (island.id === 'sky_dragon') {
        // Dragon Blood Isle: Obsidian spire & Flame Brazier
        const spire = new THREE.Mesh(new THREE.ConeGeometry(0.9, 4.2, 5), this.cliffDarkMat);
        spire.position.set(0, 2.1, 0);
        islandGroup.add(spire);

        const brazier = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.5, 1.0, 6), this.stonePillarMat);
        brazier.position.set(2.2, 0.5, 1.5);
        islandGroup.add(brazier);

        const flame = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5, 0), fireRuneMat);
        flame.position.set(2.2, 1.3, 1.5);
        islandGroup.add(flame);
      }

      island.group = islandGroup;
      group.add(islandGroup);
    });

    this.scene.add(group);
  }

  // ─── 4 Vùng Đất Ngoại Vi Mở Rộng (Outland Expansion Zones) ─────────────────
  _buildOutlandExpansionZones() {
    const group = new THREE.Group();

    // 1. Tây Bắc: Thung Lũng Băng Tuyết & Hải Đăng Cổ (Frostfall Sanctuary) (-48, 44)
    const frostGroup = new THREE.Group();
    frostGroup.position.set(-48, this.getGroundHeight(-48, 44), 44);

    const frostDais = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.8, 0.6, 8), this.mountainSnowMat);
    frostDais.position.y = 0.3;
    frostGroup.add(frostDais);

    // Frost Beacon Tower
    const frostTower = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.2, 5.5, 6), this.cliffDarkMat);
    frostTower.position.y = 3.0;
    frostGroup.add(frostTower);

    // Glowing Azure Crystal atop tower
    const frostCrystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.9, 0),
      new THREE.MeshStandardMaterial({
        color: 0x93c5fd,
        emissive: 0x3b82f6,
        emissiveIntensity: 0.9,
        roughness: 0.1,
      })
    );
    frostCrystal.position.y = 6.2;
    frostGroup.add(frostCrystal);
    group.add(frostGroup);

    // 2. Đông Bắc: Hẻm Núi Nham Thạch & Mỏ Quặng Cổ (Molten Crags) (48, 45)
    const moltenGroup = new THREE.Group();
    moltenGroup.position.set(48, this.getGroundHeight(48, 45), 45);

    // Basalt Pillars cluster
    for (let i = 0; i < 5; i++) {
      const ang = (i / 5) * Math.PI * 2;
      const h = 2.0 + (i % 3) * 1.2;
      const basalt = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, h, 6), this.cliffDarkMat);
      basalt.position.set(Math.cos(ang) * 2.5, h / 2, Math.sin(ang) * 2.5);
      moltenGroup.add(basalt);
    }
    // Magma Hearth
    const magmaHearth = new THREE.Mesh(
      new THREE.DodecahedronGeometry(1.2, 0),
      new THREE.MeshStandardMaterial({
        color: 0xf97316,
        emissive: 0xea580c,
        emissiveIntensity: 0.8,
        roughness: 0.3,
      })
    );
    magmaHearth.position.y = 0.8;
    moltenGroup.add(magmaHearth);
    group.add(moltenGroup);

    // 3. Tây Nam: Rừng Cổ Nấm Đại Thụ (Elder Shroomwood) (-48, -48)
    const shroomGroup = new THREE.Group();
    shroomGroup.position.set(-48, this.getGroundHeight(-48, -48), -48);

    // Giant Elder Mushroom (Stem + Giant bioluminescent Cap)
    const shroomStem = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.2, 4.5, 8), this.woodMat);
    shroomStem.position.y = 2.25;
    shroomGroup.add(shroomStem);

    const shroomCap = new THREE.Mesh(
      new THREE.SphereGeometry(3.2, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({
        color: 0x9333ea,
        emissive: 0x7e22ce,
        emissiveIntensity: 0.7,
        roughness: 0.3,
      })
    );
    shroomCap.position.y = 4.5;
    shroomGroup.add(shroomCap);
    group.add(shroomGroup);

    // 4. Đông Nam: Đền Thờ Thái Dương (Sun Temple Ruins) (48, -48)
    const sunGroup = new THREE.Group();
    sunGroup.position.set(48, this.getGroundHeight(48, -48), -48);

    const sunDais = new THREE.Mesh(new THREE.BoxGeometry(7, 0.5, 7), this.stoneStepMat);
    sunDais.position.y = 0.25;
    sunGroup.add(sunDais);

    for (let c = 0; c < 4; c++) {
      const cx = (c % 2 === 0 ? -2.6 : 2.6);
      const cz = (c < 2 ? -2.6 : 2.6);
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.45, 3.5, 8), this.stonePillarMat);
      pillar.position.set(cx, 1.75, cz);
      sunGroup.add(pillar);
    }

    const sunDisc = new THREE.Mesh(
      new THREE.CylinderGeometry(1.4, 1.4, 0.2, 16),
      new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        emissive: 0xd97706,
        emissiveIntensity: 0.6,
        metalness: 0.8,
        roughness: 0.2,
      })
    );
    sunDisc.position.set(0, 2.2, 0);
    sunDisc.rotation.x = Math.PI / 4;
    sunGroup.add(sunDisc);
    group.add(sunGroup);

    this.scene.add(group);
  }

  // ─── Cột Gió Nhiệt Thần Rừng (Updraft Thermal Vents) ───────────────────────
  _buildUpdraftVents() {
    this.updraftVents = [
      // 1. Peak Summit Vent: Launches player straight up to Celestial Temple & Dragon Isle!
      { id: 'vent_peak', x: 18, z: 22, baseY: 7.0, radius: 3.5, power: 24 },
      // 2. Valley Crossroads Vent: Near crossroads, launches high into sky
      { id: 'vent_crossroads', x: 0, z: -8, baseY: 0.0, radius: 3.5, power: 24 },
      // 3. Northwest Vista Vent: Near village ridge
      { id: 'vent_west', x: -28, z: 12, baseY: 0.0, radius: 3.5, power: 23 },
    ];

    const group = new THREE.Group();
    const ventBaseMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.7,
      metalness: 0.3,
      flatShading: true,
    });

    const ventGlowMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.42,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const ventWireMat = new THREE.MeshBasicMaterial({
      color: 0x7dd3fc,
      transparent: true,
      opacity: 0.3,
      wireframe: true,
    });

    this.updraftVents.forEach(v => {
      const vGroup = new THREE.Group();
      vGroup.position.set(v.x, v.baseY, v.z);

      // Stone ring base on ground
      const ring = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.4, 8, 20), ventBaseMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.2;
      vGroup.add(ring);

      // Inner glowing energy pool
      const pool = new THREE.Mesh(new THREE.CircleGeometry(2.0, 16), new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.75,
        side: THREE.DoubleSide,
      }));
      pool.rotation.x = -Math.PI / 2;
      pool.position.y = 0.16;
      vGroup.add(pool);

      // Outer smooth translucent wind vortex cylinder
      const vortex = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 1.2, 16, 16, 1, true), ventGlowMat);
      vortex.position.y = 8.0;
      vGroup.add(vortex);

      // Inner wireframe spiral
      const innerVortex = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.8, 16, 10, 2, true), ventWireMat);
      innerVortex.position.y = 8.0;
      vGroup.add(innerVortex);

      v.vortexMesh = vortex;
      v.innerVortex = innerVortex;
      group.add(vGroup);
    });

    this.scene.add(group);
  }

  // ─── Vòng Gió Gia Tốc Trên Không (Aerial Thermal Boost Rings) ──────────────
  _buildAerialWindRings() {
    this.windRings = [
      // Ring 1: Celestial Temple -> Falcon Isle
      { id: 'ring_1', x: -18, y: 15.2, z: 14, rotY: 0.8 },
      // Ring 2: Celestial Temple -> Dragon Blood Isle
      { id: 'ring_2', x: 20, y: 16.5, z: -10, rotY: -0.6 },
      // Ring 3: Peak Summit -> Celestial Temple
      { id: 'ring_3', x: 9, y: 12.5, z: 11, rotY: 0.3 },
      // Ring 4: Northwest Sky Corridor
      { id: 'ring_4', x: -28, y: 14.0, z: 22, rotY: 0.5 },
    ];

    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.85,
      roughness: 0.3,
      metalness: 0.2,
    });

    const group = new THREE.Group();

    this.windRings.forEach(r => {
      const ringGeo = new THREE.TorusGeometry(2.2, 0.16, 8, 20);
      const mesh = new THREE.Mesh(ringGeo, ringMat);
      mesh.position.set(r.x, r.y, r.z);
      mesh.rotation.y = r.rotY || 0;
      group.add(mesh);
      r.mesh = mesh;
    });

    this.scene.add(group);
  }

  // Check if player enters an Updraft Thermal Vent (Blue beam shooting into the sky)
  checkUpdraftVent(playerPos) {
    if (!this.updraftVents) return 0;
    for (const v of this.updraftVents) {
      const dist = Math.hypot(playerPos.x - v.x, playerPos.z - v.z);
      if (dist <= (v.radius || 3.5) && playerPos.y >= v.baseY - 0.5 && playerPos.y <= v.baseY + 14.0) {
        const now = performance.now();
        if (!v.lastTrigger || now - v.lastTrigger > 1200) {
          v.lastTrigger = now;
          if (v.vortexMesh) {
            v.vortexMesh.scale.set(1.4, 1.0, 1.4);
            setTimeout(() => { if (v.vortexMesh) v.vortexMesh.scale.set(1, 1, 1); }, 400);
          }
          return v.power || 24.0;
        }
      }
    }
    return 0;
  }

  // Check if player enters Arcane Void Spire (Purple beam in Cursed Forest at 0, 62)
  checkArcaneVoidBeam(playerPos) {
    const dist = Math.hypot(playerPos.x - 0, playerPos.z - 62);
    if (dist <= 4.2 && playerPos.y <= 12.0) {
      const now = performance.now();
      if (!this.voidBeamLastTrigger || now - this.voidBeamLastTrigger > 2000) {
        this.voidBeamLastTrigger = now;

        if (this.cursedForestBeam) {
          this.cursedForestBeam.scale.set(2.2, 1.0, 2.2);
          setTimeout(() => {
            if (this.cursedForestBeam) this.cursedForestBeam.scale.set(1.0, 1.0, 1.0);
          }, 600);
        }

        return {
          active: true,
          power: 26.0,
        };
      }
    }
    return null;
  }


  // Check if player glides through an Aerial Wind Ring
  checkWindRingBoost(playerPos) {
    if (!this.windRings) return false;
    for (const r of this.windRings) {
      const dist = Math.hypot(playerPos.x - r.x, playerPos.z - r.z);
      const yDiff = Math.abs(playerPos.y - r.y);
      if (dist < 2.6 && yDiff < 2.5) {
        const now = performance.now();
        if (!r.cooldown || now - r.cooldown > 2000) {
          r.cooldown = now;
          if (r.mesh) {
            r.mesh.scale.set(1.45, 1.45, 1.45);
            setTimeout(() => { if (r.mesh) r.mesh.scale.set(1, 1, 1); }, 300);
          }
          return true;
        }
      }
    }
    return false;
  }



  // ─── Landmark 1: Whispering Village & Crossroads ─────────────────────────
  _buildVillageCrossroads() {
    const group = new THREE.Group();

    // 1. Cobblestone Stepping Stone Pathways (connecting spawn (0,0) to Finn, river dock, and ramps)
    const pathNodes = [
      // Spawn (0,0) to Finn (-4, -4)
      [-0.8, -0.8], [-1.6, -1.6], [-2.4, -2.4], [-3.2, -3.2], [-4.0, -3.5], [-4.0, -4.5],
      // Spawn (0,0) to Dock 1 (-2.2, 3.5)
      [-0.5, 0.9], [-1.0, 1.8], [-1.5, 2.6], [-2.0, 3.2],
      // Spawn (0,0) to Ramp 1 (-12, 3)
      [-2.5, 0.6], [-5.0, 1.2], [-7.5, 1.8], [-10.0, 2.4],
      // Spawn (0,0) to Ramp 3 (-18, -3)
      [-3.5, -1.0], [-7.0, -1.5], [-11.0, -2.0], [-15.0, -2.6],
    ];

    const stoneGeo = new THREE.CylinderGeometry(0.38, 0.44, 0.04, 7);
    pathNodes.forEach(([px, pz], idx) => {
      const stone = new THREE.Mesh(stoneGeo, this.cobbleMat);
      stone.position.set(px, 0.02, pz);
      stone.rotation.y = idx * 1.37;
      stone.scale.set(0.85 + (idx % 3) * 0.15, 1.0, 0.85 + ((idx + 1) % 3) * 0.15);
      stone.receiveShadow = true;
      group.add(stone);
    });

    // 2. Wooden Directional Signpost at (0.8, 0, 0.8)
    const signpost = new THREE.Group();
    signpost.position.set(0.8, 0, 0.8);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 1.7, 6), this.woodMat);
    post.position.y = 0.85;
    post.castShadow = true;
    signpost.add(post);

    const signs = [
      { textAngle: 0.85, y: 1.45, len: 0.75 },  // To Windy Peak
      { textAngle: -1.2, y: 1.25, len: 0.70 },  // To River & Canyon
      { textAngle: 2.4, y: 1.05, len: 0.72 },   // To Ancient Ruins
    ];
    signs.forEach(s => {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(s.len, 0.15, 0.04), this.woodMat);
      arm.position.set(Math.cos(s.textAngle) * (s.len * 0.35), s.y, Math.sin(s.textAngle) * (s.len * 0.35));
      arm.rotation.y = -s.textAngle;
      arm.castShadow = true;
      signpost.add(arm);
    });
    group.add(signpost);

    // 3. Village Rustic Lantern Post at (-4.0, 0, -4.0) (satisfies F10.5)
    const vLantern = new THREE.Group();
    vLantern.position.set(-4.0, 0, -4.0);

    const vPost = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 2.1, 6), this.lanternPostMat);
    vPost.position.y = 1.05;
    vPost.castShadow = true;
    vLantern.add(vPost);

    const vGallows = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.08, 0.08), this.lanternPostMat);
    vGallows.position.set(0.2, 1.95, 0);
    vLantern.add(vGallows);

    const vGlass = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.32, 0.22), this.lanternGlassMat);
    vGlass.position.set(0.38, 1.8, 0); // y=1.8 matches lantern light in AtmosphereManager
    vLantern.add(vGlass);

    const vRoof = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.16, 4), this.lanternPostMat);
    vRoof.position.set(0.38, 2.04, 0);
    vRoof.rotation.y = Math.PI / 4;
    vLantern.add(vRoof);

    group.add(vLantern);

    // 4. Bridge Lantern Post at (0.5, 3.55, -12.5)
    const bLantern = new THREE.Group();
    bLantern.position.set(0.5, 3.55, -12.5);

    const bPost = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 1.7, 6), this.lanternPostMat);
    bPost.position.y = 0.85;
    bPost.castShadow = true;
    bLantern.add(bPost);

    const bGlass = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.32, 0.22), this.lanternGlassMat);
    bGlass.position.set(0.18, 1.35, 0); // Total y: 3.55 + 1.35 = 4.9m (matches bridge_lantern)
    bLantern.add(bGlass);

    group.add(bLantern);

    // 5. Authentic Medieval Houses & Village Well (KayKit Medieval Pack)
    if (this.models['house']) {
      const h1 = this.models['house'].clone();
      h1.position.set(-8.5, 0, -6.5);
      h1.scale.setScalar(2.2);
      h1.rotation.y = 0.5;
      group.add(h1);

      const h2 = this.models['house'].clone();
      h2.position.set(-2.5, 0, -9.5);
      h2.scale.setScalar(2.0);
      h2.rotation.y = -0.7;
      group.add(h2);
    }
    if (this.models['well']) {
      const well = this.models['well'].clone();
      well.position.set(1.5, 0, -3.5);
      well.scale.setScalar(1.4);
      group.add(well);
    }

    this.scene.add(group);
  }

  // ─── Landmark 2: Luminescent Mushroom Grove ───────────────────────────────
  _buildMushroomGroveLandmarks() {
    const group = new THREE.Group();

    // Giant Bioluminescent Mushrooms in SW Grove (-18, 3.5, -16) & North Plateau
    const shrooms = [
      { x: -21.0, z: -18.5, h: 4.2, rad: 2.2, mat: this.shroomCapMatCyan, rotZ: 0.12 },
      { x: -15.0, z: -14.0, h: 3.6, rad: 1.9, mat: this.shroomCapMatPurple, rotZ: -0.15 },
      { x: -19.5, z: -13.0, h: 3.0, rad: 1.6, mat: this.shroomCapMatCyan, rotZ: 0.08 },
      { x: -14.0, z: 20.0, h: 4.0, rad: 2.1, mat: this.shroomCapMatPurple, rotZ: -0.1 }, // On Plateau North
    ];

    shrooms.forEach(s => {
      const y = this.getGroundHeight(s.x, s.z);
      const shroomGroup = new THREE.Group();
      shroomGroup.position.set(s.x, y, s.z);

      // Curved Stem
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(s.rad * 0.22, s.rad * 0.34, s.h, 8), this.shroomStemMat);
      stem.position.y = s.h / 2;
      stem.rotation.z = s.rotZ;
      stem.castShadow = true;
      shroomGroup.add(stem);

      // Bioluminescent Cap (Satisfies F11.2 emissive glow)
      const cap = new THREE.Mesh(
        new THREE.SphereGeometry(s.rad, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.52),
        s.mat
      );
      cap.position.set(s.rotZ * (s.h * 0.5), s.h, 0);
      cap.scale.set(1.0, 0.65, 1.0);
      cap.castShadow = true;
      shroomGroup.add(cap);

      // Glowing polka dots on cap
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2;
        const dotR = s.rad * 0.62;
        const dot = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18, 0), this.runeCrystalMat);
        dot.position.set(
          s.rotZ * (s.h * 0.5) + Math.cos(ang) * dotR,
          s.h + 0.38,
          Math.sin(ang) * dotR
        );
        shroomGroup.add(dot);
      }

      group.add(shroomGroup);
    });

    // Fairy Circle of 8 small glowing mushrooms
    const circleCenter = { x: -18.0, z: -17.0 };
    const baseY = this.getGroundHeight(circleCenter.x, circleCenter.z);
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      const r = 2.4;
      const mx = circleCenter.x + Math.cos(ang) * r;
      const mz = circleCenter.z + Math.sin(ang) * r;

      const miniStem = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.45, 6), this.shroomStemMat);
      miniStem.position.set(mx, baseY + 0.22, mz);
      group.add(miniStem);

      const miniCap = new THREE.Mesh(
        new THREE.SphereGeometry(0.28, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.55),
        i % 2 === 0 ? this.shroomCapMatCyan : this.shroomCapMatPurple
      );
      miniCap.position.set(mx, baseY + 0.45, mz);
      group.add(miniCap);
    }

    // Ancient Mushroom King Guardian (Ultimate Monsters Pack)
    if (this.models['mushroomKing']) {
      const mk = this.models['mushroomKing'].clone();
      mk.position.set(-22.0, baseY, -14.0);
      mk.scale.setScalar(1.2);
      mk.rotation.y = 0.8;
      group.add(mk);
    }

    this.scene.add(group);
  }

  // ─── Landmark 3: Ancient Sunken Ruins ──────────────────────────────────────
  _buildSunkenRuins() {
    const group = new THREE.Group();
    const altarPos = { x: 20, y: 3.5, z: -18 };

    // 1. Weathered Stone Pillars at exact coordinates (F12.2)
    const pillarCoords = [
      { x: 17, z: -21, broken: false },
      { x: 23, z: -21, broken: false },
      { x: 17, z: -15, broken: true },
      { x: 23, z: -15, broken: false },
    ];

    pillarCoords.forEach(p => {
      const pillarGroup = new THREE.Group();
      pillarGroup.position.set(p.x, altarPos.y, p.z);

      // Base plinth
      const base = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.35, 1.4), this.stonePillarMat);
      base.position.y = 0.175;
      base.castShadow = true;
      base.receiveShadow = true;
      pillarGroup.add(base);

      if (!p.broken) {
        // Full column
        const column = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 3.2, 8), this.stonePillarMat);
        column.position.y = 0.35 + 1.6;
        column.castShadow = true;
        column.receiveShadow = true;
        pillarGroup.add(column);

        // Capital
        const capital = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.3, 1.2), this.stonePillarMat);
        capital.position.y = 0.35 + 3.2 + 0.15;
        capital.castShadow = true;
        pillarGroup.add(capital);
      } else {
        // Tilted broken stump
        const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 1.8, 8), this.stonePillarMat);
        stump.position.set(0.1, 0.35 + 0.9, 0);
        stump.rotation.z = 0.22;
        stump.castShadow = true;
        pillarGroup.add(stump);

        // Fallen chunk
        const chunk = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.44, 1.2, 8), this.stonePillarMat);
        chunk.position.set(0.9, 0.3, 0.3);
        chunk.rotation.x = Math.PI / 2;
        chunk.rotation.y = 0.4;
        chunk.castShadow = true;
        pillarGroup.add(chunk);
      }

      group.add(pillarGroup);
    });

    // 2. Ceremonial Stone Altar at (20, 3.5, -18) (F12.3)
    const altar = new THREE.Group();
    altar.position.set(altarPos.x, altarPos.y, altarPos.z);

    const step1 = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.30, 2.2), this.stonePillarMat);
    step1.position.y = 0.15;
    step1.castShadow = true;
    step1.receiveShadow = true;
    altar.add(step1);

    const step2 = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.30, 1.6), this.stonePillarMat);
    step2.position.y = 0.45;
    step2.castShadow = true;
    step2.receiveShadow = true;
    altar.add(step2);

    const altarTable = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.40, 1.1), this.stonePillarMat);
    altarTable.position.y = 0.80;
    altarTable.castShadow = true;
    altarTable.receiveShadow = true;
    altar.add(altarTable);

    group.add(altar);

    // 3. Floating Magical Rune Crystal (F12.4)
    const runeMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), this.runeCrystalMat);
    runeMesh.position.set(altarPos.x, 4.8, altarPos.z);
    runeMesh.castShadow = true;
    this.scene.add(runeMesh);
    this.runeCrystal = runeMesh;

    // Glowing rune ring around crystal
    const runeRing = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.035, 6, 16), this.runeCrystalMat);
    runeRing.position.set(altarPos.x, 4.8, altarPos.z);
    runeRing.rotation.x = Math.PI / 2;
    this.scene.add(runeRing);

    this.scene.add(group);
  }

  // ─── Landmark 4: Windy Peak Tower & Campfire ───────────────────────────────
  _buildWindyPeakTowerAndCampfire() {
    const group = new THREE.Group();
    const peakY = 7.0;

    // 1. Multi-tier Wooden Lookout Tower at (14.5, 7.0, 23.5) (F13.2)
    const tower = new THREE.Group();
    tower.position.set(14.5, peakY, 23.5);

    // 4 Heavy timber corner posts (y=0 to y=4.8 -> elevation 7.0m to 11.8m)
    const postGeo = new THREE.CylinderGeometry(0.12, 0.14, 4.8, 6);
    const postOffsets = [
      [-1.6, -1.6], [1.6, -1.6],
      [-1.6, 1.6],  [1.6, 1.6],
    ];
    postOffsets.forEach(([px, pz]) => {
      const pMesh = new THREE.Mesh(postGeo, this.woodMat);
      pMesh.position.set(px, 2.4, pz);
      pMesh.castShadow = true;
      tower.add(pMesh);
    });

    // Cross-bracing timbers at y = 2.2m (elevation 9.2m)
    const braceGeo = new THREE.BoxGeometry(3.3, 0.12, 0.12);
    for (let side = 0; side < 4; side++) {
      const brace = new THREE.Mesh(braceGeo, this.woodMat);
      brace.position.y = 2.2;
      if (side % 2 === 0) {
        brace.position.z = side === 0 ? -1.6 : 1.6;
      } else {
        brace.position.x = side === 1 ? 1.6 : -1.6;
        brace.rotation.y = Math.PI / 2;
      }
      tower.add(brace);
    }

    // Observation deck platform at y = 4.5m (total elevation = 7.0 + 4.5 = 11.5m, satisfies F13.2)
    const deck = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.18, 3.8), this.woodMat);
    deck.position.y = 4.5;
    deck.castShadow = true;
    deck.receiveShadow = true;
    tower.add(deck);

    // Safety railings at y = 5.2m
    const railGeo = new THREE.BoxGeometry(3.6, 0.08, 0.08);
    for (let side = 0; side < 4; side++) {
      const rail = new THREE.Mesh(railGeo, this.woodMat);
      rail.position.y = 5.2;
      if (side % 2 === 0) {
        rail.position.z = side === 0 ? -1.8 : 1.8;
      } else {
        rail.position.x = side === 1 ? 1.8 : -1.8;
        rail.rotation.y = Math.PI / 2;
      }
      tower.add(rail);
    }

    // Timber canopy roof on top of observation deck
    const canopyPosts = [
      [-1.7, -1.7], [1.7, -1.7],
      [-1.7, 1.7],  [1.7, 1.7],
    ];
    canopyPosts.forEach(([cx, cz]) => {
      const cp = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.8, 6), this.woodMat);
      cp.position.set(cx, 5.4, cz);
      tower.add(cp);
    });

    const roof = new THREE.Mesh(new THREE.ConeGeometry(2.8, 1.2, 4), this.woodMat);
    roof.position.y = 6.9;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    tower.add(roof);

    // Flagpole & Banner at apex (y = 8.0)
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.8, 6), this.woodMat);
    pole.position.y = 7.8;
    tower.add(pole);

    const banner = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.55), this.bannerMat);
    banner.position.set(0.55, 8.2, 0);
    tower.add(banner);

    group.add(tower);

    // 2. Active Campfire at (20.0, 7.0, 22.0) (F13.3)
    const campfire = new THREE.Group();
    campfire.position.set(20.0, peakY, 22.0);

    // Stone ring
    const stoneCount = 10;
    const stoneGeo = new THREE.DodecahedronGeometry(0.24, 0);
    for (let i = 0; i < stoneCount; i++) {
      const ang = (i / stoneCount) * Math.PI * 2;
      const sMesh = new THREE.Mesh(stoneGeo, this.campfireRockMat);
      sMesh.position.set(Math.cos(ang) * 0.72, 0.12, Math.sin(ang) * 0.72);
      sMesh.castShadow = true;
      campfire.add(sMesh);
    }

    // Crossed charred logs
    const logGeo = new THREE.CylinderGeometry(0.08, 0.09, 1.1, 6);
    for (let l = 0; l < 4; l++) {
      const log = new THREE.Mesh(logGeo, this.campfireLogMat);
      log.rotation.z = Math.PI / 2;
      log.rotation.y = (l / 4) * Math.PI + 0.3;
      log.position.y = 0.16 + (l % 2) * 0.08;
      log.castShadow = true;
      campfire.add(log);
    }

    // Glowing ember bed
    const ember = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.58, 0.14, 8), this.emberMat);
    ember.position.y = 0.07;
    campfire.add(ember);

    // 3. Authentic Medieval Watchtower (KayKit Medieval Pack)
    if (this.models['watchtower']) {
      const wt = this.models['watchtower'].clone();
      wt.position.set(18.5, peakY, 20.0);
      wt.scale.setScalar(2.2);
      wt.rotation.y = -0.5;
      group.add(wt);
    }

    group.add(campfire);

    this.scene.add(group);
  }

  // ─── Landmark 5: Woodsman Campsite ────────────────────────────────────────
  _buildWoodsmanCamp() {
    const group = new THREE.Group();
    const campPos = { x: -18, y: 3.5, z: -16 }; // Plateau SW near Bram

    // Canvas Wedge Tent at (-15.5, 3.5, -18.5)
    const tentGroup = new THREE.Group();
    tentGroup.position.set(-15.5, campPos.y, -18.5);
    tentGroup.rotation.y = 0.4;

    const tentGeo = new THREE.CylinderGeometry(1.6, 1.6, 2.6, 3);
    const tent = new THREE.Mesh(tentGeo, this.tentMat);
    tent.rotation.z = Math.PI / 2;
    tent.position.y = 1.0;
    tent.castShadow = true;
    tent.receiveShadow = true;
    tentGroup.add(tent);
    group.add(tentGroup);

    // Chopping block & Log Bench
    const block = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.42, 0.55, 8), this.woodMat);
    block.position.set(-17.2, campPos.y + 0.275, -17.8);
    block.castShadow = true;
    group.add(block);

    const bench = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.35, 0.45), this.woodMat);
    bench.position.set(-18.5, campPos.y + 0.175, -18.0);
    bench.rotation.y = -0.3;
    bench.castShadow = true;
    group.add(bench);

    // Supply Crates
    const crateGeo = new THREE.BoxGeometry(0.7, 0.7, 0.7);
    const crate1 = new THREE.Mesh(crateGeo, this.woodMat);
    crate1.position.set(-14.2, campPos.y + 0.35, -16.8);
    crate1.rotation.y = 0.25;
    crate1.castShadow = true;
    group.add(crate1);

    const crate2 = new THREE.Mesh(crateGeo, this.woodMat);
    crate2.position.set(-14.0, campPos.y + 0.35, -17.6);
    crate2.rotation.y = -0.15;
    crate2.castShadow = true;
    group.add(crate2);

    // Authentic Medieval Lumbermill (KayKit Medieval Pack)
    if (this.models['lumbermill']) {
      const lm = this.models['lumbermill'].clone();
      lm.position.set(-21.5, campPos.y, -15.5);
      lm.scale.setScalar(2.0);
      lm.rotation.y = 0.6;
      group.add(lm);
    }

    this.scene.add(group);
  }

  // ─── Flower Patches & Meadow Accents ─────────────────────────────────────
  _buildFlowerPatches() {
    const group = new THREE.Group();
    const patchCenters = [
      { x: -2.0, z: -2.0 },   // Village green
      { x: 3.0, z: 2.0 },     // Crossroads East
      { x: -6.0, z: 5.0 },    // Riverbank meadow
      { x: -12.0, z: 22.0 },  // North Plateau pasture
      { x: 16.0, z: -14.0 },  // Ruins approach
      { x: -14.0, z: -12.0 }, // SW campsite trail
    ];

    const stemGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.28, 4);
    const petalGeo = new THREE.DodecahedronGeometry(0.09, 0);
    const flowerColors = [this.flowerMatRed, this.flowerMatYellow, this.flowerMatBlue, this.flowerMatWhite];

    patchCenters.forEach((center, cIdx) => {
      const count = 14;
      for (let i = 0; i < count; i++) {
        const ang = (i / count) * Math.PI * 2 + Math.random() * 0.5;
        const dist = 0.5 + Math.random() * 2.2;
        const fx = center.x + Math.cos(ang) * dist;
        const fz = center.z + Math.sin(ang) * dist;
        const fy = this.getGroundHeight(fx, fz);

        const stem = new THREE.Mesh(stemGeo, this.flowerStemMat);
        stem.position.set(fx, fy + 0.14, fz);
        group.add(stem);

        const flower = new THREE.Mesh(petalGeo, flowerColors[(i + cIdx) % flowerColors.length]);
        flower.position.set(fx, fy + 0.30, fz);
        group.add(flower);
      }
    });

    this.scene.add(group);
  }

  _spawnProp(name, x, y, z, scale) {
    const template = this.models[name];
    if (!template) return;

    const instance = template.clone();
    instance.position.set(x, y, z);
    instance.scale.setScalar(scale);
    instance.rotation.y = Math.random() * Math.PI * 2;
    this.scene.add(instance);
    this.props.push(instance);
  }

  _isNearRamp(x, z, buffer) {
    return this.ramps.some(r => {
      const minX = r.x - r.w / 2 - buffer;
      const maxX = r.x + r.w / 2 + buffer;
      const minZ = r.z - r.d / 2 - buffer;
      const maxZ = r.z + r.d / 2 + buffer;
      return x >= minX && x <= maxX && z >= minZ && z <= maxZ;
    });
  }

  _isNearBridge(x, z, buffer) {
    const b = this.bridge;
    return x >= b.x - b.w / 2 - buffer && x <= b.x + b.w / 2 + buffer &&
           z >= b.z - b.d / 2 - buffer && z <= b.z + b.d / 2 + buffer;
  }

  // ─── 7. Height & Physics Query (Supports Bridge & Ramps) ───────────────────

  getGroundHeight(x, z, currentY = undefined) {
    // 0. Check Sky Islands (active when entity is airborne / elevated above Tier 2 ground)
    if (currentY !== undefined && currentY > 8.0 && this.skyIslands) {
      for (const s of this.skyIslands) {
        const halfW = (s.w || 14) / 2;
        const halfD = (s.d || 14) / 2;
        if (x >= s.x - halfW && x <= s.x + halfW && z >= s.z - halfD && z <= s.z + halfD) {
          if (currentY >= s.height - 1.2) {
            return s.height;
          }
        }
      }
    }

    // 1. Check Suspension Bridge (allows walking across canyon at y = 3.55)
    const b = this.bridge;
    if (x >= b.x - b.w / 2 && x <= b.x + b.w / 2 && z >= b.z - b.d / 2 && z <= b.z + b.d / 2) {
      return b.height;
    }

    // 2. Check Ramps
    for (const r of this.ramps) {
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

    // 3. Check Plateaus
    let highest = 0.0;
    for (const p of this.plateaus) {
      const halfW = p.w / 2;
      const halfD = p.d / 2;
      if (x >= p.x - halfW && x <= p.x + halfW && z >= p.z - halfD && z <= p.z + halfD) {
        if (p.height > highest) {
          highest = p.height;
        }
      }
    }

    return highest;
  }

  // ─── 8. Animated Water Wave Displacements & Dock Motion ────────────────────

  update(delta, elapsed) {
    if (elapsed === undefined) elapsed = performance.now() * 0.001;

    // 1. Sinusoidal Wave & Ripple Vertex Displacement
    if (this.waterGeometries && this.waterGeometries.length > 0) {
      const ampPrimary = 0.036;
      const freqPrimary = 0.5;
      const speedPrimary = 2.0;

      const ampRipple = 0.012;
      const freqRipple = 1.2;
      const speedRipple = 3.2;

      for (let g = 0; g < this.waterGeometries.length; g++) {
        const { geo, segment, posAttr, count } = this.waterGeometries[g];
        const cosR = Math.cos(segment.rot);
        const sinR = Math.sin(segment.rot);

        for (let i = 0; i < count; i++) {
          const localX = posAttr.getX(i);
          const localY = posAttr.getY(i);

          const wx = segment.x + (localX * cosR - localY * sinR);
          const wz = segment.z - (localX * sinR + localY * cosR);

          const primary = ampPrimary * Math.sin(wx * freqPrimary + elapsed * speedPrimary) *
                                       Math.cos(wz * freqPrimary + elapsed * speedPrimary);
          const ripple = ampRipple * Math.sin((wx + wz) * freqRipple + elapsed * speedRipple) *
                                     Math.cos((wx - wz) * 0.8 + elapsed * 2.4);

          posAttr.setZ(i, primary + ripple);
        }

        posAttr.needsUpdate = true;
      }
    }

    // 2. Subtle Rustic Dock Floating Animation
    if (this.docks && this.docks.length > 0) {
      for (let d = 0; d < this.docks.length; d++) {
        const dock = this.docks[d];
        dock.group.position.y = dock.baseY + Math.sin(elapsed * 1.5 + dock.index * 1.8) * 0.005;
      }
    }

    // 3. Floating Magical Rune Crystal Oscillation & Rotation (F12.4)
    if (this.runeCrystal) {
      this.runeCrystal.position.y = 4.8 + Math.sin(elapsed * 2.0) * 0.15;
      this.runeCrystal.rotation.y = (elapsed * 1.5) % (Math.PI * 2);
      this.runeCrystal.rotation.x = Math.sin(elapsed * 1.2) * 0.1;
    }

    // 4. Soaring Mountain Birds Orbital Flight & Wing Dynamics
    if (this.birds && this.birds.length > 0) {
      for (const b of this.birds) {
        b.angle += b.speed * delta;
        const curX = b.centerX + Math.cos(b.angle) * b.radius;
        const curZ = b.centerZ + Math.sin(b.angle) * b.radius;
        const curY = b.baseY + Math.sin(b.angle * 2.0 + b.seed) * 1.2;

        b.group.position.set(curX, curY, curZ);
        // Face tangential velocity vector + subtle bank
        b.group.rotation.y = -b.angle - Math.PI / 2;
        b.group.rotation.z = Math.sin(b.angle * 2.0) * 0.12;

        // Subtle wing flapping
        const flap = Math.sin(elapsed * 5.0 + b.wingOffset) * 0.22;
        b.leftWing.rotation.z = flap;
        b.rightWing.rotation.z = -flap;
      }
    }

    // 6. Meadow Butterflies Flutter Dynamics
    if (this.butterflies && this.butterflies.length > 0) {
      for (const bf of this.butterflies) {
        const t = elapsed * bf.speed + bf.seed;
        const bx = bf.baseX + Math.sin(t * 0.7) * bf.rangeX;
        const bz = bf.baseZ + Math.cos(t * 0.9) * bf.rangeZ;
        const by = bf.baseY + Math.sin(t * 1.8) * 0.25;

        bf.group.position.set(bx, by, bz);
        bf.group.rotation.y = Math.sin(t * 0.6) * 1.2;

        const wingFlap = Math.sin(elapsed * 18.0 + bf.seed) * 0.7;
        bf.leftWing.rotation.y = wingFlap;
        bf.rightWing.rotation.y = -wingFlap;
      }
    }

    // 7. Sky Islands, Updraft Vents & Wind Rings Animation
    if (this.skyTempleCrystal) {
      this.skyTempleCrystal.rotation.y = (elapsed * 1.2) % (Math.PI * 2);
      this.skyTempleCrystal.position.y = 2.2 + Math.sin(elapsed * 2.0) * 0.15;
    }
    if (this.updraftVents && this.updraftVents.length > 0) {
      for (const v of this.updraftVents) {
        if (v.vortexMesh) {
          v.vortexMesh.rotation.y = (v.vortexMesh.rotation.y + delta * 2.5) % (Math.PI * 2);
        }
      }
    }
    if (this.windRings && this.windRings.length > 0) {
      for (const r of this.windRings) {
        if (r.mesh) {
          r.mesh.rotation.z = (r.mesh.rotation.z + delta * 0.8) % (Math.PI * 2);
        }
      }
    }
  }

  // ─── 9. Interactive River Stepping Stones ─────────────────────────────────
  _buildRiverSteppingStones() {
    const group = new THREE.Group();
    // 4 Natural river crossing stones near village dock
    const stonePositions = [
      { x: -5.2, z: 2.8, scale: 1.1 },
      { x: -3.8, z: 4.0, scale: 0.95 },
      { x: -2.4, z: 5.2, scale: 1.05 },
      { x: -1.0, z: 6.4, scale: 0.90 },
    ];

    const stoneGeo = new THREE.CylinderGeometry(0.55, 0.68, 0.22, 7);
    stonePositions.forEach((sp, idx) => {
      const stone = new THREE.Mesh(stoneGeo, this.stoneStepMat);
      stone.position.set(sp.x, 0.08, sp.z);
      stone.scale.set(sp.scale, 1.0, sp.scale * 0.92);
      stone.rotation.y = idx * 1.4;
      stone.castShadow = true;
      stone.receiveShadow = true;
      group.add(stone);
      this.steppingStones.push(stone);
    });

    this.scene.add(group);
  }

  // ─── 10. Living Fauna (Soaring Birds & Meadow Butterflies) ─────────────────
  _buildFaunaAndAtmosphere() {
    // 1. Soaring Mountain Birds (Flock circling high above Windy Peak and Valley)
    const birdMat = this.mountainRockMat;
    const birdConfigs = [
      { centerX: 12, centerZ: 16, radius: 28, baseY: 23, speed: 0.32, angle: 0.0, wingOffset: 0 },
      { centerX: 12, centerZ: 16, radius: 34, baseY: 26, speed: 0.28, angle: 1.4, wingOffset: 0.8 },
      { centerX: 10, centerZ: 14, radius: 38, baseY: 28, speed: 0.25, angle: 2.8, wingOffset: 1.6 },
      { centerX: -4, centerZ: 0,  radius: 30, baseY: 24, speed: 0.30, angle: 4.2, wingOffset: 2.4 },
    ];

    birdConfigs.forEach((cfg, idx) => {
      const birdGroup = new THREE.Group();

      // Fuselage / body
      const body = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.75, 4), birdMat);
      body.rotation.x = Math.PI / 2;
      birdGroup.add(body);

      // Left wing
      const leftWing = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.03, 0.28), birdMat);
      leftWing.position.set(-0.42, 0.02, 0);
      birdGroup.add(leftWing);

      // Right wing
      const rightWing = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.03, 0.28), birdMat);
      rightWing.position.set(0.42, 0.02, 0);
      birdGroup.add(rightWing);

      this.scene.add(birdGroup);
      this.birds.push({
        group: birdGroup,
        leftWing,
        rightWing,
        ...cfg,
        seed: idx * 1.5,
      });
    });

    // 2. Fluttering Meadow Butterflies (Near flower patches)
    const butterflyColors = [
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.4 }), // Azure
      new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 }), // Gold
      new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.4 }), // Rose
    ];

    const butterflySpawns = [
      { baseX: -2.0, baseY: 0.6, baseZ: -2.0, rangeX: 1.8, rangeZ: 1.8, speed: 1.2 },
      { baseX: 3.0,  baseY: 0.7, baseZ: 2.0,  rangeX: 2.2, rangeZ: 1.6, speed: 1.4 },
      { baseX: -6.0, baseY: 0.6, baseZ: 5.0,  rangeX: 2.0, rangeZ: 2.0, speed: 1.1 },
      { baseX: -14.0,baseY: 3.8, baseZ: -12.0,rangeX: 2.5, rangeZ: 2.2, speed: 1.3 },
    ];

    butterflySpawns.forEach((sp, idx) => {
      const bGroup = new THREE.Group();
      const mat = butterflyColors[idx % butterflyColors.length];

      const wingGeo = new THREE.PlaneGeometry(0.16, 0.12);
      const leftWing = new THREE.Mesh(wingGeo, mat);
      leftWing.position.set(-0.08, 0, 0);
      bGroup.add(leftWing);

      const rightWing = new THREE.Mesh(wingGeo, mat);
      rightWing.position.set(0.08, 0, 0);
      bGroup.add(rightWing);

      this.scene.add(bGroup);
      this.butterflies.push({
        group: bGroup,
        leftWing,
        rightWing,
        ...sp,
        seed: idx * 2.1,
      });
    });
  }
}

