export type PixelateMode = 'classic' | 'crystallize' | 'scatter' | 'isometric' | 'adaptive';
export type BlockShape  = 'square' | 'circle' | 'diamond';
export type AdaptiveMap = 'luminance' | 'edge' | 'saturation';
export type PaletteKey  = 'original' | 'mono' | 'gameboy' | 'gbpocket' | 'cga' | 'pico8' | 'sweetie16' | 'c64' | 'endesga32';

export interface PixelateParams {
  mode: PixelateMode;

  // Shared
  blockSize:     number;   // 2–48
  gapColor:      string;   // hex, used in classic/scatter/isometric

  // Classic
  shape:         BlockShape;
  gap:           number;   // 0–6

  // Crystallize
  cellCount:     number;   // 10–300
  cellSeed:      number;   // 0–99
  edgeThickness: number;   // 0–4
  edgeColor:     string;

  // Scatter
  scatter:       number;   // 0–1
  scaleVariance: number;   // 0–0.5

  // Isometric
  depth:         number;   // 1–8
  topBright:     number;   // 0.5–2.0
  sideBright:    number;   // 0.3–1.5

  // Adaptive
  minBlock:      number;   // 1–16
  maxBlock:      number;   // 8–64
  mapBy:         AdaptiveMap;
  invertMap:     boolean;

  // Palette (all modes)
  palette:       PaletteKey;
  paletteAmount: number;   // 0–1
}

// Only hex arrays — no labels exposed from lib
export const PALETTES: Record<PaletteKey, { hex: string[] }> = {
  original:  { hex: [] },
  mono:      { hex: ['#000000','#ffffff'] },
  gameboy:   { hex: ['#0f380f','#306230','#8bac0f','#9bbc0f'] },
  gbpocket:  { hex: ['#000000','#555555','#aaaaaa','#ffffff'] },
  cga:       { hex: ['#000000','#55ffff','#ff55ff','#ffffff'] },
  pico8:     { hex: ['#000000','#1d2b53','#7e2553','#008751','#ab5236','#5f574f','#c2c3c7','#fff1e8','#ff004d','#ffa300','#ffec27','#00e436','#29adff','#83769c','#ff77a8','#ffccaa'] },
  sweetie16: { hex: ['#1a1c2c','#5d275d','#b13e53','#ef7d57','#ffcd75','#a7f070','#38b764','#257179','#29366f','#3b5dc9','#41a6f6','#73eff7','#f4f4f4','#94b0c2','#566c86','#333c57'] },
  c64:       { hex: ['#000000','#ffffff','#813338','#75cec8','#8e3c97','#6ac64b','#3e31a2','#c9d487','#773800','#97492b','#be706c','#545454','#737373','#a0e26e','#706deb','#aeaeae'] },
  endesga32: { hex: ['#be4a2f','#d77643','#ead4aa','#e4a672','#b86f50','#733e39','#3e2731','#a22633','#e43b44','#f77622','#feae34','#fee761','#63c74d','#3e8948','#265c42','#193c3e','#124e89','#0099db','#2ce8f5','#ffffff','#c0cbdc','#8b9bb4','#5a6988','#3a4466','#262b44','#181425','#ff0044','#68386c','#b55088','#f6757a','#e8b796','#c28569'] },
};

// ── helpers ───────────────────────────────────────────────────────────────────

