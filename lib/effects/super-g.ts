import { clamp, makeSeededRandom } from '../utils';

export interface SuperGParams {
  rgbSplit: number;        // 0–1, default 0.02
  digitalStripe: number;   // 0–1, default 0.2
  imageBlock: number;      // 0–1, default 0.3
  lineBlock: number;       // 0–1, default 0.2
  scanlineJitter: number;  // 0–1, default 0
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

  // Step 1: RGB Split
  const shiftPx = Math.round(params.rgbSplit * w);
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

  // Step 2: Scanline jitter
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
        jittered[dst] = out[src];
        jittered[dst + 1] = out[src + 1];
        jittered[dst + 2] = out[src + 2];
        jittered[dst + 3] = out[src + 3];
      }
    }
    out.set(jittered);
  }

  // Step 3: Line block — thin bands shifted by a large amount
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
          out[dst] = data[src];
          out[dst + 1] = data[src + 1];
          out[dst + 2] = data[src + 2];
          out[dst + 3] = data[src + 3];
        }
      }
    }
  }

  // Step 4: Digital stripe — wide bands shifted
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
          out[dst] = data[src];
          out[dst + 1] = data[src + 1];
          out[dst + 2] = data[src + 2];
          out[dst + 3] = data[src + 3];
        }
      }
    }
  }

  // Step 5: Image block — rectangles copied from a random source position
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
