import { clamp, rgbToHsl, hslToRgb } from '../utils';

export interface RecolorParams {
  mode: 'hueshift' | 'gradientmap';
  hue: number;         // 0–360 base offset
  span: number;        // 0–360 gradient width
  saturation: number;  // 0–200
  brightness: number;  // 0–200
  flow: number;        // 0–10 animation speed
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
      // Gradient map: luminance → hue position along span
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      const mappedHue = (effectiveHue + lum * params.span) % 360;
      const sat = 0.75 * (params.saturation / 100);
      const lig = 0.25 + lum * 0.5 * (params.brightness / 100);
      [nr, ng, nb] = hslToRgb(mappedHue, sat, clamp(lig, 0, 1));
    }

    out[i] = clamp(nr, 0, 255);
    out[i + 1] = clamp(ng, 0, 255);
    out[i + 2] = clamp(nb, 0, 255);
    out[i + 3] = data[i + 3];
  }

  return new ImageData(out, width, height);
}
