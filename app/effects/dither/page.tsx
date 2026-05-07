'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import EffectLayout from '@/components/EffectLayout';
import { renderDither, DitherParams, DitherAlgo, ALGO_META } from '@/lib/effects/dither';
import { C } from '@/lib/effects-data';

const mono: React.CSSProperties = { fontFamily: '"Courier New", monospace' };

// ── Small UI primitives ───────────────────────────────────────────────────────

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
  label, value, min, max, step = 1, fmt,
  onChange, onReset,
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
      <button
        onClick={() => onChange(!value)}
        style={{
          width: 36, height: 18, borderRadius: 9, border: 'none', cursor: 'pointer',
          background: value ? C.primary : C.surfaceHighest,
          position: 'relative', transition: 'background 0.15s',
        }}
      >
        <div style={{
          position: 'absolute', top: 3, left: value ? 19 : 3,
          width: 12, height: 12, borderRadius: '50%',
          background: value ? C.bg : C.textMuted,
          transition: 'left 0.15s',
        }} />
      </button>
    </div>
  );
}

function ColorSwatch({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
      <span style={{ ...mono, fontSize: 9, color: C.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ ...mono, fontSize: 10, color: C.textDim }}>{value.toUpperCase()}</span>
        <div style={{ position: 'relative', width: 20, height: 20 }}>
          <div style={{ width: 20, height: 20, background: value, border: '1px solid rgba(172,199,253,0.2)' }} />
          <input type="color" value={value} onChange={e => onChange(e.target.value)}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', border: 'none', padding: 0 }} />
        </div>
      </div>
    </div>
  );
}

// ── Algorithm list ────────────────────────────────────────────────────────────

const ERROR_DIFFUSION: DitherAlgo[] = ['floyd', 'atkinson', 'jarvis', 'stucki', 'burkes', 'sierra', 'sierra2', 'sierral'];
const ORDERED: DitherAlgo[] = ['bayer2', 'bayer4', 'bayer8', 'bayer16', 'clustered', 'bluenoise', 'ign', 'crosshatch'];

// ── Page ──────────────────────────────────────────────────────────────────────

const DEFAULTS: DitherParams = {
  algorithm: 'bayer8',
  intensity: 1.0,
  modulation: 0,
  brightness: 0,
  contrast: 0,
  gamma: 1.0,
  sharpen: 0,
  foreground: '#ffffff',
  background: '#000000',
  chromatic: false,
  maxDisplace: 6,
  redChannel: 23,
  greenChannel: 50,
  blueChannel: 80,
};

