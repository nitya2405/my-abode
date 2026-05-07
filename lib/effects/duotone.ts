export interface DuotoneParams {
  shadowColor: string;
  highlightColor: string;
  contrast: number;   // 0–100
  midpoint: number;   // 0–100, shifts the split between shadow and highlight
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function renderDuotone(src: ImageData, params: DuotoneParams): ImageData {
  const { shadowColor, highlightColor, contrast, midpoint } = params;
  const [sr, sg, sb] = hexToRgb(shadowColor);
  const [hr, hg, hb] = hexToRgb(highlightColor);
  const { width, height, data } = src;
  const out = new ImageData(width, height);
  const od = out.data;

  const contrastMul = 1 + contrast / 100;
  const mid = midpoint / 100;

  for (let i = 0; i < data.length; i += 4) {
    // Luminance
    let lum = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;

    // Apply contrast around midpoint
    lum = mid + (lum - mid) * contrastMul;
    lum = Math.max(0, Math.min(1, lum));

    od[i]     = Math.round(sr + (hr - sr) * lum);
    od[i + 1] = Math.round(sg + (hg - sg) * lum);
    od[i + 2] = Math.round(sb + (hb - sb) * lum);
    od[i + 3] = data[i + 3];
  }

  return out;
}

export const DUOTONE_PRESETS: Array<{ name: string; shadow: string; highlight: string }> = [
  { name: 'Spotify',   shadow: '#0d0221', highlight: '#ff5f00' },
  { name: 'Blueprint', shadow: '#001f5b', highlight: '#e8f0ff' },
  { name: 'Dusk',      shadow: '#2d004e', highlight: '#ff9ecd' },
  { name: 'Forest',    shadow: '#001a00', highlight: '#a8ff78' },
  { name: 'Sepia',     shadow: '#2c1a0e', highlight: '#f5deb3' },
  { name: 'Fire',      shadow: '#1a0000', highlight: '#ff6600' },
  { name: 'Arctic',    shadow: '#00174f', highlight: '#c8ffff' },
  { name: 'Cyber',     shadow: '#000033', highlight: '#00ff99' },
  { name: 'Rose',      shadow: '#1a0010', highlight: '#ffccee' },
  { name: 'Gold',      shadow: '#1a0d00', highlight: '#ffd700' },
  { name: 'Storm',     shadow: '#0a0a1a', highlight: '#acc7fd' },
  { name: 'Acid',      shadow: '#001100', highlight: '#ccff00' },
];
