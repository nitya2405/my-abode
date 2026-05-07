'use client';

import { useState, useRef, useEffect } from 'react';
import EffectLayout from '@/components/EffectLayout';
import { renderEdgeDetection, EdgeDetectionParams, EdgeAlgo, EdgeColorMode } from '@/lib/effects/edge-detection';
import { C } from '@/lib/effects-data';

const mono: React.CSSProperties = { fontFamily: '"Courier New", monospace' };

function SectNum({ n, label }: { n: string; label: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', gap: 8,
      marginTop: 20, marginBottom: 10,
      paddingTop: 12, borderTop: '1px solid rgba(172,199,253,0.1)',
    }}>
      <span style={{ ...mono, fontSize: 9, color: C.textMuted }}>{n}</span>
      <span style={{ ...mono, fontSize: 9, color: C.textMuted }}>/</span>
      <span style={{ ...mono, fontSize: 10, color: C.primary, letterSpacing: '0.14em', fontWeight: 700, textTransform: 'uppercase' }}>
        {label}
      </span>
    </div>
  );
}

function SliderRow({
  label, value, min, max, step = 1, fmt, onChange, onReset,
}: {
  label: string; value: number; min: number; max: number; step?: number;
  fmt: (v: number) => string;
  onChange: (v: number) => void;
  onReset?: () => void;
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
        <span style={{ ...mono, fontSize: 9, color: C.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ ...mono, fontSize: 10, color: C.primary }}>{fmt(value)}</span>
          {onReset && (
            <button onClick={onReset} style={{
              ...mono, fontSize: 8, color: C.textMuted, background: 'transparent',
              border: 'none', cursor: 'pointer', letterSpacing: '0.08em', padding: 0,
            }}>reset</button>
          )}
        </div>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(+e.target.value)}
        style={{ width: '100%', accentColor: C.primary }} />
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
      <span style={{ ...mono, fontSize: 10, color: C.textDim, letterSpacing: '0.06em' }}>{label}</span>
      <button onClick={() => onChange(!value)} style={{
        width: 36, height: 18, borderRadius: 9, border: 'none', cursor: 'pointer',
        background: value ? C.primary : C.surfaceHighest, position: 'relative', transition: 'background 0.15s',
      }}>
        <div style={{
          position: 'absolute', top: 3, left: value ? 19 : 3,
          width: 12, height: 12, borderRadius: '50%',
          background: value ? C.bg : C.textMuted, transition: 'left 0.15s',
        }} />
      </button>
    </div>
  );
}

function ColorSwatch({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
      <span style={{ ...mono, fontSize: 9, color: C.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ ...mono, fontSize: 10, color: C.textDim }}>{value.toUpperCase()}</span>
        <div
          onClick={() => ref.current?.click()}
          style={{ width: 20, height: 20, background: value, border: '1px solid rgba(172,199,253,0.2)', cursor: 'pointer' }}
        />
        <input ref={ref} type="color" value={value} onChange={e => onChange(e.target.value)}
          style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }} />
      </div>
    </div>
  );
}

