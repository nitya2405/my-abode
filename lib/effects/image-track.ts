import { clamp, rgbToHsl } from '../utils';

export interface ImageTrackParams {
  shape: 'circle' | 'rect' | 'pill';
  regionStyle: 'basic' | 'cross' | 'label' | 'frame' | 'scope' | 'dash' | 'particle';
  filterEffect: 'none' | 'inv' | 'glitch' | 'thermal' | 'pixel' | 'tone' | 'blur';
  invert: boolean;
  blobCount: number;   // 3–20
  threshold: number;   // 0–255
  minSize: number;     // min blob pixel area
}

export interface Blob {
  cx: number;
  cy: number;
  radius: number;
  area: number;
  avgHue: number;
  avgBrightness: number;
}

/** Run once on upload — coarse grid-based blob detection */
export function detectBlobs(imageData: ImageData, params: ImageTrackParams): Blob[] {
  const { width, height, data } = imageData;

  const cellSize = Math.max(8, Math.floor(Math.sqrt((width * height) / 900)));
  const cellCols = Math.ceil(width / cellSize);
  const cellRows = Math.ceil(height / cellSize);

  const cellBright = new Float32Array(cellCols * cellRows);
  const cellHue = new Float32Array(cellCols * cellRows);

  for (let cy = 0; cy < cellRows; cy++) {
    for (let cx = 0; cx < cellCols; cx++) {
      let sumB = 0, sumH = 0, count = 0;
      for (let dy = 0; dy < cellSize; dy++) {
        for (let dx = 0; dx < cellSize; dx++) {
          const px = cx * cellSize + dx;
          const py = cy * cellSize + dy;
          if (px < width && py < height) {
            const i = (py * width + px) * 4;
            const r = data[i], g = data[i + 1], b = data[i + 2];
            sumB += 0.299 * r + 0.587 * g + 0.114 * b;
            sumH += rgbToHsl(r, g, b)[0];
            count++;
          }
        }
      }
      cellBright[cy * cellCols + cx] = count > 0 ? sumB / count : 0;
      cellHue[cy * cellCols + cx] = count > 0 ? sumH / count : 0;
    }
  }

  // Connected components at cell level
  const thresh = params.threshold;
  const cellLabels = new Int32Array(cellCols * cellRows).fill(-1);
  let nextLabel = 0;
  const blobs: Map<number, { cells: number[]; sumX: number; sumY: number }> = new Map();

  const floodLabel = (startCx: number, startCy: number, label: number) => {
    const queue: [number, number][] = [[startCx, startCy]];
    const blob = { cells: [] as number[], sumX: 0, sumY: 0 };
    blobs.set(label, blob);
    while (queue.length > 0) {
      const item = queue.pop()!;
      const [cx, cy] = item;
      if (cx < 0 || cx >= cellCols || cy < 0 || cy >= cellRows) continue;
      const idx = cy * cellCols + cx;
      if (cellLabels[idx] !== -1 || cellBright[idx] <= thresh) continue;
      cellLabels[idx] = label;
      blob.cells.push(idx);
      blob.sumX += cx;
      blob.sumY += cy;
      queue.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
    }
  };

  for (let cy = 0; cy < cellRows; cy++) {
    for (let cx = 0; cx < cellCols; cx++) {
      const idx = cy * cellCols + cx;
      if (cellBright[idx] > thresh && cellLabels[idx] === -1) {
        floodLabel(cx, cy, nextLabel++);
      }
    }
  }

  const minCells = Math.max(2, params.minSize / (cellSize * cellSize));
  const result: Blob[] = [];

  blobs.forEach((b) => {
    if (b.cells.length < minCells) return;
    const cxCell = b.sumX / b.cells.length;
    const cyCell = b.sumY / b.cells.length;
    const cx = (cxCell + 0.5) * cellSize;
    const cy = (cyCell + 0.5) * cellSize;
    const area = b.cells.length * cellSize * cellSize;
    const radius = Math.sqrt(area / Math.PI);
    let sumH = 0, sumBr = 0;
    for (const ci of b.cells) {
      sumH += cellHue[ci];
      sumBr += cellBright[ci];
    }
    result.push({
      cx, cy, radius, area,
      avgHue: sumH / b.cells.length,
      avgBrightness: sumBr / b.cells.length,
    });
  });

  result.sort((a, b) => b.area - a.area);
  return result.slice(0, params.blobCount);
}

