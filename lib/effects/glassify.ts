import { clamp, makeSeededRandom } from '../utils';

export interface GlassifyParams {
  effect: 'none' | 'radial' | 'glitch' | 'stripe' | 'organic' | 'ripple';
  // Radial
  layers: number;            // 1–20
  offset: number;            // 0–100
  rotation: number;          // 0–1
  radius: number;            // 0–1
  shadowStrength: number;    // 0–1
  shadowWidth: number;       // 0–0.2
  highlightStrength: number; // 0–1
  highlightWidth: number;    // 0–0.1
  // Glitch
  seed: number;              // 1–20
  strength: number;          // 1–20
  // Stripe / Organic / Ripple
  size: number;              // 0.05–1.0
  angle: number;             // 0–360
  distortion: number;        // 0–1
  shift: number;             // 0–1
  blur: number;              // 0–10
}

function applyCanvasBlur(pixels: Uint8ClampedArray, w: number, h: number, px: number): ImageData {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  c.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(pixels), w, h), 0, 0);
  const c2 = document.createElement('canvas');
  c2.width = w; c2.height = h;
  const ctx2 = c2.getContext('2d')!;
  ctx2.filter = `blur(${px}px)`;
  ctx2.drawImage(c, 0, 0);
  return ctx2.getImageData(0, 0, w, h);
}

function renderRadial(imageData: ImageData, params: GlassifyParams, timestamp: number): ImageData {
  const { width: w, height: h } = imageData;
  const cx = w / 2, cy = h / 2;
  const maxR = Math.min(w, h) * 0.5 * params.radius;

  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = w; srcCanvas.height = h;
  srcCanvas.getContext('2d')!.putImageData(imageData, 0, 0);

  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  const animAngle = (timestamp * 0.001) * params.rotation;

  // Draw base image
  ctx.drawImage(srcCanvas, 0, 0);

  // Stack rotated copies
  const opacity = Math.min(1, (1 / Math.max(1, params.layers)) * 1.8);
  for (let i = 0; i < params.layers; i++) {
    const layerAngle = i * params.rotation * Math.PI + animAngle;
    const scale = 1 - (i / params.layers) * 0.22;
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.translate(cx, cy);
    ctx.rotate(layerAngle);
    ctx.scale(scale, scale);
    ctx.translate(-cx, -cy);
    ctx.drawImage(srcCanvas, 0, 0);
    ctx.restore();
  }

  // Shadow / highlight concentric rings
  if (params.shadowStrength > 0 || params.highlightStrength > 0) {
    const lightAngle = animAngle + Math.PI / 4;
    const ringCount = Math.min(params.layers, 8);
    for (let i = 1; i <= ringCount; i++) {
      const r = (i / ringCount) * maxR;
      if (params.shadowStrength > 0) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, lightAngle + Math.PI, lightAngle + Math.PI * 2);
        ctx.strokeStyle = `rgba(0,0,0,${params.shadowStrength.toFixed(2)})`;
        ctx.lineWidth = Math.max(1, params.shadowWidth * maxR);
        ctx.stroke();
      }
      if (params.highlightStrength > 0) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, lightAngle, lightAngle + Math.PI);
        ctx.strokeStyle = `rgba(255,255,255,${params.highlightStrength.toFixed(2)})`;
        ctx.lineWidth = Math.max(0.5, params.highlightWidth * maxR);
        ctx.stroke();
      }
    }
  }

  // Restore original pixels outside radius
  const result = ctx.getImageData(0, 0, w, h);
  const orig = imageData.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) > maxR) {
        const i = (y * w + x) * 4;
        result.data[i] = orig[i]; result.data[i + 1] = orig[i + 1];
        result.data[i + 2] = orig[i + 2]; result.data[i + 3] = orig[i + 3];
      }
    }
  }
  return result;
}

function renderGlitch(src: Uint8ClampedArray, w: number, h: number, params: GlassifyParams, timestamp: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(src);
  const frameSeed = Math.floor(timestamp / 33) + params.seed * 1000;
  const rand = makeSeededRandom(frameSeed);
  const numBlocks = Math.ceil(params.strength * 1.5) + 2;
  const maxShift = w * 0.12 * (params.strength / 10);

  for (let i = 0; i < numBlocks; i++) {
    const bw = Math.floor(rand() * w * 0.5) + 30;
    const bh = Math.floor(rand() * 30) + 6;
    const bx = Math.floor(rand() * Math.max(1, w - bw));
    const by = Math.floor(rand() * Math.max(1, h - bh));
    const shift = Math.round((rand() - 0.5) * maxShift * 2);
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
  return out;
}

function renderDisplacement(
  src: Uint8ClampedArray, w: number, h: number,
  effect: 'stripe' | 'organic' | 'ripple',
  params: GlassifyParams, timestamp: number
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(src.length);
  const amp = params.distortion * Math.max(w, h) * 0.25;
  const rad = (params.angle * Math.PI) / 180;
  const cx = w / 2, cy = h / 2;
  const freq = 1 / (params.size * 120 + 8);
  const phase = params.shift * Math.PI * 2 + timestamp * 0.0015;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let dx = 0, dy = 0;

      if (effect === 'stripe') {
        // Perpendicular-to-angle displacement: creates ribbed glass look
        const proj = x * Math.cos(rad) + y * Math.sin(rad);
        const d = amp * Math.sin(proj * freq + phase);
        dx = d * Math.sin(rad);
        dy = -d * Math.cos(rad);
      } else if (effect === 'organic') {
        const nx = x * freq, ny = y * freq;
        dx = amp * Math.sin(nx + Math.cos(ny * 0.8 + phase * 0.7));
        dy = amp * Math.cos(ny + Math.sin(nx * 0.8 + phase * 0.7));
        // Rotate displacement by angle
        const rdx = dx * Math.cos(rad) - dy * Math.sin(rad);
        const rdy = dx * Math.sin(rad) + dy * Math.cos(rad);
        dx = rdx; dy = rdy;
      } else if (effect === 'ripple') {
        const rx = x - cx, ry = y - cy;
        const dist = Math.sqrt(rx * rx + ry * ry);
        if (dist > 0.5) {
          const wave = amp * Math.sin(dist * freq * 6 + phase);
          dx = wave * rx / dist;
          dy = wave * ry / dist;
        }
      }

      const sx = clamp(Math.round(x + dx), 0, w - 1);
      const sy = clamp(Math.round(y + dy), 0, h - 1);
      const di = (y * w + x) * 4;
      const si = (sy * w + sx) * 4;
      out[di] = src[si]; out[di + 1] = src[si + 1]; out[di + 2] = src[si + 2]; out[di + 3] = src[si + 3];
    }
  }
  return out;
}

/** ANIMATED — rotation/phase accumulates with timestamp */
export function renderGlassify(
  imageData: ImageData,
  params: GlassifyParams,
  timestamp: number
): ImageData {
  const { width: w, height: h } = imageData;
  const src = imageData.data;

  if (params.effect === 'none') {
    return new ImageData(new Uint8ClampedArray(src), w, h);
  }

  if (params.effect === 'radial') {
    return renderRadial(imageData, params, timestamp);
  }

  let out: Uint8ClampedArray;

  if (params.effect === 'glitch') {
    out = renderGlitch(src, w, h, params, timestamp);
  } else {
    out = renderDisplacement(src, w, h, params.effect, params, timestamp);
  }

  if (params.blur > 0) {
    return applyCanvasBlur(out, w, h, params.blur);
  }

  return new ImageData(new Uint8ClampedArray(out), w, h);
}
