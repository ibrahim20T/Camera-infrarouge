/**
 * Pure image processing engine for IR Filter
 * Uses optimized Look-Up Tables (LUT) and 32-bit pixel manipulations
 * for 60 FPS real-time mobile canvas processing.
 */

export type FilterType = 'night-vision' | 'ir-monochrome' | 'false-color';

export interface FilterSettings {
  active: boolean;
  type: FilterType;
  intensity: number; // 0 - 100
  brightness: number; // -50 - 50
  contrast: number; // -50 - 50
  grain: boolean;
  scanlines: boolean;
  reticle: boolean;
}

export const DEFAULT_SETTINGS: FilterSettings = {
  active: true,
  type: 'night-vision',
  intensity: 100,
  brightness: 5,
  contrast: 20,
  grain: false,
  scanlines: false,
  reticle: true,
};

// Clamp helper
export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

// Compute contrast factor
export function calculateContrastFactor(contrast: number): number {
  // contrast ranges -50 to 50 -> factor ~ 0.5 to 2.5
  const normalized = clamp(contrast, -100, 100);
  return (259 * (normalized + 255)) / (255 * (259 - normalized));
}

/**
 * Calculates adjusted luminance with brightness and contrast applied
 */
export function adjustLuminance(
  r: number,
  g: number,
  b: number,
  contrastFactor: number,
  brightness: number
): number {
  // Photopic luminance formula
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const contrasted = contrastFactor * (lum - 128) + 128 + brightness;
  return clamp(Math.round(contrasted), 0, 255);
}

/**
 * Thermal False-Color Palette Look-Up Table (256 entries)
 * Precomputed transition: Black -> Purple -> Royal Blue -> Emerald -> Yellow -> Bright White
 */
export function generateFalseColorLUT(): Uint8ClampedArray {
  const lut = new Uint8ClampedArray(256 * 3);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let r = 0;
    let g = 0;
    let b = 0;

    if (t < 0.2) {
      // 0.0 - 0.2: Pitch black to deep indigo/purple
      const step = t / 0.2;
      r = Math.round(40 * step);
      g = Math.round(10 * step);
      b = Math.round(130 * step);
    } else if (t < 0.45) {
      // 0.2 - 0.45: Indigo to electric cyan/teal
      const step = (t - 0.2) / 0.25;
      r = Math.round(40 * (1 - step));
      g = Math.round(10 + 200 * step);
      b = Math.round(130 + 125 * step);
    } else if (t < 0.7) {
      // 0.45 - 0.7: Teal to luminous lime/green
      const step = (t - 0.45) / 0.25;
      r = Math.round(180 * step);
      g = Math.round(210 + 45 * step);
      b = Math.round(255 * (1 - step));
    } else if (t < 0.9) {
      // 0.7 - 0.9: Lime/yellow to flaming orange/coral
      const step = (t - 0.7) / 0.2;
      r = 255;
      g = Math.round(255 * (1 - step * 0.4));
      b = Math.round(60 * step);
    } else {
      // 0.9 - 1.0: Orange to intense thermal white
      const step = (t - 0.9) / 0.1;
      r = 255;
      g = Math.round(153 + 102 * step);
      b = Math.round(60 + 195 * step);
    }

    lut[i * 3] = r;
    lut[i * 3 + 1] = g;
    lut[i * 3 + 2] = b;
  }
  return lut;
}

// Global cached LUTs
export const FALSE_COLOR_LUT = generateFalseColorLUT();

/**
 * Transforms a single pixel RGB based on selected IR filter
 */
export function transformPixel(
  r: number,
  g: number,
  b: number,
  type: FilterType,
  contrastFactor: number,
  brightness: number
): [number, number, number] {
  switch (type) {
    case 'night-vision': {
      // Green phosphor tube night vision effect
      // High sensitivity to green & luminance
      const lum = adjustLuminance(r, g, b, contrastFactor, brightness);
      
      // Phosphor curve:
      // Intense neon green channel with high dynamics
      const outG = clamp(Math.round(lum * 1.28), 0, 255);
      // Small amount of red only in high saturation (warm highlights)
      const outR = lum > 190 ? clamp(Math.round((lum - 190) * 1.5), 0, 180) : 0;
      // Deep phosphor teal undertone in midtones
      const outB = clamp(Math.round(lum * 0.22), 0, 100);

      return [outR, outG, outB];
    }

    case 'ir-monochrome': {
      // Simulated Wood Effect: Foliage & organic surfaces (high Green reflection)
      // reflect intense near-infrared radiation and appear luminous white.
      // Skies & deep shadows appear deep dark black.
      let woodBoost = 0;
      if (g > r && g > b) {
        // Chlorophyll reflectance heuristic
        const greenExcellence = g - (r + b) / 2;
        woodBoost = greenExcellence * 0.8;
      }

      // Base luminance
      const baseLum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const irLum = baseLum + woodBoost;
      
      // High contrast S-curve for stark IR photography look
      const contrasted = contrastFactor * (irLum - 128) + 128 + brightness;
      const finalLum = clamp(Math.round(contrasted), 0, 255);

      return [finalLum, finalLum, finalLum];
    }

    case 'false-color': {
      // Thermal / Aerochrome false color mapping
      // Calculate adjusted luminance index
      const lumIndex = adjustLuminance(r, g, b, contrastFactor, brightness);
      const lutOffset = lumIndex * 3;
      
      const outR = FALSE_COLOR_LUT[lutOffset];
      const outG = FALSE_COLOR_LUT[lutOffset + 1];
      const outB = FALSE_COLOR_LUT[lutOffset + 2];

      return [outR, outG, outB];
    }
  }
}

