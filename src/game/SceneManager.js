// ===================================================
// SceneManager.js — Rich Procedural KayKit Forest Environment
// Low-poly vibrant forest with dense trees, rocks, bushes, clouds & flowers
// ===================================================
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const TRACK_WIDTH = 8.5;       // Width of the running dirt trail
const GRASS_WIDTH = 70;        // Width of lush outer meadows
const TILE_LENGTH = 32;        // Length of each scrolling segment
const TILE_COUNT = 6;          // Segments kept active in view
const CLUSTER_INTERVAL = 6.0;  // Spacing between roadside forest clusters

const FOREST_MODELS = [
  'Tree_1_A', 'Tree_2_A', 'Tree_3_A', 'Tree_4_A', 'Tree_Bare_1_A',
  'Bush_1_A', 'Bush_2_A',
  'Rock_1_A', 'Rock_2_A', 'Rock_3_A',
];

export class SceneManager {
  constructor(scene) {
    this.scene = scene;
    this.tiles = [];           // Ground meshes (trail + grass)
    this.forestObjects = [];   // Trees, rocks, bushes instances
    this.clouds = [];          // Low-poly sky clouds
    this.models = {};          // Loaded GLTF templates
    this.loader = new GLTFLoader();
    this.totalDistance = 0;
    this.nextSpawnZ = 10;
  }

  async init() {
    await this._loadModels();
    this._createGround();
    this._createClouds();
    this._spawnInitialForest();
  }

  // ─── Model Loading ────────────────────────────────────────────────────────

  async _loadModels() {
    const basePath = './assets/forest/gltf/';

    const promises = FOREST_MODELS.map(name =>
      this._loadGLTF(`${basePath}${name}.gltf`)
        .then(model => {
          this.models[name] = model;
        })
        .catch(err => {
          console.warn(`[SceneManager] Fallback used for ${name}:`, err);
          this.models[name] = this._createFallback(name);
        })
    );

    await Promise.all(promises);
  }

