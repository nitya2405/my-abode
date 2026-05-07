export type DitherAlgo =
  | 'floyd' | 'atkinson' | 'jarvis' | 'stucki' | 'burkes'
  | 'sierra' | 'sierra2' | 'sierral'
  | 'bayer2' | 'bayer4' | 'bayer8' | 'bayer16'
  | 'clustered' | 'bluenoise' | 'ign' | 'crosshatch';

export interface DitherParams {
  algorithm: DitherAlgo;
  intensity: number;    // 0–2
  modulation: number;   // –1 to 1
  brightness: number;   // –100 to 100
  contrast: number;     // –100 to 100
  gamma: number;        // 0.1–3.0
  sharpen: number;      // 0–5
  foreground: string;
  background: string;
  chromatic: boolean;
  maxDisplace: number;  // 0–20 px
  redChannel: number;   // 0–100
  greenChannel: number; // 0–100
  blueChannel: number;  // 0–100
}

type AlgoMeta = { label: string; sub: string; ordered: boolean };
export const ALGO_META: Record<DitherAlgo, AlgoMeta> = {
  floyd:     { label: 'FLOYD-STEINBERG',     sub: 'error diffusion',    ordered: false },
  atkinson:  { label: 'ATKINSON',            sub: '1984 mac, crisp',    ordered: false },
  jarvis:    { label: 'JARVIS-JUDICE-NINKE', sub: 'wide kernel',        ordered: false },
  stucki:    { label: 'STUCKI',              sub: 'enhanced jarvis',    ordered: false },
  burkes:    { label: 'BURKES',              sub: 'fast diffusion',     ordered: false },
  sierra:    { label: 'SIERRA',              sub: 'three-row',          ordered: false },
  sierra2:   { label: 'SIERRA TWO-ROW',      sub: 'two-row variant',    ordered: false },
  sierral:   { label: 'SIERRA LITE',         sub: 'fast, one-row',      ordered: false },
  bayer2:    { label: 'BAYER 2×2',           sub: 'ordered 4-tone',     ordered: true  },
  bayer4:    { label: 'BAYER 4×4',           sub: 'ordered 16-tone',    ordered: true  },
  bayer8:    { label: 'BAYER 8×8',           sub: 'ordered 64-tone',    ordered: true  },
  bayer16:   { label: 'BAYER 16×16',         sub: 'ordered 256-tone',   ordered: true  },
  clustered: { label: 'CLUSTERED DOT',       sub: 'halftone screen',    ordered: true  },
  bluenoise: { label: 'BLUE NOISE',          sub: 'perceptual uniform', ordered: true  },
  ign:       { label: 'INTERLEAVED GRADIENT',sub: 'IGN hash',           ordered: true  },
  crosshatch:{ label: 'CROSSHATCH',          sub: 'diagonal lines',     ordered: true  },
};

// ── Bayer matrix generation ───────────────────────────────────────────────────

function makeBayer(n: number): number[][] {
  if (n === 1) return [[0]];
  const b = makeBayer(n >> 1), h = n >> 1;
  return Array.from({ length: n }, (_, y) =>
    Array.from({ length: n }, (_, x) => {
      const v = b[y & (h - 1)][x & (h - 1)] * 4;
      if (y < h && x < h) return v;
      if (y < h)          return v + 2;
      if (x < h)          return v + 3;
      return v + 1;
    })
  );
}

const B2  = makeBayer(2);
const B4  = makeBayer(4);
const B8  = makeBayer(8);
const B16 = makeBayer(16);

// Clustered-dot 8×8 (Ulichney)
const CD8 = [
  [24,10,12,26,35,47,49,37],
  [ 8, 0, 2,14,45,59,61,51],
  [22, 6, 4,16,43,57,63,53],
  [30,20,18,28,33,41,55,39],
  [34,46,48,36,25,11,13,27],
  [44,58,60,50, 9, 1, 3,15],
  [42,56,62,52,23, 7, 5,17],
  [32,40,54,38,31,21,19,29],
];

// ── Ordered threshold ─────────────────────────────────────────────────────────

function getThreshold(algo: DitherAlgo, x: number, y: number): number {
  switch (algo) {
    case 'bayer2':    return (B2[y & 1][x & 1] + 0.5) / 4;
    case 'bayer4':    return (B4[y & 3][x & 3] + 0.5) / 16;
    case 'bayer8':    return (B8[y & 7][x & 7] + 0.5) / 64;
    case 'bayer16':   return (B16[y & 15][x & 15] + 0.5) / 256;
    case 'clustered': return (CD8[y & 7][x & 7] + 0.5) / 64;
    case 'bluenoise': {
      const v = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
      return v - Math.floor(v);
    }
    case 'ign': {
      const v1 = 0.06711056 * x + 0.00583715 * y;
      const v2 = 52.9829189 * (v1 - Math.floor(v1));
      return v2 - Math.floor(v2);
    }
    case 'crosshatch': {
      const d1 = ((x + y) % 8 + 8) % 8;
      const d2 = ((x - y) % 8 + 8) % 8;
      return Math.max(0, Math.min(1, 1 - Math.min(d1, d2) / 4));
    }
    default: return 0.5;
  }
}

// ── Error diffusion ───────────────────────────────────────────────────────────

