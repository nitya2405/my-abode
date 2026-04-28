import { clamp, makeSeededRandom } from '../utils';

export interface ScanlineParams {
  preset: 'full' | 'analog' | 'digital' | 'subtle';
  analogEnabled: boolean;
  analogIntensity: number;   // 0–1
  analogChroma: number;      // 0–1
  analogTracking: number;    // 0–1
  digitalEnabled: boolean;
  digitalBlockSpeed: number; // 0–1
}

function applyPreset(params: ScanlineParams): ScanlineParams {
  switch (params.preset) {
    case 'full':
      return { ...params, analogEnabled: true, analogIntensity: 0.8, analogChroma: 0.6, analogTracking: 0.5, digitalEnabled: true, digitalBlockSpeed: 0.6 };
    case 'analog':
      return { ...params, analogEnabled: true, analogIntensity: 0.7, analogChroma: 0.5, analogTracking: 0.4, digitalEnabled: false };
    case 'digital':
      return { ...params, analogEnabled: false, digitalEnabled: true, digitalBlockSpeed: 0.8 };
    case 'subtle':
      return { ...params, analogEnabled: true, analogIntensity: 0.25, analogChroma: 0.15, analogTracking: 0.1, digitalEnabled: true, digitalBlockSpeed: 0.1 };
    default:
      return params;
  }
}

/** ANIMATED — tracking bands drift and scanlines flicker each frame */
export function renderScanline(
  imageData: ImageData,
  params: ScanlineParams,
  timestamp: number
): ImageData {
  const p = applyPreset(params);
  const { width: w, height: h, data } = imageData;
  const t = timestamp / 1000;
  const out = new Uint8ClampedArray(data);

  if (p.analogEnabled) {
    // Chroma: R left, B right — amount oscillates
    const chromaAmt = p.analogChroma * (1 + 0.15 * Math.sin(t * 12));
    const chromaPx = Math.round(chromaAmt * 8);
    if (chromaPx > 0) {
      const chroma = new Uint8ClampedArray(out);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4;
          const rX = clamp(x - chromaPx, 0, w - 1);
          const bX = clamp(x + chromaPx, 0, w - 1);
          chroma[idx] = out[(y * w + rX) * 4];
          chroma[idx + 2] = out[(y * w + bX) * 4 + 2];
        }
      }
      out.set(chroma);
    }

    // Scanlines with flicker
    const sl = p.analogIntensity * (1 - 0.1 * Math.sin(t * 8)) * 0.65;
    for (let y = 0; y < h; y++) {
      if (y % 2 === 0) {
        const mult = 1 - sl;
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4;
          out[idx] = out[idx] * mult;
          out[idx + 1] = out[idx + 1] * mult;
          out[idx + 2] = out[idx + 2] * mult;
        }
      }
    }

    // Heavy grain re-seeded every frame
    if (p.analogIntensity > 0) {
      const grainAmt = p.analogIntensity * 55;
      const grRand = makeSeededRandom(Math.floor(timestamp));
      for (let i = 0; i < out.length; i += 4) {
        const n = (grRand() - 0.5) * grainAmt;
        out[i] = clamp(out[i] + n, 0, 255);
        out[i + 1] = clamp(out[i + 1] + n, 0, 255);
        out[i + 2] = clamp(out[i + 2] + n, 0, 255);
      }
    }

    // Tracking drift: bands scroll continuously
    if (p.analogTracking > 0) {
      const trackAmt = p.analogTracking * 30;
      for (let b = 0; b < 3; b++) {
        const offset = Math.sin(t * p.analogTracking * 3 + b * 1.7) * trackAmt;
        const bandY = Math.floor(((b / 3 + t * 0.05) % 1) * h);
        const bandH = Math.floor(h * 0.04) + 1;
        const shift = Math.round(offset);
        for (let dy = 0; dy < bandH; dy++) {
          const y = (bandY + dy) % h;
          for (let x = 0; x < w; x++) {
            const srcX = clamp(x - shift, 0, w - 1);
            const dst = (y * w + x) * 4;
            const src = (y * w + srcX) * 4;
            out[dst] = data[src];
            out[dst + 1] = data[src + 1];
            out[dst + 2] = data[src + 2];
          }
        }
      }
    }
  }

  if (p.digitalEnabled) {
    const blockRand = makeSeededRandom(Math.floor(timestamp / 50));
    const numBlocks = Math.round(p.digitalBlockSpeed * 20) + 2;
    for (let i = 0; i < numBlocks; i++) {
      const bw = Math.floor(blockRand() * 80) + 20;
      const bh = Math.floor(blockRand() * 15) + 5;
      const dstX = Math.floor(blockRand() * Math.max(1, w - bw));
      const dstY = Math.floor(blockRand() * Math.max(1, h - bh));
      const srcX = Math.floor(blockRand() * Math.max(1, w - bw));
      const srcY = Math.floor(blockRand() * Math.max(1, h - bh));
      for (let dy = 0; dy < bh; dy++) {
        for (let dx = 0; dx < bw; dx++) {
          const d = ((dstY + dy) * w + (dstX + dx)) * 4;
          const s = ((srcY + dy) * w + (srcX + dx)) * 4;
          out[d] = data[s];
          out[d + 1] = data[s + 1];
          out[d + 2] = data[s + 2];
          out[d + 3] = data[s + 3];
        }
      }
    }
  }

  return new ImageData(out, w, h);
}
