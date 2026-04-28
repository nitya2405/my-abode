'use client';

import { useState, useRef, useEffect } from 'react';
import EffectLayout from '@/components/EffectLayout';
import SectionLabel from '@/components/SectionLabel';
import { renderGlassify, GlassifyParams } from '@/lib/effects/glassify';

const EFFECTS = ['None', 'Radial', 'Glitch', 'Stripe', 'Organic', 'Ripple'];

const DEFAULT_PARAMS: GlassifyParams = {
  effect: 'radial',
  // Radial
  layers: 10,
  offset: 0,
  rotation: 0.20,
  radius: 0.5,
  shadowStrength: 0.3,
  shadowWidth: 0.05,
  highlightStrength: 0.3,
  highlightWidth: 0.01,
  // Glitch
  seed: 1,
  strength: 4,
  // Stripe / Organic / Ripple
  size: 0.5,
  angle: 0,
  distortion: 0.5,
  shift: 0,
  blur: 0,
};

const hint: React.CSSProperties = { fontSize: 11, color: '#888', lineHeight: 1.6, margin: '0 0 12px' };

export default function GlassifyPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [params, setParams] = useState<GlassifyParams>(DEFAULT_PARAMS);
  const paramsRef = useRef(params);
  useEffect(() => { paramsRef.current = params; }, [params]);

  useEffect(() => {
    if (!imageData) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = imageData.width;
    canvas.height = imageData.height;

    const tick = (timestamp: number) => {
      const frame = renderGlassify(imageData, paramsRef.current, timestamp);
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) ctx.putImageData(frame, 0, 0);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [imageData]);

  const set = (patch: Partial<GlassifyParams>) => setParams((p) => ({ ...p, ...patch }));

  const e = params.effect;

  return (
    <EffectLayout
      effectName="GLASSIFY"
      description="Layered glass distortion engine. Stacks copies of the image with animated rotation, offset and geometric displacement across six refraction modes."
      canvasRef={canvasRef}
      onImageLoad={setImageData}
      animated
      hasImage={!!imageData}
    >
      <SectionLabel label="Effect" />
      <p style={hint}>
        None = static. Radial = animated rotation rings. Glitch = frame-seeded block displacement.
        Stripe / Organic / Ripple = pixel-level refraction.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5, marginBottom: 8 }}>
        {EFFECTS.map((opt) => {
          const active = e === opt.toLowerCase();
          return (
            <button key={opt} onClick={() => set({ effect: opt.toLowerCase() as GlassifyParams['effect'] })}
              style={{
                padding: '6px 4px', fontSize: 11, borderRadius: 5, border: 'none', cursor: 'pointer',
                fontFamily: '"Courier New", monospace', fontWeight: active ? 700 : 500,
                background: active ? '#fff' : '#2a2a2a', color: active ? '#000' : '#aaa',
                transition: 'all 0.1s',
              }}>
              {opt}
            </button>
          );
        })}
      </div>

      {/* ── Radial controls ── */}
      {e === 'radial' && (
        <>
          <SectionLabel label="Layer" />
          <p style={hint}>Number of stacked copies inside the radial region.</p>
          <Slider label="Layer"    value={params.layers}   min={1}   max={20}  step={1}     onChange={(v) => set({ layers: v })} />
          <Slider label="Offset"   value={params.offset}   min={0}   max={100} step={1}     onChange={(v) => set({ offset: v })} />
          <Slider label="Rotation" value={params.rotation} min={0}   max={1}   step={0.01}  onChange={(v) => set({ rotation: v })} />
          <Slider label="Radius"   value={params.radius}   min={0}   max={1}   step={0.01}  onChange={(v) => set({ radius: v })} />

          <SectionLabel label="Shadow" />
          <p style={hint}>Dark arc on each ring edge — simulates depth in the glass stack.</p>
          <Slider label="Shadow Strength" value={params.shadowStrength} min={0} max={1}   step={0.01}  onChange={(v) => set({ shadowStrength: v })} />
          <Slider label="Shadow Width"    value={params.shadowWidth}    min={0} max={0.2} step={0.005} onChange={(v) => set({ shadowWidth: v })} />

          <SectionLabel label="Highlight" />
          <p style={hint}>Light arc on each ring edge — the opposing glass refraction reflection.</p>
          <Slider label="Highlight Strength" value={params.highlightStrength} min={0} max={1}    step={0.01}  onChange={(v) => set({ highlightStrength: v })} />
          <Slider label="Highlight Width"    value={params.highlightWidth}    min={0} max={0.05} step={0.001} onChange={(v) => set({ highlightWidth: v })} />
        </>
      )}

      {/* ── Glitch controls ── */}
      {e === 'glitch' && (
        <>
          <SectionLabel label="Glitch" />
          <p style={hint}>Seed locks the base random pattern. Strength controls how many and how wide the displaced blocks are.</p>
          <Slider label="Seed"     value={params.seed}     min={1}  max={20} step={1} onChange={(v) => set({ seed: v })} />
          <Slider label="Strength" value={params.strength} min={1}  max={20} step={1} onChange={(v) => set({ strength: v })} />
        </>
      )}

      {/* ── Stripe / Organic / Ripple shared controls ── */}
      {(e === 'stripe' || e === 'organic' || e === 'ripple') && (
        <>
          <SectionLabel label={e === 'stripe' ? 'Stripe' : e === 'organic' ? 'Organic' : 'Ripple'} />
          <p style={hint}>
            {e === 'stripe' && 'Ribbed glass effect — each stripe column displaces pixels perpendicular to the stripe direction.'}
            {e === 'organic' && 'Flow-field displacement — uses a layered sine approximation of noise for smooth, natural warping.'}
            {e === 'ripple' && 'Concentric wave displacement radiating from the image center.'}
          </p>
          <Slider label="Size"       value={params.size}       min={0.05} max={1}   step={0.01} onChange={(v) => set({ size: v })} />
          <Slider label="Angle"      value={params.angle}      min={0}    max={360} step={1}    unit="°" onChange={(v) => set({ angle: v })} />
          <Slider label="Distortion" value={params.distortion} min={0}    max={1}   step={0.01} onChange={(v) => set({ distortion: v })} />
          <Slider label="Shift"      value={params.shift}      min={0}    max={1}   step={0.01} onChange={(v) => set({ shift: v })} />
          <Slider label="Blur"       value={params.blur}       min={0}    max={10}  step={0.5}  unit="px" onChange={(v) => set({ blur: v })} />
        </>
      )}
    </EffectLayout>
  );
}

function Slider({ label, value, min, max, step, unit = '', onChange }: {
  label: string; value: number; min: number; max: number; step: number; unit?: string; onChange: (v: number) => void;
}) {
  const dec = step < 1 ? (step.toString().split('.')[1]?.length ?? 2) : 0;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
        <span style={{ fontSize: 11, color: '#777', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <input
            type="number" min={min} max={max} step={step}
            value={value.toFixed(dec)}
            onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) onChange(Math.max(min, Math.min(max, v))); }}
            style={{ width: 56, background: '#232323', border: '1px solid #2e2e2e', color: '#ccc',
              fontSize: 10, fontFamily: '"Courier New", monospace', padding: '2px 5px',
              borderRadius: 3, textAlign: 'right', outline: 'none' }}
          />
          {unit && <span style={{ fontSize: 10, color: '#888' }}>{unit}</span>}
        </div>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', accentColor: '#555' }}
      />
    </div>
  );
}
