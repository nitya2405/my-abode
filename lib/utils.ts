export const clamp = (val: number, min: number, max: number) =>
  Math.max(min, Math.min(max, val));

export function getPixel(
  imageData: ImageData,
  x: number,
  y: number
): [number, number, number, number] {
  const xi = clamp(Math.round(x), 0, imageData.width - 1);
  const yi = clamp(Math.round(y), 0, imageData.height - 1);
  const i = (yi * imageData.width + xi) * 4;
  return [
    imageData.data[i],
    imageData.data[i + 1],
    imageData.data[i + 2],
    imageData.data[i + 3],
  ];
}

export function setPixel(
  imageData: ImageData,
  x: number,
  y: number,
  r: number,
  g: number,
  b: number,
  a = 255
) {
  const i = (y * imageData.width + x) * 4;
  imageData.data[i] = r;
  imageData.data[i + 1] = g;
  imageData.data[i + 2] = b;
  imageData.data[i + 3] = a;
}

export function getLuminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

export function copyImageData(imageData: ImageData): ImageData {
  return new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height
  );
}

/** Deterministic LCG random seeded by frame timestamp — changes every ~16ms */
export function makeSeededRandom(seed: number): () => number {
  let s = (seed | 0) >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

export function rgbToHsl(
  r: number,
  g: number,
  b: number
): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h *= 60;
  }
  return [h, s, l];
}

export function hslToRgb(
  h: number,
  s: number,
  l: number
): [number, number, number] {
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hue2rgb(p, q, h / 360 + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h / 360) * 255),
    Math.round(hue2rgb(p, q, h / 360 - 1 / 3) * 255),
  ];
}

/**
 * Precompute Sobel edge gradient per grid cell — run once on upload, reuse per frame.
 * Returns Float32Array of length (cellCols * cellRows), values 0..1.
 */
export function sobelEdgeMap(
  imageData: ImageData,
  cellSize: number
): Float32Array {
  const { width, height, data } = imageData;
  const cellCols = Math.ceil(width / cellSize);
  const cellRows = Math.ceil(height / cellSize);

  const gray = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const d = i * 4;
    gray[i] = (0.299 * data[d] + 0.587 * data[d + 1] + 0.114 * data[d + 2]) / 255;
  }

  const gradient = new Float32Array(width * height);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const gx =
        -gray[(y - 1) * width + (x - 1)] +
        gray[(y - 1) * width + (x + 1)] -
        2 * gray[y * width + (x - 1)] +
        2 * gray[y * width + (x + 1)] -
        gray[(y + 1) * width + (x - 1)] +
        gray[(y + 1) * width + (x + 1)];
      const gy =
        -gray[(y - 1) * width + (x - 1)] -
        2 * gray[(y - 1) * width + x] -
        gray[(y - 1) * width + (x + 1)] +
        gray[(y + 1) * width + (x - 1)] +
        2 * gray[(y + 1) * width + x] +
        gray[(y + 1) * width + (x + 1)];
      gradient[y * width + x] = Math.min(1, Math.sqrt(gx * gx + gy * gy));
    }
  }

  const result = new Float32Array(cellCols * cellRows);
  for (let cy = 0; cy < cellRows; cy++) {
    for (let cx = 0; cx < cellCols; cx++) {
      let sum = 0;
      let count = 0;
      for (let dy = 0; dy < cellSize; dy++) {
        for (let dx = 0; dx < cellSize; dx++) {
          const px = cx * cellSize + dx;
          const py = cy * cellSize + dy;
          if (px < width && py < height) {
            sum += gradient[py * width + px];
            count++;
          }
        }
      }
      result[cy * cellCols + cx] = count > 0 ? sum / count : 0;
    }
  }

  let maxVal = 0;
  for (let i = 0; i < result.length; i++) maxVal = Math.max(maxVal, result[i]);
  if (maxVal > 0) for (let i = 0; i < result.length; i++) result[i] /= maxVal;

  return result;
}