function hexToRgb3(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function nearestColor(r: number, g: number, b: number, pal: [number,number,number][]): [number,number,number] {
  let best = pal[0], bestD = Infinity;
  for (const c of pal) {
    const d = (r - c[0]) ** 2 + (g - c[1]) ** 2 + (b - c[2]) ** 2;
    if (d < bestD) { bestD = d; best = c; }
  }
  return best;
}

function quantize(r: number, g: number, b: number, palette: PaletteKey, amount: number): [number,number,number] {
  const hexArr = PALETTES[palette].hex;
  if (amount === 0 || hexArr.length === 0) return [Math.round(r), Math.round(g), Math.round(b)];
  const pal = hexArr.map(hexToRgb3) as [number,number,number][];
  const [qr, qg, qb] = nearestColor(r, g, b, pal);
  return [
    Math.round(r + (qr - r) * amount),
    Math.round(g + (qg - g) * amount),
    Math.round(b + (qb - b) * amount),
  ];
}

function rng(a: number, b: number, seed: number): number {
  let n = (a * 374761393 + b * 668265263 + seed * 99991) | 0;
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  return ((n ^ (n >>> 16)) >>> 0) / 0x100000000;
}

// ── Classic ───────────────────────────────────────────────────────────────────

function renderClassic(src: ImageData, p: PixelateParams): ImageData {
  const { width: w, height: h, data } = src;
  const out = new ImageData(w, h);
  const od  = out.data;
  const bs  = Math.max(1, Math.round(p.blockSize));
  const gap = Math.max(0, Math.round(p.gap));
  const bw  = Math.ceil(w / bs), bh = Math.ceil(h / bs);
  const gr  = hexToRgb3(p.gapColor);
  const drawSize = Math.max(1, bs - 2 * gap);
  const half     = drawSize / 2;

  for (let i = 0; i < w * h * 4; i += 4) {
    od[i] = gr[0]; od[i+1] = gr[1]; od[i+2] = gr[2]; od[i+3] = 255;
  }

  for (let by = 0; by < bh; by++) {
    for (let bx = 0; bx < bw; bx++) {
      let r = 0, g = 0, b = 0, cnt = 0;
      for (let dy = 0; dy < bs; dy++) {
        const py = by * bs + dy; if (py >= h) break;
        for (let dx = 0; dx < bs; dx++) {
          const px = bx * bs + dx; if (px >= w) break;
          const i = (py * w + px) * 4;
          r += data[i]; g += data[i+1]; b += data[i+2]; cnt++;
        }
      }
      if (cnt === 0) continue;
      const [fr, fg, fb] = quantize(r/cnt, g/cnt, b/cnt, p.palette, p.paletteAmount);

      for (let dy = gap; dy < bs - gap; dy++) {
        const py = by * bs + dy; if (py >= h) break;
        for (let dx = gap; dx < bs - gap; dx++) {
          const px = bx * bs + dx; if (px >= w) break;
          if (p.shape !== 'square') {
            const rx = (dx - gap) - half + 0.5;
            const ry = (dy - gap) - half + 0.5;
            if (p.shape === 'circle'  && rx*rx + ry*ry > half*half) continue;
            if (p.shape === 'diamond' && Math.abs(rx) + Math.abs(ry) > half) continue;
          }
          const i = (py * w + px) * 4;
          od[i] = fr; od[i+1] = fg; od[i+2] = fb; od[i+3] = 255;
        }
      }
    }
  }
  return out;
}

// ── Crystallize (Voronoi) ─────────────────────────────────────────────────────

function renderCrystallize(src: ImageData, p: PixelateParams): ImageData {
  const { width: w, height: h, data } = src;
  const out = new ImageData(w, h);
  const od  = out.data;
  const N   = Math.max(2, Math.round(p.cellCount));
  const seed = Math.round(p.cellSeed);

  // Seed points
  const sx = new Float32Array(N), sy = new Float32Array(N);
  for (let s = 0; s < N; s++) {
    sx[s] = rng(s, 0, seed) * w;
    sy[s] = rng(s, 1, seed) * h;
  }

  // Assign each pixel to nearest seed & accumulate color
  const cell = new Int32Array(w * h);
  const cR = new Float64Array(N), cG = new Float64Array(N), cB = new Float64Array(N);
  const cN = new Int32Array(N);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      let bestS = 0, bestD = Infinity;
      for (let s = 0; s < N; s++) {
        const dx = x - sx[s], dy = y - sy[s];
        const d = dx*dx + dy*dy;
        if (d < bestD) { bestD = d; bestS = s; }
      }
      cell[i] = bestS;
      const d4 = i * 4;
      cR[bestS] += data[d4]; cG[bestS] += data[d4+1]; cB[bestS] += data[d4+2]; cN[bestS]++;
    }
  }

  // Quantized cell colors
  const cr = new Uint8Array(N), cg = new Uint8Array(N), cb = new Uint8Array(N);
  for (let s = 0; s < N; s++) {
    if (cN[s] === 0) continue;
    const [r, g, b] = quantize(cR[s]/cN[s], cG[s]/cN[s], cB[s]/cN[s], p.palette, p.paletteAmount);
    cr[s] = r; cg[s] = g; cb[s] = b;
  }

  const thick = Math.round(p.edgeThickness);
  const eRgb  = hexToRgb3(p.edgeColor);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i  = y * w + x;
      const d4 = i * 4;
      const s  = cell[i];
      let isEdge = false;
      if (thick > 0) {
        outer: for (let dy = -thick; dy <= thick; dy++) {
          for (let dx = -thick; dx <= thick; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
            if (cell[ny * w + nx] !== s) { isEdge = true; break outer; }
          }
        }
      }
      if (isEdge) {
        od[d4] = eRgb[0]; od[d4+1] = eRgb[1]; od[d4+2] = eRgb[2];
      } else {
        od[d4] = cr[s]; od[d4+1] = cg[s]; od[d4+2] = cb[s];
      }
      od[d4+3] = 255;
    }
  }
  return out;
}

