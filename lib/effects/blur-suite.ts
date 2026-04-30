import { clamp } from '../utils';

export interface BlurSuiteParams {
  mode: 'linear' | 'radial' | 'zoom' | 'wave' | 'tb' | 'lr';
  strength: number;       // 0–100
  grain: number;          // 0–100
  rgbShift: number;       // 0–50 pixels
  direction: number;      // 0–360, linear mode only
  motionX: number;        // -1 to 1, 0 = center
  motionY: number;        // -1 to 1, 0 = center
  bloom: boolean;
  bloomStrength: number;  // 0–100
  gradientMask: boolean;
}

function sampleRaw(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  x: number,
  y: number
): [number, number, number] {
  const xi = clamp(Math.round(x), 0, w - 1);
  const yi = clamp(Math.round(y), 0, h - 1);
  const i = (yi * w + xi) * 4;
  return [data[i], data[i + 1], data[i + 2]];
}

function boxBlur(src: Uint8ClampedArray, w: number, h: number, radius: number): Uint8ClampedArray {
  const d = radius * 2 + 1;
  const tmp = new Uint8ClampedArray(src.length);
  const dst = new Uint8ClampedArray(src.length);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let rS = 0, gS = 0, bS = 0;
      for (let k = -radius; k <= radius; k++) {
        const xi = clamp(x + k, 0, w - 1);
        const i = (y * w + xi) * 4;
        rS += src[i]; gS += src[i + 1]; bS += src[i + 2];
      }
      const i = (y * w + x) * 4;
      tmp[i] = rS / d; tmp[i + 1] = gS / d; tmp[i + 2] = bS / d; tmp[i + 3] = src[i + 3];
    }
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let rS = 0, gS = 0, bS = 0;
      for (let k = -radius; k <= radius; k++) {
        const yi = clamp(y + k, 0, h - 1);
        const i = (yi * w + x) * 4;
        rS += tmp[i]; gS += tmp[i + 1]; bS += tmp[i + 2];
      }
      const i = (y * w + x) * 4;
      dst[i] = rS / d; dst[i + 1] = gS / d; dst[i + 2] = bS / d; dst[i + 3] = src[i + 3];
    }
  }

  return dst;
}

