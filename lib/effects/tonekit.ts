export interface TonekitParams {
  shape: 'circle' | 'square' | 'cross' | 'triangle' | 'line' | 'spiral' | 'ring' | 'hexagon' | 'stroke' | 'polar' | 'capsule' | 'heart';
  sample: number;        // grid cell size 2–80
  scale: number;         // shape size multiplier 0.1–2.0
  rotation: number;      // degrees 0–360
  invert: boolean;
  thresholdMode: boolean;
  threshold: number;     // 0–255
  useOriginalColor: boolean;
  shapeColor: string;
  bgColor: string;
  bgTransparent: boolean;
  overlayOriginal: boolean;
  overlayOpacity: number;
  overlayBlur: number;
}

let _srcCanvas: HTMLCanvasElement | null = null;
let _srcCtx: CanvasRenderingContext2D | null = null;

export function renderTonekit(
  outputCanvas: HTMLCanvasElement,
  imageData: ImageData,
  params: TonekitParams
): void {
  const { width, height, data } = imageData;
  outputCanvas.width = width;
  outputCanvas.height = height;
  const ctx = outputCanvas.getContext('2d')!;

  if (!params.bgTransparent) {
    ctx.fillStyle = params.bgColor;
    ctx.fillRect(0, 0, width, height);
  } else {
    ctx.clearRect(0, 0, width, height);
  }

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
      ctx.globalAlpha = params.overlayOpacity;
      ctx.drawImage(blurred, 0, 0);
    } else {
      ctx.globalAlpha = params.overlayOpacity;
      ctx.drawImage(_srcCanvas, 0, 0);
    }
    ctx.globalAlpha = 1;
  }

  const sample = Math.max(2, params.sample);
  const rad = (params.rotation * Math.PI) / 180;

  for (let y = 0; y < height; y += sample) {
    for (let x = 0; x < width; x += sample) {
      let brightSum = 0, rSum = 0, gSum = 0, bSum = 0, count = 0;
      for (let dy = 0; dy < sample && y + dy < height; dy++) {
        for (let dx = 0; dx < sample && x + dx < width; dx++) {
          const idx = ((y + dy) * width + (x + dx)) * 4;
          const r = data[idx], g = data[idx + 1], b = data[idx + 2];
          brightSum += 0.299 * r + 0.587 * g + 0.114 * b;
          rSum += r; gSum += g; bSum += b;
          count++;
        }
      }
      const brightness = brightSum / count;

      if (params.thresholdMode && brightness > params.threshold) continue;

      const sizeFactor = params.invert
        ? (brightness / 255) * params.scale
        : (1 - brightness / 255) * params.scale;
      if (sizeFactor < 0.01) continue;

      // sz is radius; sample * scale * brightness_weight maps dark→large, bright→small
      const sz = sample * sizeFactor;
      const cx = x + sample / 2;
      const cy = y + sample / 2;

      const color = params.useOriginalColor
        ? `rgb(${Math.round(rSum / count)},${Math.round(gSum / count)},${Math.round(bSum / count)})`
        : params.shapeColor;
      ctx.fillStyle = color;
      ctx.strokeStyle = color;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rad);
      drawShape(ctx, params.shape, sz, sample);
      ctx.restore();
    }
  }
}

function drawShape(
  ctx: CanvasRenderingContext2D,
  shape: TonekitParams['shape'],
  sz: number,
  sample: number
): void {
  switch (shape) {
    case 'circle':
      ctx.beginPath();
      ctx.arc(0, 0, sz, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'square':
      ctx.fillRect(-sz, -sz, sz * 2, sz * 2);
      break;

    case 'cross': {
      const t = sz * 0.35;
      ctx.fillRect(-sz, -t, sz * 2, t * 2);
      ctx.fillRect(-t, -sz, t * 2, sz * 2);
      break;
    }

    case 'triangle':
      ctx.beginPath();
      ctx.moveTo(0, -sz);
      ctx.lineTo(sz * 0.866, sz * 0.5);
      ctx.lineTo(-sz * 0.866, sz * 0.5);
      ctx.closePath();
      ctx.fill();
      break;

    case 'line':
      ctx.lineWidth = Math.max(0.5, sz * 1.4);
      ctx.beginPath();
      ctx.moveTo(-sample / 2, 0);
      ctx.lineTo(sample / 2, 0);
      ctx.stroke();
      break;

    case 'spiral': {
      ctx.lineWidth = Math.max(0.4, sz * 0.25);
      ctx.beginPath();
      const turns = 2.5;
      for (let a = 0; a <= Math.PI * 2 * turns; a += 0.12) {
        const r = (sz * a) / (Math.PI * 2 * turns);
        const px = r * Math.cos(a);
        const py = r * Math.sin(a);
        if (a === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      break;
    }

    case 'ring':
      ctx.lineWidth = Math.max(1, sz * 0.28);
      ctx.beginPath();
      ctx.arc(0, 0, sz * 0.72, 0, Math.PI * 2);
      ctx.stroke();
      break;

    case 'hexagon': {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 6;
        const hx = sz * Math.cos(a);
        const hy = sz * Math.sin(a);
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.fill();
      break;
    }

    case 'stroke':
      ctx.lineWidth = Math.max(0.5, sz * 0.4);
      ctx.strokeRect(-sz, -sz, sz * 2, sz * 2);
      break;

    case 'polar': {
      ctx.beginPath();
      for (let a = 0; a <= Math.PI * 2 + 0.05; a += 0.04) {
        const r = sz * Math.abs(Math.cos(2 * a));
        const px = r * Math.cos(a);
        const py = r * Math.sin(a);
        if (a === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      break;
    }

    case 'capsule': {
      const hw = sz;
      const hh = Math.max(sz * 0.45, 0.5);
      const r = hh;
      ctx.beginPath();
      ctx.moveTo(-hw + r, -hh);
      ctx.lineTo(hw - r, -hh);
      ctx.arc(hw - r, 0, r, -Math.PI / 2, Math.PI / 2);
      ctx.lineTo(-hw + r, hh);
      ctx.arc(-hw + r, 0, r, Math.PI / 2, -Math.PI / 2);
      ctx.closePath();
      ctx.fill();
      break;
    }

    case 'heart': {
      const s = sz * 0.85;
      ctx.beginPath();
      ctx.moveTo(0, s * 0.5);
      ctx.bezierCurveTo(-s * 0.05, s * 0.2, -s, s * 0.15, -s, -s * 0.2);
      ctx.bezierCurveTo(-s, -s * 0.65, -s * 0.4, -s, 0, -s * 0.5);
      ctx.bezierCurveTo(s * 0.4, -s, s, -s * 0.65, s, -s * 0.2);
      ctx.bezierCurveTo(s, s * 0.15, s * 0.05, s * 0.2, 0, s * 0.5);
      ctx.fill();
      break;
    }
  }
}
