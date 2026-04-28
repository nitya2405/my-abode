import { getPixel, setPixel } from '../utils';

export interface BlurSuiteParams {
  strength: number;
  centerX?: number;
  centerY?: number;
}

export function applyEffect(imageData: ImageData, params: BlurSuiteParams): ImageData {
  const { width, height } = imageData;
  const output = new ImageData(new Uint8ClampedArray(imageData.data.length), width, height);
  const centerX = params.centerX ?? width / 2;
  const centerY = params.centerY ?? height / 2;
  const strength = params.strength;
  const samples = 20;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - centerX;
      const dy = y - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);
      
      // Normalized distance from center (0 to 1)
      const factor = distance / maxDist;
      const angleStep = (strength * factor) / samples;

      let r = 0, g = 0, b = 0, a = 0;
      const currentAngle = Math.atan2(dy, dx);

      for (let i = 0; i < samples; i++) {
        const stepAngle = currentAngle + (i - samples / 2) * angleStep;
        const sampleX = centerX + Math.cos(stepAngle) * distance;
        const sampleY = centerY + Math.sin(stepAngle) * distance;

        const pixel = getPixel(imageData, sampleX, sampleY);
        r += pixel[0];
        g += pixel[1];
        b += pixel[2];
        a += pixel[3];
      }

      setPixel(output, x, y, r / samples, g / samples, b / samples, a / samples);
    }
  }

  return output;
}
