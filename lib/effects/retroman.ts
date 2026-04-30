import { clamp } from '../utils';

export interface RetromanParams {
  mode: 'floyd-steinberg' | 'atkinson' | 'bayer-4x4' | 'bayer-8x8' | 'blue-noise' | 'none';
  threshold: number;
  fgColor: string;
  bgColor: string;
  pixelSize: number;
  contrast: number;
  brightness: number;
  noise: number;
  serpentine: boolean;
  edgeEnhance: number;
}

const BAYER4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function applyRetroman(imageData: ImageData, params: RetromanParams): ImageData {
  const { width, height, data } = imageData;

  const contrastFactor = params.contrast;
  const gray = new Float32Array(width * height);

  for (let i = 0; i < width * height; i++) {
    const d = i * 4;
    let lum = 0.299 * data[d] + 0.587 * data[d + 1] + 0.114 * data[d + 2];
    lum += params.brightness;
    lum = (lum - 128) * contrastFactor + 128;
    gray[i] = clamp(lum, 0, 255);
  }

  // Pixelate
  const s = Math.max(1, Math.round(params.pixelSize));
  if (s > 1) {
    for (let y = 0; y < height; y += s) {
      for (let x = 0; x < width; x += s) {
        let sum = 0, count = 0;
        for (let dy = 0; dy < s && y + dy < height; dy++) {
          for (let dx = 0; dx < s && x + dx < width; dx++) {
            sum += gray[(y + dy) * width + (x + dx)];
            count++;
          }
        }
        const avg = sum / count;
        for (let dy = 0; dy < s && y + dy < height; dy++) {
          for (let dx = 0; dx < s && x + dx < width; dx++) {
            gray[(y + dy) * width + (x + dx)] = avg;
          }
        }
      }
    }
  }

  const dith = new Float32Array(gray);

  if (params.mode === 'atkinson') {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const old = dith[y * width + x];
        const nw = old > params.threshold ? 255 : 0;
        const err = (old - nw) / 8;
        dith[y * width + x] = nw;
        if (x + 1 < width) dith[y * width + (x + 1)] += err;
        if (x + 2 < width) dith[y * width + (x + 2)] += err;
        if (y + 1 < height) {
          if (x - 1 >= 0) dith[(y + 1) * width + (x - 1)] += err;
          dith[(y + 1) * width + x] += err;
          if (x + 1 < width) dith[(y + 1) * width + (x + 1)] += err;
        }
        if (y + 2 < height) dith[(y + 2) * width + x] += err;
      }
    }
  } else if (params.mode === 'floyd-steinberg') {
    for (let y = 0; y < height; y++) {
      const isSerp = params.serpentine && (y % 2 === 1);
      if (isSerp) {
        for (let x = width - 1; x >= 0; x--) {
          const old = dith[y * width + x];
          const nw = old > params.threshold ? 255 : 0;
          const err = old - nw;
          dith[y * width + x] = nw;
          if (x - 1 >= 0) dith[y * width + (x - 1)] += err * (7 / 16);
          if (y + 1 < height) {
            if (x + 1 < width) dith[(y + 1) * width + (x + 1)] += err * (3 / 16);
            dith[(y + 1) * width + x] += err * (5 / 16);
            if (x - 1 >= 0) dith[(y + 1) * width + (x - 1)] += err * (1 / 16);
          }
        }
      } else {
        for (let x = 0; x < width; x++) {
          const old = dith[y * width + x];
          const nw = old > params.threshold ? 255 : 0;
          const err = old - nw;
          dith[y * width + x] = nw;
          if (x + 1 < width) dith[y * width + (x + 1)] += err * (7 / 16);
          if (y + 1 < height) {
            if (x - 1 >= 0) dith[(y + 1) * width + (x - 1)] += err * (3 / 16);
            dith[(y + 1) * width + x] += err * (5 / 16);
            if (x + 1 < width) dith[(y + 1) * width + (x + 1)] += err * (1 / 16);
          }
        }
      }
    }
  } else if (params.mode === 'bayer-4x4') {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const thresh = (BAYER4[y % 4][x % 4] / 16) * 255;
        dith[y * width + x] = dith[y * width + x] > thresh ? 255 : 0;
      }
    }
  } else if (params.mode === 'none') {
    for (let i = 0; i < width * height; i++) {
      dith[i] = dith[i] > params.threshold ? 255 : 0;
    }
  } else {
    // Blue noise or bayer 8x8 approximation
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const thresh = (((x * 3 + y * 7) % 17) / 17) * 255;
        dith[y * width + x] = dith[y * width + x] > thresh ? 255 : 0;
      }
    }
  }

  const [fgR, fgG, fgB] = parseHex(params.fgColor);
  const [bgR, bgG, bgB] = parseHex(params.bgColor);

  const output = new ImageData(width, height);
  for (let i = 0; i < width * height; i++) {
    const d = i * 4;
    const isFg = dith[i] > 128;
    output.data[d]     = isFg ? fgR : bgR;
    output.data[d + 1] = isFg ? fgG : bgG;
    output.data[d + 2] = isFg ? fgB : bgB;
    output.data[d + 3] = 255;
  }

  return output;
}

export function renderRetroman(canvas: HTMLCanvasElement, imageData: ImageData, params: RetromanParams) {
  const result = applyRetroman(imageData, params);
  canvas.width = result.width;
  canvas.height = result.height;
  const ctx = canvas.getContext('2d');
  if (ctx) ctx.putImageData(result, 0, 0);
}
