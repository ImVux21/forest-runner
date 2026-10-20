// ===================================================
// Player.js — Stylized Low-Poly Adventurer Runner
// Fully-rigged blocky adventurer with animated limbs, flowing scarf & jump poses
// ===================================================
import * as THREE from 'three';

const LANE_WIDTH = 2.5;
// In Three.js looking towards +Z, +X is screen-left and -X is screen-right
const LANES = [LANE_WIDTH, 0, -LANE_WIDTH];
const JUMP_FORCE = 13.5;
const GRAVITY = -32;
const LANE_MOVE_SPEED = 15;

export class Player {
  constructor(scene) {
    this.scene = scene;
    this.mesh = null;
    this.boundingBox = new THREE.Box3();

    // Movement state
    this.lane = 1;            // 0=left, 1=center, 2=right
    this.targetX = 0;
    this.currentX = 0;
    this.velocityY = 0;
    this.posY = 0;
    this.isGrounded = true;
    this.isInvincible = false;
    this.blinkTimer = 0;
    this.runCycle = 0;

    // Dust particles
    this.dustParticles = [];

    // Rig references for procedural animations
    this.rig = {
      bodyGroup: null,
      torso: null,
      head: null,
      leftArm: null,
      rightArm: null,
      leftLeg: null,
      rightLeg: null,
      scarfTail: null,
      backpack: null,
    };

    // Input debounce
    this.moveInputCooldown = 0;
    this.jumpInputCooldown = 0;
  }

  async init() {
    this._createAdventurerMesh();
  }

