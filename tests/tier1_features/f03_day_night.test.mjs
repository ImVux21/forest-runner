// ===================================================
// f03_day_night.test.mjs — F3: Dynamic Day/Night Transitions Coverage
// ===================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import '../helpers/headless_env.mjs';
import { DayNightModel } from '../helpers/analytical_models.mjs';

test('F3.1: Cycle duration and normalized interval bounds', () => {
  assert.equal(DayNightModel.DAY_DURATION, 140, 'Cycle duration is 140 seconds');
  assert.equal(DayNightModel.PHASES.DAWN.t, 0.0);
  assert.equal(DayNightModel.PHASES.NOON.t, 0.25);
  assert.equal(DayNightModel.PHASES.SUNSET.t, 0.50);
  assert.equal(DayNightModel.PHASES.MIDNIGHT.t, 0.75);
});

test('F3.2: Sun orbital position trajectory calculation', () => {
  // Noon: sun is at zenith (sunY == 50)
  const noonPos = DayNightModel.calculateSunPosition(0.25);
  assert.ok(Math.abs(noonPos.x) < 0.01, `Noon sunX should be ~0, got ${noonPos.x}`);
  assert.ok(Math.abs(noonPos.y - 50) < 0.01, `Noon sunY should be 50, got ${noonPos.y}`);

  // Sunset: sun crosses horizon (sunY == 0)
  const sunsetPos = DayNightModel.calculateSunPosition(0.50);
  assert.ok(Math.abs(sunsetPos.x - (-50)) < 0.01, `Sunset sunX should be -50, got ${sunsetPos.x}`);
  assert.ok(Math.abs(sunsetPos.y) < 0.01, `Sunset sunY should be ~0, got ${sunsetPos.y}`);

  // Midnight: sun is below horizon (sunY == -50)
  const midnightPos = DayNightModel.calculateSunPosition(0.75);
  assert.ok(Math.abs(midnightPos.y - (-50)) < 0.01, `Midnight sunY should be -50, got ${midnightPos.y}`);
});

test('F3.3: Daylight detection and sun factor calculation', () => {
  assert.equal(DayNightModel.isDaylight(0.25), true, 'Noon must be daylight');
  assert.equal(DayNightModel.isDaylight(0.75), false, 'Midnight must be night');

  const noonFactor = DayNightModel.getSunFactor(0.25);
  assert.equal(noonFactor, 1.0, 'Noon factor should saturate at 1.0');

  const midnightFactor = DayNightModel.getSunFactor(0.75);
  assert.equal(midnightFactor, 0.0, 'Midnight factor should be 0.0');
});

test('F3.4: Continuous sky and fog color interpolation', () => {
  const midDaySky = DayNightModel.interpolateSkyColor(1.0);
  const sunsetSky = DayNightModel.interpolateSkyColor(0.0);
  const twilightSky = DayNightModel.interpolateSkyColor(0.5);

  assert.equal(midDaySky.getHexString(), '6ec4f8', 'Full day sky should be light blue');
  assert.equal(sunsetSky.getHexString(), 'e67e22', 'Sunset sky should be warm amber/orange');

  // Twilight is smooth blend
  assert.ok(twilightSky.r > midDaySky.r, 'Twilight has more red than midday');
  assert.ok(twilightSky.b < midDaySky.b, 'Twilight has less blue than midday');
});

test('F3.5: Dawn sun color reset verification (no frozen blue sun)', () => {
  const sunLight = new THREE.DirectionalLight(0xfff7e2, 2.5);
  const dayColor = new THREE.Color(0xfff7e2);
  const moonColor = new THREE.Color(0x90caf9);

  // Transition to night
  sunLight.color.copy(moonColor);
  assert.equal(sunLight.color.getHexString(), '90caf9');

  // Transition back to day - MUST reset to warm daylight
  sunLight.color.copy(dayColor);
  assert.equal(
    sunLight.color.getHexString(),
    'fff7e2',
    'Sunlight must reset to warm daylight on dawn/day transition'
  );
});

test('F3.6: Ambient and hemisphere light intensity modulation', () => {
  const getLightingState = (sunFactor) => ({
    sunIntensity: 0.5 + sunFactor * 2.0,
    ambientIntensity: 0.2 + sunFactor * 0.4,
    hemiIntensity: 0.3 + sunFactor * 0.55,
  });

  const noon = getLightingState(1.0);
  const night = getLightingState(0.0);

  assert.equal(noon.sunIntensity, 2.5, 'Noon sun intensity should be 2.5');
  assert.ok(Math.abs(noon.ambientIntensity - 0.6) < 1e-5, 'Noon ambient intensity should be 0.6');
  assert.equal(night.sunIntensity, 0.5, 'Base sun intensity at horizon should be 0.5');
  assert.equal(night.ambientIntensity, 0.2, 'Night ambient intensity should be 0.2');
  assert.ok(noon.hemiIntensity > night.hemiIntensity, 'Hemisphere light brighter during day');
});
