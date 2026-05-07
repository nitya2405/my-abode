export type EdgeAlgo = 'sobel' | 'prewitt' | 'laplacian' | 'roberts';
export type EdgeColorMode = 'mono' | 'original';

export interface EdgeDetectionParams {
  algorithm: EdgeAlgo;
  threshold: number;       // 0–1
  lineWidth: number;       // 0.5–5
  invert: boolean;

  brightness: number;      // -100 to 100
  contrast: number;        // -100 to 100

  colorMode: EdgeColorMode;
  edgeColor: string;       // hex (mono mode)
  bgColor: string;         // hex (mono mode)

  // Processing
  brightnessMap: number;   // 0–2
  edgeEnhance: number;     // 0–5
  blur: number;            // 0–5
  quantizeColors: number;  // 0–16 (0=off)
  shapeMatching: number;   // 0–5 (morphological closing radius)

  // Post-processing
  bloomEnabled: boolean;
  bloomThreshold: number;  // 0–1
  bloomSoftThreshold: number; // 0.01–1
  bloomIntensity: number;  // 0–2
  bloomRadius: number;     // 1–30

  grain: boolean;
  grainAmount: number;     // 0–1

  chromatic: boolean;
  chromaticAmount: number; // 0–20

  scanlines: boolean;
  scanlinesOpacity: number; // 0–1

  vignetteEnabled: boolean;
  vignetteIntensity: number; // 0–1
  vignetteRadius: number;    // 0–1

  crtCurve: boolean;
  phosphor: boolean;
}

// ── Edge detection kernels ────────────────────────────────────────────────────

function computeLuminance(data: Uint8ClampedArray, w: number, h: number, brightD: number, contM: number): Float32Array {
  const lum = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const d = i * 4;
    let v = (data[d] * 0.299 + data[d+1] * 0.587 + data[d+2] * 0.114) / 255;
    v = (v - 0.5) * contM + 0.5 + brightD;
    lum[i] = Math.max(0, Math.min(1, v));
  }
  return lum;
}

function sobelEdges(lum: Float32Array, w: number, h: number): Float32Array {
  const e = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const tl = lum[(y-1)*w+x-1], tc = lum[(y-1)*w+x], tr = lum[(y-1)*w+x+1];
      const ml = lum[y*w+x-1],                             mr = lum[y*w+x+1];
      const bl = lum[(y+1)*w+x-1], bc = lum[(y+1)*w+x], br = lum[(y+1)*w+x+1];
      const gx = -tl - 2*ml - bl + tr + 2*mr + br;
      const gy = -tl - 2*tc - tr + bl + 2*bc + br;
      e[i] = Math.min(1, Math.sqrt(gx*gx + gy*gy) / 4);
    }
  }
  return e;
}

function prewittEdges(lum: Float32Array, w: number, h: number): Float32Array {
  const e = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const tl = lum[(y-1)*w+x-1], tc = lum[(y-1)*w+x], tr = lum[(y-1)*w+x+1];
      const ml = lum[y*w+x-1],                             mr = lum[y*w+x+1];
      const bl = lum[(y+1)*w+x-1], bc = lum[(y+1)*w+x], br = lum[(y+1)*w+x+1];
      const gx = -tl - ml - bl + tr + mr + br;
      const gy = -tl - tc - tr + bl + bc + br;
      e[i] = Math.min(1, Math.sqrt(gx*gx + gy*gy) / 3);
    }
  }
  return e;
}

function laplacianEdges(lum: Float32Array, w: number, h: number): Float32Array {
  const e = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      e[i] = Math.min(1, Math.abs(
        4*lum[i] - lum[(y-1)*w+x] - lum[y*w+x-1] - lum[y*w+x+1] - lum[(y+1)*w+x]
      ));
    }
  }
  return e;
}

function robertsEdges(lum: Float32Array, w: number, h: number): Float32Array {
  const e = new Float32Array(w * h);
  for (let y = 0; y < h - 1; y++) {
    for (let x = 0; x < w - 1; x++) {
      const i = y * w + x;
      const gx = lum[i] - lum[(y+1)*w+x+1];
      const gy = lum[y*w+x+1] - lum[(y+1)*w+x];
      e[i] = Math.min(1, Math.sqrt(gx*gx + gy*gy) * 2);
    }
  }
  return e;
}

