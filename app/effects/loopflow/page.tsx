'use client';

import { useState, useRef, useEffect } from 'react';
import EffectLayout from '@/components/EffectLayout';
import { renderLoopflow, LoopflowParams } from '@/lib/effects/loopflow';

const BG_COLORS = [
  '#ffffff', '#000000', '#00d4ff', '#00e676', '#00c853',
  '#64dd17', '#ffd600', '#ff6d00', '#f44336', '#e91e63',
  '#ce93d8', '#7b1fa2', '#3f51b5', '#1565c0', '#0288d1',
  '#006064', '#1b5e20', '#827717', '#bf360c', '#4e342e',
  '#546e7a', '#212121',
];

const sect: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '10px 0 6px', borderTop: '1px solid rgba(172,199,253,0.1)', marginTop: 4,
};
const sectLabel: React.CSSProperties = {
  fontSize: 11, color: '#acc7fd', fontFamily: '"Courier New", monospace',
  letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700,
};
const btn = (active: boolean): React.CSSProperties => ({
  flex: 1, padding: '7px 8px', fontSize: 11, borderRadius: 0,
  fontFamily: '"Courier New", monospace', fontWeight: 600, letterSpacing: '0.06em',
  border: `1px solid ${active ? '#acc7fd' : 'rgba(172,199,253,0.15)'}`,
  background: active ? '#acc7fd' : '#152028',
  color: active ? '#08151b' : '#8e9aaa', cursor: 'pointer',
});
const sliderRow: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  fontSize: 10, color: '#8e9aaa', fontFamily: '"Courier New", monospace',
  letterSpacing: '0.06em', marginBottom: 4,
};

