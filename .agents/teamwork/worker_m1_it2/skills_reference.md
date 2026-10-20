# three.js Materials & Lighting (Local Reference)
Copied from .agents/skills/threejs-materials-lighting/SKILL.md

Core relevant takeaways:
- Target Three.js r186
- Shadows:
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap; // soft by default since r182