/**
 * Applies the IR filter directly to ImageData in-place.
 * Optimized with direct Uint32Array / Uint8ClampedArray operations.
 */
export function applyFilterToImageData(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  settings: FilterSettings
): void {
  if (!settings.active || settings.intensity === 0) {
    return;
  }

  const contrastFactor = calculateContrastFactor(settings.contrast);
  const brightness = settings.brightness;
  const intensity = clamp(settings.intensity, 0, 100) / 100;
  const type = settings.type;
  const addGrain = settings.grain;

  const totalPixels = width * height;
  const lut = FALSE_COLOR_LUT;

  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    const origR = data[idx];
    const origG = data[idx + 1];
    const origB = data[idx + 2];

    let targetR = 0;
    let targetG = 0;
    let targetB = 0;

    if (type === 'night-vision') {
      const lum = 0.2126 * origR + 0.7152 * origG + 0.0722 * origB;
      const contrasted = clamp(
        Math.round(contrastFactor * (lum - 128) + 128 + brightness),
        0,
        255
      );
      targetG = clamp(Math.round(contrasted * 1.28), 0, 255);
      targetR = contrasted > 190 ? clamp(Math.round((contrasted - 190) * 1.5), 0, 180) : 0;
      targetB = clamp(Math.round(contrasted * 0.22), 0, 100);
    } else if (type === 'ir-monochrome') {
      let woodBoost = 0;
      if (origG > origR && origG > origB) {
        woodBoost = (origG - (origR + origB) * 0.5) * 0.8;
      }
      const baseLum = 0.2126 * origR + 0.7152 * origG + 0.0722 * origB;
      const contrasted = clamp(
        Math.round(contrastFactor * (baseLum + woodBoost - 128) + 128 + brightness),
        0,
        255
      );
      targetR = contrasted;
      targetG = contrasted;
      targetB = contrasted;
    } else {
      // false-color
      const lum = 0.2126 * origR + 0.7152 * origG + 0.0722 * origB;
      const lumIndex = clamp(
        Math.round(contrastFactor * (lum - 128) + 128 + brightness),
        0,
        255
      );
      const lutOffset = lumIndex * 3;
      targetR = lut[lutOffset];
      targetG = lut[lutOffset + 1];
      targetB = lut[lutOffset + 2];
    }

    // Optional subtle sensor noise
    if (addGrain && Math.random() < 0.25) {
      const noise = (Math.random() - 0.5) * 35;
      targetR = clamp(targetR + noise, 0, 255);
      targetG = clamp(targetG + noise, 0, 255);
      targetB = clamp(targetB + noise, 0, 255);
    }

    // Blend with original pixel according to intensity
    if (intensity < 1) {
      data[idx] = Math.round(origR + (targetR - origR) * intensity);
      data[idx + 1] = Math.round(origG + (targetG - origG) * intensity);
      data[idx + 2] = Math.round(origB + (targetB - origB) * intensity);
    } else {
      data[idx] = targetR;
      data[idx + 1] = targetG;
      data[idx + 2] = targetB;
    }
  }
}

/**
 * Filter Metadata configuration for UI & selection
 */
export interface FilterInfo {
  id: FilterType;
  name: string;
  badge: string;
  description: string;
  accentColor: string;
}

export const FILTERS: FilterInfo[] = [
  {
    id: 'night-vision',
    name: 'NIGHT VISION',
    badge: 'VERT PHOSPHORE',
    description: 'Effet vert et noir haute sensibilité inspiré des tubes photomultiplicateurs de vision nocturne.',
    accentColor: '#00ff66',
  },
  {
    id: 'ir-monochrome',
    name: 'IR MONOCHROME',
    badge: 'EFFET WOOD',
    description: 'Monochrome infrarouge à contraste élevé simulant la réflexion intense de la chlorophylle et des ciels sombres.',
    accentColor: '#e2e8f0',
  },
  {
    id: 'false-color',
    name: 'FALSE COLOR',
    badge: 'SPECTRE THERMIQUE',
    description: 'Effet de fausse couleur inspiré des films infrarouges Aerochrome et des caméras thermiques.',
    accentColor: '#38bdf8',
  },
];
