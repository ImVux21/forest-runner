// ===================================================
// Player3D.js — 360° Free-Roam 3D Adventurer Controller
// Paraglider, Sprinting, Bouncy Mushroom Physics & Wardrobe Skins
// ===================================================
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const WALK_SPEED = 10.5;
const SPRINT_SPEED = 17.0;
const GLIDE_SPEED = 14.5;
const TURN_SMOOTH_SPEED = 14.0;
const JUMP_FORCE = 12.5;
const GRAVITY = -28.0;
const GLIDE_FALL_SPEED = -2.0;

export class Player3D {
  constructor(scene) {
    this.scene = scene;
    this.mesh = null;
    this.boundingBox = new THREE.Box3();

    // 3D World Transform
    this.position = new THREE.Vector3(0, 0, 0);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.velocityY = 0;
    this.facingAngle = 0;
    this.targetAngle = 0;

    // Movement & Exploration States
    this.isGrounded = true;
    this.isMoving = false;
    this.isSprinting = false;
    this.isGliding = false;
    this.runCycle = 0;
    this.jumpCooldown = 0;
    this.boostTimer = 0;
    this.squashTimer = 0;
    this.squashIntensity = 0;
    this.onLand = null;
    this.onBounce = null;
    this.onUpdraft = null;
    this.onVoidActivation = null;
    this.voidBoostTimer = 0;

    // Character 3D Model & Skeletal Animations
    this.characterModel = null;
    this.animMixer = null;
    this.animActions = {};
    this.currentAction = null;
    this.currentSkin = 'blue';
    this.animationClips = null;
    this.loader = typeof window !== 'undefined' ? new GLTFLoader() : null;

    // Rig references
    this.rig = {
      bodyGroup: null,
      proceduralBody: null,
      torso: null,
      head: null,
      leftArm: null,
      rightArm: null,
      leftLeg: null,
      rightLeg: null,
      scarfTail: null,
      backpack: null,
      glider: null,
      jacketMesh: null,
      headbandMesh: null,
    };
  }

  async init() {
    this._createAdventurerMesh();
    if (typeof window !== 'undefined') {
      this._loadCharacterAssets();
    }
  }

