'use client';

import { useState, useRef, useEffect } from 'react';
import EffectLayout from '@/components/EffectLayout';
import ButtonGroup from '@/components/ButtonGroup';
import ParamSlider from '@/components/ParamSlider';
import SectionLabel from '@/components/SectionLabel';
import { renderLoopflow, LoopflowParams } from '@/lib/effects/loopflow';

const TRANSFORMS = ['Droste', 'Twisted'];

const hint: React.CSSProperties = { fontSize: 11, color: '#888', lineHeight: 1.6, margin: '0 0 12px' };

export default function LoopflowPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [drawMode, setDrawMode] = useState(false);
  const [regionPoints, setRegionPoints] = useState<[number, number][] | null>(null);
  const [params, setParams] = useState<LoopflowParams>({
    transform: 'droste',
    iterations: 6,
    zoom: 2.0,
    speed: 1,
    regionPoints: null,
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
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) ctx.putImageData(frame, 0, 0);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [imageData, params]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !drawMode) return;
    let pts: [number, number][] = [];

    const onClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      pts = [...pts, [x, y]];
      if (pts.length === 4) {
        setRegionPoints(pts);
        setDrawMode(false);
      }
    };
    canvas.addEventListener('click', onClick);
    return () => canvas.removeEventListener('click', onClick);
  }, [drawMode]);

  const set = (patch: Partial<LoopflowParams>) => setParams((p) => ({ ...p, ...patch }));

  return (
    <EffectLayout
      effectName="LOOPFLOW"
      description="Infinite Droste zoom — the image recursively contains itself, animating continuously. Each iteration reveals the whole image again at a smaller scale."
      canvasRef={canvasRef}
      onImageLoad={(d) => { setImageData(d); setRegionPoints(null); }}
      animated
      hasImage={!!imageData}
    >
      <SectionLabel label="Transform" />
      <p style={hint}>Droste = classic fractal zoom. Twisted adds rotation between each iteration for a spiral tunnel effect.</p>
      <ButtonGroup
        options={TRANSFORMS}
        value={params.transform}
        onChange={(v) => set({ transform: v as LoopflowParams['transform'] })}
        cols={2}
      />

      <SectionLabel label="Region" />
      <p style={hint}>Auto tiles the full image. Draw lets you click 4 points on the canvas to define a custom tile region — useful for centering the zoom on a subject.</p>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <button
          onClick={() => { setRegionPoints(null); setDrawMode(false); }}
          style={{
            flex: 1, padding: '6px 8px', fontSize: 11,
            fontFamily: '"Courier New", monospace', fontWeight: 600,
            borderRadius: 5, border: 'none', cursor: 'pointer',
            background: !regionPoints ? '#fff' : '#2a2a2a',
            color: !regionPoints ? '#000' : '#aaa',
          }}
        >
          Auto
        </button>
        <button
          onClick={() => { setDrawMode(true); setRegionPoints(null); }}
          style={{
            flex: 1, padding: '6px 8px', fontSize: 11,
            fontFamily: '"Courier New", monospace', fontWeight: 600,
            borderRadius: 5, border: 'none', cursor: 'pointer',
            background: drawMode ? '#fff' : '#2a2a2a',
            color: drawMode ? '#000' : '#aaa',
          }}
        >
          {drawMode ? 'Click 4 pts…' : 'Draw'}
        </button>
      </div>

      <SectionLabel label="Droste" />
      <p style={hint}>Iterations = depth of the recursive tunnel — more levels means a longer zoom before it repeats. Zoom = scale factor between each level.</p>
      <ParamSlider label="Iterations" value={params.iterations} min={2} max={12} step={1} onChange={(v) => set({ iterations: v })} />
      <ParamSlider label="Zoom" value={params.zoom} min={1.1} max={3.0} step={0.05} decimals={2} onChange={(v) => set({ zoom: v })} />

      <SectionLabel label="Animation" />
      <p style={hint}>Speed controls how fast the zoom phase advances. Set to 0 to freeze the loop at its current depth.</p>
      <ParamSlider label="Speed" value={params.speed} min={0} max={5} step={0.1} decimals={1} onChange={(v) => set({ speed: v })} />
    </EffectLayout>
  );
}
