import { clamp, makeSeededRandom } from '../utils';

export interface SuperGParams {
  rgbSplit: number;       // 0–1, default 0.02
  digitalStripe: number;  // 0–1, default 0.2
  imageBlock: number;     // 0–1, default 0.3
  lineBlock: number;      // 0–1, default 0.2
  scanlineJitter: number; // 0–1, default 0
  screenJump: number;     // 0–1, default 0
  screenShake: number;    // 0–1, default 0
  tileJitter: number;     // 0–1, default 0.1
  waveJitter: number;     // 0–1, default 0
  analogNoise: number;    // 0–1, default 0.1
}

/** ANIMATED — glitch positions re-randomize every frame */
export function renderSuperG(
  imageData: ImageData,
  params: SuperGParams,
  timestamp: number
): ImageData {
  const { width: w, height: h, data } = imageData;
  const out = new Uint8ClampedArray(data.length);

  const frameSeed = Math.floor(timestamp / 16);
  const rand = makeSeededRandom(frameSeed);

  // RGB Split
  const shiftPx = Math.round(params.rgbSplit * w * 0.05);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const rX = clamp(x - shiftPx, 0, w - 1);
      const bX = clamp(x + shiftPx, 0, w - 1);
      out[idx] = data[(y * w + rX) * 4];
      out[idx + 1] = data[idx + 1];
      out[idx + 2] = data[(y * w + bX) * 4 + 2];
      out[idx + 3] = data[idx + 3];
    }
  }

  // Scanline jitter
  if (params.scanlineJitter > 0) {
    const maxJ = Math.round(params.scanlineJitter * 20);
    const jittered = new Uint8ClampedArray(out);
    for (let y = 0; y < h; y++) {
      const j = Math.round((rand() * 2 - 1) * maxJ);
      if (j === 0) continue;
      for (let x = 0; x < w; x++) {
        const srcX = clamp(x - j, 0, w - 1);
        const dst = (y * w + x) * 4;
        const src = (y * w + srcX) * 4;
        jittered[dst] = out[src]; jittered[dst + 1] = out[src + 1];
        jittered[dst + 2] = out[src + 2]; jittered[dst + 3] = out[src + 3];
      }
    }
    out.set(jittered);
  }

  // Line block
  if (params.lineBlock > 0) {
    const N = Math.ceil(params.lineBlock * 50);
    for (let i = 0; i < N; i++) {
      const bandY = Math.floor(rand() * h);
      const bandH = Math.floor(rand() * 3) + 1;
      const shift = Math.round((rand() * 2 - 1) * 120);
      for (let dy = 0; dy < bandH; dy++) {
        const y = clamp(bandY + dy, 0, h - 1);
        for (let x = 0; x < w; x++) {
          const srcX = clamp(x - shift, 0, w - 1);
          const dst = (y * w + x) * 4;
          const src = (y * w + srcX) * 4;
          out[dst] = data[src]; out[dst + 1] = data[src + 1];
          out[dst + 2] = data[src + 2]; out[dst + 3] = data[src + 3];
        }
      }
    }
  }

  // Digital stripe
  if (params.digitalStripe > 0) {
    const M = Math.ceil(params.digitalStripe * 20);
    for (let i = 0; i < M; i++) {
      const bandY = Math.floor(rand() * h);
      const bandH = Math.floor(rand() * 30) + 10;
      const shift = Math.round((rand() * 2 - 1) * 60);
      for (let dy = 0; dy < bandH; dy++) {
        const y = clamp(bandY + dy, 0, h - 1);
        for (let x = 0; x < w; x++) {
          const srcX = clamp(x - shift, 0, w - 1);
          const dst = (y * w + x) * 4;
          const src = (y * w + srcX) * 4;
          out[dst] = data[src]; out[dst + 1] = data[src + 1];
          out[dst + 2] = data[src + 2]; out[dst + 3] = data[src + 3];
        }
      }
    }
  }

  // Image block
  if (params.imageBlock > 0) {
    const K = Math.ceil(params.imageBlock * 15);
    for (let i = 0; i < K; i++) {
      const bw = Math.floor(rand() * 80) + 40;
      const bh = Math.floor(rand() * 40) + 20;
      const dstX = Math.floor(rand() * Math.max(1, w - bw));
      const dstY = Math.floor(rand() * Math.max(1, h - bh));
      const srcX = Math.floor(rand() * Math.max(1, w - bw));
      const srcY = Math.floor(rand() * Math.max(1, h - bh));
      for (let dy = 0; dy < bh; dy++) {
        for (let dx = 0; dx < bw; dx++) {
          const d = ((dstY + dy) * w + (dstX + dx)) * 4;
          const s = ((srcY + dy) * w + (srcX + dx)) * 4;
          out[d] = data[s]; out[d + 1] = data[s + 1];
          out[d + 2] = data[s + 2]; out[d + 3] = data[s + 3];
        }
      }
    }
  }

  // Tile jitter — divide into horizontal tiles, offset each randomly
  if (params.tileJitter > 0) {
    const tileH = Math.max(4, Math.round((1 - params.tileJitter) * 60) + 4);
    const maxShift = Math.round(params.tileJitter * w * 0.08);
    for (let y = 0; y < h; y += tileH) {
      const shift = Math.round((rand() * 2 - 1) * maxShift);
      if (shift === 0) continue;
      for (let dy = 0; dy < tileH && y + dy < h; dy++) {
        const row = y + dy;
        for (let x = 0; x < w; x++) {
          const srcX = clamp(x - shift, 0, w - 1);
          const dst = (row * w + x) * 4;
          const src = (row * w + srcX) * 4;
          out[dst] = out[src]; out[dst + 1] = out[src + 1];
          out[dst + 2] = out[src + 2]; out[dst + 3] = out[src + 3];
        }
      }
    }
  }

  // Wave jitter — sinusoidal horizontal distortion
  if (params.waveJitter > 0) {
    const waved = new Uint8ClampedArray(out);
    const amp = params.waveJitter * w * 0.04;
    const freq = 0.04;
    const phase = timestamp / 250;
    for (let y = 0; y < h; y++) {
      const shift = Math.round(amp * Math.sin(y * freq + phase));
      if (shift === 0) continue;
      for (let x = 0; x < w; x++) {
        const srcX = clamp(x - shift, 0, w - 1);
        const dst = (y * w + x) * 4;
        const src = (y * w + srcX) * 4;
        waved[dst] = out[src]; waved[dst + 1] = out[src + 1];
        waved[dst + 2] = out[src + 2]; waved[dst + 3] = out[src + 3];
      }
    }
    out.set(waved);
  }

  // Screen shake — whole-image horizontal shift
  if (params.screenShake > 0) {
    const shakeAmt = Math.round((rand() * 2 - 1) * params.screenShake * w * 0.04);
    if (shakeAmt !== 0) {
      const shaken = new Uint8ClampedArray(out);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const srcX = clamp(x - shakeAmt, 0, w - 1);
          const dst = (y * w + x) * 4;
          const src = (y * w + srcX) * 4;
          shaken[dst] = out[src]; shaken[dst + 1] = out[src + 1];
          shaken[dst + 2] = out[src + 2]; shaken[dst + 3] = out[src + 3];
        }
      }
      out.set(shaken);
    }
  }

  // Screen jump — whole-image vertical shift
  if (params.screenJump > 0) {
    const jumpAmt = Math.round((rand() * 2 - 1) * params.screenJump * h * 0.06);
    if (jumpAmt !== 0) {
      const jumped = new Uint8ClampedArray(out);
      for (let y = 0; y < h; y++) {
        const srcY = clamp(y - jumpAmt, 0, h - 1);
        for (let x = 0; x < w; x++) {
          const dst = (y * w + x) * 4;
          const src = (srcY * w + x) * 4;
          jumped[dst] = out[src]; jumped[dst + 1] = out[src + 1];
          jumped[dst + 2] = out[src + 2]; jumped[dst + 3] = out[src + 3];
        }
      }
      out.set(jumped);
    }
  }

  // Analog noise
  if (params.analogNoise > 0) {
    const noiseRng = makeSeededRandom(frameSeed * 31 + 17);
    const noiseAmt = params.analogNoise * 50;
    for (let i = 0; i < out.length; i += 4) {
      const n = (noiseRng() - 0.5) * noiseAmt;
      out[i] = clamp(out[i] + n, 0, 255);
      out[i + 1] = clamp(out[i + 1] + n, 0, 255);
      out[i + 2] = clamp(out[i + 2] + n, 0, 255);
    }
  }

  return new ImageData(out, w, h);
}
