export type FillMode  = 'filled' | 'lines';
export type ColorMode = 'original' | 'grayscale';

export interface ContourParams {
  fillMode:      FillMode;
  levels:        number;  // 2–24
  lineThickness: number;  // 1–6
  invert:        boolean;
  brightness:    number;  // –100 to 100
  contrast:      number;  // –100 to 100
  colorMode:     ColorMode;
}

export function renderContour(src: ImageData, p: ContourParams): ImageData {
  const { width: w, height: h, data } = src;
  const out = new ImageData(w, h);
  const od  = out.data;
  const N   = Math.max(2, Math.round(p.levels));

  // 1. Adjusted luminance per pixel
  const lum  = new Float32Array(w * h);
  const contM = 1 + p.contrast / 100;
  const brightD = p.brightness / 100;
  for (let i = 0; i < w * h; i++) {
    const d = i * 4;
    let v = (data[d] * 0.299 + data[d+1] * 0.587 + data[d+2] * 0.114) / 255;
    v = (v - 0.5) * contM + 0.5 + brightD;
    v = Math.max(0, Math.min(1, v));
    lum[i] = p.invert ? 1 - v : v;
  }

  // 2. Band index per pixel
  const bands = new Int32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    bands[i] = Math.min(N - 1, Math.floor(lum[i] * N));
  }

  // 3. Border detection (4-connected)
  let border = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const b = bands[i];
      if (
        (x > 0     && bands[i - 1] !== b) ||
        (x < w - 1 && bands[i + 1] !== b) ||
        (y > 0     && bands[i - w] !== b) ||
        (y < h - 1 && bands[i + w] !== b)
      ) border[i] = 1;
    }
  }

  // 4. Dilate border for thickness > 1
  for (let t = 1; t < p.lineThickness; t++) {
    const prev = new Uint8Array(border);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (!border[i] && (
          (x > 0     && prev[i - 1]) ||
          (x < w - 1 && prev[i + 1]) ||
          (y > 0     && prev[i - w]) ||
          (y < h - 1 && prev[i + w])
        )) border[i] = 1;
      }
    }
  }

  // 5. Render
  for (let i = 0; i < w * h; i++) {
    const d = i * 4;

    if (border[i]) {
      od[d] = 0; od[d+1] = 0; od[d+2] = 0; od[d+3] = 255;
      continue;
    }

    if (p.fillMode === 'lines') {
      od[d] = 255; od[d+1] = 255; od[d+2] = 255; od[d+3] = 255;
      continue;
    }

    // Filled bands
    const bandLum = (bands[i] + 0.5) / N;
    if (p.colorMode === 'original') {
      const origLum = lum[i] > 0.01 ? lum[i] : 0.01;
      const scale   = bandLum / origLum;
      od[d]   = Math.min(255, Math.round(data[d]   * scale));
      od[d+1] = Math.min(255, Math.round(data[d+1] * scale));
      od[d+2] = Math.min(255, Math.round(data[d+2] * scale));
    } else {
      const v = Math.round(bandLum * 255);
      od[d] = v; od[d+1] = v; od[d+2] = v;
    }
    od[d+3] = 255;
  }

  return out;
}
