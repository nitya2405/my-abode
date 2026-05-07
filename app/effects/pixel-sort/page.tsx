'use client';

import { useState, useRef, useEffect } from 'react';
import EffectLayout from '@/components/EffectLayout';
import { renderPixelSort, PixelSortParams, SortDirection, SortMode } from '@/lib/effects/pixel-sort';
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

const DIRECTIONS: { id: SortDirection; label: string; sub: string }[] = [
  { id: 'horizontal', label: 'HORIZONTAL', sub: 'sort along rows' },
  { id: 'vertical',   label: 'VERTICAL',   sub: 'sort along columns' },
];

const SORT_MODES: { id: SortMode; label: string; sub: string }[] = [
  { id: 'brightness', label: 'BRIGHTNESS', sub: 'sort by luminance value' },
  { id: 'hue',        label: 'HUE',        sub: 'sort by color hue angle' },
  { id: 'saturation', label: 'SATURATION', sub: 'sort by color purity' },
];

const DEFAULTS: PixelSortParams = {
  direction: 'horizontal',
  sortMode: 'brightness',
  threshold: 0.3,
  streakLength: 200,
  intensity: 1.0,
  randomness: 0.3,
  reverse: false,
  brightness: 0,
  contrast: 0,
};

export default function PixelSortPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [params, setParams] = useState<PixelSortParams>(DEFAULTS);

  useEffect(() => {
    if (!imageData) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width  = imageData.width;
    canvas.height = imageData.height;
    canvas.getContext('2d')!.putImageData(renderPixelSort(imageData, params), 0, 0);
  }, [imageData, params]);

  const set = (patch: Partial<PixelSortParams>) => setParams(p => ({ ...p, ...patch }));

  return (
    <EffectLayout
      effectName="PIXEL SORT"
      description="Interval-based pixel sorting. Sorts pixel spans above threshold by brightness, hue, or saturation."
      canvasRef={canvasRef}
      onImageLoad={setImageData}
      hasImage={!!imageData}
    >
      {/* 01 / DIRECTION */}
      <SectNum n="01" label="DIRECTION" />
      <ModeBtn options={DIRECTIONS} value={params.direction} onChange={v => set({ direction: v })} />

      {/* 02 / SORT MODE */}
      <SectNum n="02" label="SORT MODE" />
      <ModeBtn options={SORT_MODES} value={params.sortMode} onChange={v => set({ sortMode: v })} />

      {/* 03 / CONTROLS */}
      <SectNum n="03" label="CONTROLS" />
      <SliderRow
        label="Threshold" value={params.threshold} min={0} max={1} step={0.01}
        fmt={v => v.toFixed(2)} onReset={() => set({ threshold: 0.3 })}
        onChange={v => set({ threshold: v })}
      />
      <SliderRow
        label="Streak Length" value={params.streakLength} min={10} max={1000} step={10}
        fmt={v => String(v)} onReset={() => set({ streakLength: 200 })}
        onChange={v => set({ streakLength: v })}
      />
      <SliderRow
        label="Intensity" value={params.intensity} min={0} max={1} step={0.01}
        fmt={v => v.toFixed(2)} onReset={() => set({ intensity: 1 })}
        onChange={v => set({ intensity: v })}
      />
      <SliderRow
        label="Randomness" value={params.randomness} min={0} max={1} step={0.01}
        fmt={v => v.toFixed(2)} onReset={() => set({ randomness: 0.3 })}
        onChange={v => set({ randomness: v })}
      />
      <Toggle label="Reverse" value={params.reverse} onChange={v => set({ reverse: v })} />

      {/* 04 / ADJUSTMENTS */}
      <SectNum n="04" label="ADJUSTMENTS" />
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

      <div style={{ height: 16 }} />
    </EffectLayout>
  );
}
