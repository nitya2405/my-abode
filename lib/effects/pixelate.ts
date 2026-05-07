export type PaletteKey = 'original' | 'mono' | 'gameboy' | 'gbpocket' | 'cga' | 'pico8' | 'sweetie16' | 'c64' | 'endesga32';
export type DitherType = 'none' | 'floyd' | 'atkinson' | 'jarvis' | 'bayer4' | 'bayer8' | 'bluenoise' | 'ign' | 'halftone';

export interface PixelateParams {
  blockSize: number;
  pixelAmount: number;   // 0–1
  palette: PaletteKey;
  paletteAmount: number; // 0–1
  dither: DitherType;
}

export const PALETTES: Record<PaletteKey, { label: string; sub: string; colors: number; hex: string[] }> = {
  original:  { label: 'ORIGINAL',   sub: 'no quantization',          colors: 0,  hex: [] },
  mono:      { label: 'MONO',       sub: '1-bit · black + white',    colors: 2,  hex: ['#000000','#ffffff'] },
  gameboy:   { label: 'GAME BOY',   sub: '4 shades · DMG',           colors: 4,  hex: ['#0f380f','#306230','#8bac0f','#9bbc0f'] },
  gbpocket:  { label: 'GB POCKET',  sub: '4 shades · grayscale',     colors: 4,  hex: ['#000000','#555555','#aaaaaa','#ffffff'] },
  cga:       { label: 'CGA',        sub: '4 colors · mode 4 high',   colors: 4,  hex: ['#000000','#55ffff','#ff55ff','#ffffff'] },
  pico8:     { label: 'PICO-8',     sub: '16 colors · fantasy console', colors: 16, hex: ['#000000','#1d2b53','#7e2553','#008751','#ab5236','#5f574f','#c2c3c7','#fff1e8','#ff004d','#ffa300','#ffec27','#00e436','#29adff','#83769c','#ff77a8','#ffccaa'] },
  sweetie16: { label: 'SWEETIE 16', sub: '16 colors · GrafxKid',     colors: 16, hex: ['#1a1c2c','#5d275d','#b13e53','#ef7d57','#ffcd75','#a7f070','#38b764','#257179','#29366f','#3b5dc9','#41a6f6','#73eff7','#f4f4f4','#94b0c2','#566c86','#333c57'] },
  c64:       { label: 'C64',        sub: '16 colors · Commodore',    colors: 16, hex: ['#000000','#ffffff','#813338','#75cec8','#8e3c97','#6ac64b','#3e31a2','#c9d487','#773800','#97492b','#be706c','#545454','#737373','#a0e26e','#706deb','#aeaeae'] },
  endesga32: { label: 'ENDESGA 32', sub: '32 colors · indie classic', colors: 32, hex: ['#be4a2f','#d77643','#ead4aa','#e4a672','#b86f50','#733e39','#3e2731','#a22633','#e43b44','#f77622','#feae34','#fee761','#63c74d','#3e8948','#265c42','#193c3e','#124e89','#0099db','#2ce8f5','#ffffff','#c0cbdc','#8b9bb4','#5a6988','#3a4466','#262b44','#181425','#ff0044','#68386c','#b55088','#f6757a','#e8b796','#c28569'] },
};

export const DITHER_OPTIONS: Record<DitherType, { label: string; sub: string }> = {
  none:      { label: 'NONE',       sub: 'flat quantize' },
  floyd:     { label: 'F·STEIN',    sub: 'error diffusion' },
  atkinson:  { label: 'ATKINSON',   sub: '1984 mac, crisp' },
  jarvis:    { label: 'JARVIS',     sub: 'wide kernel' },
  bayer4:    { label: 'BAYER 4',    sub: 'ordered 4×4' },
  bayer8:    { label: 'BAYER 8',    sub: 'ordered 8×8' },
  bluenoise: { label: 'BLUE NOISE', sub: 'perceptual' },
  ign:       { label: 'IGN',        sub: 'hash dither' },
  halftone:  { label: 'HALFTONE',   sub: 'dot screen' },
};

// ── internals ────────────────────────────────────────────────────────────────

