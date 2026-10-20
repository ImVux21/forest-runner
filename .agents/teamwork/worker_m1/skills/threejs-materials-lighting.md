# three.js Materials & Lighting (Local Skill Copy)

Source: c:/Users/vuodo/software/forest-runner/.agents/skills/threejs-materials-lighting/SKILL.md

Make three.js surfaces look right: pick the correct material, light the scene,
enable shadows, and add image-based lighting. Patterns target **r186**, verified
against **r186** (lighting is physically based by default since r155).

## Core workflow
1. Pick a material by need. `MeshStandardMaterial` for PBR.
2. Soft fill (`AmbientLight`/`HemisphereLight`) with key `DirectionalLight`.
3. Physically based intensities.
4. Shadow map config: `renderer.shadowMap.enabled = true`, `renderer.shadowMap.type = THREE.PCFSoftShadowMap`, normalBias & bias.
5. Tone mapping: `renderer.toneMapping = THREE.ACESFilmicToneMapping`, `renderer.toneMappingExposure = 1.10`.
6. Output color space: `THREE.SRGBColorSpace`.