function drawPointsOverlay(
  ctx: CanvasRenderingContext2D,
  pts: [number, number][],
  W: number,
  H: number,
  confirmed: boolean
) {
  if (pts.length === 0) return;
  ctx.save();

  // Connecting lines
  if (pts.length > 1) {
    ctx.beginPath();
    ctx.setLineDash([5, 3]);
    ctx.strokeStyle = 'rgba(172,199,253,0.75)';
    ctx.lineWidth = 1.5;
    pts.forEach(([nx, ny], i) => {
      if (i === 0) ctx.moveTo(nx * W, ny * H);
      else ctx.lineTo(nx * W, ny * H);
    });
    // Close the quad if all 4 collected
    if (pts.length === 4) {
      ctx.lineTo(pts[0][0] * W, pts[0][1] * H);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Dots
  pts.forEach(([nx, ny], i) => {
    const px = nx * W, py = ny * H;
    // Halo
    ctx.beginPath();
    ctx.arc(px, py, 9, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(172,199,253,0.18)';
    ctx.fill();
    // Dot
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.fillStyle = confirmed ? 'rgba(172,199,253,0.55)' : '#acc7fd';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.stroke();
    // Number
    ctx.fillStyle = '#08151b';
    ctx.font = 'bold 8px Courier New';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${i + 1}`, px, py);
  });

  ctx.restore();
}

export default function LoopflowPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const pendingPointsRef = useRef<[number, number][]>([]);
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [drawMode, setDrawMode] = useState(false);
  const [regionPoints, setRegionPoints] = useState<[number, number][] | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [params, setParams] = useState<LoopflowParams>({
    transform: 'droste',
    iterations: 6,
    zoom: 2.0,
    speed: 0.3,
    regionPoints: null,
    bgColor: '#000000',
  });

  useEffect(() => {
    setParams((p) => ({ ...p, regionPoints }));
  }, [regionPoints]);

  useEffect(() => {
    if (!imageData) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const tick = (timestamp: number) => {
      const frame = renderLoopflow(imageData, params, timestamp);
      const c = canvasRef.current;
      if (!c) { rafRef.current = requestAnimationFrame(tick); return; }
      const ctx = c.getContext('2d')!;
      ctx.putImageData(frame, 0, 0);

      // Pending point overlay (while clicking 4 points) — hide once region is confirmed
      const ppts = pendingPointsRef.current;
      if (ppts.length > 0 && !params.regionPoints) {
        drawPointsOverlay(ctx, ppts, c.width, c.height, false);
      }

      // Confirmed region overlay
      if (params.regionPoints && params.regionPoints.length === 4) {
        drawPointsOverlay(ctx, params.regionPoints, c.width, c.height, true);
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [imageData, params]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !drawMode) return;
    pendingPointsRef.current = [];

    const recordPoint = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      const pt: [number, number] = [
        (clientX - rect.left) / rect.width,
        (clientY - rect.top) / rect.height,
      ];
      const next = [...pendingPointsRef.current, pt];
      pendingPointsRef.current = next;
      setPendingCount(next.length);
      if (next.length === 4) {
        setRegionPoints(next);
        setDrawMode(false);
        // Don't clear ref here — keep dots visible until effect cleanup runs
      }
    };

    const onClick = (e: MouseEvent) => recordPoint(e.clientX, e.clientY);
    const onTouch = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.changedTouches[0];
      recordPoint(touch.clientX, touch.clientY);
    };

    canvas.addEventListener('click', onClick);
    canvas.addEventListener('touchend', onTouch, { passive: false });
    return () => {
      canvas.removeEventListener('click', onClick);
      canvas.removeEventListener('touchend', onTouch);
      pendingPointsRef.current = [];
      setPendingCount(0);
    };
  }, [drawMode]);

  const set = (patch: Partial<LoopflowParams>) => setParams((p) => ({ ...p, ...patch }));

  return (
    <EffectLayout
      effectName="LOOPFLOW"
      description="Infinite Droste zoom — the image recursively contains itself, animating continuously."
      canvasRef={canvasRef}
      onImageLoad={(d) => { setImageData(d); setRegionPoints(null); pendingPointsRef.current = []; setPendingCount(0); }}
      animated
      hasImage={!!imageData}
    >
      <div style={{ height: 10 }} />

      {/* Region */}
      <div style={{ ...sect, borderTop: 'none', paddingTop: 0 }}>
        <span style={sectLabel}>Region</span>
        {drawMode && (
          <span style={{ fontSize: 10, color: '#acc7fd', fontFamily: '"Courier New", monospace' }}>
            {pendingCount}/4 pts
          </span>
        )}
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
        <button onClick={() => { setRegionPoints(null); setDrawMode(false); pendingPointsRef.current = []; setPendingCount(0); }} style={btn(!drawMode && !regionPoints)}>
          Auto
        </button>
        <button onClick={() => { setDrawMode(true); setRegionPoints(null); pendingPointsRef.current = []; setPendingCount(0); }} style={btn(drawMode || !!regionPoints)}>
          {drawMode ? `Click pt ${pendingCount + 1}…` : 'Draw'}
        </button>
      </div>

      {/* Region defined */}
      {regionPoints && (
        <>
          <div style={sect}>
            <span style={sectLabel}>Region defined</span>
          </div>
          <button
            onClick={() => { setRegionPoints(null); setDrawMode(false); pendingPointsRef.current = []; setPendingCount(0); }}
            style={{
              width: '100%', padding: '8px', fontSize: 11, borderRadius: 0,
              fontFamily: '"Courier New", monospace', fontWeight: 600, letterSpacing: '0.08em',
              border: '1px solid rgba(172,199,253,0.25)', background: '#152028',
              color: '#acc7fd', cursor: 'pointer', marginBottom: 6,
            }}
          >
            ↺ Reset Region
          </button>
        </>
      )}

      {/* Transform */}
      <div style={sect}>
        <span style={sectLabel}>Transform</span>
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
        <button onClick={() => set({ transform: 'droste' })} style={btn(params.transform === 'droste')}>
          ↔ Droste
        </button>
        <button onClick={() => set({ transform: 'twisted' })} style={btn(params.transform === 'twisted')}>
          ≡ Twisted
        </button>
      </div>

      {/* Animation */}
      <div style={sect}>
        <span style={sectLabel}>Animation</span>
      </div>
      <div style={sliderRow}>
        <span>Zoom</span>
        <span style={{ color: '#acc7fd' }}>{params.zoom.toFixed(2)}</span>
      </div>
      <input type="range" min={1.1} max={3} step={0.05} value={params.zoom}
        onChange={(e) => set({ zoom: +e.target.value })}
        style={{ width: '100%', marginBottom: 12, accentColor: '#acc7fd' }} />
      <div style={sliderRow}>
        <span>Speed</span>
        <span style={{ color: '#acc7fd' }}>{params.speed.toFixed(2)}</span>
      </div>
      <input type="range" min={0} max={5} step={0.05} value={params.speed}
        onChange={(e) => set({ speed: +e.target.value })}
        style={{ width: '100%', marginBottom: 10, accentColor: '#acc7fd' }} />

      {/* Background */}
      <div style={sect}>
        <span style={sectLabel}>Background</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(11, 1fr)', gap: 3, marginBottom: 10 }}>
        {BG_COLORS.map((c) => (
          <div key={c} onClick={() => set({ bgColor: c })} style={{
            aspectRatio: '1', background: c, cursor: 'pointer',
            border: params.bgColor === c ? '2px solid #acc7fd' : '1px solid rgba(172,199,253,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {params.bgColor === c && (
              <span style={{ fontSize: 8, color: c === '#ffffff' ? '#000' : '#fff', fontWeight: 900 }}>✓</span>
            )}
          </div>
        ))}
      </div>
    </EffectLayout>
  );
}
