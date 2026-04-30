'use client';

import { useState, useRef, useEffect } from 'react';
import EffectLayout from '@/components/EffectLayout';
import { renderScanline, ScanlineParams } from '@/lib/effects/scanline';

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
const btn = (active: boolean): React.CSSProperties => ({
  flex: 1, padding: '7px 8px', fontSize: 11, borderRadius: 0,
  fontFamily: '"Courier New", monospace', fontWeight: 600, letterSpacing: '0.06em',
  border: `1px solid ${active ? '#acc7fd' : 'rgba(172,199,253,0.15)'}`,
  background: active ? '#acc7fd' : '#152028',
  color: active ? '#08151b' : '#8e9aaa', cursor: 'pointer',
});

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange} style={{
      width: 34, height: 18, borderRadius: 0, border: '1px solid rgba(172,199,253,0.2)',
      background: on ? 'rgba(172,199,253,0.15)' : '#152028', cursor: 'pointer', position: 'relative', flexShrink: 0,
    }}>
      <div style={{
        position: 'absolute', top: 3, left: on ? 16 : 3, width: 10, height: 10,
        background: on ? '#acc7fd' : '#4a5568', transition: 'left 0.15s',
      }} />
    </button>
  );
}

function Slider({ label, value, min, max, step, unit, decimals, onChange }: {
  label: string; value: number; min: number; max: number; step: number;
  unit?: string; decimals?: number; onChange: (v: number) => void;
}) {
  const display = decimals !== undefined ? value.toFixed(decimals) : String(value);
  return (
    <>
      <div style={sliderRow}>
        <span>{label}</span>
        <span style={{ color: '#acc7fd' }}>{display}{unit ?? ''}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(+e.target.value)}
        style={{ width: '100%', marginBottom: 10, accentColor: '#acc7fd' }} />
    </>
  );
}

const DEFAULT_PARAMS: ScanlineParams = {
  preset: 'full',
  analogEnabled: true,
  analogIntensity: 0.6,
  analogChroma: 0.4,
  analogTracking: 0.3,
  digitalEnabled: true,
  digitalBlockSpeed: 0.4,
  digitalBlockCoverage: 0.3,
  crtEnabled: true,
  curvature: 0.3,
  vignette: 0.4,
  timingDuration: 8,
  timingAmount: 0.5,
  noise: 0.2,
  scanlineFreq: 0.5,
  scanlineSpeed: 0.3,
  scanlineIntensity: 0.4,
  monoEnabled: false,
};

const PRESETS: ScanlineParams['preset'][] = ['full', 'analog', 'digital', 'subtle'];

export default function ScanlinePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [params, setParams] = useState<ScanlineParams>(DEFAULT_PARAMS);

  useEffect(() => {
    if (!imageData) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const tick = (timestamp: number) => {
      const frame = renderScanline(imageData, params, timestamp);
      canvasRef.current?.getContext('2d')!.putImageData(frame, 0, 0);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [imageData, params]);

  const set = (patch: Partial<ScanlineParams>) => setParams((p) => ({ ...p, ...patch }));

  return (
    <EffectLayout
      effectName="SCANLINE"
      description="CRT and VHS emulator — phosphor flicker, chroma aberration, tracking bands, digital corruption, barrel distortion."
      canvasRef={canvasRef}
      onImageLoad={setImageData}
      animated
      hasImage={!!imageData}
    >
      <div style={{ height: 10 }} />

      {/* Presets */}
      <div style={{ ...sect, borderTop: 'none', paddingTop: 0 }}>
        <span style={sectLabel}>Preset</span>
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {PRESETS.map((p) => (
          <button key={p} onClick={() => set({ preset: p })} style={btn(params.preset === p)}>
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      {/* Analog */}
      <div style={sect}>
        <span style={sectLabel}>Analog</span>
        <Toggle on={params.analogEnabled} onChange={() => set({ analogEnabled: !params.analogEnabled })} />
      </div>
      <Slider label="Intensity" value={params.analogIntensity} min={0} max={1} step={0.01} decimals={2} onChange={(v) => set({ analogIntensity: v })} />
      <Slider label="Chroma" value={params.analogChroma} min={0} max={1} step={0.01} decimals={2} onChange={(v) => set({ analogChroma: v })} />
      <Slider label="Tracking Speed" value={params.analogTracking} min={0} max={1} step={0.01} decimals={2} onChange={(v) => set({ analogTracking: v })} />

      {/* Digital */}
      <div style={sect}>
        <span style={sectLabel}>Digital</span>
        <Toggle on={params.digitalEnabled} onChange={() => set({ digitalEnabled: !params.digitalEnabled })} />
      </div>
      <Slider label="Block Speed" value={params.digitalBlockSpeed} min={0} max={1} step={0.01} decimals={2} onChange={(v) => set({ digitalBlockSpeed: v })} />
      <Slider label="Block Coverage" value={params.digitalBlockCoverage} min={0} max={1} step={0.01} decimals={2} onChange={(v) => set({ digitalBlockCoverage: v })} />

      {/* CRT */}
      <div style={sect}>
        <span style={sectLabel}>CRT</span>
        <Toggle on={params.crtEnabled} onChange={() => set({ crtEnabled: !params.crtEnabled })} />
      </div>
      <Slider label="Curvature" value={params.curvature} min={0} max={1} step={0.01} decimals={2} onChange={(v) => set({ curvature: v })} />
      <Slider label="Vignette" value={params.vignette} min={0} max={1} step={0.01} decimals={2} onChange={(v) => set({ vignette: v })} />

      {/* Timing */}
      <div style={sect}>
        <span style={sectLabel}>Timing</span>
        <span style={{ fontSize: 11, color: '#acc7fd', fontFamily: '"Courier New", monospace' }}>
          {params.timingDuration.toFixed(1)}s
        </span>
      </div>
      <Slider label="Duration" value={params.timingDuration} min={1} max={15} step={0.5} unit="s" decimals={1} onChange={(v) => set({ timingDuration: v })} />
      <Slider label="Amount" value={params.timingAmount} min={0} max={1} step={0.01} decimals={2} onChange={(v) => set({ timingAmount: v })} />

      {/* Display */}
      <div style={sect}>
        <span style={sectLabel}>Display</span>
      </div>
      <Slider label="Noise" value={params.noise} min={0} max={1} step={0.01} decimals={2} onChange={(v) => set({ noise: v })} />
      <Slider label="Scanline Freq" value={params.scanlineFreq} min={0} max={1} step={0.01} decimals={2} onChange={(v) => set({ scanlineFreq: v })} />
      <Slider label="Scanline Speed" value={params.scanlineSpeed} min={0} max={1} step={0.01} decimals={2} onChange={(v) => set({ scanlineSpeed: v })} />
      <Slider label="Scanline Intensity" value={params.scanlineIntensity} min={0} max={1} step={0.01} decimals={2} onChange={(v) => set({ scanlineIntensity: v })} />

      {/* Mono */}
      <div style={sect}>
        <span style={sectLabel}>Mono</span>
        <Toggle on={params.monoEnabled} onChange={() => set({ monoEnabled: !params.monoEnabled })} />
      </div>
    </EffectLayout>
  );
}