export default function DitherPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [params, setParams] = useState<DitherParams>(DEFAULTS);
  const paramsRef = useRef(params);
  useEffect(() => { paramsRef.current = params; }, [params]);

  const render = useCallback((img: ImageData, p: DitherParams) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = img.width;
    canvas.height = img.height;
    canvas.getContext('2d')!.putImageData(renderDither(img, p), 0, 0);
  }, []);

  useEffect(() => {
    if (imageData) render(imageData, params);
  }, [imageData, params, render]);

  const set = (patch: Partial<DitherParams>) => setParams(p => ({ ...p, ...patch }));

  return (
    <EffectLayout
      effectName="DITHER"
      description="16-algorithm dithering engine — error diffusion and ordered with full tone and chromatic control."
      canvasRef={canvasRef}
      onImageLoad={setImageData}
      hasImage={!!imageData}
    >
      {/* 01 / ALGORITHM */}
      <SectNum n="01" label="ALGORITHM" />
      <div style={{ position: 'relative', marginBottom: 4 }}>
        <select
          value={params.algorithm}
          onChange={e => set({ algorithm: e.target.value as DitherAlgo })}
          style={{
            width: '100%', background: C.surfaceHigh, color: C.text,
            border: '1px solid rgba(172,199,253,0.15)', padding: '8px 28px 8px 10px',
            fontFamily: '"Courier New", monospace', fontSize: 11, letterSpacing: '0.05em',
            cursor: 'pointer', outline: 'none', appearance: 'none' as const,
          }}
        >
          <optgroup label="Error Diffusion">
            {ERROR_DIFFUSION.map(a => <option key={a} value={a}>{ALGO_META[a].label}</option>)}
          </optgroup>
          <optgroup label="Ordered">
            {ORDERED.map(a => <option key={a} value={a}>{ALGO_META[a].label}</option>)}
          </optgroup>
        </select>
        <span style={{
          position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
          color: C.textMuted, pointerEvents: 'none', fontSize: 9,
        }}>▾</span>
      </div>
      <div style={{ ...mono, fontSize: 8, color: C.textMuted, marginBottom: 10, paddingLeft: 2 }}>
        {ALGO_META[params.algorithm].sub}
      </div>

      {/* 02 / DITHERING */}
      <SectNum n="02" label="DITHERING" />
      <SliderRow label="Intensity" value={params.intensity} min={0} max={2} step={0.05}
        fmt={v => v.toFixed(2)} onReset={() => set({ intensity: 1 })}
        onChange={v => set({ intensity: v })} />
      <SliderRow label="Modulation" value={params.modulation} min={-1} max={1} step={0.05}
        fmt={v => v.toFixed(2)} onReset={() => set({ modulation: 0 })}
        onChange={v => set({ modulation: v })} />

      {/* 03 / ADJUSTMENTS */}
      <SectNum n="03" label="ADJUSTMENTS" />
      <SliderRow label="Brightness" value={params.brightness} min={-100} max={100} step={1}
        fmt={v => String(v)} onReset={() => set({ brightness: 0 })}
        onChange={v => set({ brightness: v })} />
      <SliderRow label="Contrast" value={params.contrast} min={-100} max={100} step={1}
        fmt={v => String(v)} onReset={() => set({ contrast: 0 })}
        onChange={v => set({ contrast: v })} />
      <SliderRow label="Gamma" value={params.gamma} min={0.1} max={3} step={0.05}
        fmt={v => v.toFixed(2)} onReset={() => set({ gamma: 1 })}
        onChange={v => set({ gamma: v })} />
      <SliderRow label="Sharpen" value={params.sharpen} min={0} max={5} step={0.1}
        fmt={v => v.toFixed(1)} onReset={() => set({ sharpen: 0 })}
        onChange={v => set({ sharpen: v })} />

      {/* 04 / COLOR */}
      <SectNum n="04" label="COLOR" />
      <ColorSwatch label="Foreground" value={params.foreground} onChange={v => set({ foreground: v })} />
      <ColorSwatch label="Background" value={params.background} onChange={v => set({ background: v })} />

      {/* 05 / CHROMATIC */}
      <SectNum n="05" label="CHROMATIC EFFECTS" />
      <Toggle label="Enabled" value={params.chromatic} onChange={v => set({ chromatic: v })} />
      {params.chromatic && (
        <>
          <SliderRow label="Max Displace" value={params.maxDisplace} min={0} max={20} step={1}
            fmt={v => `${v}px`} onChange={v => set({ maxDisplace: v })} />
          <SliderRow label="Red Channel" value={params.redChannel} min={0} max={100} step={1}
            fmt={v => String(v)} onChange={v => set({ redChannel: v })} />
          <SliderRow label="Green Channel" value={params.greenChannel} min={0} max={100} step={1}
            fmt={v => String(v)} onChange={v => set({ greenChannel: v })} />
          <SliderRow label="Blue Channel" value={params.blueChannel} min={0} max={100} step={1}
            fmt={v => String(v)} onChange={v => set({ blueChannel: v })} />
          <button onClick={() => set({ redChannel: 23, greenChannel: 50, blueChannel: 80 })} style={{
            ...mono, width: '100%', padding: '6px 0', fontSize: 9, letterSpacing: '0.1em',
            background: C.surfaceHigh, color: C.textMuted,
            border: '1px solid rgba(172,199,253,0.06)', cursor: 'pointer', marginBottom: 8,
          }}>
            RESET CHANNELS
          </button>
        </>
      )}

      <div style={{ height: 16 }} />
    </EffectLayout>
  );
}
