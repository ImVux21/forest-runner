// ===================================================
// InputManager.js — 3D Open-World Vector Input (WASD / Arrows / Touch)
// Provides continuous 2D movement vector + Jump + Sprint + Glider + Camera Q/E
// ===================================================

export class InputManager {
  constructor() {
    this.keys = {};
    this.jumpTriggered = false;
    this.interactTriggered = false;

    // Mobile / Touch controls
    this.touchVector = { x: 0, z: 0 };
    this.touchActive = false;
    this.touchSprint = false;
    this.touchGlide = false;

    this._bindKeyboard();
  }

  _bindKeyboard() {
    window.addEventListener('keydown', e => {
      this.keys[e.code] = true;
      this.keys[e.key] = true;

      // Prevent page scroll
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }

      if (e.code === 'Space' || e.code === 'KeyW' || e.key === ' ') {
        this.jumpTriggered = true;
      }

      if (e.code === 'KeyE' || e.key === 'e' || e.key === 'E') {
        this.interactTriggered = true;
      }
    });

    window.addEventListener('keyup', e => {
      this.keys[e.code] = false;
      this.keys[e.key] = false;
    });
  }

  // ─── Continuous Vector Query ──────────────────────────────────────────────

  getMovementVector() {
    let x = 0;
    let z = 0;

    if (this.keys['KeyW'] || this.keys['ArrowUp'] || this.keys['w'] || this.keys['W']) {
      z -= 1;
    }
    if (this.keys['KeyS'] || this.keys['ArrowDown'] || this.keys['s'] || this.keys['S']) {
      z += 1;
    }
    if (this.keys['KeyA'] || this.keys['ArrowLeft'] || this.keys['a'] || this.keys['A']) {
      x -= 1;
    }
    if (this.keys['KeyD'] || this.keys['ArrowRight'] || this.keys['d'] || this.keys['D']) {
      x += 1;
    }

    if (this.touchActive) {
      x += this.touchVector.x;
      z += this.touchVector.z;
    }

    const len = Math.hypot(x, z);
    if (len > 1.0) {
      x /= len;
      z /= len;
    }

    return { x, z };
  }

  consumeJump() {
    const res = this.jumpTriggered;
    this.jumpTriggered = false;
    return res;
  }

  consumeInteract() {
    const res = this.interactTriggered;
    this.interactTriggered = false;
    return res;
  }

  triggerInteract() {
    this.interactTriggered = true;
  }

  isSprintActive() {
    return Boolean(
      this.keys['ShiftLeft'] ||
      this.keys['ShiftRight'] ||
      this.keys['Shift'] ||
      this.touchSprint
    );
  }

  isGlideActive() {
    return Boolean(
      this.keys['Space'] ||
      this.keys[' '] ||
      this.touchGlide
    );
  }

  getCameraRotationInput() {
    let deltaYaw = 0;
    if (this.keys['KeyQ'] || this.keys['q'] || this.keys['Q']) {
      deltaYaw += 0.035;
    }
    if (this.keys['KeyE'] || this.keys['e'] || this.keys['E']) {
      deltaYaw -= 0.035;
    }
    return deltaYaw;
  }

  // ─── Touch Setters ────────────────────────────────────────────────────────

  setTouchDirection(x, z) {
    this.touchVector.x = x;
    this.touchVector.z = z;
    this.touchActive = (x !== 0 || z !== 0);
  }

  toggleSprint() {
    this.touchSprint = !this.touchSprint;
    return this.touchSprint;
  }

  setTouchGlide(val) {
    this.touchGlide = val;
  }

  triggerJump() {
    this.jumpTriggered = true;
  }

  reset() {
    this.keys = {};
    this.jumpTriggered = false;
    this.touchVector = { x: 0, z: 0 };
    this.touchActive = false;
    this.touchSprint = false;
    this.touchGlide = false;
  }
}