// ── Scatter ───────────────────────────────────────────────────────────────────

function renderScatter(src: ImageData, p: PixelateParams): ImageData {
  const { width: w, height: h, data } = src;
  const out = new ImageData(w, h);
  const od  = out.data;
  const bs  = Math.max(2, Math.round(p.blockSize));
  const bw  = Math.ceil(w / bs), bh = Math.ceil(h / bs);
  const gr  = hexToRgb3(p.gapColor);

  for (let i = 0; i < w * h * 4; i += 4) {
    od[i] = gr[0]; od[i+1] = gr[1]; od[i+2] = gr[2]; od[i+3] = 255;
  }

  for (let by = 0; by < bh; by++) {
    for (let bx = 0; bx < bw; bx++) {
      let r = 0, g = 0, b = 0, cnt = 0;
      for (let dy = 0; dy < bs; dy++) {
        const py = by * bs + dy; if (py >= h) break;
        for (let dx = 0; dx < bs; dx++) {
          const px = bx * bs + dx; if (px >= w) break;
          const i = (py * w + px) * 4;
          r += data[i]; g += data[i+1]; b += data[i+2]; cnt++;
        }
      }
      if (cnt === 0) continue;
      const [fr, fg, fb] = quantize(r/cnt, g/cnt, b/cnt, p.palette, p.paletteAmount);

      const maxOff = bs * p.scatter;
      const ox  = Math.round((rng(bx, by, 0) * 2 - 1) * maxOff);
      const oy  = Math.round((rng(bx, by, 1) * 2 - 1) * maxOff);
      const sz  = Math.max(1, Math.round(bs * (1 - rng(bx, by, 2) * p.scaleVariance)));
      const pad = Math.floor((bs - sz) / 2);

      for (let dy = 0; dy < sz; dy++) {
        const py = by * bs + oy + pad + dy;
        if (py < 0 || py >= h) continue;
        for (let dx = 0; dx < sz; dx++) {
          const px = bx * bs + ox + pad + dx;
          if (px < 0 || px >= w) continue;
          const i = (py * w + px) * 4;
          od[i] = fr; od[i+1] = fg; od[i+2] = fb; od[i+3] = 255;
        }
      }
    }
  }
  return out;
}

// ── Isometric ─────────────────────────────────────────────────────────────────

