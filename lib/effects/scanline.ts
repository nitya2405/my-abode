import { clamp, makeSeededRandom } from '../utils';

export interface ScanlineParams {
  preset: 'full' | 'analog' | 'digital' | 'subtle';
  analogEnabled: boolean;
  analogIntensity: number;      // 0–1
  analogChroma: number;         // 0–1
  analogTracking: number;       // 0–1
  digitalEnabled: boolean;
  digitalBlockSpeed: number;    // 0–1
  digitalBlockCoverage: number; // 0–1
  crtEnabled: boolean;
  curvature: number;            // 0–1
  vignette: number;             // 0–1
  timingDuration: number;       // 1–15 seconds
  timingAmount: number;         // 0–1
  noise: number;                // 0–1
  scanlineFreq: number;         // 0–1
  scanlineSpeed: number;        // 0–1
  scanlineIntensity: number;    // 0–1
  monoEnabled: boolean;
}

function applyPreset(params: ScanlineParams): ScanlineParams {
  switch (params.preset) {
    case 'full':
      return { ...params, analogEnabled: true, analogIntensity: 0.8, analogChroma: 0.6, analogTracking: 0.5, digitalEnabled: true, digitalBlockSpeed: 0.6, digitalBlockCoverage: 0.5, crtEnabled: true, curvature: 0.4, vignette: 0.5, noise: 0.3, scanlineFreq: 0.5, scanlineSpeed: 0.3, scanlineIntensity: 0.5 };
    case 'analog':
      return { ...params, analogEnabled: true, analogIntensity: 0.7, analogChroma: 0.5, analogTracking: 0.4, digitalEnabled: false, crtEnabled: true, curvature: 0.3, vignette: 0.4, noise: 0.2, scanlineFreq: 0.5, scanlineSpeed: 0.3, scanlineIntensity: 0.4 };
    case 'digital':
      return { ...params, analogEnabled: false, digitalEnabled: true, digitalBlockSpeed: 0.8, digitalBlockCoverage: 0.6, crtEnabled: false, noise: 0.1, scanlineFreq: 0.3, scanlineSpeed: 0.0, scanlineIntensity: 0.1 };
    case 'subtle':
      return { ...params, analogEnabled: true, analogIntensity: 0.25, analogChroma: 0.15, analogTracking: 0.1, digitalEnabled: true, digitalBlockSpeed: 0.1, digitalBlockCoverage: 0.1, crtEnabled: false, vignette: 0.2, noise: 0.05, scanlineFreq: 0.5, scanlineSpeed: 0.1, scanlineIntensity: 0.15 };
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

  // Mono
  if (p.monoEnabled) {
    for (let i = 0; i < out.length; i += 4) {
      const g = clamp(0.299 * out[i] + 0.587 * out[i + 1] + 0.114 * out[i + 2], 0, 255);
      out[i] = out[i + 1] = out[i + 2] = g;
    }
  }

  // Analog effects
  if (p.analogEnabled) {
    const chromaAmt = p.analogChroma * (1 + 0.15 * Math.sin(t * 12));
    const chromaPx = Math.round(chromaAmt * 8);
    if (chromaPx > 0) {
      const chroma = new Uint8ClampedArray(out);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4;
          chroma[idx] = out[(y * w + clamp(x - chromaPx, 0, w - 1)) * 4];
          chroma[idx + 2] = out[(y * w + clamp(x + chromaPx, 0, w - 1)) * 4 + 2];
        }
      }
      out.set(chroma);
    }

    if (p.analogIntensity > 0) {
      const grainAmt = p.analogIntensity * 55;
      const rng = makeSeededRandom(Math.floor(timestamp));
      for (let i = 0; i < out.length; i += 4) {
        const n = (rng() - 0.5) * grainAmt;
        out[i] = clamp(out[i] + n, 0, 255);
        out[i + 1] = clamp(out[i + 1] + n, 0, 255);
        out[i + 2] = clamp(out[i + 2] + n, 0, 255);
      }
    }

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
            out[dst] = data[src]; out[dst + 1] = data[src + 1]; out[dst + 2] = data[src + 2];
          }
        }
      }
    }
  }

  // Digital corruption
  if (p.digitalEnabled) {
    const tickMs = Math.max(16, Math.round((1.01 - p.digitalBlockSpeed) * 200));
    const blockRand = makeSeededRandom(Math.floor(timestamp / tickMs));
    const numBlocks = Math.round(p.digitalBlockCoverage * 25) + 1;
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
          out[d] = data[s]; out[d + 1] = data[s + 1]; out[d + 2] = data[s + 2]; out[d + 3] = data[s + 3];
        }
      }
    }
  }

  // Display: scrolling scanlines
  if (p.scanlineIntensity > 0 && p.scanlineFreq > 0) {
    const period = Math.max(2, Math.round((1 - p.scanlineFreq) * 8) + 2);
    const scroll = Math.floor(t * p.scanlineSpeed * 40) % period;
    const sl = p.scanlineIntensity * 0.75;
    for (let y = 0; y < h; y++) {
      if ((y + scroll) % period === 0) {
        const mult = 1 - sl;
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4;
          out[idx] = out[idx] * mult;
          out[idx + 1] = out[idx + 1] * mult;
          out[idx + 2] = out[idx + 2] * mult;
        }
      }
    }
  }

  // Display: noise
  if (p.noise > 0) {
    const noiseRng = makeSeededRandom(Math.floor(timestamp * 7 + 3));
    const noiseAmt = p.noise * 40;
    for (let i = 0; i < out.length; i += 4) {
      const n = (noiseRng() - 0.5) * noiseAmt;
      out[i] = clamp(out[i] + n, 0, 255);
      out[i + 1] = clamp(out[i + 1] + n, 0, 255);
      out[i + 2] = clamp(out[i + 2] + n, 0, 255);
    }
  }

  // Timing: periodic glitch burst
  if (p.timingAmount > 0 && p.timingDuration > 0) {
    const cycleT = (t % p.timingDuration) / p.timingDuration;
    if (cycleT > 0.93) {
      const intensity = ((cycleT - 0.93) / 0.07) * p.timingAmount;
      const burstRng = makeSeededRandom(Math.floor(t / p.timingDuration));
      const numBands = Math.floor(intensity * 12) + 1;
      const maxShift = Math.round(intensity * 30);
      for (let i = 0; i < numBands; i++) {
        const bandY = Math.floor(burstRng() * h);
        const bandH = Math.floor(burstRng() * 6) + 2;
        const shift = Math.round((burstRng() * 2 - 1) * maxShift);
        for (let dy = 0; dy < bandH; dy++) {
          const y = clamp(bandY + dy, 0, h - 1);
          for (let x = 0; x < w; x++) {
            const srcX = clamp(x - shift, 0, w - 1);
            const dst = (y * w + x) * 4;
            const src = (y * w + srcX) * 4;
            out[dst] = out[src]; out[dst + 1] = out[src + 1]; out[dst + 2] = out[src + 2];
          }
        }
      }
    }
  }

  // CRT: vignette
  if (p.crtEnabled && p.vignette > 0) {
    for (let y = 0; y < h; y++) {
      const ny = (y / h) * 2 - 1;
      for (let x = 0; x < w; x++) {
        const nx = (x / w) * 2 - 1;
        const d = (nx * nx + ny * ny) / 2;
        const factor = clamp(1 - p.vignette * d * 1.6, 0, 1);
        const idx = (y * w + x) * 4;
        out[idx] = out[idx] * factor;
        out[idx + 1] = out[idx + 1] * factor;
        out[idx + 2] = out[idx + 2] * factor;
      }
    }
  }

  // CRT: barrel distortion
  if (p.crtEnabled && p.curvature > 0) {
    const distorted = new Uint8ClampedArray(out.length);
    const k = p.curvature * 0.45;
    for (let y = 0; y < h; y++) {
      const ny = (y / h) * 2 - 1;
      for (let x = 0; x < w; x++) {
        const nx = (x / w) * 2 - 1;
        const r2 = nx * nx + ny * ny;
        const factor = 1 + k * r2;
        const srcX = Math.round(((nx / factor) + 1) / 2 * w);
        const srcY = Math.round(((ny / factor) + 1) / 2 * h);
        const dst = (y * w + x) * 4;
        if (srcX >= 0 && srcX < w && srcY >= 0 && srcY < h) {
          const src = (srcY * w + srcX) * 4;
          distorted[dst] = out[src]; distorted[dst + 1] = out[src + 1];
          distorted[dst + 2] = out[src + 2]; distorted[dst + 3] = out[src + 3];
        }
      }
    }
    out.set(distorted);
  }

  return new ImageData(out, w, h);
}
