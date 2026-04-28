import { clamp, setPixel } from '../utils';

export interface SuperGParams {
  glitchIntensity: number;
  rgbSplit: number;
}

export function applyEffect(imageData: ImageData, params: SuperGParams): ImageData {
  const { width, height, data } = imageData;
  const output = new ImageData(new Uint8ClampedArray(data), width, height);
  const { glitchIntensity, rgbSplit } = params;

  // 1. RGB Split (Horizontal)
  const splitOffset = Math.floor(rgbSplit * 20);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const targetIdx = (y * width + x) * 4;
      
      const rX = clamp(x - splitOffset, 0, width - 1);
      const gX = x;
      const bX = clamp(x + splitOffset, 0, width - 1);

      output.data[targetIdx] = data[(y * width + rX) * 4];         // Red
      output.data[targetIdx + 1] = data[(y * width + gX) * 4 + 1]; // Green
      output.data[targetIdx + 2] = data[(y * width + bX) * 4 + 2]; // Blue
    }
  }

  // 2. Scanline Jitter
  if (glitchIntensity > 0) {
    for (let y = 0; y < height; y++) {
      if (Math.random() < glitchIntensity * 0.1) {
        const jitter = Math.floor((Math.random() - 0.5) * glitchIntensity * 50);
        const rowStart = y * width * 4;
        const rowCopy = new Uint8ClampedArray(output.data.subarray(rowStart, rowStart + width * 4));
        
        for (let x = 0; x < width; x++) {
          const targetX = (x + jitter + width) % width;
          for (let c = 0; c < 4; c++) {
            output.data[rowStart + targetX * 4 + c] = rowCopy[x * 4 + c];
          }
        }
      }
    }

    // 3. Block Corruption
    const blockCount = Math.floor(glitchIntensity * 10);
    for (let i = 0; i < blockCount; i++) {
      const bx = Math.floor(Math.random() * width);
      const by = Math.floor(Math.random() * height);
      const bw = Math.floor(Math.random() * 50 * glitchIntensity) + 10;
      const bh = Math.floor(Math.random() * 20 * glitchIntensity) + 5;
      
      const offsetX = Math.floor((Math.random() - 0.5) * 30);
      
      for (let y = by; y < by + bh && y < height; y++) {
        for (let x = bx; x < bx + bw && x < width; x++) {
          const sourceX = clamp(x + offsetX, 0, width - 1);
          const targetIdx = (y * width + x) * 4;
          const sourceIdx = (y * width + sourceX) * 4;
          
          output.data[targetIdx] = output.data[sourceIdx];
          output.data[targetIdx + 1] = output.data[sourceIdx + 1];
          output.data[targetIdx + 2] = output.data[sourceIdx + 2];
        }
      }
    }
  }

  return output;
}