function distributeError(
  buf: Float32Array, e: number,
  x: number, y: number, w: number, h: number,
  algo: DitherAlgo,
) {
  const push = (dx: number, dy: number, f: number) => {
    const nx = x + dx, ny = y + dy;
    if (nx < 0 || nx >= w || ny >= h) return;
    buf[ny * w + nx] += e * f;
  };
  switch (algo) {
    case 'floyd':
      push(1,0,7/16); push(-1,1,3/16); push(0,1,5/16); push(1,1,1/16); break;
    case 'atkinson':
      push(1,0,1/8); push(2,0,1/8); push(-1,1,1/8); push(0,1,1/8); push(1,1,1/8); push(0,2,1/8); break;
    case 'jarvis':
      push(1,0,7/48); push(2,0,5/48);
      push(-2,1,3/48); push(-1,1,5/48); push(0,1,7/48); push(1,1,5/48); push(2,1,3/48);
      push(-2,2,1/48); push(-1,2,3/48); push(0,2,5/48); push(1,2,3/48); push(2,2,1/48); break;
    case 'stucki':
      push(1,0,8/42); push(2,0,4/42);
      push(-2,1,2/42); push(-1,1,4/42); push(0,1,8/42); push(1,1,4/42); push(2,1,2/42);
      push(-2,2,1/42); push(-1,2,2/42); push(0,2,4/42); push(1,2,2/42); push(2,2,1/42); break;
    case 'burkes':
      push(1,0,8/32); push(2,0,4/32);
      push(-2,1,2/32); push(-1,1,4/32); push(0,1,8/32); push(1,1,4/32); push(2,1,2/32); break;
    case 'sierra':
      push(1,0,5/32); push(2,0,3/32);
      push(-2,1,2/32); push(-1,1,4/32); push(0,1,5/32); push(1,1,4/32); push(2,1,2/32);
      push(-1,2,2/32); push(0,2,3/32); push(1,2,2/32); break;
    case 'sierra2':
      push(1,0,4/16); push(2,0,3/16);
      push(-2,1,1/16); push(-1,1,2/16); push(0,1,3/16); push(1,1,2/16); push(2,1,1/16); break;
    case 'sierral':
      push(1,0,2/4); push(-1,1,1/4); push(0,1,1/4); break;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function hexToRgb3(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// ── Main render ───────────────────────────────────────────────────────────────

export function renderDither(src: ImageData, p: DitherParams): ImageData {
  const { width: w, height: h, data } = src;
  const fg = hexToRgb3(p.foreground);
  const bg = hexToRgb3(p.background);

  // 1. Luminance
  const lum = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const d = i * 4;
    lum[i] = (data[d] * 0.299 + data[d + 1] * 0.587 + data[d + 2] * 0.114) / 255;
  }

  // 2. Adjustments
  const brightD = p.brightness / 100;
  const contM   = 1 + p.contrast / 100;
  const g       = p.gamma;
  for (let i = 0; i < lum.length; i++) {
    let v = lum[i] + brightD;
    v = (v - 0.5) * contM + 0.5;
    v = Math.max(0, Math.min(1, v));
    lum[i] = g === 1 ? v : Math.pow(v, g);
  }

  // 3. Sharpen (Laplacian unsharp)
  if (p.sharpen > 0) {
    const tmp = new Float32Array(lum);
    const k = p.sharpen * 0.25;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        const lap = tmp[i] * 4 - tmp[i-1] - tmp[i+1] - tmp[i-w] - tmp[i+w];
        lum[i] = Math.max(0, Math.min(1, tmp[i] + k * lap));
      }
    }
  }

  // 4. Dither → binary
  const binary = new Uint8Array(w * h);
  const isOrdered = ALGO_META[p.algorithm].ordered;

  if (isOrdered) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const L = lum[i];
        const t = getThreshold(p.algorithm, x, y);
        const localInt = p.intensity * (1 + p.modulation * (0.5 - L));
        const tEff = Math.max(0, Math.min(1, 0.5 + (t - 0.5) * localInt));
        binary[i] = L > tEff ? 1 : 0;
      }
    }
  } else {
    const err = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const L = Math.max(0, Math.min(1, lum[i] + err[i]));
        const q = L > 0.5 ? 1 : 0;
        binary[i] = q;
        const e = (L - q) * p.intensity;
        if (Math.abs(e) > 0.001) distributeError(err, e, x, y, w, h, p.algorithm);
      }
    }
  }

  // 5. Map binary → RGB
  const rgb = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const c = binary[i] ? fg : bg;
    rgb[i*4] = c[0]; rgb[i*4+1] = c[1]; rgb[i*4+2] = c[2]; rgb[i*4+3] = 255;
  }

  // 6. Chromatic channel shift
  const out = new ImageData(w, h);
  if (p.chromatic && p.maxDisplace > 0) {
    const rS = Math.round((p.redChannel   / 100 - 0.5) * 2 * p.maxDisplace);
    const gS = Math.round((p.greenChannel / 100 - 0.5) * 2 * p.maxDisplace);
    const bS = Math.round((p.blueChannel  / 100 - 0.5) * 2 * p.maxDisplace);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const rX = Math.max(0, Math.min(w - 1, x + rS));
        const gX = Math.max(0, Math.min(w - 1, x + gS));
        const bX = Math.max(0, Math.min(w - 1, x + bS));
        out.data[i]   = rgb[(y * w + rX) * 4];
        out.data[i+1] = rgb[(y * w + gX) * 4 + 1];
        out.data[i+2] = rgb[(y * w + bX) * 4 + 2];
        out.data[i+3] = 255;
      }
    }
  } else {
    out.data.set(rgb);
  }

  return out;
}
