// ===================================================
// NPCManager.js — Interactive 3D NPCs for KayKit Open World
// Stylized models for Finn, Bram, and Forest Spirit with overhead prompts
// ===================================================
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class NPCManager {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.npcs = [];
    this.activeNearbyNPC = null;
    this.loader = new GLTFLoader();
  }

  init() {
    this._createOldFinn();
    this._createWoodsmanBram();
    this._createForestSpirit();
  }

  // ─── 1. Old Explorer Finn (Valley - Tier 0) ──────────────────────────────
  _createOldFinn() {
    const group = new THREE.Group();
    const x = -4.0, z = -4.0;
    const y = this.world.getGroundHeight(x, z);
    group.position.set(x, y, z);
    group.rotation.y = Math.PI * 0.25; // Face toward spawn (0,0)

    // Materials
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xffdfb8, roughness: 0.7 });
    const robeMat = new THREE.MeshStandardMaterial({ color: 0x3b4252, roughness: 0.8, flatShading: true });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0xd08770, roughness: 0.7 });
    const beardMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.9, flatShading: true });
    const hatMat = new THREE.MeshStandardMaterial({ color: 0x2e3440, roughness: 0.8 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5a3d28, roughness: 0.8 });
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0xffd166,
      emissive: 0xffa500,
      emissiveIntensity: 0.8,
      roughness: 0.2,
    });

    // Body Container
    const body = new THREE.Group();
    body.position.y = 0.75;
    group.add(body);

    // Robe Torso
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.42, 0.9, 8), robeMat);
    torso.castShadow = true;
    torso.receiveShadow = true;
    body.add(torso);

    // Scarf / Capelet
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.35, 0.2, 8), trimMat);
    collar.position.y = 0.45;
    body.add(collar);

    // Head
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.65, 0);
    body.add(headGroup);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.36, 0.35), skinMat);
    head.castShadow = true;
    headGroup.add(head);

    // Wizard / Explorer Hat
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.05, 12), hatMat);
    brim.position.y = 0.2;
    headGroup.add(brim);

    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.55, 8), hatMat);
    cone.position.set(0, 0.48, -0.05);
    cone.rotation.x = -0.15;
    headGroup.add(cone);

    // Beard
    const beard = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.48, 6), beardMat);
    beard.position.set(0, -0.15, 0.22);
    beard.rotation.x = 0.15;
    headGroup.add(beard);

    // Walking Staff
    const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.7, 6), woodMat);
    staff.position.set(0.5, 0.1, 0.25);
    staff.rotation.z = -0.08;
    staff.castShadow = true;
    body.add(staff);

    // Staff Crystal
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), crystalMat);
    crystal.position.set(0.52, 1.0, 0.25);
    body.add(crystal);

    // Overhead Prompt Billboard
    const prompt = this._createPromptSprite('💬 [E] Explorer Finn');
    prompt.position.y = 2.15;
    group.add(prompt);

    let finnModel = null;
    this._loadNPCModel('./assets/characters/Mage.glb', group, body, 0.85, (gltf, model) => {
      finnModel = model;
    });

    this.scene.add(group);

    this.npcs.push({
      id: 'finn',
      name: 'Old Explorer Finn',
      dialogueKey: 'finn_intro',
      group,
      body,
      headGroup,
      crystal,
      prompt,
      position: new THREE.Vector3(x, y, z),
      interactionDist: 3.8,
      update: (delta, time, playerPos) => {
        // Idle breathing bob
        body.position.y = 0.75 + Math.sin(time * 2.0) * 0.025;
        crystal.rotation.y += delta * 2.0;
        crystal.rotation.x += delta * 1.0;
        if (finnModel) {
          finnModel.position.y = Math.sin(time * 2.0) * 0.03;
        }

        // Turn head slightly toward player when near
        const d = playerPos.distanceTo(group.position);
        if (d < 7.0) {
          const dx = playerPos.x - group.position.x;
          const dz = playerPos.z - group.position.z;
          const angle = Math.atan2(dx, dz) - group.rotation.y;
          headGroup.rotation.y = THREE.MathUtils.clamp(angle, -0.8, 0.8);
          if (finnModel) {
            finnModel.rotation.y = THREE.MathUtils.clamp(angle, -0.8, 0.8);
          }
        } else {
          headGroup.rotation.y = 0;
          if (finnModel) {
            finnModel.rotation.y = 0;
          }
        }
      },
    });
  }

  // ─── 2. Woodsman Bram (Bridge / Tier 1) ──────────────────────────────────
  _createWoodsmanBram() {
    const group = new THREE.Group();
    const x = 1.0, z = -13.0;
    const y = this.world.getGroundHeight(x, z);
    group.position.set(x, y, z);
    group.rotation.y = 0; // Look toward bridge approach

    // Materials
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xe0ac69, roughness: 0.7 });
    const flannelMat = new THREE.MeshStandardMaterial({ color: 0xbf616a, roughness: 0.8, flatShading: true });
    const vestMat = new THREE.MeshStandardMaterial({ color: 0x4c566a, roughness: 0.8 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x3b4252, roughness: 0.8 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0xd8dee9, metalness: 0.8, roughness: 0.3 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5a3d28, roughness: 0.8 });

    // Body Container
    const body = new THREE.Group();
    body.position.y = 0.8;
    group.add(body);

    // Torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.65, 0.42), flannelMat);
    torso.castShadow = true;
    body.add(torso);

    const vest = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.58, 0.44), vestMat);
    body.add(vest);

    // Legs
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.75, 0.28), pantsMat);
    legL.position.set(-0.18, -0.65, 0);
    legL.castShadow = true;
    body.add(legL);

    const legR = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.75, 0.28), pantsMat);
    legR.position.set(0.18, -0.65, 0);
    legR.castShadow = true;
    body.add(legR);

    // Head
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.68, 0);
    body.add(headGroup);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.4, 0.38), skinMat);
    head.castShadow = true;
    headGroup.add(head);

    // Trapper Cap
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.2, 0.42), vestMat);
    cap.position.y = 0.22;
    headGroup.add(cap);

    // Big Lumberjack Axe
    const axeHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.4, 6), woodMat);
    axeHandle.position.set(0.48, 0.15, -0.15);
    axeHandle.rotation.x = 0.2;
    body.add(axeHandle);

    const axeBlade = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.42, 0.32), metalMat);
    axeBlade.position.set(0.48, 0.72, -0.22);
    axeBlade.castShadow = true;
    body.add(axeBlade);

    // Overhead Prompt Billboard
    const prompt = this._createPromptSprite('💬 [E] Bram Woodcutter');
    prompt.position.y = 2.25;
    group.add(prompt);

    let bramModel = null;
    this._loadNPCModel('./assets/characters/Barbarian.glb', group, body, 0.85, (gltf, model) => {
      bramModel = model;
    });

    this.scene.add(group);

    this.npcs.push({
      id: 'bram',
      name: 'Bram the Woodcutter',
      dialogueKey: 'bram_intro',
      group,
      body,
      headGroup,
      prompt,
      position: new THREE.Vector3(x, y, z),
      interactionDist: 3.8,
      update: (delta, time, playerPos) => {
        body.position.y = 0.8 + Math.sin(time * 1.8 + 1) * 0.02;
        if (bramModel) {
          bramModel.position.y = Math.sin(time * 1.8 + 1) * 0.025;
        }

        const d = playerPos.distanceTo(group.position);
        if (d < 7.0) {
          const dx = playerPos.x - group.position.x;
          const dz = playerPos.z - group.position.z;
          const angle = Math.atan2(dx, dz) - group.rotation.y;
          headGroup.rotation.y = THREE.MathUtils.clamp(angle, -0.9, 0.9);
          if (bramModel) {
            bramModel.rotation.y = THREE.MathUtils.clamp(angle, -0.9, 0.9);
          }
        } else {
          headGroup.rotation.y = 0;
          if (bramModel) {
            bramModel.rotation.y = 0;
          }
        }
      },
    });
  }

  // ─── 3. Forest Spirit (Peak Summit / Tier 2) ─────────────────────────────
  _createForestSpirit() {
    const group = new THREE.Group();
    const x = 18.0, z = 18.0;
    const y = this.world.getGroundHeight(x, z);
    group.position.set(x, y, z);

    // Celestial Spirit Body
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x88ffcc,
      emissive: 0x00ffaa,
      emissiveIntensity: 0.9,
      roughness: 0.1,
      metalness: 0.2,
      wireframe: false,
    });

    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x55ffdd,
      wireframe: true,
      transparent: true,
      opacity: 0.5,
    });

    const body = new THREE.Group();
    body.position.y = 1.35;
    group.add(body);

    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.38, 1), coreMat);
    core.castShadow = true;
    body.add(core);

    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.65, 0.04, 8, 24), haloMat);
    halo.rotation.x = Math.PI * 0.5;
    body.add(halo);

    // Orbiting mini wisps
    const wisps = [];
    const wispGeo = new THREE.DodecahedronGeometry(0.09, 0);
    const wispMat = new THREE.MeshBasicMaterial({ color: 0xa8ffea });

    for (let i = 0; i < 3; i++) {
      const wisp = new THREE.Mesh(wispGeo, wispMat);
      body.add(wisp);
      wisps.push({
        mesh: wisp,
        offset: (i * Math.PI * 2) / 3,
        dist: 0.75,
        speed: 2.2,
      });
    }

    // Gentle PointLight illuminating the summit
    const spiritLight = new THREE.PointLight(0x00ffaa, 1.8, 8);
    spiritLight.position.set(0, 0, 0);
    body.add(spiritLight);

    // Overhead Prompt Billboard
    const prompt = this._createPromptSprite('✨ [E] Forest Spirit');
    prompt.position.y = 2.3;
    group.add(prompt);

    let spiritMixer = null;
    let spiritModel = null;
    this._loadNPCModel('./assets/monsters/Ghost.gltf', group, null, 0.75, (gltf, model) => {
      spiritModel = model;
      core.visible = false;
      halo.visible = false;
      model.position.y = 0.8;
      if (gltf.animations && gltf.animations.length > 0) {
        spiritMixer = new THREE.AnimationMixer(model);
        const clip = gltf.animations.find(a => a.name === 'Flying_Idle') || gltf.animations[0];
        if (clip) {
          spiritMixer.clipAction(clip).play();
        }
      }
    });

    this.scene.add(group);

    this.npcs.push({
      id: 'spirit',
      name: 'Spirit of the Forest',
      dialogueKey: 'spirit_intro',
      group,
      body,
      core,
      halo,
      wisps,
      prompt,
      position: new THREE.Vector3(x, y, z),
      interactionDist: 4.2,
      update: (delta, time) => {
        if (spiritMixer) {
          spiritMixer.update(delta);
        }
        if (spiritModel) {
          spiritModel.position.y = 0.8 + Math.sin(time * 2.5) * 0.15;
          spiritModel.rotation.y += delta * 0.4;
        }

        // Floating Sine Hover
        body.position.y = 1.35 + Math.sin(time * 2.5) * 0.22;
        core.rotation.y += delta * 1.5;
        core.rotation.x += delta * 0.8;
        halo.rotation.z += delta * 0.6;
        halo.rotation.y = Math.sin(time * 1.5) * 0.2;

        wisps.forEach(w => {
          const a = time * w.speed + w.offset;
          w.mesh.position.set(
            Math.cos(a) * w.dist,
            Math.sin(a * 2) * 0.2,
            Math.sin(a) * w.dist
          );
        });
      },
    });
  }

  // ─── Overhead Dynamic Billboard Sprite ──────────────────────────────────
  _createPromptSprite(text) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 80;
    const ctx = canvas.getContext('2d');

    // Rounded bubble background
    ctx.fillStyle = 'rgba(12, 34, 18, 0.85)';
    ctx.strokeStyle = '#58d68d';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(10, 10, 236, 60, 24);
    ctx.fill();
    ctx.stroke();

    // Text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 40);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(1.8, 0.55, 1.0);
    sprite.visible = false;
    return sprite;
  }

  // ─── Update Loop ────────────────────────────────────────────────────────
  update(delta, playerPos) {
    const time = performance.now() * 0.001;
    let closestNPC = null;
    let closestDist = Infinity;

    for (const npc of this.npcs) {
      npc.update(delta, time, playerPos);

      const dist = playerPos.distanceTo(npc.position);
      const inRange = dist <= npc.interactionDist;

      // Animate overhead prompt
      if (inRange) {
        npc.prompt.visible = true;
        const pulse = 1.0 + Math.sin(time * 4) * 0.08;
        npc.prompt.scale.set(1.8 * pulse, 0.55 * pulse, 1.0);

        if (dist < closestDist) {
          closestDist = dist;
          closestNPC = npc;
        }
      } else {
        npc.prompt.visible = false;
      }
    }

    this.activeNearbyNPC = closestNPC;
    return closestNPC;
  }

  getNearbyNPC() {
    return this.activeNearbyNPC;
  }

  _loadNPCModel(path, group, fallbackMesh, scale = 1.0, onLoaded = null) {
    const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;
    if (isNode || typeof window === 'undefined' || !this.loader) return;
    this.loader.load(
      path,
      (gltf) => {
        const model = gltf.scene;
        model.scale.set(scale, scale, scale);
        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        group.add(model);
        if (fallbackMesh) {
          fallbackMesh.visible = false;
        }
        if (onLoaded) {
          onLoaded(gltf, model);
        }
      },
      undefined,
      (err) => {
        console.warn(`[NPCManager] Model load fallback for ${path}:`, err);
      }
    );
  }
}
