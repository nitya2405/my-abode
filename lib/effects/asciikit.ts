export interface ASCIIKitParams {
  charSet: 'standard' | 'blocks' | 'simple' | 'binary' | 'dense' | 'minimal' | 'retro' | 'symbols' | 'custom';
  customChars: string;
  fontFamily: 'Monospace' | 'Courier' | 'Consolas' | 'Lucida Console';
  fontScale: number;
  charSpacing: number;
  lineHeight: number;
  contrast: number;
  brightness: number;
  invert: boolean;
  overlayOriginal: boolean;
  overlayOpacity: number;
  overlayBlur: number;
  blendMode: string;
  edgeDetection: boolean;
  edgeThreshold: number;
  charColor: string;
  useOriginalColor: boolean;
  charShadow: boolean;
  charThreshold: number;  // 0–1: cells with avg brightness below this are skipped
  bgColor: string;
  bgTransparent: boolean;
}

const CHAR_SETS: Record<string, string> = {
  standard: ' .,:;i1tfLCG08@#',
  blocks:   ' ░▒▓█',
  simple:   ' .-+*#',
  binary:   '01',
  dense:    " `.-':_,^=;><+!rc*/z?sLTv)J7(|Fi{C}fI31tlu[neoZ5Yxjya]2ESwqkP6h9d4VpOGbUAKXHm8RD#$Bg0MNWQ%&@",
  minimal:  ' ·•',
  retro:    ' +#',
  symbols:  ' .:!|+=/\\#@',
};

function detectEdges(grayscale: number[], width: number, height: number): number[] {
  const edges = new Array(width * height).fill(0);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const gx =
        -grayscale[(y - 1) * width + (x - 1)] + grayscale[(y - 1) * width + (x + 1)]
        - 2 * grayscale[y * width + (x - 1)]   + 2 * grayscale[y * width + (x + 1)]
        - grayscale[(y + 1) * width + (x - 1)] + grayscale[(y + 1) * width + (x + 1)];
      const gy =
        -grayscale[(y - 1) * width + (x - 1)] - 2 * grayscale[(y - 1) * width + x] - grayscale[(y - 1) * width + (x + 1)]
        + grayscale[(y + 1) * width + (x - 1)] + 2 * grayscale[(y + 1) * width + x] + grayscale[(y + 1) * width + (x + 1)];
      edges[y * width + x] = Math.min(255, Math.sqrt(gx * gx + gy * gy));
    }
  }
  return edges;
}

// Cached source canvas to avoid re-creating per frame
let _srcCanvas: HTMLCanvasElement | null = null;
let _srcCtx: CanvasRenderingContext2D | null = null;

export function renderASCIIKit(
  outputCanvas: HTMLCanvasElement,
  imageData: ImageData,
  params: ASCIIKitParams
): void {
  const { width, height, data } = imageData;
  const ctx = outputCanvas.getContext('2d')!;
  outputCanvas.width = width;
  outputCanvas.height = height;

  const baseFontSize = Math.round(12 * params.fontScale);
  const cellW = Math.max(1, baseFontSize * params.charSpacing);
  const cellH = Math.max(1, baseFontSize * params.lineHeight);

  const chars =
    params.charSet === 'custom'
      ? (params.customChars || ' #')
      : (CHAR_SETS[params.charSet] ?? CHAR_SETS.standard);

  // Per-pixel grayscale with contrast + brightness
  const grayscale = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    let lum = 0.299 * r + 0.587 * g + 0.114 * b;
    lum = (lum - 128) * params.contrast + 128 + params.brightness * 255;
    grayscale[i] = Math.max(0, Math.min(255, lum));
  }

  // Sobel edges only when edge detection is enabled
  const edges = params.edgeDetection ? detectEdges(Array.from(grayscale), width, height) : null;

  // --- Background ---
  if (!params.bgTransparent) {
    ctx.fillStyle = params.bgColor;
    ctx.fillRect(0, 0, width, height);
  } else {
    ctx.clearRect(0, 0, width, height);
  }

  // --- Draw original image beneath chars ---
  if (params.overlayOriginal) {
    if (!_srcCanvas) { _srcCanvas = document.createElement('canvas'); _srcCtx = _srcCanvas.getContext('2d')!; }
    if (_srcCanvas.width !== width || _srcCanvas.height !== height) { _srcCanvas.width = width; _srcCanvas.height = height; }
    _srcCtx!.putImageData(imageData, 0, 0);

    if (params.overlayBlur > 0) {
      const blurred = document.createElement('canvas');
      blurred.width = width; blurred.height = height;
      const bCtx = blurred.getContext('2d')!;
      bCtx.filter = `blur(${params.overlayBlur}px)`;
      bCtx.drawImage(_srcCanvas, 0, 0);
      ctx.drawImage(blurred, 0, 0);
    } else {
      ctx.drawImage(_srcCanvas, 0, 0);
    }
  }

  // --- Draw characters ---
  ctx.font = `${baseFontSize}px '${params.fontFamily}', monospace`;
  ctx.textBaseline = 'top';

  // Blend mode only applies to the char layer over the image
  if (params.overlayOriginal && params.blendMode !== 'source-over') {
    ctx.globalCompositeOperation = params.blendMode as GlobalCompositeOperation;
  }
  ctx.globalAlpha = params.overlayOriginal ? params.overlayOpacity : 1;

  // Shadow makes original-colored chars visible over any background
  if (params.charShadow) {
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
  }

  const cols = Math.ceil(width / cellW);
  const rows = Math.ceil(height / cellH);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x0 = Math.round(col * cellW);
      const y0 = Math.round(row * cellH);
      const cw = Math.max(1, Math.min(Math.round(cellW), width - x0));
      const ch = Math.max(1, Math.min(Math.round(cellH), height - y0));

      // Average brightness + color over the cell
      let brightSum = 0, rSum = 0, gSum = 0, bSum = 0, edgeSum = 0;
      const n = cw * ch;

      for (let dy = 0; dy < ch; dy++) {
        for (let dx = 0; dx < cw; dx++) {
          const idx = (y0 + dy) * width + (x0 + dx);
          brightSum += grayscale[idx];
          rSum += data[idx * 4];
          gSum += data[idx * 4 + 1];
          bSum += data[idx * 4 + 2];
          if (edges) edgeSum += edges[idx];
        }
      }

      // Edge detection: skip cells below threshold (bright stays as image brightness)
      if (edges && edgeSum / n < params.edgeThreshold) continue;

      let bright = brightSum / (n * 255);
      if (params.invert) bright = 1 - bright;

      // Char threshold: skip cells whose brightness is below the threshold
      if (bright < params.charThreshold) continue;

      const charIndex = Math.min(chars.length - 1, Math.floor(bright * chars.length));
      const char = chars[charIndex];

      if (char === ' ' && !params.overlayOriginal) continue;

      if (params.useOriginalColor) {
        ctx.fillStyle = `rgb(${Math.round(rSum / n)},${Math.round(gSum / n)},${Math.round(bSum / n)})`;
      } else {
        ctx.fillStyle = params.charColor;
      }

      ctx.fillText(char, x0, y0);
    }
  }

  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}
