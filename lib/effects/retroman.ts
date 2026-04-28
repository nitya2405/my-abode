import { clamp } from '../utils';

export interface RetromanParams {
  algorithm: 'atkinson' | 'floyd' | 'bayer' | 'blue';
  brightness: number;  // -100 to +100
  contrast: number;    // -100 to +100
  scale: number;       // 1–8 (pixel block size)
  bgColor: string;     // hex e.g. '#ff6600'
}

const BAYER4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

export function applyRetroman(imageData: ImageData, params: RetromanParams): ImageData {
  const { width, height, data } = imageData;

  // Build grayscale + brightness/contrast
  const gray = new Float32Array(width * height);
  const contrastFactor = (100 + params.contrast) / 100;

  for (let i = 0; i < width * height; i++) {
    const d = i * 4;
    let lum = 0.299 * data[d] + 0.587 * data[d + 1] + 0.114 * data[d + 2];
    lum += params.brightness * 2.55;
    lum = (lum - 128) * contrastFactor + 128;
    gray[i] = clamp(lum, 0, 255);
  }

  // Pixelate: average into scale×scale blocks
  const s = Math.max(1, Math.round(params.scale));
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

  // Dithering
  const dith = new Float32Array(gray);

  if (params.algorithm === 'atkinson') {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const old = dith[y * width + x];
        const nw = old > 128 ? 255 : 0;
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
  } else if (params.algorithm === 'floyd') {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const old = dith[y * width + x];
        const nw = old > 128 ? 255 : 0;
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
  } else if (params.algorithm === 'bayer') {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const thresh = (BAYER4[y % 4][x % 4] / 16) * 255;
        dith[y * width + x] = dith[y * width + x] > thresh ? 255 : 0;
      }
    }
  } else {
    // Blue noise approximation
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const thresh = (((x * 3 + y * 7) % 17) / 17) * 255;
        dith[y * width + x] = dith[y * width + x] > thresh ? 255 : 0;
      }
    }
  }

  // Parse bg color
  const hex = params.bgColor.replace('#', '');
  const bgR = parseInt(hex.slice(0, 2), 16);
  const bgG = parseInt(hex.slice(2, 4), 16);
  const bgB = parseInt(hex.slice(4, 6), 16);

  const output = new ImageData(width, height);
  for (let i = 0; i < width * height; i++) {
    const isBlack = dith[i] < 128;
    const d = i * 4;
    output.data[d] = isBlack ? 0 : bgR;
    output.data[d + 1] = isBlack ? 0 : bgG;
    output.data[d + 2] = isBlack ? 0 : bgB;
    output.data[d + 3] = 255;
  }

  return output;
}
