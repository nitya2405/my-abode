import { clamp } from '../utils';

export interface BlurSuiteParams {
  mode: 'linear' | 'radial' | 'zoom' | 'wave' | 'tb' | 'lr';
  strength: number;    // 0–100
  grain: number;       // 0–100
  rgbShift: number;    // 0–50 pixels
  direction: number;   // 0–360 for linear mode
  centerX: number;     // 0–1
  centerY: number;     // 0–1
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

export function applyBlurSuite(imageData: ImageData, params: BlurSuiteParams): ImageData {
  const { width: w, height: h, data } = imageData;
  const out = new Uint8ClampedArray(data.length);

  const cx = params.centerX * w;
  const cy = params.centerY * h;
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
      out[idx] = rS / n;
      out[idx + 1] = gS / n;
      out[idx + 2] = bS / n;
      out[idx + 3] = data[idx + 3];
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
        post[idx] = out[(y * w + rX) * 4];
        post[idx + 2] = out[(y * w + bX) * 4 + 2];
      }
    }
  }

  // Grain
  if (params.grain > 0) {
    const g = params.grain * 2.0;
    for (let i = 0; i < post.length; i += 4) {
      const n = (Math.random() - 0.5) * g;
      post[i] = clamp(post[i] + n, 0, 255);
      post[i + 1] = clamp(post[i + 1] + n, 0, 255);
      post[i + 2] = clamp(post[i + 2] + n, 0, 255);
    }
  }

  return new ImageData(post, w, h);
}