  _loadGLTF(path) {
    return new Promise((resolve, reject) => {
      this.loader.load(
        path,
        gltf => {
          const model = gltf.scene;
          model.traverse(child => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              // Preserve original KayKit PBR material for rich toon shading
              if (child.material) {
                child.material.roughness = 0.65;
                child.material.metalness = 0.05;
                if (child.material.map) {
                  child.material.map.colorSpace = THREE.SRGBColorSpace;
                }
              }
            }
          });
          resolve(model);
        },
        undefined,
        reject
      );
    });
  }

  _createFallback(name) {
    const isRock = name.includes('Rock');
    const isBush = name.includes('Bush');
    let geo;
    let color;
    if (isRock) {
      geo = new THREE.DodecahedronGeometry(0.8, 0);
      color = 0x889280;
    } else if (isBush) {
      geo = new THREE.SphereGeometry(0.7, 6, 5);
      color = 0x449933;
    } else {
      geo = new THREE.ConeGeometry(0.8, 3.2, 5);
      color = 0x2e7d32;
    }
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.7, flatShading: true });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  // ─── Stylized Ground Tiles ────────────────────────────────────────────────

  _createGround() {
    this.tiles.forEach(t => this.scene.remove(t));
    this.tiles = [];

    // Outer lush green meadow
    const grassGeo = new THREE.PlaneGeometry(GRASS_WIDTH, TILE_LENGTH);
    const grassMat = new THREE.MeshStandardMaterial({
      color: 0x58a834,
      roughness: 0.9,
      metalness: 0.05,
    });

    // Warm dirt path in the center with slight border curbs
    const pathGeo = new THREE.PlaneGeometry(TRACK_WIDTH, TILE_LENGTH);
    const pathMat = new THREE.MeshStandardMaterial({
      color: 0x8f7856,
      roughness: 0.95,
      metalness: 0.0,
    });

    // Trail side borders (slightly darker earth)
    const curbGeo = new THREE.PlaneGeometry(0.4, TILE_LENGTH);
    const curbMat = new THREE.MeshStandardMaterial({
      color: 0x6e583c,
      roughness: 1.0,
    });

    for (let i = 0; i < TILE_COUNT; i++) {
      const z = i * TILE_LENGTH;

      // 1. Meadow
      const grass = new THREE.Mesh(grassGeo, grassMat);
      grass.rotation.x = -Math.PI / 2;
      grass.position.set(0, -0.02, z);
      grass.receiveShadow = true;
      this.scene.add(grass);

      // 2. Dirt Trail
      const path = new THREE.Mesh(pathGeo, pathMat);
      path.rotation.x = -Math.PI / 2;
      path.position.set(0, 0, z);
      path.receiveShadow = true;
      this.scene.add(path);

      // 3. Left curb
      const leftCurb = new THREE.Mesh(curbGeo, curbMat);
      leftCurb.rotation.x = -Math.PI / 2;
      leftCurb.position.set(-TRACK_WIDTH / 2, 0.005, z);
      leftCurb.receiveShadow = true;
      this.scene.add(leftCurb);

      // 4. Right curb
      const rightCurb = new THREE.Mesh(curbGeo, curbMat);
      rightCurb.rotation.x = -Math.PI / 2;
      rightCurb.position.set(TRACK_WIDTH / 2, 0.005, z);
      rightCurb.receiveShadow = true;
      this.scene.add(rightCurb);

      this.tiles.push({ grass, path, leftCurb, rightCurb, baseZ: z });
    }
  }

  // ─── Sky Clouds ───────────────────────────────────────────────────────────

  _createClouds() {
    this.clouds.forEach(c => this.scene.remove(c.mesh));
    this.clouds = [];

    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.5,
      metalness: 0.0,
      flatShading: true,
    });

    // Spawn 10 low-poly puffy clouds high in the sky
    for (let i = 0; i < 10; i++) {
      const group = new THREE.Group();
      const numPuffs = 3 + Math.floor(Math.random() * 3);
      for (let p = 0; p < numPuffs; p++) {
        const rad = 2.5 + Math.random() * 2.0;
        const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(rad, 1), cloudMat);
        puff.position.set((p - 1.5) * 2.2, (Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 2.0);
        group.add(puff);
      }

      const x = (Math.random() - 0.5) * 80;
      const y = 22 + Math.random() * 12;
      const z = (i / 10) * (TILE_LENGTH * TILE_COUNT);
      group.position.set(x, y, z);
      group.scale.setScalar(0.9 + Math.random() * 0.7);

      this.scene.add(group);
      this.clouds.push({ mesh: group, speed: 1.5 + Math.random() * 2 });
    }
  }

  // ─── Dense Forest Spawning ────────────────────────────────────────────────

  _spawnInitialForest() {
    const totalZ = TILE_LENGTH * TILE_COUNT;
    for (let z = 5; z < totalZ; z += CLUSTER_INTERVAL) {
      this._spawnForestCluster(z);
    }
    this.nextSpawnZ = totalZ;
  }

  _spawnForestCluster(z) {
    // Left cluster & Right cluster
    this._spawnSideCluster(-1, z);
    this._spawnSideCluster(1, z);
  }

  _spawnSideCluster(side, z) {
    const baseOffset = (TRACK_WIDTH / 2) + 0.8; // Edge of dirt trail

    // Layer 1: Edge of trail — bushes & small rocks
    if (Math.random() > 0.25) {
      const edgeModel = Math.random() > 0.4 ? this._pickModel(['Bush_1_A', 'Bush_2_A']) : this._pickModel(['Rock_1_A', 'Rock_2_A']);
      if (edgeModel) {
        const obj = edgeModel.clone();
        const x = side * (baseOffset + Math.random() * 1.5);
        const zPos = z + (Math.random() - 0.5) * 3;
        const scale = 0.7 + Math.random() * 0.5;
        obj.scale.setScalar(scale);
        obj.position.set(x, 0, zPos);
        obj.rotation.y = Math.random() * Math.PI * 2;
        this.scene.add(obj);
        this.forestObjects.push(obj);
      }
    }

    // Layer 2: Mid-ground trees (Dense tree line)
    const treeCount = 1 + Math.floor(Math.random() * 2);
    for (let t = 0; t < treeCount; t++) {
      const treeModel = this._pickModel(['Tree_1_A', 'Tree_2_A', 'Tree_3_A', 'Tree_4_A']);
      if (treeModel) {
        const obj = treeModel.clone();
        const x = side * (baseOffset + 2.5 + Math.random() * 4.0);
        const zPos = z + (Math.random() - 0.5) * 4;
        const scale = 0.9 + Math.random() * 0.6;
        obj.scale.setScalar(scale);
        obj.position.set(x, 0, zPos);
        obj.rotation.y = Math.random() * Math.PI * 2;
        this.scene.add(obj);
        this.forestObjects.push(obj);
      }
    }

    // Layer 3: Deep background forest (Massive trees & large rock formations)
    if (Math.random() > 0.3) {
      const bgModel = Math.random() > 0.3 ? this._pickModel(['Tree_1_A', 'Tree_3_A', 'Tree_Bare_1_A']) : this._pickModel(['Rock_3_A', 'Rock_1_A']);
      if (bgModel) {
        const obj = bgModel.clone();
        const x = side * (baseOffset + 7.0 + Math.random() * 9.0);
        const zPos = z + (Math.random() - 0.5) * 5;
        const scale = 1.3 + Math.random() * 0.9;
        obj.scale.setScalar(scale);
        obj.position.set(x, 0, zPos);
        obj.rotation.y = Math.random() * Math.PI * 2;
        this.scene.add(obj);
        this.forestObjects.push(obj);
      }
    }

    // Roadside flower / mushroom patch
    if (Math.random() > 0.4) {
      this._spawnTinyFlowerPatch(side * (baseOffset + 0.3 + Math.random() * 1.0), z + (Math.random() - 0.5) * 2);
    }
  }

  _spawnTinyFlowerPatch(x, z) {
    const colors = [0xffdd33, 0xff5566, 0xaa55ff, 0xffffff];
    const flowerCol = colors[Math.floor(Math.random() * colors.length)];
    const geo = new THREE.DodecahedronGeometry(0.18, 0);
    const mat = new THREE.MeshStandardMaterial({ color: flowerCol, roughness: 0.6, flatShading: true });
    const flower = new THREE.Mesh(geo, mat);
    flower.position.set(x, 0.15, z);
    this.scene.add(flower);
    this.forestObjects.push(flower);
  }

  _pickModel(names) {
    const valid = names.filter(n => this.models[n]);
    if (valid.length === 0) return null;
    const picked = valid[Math.floor(Math.random() * valid.length)];
    return this.models[picked];
  }

  // ─── Update Loop ──────────────────────────────────────────────────────────

  update(delta, speed, isPlaying) {
    if (!isPlaying) return;

    const moveAmount = speed * delta;
    this.totalDistance += moveAmount;

    // 1. Scroll ground tiles
    const totalLength = TILE_COUNT * TILE_LENGTH;
    this.tiles.forEach(tile => {
      tile.grass.position.z -= moveAmount;
      tile.path.position.z -= moveAmount;
      tile.leftCurb.position.z -= moveAmount;
      tile.rightCurb.position.z -= moveAmount;

      if (tile.grass.position.z < -TILE_LENGTH) {
        tile.grass.position.z += totalLength;
        tile.path.position.z += totalLength;
        tile.leftCurb.position.z += totalLength;
        tile.rightCurb.position.z += totalLength;
      }
    });

    // 2. Scroll forest objects
    this.forestObjects.forEach(mesh => {
      mesh.position.z -= moveAmount;
    });

    // Remove scrolled-past objects
    this.forestObjects = this.forestObjects.filter(mesh => {
      if (mesh.position.z < -15) {
        this.scene.remove(mesh);
        return false;
      }
      return true;
    });

    // 3. Continuously spawn new dense forest clusters ahead
    while (this.nextSpawnZ - this.totalDistance < TILE_LENGTH * (TILE_COUNT - 1)) {
      const spawnZ = (this.nextSpawnZ - this.totalDistance);
      this._spawnForestCluster(spawnZ);
      this.nextSpawnZ += CLUSTER_INTERVAL + (Math.random() - 0.5) * 1.5;
    }

    // 4. Drift sky clouds
    this.clouds.forEach(c => {
      c.mesh.position.x += c.speed * delta * 0.4;
      c.mesh.position.z -= (moveAmount * 0.1); // Slow parallax scroll
      if (c.mesh.position.x > 50) c.mesh.position.x = -50;
      if (c.mesh.position.z < -10) c.mesh.position.z += totalLength;
    });
  }

  reset() {
    this.forestObjects.forEach(mesh => this.scene.remove(mesh));
    this.forestObjects = [];
    this.totalDistance = 0;
    this.nextSpawnZ = 10;

    // Reset ground segments
    this.tiles.forEach((tile, i) => {
      const z = i * TILE_LENGTH;
      tile.grass.position.z = z;
      tile.path.position.z = z;
      tile.leftCurb.position.z = z;
      tile.rightCurb.position.z = z;
    });

    this._spawnInitialForest();
  }
}
