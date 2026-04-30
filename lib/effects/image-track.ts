import { clamp, rgbToHsl } from '../utils';

export interface ImageTrackParams {
  shape: 'circle' | 'rect' | 'pill';
  regionStyle:
    | 'basic' | 'cross' | 'label' | 'frame' | 'l-frame' | 'x-frame'
    | 'grid' | 'scope' | 'dash' | 'particle' | 'win2k' | 'label2' | 'glow' | 'backdrop';
  filterEffect:
    | 'none' | 'inv' | 'glitch' | 'thermal' | 'pixel' | 'tone' | 'blur'
    | 'dither' | 'zoom' | 'xray' | 'water' | 'mask' | 'crt' | 'edge';
  invert: boolean;
  fusion: boolean;
  blobCount: number;
  blobCountMode: 'by-size' | 'by-count';
  threshold: number;
  minSize: number;
  strokeWidth: number;
  boundingSize: number;
  sameSize: boolean;
  connectionRate: number;
  lineStyle: 'straight' | 'curved' | 'zigzag' | 'pulse';
  dashed: boolean;
  dashSize: number;
  gapSize: number;
  centerHub: boolean;
  singleTracking: boolean;
  blink: boolean;
  showText: boolean;
  textPosition: 'center' | 'top' | 'bottom';
  textContent: 'random' | 'position' | 'count';
  fontSize: number;
  trackerColor: string;
  crazyMode: boolean;
}

export interface Blob {
  cx: number;
  cy: number;
  radius: number;
  area: number;
  avgHue: number;
  avgBrightness: number;
}

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
          const px = cx * cellSize + dx, py = cy * cellSize + dy;
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

  const thresh = params.threshold;
  const cellLabels = new Int32Array(cellCols * cellRows).fill(-1);
  let nextLabel = 0;
  const blobs: Map<number, { cells: number[]; sumX: number; sumY: number }> = new Map();

  const floodLabel = (startCx: number, startCy: number, label: number) => {
    const queue: [number, number][] = [[startCx, startCy]];
    const blob = { cells: [] as number[], sumX: 0, sumY: 0 };
    blobs.set(label, blob);
    while (queue.length > 0) {
      const [cx, cy] = queue.pop()!;
      if (cx < 0 || cx >= cellCols || cy < 0 || cy >= cellRows) continue;
      const idx = cy * cellCols + cx;
      if (cellLabels[idx] !== -1 || cellBright[idx] <= thresh) continue;
      cellLabels[idx] = label;
      blob.cells.push(idx);
      blob.sumX += cx; blob.sumY += cy;
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
    const cxCell = b.sumX / b.cells.length, cyCell = b.sumY / b.cells.length;
    const cx = (cxCell + 0.5) * cellSize, cy = (cyCell + 0.5) * cellSize;
    const area = b.cells.length * cellSize * cellSize;
    const radius = Math.sqrt(area / Math.PI);
    let sumH = 0, sumBr = 0;
    for (const ci of b.cells) { sumH += cellHue[ci]; sumBr += cellBright[ci]; }
    result.push({ cx, cy, radius, area, avgHue: sumH / b.cells.length, avgBrightness: sumBr / b.cells.length });
  });

  result.sort((a, b) => b.area - a.area);
  return result.slice(0, params.blobCount);
}

