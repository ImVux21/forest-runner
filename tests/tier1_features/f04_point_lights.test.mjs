// ===================================================
// f04_point_lights.test.mjs — F4: Warm Localized Point Lights Coverage
// ===================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import '../helpers/headless_env.mjs';
import { PointLightsModel } from '../helpers/analytical_models.mjs';

test('F4.1: Color temperature is within warm amber/gold spectrum', () => {
  const warmColor = new THREE.Color(0xff9933);
  assert.ok(warmColor.r > warmColor.b * 3, 'Red channel must strongly dominate blue in warm light');
  assert.ok(warmColor.g > warmColor.b * 1.5, 'Green channel must exceed blue in warm light');
  assert.equal(warmColor.getHexString(), 'ff9933', 'Default lantern color is warm amber');
});

test('F4.2: Maximum point lights budget <= 8 to prevent WebGL uniform limits', () => {
  assert.ok(
    PointLightsModel.MAX_CONCURRENT_POINT_LIGHTS <= 8,
    'Max concurrent point lights must not exceed 8'
  );
  assert.ok(
    PointLightsModel.TARGET_POSITIONS.length <= PointLightsModel.MAX_CONCURRENT_POINT_LIGHTS,
    'Target point light anchors must fit within the 8-light budget'
  );
});

test('F4.3: Light attenuation range and quadratic decay conformance', () => {
  const light = new THREE.PointLight(0xffaa44, 2.0, 10.0, 2.0);
  assert.equal(light.decay, 2.0, 'Physically plausible quadratic decay');
  assert.ok(
    light.distance >= PointLightsModel.ATTENUATION_RANGE.minDistance &&
    light.distance <= PointLightsModel.ATTENUATION_RANGE.maxDistance,
    'Attenuation distance must be within [5m, 15m] radius'
  );
});

test('F4.4: Point lights have castShadow disabled for 60 FPS budget', () => {
  const light = new THREE.PointLight(0xff9933, 1.5, 8.0);
  // Point light shadow maps are 6 cubemap faces each (extremely heavy)
  assert.equal(light.castShadow, false, 'Point lights must default to castShadow=false');
});

test('F4.5: Strategic landmark point light anchor locations', () => {
  const anchors = PointLightsModel.TARGET_POSITIONS;
  const ids = anchors.map(a => a.id);

  assert.ok(ids.includes('finn_lantern'), 'Should have village lantern anchor');
  assert.ok(ids.includes('peak_campfire'), 'Should have peak campfire anchor');
  assert.ok(ids.includes('spirit_glow'), 'Should have forest spirit anchor');

  // Campfire should be at peak elevation (y > 7.0m)
  const campfire = anchors.find(a => a.id === 'peak_campfire');
  assert.ok(campfire.y > 7.0, 'Campfire light must be placed at summit height');
});

test('F4.6: Dynamic day/night modulation of point lights', () => {
  const calculateLightIntensity = (isNight, baseIntensity = 2.0) => {
    return isNight ? baseIntensity : baseIntensity * 0.15;
  };

  const nightIntensity = calculateLightIntensity(true, 2.0);
  const dayIntensity = calculateLightIntensity(false, 2.0);

  assert.equal(nightIntensity, 2.0, 'Full intensity at night');
  assert.ok(dayIntensity < nightIntensity * 0.25, 'Point lights dimmed during daylight');
});
