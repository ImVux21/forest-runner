// ===================================================
// f01_tonemapping.test.mjs — F1: ACESFilmic Tone Mapping Coverage
// ===================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import '../helpers/headless_env.mjs';
import { ToneMappingModel } from '../helpers/analytical_models.mjs';

test('F1.1: ACESFilmic tone mapping enum matches Three.js standard', () => {
  assert.equal(
    ToneMappingModel.REQUIRED_TONE_MAPPING,
    THREE.ACESFilmicToneMapping,
    'ToneMappingModel must require THREE.ACESFilmicToneMapping'
  );
  assert.equal(THREE.ACESFilmicToneMapping, 4, 'THREE.ACESFilmicToneMapping value should be 4');
});

test('F1.2: Calibrated exposure target and tolerance bounds', () => {
  assert.equal(ToneMappingModel.EXPOSURE_TARGET, 1.1, 'Target exposure should be 1.1');
  assert.ok(ToneMappingModel.EXPOSURE_MIN >= 1.0, 'Exposure minimum should be >= 1.0');
  assert.ok(ToneMappingModel.EXPOSURE_MAX <= 1.25, 'Exposure maximum should be <= 1.25');
  assert.ok(
    ToneMappingModel.EXPOSURE_TARGET >= ToneMappingModel.EXPOSURE_MIN &&
    ToneMappingModel.EXPOSURE_TARGET <= ToneMappingModel.EXPOSURE_MAX,
    'Target exposure must sit comfortably within calibrated bounds'
  );
});

test('F1.3: Output color space conforms to SRGBColorSpace', () => {
  assert.equal(
    ToneMappingModel.REQUIRED_COLOR_SPACE,
    THREE.SRGBColorSpace,
    'Output color space must be SRGBColorSpace'
  );
});

test('F1.4: ACESFilmic mathematical curve preserves highlights and shadows', () => {
  // Pure black remains black
  const black = ToneMappingModel.acesFilmic(0.0);
  assert.equal(black, 0.0, 'Zero luminance must map to zero');

  // Midtone boost
  const mid = ToneMappingModel.acesFilmic(0.5);
  assert.ok(mid > 0.4 && mid < 0.7, `Midtone 0.5 should map smoothly, got ${mid}`);

  // Normal white (1.0)
  const white = ToneMappingModel.acesFilmic(1.0);
  assert.ok(white > 0.75 && white <= 1.0, `White 1.0 should map smoothly, got ${white}`);

  // Extreme overexposure (10.0) should asymptotically approach 1.0 without exceeding 1.0
  const extreme = ToneMappingModel.acesFilmic(10.0);
  assert.ok(extreme <= 1.0 && extreme > 0.95, `Extreme luminance 10.0 should roll off near 1.0, got ${extreme}`);
});

test('F1.5: Linear vs ACES tone mapping non-linear compression', () => {
  const linearValues = [0.1, 0.5, 1.0, 2.0, 5.0];
  const tonemapped = linearValues.map(v => ToneMappingModel.applyExposureAndToneMap(v, 1.1));

  // Verify monotonic increasing property
  for (let i = 1; i < tonemapped.length; i++) {
    assert.ok(
      tonemapped[i] > tonemapped[i - 1],
      `Tonemapped curve must be strictly monotonic: ${tonemapped[i]} > ${tonemapped[i - 1]}`
    );
  }

  // Value at 5.0 must not blow out to Infinity or NaN
  assert.ok(Number.isFinite(tonemapped[4]), 'Tonemapped value must be finite');
  assert.ok(tonemapped[4] <= 1.0, 'Tonemapped value must not exceed 1.0');
});

test('F1.6: Exposure scaling modulates midtone energy', () => {
  const lowExposure = ToneMappingModel.applyExposureAndToneMap(0.5, 0.8);
  const targetExposure = ToneMappingModel.applyExposureAndToneMap(0.5, 1.1);
  const highExposure = ToneMappingModel.applyExposureAndToneMap(0.5, 1.4);

  assert.ok(targetExposure > lowExposure, 'Higher exposure must produce brighter midtone');
  assert.ok(highExposure > targetExposure, 'Higher exposure must produce brighter midtone');
});
