// ===================================================
// ScreenShake.js — Camera Shake System
// High-impact juice for landings, explosions, and bounces
// ===================================================
import * as THREE from 'three';

export class ScreenShake {
  constructor(camera) {
    this.camera = camera;
    this.trauma = 0.0;
    this.decay = 4.5; // Trauma decay per second
    this.maxPitch = 0.035; // Max radians
    this.maxYaw = 0.035;
    this.maxRoll = 0.02;
    this.offset = new THREE.Vector3();
    this.rotationOffset = new THREE.Euler();
    this._time = 0;
  }

  // Trauma between 0.0 and 1.0 (squared falloff creates natural feel)
  addTrauma(amount = 0.3) {
    this.trauma = Math.min(1.0, this.trauma + amount);
  }

  update(delta) {
    if (this.trauma <= 0.001) {
      this.trauma = 0;
      return;
    }

    this._time += delta * 32.0;
    const shake = this.trauma * this.trauma;

    // Perlin-like pseudo noise using harmonic sines
    const yaw = (Math.sin(this._time * 1.1) + Math.cos(this._time * 2.3) * 0.5) * this.maxYaw * shake;
    const pitch = (Math.cos(this._time * 1.4) + Math.sin(this._time * 2.7) * 0.5) * this.maxPitch * shake;
    const roll = Math.sin(this._time * 1.8) * this.maxRoll * shake;

    this.camera.rotation.x += pitch;
    this.camera.rotation.y += yaw;
    this.camera.rotation.z += roll;

    // Decay trauma over time
    this.trauma = Math.max(0, this.trauma - this.decay * delta);
  }
}
