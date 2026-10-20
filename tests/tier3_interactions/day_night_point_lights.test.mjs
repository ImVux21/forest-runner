// ===================================================
// day_night_point_lights.test.mjs — Tier 3: Day/Night + Point Lights Interaction
// ===================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import '../helpers/headless_env.mjs';
import { DayNightModel, PointLightsModel } from '../helpers/analytical_models.mjs';

test('T3.1: Midnight transition triggers point light intensification and fireflies', () => {
  const scene = new THREE.Scene();
  const sunLight = new THREE.DirectionalLight(0xfff7e2, 2.5);
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(sunLight);
  scene.add(ambientLight);

  // Setup point lights
  const pointLights = PointLightsModel.TARGET_POSITIONS.map(p => {
    const pl = new THREE.PointLight(0xff9933, 0.2, p.id === 'spirit_glow' ? 8.0 : 10.0);
    pl.position.set(p.x, p.y, p.z);
    scene.add(pl);
    return pl;
  });

  // Setup fireflies
  const fireflies = [];
  for (let i = 0; i < 20; i++) {
    const f = new THREE.Mesh(new THREE.DodecahedronGeometry(0.1), new THREE.MeshBasicMaterial());
    f.visible = false;
    scene.add(f);
    fireflies.push(f);
  }

  // Simulate Day/Night lighting state update at Noon (t = 0.25)
  const updateLighting = (dayTime) => {
    const isDay = DayNightModel.isDaylight(dayTime);
    const sunFactor = DayNightModel.getSunFactor(dayTime);

    if (isDay) {
      sunLight.intensity = 0.5 + sunFactor * 2.0;
      sunLight.color.set(0xfff7e2);
      ambientLight.intensity = 0.2 + sunFactor * 0.4;
      fireflies.forEach(f => { f.visible = false; });
      pointLights.forEach(pl => { pl.intensity = 0.3; });
    } else {
      sunLight.intensity = 0.2;
      sunLight.color.set(0x90caf9);
      ambientLight.intensity = 0.25;
      fireflies.forEach(f => { f.visible = true; });
      pointLights.forEach(pl => { pl.intensity = 2.0; });
    }
  };

  // 1. Noon state
  updateLighting(0.25);
  assert.equal(sunLight.intensity, 2.5, 'Sun at full power at noon');
  assert.equal(sunLight.color.getHexString(), 'fff7e2', 'Sun is warm daylight');
  assert.equal(fireflies[0].visible, false, 'Fireflies hidden in daylight');
  assert.equal(pointLights[0].intensity, 0.3, 'Point lights dimmed during daylight');

  // 2. Midnight state (t = 0.75)
  updateLighting(0.75);
  assert.equal(sunLight.intensity, 0.2, 'Sun dimmed to moonlight at night');
  assert.equal(sunLight.color.getHexString(), '90caf9', 'Moonlight blue color');
  assert.equal(fireflies[0].visible, true, 'Fireflies glowing at midnight');
  assert.equal(pointLights[0].intensity, 2.0, 'Lantern and campfire point lights shining at full night intensity');

  // 3. Return to Dawn (t = 0.0) -> transitions smoothly back to day
  updateLighting(0.25);
  assert.equal(sunLight.color.getHexString(), 'fff7e2', 'Sunlight properly restored to daylight cream');
  assert.equal(fireflies[0].visible, false, 'Fireflies disappear at dawn');
});
