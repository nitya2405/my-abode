import { clamp, rgbToHsl, hslToRgb } from '../utils';

export interface RecolorParams {
  mode: 'hueshift' | 'gradientmap';
  hue: number;         // 0–360 base offset
  span: number;        // 0–360 gradient width
  saturation: number;  // 0–200
  brightness: number;  // 0–200
  flow: number;        // 0–10 animation speed
  gradientColors: string[]; // color stops for gradient map mode
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** ANIMATED — call each rAF frame with current timestamp */
export function renderRecolor(
  imageData: ImageData,
  params: RecolorParams,
  timestamp: number
): ImageData {
  const { width, height, data } = imageData;
  const out = new Uint8ClampedArray(data.length);

  const effectiveHue = (params.hue + timestamp * params.flow * 0.05) % 360;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];

    let nr: number, ng: number, nb: number;

    if (params.mode === 'hueshift') {
      let [h, s, l] = rgbToHsl(r, g, b);
      h = (h + effectiveHue) % 360;
      s = clamp(s * (params.saturation / 100), 0, 1);
      l = clamp(l * (params.brightness / 100), 0, 1);
      [nr, ng, nb] = hslToRgb(h, s, l);
    } else {
      // Gradient map: luminance → interpolated color through gradient stops
      const colors = params.gradientColors && params.gradientColors.length >= 2
        ? params.gradientColors
        : ['#000000', '#ffffff'];
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      const shifted = ((lum + timestamp * params.flow * 0.00005) % 1 + 1) % 1;
      const pos = shifted * (colors.length - 1);
      const idx = Math.min(Math.floor(pos), colors.length - 2);
      const t = pos - idx;
      const [r1, g1, b1] = hexToRgb(colors[idx]);
      const [r2, g2, b2] = hexToRgb(colors[idx + 1]);
      nr = r1 + (r2 - r1) * t;
      ng = g1 + (g2 - g1) * t;
      nb = b1 + (b2 - b1) * t;
    }

    out[i] = clamp(nr, 0, 255);
    out[i + 1] = clamp(ng, 0, 255);
    out[i + 2] = clamp(nb, 0, 255);
    out[i + 3] = data[i + 3];
  }

  return new ImageData(out, width, height);
}