export function renderImageTrack(
  imageData: ImageData,
  blobs: Blob[],
  params: ImageTrackParams,
  timestamp: number
): ImageData {
  const { width: w, height: h } = imageData;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // Apply base filter
  let filtered = applyFilter(imageData, params.filterEffect);
  if (params.fusion) {
    const od = imageData.data, fd = filtered.data;
    for (let i = 0; i < fd.length; i += 4) {
      fd[i] = (od[i] + fd[i]) >> 1;
      fd[i + 1] = (od[i + 1] + fd[i + 1]) >> 1;
      fd[i + 2] = (od[i + 2] + fd[i + 2]) >> 1;
    }
  }
  if (params.invert) {
    const fd = filtered.data;
    for (let i = 0; i < fd.length; i += 4) {
      fd[i] = 255 - fd[i]; fd[i + 1] = 255 - fd[i + 1]; fd[i + 2] = 255 - fd[i + 2];
    }
  }
  const fc = document.createElement('canvas');
  fc.width = w; fc.height = h;
  fc.getContext('2d')!.putImageData(filtered, 0, 0);
  ctx.drawImage(fc, 0, 0);

  const t = timestamp / 1000;
  const maxDist = Math.sqrt(w * w + h * h);
  const activeBlobs = params.singleTracking ? blobs.slice(0, 1) : blobs;

  const blobColor = (idx: number) =>
    params.crazyMode ? `hsl(${(idx * 137.5) % 360}, 100%, 60%)` : params.trackerColor;

  // Blob-to-blob connections
  if (params.connectionRate > 0) {
    const threshold = 0.85 - params.connectionRate * 0.8;
    for (let i = 0; i < activeBlobs.length; i++) {
      for (let j = i + 1; j < activeBlobs.length; j++) {
        const a = activeBlobs[i], b = activeBlobs[j];
        const hueDiff = Math.min(Math.abs(a.avgHue - b.avgHue), 360 - Math.abs(a.avgHue - b.avgHue));
        const colorSim = 1 - hueDiff / 180;
        const dist = Math.sqrt((a.cx - b.cx) ** 2 + (a.cy - b.cy) ** 2);
        const proxSim = 1 - dist / maxDist;
        const maxArea = blobs[0]?.area ?? 1;
        const sizeSim = 1 - Math.abs(a.area - b.area) / maxArea;
        const affinity = colorSim * 0.5 + proxSim * 0.3 + sizeSim * 0.2;
        if (affinity > threshold) {
          const alpha = Math.min(0.8, ((affinity - threshold) / (1 - threshold)) * 0.8);
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.strokeStyle = blobColor(i);
          ctx.lineWidth = params.strokeWidth * 0.5;
          drawConnection(ctx, a, b, dist, params, t);
          ctx.restore();
        }
      }
    }
  }

  // Center hub connections
  if (params.centerHub && activeBlobs.length > 0) {
    const hx = w / 2, hy = h / 2;
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = params.strokeWidth * 0.5;
    if (params.dashed) {
      ctx.setLineDash([params.dashSize, params.gapSize]);
      ctx.lineDashOffset = -(t * 30) % (params.dashSize + params.gapSize);
    }
    activeBlobs.forEach((blob, i) => {
      ctx.strokeStyle = blobColor(i);
      ctx.beginPath(); ctx.moveTo(blob.cx, blob.cy); ctx.lineTo(hx, hy); ctx.stroke();
    });
    ctx.setLineDash([]);
    ctx.strokeStyle = params.trackerColor;
    ctx.globalAlpha = 0.75;
    ctx.lineWidth = params.strokeWidth;
    ctx.beginPath(); ctx.arc(hx, hy, 8, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(hx - 12, hy); ctx.lineTo(hx + 12, hy);
    ctx.moveTo(hx, hy - 12); ctx.lineTo(hx, hy + 12);
    ctx.stroke();
    ctx.restore();
  }

  // Tracker overlays
  activeBlobs.forEach((blob, blobIdx) => {
    if (params.blink && Math.floor(t * 4) % 2 === 0) return;
    const pulse = 1 + 0.06 * Math.sin(t * 3 + blobIdx * 0.7);
    const r = params.sameSize && params.boundingSize > 0
      ? params.boundingSize / 2
      : blob.radius * 1.2 * pulse;
    const color = blobColor(blobIdx);
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = params.strokeWidth;
    ctx.globalAlpha = 0.9;
    ctx.setLineDash([]);
    drawShape(ctx, blob, r, params, t, blobIdx, activeBlobs.length, color);
    ctx.restore();
    if (params.showText) drawText(ctx, blob, r, blobIdx, activeBlobs.length, params, t);
  });

  return ctx.getImageData(0, 0, w, h);
}

function drawShape(
  ctx: CanvasRenderingContext2D,
  blob: Blob, r: number,
  params: ImageTrackParams,
  t: number, blobIdx: number, totalBlobs: number,
  color: string
) {
  const { cx, cy } = blob;
  const { shape, regionStyle, strokeWidth: sw } = params;

  // Base bounding shape
  if (regionStyle !== 'cross' && regionStyle !== 'particle' && regionStyle !== 'glow') {
    switch (shape) {
      case 'circle':
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
        break;
      case 'rect':
        ctx.strokeRect(cx - r, cy - r, r * 2, r * 2);
        break;
      case 'pill': {
        const rr = r * 0.4;
        ctx.beginPath();
        ctx.roundRect(cx - r, cy - r * 0.65, r * 2, r * 1.3, rr);
        ctx.stroke();
        break;
      }
    }
  }

  switch (regionStyle) {
    case 'scope': {
      const tick = r * 0.35;
      ctx.beginPath();
      ctx.moveTo(cx - r - tick, cy); ctx.lineTo(cx - r + tick, cy);
      ctx.moveTo(cx + r - tick, cy); ctx.lineTo(cx + r + tick, cy);
      ctx.moveTo(cx, cy - r - tick); ctx.lineTo(cx, cy - r + tick);
      ctx.moveTo(cx, cy + r - tick); ctx.lineTo(cx, cy + r + tick);
      ctx.stroke();
      break;
    }
    case 'cross': {
      const arm = r * 0.85;
      ctx.beginPath();
      ctx.moveTo(cx - arm, cy); ctx.lineTo(cx + arm, cy);
      ctx.moveTo(cx, cy - arm); ctx.lineTo(cx, cy + arm);
      ctx.stroke();
      break;
    }
    case 'frame': {
      const arm = r * 0.4;
      ([ [-1, -1], [1, -1], [-1, 1], [1, 1] ] as [number, number][]).forEach(([sx, sy]) => {
        const fx = cx + sx * r, fy = cy + sy * r;
        ctx.beginPath();
        ctx.moveTo(fx - sx * arm, fy); ctx.lineTo(fx, fy); ctx.lineTo(fx, fy - sy * arm);
        ctx.stroke();
      });
      break;
    }
    case 'l-frame': {
      const arm = r * 0.4;
      ([ [-1, -1], [1, 1] ] as [number, number][]).forEach(([sx, sy]) => {
        const fx = cx + sx * r, fy = cy + sy * r;
        ctx.beginPath();
        ctx.moveTo(fx - sx * arm, fy); ctx.lineTo(fx, fy); ctx.lineTo(fx, fy - sy * arm);
        ctx.stroke();
      });
      break;
    }
    case 'x-frame': {
      const arm = r * 0.5;
      ([ [-1, -1], [1, -1], [-1, 1], [1, 1] ] as [number, number][]).forEach(([sx, sy]) => {
        const fx = cx + sx * r, fy = cy + sy * r;
        ctx.beginPath();
        ctx.moveTo(fx, fy); ctx.lineTo(fx - sx * arm, fy - sy * arm);
        ctx.stroke();
      });
      break;
    }
    case 'grid': {
      ctx.save();
      ctx.beginPath(); ctx.rect(cx - r, cy - r, r * 2, r * 2); ctx.clip();
      const n = 3;
      for (let g = 1; g < n; g++) {
        const gx = cx - r + (r * 2 / n) * g, gy = cy - r + (r * 2 / n) * g;
        ctx.beginPath(); ctx.moveTo(gx, cy - r); ctx.lineTo(gx, cy + r); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - r, gy); ctx.lineTo(cx + r, gy); ctx.stroke();
      }
      ctx.restore();
      break;
    }
    case 'dash': {
      ctx.save();
      ctx.setLineDash([6, 5]);
      ctx.lineDashOffset = -(t * 20) % 11;
      ctx.beginPath(); ctx.arc(cx, cy, r * 1.15, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      break;
    }
    case 'particle': {
      for (let d = 0; d < 10; d++) {
        const angle = (d / 10) * Math.PI * 2 + t * 1.5;
        const pr = r * (1 + 0.2 * Math.sin(t * 4 + d * 0.8));
        ctx.beginPath();
        ctx.arc(cx + Math.cos(angle) * pr, cy + Math.sin(angle) * pr, sw * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'glow': {
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 20;
      ctx.lineWidth = sw * 1.5;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      break;
    }
    case 'backdrop': {
      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = color;
      if (shape === 'circle') { ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); }
      else { ctx.fillRect(cx - r, cy - r, r * 2, r * 2); }
      ctx.restore();
      break;
    }
    case 'win2k': {
      const barH = Math.max(14, params.fontSize + 4);
      ctx.save();
      ctx.fillStyle = color; ctx.globalAlpha = 0.9;
      ctx.fillRect(cx - r, cy - r - barH, r * 2, barH);
      ctx.strokeRect(cx - r, cy - r - barH, r * 2, r * 2 + barH);
      ctx.fillStyle = '#000000'; ctx.globalAlpha = 1;
      ctx.font = `bold ${params.fontSize}px "Courier New", monospace`;
      ctx.fillText(`BLOB_${blobIdx + 1}`, cx - r + 4, cy - r - 4);
      ctx.restore();
      break;
    }
    case 'label2': {
      const txt = `[${blobIdx + 1}/${totalBlobs}]`;
      ctx.globalAlpha = 0.85;
      ctx.font = `${params.fontSize}px "Courier New", monospace`;
      ctx.fillText(txt, cx + r + 6, cy);
      ctx.beginPath(); ctx.moveTo(cx + r, cy); ctx.lineTo(cx + r + 4, cy); ctx.stroke();
      break;
    }
    case 'label': {
      const label = blob.avgBrightness.toFixed(0);
      ctx.globalAlpha = 0.85;
      ctx.font = `10px "Courier New", monospace`;
      ctx.fillText(label, cx + r + 4, cy - 4);
      break;
    }
    // 'basic': just the shape, nothing extra
  }
}

function drawConnection(
  ctx: CanvasRenderingContext2D,
  a: Blob, b: Blob, dist: number,
  params: ImageTrackParams,
  t: number
) {
  const { lineStyle, dashed, dashSize, gapSize } = params;
  if (dashed) {
    ctx.setLineDash([dashSize, gapSize]);
    ctx.lineDashOffset = -(t * 30) % (dashSize + gapSize);
  } else {
    ctx.setLineDash([]);
  }
  switch (lineStyle) {
    case 'straight':
      ctx.beginPath(); ctx.moveTo(a.cx, a.cy); ctx.lineTo(b.cx, b.cy); ctx.stroke();
      break;
    case 'curved': {
      const mx = (a.cx + b.cx) / 2, my = (a.cy + b.cy) / 2;
      const nx = -(b.cy - a.cy) * 0.25, ny = (b.cx - a.cx) * 0.25;
      ctx.beginPath();
      ctx.moveTo(a.cx, a.cy);
      ctx.quadraticCurveTo(mx + nx, my + ny, b.cx, b.cy);
      ctx.stroke();
      break;
    }
    case 'zigzag': {
      const safeDist = Math.max(dist, 1);
      const nx = -(b.cy - a.cy) / safeDist, ny = (b.cx - a.cx) / safeDist;
      const steps = 8;
      ctx.beginPath(); ctx.moveTo(a.cx, a.cy);
      for (let s = 1; s <= steps; s++) {
        const p = s / steps;
        const tx = a.cx + (b.cx - a.cx) * p, ty = a.cy + (b.cy - a.cy) * p;
        const off = s % 2 === 0 ? 8 : -8;
        ctx.lineTo(tx + nx * off, ty + ny * off);
      }
      ctx.stroke();
      break;
    }
    case 'pulse': {
      const safeDist = Math.max(dist, 1);
      const nx = -(b.cy - a.cy) / safeDist, ny = (b.cx - a.cx) / safeDist;
      const steps = 24;
      ctx.beginPath(); ctx.moveTo(a.cx, a.cy);
      for (let s = 1; s <= steps; s++) {
        const p = s / steps;
        const tx = a.cx + (b.cx - a.cx) * p, ty = a.cy + (b.cy - a.cy) * p;
        const wave = Math.sin(p * Math.PI * 6 - t * 5) * 8;
        ctx.lineTo(tx + nx * wave, ty + ny * wave);
      }
      ctx.stroke();
      break;
    }
  }
  ctx.setLineDash([]);
}

function drawText(
  ctx: CanvasRenderingContext2D,
  blob: Blob, r: number, blobIdx: number, totalBlobs: number,
  params: ImageTrackParams, t: number
) {
  let text = '';
  switch (params.textContent) {
    case 'random': {
      const chars = 'ABCDEF0123456789';
      const seed = blobIdx * 7 + Math.floor(t * 2) * 13;
      text = Array.from({ length: 6 }, (_, i) => chars[Math.abs(seed * (i + 3) * 31) % chars.length]).join('');
      break;
    }
    case 'position': text = `${Math.round(blob.cx)},${Math.round(blob.cy)}`; break;
    case 'count': text = `${blobIdx + 1}/${totalBlobs}`; break;
  }
  ctx.save();
  ctx.font = `${params.fontSize}px "Courier New", monospace`;
  ctx.fillStyle = params.trackerColor;
  ctx.globalAlpha = 0.9;
  const textW = ctx.measureText(text).width;
  let textX = blob.cx - textW / 2, textY = blob.cy;
  if (params.textPosition === 'top') textY = blob.cy - r - 6;
  else if (params.textPosition === 'bottom') textY = blob.cy + r + params.fontSize;
  else textY = blob.cy + params.fontSize / 3;
  ctx.fillText(text, textX, textY);
  ctx.restore();
}

function applyFilter(imageData: ImageData, filter: string): ImageData {
  const { width: w, height: h, data } = imageData;
  const out = new ImageData(new Uint8ClampedArray(data.length), w, h);

  if (filter === 'none') { out.data.set(data); return out; }
  if (filter === 'pixel') return applyPixelate(imageData);
  if (filter === 'blur') return applyBoxBlur(imageData);
  if (filter === 'edge') return applySobel(imageData);
  if (filter === 'water') return applyWater(imageData);
  if (filter === 'zoom') return applyZoom(imageData);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    let nr = r, ng = g, nb = b;
    const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);

    switch (filter) {
      case 'inv': nr = 255 - r; ng = 255 - g; nb = 255 - b; break;
      case 'tone': nr = ng = nb = gray; break;
      case 'thermal': {
        const lum = gray / 255;
        if (lum < 0.25) { nr = 0; ng = 0; nb = Math.round(lum * 4 * 255); }
        else if (lum < 0.5) { nr = 0; ng = Math.round((lum - 0.25) * 4 * 255); nb = 255 - ng; }
        else if (lum < 0.75) { nr = Math.round((lum - 0.5) * 4 * 255); ng = 255; nb = 0; }
        else { nr = 255; ng = 255 - Math.round((lum - 0.75) * 4 * 255); nb = 0; }
        break;
      }
      case 'glitch': {
        const shift = 8;
        const si = (Math.floor(i / 4 / w) * w + clamp(i / 4 % w + shift, 0, w - 1)) * 4;
        nr = data[si]; ng = g; nb = data[si + 2];
        break;
      }
      case 'dither': nr = ng = nb = gray > 128 ? 255 : 0; break;
      case 'xray': {
        const v = gray > 128 ? clamp(Math.round((gray - 128) * 2), 0, 255) : 0;
        nr = ng = nb = v; break;
      }
      case 'mask': nr = ng = nb = gray > 100 ? gray : 0; break;
      case 'crt': {
        const py = Math.floor(i / 4 / w);
        const factor = py % 3 === 0 ? 0.55 : 1;
        nr = clamp(Math.round(r * factor + 8), 0, 255);
        ng = clamp(Math.round(g * factor + 2), 0, 255);
        nb = clamp(Math.round(b * factor - 8), 0, 255);
        break;
      }
    }

    out.data[i] = nr; out.data[i + 1] = ng; out.data[i + 2] = nb; out.data[i + 3] = data[i + 3];
  }
  return out;
}

function applyPixelate(imageData: ImageData): ImageData {
  const { width: w, height: h, data } = imageData;
  const out = new ImageData(new Uint8ClampedArray(data), w, h);
  const bs = 8;
  for (let y = 0; y < h; y += bs) {
    for (let x = 0; x < w; x += bs) {
      let sr = 0, sg = 0, sb = 0, cnt = 0;
      for (let dy = 0; dy < bs && y + dy < h; dy++) {
        for (let dx = 0; dx < bs && x + dx < w; dx++) {
          const i = ((y + dy) * w + (x + dx)) * 4;
          sr += data[i]; sg += data[i + 1]; sb += data[i + 2]; cnt++;
        }
      }
      sr /= cnt; sg /= cnt; sb /= cnt;
      for (let dy = 0; dy < bs && y + dy < h; dy++) {
        for (let dx = 0; dx < bs && x + dx < w; dx++) {
          const i = ((y + dy) * w + (x + dx)) * 4;
          out.data[i] = sr; out.data[i + 1] = sg; out.data[i + 2] = sb; out.data[i + 3] = 255;
        }
      }
    }
  }
  return out;
}

function applyBoxBlur(imageData: ImageData): ImageData {
  const { width: w, height: h, data } = imageData;
  const out = new ImageData(new Uint8ClampedArray(data.length), w, h);
  for (let i = 0; i < data.length; i += 4) {
    const x = (i / 4) % w, y = Math.floor(i / 4 / w);
    const x0 = clamp(x - 2, 0, w - 1), x1 = clamp(x + 2, 0, w - 1);
    const i0 = (y * w + x0) * 4, i1 = (y * w + x1) * 4;
    out.data[i] = (data[i0] + data[i] + data[i1]) / 3;
    out.data[i + 1] = (data[i0 + 1] + data[i + 1] + data[i1 + 1]) / 3;
    out.data[i + 2] = (data[i0 + 2] + data[i + 2] + data[i1 + 2]) / 3;
    out.data[i + 3] = data[i + 3];
  }
  return out;
}

function applySobel(imageData: ImageData): ImageData {
  const { width: w, height: h, data } = imageData;
  const gray = new Float32Array(w * h);
  for (let i = 0; i < data.length; i += 4) {
    gray[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  const out = new ImageData(new Uint8ClampedArray(data.length), w, h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const gx = -gray[(y - 1) * w + (x - 1)] - 2 * gray[y * w + (x - 1)] - gray[(y + 1) * w + (x - 1)]
               + gray[(y - 1) * w + (x + 1)] + 2 * gray[y * w + (x + 1)] + gray[(y + 1) * w + (x + 1)];
      const gy = -gray[(y - 1) * w + (x - 1)] - 2 * gray[(y - 1) * w + x] - gray[(y - 1) * w + (x + 1)]
               + gray[(y + 1) * w + (x - 1)] + 2 * gray[(y + 1) * w + x] + gray[(y + 1) * w + (x + 1)];
      const mag = clamp(Math.sqrt(gx * gx + gy * gy), 0, 255);
      const i = (y * w + x) * 4;
      out.data[i] = out.data[i + 1] = out.data[i + 2] = mag; out.data[i + 3] = 255;
    }
  }
  return out;
}

function applyWater(imageData: ImageData): ImageData {
  const { width: w, height: h, data } = imageData;
  const out = new ImageData(new Uint8ClampedArray(data.length), w, h);
  const amp = 10, freq = 0.04;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const sx = clamp(Math.round(x + amp * Math.sin(y * freq)), 0, w - 1);
      const sy = clamp(Math.round(y + amp * Math.sin(x * freq)), 0, h - 1);
      const di = (y * w + x) * 4, si = (sy * w + sx) * 4;
      out.data[di] = data[si]; out.data[di + 1] = data[si + 1];
      out.data[di + 2] = data[si + 2]; out.data[di + 3] = 255;
    }
  }
  return out;
}

function applyZoom(imageData: ImageData): ImageData {
  const { width: w, height: h, data } = imageData;
  const out = new ImageData(new Uint8ClampedArray(data.length), w, h);
  const cx = w / 2, cy = h / 2, steps = 5, strength = 0.06;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (x - cx) * strength / steps, dy = (y - cy) * strength / steps;
      let sr = 0, sg = 0, sb = 0;
      for (let k = 0; k < steps; k++) {
        const sx = clamp(Math.round(x - dx * k), 0, w - 1), sy2 = clamp(Math.round(y - dy * k), 0, h - 1);
        const si = (sy2 * w + sx) * 4;
        sr += data[si]; sg += data[si + 1]; sb += data[si + 2];
      }
      const di = (y * w + x) * 4;
      out.data[di] = sr / steps; out.data[di + 1] = sg / steps;
      out.data[di + 2] = sb / steps; out.data[di + 3] = 255;
    }
  }
  return out;
}
