// ===================================================
// FloatingText.js — World-Space Projected Floating Score Popups
// Dopamine visual juice for coin pickups, streaks, and milestones
// ===================================================
import * as THREE from 'three';

export class FloatingText {
  constructor(container, camera) {
    this.container = container;
    this.camera = camera;
    this.elements = []; // [{ el, worldPos, yOffset, opacity, life, maxLife }]
    this._tempV = new THREE.Vector3();

    // Dedicated overlay container
    if (typeof document !== 'undefined') {
      let layer = document.getElementById('floating-text-layer');
      if (!layer) {
        layer = document.createElement('div');
        layer.id = 'floating-text-layer';
        layer.style.position = 'absolute';
        layer.style.inset = '0';
        layer.style.pointerEvents = 'none';
        layer.style.overflow = 'hidden';
        layer.style.zIndex = '35';
        if (container) container.appendChild(layer);
        else document.body.appendChild(layer);
      }
      this.layer = layer;
    }
  }

  spawn(text, worldPos, options = {}) {
    if (typeof document === 'undefined' || !this.layer) return;

    const color = options.color || '#ffd700';
    const fontSize = options.fontSize || '1.25rem';
    const isBig = options.isBig || false;

    const el = document.createElement('div');
    el.textContent = text;
    el.style.position = 'absolute';
    el.style.left = '0';
    el.style.top = '0';
    el.style.fontFamily = "'Fredoka', 'Nunito', sans-serif";
    el.style.fontWeight = '800';
    el.style.fontSize = fontSize;
    el.style.color = color;
    el.style.textShadow = '0 2px 8px rgba(0,0,0,0.8), 0 0 12px ' + color;
    el.style.transform = 'translate(-50%, -50%) scale(' + (isBig ? '1.4' : '1.0') + ')';
    el.style.transition = 'none';
    el.style.whiteSpace = 'nowrap';
    el.style.willChange = 'transform, opacity';

    this.layer.appendChild(el);

    this.elements.push({
      el,
      worldPos: worldPos.clone ? worldPos.clone() : new THREE.Vector3(worldPos.x, worldPos.y, worldPos.z),
      yOffset: 0.8,
      life: 0,
      maxLife: options.duration || 0.9,
    });
  }

  update(delta) {
    if (!this.elements.length || typeof window === 'undefined') return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    for (let i = this.elements.length - 1; i >= 0; i--) {
      const item = this.elements[i];
      item.life += delta;
      item.yOffset += delta * 1.8; // Float upwards

      const progress = item.life / item.maxLife;

      if (progress >= 1.0) {
        if (item.el.parentNode) item.el.parentNode.removeChild(item.el);
        this.elements.splice(i, 1);
        continue;
      }

      // Project 3D world position to 2D screen coordinate
      this._tempV.copy(item.worldPos);
      this._tempV.y += item.yOffset;
      this._tempV.project(this.camera);

      // Check if behind camera
      if (this._tempV.z > 1.0) {
        item.el.style.display = 'none';
        continue;
      }

      const screenX = (this._tempV.x * 0.5 + 0.5) * width;
      const screenY = (-(this._tempV.y * 0.5) + 0.5) * height;

      const scale = 1.0 + Math.sin(progress * Math.PI) * 0.35;
      const opacity = Math.max(0, 1.0 - Math.pow(progress, 2.0));

      item.el.style.display = 'block';
      item.el.style.left = `${screenX}px`;
      item.el.style.top = `${screenY}px`;
      item.el.style.opacity = opacity.toFixed(2);
      item.el.style.transform = `translate(-50%, -50%) scale(${scale.toFixed(2)})`;
    }
  }

  reset() {
    this.elements.forEach((item) => {
      if (item.el.parentNode) item.el.parentNode.removeChild(item.el);
    });
    this.elements = [];
  }
}