// ── Processing helpers ────────────────────────────────────────────────────────

function boxBlur4(src: Uint8ClampedArray, w: number, h: number, r: number): Uint8ClampedArray {
  if (r < 1) return new Uint8ClampedArray(src);
  const tmp = new Uint8ClampedArray(src.length);
  const dst = new Uint8ClampedArray(src.length);
  const inv = 1 / (2 * r + 1);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let rs = 0, gs = 0, bs = 0;
      for (let dx = -r; dx <= r; dx++) {
        const sx = Math.max(0, Math.min(w-1, x+dx));
        const i = (y*w+sx)*4;
        rs += src[i]; gs += src[i+1]; bs += src[i+2];
      }
      const i = (y*w+x)*4;
      tmp[i] = rs*inv; tmp[i+1] = gs*inv; tmp[i+2] = bs*inv; tmp[i+3] = 255;
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let rs = 0, gs = 0, bs = 0;
      for (let dy = -r; dy <= r; dy++) {
        const sy = Math.max(0, Math.min(h-1, y+dy));
        const i = (sy*w+x)*4;
        rs += tmp[i]; gs += tmp[i+1]; bs += tmp[i+2];
      }
      const i = (y*w+x)*4;
      dst[i] = rs*inv; dst[i+1] = gs*inv; dst[i+2] = bs*inv; dst[i+3] = 255;
    }
  }
  return dst;
}

function blurEdgeMap(edges: Float32Array, w: number, h: number, r: number): Float32Array {
  if (r < 1) return edges;
  const tmp = new Float32Array(w * h);
  const dst = new Float32Array(w * h);
  const inv = 1 / (2 * r + 1);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0;
      for (let dx = -r; dx <= r; dx++) s += edges[y*w+Math.max(0,Math.min(w-1,x+dx))];
      tmp[y*w+x] = s * inv;
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0;
      for (let dy = -r; dy <= r; dy++) s += tmp[Math.max(0,Math.min(h-1,y+dy))*w+x];
      dst[y*w+x] = Math.min(1, s * inv);
    }
  }
  return dst;
}

function dilateEdges(edges: Float32Array, w: number, h: number, r: number): Float32Array {
  let cur = edges;
  for (let t = 0; t < r; t++) {
    const next = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        let v = cur[i];
        if (x > 0)     v = Math.max(v, cur[i-1]);
        if (x < w-1)   v = Math.max(v, cur[i+1]);
        if (y > 0)     v = Math.max(v, cur[i-w]);
        if (y < h-1)   v = Math.max(v, cur[i+w]);
        next[i] = v;
      }
    }
    cur = next;
  }
  return cur;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// ── Main render ───────────────────────────────────────────────────────────────

