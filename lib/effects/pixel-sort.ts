export type SortDirection = 'horizontal' | 'vertical';
export type SortMode = 'brightness' | 'hue' | 'saturation';

export interface PixelSortParams {
  direction: SortDirection;
  sortMode: SortMode;
  threshold: number;    // 0–1
  streakLength: number; // 10–1000
  intensity: number;    // 0–1
  randomness: number;   // 0–1
  reverse: boolean;
  brightness: number;   // -100 to 100
  contrast: number;     // -100 to 100
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rf = r / 255, gf = g / 255, bf = b / 255;
  const max = Math.max(rf, gf, bf), min = Math.min(rf, gf, bf);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rf) h = ((gf - bf) / d + (gf < bf ? 6 : 0)) / 6;
  else if (max === gf) h = ((bf - rf) / d + 2) / 6;
  else h = ((rf - gf) / d + 4) / 6;
  return [h, s, l];
}

function getKey(r: number, g: number, b: number, mode: SortMode): number {
  if (mode === 'brightness') return (r * 0.299 + g * 0.587 + b * 0.114) / 255;
  const [h, s] = rgbToHsl(r, g, b);
  return mode === 'hue' ? h : s;
}

export function renderPixelSort(src: ImageData, p: PixelSortParams): ImageData {
  const { width: w, height: h, data } = src;
  const out = new ImageData(w, h);
  const od = out.data;

  // Adjustments
  const brightD = p.brightness / 100;
  const contM = 1 + p.contrast / 100;
  const adj = new Uint8ClampedArray(data.length);
  for (let i = 0; i < w * h; i++) {
    const d4 = i * 4;
    for (let c = 0; c < 3; c++) {
      let v = data[d4 + c] / 255;
      v = (v - 0.5) * contM + 0.5 + brightD;
      adj[d4 + c] = Math.round(Math.max(0, Math.min(1, v)) * 255);
    }
    adj[d4 + 3] = data[d4 + 3];
  }
  od.set(adj);

  const horiz = p.direction === 'horizontal';
  const lines = horiz ? h : w;
  const len   = horiz ? w : h;

  const getIdx = (line: number, pos: number) =>
    horiz ? (line * w + pos) * 4 : (pos * w + line) * 4;

  for (let line = 0; line < lines; line++) {
    let segStart = -1;
    const segs: [number, number][] = [];

    for (let pos = 0; pos < len; pos++) {
      const i = getIdx(line, pos);
      const k = getKey(adj[i], adj[i + 1], adj[i + 2], p.sortMode);
      if (k > p.threshold) {
        if (segStart < 0) segStart = pos;
      } else if (segStart >= 0) {
        segs.push([segStart, pos - 1]);
        segStart = -1;
      }
    }
    if (segStart >= 0) segs.push([segStart, len - 1]);

    for (const [start, end] of segs) {
      if (p.randomness > 0 && Math.random() < p.randomness) continue;

      const segLen = Math.min(end - start + 1, p.streakLength);
      const sortEnd = start + segLen - 1;

      const px: [number, number, number][] = [];
      for (let pos = start; pos <= sortEnd; pos++) {
        const i = getIdx(line, pos);
        px.push([adj[i], adj[i + 1], adj[i + 2]]);
      }

      px.sort((a, b) => {
        const ka = getKey(a[0], a[1], a[2], p.sortMode);
        const kb = getKey(b[0], b[1], b[2], p.sortMode);
        return p.reverse ? kb - ka : ka - kb;
      });

      const t = p.intensity;
      for (let j = 0; j < px.length; j++) {
        const i = getIdx(line, start + j);
        od[i]   = Math.round(adj[i]   + (px[j][0] - adj[i])   * t);
        od[i+1] = Math.round(adj[i+1] + (px[j][1] - adj[i+1]) * t);
        od[i+2] = Math.round(adj[i+2] + (px[j][2] - adj[i+2]) * t);
      }
    }
  }

  return out;
}