function hexToRgb3(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function nearestColor(r: number, g: number, b: number, pal: [number, number, number][]): [number, number, number] {
  let best = pal[0], bestD = Infinity;
  for (const c of pal) {
    const d = (r - c[0]) ** 2 + (g - c[1]) ** 2 + (b - c[2]) ** 2;
    if (d < bestD) { bestD = d; best = c; }
  }
  return best;
}

function fract(x: number) { return x - Math.floor(x); }

// Bayer matrices (normalized to 0..N-1)
const B4 = [[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]];
const B8 = [
  [0,32,8,40,2,34,10,42],[48,16,56,24,50,18,58,26],
  [12,44,4,36,14,46,6,38],[60,28,52,20,62,30,54,22],
  [3,35,11,43,1,33,9,41],[51,19,59,27,49,17,57,25],
  [15,47,7,39,13,45,5,37],[63,31,55,23,61,29,53,21],
];
// Clustered-dot halftone (center activates first)
const HT4 = [[12,4,5,13],[6,0,1,7],[8,2,3,9],[14,10,11,15]];

function orderedThreshold(d: DitherType, bx: number, by: number): number {
  switch (d) {
    case 'bayer4':    return (B4[by & 3][bx & 3] + 0.5) / 16 - 0.5;
    case 'bayer8':    return (B8[by & 7][bx & 7] + 0.5) / 64 - 0.5;
    case 'halftone':  return (HT4[by & 3][bx & 3] + 0.5) / 16 - 0.5;
    case 'bluenoise': return fract(bx * 0.7548776662 + by * 0.5698402910) - 0.5;
    case 'ign':       return fract(52.9829189 * fract(0.06711056 * bx + 0.00583715 * by)) - 0.5;
    default: return 0;
  }
}

const ED = new Set<DitherType>(['floyd', 'atkinson', 'jarvis']);

function addError(
  eR: Float32Array, eG: Float32Array, eB: Float32Array,
  er: number, eg: number, eb: number,
  bx: number, by: number, bw: number, bh: number,
  d: DitherType,
) {
  const push = (dx: number, dy: number, f: number) => {
    const nx = bx + dx, ny = by + dy;
    if (nx < 0 || nx >= bw || ny >= bh) return;
    const i = ny * bw + nx;
    eR[i] += er * f; eG[i] += eg * f; eB[i] += eb * f;
  };
  if (d === 'floyd') {
    push(1, 0, 7/16); push(-1, 1, 3/16); push(0, 1, 5/16); push(1, 1, 1/16);
  } else if (d === 'atkinson') {
    push(1, 0, 1/8); push(2, 0, 1/8);
    push(-1, 1, 1/8); push(0, 1, 1/8); push(1, 1, 1/8);
    push(0, 2, 1/8);
  } else if (d === 'jarvis') {
    push(1, 0, 7/48); push(2, 0, 5/48);
    push(-2, 1, 3/48); push(-1, 1, 5/48); push(0, 1, 7/48); push(1, 1, 5/48); push(2, 1, 3/48);
    push(-2, 2, 1/48); push(-1, 2, 3/48); push(0, 2, 5/48); push(1, 2, 3/48); push(2, 2, 1/48);
  }
}

// ── main ─────────────────────────────────────────────────────────────────────

export function renderPixelate(src: ImageData, params: PixelateParams): ImageData {
  const { width, height, data } = src;
  const out = new ImageData(width, height);
  const od = out.data;
  const bs = Math.max(1, Math.round(params.blockSize));
  const bw = Math.ceil(width / bs);
  const bh = Math.ceil(height / bs);
  const n = bw * bh;

  // Step 1: average blocks
  const bR = new Float32Array(n), bG = new Float32Array(n),
        bB = new Float32Array(n), bA = new Uint8Array(n);
  for (let by = 0; by < bh; by++) {
    for (let bx = 0; bx < bw; bx++) {
      let r = 0, g = 0, b = 0, a = 0, cnt = 0;
      for (let dy = 0; dy < bs; dy++) {
        const py = by * bs + dy; if (py >= height) break;
        for (let dx = 0; dx < bs; dx++) {
          const px = bx * bs + dx; if (px >= width) break;
          const i = (py * width + px) * 4;
          r += data[i]; g += data[i+1]; b += data[i+2]; a += data[i+3]; cnt++;
        }
      }
      const idx = by * bw + bx;
      bR[idx] = r/cnt; bG[idx] = g/cnt; bB[idx] = b/cnt; bA[idx] = Math.round(a/cnt);
    }
  }

  // Step 2: palette quantization with dithering
  const pal = PALETTES[params.palette].hex.map(hexToRgb3) as [number,number,number][];
  const doQ = pal.length > 0 && params.paletteAmount > 0;
  const qR = doQ ? new Float32Array(bR) : bR;
  const qG = doQ ? new Float32Array(bG) : bG;
  const qB = doQ ? new Float32Array(bB) : bB;

  if (doQ) {
    const eR = new Float32Array(n), eG = new Float32Array(n), eB = new Float32Array(n);
    const isED = ED.has(params.dither);
    const STR = 64;
    for (let by = 0; by < bh; by++) {
      for (let bx = 0; bx < bw; bx++) {
        const idx = by * bw + bx;
        let r = qR[idx], g = qG[idx], b = qB[idx];
        if (isED) {
          r += eR[idx]; g += eG[idx]; b += eB[idx];
        } else if (params.dither !== 'none') {
          const t = orderedThreshold(params.dither, bx, by) * STR;
          r += t; g += t; b += t;
        }
        r = Math.max(0, Math.min(255, r));
        g = Math.max(0, Math.min(255, g));
        b = Math.max(0, Math.min(255, b));
        const [qr, qg, qb] = nearestColor(r, g, b, pal);
        qR[idx] = qr; qG[idx] = qg; qB[idx] = qb;
        if (isED) addError(eR, eG, eB, r-qr, g-qg, b-qb, bx, by, bw, bh, params.dither);
      }
    }
  }

  // Step 3: write output
  const pa = params.pixelAmount;
  const qa = doQ ? params.paletteAmount : 0;
  for (let by = 0; by < bh; by++) {
    for (let bx = 0; bx < bw; bx++) {
      const idx = by * bw + bx;
      const pr = bR[idx], pg = bG[idx], pb = bB[idx];
      const fr = pr + (qR[idx] - pr) * qa;
      const fg = pg + (qG[idx] - pg) * qa;
      const fb = pb + (qB[idx] - pb) * qa;
      for (let dy = 0; dy < bs; dy++) {
        const py = by * bs + dy; if (py >= height) break;
        for (let dx = 0; dx < bs; dx++) {
          const px = bx * bs + dx; if (px >= width) break;
          const i = (py * width + px) * 4;
          od[i]   = Math.round(data[i]   + (fr - data[i])   * pa);
          od[i+1] = Math.round(data[i+1] + (fg - data[i+1]) * pa);
          od[i+2] = Math.round(data[i+2] + (fb - data[i+2]) * pa);
          od[i+3] = data[i+3];
        }
      }
    }
  }
  return out;
}