export function applyBlurSuite(imageData: ImageData, params: BlurSuiteParams): ImageData {
  const { width: w, height: h, data } = imageData;
  const out = new Uint8ClampedArray(data.length);

  const cx = (params.motionX * 0.5 + 0.5) * w;
  const cy = (params.motionY * 0.5 + 0.5) * h;
  const numSamples = Math.max(2, Math.round(params.strength / 4) + 2);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let rS = 0, gS = 0, bS = 0;
      const n = numSamples;

      switch (params.mode) {
        case 'radial': {
          const dx = x - cx, dy = y - cy;
          const r = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx);
          const maxAng = (params.strength / 100) * 0.35;
          for (let s = 0; s < n; s++) {
            const a = angle + (s / n - 0.5) * maxAng;
            const [sr, sg, sb] = sampleRaw(data, w, h, cx + r * Math.cos(a), cy + r * Math.sin(a));
            rS += sr; gS += sg; bS += sb;
          }
          break;
        }
        case 'zoom': {
          const dx = x - cx, dy = y - cy;
          const maxOff = (params.strength / 100) * 0.18;
          for (let s = 0; s < n; s++) {
            const t = (s / n) * maxOff;
            const [sr, sg, sb] = sampleRaw(data, w, h, x - dx * t, y - dy * t);
            rS += sr; gS += sg; bS += sb;
          }
          break;
        }
        case 'linear': {
          const ang = (params.direction * Math.PI) / 180;
          const dist = params.strength * 0.35;
          const ca = Math.cos(ang), sa = Math.sin(ang);
          for (let s = 0; s < n; s++) {
            const d = (s / n - 0.5) * dist;
            const [sr, sg, sb] = sampleRaw(data, w, h, x + ca * d, y + sa * d);
            rS += sr; gS += sg; bS += sb;
          }
          break;
        }
        case 'tb': {
          const dist = params.strength * 0.35;
          for (let s = 0; s < n; s++) {
            const d = (s / n - 0.5) * dist;
            const [sr, sg, sb] = sampleRaw(data, w, h, x, y + d);
            rS += sr; gS += sg; bS += sb;
          }
          break;
        }
        case 'lr': {
          const dist = params.strength * 0.35;
          for (let s = 0; s < n; s++) {
            const d = (s / n - 0.5) * dist;
            const [sr, sg, sb] = sampleRaw(data, w, h, x + d, y);
            rS += sr; gS += sg; bS += sb;
          }
          break;
        }
        case 'wave': {
          const amp = params.strength * 0.12;
          const freq = 0.022;
          const [sr, sg, sb] = sampleRaw(
            data, w, h,
            x + amp * Math.sin(y * freq),
            y + amp * Math.cos(x * freq)
          );
          rS = sr * n; gS = sg * n; bS = sb * n;
          break;
        }
        default: {
          const i = (y * w + x) * 4;
          rS = data[i] * n;
          gS = data[i + 1] * n;
          bS = data[i + 2] * n;
        }
      }

      const idx = (y * w + x) * 4;
      out[idx]     = rS / n;
      out[idx + 1] = gS / n;
      out[idx + 2] = bS / n;
      out[idx + 3] = data[idx + 3];
    }
  }

  // Gradient mask: center is sharp (original), edges are fully blurred
  if (params.gradientMask) {
    const halfDiag = Math.sqrt((w * 0.5) ** 2 + (h * 0.5) ** 2);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const dx = x - cx, dy = y - cy;
        const t = Math.min(Math.sqrt(dx * dx + dy * dy) / halfDiag, 1);
        out[idx]     = data[idx]     * (1 - t) + out[idx]     * t;
        out[idx + 1] = data[idx + 1] * (1 - t) + out[idx + 1] * t;
        out[idx + 2] = data[idx + 2] * (1 - t) + out[idx + 2] * t;
      }
    }
  }

  // RGB shift
  const post = new Uint8ClampedArray(out);
  if (params.rgbShift > 0) {
    const shift = Math.round(params.rgbShift);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const rX = clamp(x - shift, 0, w - 1);
        const bX = clamp(x + shift, 0, w - 1);
        post[idx]     = out[(y * w + rX) * 4];
        post[idx + 2] = out[(y * w + bX) * 4 + 2];
      }
    }
  }

  // Grain
  if (params.grain > 0) {
    const g = params.grain * 2.0;
    for (let i = 0; i < post.length; i += 4) {
      const n = (Math.random() - 0.5) * g;
      post[i]     = clamp(post[i]     + n, 0, 255);
      post[i + 1] = clamp(post[i + 1] + n, 0, 255);
      post[i + 2] = clamp(post[i + 2] + n, 0, 255);
    }
  }

  // Bloom: extract highlights, blur them, screen-blend back
  if (params.bloom) {
    const s = params.bloomStrength / 100;
    const THRESHOLD = Math.round(clamp(220 - s * 140, 50, 220));
    const radius = Math.max(4, Math.round(s * 16 + 4));
    const highlights = new Uint8ClampedArray(post.length);
    for (let i = 0; i < post.length; i += 4) {
      const lum = post[i] * 0.299 + post[i + 1] * 0.587 + post[i + 2] * 0.114;
      if (lum > THRESHOLD) {
        const excess = (lum - THRESHOLD) / (255 - THRESHOLD);
        highlights[i]     = post[i]     * excess;
        highlights[i + 1] = post[i + 1] * excess;
        highlights[i + 2] = post[i + 2] * excess;
        highlights[i + 3] = 255;
      }
    }
    const blurred = boxBlur(highlights, w, h, radius);
    for (let i = 0; i < post.length; i += 4) {
      post[i]     = 255 - ((255 - post[i])     * (255 - blurred[i])     / 255);
      post[i + 1] = 255 - ((255 - post[i + 1]) * (255 - blurred[i + 1]) / 255);
      post[i + 2] = 255 - ((255 - post[i + 2]) * (255 - blurred[i + 2]) / 255);
    }
  }

  return new ImageData(post, w, h);
}

export function renderBlurSuite(canvas: HTMLCanvasElement, imageData: ImageData, params: BlurSuiteParams) {
  const result = applyBlurSuite(imageData, params);
  canvas.width = result.width;
  canvas.height = result.height;
  const ctx = canvas.getContext('2d');
  if (ctx) ctx.putImageData(result, 0, 0);
}