function ModeBtn<T extends string>({
  options, value, onChange,
}: { options: { id: T; label: string; sub: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 10 }}>
      {options.map(o => {
        const active = value === o.id;
        return (
          <div key={o.id} onClick={() => onChange(o.id)} style={{
            padding: '7px 10px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8,
            background: active ? 'rgba(172,199,253,0.06)' : 'transparent',
            borderLeft: `2px solid ${active ? C.primary : 'transparent'}`,
          }}>
            <span style={{ ...mono, fontSize: 10, color: active ? C.primary : C.textMuted }}>{active ? '■' : '□'}</span>
            <div>
              <div style={{ ...mono, fontSize: 10, color: C.text, letterSpacing: '0.06em' }}>{o.label}</div>
              <div style={{ ...mono, fontSize: 8, color: C.textMuted, marginTop: 1 }}>{o.sub}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const ALGOS: { id: EdgeAlgo; label: string; sub: string }[] = [
  { id: 'sobel',     label: 'SOBEL',     sub: '3×3 gradient magnitude' },
  { id: 'prewitt',   label: 'PREWITT',   sub: '3×3 equal weight gradient' },
  { id: 'laplacian', label: 'LAPLACIAN', sub: 'second derivative edges' },
  { id: 'roberts',   label: 'ROBERTS',   sub: '2×2 cross gradient' },
];

const COLOR_MODES: { id: EdgeColorMode; label: string; sub: string }[] = [
  { id: 'mono',     label: 'MONO',     sub: 'edge and background colors' },
  { id: 'original', label: 'ORIGINAL', sub: 'edges from source image' },
];

const DEFAULTS: EdgeDetectionParams = {
  algorithm: 'sobel',
  threshold: 0.3,
  lineWidth: 1.0,
  invert: false,
  brightness: 0,
  contrast: 0,
  colorMode: 'mono',
  edgeColor: '#ffffff',
  bgColor: '#000000',
  brightnessMap: 0,
  edgeEnhance: 0,
  blur: 0,
  quantizeColors: 0,
  shapeMatching: 0,
  bloomEnabled: false,
  bloomThreshold: 0.5,
  bloomSoftThreshold: 0.5,
  bloomIntensity: 0.9,
  bloomRadius: 12,
  grain: false,
  grainAmount: 0.3,
  chromatic: false,
  chromaticAmount: 4,
  scanlines: false,
  scanlinesOpacity: 0.5,
  vignetteEnabled: false,
  vignetteIntensity: 0.3,
  vignetteRadius: 0.6,
  crtCurve: false,
  phosphor: false,
};

export default function EdgeDetectionPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [params, setParams] = useState<EdgeDetectionParams>(DEFAULTS);

  useEffect(() => {
    if (!imageData) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width  = imageData.width;
    canvas.height = imageData.height;
    canvas.getContext('2d')!.putImageData(renderEdgeDetection(imageData, params), 0, 0);
  }, [imageData, params]);

  const set = (patch: Partial<EdgeDetectionParams>) => setParams(p => ({ ...p, ...patch }));

  return (
    <EffectLayout
      effectName="EDGE DETECT"
      description="Multi-algorithm edge detection with bloom, chromatic aberration, vignette, CRT curve, and phosphor post-processing."
      canvasRef={canvasRef}
      onImageLoad={setImageData}
      hasImage={!!imageData}
    >
      {/* 01 / ALGORITHM */}
      <SectNum n="01" label="ALGORITHM" />
      <ModeBtn options={ALGOS} value={params.algorithm} onChange={v => set({ algorithm: v })} />

      <SliderRow
        label="Threshold" value={params.threshold} min={0} max={1} step={0.01}
        fmt={v => v.toFixed(2)} onReset={() => set({ threshold: 0.3 })}
        onChange={v => set({ threshold: v })}
      />
      <SliderRow
        label="Line Width" value={params.lineWidth} min={0.5} max={5} step={0.5}
        fmt={v => v.toFixed(1)} onReset={() => set({ lineWidth: 1 })}
        onChange={v => set({ lineWidth: v })}
      />
      <Toggle label="Invert" value={params.invert} onChange={v => set({ invert: v })} />

      {/* 02 / ADJUSTMENTS */}
      <SectNum n="02" label="ADJUSTMENTS" />
      <SliderRow
        label="Brightness" value={params.brightness} min={-100} max={100}
        fmt={v => String(v)} onReset={() => set({ brightness: 0 })}
        onChange={v => set({ brightness: v })}
      />
      <SliderRow
        label="Contrast" value={params.contrast} min={-100} max={100}
        fmt={v => String(v)} onReset={() => set({ contrast: 0 })}
        onChange={v => set({ contrast: v })}
      />

      {/* 03 / COLOR */}
      <SectNum n="03" label="COLOR" />
      <div style={{ ...mono, fontSize: 9, color: C.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Mode</div>
      <ModeBtn options={COLOR_MODES} value={params.colorMode} onChange={v => set({ colorMode: v })} />
      {params.colorMode === 'mono' && (
        <>
          <ColorSwatch label="Edge Color" value={params.edgeColor} onChange={v => set({ edgeColor: v })} />
          <ColorSwatch label="Background" value={params.bgColor} onChange={v => set({ bgColor: v })} />
        </>
      )}

      {/* 04 / PROCESSING */}
      <SectNum n="04" label="PROCESSING" />
      <SliderRow
        label="Brightness Map" value={params.brightnessMap} min={0} max={2} step={0.05}
        fmt={v => v.toFixed(2)} onReset={() => set({ brightnessMap: 0 })}
        onChange={v => set({ brightnessMap: v })}
      />
      <SliderRow
        label="Edge Enhance" value={params.edgeEnhance} min={0} max={5} step={0.1}
        fmt={v => v.toFixed(1)} onReset={() => set({ edgeEnhance: 0 })}
        onChange={v => set({ edgeEnhance: v })}
      />
      <SliderRow
        label="Blur" value={params.blur} min={0} max={5} step={0.5}
        fmt={v => v.toFixed(1)} onReset={() => set({ blur: 0 })}
        onChange={v => set({ blur: v })}
      />
      <SliderRow
        label="Quantize Colors" value={params.quantizeColors} min={0} max={16} step={1}
        fmt={v => v === 0 ? 'OFF' : String(v)} onReset={() => set({ quantizeColors: 0 })}
        onChange={v => set({ quantizeColors: v })}
      />
      <SliderRow
        label="Shape Matching" value={params.shapeMatching} min={0} max={5} step={1}
        fmt={v => v === 0 ? 'OFF' : String(v)} onReset={() => set({ shapeMatching: 0 })}
        onChange={v => set({ shapeMatching: v })}
      />

      {/* 05 / BLOOM */}
      <SectNum n="05" label="BLOOM" />
      <Toggle label="Enabled" value={params.bloomEnabled} onChange={v => set({ bloomEnabled: v })} />
      {params.bloomEnabled && (
        <>
          <SliderRow
            label="Threshold" value={params.bloomThreshold} min={0} max={1} step={0.01}
            fmt={v => v.toFixed(2)} onReset={() => set({ bloomThreshold: 0.5 })}
            onChange={v => set({ bloomThreshold: v })}
          />
          <SliderRow
            label="Soft Threshold" value={params.bloomSoftThreshold} min={0.01} max={1} step={0.01}
            fmt={v => v.toFixed(2)} onReset={() => set({ bloomSoftThreshold: 0.5 })}
            onChange={v => set({ bloomSoftThreshold: v })}
          />
          <SliderRow
            label="Intensity" value={params.bloomIntensity} min={0} max={2} step={0.05}
            fmt={v => v.toFixed(2)} onReset={() => set({ bloomIntensity: 0.9 })}
            onChange={v => set({ bloomIntensity: v })}
          />
          <SliderRow
            label="Radius" value={params.bloomRadius} min={1} max={30} step={1}
            fmt={v => `${v}px`} onReset={() => set({ bloomRadius: 12 })}
            onChange={v => set({ bloomRadius: v })}
          />
        </>
      )}

      {/* 06 / POST-PROCESSING */}
      <SectNum n="06" label="POST-PROCESSING" />

      <Toggle label="Grain" value={params.grain} onChange={v => set({ grain: v })} />
      {params.grain && (
        <SliderRow
          label="Grain Amount" value={params.grainAmount} min={0} max={1} step={0.01}
          fmt={v => v.toFixed(2)} onReset={() => set({ grainAmount: 0.3 })}
          onChange={v => set({ grainAmount: v })}
        />
      )}

      <Toggle label="Chromatic" value={params.chromatic} onChange={v => set({ chromatic: v })} />
      {params.chromatic && (
        <SliderRow
          label="Shift Amount" value={params.chromaticAmount} min={0} max={20} step={1}
          fmt={v => `${v}px`} onReset={() => set({ chromaticAmount: 4 })}
          onChange={v => set({ chromaticAmount: v })}
        />
      )}

      <Toggle label="Scanlines" value={params.scanlines} onChange={v => set({ scanlines: v })} />
      {params.scanlines && (
        <SliderRow
          label="Opacity" value={params.scanlinesOpacity} min={0} max={1} step={0.05}
          fmt={v => v.toFixed(2)} onReset={() => set({ scanlinesOpacity: 0.5 })}
          onChange={v => set({ scanlinesOpacity: v })}
        />
      )}

      <Toggle label="Vignette" value={params.vignetteEnabled} onChange={v => set({ vignetteEnabled: v })} />
      {params.vignetteEnabled && (
        <>
          <SliderRow
            label="Intensity" value={params.vignetteIntensity} min={0} max={1} step={0.01}
            fmt={v => v.toFixed(2)} onReset={() => set({ vignetteIntensity: 0.3 })}
            onChange={v => set({ vignetteIntensity: v })}
          />
          <SliderRow
            label="Radius" value={params.vignetteRadius} min={0.1} max={1} step={0.01}
            fmt={v => v.toFixed(2)} onReset={() => set({ vignetteRadius: 0.6 })}
            onChange={v => set({ vignetteRadius: v })}
          />
        </>
      )}

      <Toggle label="CRT Curve" value={params.crtCurve} onChange={v => set({ crtCurve: v })} />
      <Toggle label="Phosphor" value={params.phosphor} onChange={v => set({ phosphor: v })} />

      <div style={{ height: 16 }} />
    </EffectLayout>
  );
}
