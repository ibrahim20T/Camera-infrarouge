import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clamp,
  calculateContrastFactor,
  adjustLuminance,
  generateFalseColorLUT,
  transformPixel,
  applyFilterToImageData,
  DEFAULT_SETTINGS,
} from './filterEngine.ts';
import type { FilterSettings } from './filterEngine.ts';

test('clamp restricts values to bounds', () => {
  assert.equal(clamp(150, 0, 255), 150);
  assert.equal(clamp(-20, 0, 255), 0);
  assert.equal(clamp(300, 0, 255), 255);
});

test('calculateContrastFactor calculates valid numeric factor', () => {
  const neutral = calculateContrastFactor(0);
  assert.ok(Math.abs(neutral - 1.0) < 0.05, 'Neutral contrast factor should be ~1');

  const high = calculateContrastFactor(30);
  assert.ok(high > neutral, 'High contrast factor should exceed 1.0');

  const low = calculateContrastFactor(-30);
  assert.ok(low < neutral, 'Low contrast factor should be below 1.0');
});

test('adjustLuminance outputs clamped values within 0-255', () => {
  const factor = calculateContrastFactor(0);
  const dark = adjustLuminance(0, 0, 0, factor, 0);
  const bright = adjustLuminance(255, 255, 255, factor, 0);
  const mid = adjustLuminance(128, 128, 128, factor, 0);

  assert.equal(dark, 0);
  assert.equal(bright, 255);
  assert.ok(mid >= 120 && mid <= 136);
});

test('generateFalseColorLUT generates 768 elements (256 RGB values)', () => {
  const lut = generateFalseColorLUT();
  assert.equal(lut.length, 256 * 3);

  // Check all values are valid bytes
  for (let i = 0; i < lut.length; i++) {
    assert.ok(lut[i] >= 0 && lut[i] <= 255, `LUT value at ${i} should be 0-255`);
  }
});

test('transformPixel: night-vision outputs dominant green channel', () => {
  const factor = calculateContrastFactor(10);
  const [r, g, b] = transformPixel(120, 120, 120, 'night-vision', factor, 0);

  assert.ok(g > r, 'Green should be higher than red in night vision');
  assert.ok(g > b, 'Green should be higher than blue in night vision');
});

test('transformPixel: ir-monochrome outputs equal R, G, B channels', () => {
  const factor = calculateContrastFactor(0);
  const [r, g, b] = transformPixel(80, 140, 60, 'ir-monochrome', factor, 0);

  assert.equal(r, g, 'Red and Green must match in monochrome');
  assert.equal(g, b, 'Green and Blue must match in monochrome');
});

test('transformPixel: false-color outputs RGB within color spectrum', () => {
  const factor = calculateContrastFactor(0);
  const [r, g, b] = transformPixel(100, 150, 200, 'false-color', factor, 0);

  assert.ok(r >= 0 && r <= 255);
  assert.ok(g >= 0 && g <= 255);
  assert.ok(b >= 0 && b <= 255);
});

test('applyFilterToImageData: inactive filter leaves pixels untouched', () => {
  const raw = new Uint8ClampedArray([10, 20, 30, 255, 40, 50, 60, 255]);
  const original = new Uint8ClampedArray(raw);

  const settings: FilterSettings = {
    ...DEFAULT_SETTINGS,
    active: false,
  };

  applyFilterToImageData(raw, 2, 1, settings);

  assert.deepEqual(raw, original, 'Inactive filter should not change buffer');
});

test('applyFilterToImageData: night-vision applies green phosphor transformation', () => {
  const buffer = new Uint8ClampedArray([100, 100, 100, 255, 50, 50, 50, 255]);
  const settings: FilterSettings = {
    ...DEFAULT_SETTINGS,
    active: true,
    type: 'night-vision',
    intensity: 100,
    grain: false,
  };

  applyFilterToImageData(buffer, 2, 1, settings);

  // Pixel 0 green must be greater than red and blue
  assert.ok(buffer[1] > buffer[0], 'Pixel 0 G should exceed R');
  assert.ok(buffer[1] > buffer[2], 'Pixel 0 G should exceed B');
});