  _createAdventurerMesh() {
    const root = new THREE.Group();

    // Materials
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xffdfb8, roughness: 0.7 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x3d2214, roughness: 0.8, flatShading: true });
    const headbandMat = new THREE.MeshStandardMaterial({ color: 0xe74c3c, roughness: 0.6 });
    const jacketMat = new THREE.MeshStandardMaterial({ color: 0x2b6cb0, roughness: 0.7, flatShading: true });
    const shirtMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });
    const beltMat = new THREE.MeshStandardMaterial({ color: 0x5a3818, roughness: 0.9 });
    const buckleMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f, metalness: 0.8, roughness: 0.3 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x2d3748, roughness: 0.8 });
    const bootMat = new THREE.MeshStandardMaterial({ color: 0x4a2c11, roughness: 0.8 });
    const scarfMat = new THREE.MeshStandardMaterial({ color: 0xe67e22, roughness: 0.7 });
    const packMat = new THREE.MeshStandardMaterial({ color: 0x6e4726, roughness: 0.85 });

    // Root Body Container
    const bodyGroup = new THREE.Group();
    bodyGroup.position.y = 0.75;
    root.add(bodyGroup);
    this.rig.bodyGroup = bodyGroup;

    // Procedural Fallback Mesh Container
    const procBody = new THREE.Group();
    bodyGroup.add(procBody);
    this.rig.proceduralBody = procBody;

    // Torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.6, 0.36), jacketMat);
    torso.position.y = 0.15;
    torso.castShadow = true;
    torso.receiveShadow = true;
    procBody.add(torso);
    this.rig.torso = torso;
    this.rig.jacketMesh = torso;

    // Collar
    const collar = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.2, 0.08), shirtMat);
    collar.position.set(0, 0.22, 0.17);
    procBody.add(collar);

    // Belt & Buckle
    const belt = new THREE.Mesh(new THREE.BoxGeometry(0.57, 0.12, 0.38), beltMat);
    belt.position.y = -0.12;
    procBody.add(belt);

    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.04), buckleMat);
    buckle.position.set(0, -0.12, 0.2);
    procBody.add(buckle);

    // Backpack
    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.44, 0.22), packMat);
    pack.position.set(0, 0.16, -0.27);
    pack.castShadow = true;
    procBody.add(pack);

    const flap = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.16, 0.06), beltMat);
    flap.position.set(0, 0.26, -0.37);
    procBody.add(flap);
    this.rig.backpack = pack;

    // Head & Hair
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.65, 0);
    procBody.add(headGroup);
    this.rig.head = headGroup;

    const face = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.42, 0.4), skinMat);
    face.castShadow = true;
    headGroup.add(face);

    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.24, 0.44), hairMat);
    hair.position.set(0, 0.18, -0.02);
    headGroup.add(hair);

    const fringeGeo = new THREE.ConeGeometry(0.12, 0.2, 4);
    for (let i = -1; i <= 1; i++) {
      const spike = new THREE.Mesh(fringeGeo, hairMat);
      spike.rotation.x = Math.PI / 2 + 0.3;
      spike.rotation.z = i * 0.4;
      spike.position.set(i * 0.12, 0.22, 0.22);
      headGroup.add(spike);
    }

    // Headband
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.09, 0.42), headbandMat);
    band.position.set(0, 0.08, 0);
    headGroup.add(band);
    this.rig.headbandMesh = band;

    // Eyes
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1a202c });
    const eyeGeo = new THREE.BoxGeometry(0.08, 0.09, 0.04);
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.11, 0.02, 0.21);
    headGroup.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.11, 0.02, 0.21);
    headGroup.add(rightEye);

    // Scarf
    const scarfWrap = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.12, 0.44), scarfMat);
    scarfWrap.position.set(0, 0.45, 0);
    procBody.add(scarfWrap);

    const ribbonGroup = new THREE.Group();
    ribbonGroup.position.set(0.12, 0.45, -0.22);
    const ribbon = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.42, 0.04), scarfMat);
    ribbon.position.set(0, -0.18, 0);
    ribbon.rotation.x = 0.4;
    ribbonGroup.add(ribbon);
    procBody.add(ribbonGroup);
    this.rig.scarfTail = ribbonGroup;

    // Arms
    const armGeo = new THREE.BoxGeometry(0.16, 0.48, 0.16);

    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(-0.35, 0.38, 0);
    const leftArmMesh = new THREE.Mesh(armGeo, jacketMat);
    leftArmMesh.position.y = -0.2;
    leftArmMesh.castShadow = true;
    leftArmGroup.add(leftArmMesh);
    procBody.add(leftArmGroup);
    this.rig.leftArm = leftArmGroup;

    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(0.35, 0.38, 0);
    const rightArmMesh = new THREE.Mesh(armGeo, jacketMat);
    rightArmMesh.position.y = -0.2;
    rightArmMesh.castShadow = true;
    rightArmGroup.add(rightArmMesh);
    procBody.add(rightArmGroup);
    this.rig.rightArm = rightArmGroup;

    // Legs
    const legGeo = new THREE.BoxGeometry(0.2, 0.46, 0.22);
    const bootGeo = new THREE.BoxGeometry(0.22, 0.2, 0.3);

    const leftLegGroup = new THREE.Group();
    leftLegGroup.position.set(-0.16, -0.22, 0);
    const leftLegMesh = new THREE.Mesh(legGeo, pantsMat);
    leftLegMesh.position.y = -0.18;
    leftLegMesh.castShadow = true;
    leftLegGroup.add(leftLegMesh);
    const leftBoot = new THREE.Mesh(bootGeo, bootMat);
    leftBoot.position.set(0, -0.34, 0.04);
    leftBoot.castShadow = true;
    leftLegGroup.add(leftBoot);
    procBody.add(leftLegGroup);
    this.rig.leftLeg = leftLegGroup;

    const rightLegGroup = new THREE.Group();
    rightLegGroup.position.set(0.16, -0.22, 0);
    const rightLegMesh = new THREE.Mesh(legGeo, pantsMat);
    rightLegMesh.position.y = -0.18;
    rightLegMesh.castShadow = true;
    rightLegGroup.add(rightLegMesh);
    const rightBoot = new THREE.Mesh(bootGeo, bootMat);
    rightBoot.position.set(0, -0.34, 0.04);
    rightBoot.castShadow = true;
    rightLegGroup.add(rightBoot);
    procBody.add(rightLegGroup);
    this.rig.rightLeg = rightLegGroup;

    // ─── Majestic Aerodynamic Falcon-Wing Paraglider ─────────────────────────
    const gliderGroup = new THREE.Group();
    gliderGroup.position.set(0, 1.45, 0);

    // Premium Dark-Fantasy Wing Fabrics & Materials
    const canopyMat = new THREE.MeshStandardMaterial({
      color: 0x221538, // Royal midnight violet velvet
      roughness: 0.6,
      metalness: 0.2,
      side: THREE.DoubleSide,
    });
    const runeTrimMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b, // Eldoria glowing gold rune trim
      emissive: 0xd97706,
      emissiveIntensity: 0.6,
      roughness: 0.3,
      metalness: 0.8,
      side: THREE.DoubleSide,
    });
    const sparMat = new THREE.MeshStandardMaterial({
      color: 0x3e2723, // Polished dark mahogany oak
      roughness: 0.7,
      metalness: 0.1,
    });
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37, // Polished antique brass
      roughness: 0.35,
      metalness: 0.85,
    });
    const leatherGripMat = new THREE.MeshStandardMaterial({
      color: 0x78350f, // Wrapped saddle leather
      roughness: 0.8,
    });

    // 1. Central Backbone Keel
    const keel = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.35), sparMat);
    keel.position.set(0, 0.08, -0.15);
    keel.castShadow = true;
    gliderGroup.add(keel);

    // Glowing Central Heart Gem Crest
    const crestGem = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.11),
      new THREE.MeshStandardMaterial({
        color: 0x10b981,
        emissive: 0x059669,
        emissiveIntensity: 1.2,
        roughness: 0.2,
      })
    );
    crestGem.position.set(0, 0.15, 0.2);
    gliderGroup.add(crestGem);

    // 2. Swept Aerodynamic Dual Wings (Left & Right)
    for (const side of [-1, 1]) {
      // Main wing sail panel: Angled and swept backwards
      const wingGeo = new THREE.BufferGeometry();
      // Triangular wing vertices with curved dihedral: Apex, Wingtip, Trailing edge, Root trailing edge
      const vertices = new Float32Array([
        // Top face
        0, 0.1, 0.45,
        side * 1.45, -0.04, -0.35,
        side * 0.95, 0.02, -0.75,

        0, 0.1, 0.45,
        side * 0.95, 0.02, -0.75,
        0, 0.08, -0.65,
      ]);
      wingGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      wingGeo.computeVertexNormals();

      const wingMesh = new THREE.Mesh(wingGeo, canopyMat);
      wingMesh.castShadow = true;
      wingMesh.receiveShadow = true;
      gliderGroup.add(wingMesh);

      // Gold Embroidered Outer Border Trim
      const borderGeo = new THREE.CylinderGeometry(0.025, 0.025, 1.6, 5);
      const leadingEdge = new THREE.Mesh(borderGeo, sparMat);
      leadingEdge.position.set(side * 0.72, 0.04, 0.05);
      leadingEdge.rotation.z = side * -0.12;
      leadingEdge.rotation.y = side * 0.52;
      gliderGroup.add(leadingEdge);

      // Gilded Wingtip Eagle Talon Finial
      const talon = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.26, 5), brassMat);
      talon.position.set(side * 1.45, -0.04, -0.35);
      talon.rotation.x = Math.PI / 2;
      talon.rotation.z = side * -0.4;
      gliderGroup.add(talon);

      // Golden Rune Inlay Rib
      const ribGeo = new THREE.CylinderGeometry(0.018, 0.018, 1.1, 4);
      const rib = new THREE.Mesh(ribGeo, runeTrimMat);
      rib.position.set(side * 0.65, 0.05, -0.3);
      rib.rotation.y = side * -0.35;
      gliderGroup.add(rib);

      // 3. Ergonomic Suspension Struts & Hanging Leather Hand Grips
      const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.85, 6), sparMat);
      strut.position.set(side * 0.45, -0.35, 0.08);
      strut.rotation.z = side * -0.25;
      strut.rotation.x = 0.1;
      gliderGroup.add(strut);

      // Leather Wrapped Grip
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.28, 6), leatherGripMat);
      grip.position.set(side * 0.36, -0.68, 0.12);
      grip.rotation.z = Math.PI / 2;
      gliderGroup.add(grip);

      // Brass Grip Fittings
      for (const gy of [-0.14, 0.14]) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.015, 6, 8), brassMat);
        ring.position.set(side * 0.36 + gy, -0.68, 0.12);
        ring.rotation.y = Math.PI / 2;
        gliderGroup.add(ring);
      }

      // Trailing Royal Silk Streamer (Flutters behind each wingtip)
      const streamer = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.01, 0.65), runeTrimMat);
      streamer.position.set(side * 1.25, -0.06, -0.65);
      streamer.rotation.x = 0.15;
      gliderGroup.add(streamer);
    }

    gliderGroup.visible = false;
    bodyGroup.add(gliderGroup);
    this.rig.glider = gliderGroup;

    this.mesh = root;
    this.mesh.position.copy(this.position);
    this.scene.add(this.mesh);
  }

  // ─── Reset ────────────────────────────────────────────────────────────────

  reset(spawnX = 0, spawnZ = 0) {
    this.position.set(spawnX, 0, spawnZ);
    this.velocity.set(0, 0, 0);
    this.velocityY = 0;
    this.facingAngle = 0;
    this.targetAngle = 0;
    this.isGrounded = true;
    this.isMoving = false;
    this.isSprinting = false;
    this.isGliding = false;
    this.runCycle = 0;

    if (this.mesh) {
      this.mesh.position.copy(this.position);
      this.mesh.rotation.y = 0;
    }
    if (this.rig.glider) {
      this.rig.glider.visible = false;
    }
  }

  // ─── Set Character Wardrobe Skin ──────────────────────────────────────────

  setSkin(skinType) {
    this.currentSkin = skinType;
    if (typeof window !== 'undefined' && this.loader) {
      this._loadSkinModel(skinType);
    }

    if (!this.rig.jacketMesh || !this.rig.headbandMesh) return;
    const colors = {
      blue:    { jacket: 0x2b6cb0, band: 0xe74c3c }, // Hero Explorer
      knight:  { jacket: 0x2e7d32, band: 0xf1c40f }, // Forest Knight
      mage:    { jacket: 0x6b21a8, band: 0xa855f7 }, // Shadow Mage
      crimson: { jacket: 0xc53030, band: 0xffd700 }, // Crimson Hunter
    };
    const s = colors[skinType] || colors.blue;
    this.rig.jacketMesh.material = new THREE.MeshStandardMaterial({ color: s.jacket, roughness: 0.7, flatShading: true });
    this.rig.headbandMesh.material = new THREE.MeshStandardMaterial({ color: s.band, roughness: 0.6 });
  }

  _loadCharacterAssets() {
    const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;
    if (isNode || typeof window === 'undefined' || !this.loader) return;

    // Load Movement basic animations first
    this.loader.load(
      './assets/characters/Rig_Medium_MovementBasic.glb',
      (movGltf) => {
        this.loader.load(
          './assets/characters/Rig_Medium_General.glb',
          (genGltf) => {
            const idleClip = genGltf.animations.find(a => a.name === 'Idle_A') || genGltf.animations[0];
            const walkClip = movGltf.animations.find(a => a.name === 'Walking_A');
            const runClip = movGltf.animations.find(a => a.name === 'Running_A');
            const jumpClip = movGltf.animations.find(a => a.name === 'Jump_Full_Short' || a.name === 'Jump_Idle');

            this.animationClips = {
              idle: idleClip,
              walk: walkClip,
              run: runClip,
              jump: jumpClip,
            };

            this._loadSkinModel(this.currentSkin);
          },
          undefined,
          (err) => {
            console.warn('[Player3D] General animations load error:', err);
            this._loadSkinModel(this.currentSkin);
          }
        );
      },
      undefined,
      (err) => {
        console.warn('[Player3D] Movement animations load error:', err);
        this._loadSkinModel(this.currentSkin);
      }
    );
  }

  _loadSkinModel(skinName) {
    const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;
    if (isNode || typeof window === 'undefined' || !this.loader) return;

    const skinFiles = {
      blue: './assets/characters/Ranger.glb',
      knight: './assets/characters/Knight.glb',
      mage: './assets/characters/Mage.glb',
      crimson: './assets/characters/Rogue.glb',
    };

    const filePath = skinFiles[skinName] || skinFiles.blue;

    this.loader.load(
      filePath,
      (gltf) => {
        if (this.characterModel) {
          this.mesh.remove(this.characterModel);
          this.characterModel = null;
        }

        const model = gltf.scene;
        model.scale.set(0.85, 0.85, 0.85);
        model.position.set(0, 0, 0);
        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        this.characterModel = model;
        this.mesh.add(model);

        if (this.rig.proceduralBody) {
          this.rig.proceduralBody.visible = false;
        }

        if (this.animationClips) {
          this.animMixer = new THREE.AnimationMixer(model);
          this.animActions = {};
          if (this.animationClips.idle) this.animActions.idle = this.animMixer.clipAction(this.animationClips.idle);
          if (this.animationClips.walk) this.animActions.walk = this.animMixer.clipAction(this.animationClips.walk);
          if (this.animationClips.run) this.animActions.run = this.animMixer.clipAction(this.animationClips.run);
          if (this.animationClips.jump) this.animActions.jump = this.animMixer.clipAction(this.animationClips.jump);

          if (this.animActions.idle) {
            this.currentAction = this.animActions.idle;
            this.currentAction.play();
          }
        }
      },
      undefined,
      (err) => {
        console.warn(`[Player3D] Failed to load skin ${skinName} (${filePath}):`, err);
      }
    );
  }

  _transitionToAction(newAction, duration = 0.15) {
    if (!newAction || this.currentAction === newAction) return;
    const oldAction = this.currentAction;
    this.currentAction = newAction;
    if (oldAction) {
      oldAction.fadeOut(duration);
    }
    newAction.reset().fadeIn(duration).play();
  }

  // ─── Main Physics & Movement Update ───────────────────────────────────────

  update(delta, inputDir, isJumpPressed, isSprintPressed, isGlidePressed, camera, world) {
    this.jumpCooldown = Math.max(0, this.jumpCooldown - delta);
    this.isSprinting = isSprintPressed && this.isGrounded;

    // 1. Calculate Camera-Relative Movement
    const forward = camera.getForwardVector();
    const right = camera.getRightVector();

    const moveVector = new THREE.Vector3();
    if (inputDir.z !== 0) moveVector.addScaledVector(forward, -inputDir.z);
    if (inputDir.x !== 0) moveVector.addScaledVector(right, inputDir.x);

    this.isMoving = moveVector.lengthSq() > 0.01;

    // Speed calculation (Walk vs Sprint vs Gliding)
    let currentSpeed = WALK_SPEED;
    if (this.isGliding) currentSpeed = GLIDE_SPEED;
    else if (this.isSprinting) currentSpeed = SPRINT_SPEED;

    // Aerial thermal wind ring boost modifier
    if (this.boostTimer > 0) {
      this.boostTimer = Math.max(0, this.boostTimer - delta);
      currentSpeed *= 1.45;
    }

    // Arcane Void Boost speed modifier
    if (this.voidBoostTimer > 0) {
      this.voidBoostTimer = Math.max(0, this.voidBoostTimer - delta);
      currentSpeed *= 1.35;
    }

    if (this.isMoving) {
      moveVector.normalize();
      this.targetAngle = Math.atan2(moveVector.x, moveVector.z);

      let diff = this.targetAngle - this.facingAngle;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.facingAngle += diff * Math.min(1.0, TURN_SMOOTH_SPEED * delta);

      this.velocity.x = moveVector.x * currentSpeed;
      this.velocity.z = moveVector.z * currentSpeed;
    } else {
      this.velocity.x *= 0.1;
      this.velocity.z *= 0.1;
    }

    // 2. Bouncy Mushroom Spring Check
    const mushroomBouncePower = world.checkMushroomBounce(this.position);
    if (mushroomBouncePower > 0) {
      this.velocityY = mushroomBouncePower;
      this.isGrounded = false;
      this.isGliding = false;
      this.squashTimer = 0.16;
      this.squashIntensity = 0.9;
      if (this.onBounce) this.onBounce();
      if (camera && typeof camera.addTrauma === 'function') {
        camera.addTrauma(0.5);
      }
    }

    // 2b. Updraft Thermal Vents Check (Blue beam shooting into sky)
    if (world.checkUpdraftVent) {
      const updraftPower = world.checkUpdraftVent(this.position);
      if (updraftPower > 0) {
        this.velocityY = updraftPower;
        this.isGrounded = false;
        this.isGliding = false; // Must be false during rocket boost so velocity is not clamped!
        if (this.onUpdraft) this.onUpdraft(updraftPower);
        if (camera && typeof camera.addTrauma === 'function') {
          camera.addTrauma(0.4);
        }
      }
    }

    // 2c. Arcane Void Spire Check (Purple beam in Cursed Forest shooting into sky at (0, 62))
    if (world.checkArcaneVoidBeam) {
      const voidResult = world.checkArcaneVoidBeam(this.position);
      if (voidResult && voidResult.active) {
        this.velocityY = voidResult.power || 26.0;
        this.isGrounded = false;
        this.isGliding = false;
        this.voidBoostTimer = 15.0; // 15 seconds floaty cosmic agility & speed
        if (this.onVoidActivation) this.onVoidActivation(voidResult);
        if (camera && typeof camera.addTrauma === 'function') {
          camera.addTrauma(0.65);
        }
      }
    }

    // 3. Jump & Glider Mechanics
    if (isJumpPressed && this.isGrounded && this.jumpCooldown <= 0) {
      this.velocityY = JUMP_FORCE;
      this.isGrounded = false;
      this.isGliding = false;
      this.jumpCooldown = 0.28;
    }

    // Toggle Glider in mid-air when holding Space/Jump near apex or falling
    if (!this.isGrounded && this.velocityY < 4.0 && (isGlidePressed || isJumpPressed)) {
      this.isGliding = true;
    }

    // 4. Proposed Movement & Boundary
    const nextX = this.position.x + this.velocity.x * delta;
    const nextZ = this.position.z + this.velocity.z * delta;

    const halfBound = (world.mapSize / 2) - 3.5;
    const clampedX = THREE.MathUtils.clamp(nextX, -halfBound, halfBound);
    const clampedZ = THREE.MathUtils.clamp(nextZ, -halfBound, halfBound);

    // 5. Cliff Collision
    const nextGroundY = world.getGroundHeight(clampedX, clampedZ, this.position.y);
    const heightDiff = nextGroundY - this.position.y;

    if (heightDiff > 1.2 && this.isGrounded) {
      this.velocity.x = 0;
      this.velocity.z = 0;
    } else {
      this.position.x = clampedX;
      this.position.z = clampedZ;
    }

    // Interactive Aerial Wind Ring Boost (gliding through rings boosts flight)
    if (this.isGliding && world.checkWindRingBoost) {
      const boosted = world.checkWindRingBoost(this.position);
      if (boosted) {
        this.boostTimer = 3.0; // Boost speed for 3 seconds
        this.velocityY = 3.5;  // Slight updraft lift
      }
    }

    // 6. Vertical Physics & Glider Aerodynamics
    const groundY = world.getGroundHeight(this.position.x, this.position.z, this.position.y);

    if (this.isGrounded) {
      this.isGliding = false;
      if (Math.abs(this.position.y - groundY) < 0.6) {
        this.position.y = groundY;
        this.velocityY = 0;
      } else if (this.position.y > groundY + 0.6) {
        this.isGrounded = false;
      }
    } else {
      if (this.isGliding) {
        // Slow peaceful parachute descent
        this.velocityY = GLIDE_FALL_SPEED;
      } else {
        const effGravity = this.voidBoostTimer > 0 ? GRAVITY * 0.6 : GRAVITY;
        this.velocityY += effGravity * delta;
      }

      this.position.y += this.velocityY * delta;

      // Landing
      if (this.position.y <= groundY) {
        const fallSpeed = Math.abs(this.velocityY);
        if (fallSpeed > 3.5) {
          this.squashTimer = 0.16;
          this.squashIntensity = Math.min(1.0, fallSpeed / 16.0);
          if (this.onLand) this.onLand(this.squashIntensity);
        }
        if (this.velocityY < -14 && camera && typeof camera.addTrauma === 'function') {
          camera.addTrauma(0.35);
        }
        this.position.y = groundY;
        this.velocityY = 0;
        this.isGrounded = true;
        this.isGliding = false;
      }
    }

    // 7. Update Glider Visibility & Dynamic Aerodynamic Banking
    if (this.rig.glider) {
      this.rig.glider.visible = this.isGliding;
      if (this.isGliding) {
        const flutter = Math.sin(performance.now() * 0.008) * 0.035;
        const bank = inputDir ? inputDir.x * 0.22 : 0;
        this.rig.glider.rotation.z = bank + flutter;
        this.rig.glider.rotation.x = 0.12;
      }
    }

    // 8. Transform & Procedural Animations
    if (this.mesh) {
      this.mesh.position.copy(this.position);
      this.mesh.rotation.y = this.facingAngle;

      this._updateAnimations(delta);
      this.boundingBox.setFromObject(this.mesh);
    }
  }

  // ─── Procedural & Skeletal Animations ───────────────────────────────────────

  _updateAnimations(delta) {
    if (this.animMixer && this.characterModel) {
      let targetAction = this.animActions.idle;
      if (!this.isGrounded) {
        targetAction = this.animActions.jump || this.animActions.idle;
      } else if (this.isMoving) {
        targetAction = (this.isSprinting && this.animActions.run)
          ? this.animActions.run
          : (this.animActions.walk || this.animActions.run || this.animActions.idle);
      } else {
        targetAction = this.animActions.idle;
      }

      this._transitionToAction(targetAction);
      this.animMixer.update(delta);
      return;
    }

    if (!this.rig.bodyGroup) return;

    // Apply squash and stretch decay
    if (this.squashTimer > 0) {
      this.squashTimer -= delta;
      const s = Math.max(0, this.squashTimer / 0.16) * this.squashIntensity;
      this.rig.bodyGroup.scale.set(1.0 + s * 0.35, 1.0 - s * 0.45, 1.0 + s * 0.35);
    } else {
      this.rig.bodyGroup.scale.set(1, 1, 1);
    }

    if (this.isGrounded) {
      if (this.isMoving) {
        const speedMult = this.isSprinting ? 2.3 : 1.5;
        this.runCycle += delta * WALK_SPEED * speedMult;
        const t = this.runCycle;
        const legSwing = Math.sin(t) * 0.75;

        this.rig.leftLeg.rotation.x = legSwing;
        this.rig.rightLeg.rotation.x = -legSwing;
        this.rig.leftArm.rotation.x = -legSwing * 0.9;
        this.rig.rightArm.rotation.x = legSwing * 0.9;

        const bob = Math.abs(Math.sin(t)) * 0.08;
        this.rig.bodyGroup.position.y = 0.75 + bob;
        this.rig.torso.rotation.x = this.isSprinting ? 0.25 : 0.14;

        this.rig.scarfTail.rotation.x = 0.6 + Math.sin(t * 1.8) * 0.45;
      } else {
        const breath = Math.sin(performance.now() * 0.003) * 0.03;
        this.rig.bodyGroup.position.y = 0.75 + breath;
        this.rig.torso.rotation.x = 0;
        this.rig.leftLeg.rotation.x = 0;
        this.rig.rightLeg.rotation.x = 0;
        this.rig.leftArm.rotation.x = 0;
        this.rig.rightArm.rotation.x = 0;
        this.rig.scarfTail.rotation.x = 0.3;
      }
    } else {
      if (this.isGliding) {
        // Holding glider handles overhead
        this.rig.bodyGroup.position.y = 0.75;
        this.rig.torso.rotation.x = 0.15;
        this.rig.leftArm.rotation.x = -2.2;
        this.rig.rightArm.rotation.x = -2.2;
        this.rig.leftArm.rotation.z = -0.4;
        this.rig.rightArm.rotation.z = 0.4;
        this.rig.leftLeg.rotation.x = 0.2;
        this.rig.rightLeg.rotation.x = 0.1;
        this.rig.scarfTail.rotation.x = 1.3;
      } else {
        // Free fall / jump
        this.rig.bodyGroup.position.y = 0.75;
        this.rig.torso.rotation.x = 0.25;
        this.rig.leftLeg.rotation.x = 0.75;
        this.rig.rightLeg.rotation.x = 0.5;
        this.rig.leftArm.rotation.x = -0.9;
        this.rig.rightArm.rotation.x = -0.9;
        this.rig.leftArm.rotation.z = -0.3;
        this.rig.rightArm.rotation.z = 0.3;
        this.rig.scarfTail.rotation.x = 1.1;
      }
    }
  }

  getPosition() {
    return this.position;
  }

  getBoundingBox() {
    return this.boundingBox;
  }
}
