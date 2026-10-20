// ===================================================
// Renderer.js — Three.js WebGL Renderer setup
// ===================================================
import * as THREE from 'three';

export class Renderer {
  constructor(container) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio : 1;
    this.renderer.setPixelRatio(Math.min(dpr, 1.5));
    this.renderer.shadowMap.enabled = true;
    // Three.js r186 deprecated and removed PCFSoftShadowMap in favor of PCFShadowMap.
    // Setting PCFShadowMap directly eliminates console warnings while providing hardware-filtered soft shadows.
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    // ACESFilmic tonemapping with calibrated exposure ensures vibrant stylized colors
    // while preventing blown-out highlights on sunlit surfaces.
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.10;
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    container.appendChild(this.renderer.domElement);
  }

  render(scene, camera) {
    this.renderer.render(scene, camera);
  }

  resize(width, height) {
    this.renderer.setSize(width, height);
  }

  setExposure(exposure) {
    this.renderer.toneMappingExposure = exposure;
  }

  getExposure() {
    return this.renderer.toneMappingExposure;
  }

  get domElement() {
    return this.renderer.domElement;
  }

  get instance() {
    return this.renderer;
  }
}
