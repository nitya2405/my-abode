'use client';

import { useState, useRef, useEffect } from 'react';
import EffectLayout from '@/components/EffectLayout';
import { renderContour, ContourParams, FillMode, ColorMode } from '@/lib/effects/contour';
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

const FILL_MODES: { id: FillMode; label: string; sub: string }[] = [
  { id: 'filled', label: 'FILLED BANDS', sub: 'color regions separated by lines' },
  { id: 'lines',  label: 'LINES ONLY',   sub: 'black contours on white' },
];

const COLOR_MODES: { id: ColorMode; label: string; sub: string }[] = [
  { id: 'original',  label: 'ORIGINAL',  sub: 'preserve source hue, quantize brightness' },
  { id: 'grayscale', label: 'GRAYSCALE', sub: 'luminance bands only' },
];

const DEFAULTS: ContourParams = {
  fillMode: 'filled',
  levels: 8,
  lineThickness: 1,
  invert: false,
  brightness: 0,
  contrast: 0,
  colorMode: 'original',
};

export default function ContourPage() {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [params, setParams]       = useState<ContourParams>(DEFAULTS);

  const paramsRef = useRef(params);
  useEffect(() => { paramsRef.current = params; }, [params]);

  useEffect(() => {
    if (!imageData) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width  = imageData.width;
    canvas.height = imageData.height;
    canvas.getContext('2d')!.putImageData(renderContour(imageData, params), 0, 0);
  }, [imageData, params]);

  const set = (patch: Partial<ContourParams>) => setParams(p => ({ ...p, ...patch }));

  return (
    <EffectLayout
      effectName="CONTOUR"
      description="Luminance band detection with filled color regions or clean line extraction."
      canvasRef={canvasRef}
      onImageLoad={setImageData}
      hasImage={!!imageData}
    >
      {/* 01 / CONTOUR */}
      <SectNum n="01" label="CONTOUR" />

      <div style={{ ...mono, fontSize: 9, color: C.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
        Fill Mode
      </div>
      <ModeBtn options={FILL_MODES} value={params.fillMode} onChange={v => set({ fillMode: v })} />

      <SliderRow
        label="Levels" value={params.levels} min={2} max={24}
        fmt={v => String(v)}
        onChange={v => set({ levels: v })}
      />
      <SliderRow
        label="Line Thickness" value={params.lineThickness} min={1} max={6}
        fmt={v => `${v}px`}
        onChange={v => set({ lineThickness: v })}
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

      {/* 03 / COLOR — only relevant in filled mode */}
      {params.fillMode === 'filled' && (
        <>
          <SectNum n="03" label="COLOR" />
          <div style={{ ...mono, fontSize: 9, color: C.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
            Mode
          </div>
          <ModeBtn options={COLOR_MODES} value={params.colorMode} onChange={v => set({ colorMode: v })} />
        </>
      )}

      <div style={{ height: 16 }} />
    </EffectLayout>
  );
}
