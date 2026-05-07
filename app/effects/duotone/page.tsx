'use client';

import { useState, useRef, useEffect } from 'react';
import EffectLayout from '@/components/EffectLayout';
import { renderDuotone, DuotoneParams, DUOTONE_PRESETS } from '@/lib/effects/duotone';
import { C } from '@/lib/effects-data';

const sect: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '10px 0 6px', borderTop: '1px solid rgba(172,199,253,0.1)', marginTop: 4,
};
const sectLabel: React.CSSProperties = {
  fontSize: 11, color: '#acc7fd', fontFamily: '"Courier New", monospace',
  letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700,
};
const sliderRow: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  fontSize: 10, color: '#8e9aaa', fontFamily: '"Courier New", monospace',
  letterSpacing: '0.06em', marginBottom: 4,
};

function ColorSwatch({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      <div
        onClick={() => inputRef.current?.click()}
        style={{ width: 32, height: 32, background: value, border: '1px solid rgba(172,199,253,0.2)', cursor: 'pointer', flexShrink: 0 }}
      />
      <input ref={inputRef} type="color" value={value} onChange={e => onChange(e.target.value)}
        style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }} />
      <div>
        <div style={{ fontSize: 9, color: C.textMuted, fontFamily: 'monospace', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</div>
        <div style={{ fontSize: 10, color: C.primary, fontFamily: 'monospace' }}>{value}</div>
      </div>
    </div>
  );
}

export default function DuotonePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<number | null>(0);
  const [params, setParams] = useState<DuotoneParams>({
    shadowColor: DUOTONE_PRESETS[0].shadow,
    highlightColor: DUOTONE_PRESETS[0].highlight,
    contrast: 20,
    midpoint: 50,
  });

  const paramsRef = useRef(params);
  useEffect(() => { paramsRef.current = params; }, [params]);

  useEffect(() => {
    if (!imageData) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const out = renderDuotone(imageData, params);
    canvas.getContext('2d')!.putImageData(out, 0, 0);
  }, [imageData, params]);

  const set = (patch: Partial<DuotoneParams>) => {
    setSelectedPreset(null);
    setParams(p => ({ ...p, ...patch }));
  };

  const applyPreset = (i: number) => {
    setSelectedPreset(i);
    setParams(p => ({ ...p, shadowColor: DUOTONE_PRESETS[i].shadow, highlightColor: DUOTONE_PRESETS[i].highlight }));
  };

  return (
    <EffectLayout
      effectName="DUOTONE"
      description="Map image luminance to two colors — shadows and highlights — for bold graphic output."
      canvasRef={canvasRef}
      onImageLoad={setImageData}
      hasImage={!!imageData}
    >
      <div style={{ height: 10 }} />

      {/* Live gradient preview */}
      {imageData && (
        <div style={{
          height: 8, marginBottom: 12,
          background: `linear-gradient(to right, ${params.shadowColor}, ${params.highlightColor})`,
          border: '1px solid rgba(172,199,253,0.1)',
        }} />
      )}

      {/* Presets */}
      <div style={sect}><span style={sectLabel}>Presets</span></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, marginBottom: 12 }}>
        {DUOTONE_PRESETS.map((p, i) => (
          <div
            key={p.name}
            onClick={() => applyPreset(i)}
            title={p.name}
            style={{
              height: 28, cursor: 'pointer',
              background: `linear-gradient(to right, ${p.shadow}, ${p.highlight})`,
              border: selectedPreset === i ? '2px solid #acc7fd' : '1px solid rgba(172,199,253,0.15)',
              position: 'relative',
            }}
          >
            <span style={{
              position: 'absolute', bottom: 2, right: 4,
              fontSize: 7, fontFamily: 'monospace', color: 'rgba(255,255,255,0.7)',
              letterSpacing: '0.05em', textShadow: '0 1px 2px rgba(0,0,0,0.8)',
            }}>{p.name}</span>
          </div>
        ))}
      </div>

      {/* Custom colors */}
      <div style={sect}><span style={sectLabel}>Colors</span></div>
      <ColorSwatch label="Shadow" value={params.shadowColor} onChange={v => set({ shadowColor: v })} />
      <ColorSwatch label="Highlight" value={params.highlightColor} onChange={v => set({ highlightColor: v })} />

      {/* Tone controls */}
      <div style={sect}><span style={sectLabel}>Tone</span></div>

      <div style={sliderRow}>
        <span>Contrast</span>
        <span style={{ color: '#acc7fd' }}>{params.contrast}</span>
      </div>
      <input type="range" min={0} max={100} step={1} value={params.contrast}
        onChange={e => set({ contrast: +e.target.value })}
        style={{ width: '100%', marginBottom: 12, accentColor: '#acc7fd' }} />

      <div style={sliderRow}>
        <span>Midpoint</span>
        <span style={{ color: '#acc7fd' }}>{params.midpoint}%</span>
      </div>
      <input type="range" min={10} max={90} step={1} value={params.midpoint}
        onChange={e => set({ midpoint: +e.target.value })}
        style={{ width: '100%', marginBottom: 10, accentColor: '#acc7fd' }} />
    </EffectLayout>
  );
}
