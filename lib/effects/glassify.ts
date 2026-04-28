import { clamp, makeSeededRandom } from '../utils';

export interface GlassifyParams {
  effect: 'none' | 'radial' | 'glitch' | 'stripe' | 'organic' | 'ripple';
  layers: number;    // 1–20
  offset: number;    // 0–100
  rotation: number;  // 0–1 radians per layer
  radius: number;    // 0–1 region size
}

/** ANIMATED — rotation angle accumulates with timestamp */
export function renderGlassify(
  imageData: ImageData,
  params: GlassifyParams,
  timestamp: number
): ImageData {
  const { width: w, height: h } = imageData;
  const cx = w / 2, cy = h / 2;

  if (params.effect === 'radial') {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;

    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = w;
    srcCanvas.height = h;
    srcCanvas.getContext('2d')!.putImageData(imageData, 0, 0);

    const animAngle = (timestamp * 0.001) * params.rotation;
    const maxR = Math.min(w, h) * 0.5 * params.radius;

    // Start with original image as base
    ctx.drawImage(srcCanvas, 0, 0);

    // Draw N stacked rotated copies inside the radial region
    for (let i = 0; i < params.layers; i++) {
      const layerAngle = i * params.rotation * Math.PI + animAngle;
      const scale = 1 - (i / params.layers) * 0.28;
      const opacity = Math.min(1, (1 / params.layers) * 1.8);

      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.translate(cx, cy);
      ctx.rotate(layerAngle);
      ctx.scale(scale, scale);
      ctx.translate(-w / 2, -h / 2);
      ctx.drawImage(srcCanvas, 0, 0);
      ctx.restore();
    }

    // Clip to circle by zeroing pixels outside radius
    const result = ctx.getImageData(0, 0, w, h);
    const orig = imageData.data;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
        if (dist > maxR) {
          const i = (y * w + x) * 4;
          result.data[i] = orig[i];
          result.data[i + 1] = orig[i + 1];
          result.data[i + 2] = orig[i + 2];
          result.data[i + 3] = orig[i + 3];
        }
      }
    }
    return result;
  }

  // Pixel-displacement effects
  const out = new Uint8ClampedArray(imageData.data.length);
  const src = imageData.data;

  if (params.effect === 'ripple') {
    const phase = timestamp * 0.002;
    const amp = params.offset * 0.4;
    const freq = 0.025;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
        const sx = clamp(Math.round(x + amp * Math.sin(dist * freq - phase)), 0, w - 1);
        const sy = clamp(Math.round(y + amp * Math.cos(dist * freq - phase)), 0, h - 1);
        const di = (y * w + x) * 4;
        const si = (sy * w + sx) * 4;
        out[di] = src[si]; out[di + 1] = src[si + 1]; out[di + 2] = src[si + 2]; out[di + 3] = src[si + 3];
      }
    }
  } else if (params.effect === 'stripe') {
    const phase = timestamp * 0.001;
    const amp = params.offset * 0.6;
    const freq = 0.04;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const sx = clamp(Math.round(x + amp * Math.sin(y * freq + phase)), 0, w - 1);
        const di = (y * w + x) * 4;
        const si = (y * w + sx) * 4;
        out[di] = src[si]; out[di + 1] = src[si + 1]; out[di + 2] = src[si + 2]; out[di + 3] = src[si + 3];
      }
    }
  } else if (params.effect === 'glitch') {
    out.set(src);
    const rand = makeSeededRandom(Math.floor(timestamp / 33));
    const numBlocks = Math.ceil(params.layers * 0.5) + 3;
    for (let i = 0; i < numBlocks; i++) {
      const bw = Math.floor(rand() * w * 0.35) + 20;
      const bh = Math.floor(rand() * 25) + 8;
      const bx = Math.floor(rand() * Math.max(1, w - bw));
      const by = Math.floor(rand() * Math.max(1, h - bh));
      const shift = Math.round((rand() - 0.5) * params.offset * 0.6);
      for (let dy = 0; dy < bh; dy++) {
        for (let dx = 0; dx < bw; dx++) {
          const dstX = clamp(bx + dx, 0, w - 1);
          const srcX = clamp(bx + dx - shift, 0, w - 1);
          const d = ((by + dy) * w + dstX) * 4;
          const s = ((by + dy) * w + srcX) * 4;
          out[d] = src[s]; out[d + 1] = src[s + 1]; out[d + 2] = src[s + 2];
        }
      }
    }
  } else if (params.effect === 'organic') {
    const phase = timestamp * 0.0005;
    const amp = params.offset * 0.5;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const nx = (x / w) * 4;
        const ny = (y / h) * 4;
        const noiseX = Math.sin(nx + Math.cos(ny + phase)) * amp;
        const noiseY = Math.cos(ny + Math.sin(nx + phase)) * amp;
        const sx = clamp(Math.round(x + noiseX), 0, w - 1);
        const sy = clamp(Math.round(y + noiseY), 0, h - 1);
        const di = (y * w + x) * 4;
        const si = (sy * w + sx) * 4;
        out[di] = src[si]; out[di + 1] = src[si + 1]; out[di + 2] = src[si + 2]; out[di + 3] = src[si + 3];
      }
    }
  } else {
    // none
    out.set(src);
  }

  return new ImageData(out, w, h);
}
