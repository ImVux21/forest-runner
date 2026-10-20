// ===================================================
// ThirdPersonCamera.js — Smooth 3D Orbit Chase Camera
// Follows target smoothly, orbits via mouse drag or Q/E keys, clamps pitch
// ===================================================
import * as THREE from 'three';

export class ThirdPersonCamera {
  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement || document.body;

    // Angles (radians)
    this.yaw = 0.0;           // Horizontal rotation
    this.pitch = 0.30;        // Vertical angle (slight look down)

    // Distance & Zoom (Widened for panoramic open-world feel)
    this.baseDistance = 11.0;
    this.distance = 11.0;
    this.targetDistance = 11.0;
    this.minDistance = 4.0;
    this.maxDistance = 24.0;

    // Smoothing & Tracking
    this.currentPosition = new THREE.Vector3();
    this.targetPosition = new THREE.Vector3();
    this.focusPoint = new THREE.Vector3();

    // Game Feel: Screen Shake / Trauma model
    this.trauma = 0.0;
    this.shakeOffset = new THREE.Vector3();

    // Mouse Drag State
    this.isDragging = false;
    this.prevMouseX = 0;
    this.prevMouseY = 0;
    this.sensitivity = 0.0035;

    this._bindEvents();
  }

  _bindEvents() {
    // 1. Mouse Drag Orbit
    this.domElement.addEventListener('mousedown', e => {
      // Allow drag with Left Click or Right Click
      if (e.target.closest('button, .hud-panel')) return;
      this.isDragging = true;
      this.prevMouseX = e.clientX;
      this.prevMouseY = e.clientY;
    });

    window.addEventListener('mousemove', e => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.prevMouseX;
      const dy = e.clientY - this.prevMouseY;
      this.prevMouseX = e.clientX;
      this.prevMouseY = e.clientY;

      this.yaw -= dx * this.sensitivity;
      this.pitch = THREE.MathUtils.clamp(
        this.pitch + dy * this.sensitivity,
        -0.48, // Allows looking up at sky, clouds, and tall mountain summits
        1.15   // Max pitch (looking down from above)
      );
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    // 2. Zoom via Wheel
    window.addEventListener('wheel', e => {
      this.targetDistance = THREE.MathUtils.clamp(
        this.targetDistance + e.deltaY * 0.006,
        this.minDistance,
        this.maxDistance
      );
    }, { passive: true });

    // 3. Touch Drag on Mobile
    let touchStartX = 0;
    let touchStartY = 0;
    this.domElement.addEventListener('touchstart', e => {
      if (e.touches.length === 1 && !e.target.closest('button, .hud-panel')) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }
    }, { passive: true });

    this.domElement.addEventListener('touchmove', e => {
      if (e.touches.length === 1 && !e.target.closest('button, .hud-panel')) {
        const dx = e.touches[0].clientX - touchStartX;
        const dy = e.touches[0].clientY - touchStartY;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;

        this.yaw -= dx * (this.sensitivity * 1.5);
        this.pitch = THREE.MathUtils.clamp(
          this.pitch + dy * (this.sensitivity * 1.5),
          -0.48,
          1.15
        );
      }
    }, { passive: true });
  }

  // ─── Game Feel: Camera Trauma / Screen Shake Hook ──────────────────────────
  addTrauma(amount) {
    this.trauma = Math.min(1.0, this.trauma + amount);
  }

  // ─── Keyboard Q / E Orbit Rotation ────────────────────────────────────────

  rotateManual(deltaYaw) {
    this.yaw += deltaYaw;
  }

  // ─── Camera Update ────────────────────────────────────────────────────────

  update(delta, playerPos, isSprinting = false, isGliding = false) {
    // 0. Dynamic distance based on player locomotion
    let targetDist = this.targetDistance;
    if (isGliding) targetDist += 2.5;
    else if (isSprinting) targetDist += 1.2;

    // 1. Smooth distance zoom
    this.distance += (targetDist - this.distance) * (1.0 - Math.exp(-8.0 * delta));

    // 2. Focus height (slightly above player center)
    this.focusPoint.set(playerPos.x, playerPos.y + 1.4, playerPos.z);

    // 3. Compute spherical orbit coordinates
    const cosPitch = Math.cos(this.pitch);
    const sinPitch = Math.sin(this.pitch);
    const sinYaw = Math.sin(this.yaw);
    const cosYaw = Math.cos(this.yaw);

    const offsetX = this.distance * cosPitch * sinYaw;
    const offsetY = this.distance * sinPitch;
    const offsetZ = this.distance * cosPitch * cosYaw;

    const desiredCamPos = new THREE.Vector3(
      this.focusPoint.x + offsetX,
      this.focusPoint.y + offsetY,
      this.focusPoint.z + offsetZ
    );

    // Frame-rate independent exponential smoothing follow (decay rate = 12.0)
    const t = 1.0 - Math.exp(-12.0 * delta);
    this.camera.position.lerp(desiredCamPos, t);

    // 4. Apply screen shake / trauma offset (from camera-systems and game-feel skills)
    if (this.trauma > 0.001) {
      this.trauma = Math.max(0, this.trauma - delta * 2.8);
      const shakeMag = this.trauma * this.trauma * 0.42;
      this.shakeOffset.set(
        (Math.random() - 0.5) * 2 * shakeMag,
        (Math.random() - 0.5) * 2 * shakeMag,
        (Math.random() - 0.5) * 2 * shakeMag
      );
      this.camera.position.add(this.shakeOffset);
    }

    this.camera.lookAt(this.focusPoint);
  }

  // ─── Direction Vectors for Player Movement ────────────────────────────────

  // Returns forward vector projected onto the horizontal ground plane (XZ)
  getForwardVector() {
    return new THREE.Vector3(
      -Math.sin(this.yaw),
      0,
      -Math.cos(this.yaw)
    ).normalize();
  }

  // Returns right vector projected onto horizontal plane
  getRightVector() {
    return new THREE.Vector3(
      Math.cos(this.yaw),
      0,
      -Math.sin(this.yaw)
    ).normalize();
  }
}