function renderIsometric(src: ImageData, p: PixelateParams): ImageData {
  const { width: w, height: h, data } = src;
  const out = new ImageData(w, h);
  const od  = out.data;
  const bs  = Math.max(3, Math.round(p.blockSize));
  const dep = Math.min(Math.round(p.depth), Math.floor(bs / 2));
  const bw  = Math.ceil(w / bs), bh = Math.ceil(h / bs);
  const gr  = hexToRgb3(p.gapColor);
  const face = bs - 1; // drawable area per block (1px gap on right/bottom)

  for (let i = 0; i < w * h * 4; i += 4) {
    od[i] = gr[0]; od[i+1] = gr[1]; od[i+2] = gr[2]; od[i+3] = 255;
  }

  for (let by = 0; by < bh; by++) {
    for (let bx = 0; bx < bw; bx++) {
      let r = 0, g = 0, b = 0, cnt = 0;
      for (let dy = 0; dy < face; dy++) {
        const py = by * bs + dy; if (py >= h) break;
        for (let dx = 0; dx < face; dx++) {
          const px = bx * bs + dx; if (px >= w) break;
          const i = (py * w + px) * 4;
          r += data[i]; g += data[i+1]; b += data[i+2]; cnt++;
        }
      }
      if (cnt === 0) continue;
      const [fr, fg, fb] = quantize(r/cnt, g/cnt, b/cnt, p.palette, p.paletteAmount);

      for (let dy = 0; dy < face; dy++) {
        const py = by * bs + dy; if (py >= h) break;
        for (let dx = 0; dx < face; dx++) {
          const px = bx * bs + dx; if (px >= w) break;
          const br = dy < dep ? p.topBright : dx < dep ? p.sideBright : 1.0;
          const i  = (py * w + px) * 4;
          od[i]   = Math.min(255, Math.round(fr * br));
          od[i+1] = Math.min(255, Math.round(fg * br));
          od[i+2] = Math.min(255, Math.round(fb * br));
          od[i+3] = 255;
        }
      }
    }
  }
  return out;
}

// ── Adaptive ──────────────────────────────────────────────────────────────────

function renderAdaptive(src: ImageData, p: PixelateParams): ImageData {
  const { width: w, height: h, data } = src;

  // Compute per-pixel map [0,1]
  const map = new Float32Array(w * h);
  if (p.mapBy === 'edge') {
    const lum = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) {
      const d = i * 4;
      lum[i] = (data[d] * 0.299 + data[d+1] * 0.587 + data[d+2] * 0.114) / 255;
    }
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i  = y * w + x;
        const gx = -lum[i-w-1] - 2*lum[i-1] - lum[i+w-1] + lum[i-w+1] + 2*lum[i+1] + lum[i+w+1];
        const gy = -lum[i-w-1] - 2*lum[i-w] - lum[i-w+1] + lum[i+w-1] + 2*lum[i+w] + lum[i+w+1];
        map[i] = Math.min(1, Math.sqrt(gx*gx + gy*gy) / 2);
      }
    }
  } else {
    for (let i = 0; i < w * h; i++) {
      const d = i * 4;
      const r = data[d]/255, g = data[d+1]/255, b = data[d+2]/255;
      if (p.mapBy === 'luminance') {
        map[i] = r * 0.299 + g * 0.587 + b * 0.114;
      } else {
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
        map[i] = mx > 0 ? (mx - mn) / mx : 0;
      }
    }
  }

  // Render two scales then blend
  const fineP:   PixelateParams = { ...p, blockSize: Math.max(1, p.minBlock), gap: 0, shape: 'square' };
  const coarseP: PixelateParams = { ...p, blockSize: Math.max(2, p.maxBlock), gap: 0, shape: 'square' };
  const fine   = renderClassic(src, fineP);
  const coarse = renderClassic(src, coarseP);

  const out = new ImageData(w, h);
  for (let i = 0; i < w * h; i++) {
    const d = i * 4;
    const t = p.invertMap ? 1 - map[i] : map[i];
    out.data[d]   = Math.round(fine.data[d]   + (coarse.data[d]   - fine.data[d])   * t);
    out.data[d+1] = Math.round(fine.data[d+1] + (coarse.data[d+1] - fine.data[d+1]) * t);
    out.data[d+2] = Math.round(fine.data[d+2] + (coarse.data[d+2] - fine.data[d+2]) * t);
    out.data[d+3] = 255;
  }
  return out;
}

// ── dispatch ──────────────────────────────────────────────────────────────────

export function renderPixelate(src: ImageData, p: PixelateParams): ImageData {
  switch (p.mode) {
    case 'crystallize': return renderCrystallize(src, p);
    case 'scatter':     return renderScatter(src, p);
    case 'isometric':   return renderIsometric(src, p);
    case 'adaptive':    return renderAdaptive(src, p);
    default:            return renderClassic(src, p);
  }
}