export function renderEdgeDetection(src: ImageData, p: EdgeDetectionParams): ImageData {
  const { width: w, height: h, data } = src;

  const brightD = p.brightness / 100;
  const contM   = 1 + p.contrast / 100;
  const lum     = computeLuminance(data, w, h, brightD, contM);

  // 1. Detect edges
  let edges: Float32Array;
  switch (p.algorithm) {
    case 'prewitt':   edges = prewittEdges(lum, w, h); break;
    case 'laplacian': edges = laplacianEdges(lum, w, h); break;
    case 'roberts':   edges = robertsEdges(lum, w, h); break;
    default:          edges = sobelEdges(lum, w, h);
  }

  // 2. Apply threshold
  for (let i = 0; i < w * h; i++) {
    edges[i] = edges[i] > p.threshold ? edges[i] : 0;
  }

  // 3. Dilate for line width
  const dilR = Math.max(0, Math.round(p.lineWidth) - 1);
  if (dilR > 0) edges = dilateEdges(edges, w, h, dilR);

  // 4. Processing: brightness map
  if (p.brightnessMap > 0) {
    const bm = p.brightnessMap / 2;
    for (let i = 0; i < w * h; i++) {
      edges[i] *= (1 - bm) + bm * lum[i] * 2;
      edges[i] = Math.min(1, edges[i]);
    }
  }

  // 5. Processing: edge enhance (boost contrast)
  if (p.edgeEnhance > 0) {
    const k = 1 + p.edgeEnhance * 0.5;
    for (let i = 0; i < w * h; i++) {
      edges[i] = Math.min(1, (edges[i] - 0.5) * k + 0.5);
      if (edges[i] < 0) edges[i] = 0;
    }
  }

  // 6. Processing: blur
  if (p.blur > 0) {
    edges = blurEdgeMap(edges, w, h, Math.round(p.blur));
  }

  // 7. Invert edges
  if (p.invert) {
    for (let i = 0; i < w * h; i++) edges[i] = 1 - edges[i];
  }

  // 8. Processing: shape matching (morphological closing)
  if (p.shapeMatching > 0) {
    const r = Math.round(p.shapeMatching);
    edges = dilateEdges(edges, w, h, r);
    // erode
    let cur = edges;
    for (let t = 0; t < r; t++) {
      const next = new Float32Array(w * h);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = y * w + x;
          let v = cur[i];
          if (x > 0)   v = Math.min(v, cur[i-1]);
          if (x < w-1) v = Math.min(v, cur[i+1]);
          if (y > 0)   v = Math.min(v, cur[i-w]);
          if (y < h-1) v = Math.min(v, cur[i+w]);
          next[i] = v;
        }
      }
      cur = next;
    }
    edges = cur;
  }

  // 9. Color mapping
  const edgeRgb = hexToRgb(p.edgeColor);
  const bgRgb   = hexToRgb(p.bgColor);
  const rgb = new Uint8ClampedArray(w * h * 4);

  for (let i = 0; i < w * h; i++) {
    const d = i * 4;
    const e = edges[i];

    if (p.colorMode === 'original') {
      const od = i * 4;
      let r = data[od], g = data[od+1], b = data[od+2];
      // adjust brightness/contrast on original
      for (let c = 0; c < 3; c++) {
        let v = data[od + c] / 255;
        v = (v - 0.5) * contM + 0.5 + brightD;
        const vv = Math.round(Math.max(0, Math.min(1, v)) * 255);
        if (c === 0) r = vv; else if (c === 1) g = vv; else b = vv;
      }
      rgb[d]   = Math.round(r * e);
      rgb[d+1] = Math.round(g * e);
      rgb[d+2] = Math.round(b * e);
    } else {
      rgb[d]   = Math.round(bgRgb[0] + (edgeRgb[0] - bgRgb[0]) * e);
      rgb[d+1] = Math.round(bgRgb[1] + (edgeRgb[1] - bgRgb[1]) * e);
      rgb[d+2] = Math.round(bgRgb[2] + (edgeRgb[2] - bgRgb[2]) * e);
    }
    rgb[d+3] = 255;
  }

  // 10. Quantize colors
  if (p.quantizeColors > 0) {
    const levels = Math.round(p.quantizeColors);
    const step = 255 / levels;
    for (let i = 0; i < rgb.length - 1; i++) {
      if ((i & 3) === 3) continue;
      rgb[i] = Math.round(Math.round(rgb[i] / step) * step);
    }
  }

  // 11. Bloom
  if (p.bloomEnabled && p.bloomIntensity > 0) {
    const bright = new Uint8ClampedArray(rgb.length);
    for (let i = 0; i < w * h; i++) {
      const d = i * 4;
      const lumV = (rgb[d] * 0.299 + rgb[d+1] * 0.587 + rgb[d+2] * 0.114) / 255;
      const st = Math.max(0.01, p.bloomSoftThreshold);
      const f = Math.max(0, Math.min(1, (lumV - p.bloomThreshold) / st));
      bright[d]   = rgb[d]   * f;
      bright[d+1] = rgb[d+1] * f;
      bright[d+2] = rgb[d+2] * f;
      bright[d+3] = 255;
    }
    const blurred = boxBlur4(bright, w, h, Math.round(p.bloomRadius));
    for (let i = 0; i < w * h; i++) {
      const d = i * 4;
      rgb[d]   = Math.min(255, rgb[d]   + blurred[d]   * p.bloomIntensity);
      rgb[d+1] = Math.min(255, rgb[d+1] + blurred[d+1] * p.bloomIntensity);
      rgb[d+2] = Math.min(255, rgb[d+2] + blurred[d+2] * p.bloomIntensity);
    }
  }

  // 12. Grain
  if (p.grain && p.grainAmount > 0) {
    for (let i = 0; i < w * h; i++) {
      const d = i * 4;
      const n = (Math.random() - 0.5) * p.grainAmount * 80;
      rgb[d]   = Math.max(0, Math.min(255, rgb[d]   + n));
      rgb[d+1] = Math.max(0, Math.min(255, rgb[d+1] + n));
      rgb[d+2] = Math.max(0, Math.min(255, rgb[d+2] + n));
    }
  }

  // 13. Chromatic
  if (p.chromatic && p.chromaticAmount > 0) {
    const s = Math.round(p.chromaticAmount);
    const tmp = new Uint8ClampedArray(rgb);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const rX = Math.max(0, Math.min(w-1, x - s));
        const bX = Math.max(0, Math.min(w-1, x + s));
        rgb[i]   = tmp[(y*w+rX)*4];
        rgb[i+2] = tmp[(y*w+bX)*4+2];
      }
    }
  }

  // 14. Scanlines
  if (p.scanlines && p.scanlinesOpacity > 0) {
    for (let y = 0; y < h; y++) {
      if (y % 2 !== 0) continue;
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const f = 1 - p.scanlinesOpacity * 0.7;
        rgb[i]   = Math.round(rgb[i]   * f);
        rgb[i+1] = Math.round(rgb[i+1] * f);
        rgb[i+2] = Math.round(rgb[i+2] * f);
      }
    }
  }

  // 15. Vignette
  if (p.vignetteEnabled && p.vignetteIntensity > 0) {
    const cx = w / 2, cy = h / 2;
    const maxD = Math.sqrt(cx*cx + cy*cy);
    const r = Math.max(0.01, p.vignetteRadius);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dist = Math.sqrt((x-cx)**2 + (y-cy)**2) / maxD;
        const v = Math.max(0, 1 - p.vignetteIntensity * Math.max(0, (dist - (1 - r)) / r));
        const i = (y * w + x) * 4;
        rgb[i]   = Math.round(rgb[i]   * v);
        rgb[i+1] = Math.round(rgb[i+1] * v);
        rgb[i+2] = Math.round(rgb[i+2] * v);
      }
    }
  }

  // 16. CRT Curve (barrel distortion)
  let finalRgb = rgb;
  if (p.crtCurve) {
    const curved = new Uint8ClampedArray(rgb.length);
    const cx = w / 2, cy = h / 2;
    const k = 0.12;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const nx = (x - cx) / cx, ny = (y - cy) / cy;
        const r2 = nx*nx + ny*ny;
        const f = 1 + k * r2;
        const sx = Math.round(nx * f * cx + cx);
        const sy = Math.round(ny * f * cy + cy);
        const i = (y * w + x) * 4;
        if (sx >= 0 && sx < w && sy >= 0 && sy < h) {
          const si = (sy * w + sx) * 4;
          curved[i] = rgb[si]; curved[i+1] = rgb[si+1]; curved[i+2] = rgb[si+2];
        }
        curved[i+3] = 255;
      }
    }
    finalRgb = curved;
  }

  // 17. Phosphor (green CRT phosphor tint)
  if (p.phosphor) {
    for (let i = 0; i < w * h * 4; i += 4) {
      const lumV = finalRgb[i] * 0.299 + finalRgb[i+1] * 0.587 + finalRgb[i+2] * 0.114;
      finalRgb[i]   = Math.min(255, Math.round(lumV * 0.15));
      finalRgb[i+1] = Math.min(255, Math.round(lumV * 0.9));
      finalRgb[i+2] = Math.min(255, Math.round(lumV * 0.1));
    }
  }

  const out = new ImageData(w, h);
  out.data.set(finalRgb);
  return out;
}