  _createAdventurerMesh() {
    const root = new THREE.Group();

    // ─── Materials ──────────────────────────────────────────────────────────
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xffdfb8, roughness: 0.7 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x3d2214, roughness: 0.8, flatShading: true });
    const headbandMat = new THREE.MeshStandardMaterial({ color: 0xe74c3c, roughness: 0.6 });
    const jacketMat = new THREE.MeshStandardMaterial({ color: 0x2b6cb0, roughness: 0.7, flatShading: true }); // Hero Blue
    const shirtMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });
    const beltMat = new THREE.MeshStandardMaterial({ color: 0x5a3818, roughness: 0.9 });
    const buckleMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f, metalness: 0.8, roughness: 0.3 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x2d3748, roughness: 0.8 });
    const bootMat = new THREE.MeshStandardMaterial({ color: 0x4a2c11, roughness: 0.8 });
    const scarfMat = new THREE.MeshStandardMaterial({ color: 0xe67e22, roughness: 0.7 }); // Orange explorer scarf
    const packMat = new THREE.MeshStandardMaterial({ color: 0x6e4726, roughness: 0.85 });

    // ─── Root Body Container ────────────────────────────────────────────────
    const bodyGroup = new THREE.Group();
    bodyGroup.position.y = 0.75; // Pivot center
    root.add(bodyGroup);
    this.rig.bodyGroup = bodyGroup;

    // ─── Torso ──────────────────────────────────────────────────────────────
    const torsoGeo = new THREE.BoxGeometry(0.55, 0.6, 0.36);
    const torso = new THREE.Mesh(torsoGeo, jacketMat);
    torso.position.y = 0.15;
    torso.castShadow = true;
    torso.receiveShadow = true;
    bodyGroup.add(torso);
    this.rig.torso = torso;

    // Shirt collar insert
    const collarGeo = new THREE.BoxGeometry(0.24, 0.2, 0.08);
    const collar = new THREE.Mesh(collarGeo, shirtMat);
    collar.position.set(0, 0.22, 0.17);
    bodyGroup.add(collar);

    // Belt & Buckle
    const beltGeo = new THREE.BoxGeometry(0.57, 0.12, 0.38);
    const belt = new THREE.Mesh(beltGeo, beltMat);
    belt.position.y = -0.12;
    bodyGroup.add(belt);

    const buckleGeo = new THREE.BoxGeometry(0.14, 0.14, 0.04);
    const buckle = new THREE.Mesh(buckleGeo, buckleMat);
    buckle.position.set(0, -0.12, 0.2);
    bodyGroup.add(buckle);

    // ─── Backpack ───────────────────────────────────────────────────────────
    const packGeo = new THREE.BoxGeometry(0.42, 0.44, 0.22);
    const pack = new THREE.Mesh(packGeo, packMat);
    pack.position.set(0, 0.16, -0.27);
    pack.castShadow = true;
    bodyGroup.add(pack);

    // Flap on backpack
    const flapGeo = new THREE.BoxGeometry(0.38, 0.16, 0.06);
    const flap = new THREE.Mesh(flapGeo, beltMat);
    flap.position.set(0, 0.26, -0.37);
    bodyGroup.add(flap);
    this.rig.backpack = pack;

    // ─── Head & Hair ────────────────────────────────────────────────────────
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.65, 0);
    bodyGroup.add(headGroup);
    this.rig.head = headGroup;

    // Face
    const faceGeo = new THREE.BoxGeometry(0.44, 0.42, 0.4);
    const face = new THREE.Mesh(faceGeo, skinMat);
    face.castShadow = true;
    headGroup.add(face);

    // Hair cap
    const hairGeo = new THREE.BoxGeometry(0.48, 0.24, 0.44);
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.set(0, 0.18, -0.02);
    headGroup.add(hair);

    // Hair spikes / fringe
    const fringeGeo = new THREE.ConeGeometry(0.12, 0.2, 4);
    for (let i = -1; i <= 1; i++) {
      const spike = new THREE.Mesh(fringeGeo, hairMat);
      spike.rotation.x = Math.PI / 2 + 0.3;
      spike.rotation.z = i * 0.4;
      spike.position.set(i * 0.12, 0.22, 0.22);
      headGroup.add(spike);
    }

    // Headband
    const bandGeo = new THREE.BoxGeometry(0.46, 0.09, 0.42);
    const band = new THREE.Mesh(bandGeo, headbandMat);
    band.position.set(0, 0.08, 0);
    headGroup.add(band);

    // Cartoon Eyes
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1a202c });
    const eyeGeo = new THREE.BoxGeometry(0.08, 0.09, 0.04);

    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.11, 0.02, 0.21);
    headGroup.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.11, 0.02, 0.21);
    headGroup.add(rightEye);

    // Eye catchlights (white shine)
    const shineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const shineGeo = new THREE.BoxGeometry(0.03, 0.03, 0.02);
    const lShine = new THREE.Mesh(shineGeo, shineMat);
    lShine.position.set(-0.1, 0.04, 0.23);
    headGroup.add(lShine);
    const rShine = new THREE.Mesh(shineGeo, shineMat);
    rShine.position.set(0.12, 0.04, 0.23);
    headGroup.add(rShine);

    // ─── Flowing Scarf ──────────────────────────────────────────────────────
    const scarfCollar = new THREE.BoxGeometry(0.48, 0.12, 0.44);
    const scarfWrap = new THREE.Mesh(scarfCollar, scarfMat);
    scarfWrap.position.set(0, 0.45, 0);
    bodyGroup.add(scarfWrap);

    // Trailing scarf ribbons
    const ribbonGroup = new THREE.Group();
    ribbonGroup.position.set(0.12, 0.45, -0.22);

    const ribbonGeo = new THREE.BoxGeometry(0.14, 0.42, 0.04);
    const ribbon = new THREE.Mesh(ribbonGeo, scarfMat);
    ribbon.position.set(0, -0.18, 0);
    ribbon.rotation.x = 0.4;
    ribbonGroup.add(ribbon);
    bodyGroup.add(ribbonGroup);
    this.rig.scarfTail = ribbonGroup;

    // ─── Arms (Left & Right with Shoulder Pivots) ───────────────────────────
    const armGeo = new THREE.BoxGeometry(0.16, 0.48, 0.16);

    // Left Arm
    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(-0.35, 0.38, 0);
    const leftArmMesh = new THREE.Mesh(armGeo, jacketMat);
    leftArmMesh.position.y = -0.2;
    leftArmMesh.castShadow = true;
    leftArmGroup.add(leftArmMesh);
    bodyGroup.add(leftArmGroup);
    this.rig.leftArm = leftArmGroup;

    // Right Arm
    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(0.35, 0.38, 0);
    const rightArmMesh = new THREE.Mesh(armGeo, jacketMat);
    rightArmMesh.position.y = -0.2;
    rightArmMesh.castShadow = true;
    rightArmGroup.add(rightArmMesh);
    bodyGroup.add(rightArmGroup);
    this.rig.rightArm = rightArmGroup;

    // ─── Legs (Left & Right with Hip Pivots) ─────────────────────────────────
    const legGeo = new THREE.BoxGeometry(0.2, 0.46, 0.22);
    const bootGeo = new THREE.BoxGeometry(0.22, 0.2, 0.3);

    // Left Leg
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

    bodyGroup.add(leftLegGroup);
    this.rig.leftLeg = leftLegGroup;

    // Right Leg
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

    bodyGroup.add(rightLegGroup);
    this.rig.rightLeg = rightLegGroup;

    // Setup Mesh in scene
    this.mesh = root;
    this.mesh.position.set(0, 0, 0);
    this.mesh.rotation.y = Math.PI; // Face forward (away from camera)
    this.scene.add(this.mesh);
  }

  // ─── State Reset ──────────────────────────────────────────────────────────

  reset() {
    this.lane = 1;
    this.targetX = LANES[1];
    this.currentX = LANES[1];
    this.velocityY = 0;
    this.posY = 0;
    this.isGrounded = true;
    this.isInvincible = false;
    this.moveInputCooldown = 0;
    this.jumpInputCooldown = 0;
    this.runCycle = 0;

    if (this.mesh) {
      this.mesh.position.set(LANES[1], 0, 0);
      this.mesh.visible = true;
      this.mesh.rotation.z = 0;
    }
  }

  // ─── Frame Update ─────────────────────────────────────────────────────────

  update(delta, input, speed) {
    this.moveInputCooldown = Math.max(0, this.moveInputCooldown - delta);
    this.jumpInputCooldown = Math.max(0, this.jumpInputCooldown - delta);

    // ─── 1. Lane Movement ───
    if (this.moveInputCooldown <= 0) {
      if (input.left && this.lane > 0) {
        this.lane--;
        this.targetX = LANES[this.lane];
        this.moveInputCooldown = 0.16;
      } else if (input.right && this.lane < 2) {
        this.lane++;
        this.targetX = LANES[this.lane];
        this.moveInputCooldown = 0.16;
      }
    }

    // ─── 2. Jump Physics ───
    if (this.jumpInputCooldown <= 0 && input.jump && this.isGrounded) {
      this.velocityY = JUMP_FORCE;
      this.isGrounded = false;
      this.jumpInputCooldown = 0.28;
    }

    if (!this.isGrounded) {
      this.velocityY += GRAVITY * delta;
      this.posY += this.velocityY * delta;
      if (this.posY <= 0) {
        this.posY = 0;
        this.velocityY = 0;
        this.isGrounded = true;
      }
    }

    // Smooth horizontal lane transition
    this.currentX += (this.targetX - this.currentX) * delta * LANE_MOVE_SPEED;

    // ─── 3. Procedural Skeletal Animations ───
    if (this.mesh && this.rig.bodyGroup) {
      this.mesh.position.x = this.currentX;
      this.mesh.position.y = this.posY;

      // Running frequency scales with speed
      this.runCycle += delta * speed * 2.2;
      const t = this.runCycle;

      if (this.isGrounded) {
        // Natural running gait
        const legSwing = Math.sin(t) * 0.75;
        this.rig.leftLeg.rotation.x = legSwing;
        this.rig.rightLeg.rotation.x = -legSwing;

        // Arms swing in counter-phase with legs
        this.rig.leftArm.rotation.x = -legSwing * 0.9;
        this.rig.rightArm.rotation.x = legSwing * 0.9;

        // Torso running bob & breath
        const bob = Math.abs(Math.sin(t)) * 0.08;
        this.rig.bodyGroup.position.y = 0.75 + bob;
        this.rig.torso.rotation.x = 0.12; // Slight forward aggressive lean
        this.rig.head.rotation.x = -0.08;

        // Trailing scarf flutter
        this.rig.scarfTail.rotation.x = 0.5 + Math.sin(t * 1.8) * 0.35;
        this.rig.scarfTail.rotation.z = Math.cos(t * 1.5) * 0.15;
      } else {
        // Dynamic acrobatic jump pose
        this.rig.bodyGroup.position.y = 0.75;
        this.rig.torso.rotation.x = 0.25; // Forward tuck

        // Legs bend backwards
        this.rig.leftLeg.rotation.x = 0.75;
        this.rig.rightLeg.rotation.x = 0.5;

        // Arms flared out / pumped forward
        this.rig.leftArm.rotation.x = -0.9;
        this.rig.rightArm.rotation.x = -0.9;
        this.rig.leftArm.rotation.z = -0.3;
        this.rig.rightArm.rotation.z = 0.3;

        // Scarf flies high
        this.rig.scarfTail.rotation.x = 1.1 + Math.sin(performance.now() * 0.01) * 0.2;
      }

      // Dynamic tilt when switching lanes
      const tiltTarget = (this.targetX - this.currentX) * 0.18;
      this.mesh.rotation.z += (tiltTarget - this.mesh.rotation.z) * delta * 10;
    }

    // ─── 4. Invincibility Flash ───
    if (this.mesh) {
      if (this.isInvincible) {
        this.blinkTimer += delta;
        this.mesh.visible = Math.sin(this.blinkTimer * 22) > 0;
      } else {
        this.mesh.visible = true;
      }
    }

    // ─── 5. Hitbox ───
    if (this.mesh) {
      this.boundingBox.setFromObject(this.mesh);
      // Tighten hitbox slightly for generous, fun collisions
      this.boundingBox.min.x += 0.25; this.boundingBox.min.y += 0.15; this.boundingBox.min.z += 0.25;
      this.boundingBox.max.x -= 0.25; this.boundingBox.max.y -= 0.1;  this.boundingBox.max.z -= 0.25;
    }
  }

  getBoundingBox() {
    return this.boundingBox;
  }

  getPosition() {
    return this.mesh ? this.mesh.position : new THREE.Vector3();
  }

  setInvincible(val) {
    this.isInvincible = val;
    this.blinkTimer = 0;
    if (!val && this.mesh) this.mesh.visible = true;
  }
}
