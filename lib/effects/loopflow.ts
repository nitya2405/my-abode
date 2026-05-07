export interface LoopflowParams {
  transform: 'droste' | 'twisted';
  iterations: number;   // 2–12
  zoom: number;         // 1.0–3.0
  speed: number;        // 0–5 animation speed
  regionPoints: [number, number][] | null;
  bgColor: string;      // background fill color
}

/** ANIMATED — animPhase continuously advances the zoom cycle */
export function renderLoopflow(
  imageData: ImageData,
  params: LoopflowParams,
  timestamp: number
): ImageData {
  const { width: w, height: h } = imageData;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = w;
  srcCanvas.height = h;
  srcCanvas.getContext('2d')!.putImageData(imageData, 0, 0);

  // Fill background then draw base image
  ctx.fillStyle = params.bgColor || '#000000';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(srcCanvas, 0, 0);

  // Source region: what content gets looped (from dots, or auto center)
  let src: { x: number; y: number; w: number; h: number };
  if (params.regionPoints && params.regionPoints.length === 4) {
    const xs = params.regionPoints.map((p) => p[0] * w);
    const ys = params.regionPoints.map((p) => p[1] * h);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    src = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  } else {
    src = { x: w * 0.325, y: h * 0.325, w: w * 0.35, h: h * 0.35 };
  }

  // Output area: always centered on the canvas (60% of each dimension)
  const outW = w * 0.6;
  const outH = h * 0.6;
  const outX = (w - outW) / 2;
  const outY = (h - outH) / 2;

  // animPhase in [0,1) drives the continuous zoom
  const animPhase = params.speed > 0
    ? (timestamp * params.speed * 0.0003) % 1.0
    : 0;

  const zf = Math.max(1.01, params.zoom);

  // Draw recursive zoom of source content into centered output area
  for (let i = params.iterations - 1; i >= 0; i--) {
    const scaleFactor = Math.pow(1 / zf, i + animPhase);
    const ix = outX + outW * (1 - scaleFactor) / 2;
    const iy = outY + outH * (1 - scaleFactor) / 2;
    const iw = outW * scaleFactor;
    const ih = outH * scaleFactor;

    if (iw < 1 || ih < 1) continue;

    ctx.save();
    if (params.transform === 'twisted') {
      const angle = (i + animPhase) * 0.15;
      ctx.translate(ix + iw / 2, iy + ih / 2);
      ctx.rotate(angle);
      ctx.translate(-(ix + iw / 2), -(iy + ih / 2));
    }
    ctx.drawImage(srcCanvas, src.x, src.y, src.w, src.h, ix, iy, iw, ih);
    ctx.restore();
  }

  return ctx.getImageData(0, 0, w, h);
}