/** ANIMATED — blob detection results reused; overlays animate each frame */
export function renderImageTrack(
  imageData: ImageData,
  blobs: Blob[],
  params: ImageTrackParams,
  timestamp: number
): ImageData {
  const { width: w, height: h } = imageData;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // Apply filter to base image
  const filtered = applyFilter(imageData, params.filterEffect);
  const filtCanvas = document.createElement('canvas');
  filtCanvas.width = w;
  filtCanvas.height = h;
  filtCanvas.getContext('2d')!.putImageData(filtered, 0, 0);
  ctx.drawImage(filtCanvas, 0, 0);

  const t = timestamp / 1000;
  const maxDist = Math.sqrt(w * w + h * h);
  const totalArea = blobs.reduce((s, b) => s + b.area, 1);
  const dashOffset = -(t * 30) % 12;

  // Draw affinity connections
  for (let i = 0; i < blobs.length; i++) {
    for (let j = i + 1; j < blobs.length; j++) {
      const a = blobs[i], b = blobs[j];
      const hueDiff = Math.min(Math.abs(a.avgHue - b.avgHue), 360 - Math.abs(a.avgHue - b.avgHue));
      const colorSim = 1 - hueDiff / 180;
      const dist = Math.sqrt((a.cx - b.cx) ** 2 + (a.cy - b.cy) ** 2);
      const proxSim = 1 - dist / maxDist;
      const maxArea = blobs[0]?.area ?? 1;
      const sizeSim = 1 - Math.abs(a.area - b.area) / maxArea;
      const affinity = colorSim * 0.5 + proxSim * 0.3 + sizeSim * 0.2;

      if (affinity > 0.45) {
        const lineAlpha = ((affinity - 0.45) / 0.55) * 0.7;
        ctx.save();
        ctx.globalAlpha = lineAlpha;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 0.5 + affinity * 2;
        ctx.setLineDash([4, 4]);
        ctx.lineDashOffset = dashOffset;
        ctx.beginPath();
        ctx.moveTo(a.cx, a.cy);
        ctx.lineTo(b.cx, b.cy);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  // Draw tracker shapes
  blobs.forEach((blob, blobIdx) => {
    const pulse = 1 + 0.06 * Math.sin(t * 3 + blobIdx * 0.7);
    const r = blob.radius * 1.2 * pulse;
    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.fillStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.9;
    ctx.setLineDash([]);

    switch (params.shape) {
      case 'circle':
        ctx.beginPath();
        ctx.arc(blob.cx, blob.cy, r, 0, Math.PI * 2);
        ctx.stroke();
        break;
      case 'rect':
        ctx.strokeRect(blob.cx - r, blob.cy - r, r * 2, r * 2);
        break;
      case 'pill': {
        const rr = r * 0.4;
        ctx.beginPath();
        ctx.roundRect(blob.cx - r, blob.cy - r * 0.65, r * 2, r * 1.3, rr);
        ctx.stroke();
        break;
      }
    }

    // Scope crosshair ticks
    if (params.regionStyle === 'scope') {
      const tick = r * 0.35;
      ctx.beginPath();
      ctx.moveTo(blob.cx - r - tick, blob.cy);
      ctx.lineTo(blob.cx - r + tick, blob.cy);
      ctx.moveTo(blob.cx + r - tick, blob.cy);
      ctx.lineTo(blob.cx + r + tick, blob.cy);
      ctx.moveTo(blob.cx, blob.cy - r - tick);
      ctx.lineTo(blob.cx, blob.cy - r + tick);
      ctx.moveTo(blob.cx, blob.cy + r - tick);
      ctx.lineTo(blob.cx, blob.cy + r + tick);
      ctx.stroke();
    }

    // Frame: corner L-brackets
    if (params.regionStyle === 'frame') {
      const arm = r * 0.4;
      const corners = [
        [blob.cx - r, blob.cy - r, 1, 1],
        [blob.cx + r, blob.cy - r, -1, 1],
        [blob.cx - r, blob.cy + r, 1, -1],
        [blob.cx + r, blob.cy + r, -1, -1],
      ];
      for (const [cx, cy, sx, sy] of corners) {
        ctx.beginPath();
        ctx.moveTo(cx + sx * arm, cy);
        ctx.lineTo(cx, cy);
        ctx.lineTo(cx, cy + sy * arm);
        ctx.stroke();
      }
    }

    // Dash circle
    if (params.regionStyle === 'dash') {
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(blob.cx, blob.cy, r * 1.15, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Label
    ctx.globalAlpha = 0.85;
    ctx.font = '10px "Courier New", monospace';
    const label = (blob.area / totalArea).toFixed(4);
    ctx.fillText(label, blob.cx + r + 4, blob.cy - 4);

    ctx.restore();
  });

  return ctx.getImageData(0, 0, w, h);
}

function applyFilter(imageData: ImageData, filter: string): ImageData {
  const { width, height, data } = imageData;
  const out = new ImageData(new Uint8ClampedArray(data.length), width, height);

  if (filter === 'none') {
    out.data.set(data);
    return out;
  }

  // Pixelate (used for 'pixel' filter)
  if (filter === 'pixel') {
    out.data.set(data);
    const bs = 8;
    for (let y = 0; y < height; y += bs) {
      for (let x = 0; x < width; x += bs) {
        let sr = 0, sg = 0, sb = 0, cnt = 0;
        for (let dy = 0; dy < bs && y + dy < height; dy++) {
          for (let dx = 0; dx < bs && x + dx < width; dx++) {
            const i = ((y + dy) * width + (x + dx)) * 4;
            sr += data[i]; sg += data[i + 1]; sb += data[i + 2]; cnt++;
          }
        }
        sr /= cnt; sg /= cnt; sb /= cnt;
        for (let dy = 0; dy < bs && y + dy < height; dy++) {
          for (let dx = 0; dx < bs && x + dx < width; dx++) {
            const i = ((y + dy) * width + (x + dx)) * 4;
            out.data[i] = sr; out.data[i + 1] = sg; out.data[i + 2] = sb; out.data[i + 3] = 255;
          }
        }
      }
    }
    return out;
  }

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    let nr = r, ng = g, nb = b;

    if (filter === 'inv') {
      nr = 255 - r; ng = 255 - g; nb = 255 - b;
    } else if (filter === 'tone') {
      const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      nr = gray; ng = gray; nb = gray;
    } else if (filter === 'thermal') {
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      if (lum < 0.25) { nr = 0; ng = 0; nb = Math.round(lum * 4 * 255); }
      else if (lum < 0.5) { nr = 0; ng = Math.round((lum - 0.25) * 4 * 255); nb = 255 - ng; }
      else if (lum < 0.75) { nr = Math.round((lum - 0.5) * 4 * 255); ng = 255; nb = 0; }
      else { nr = 255; ng = 255 - Math.round((lum - 0.75) * 4 * 255); nb = 0; }
    } else if (filter === 'glitch') {
      const shiftX = 8;
      const si = (Math.floor(i / 4 / width) * width + clamp(i / 4 % width + shiftX, 0, width - 1)) * 4;
      nr = data[si]; ng = data[i + 1]; nb = data[si + 2];
    } else if (filter === 'blur') {
      // 3-tap horizontal box blur approximation
      const x = (i / 4) % width;
      const y = Math.floor(i / 4 / width);
      const x0 = clamp(x - 2, 0, width - 1), x1 = clamp(x + 2, 0, width - 1);
      const i0 = (y * width + x0) * 4, i1 = (y * width + x1) * 4;
      nr = (data[i0] + r + data[i1]) / 3;
      ng = (data[i0 + 1] + g + data[i1 + 1]) / 3;
      nb = (data[i0 + 2] + b + data[i1 + 2]) / 3;
    }

    out.data[i] = nr; out.data[i + 1] = ng; out.data[i + 2] = nb; out.data[i + 3] = data[i + 3];
  }

  return out;
}
