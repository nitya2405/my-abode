'use client';

import { useState, useRef, useEffect } from 'react';
import EffectLayout from '@/components/EffectLayout';
import {
  renderPixelate, PixelateParams, PixelateMode, BlockShape, AdaptiveMap, PaletteKey, PALETTES,
} from '@/lib/effects/pixelate';
import { C } from '@/lib/effects-data';

const mono: React.CSSProperties = { fontFamily: '"Courier New", monospace' };

// ── primitives ────────────────────────────────────────────────────────────────

function SectNum({ n, label }: { n: string; label: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', gap: 8,
      marginTop: 20, marginBottom: 10,
      paddingTop: 12, borderTop: '1px solid rgba(172,199,253,0.1)',
    }}>
      <span style={{ ...mono, fontSize: 9, color: C.textMuted }}>{n}</span>
      <span style={{ ...mono, fontSize: 9, color: C.textMuted }}>/</span>
      <span style={{ ...mono, fontSize: 10, color: C.primary, letterSpacing: '0.14em', fontWeight: 700, textTransform: 'uppercase' }}>{label}</span>
    </div>
  );
}

function SliderRow({
  label, value, min, max, step = 1, fmt, onChange, onReset,
}: {
  label: string; value: number; min: number; max: number; step?: number;
  fmt: (v: number) => string; onChange: (v: number) => void; onReset?: () => void;
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

function SegBtn<T extends string>({
  options, value, onChange,
}: { options: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div style={{ display: 'flex', gap: 3, marginBottom: 10 }}>
      {options.map(o => {
        const active = value === o.id;
        return (
          <button key={o.id} onClick={() => onChange(o.id)} style={{
            flex: 1, padding: '6px 4px', ...mono, fontSize: 9, letterSpacing: '0.08em',
            background: active ? 'rgba(172,199,253,0.12)' : C.surfaceHigh,
            color: active ? C.primary : C.textMuted,
            border: `1px solid ${active ? C.border : 'rgba(172,199,253,0.06)'}`,
            cursor: 'pointer',
          }}>{o.label}</button>
        );
      })}
    </div>
  );
}

// ── palette strip (gradient only, no labels) ──────────────────────────────────

const PALETTE_KEYS: PaletteKey[] = ['original','mono','gameboy','gbpocket','cga','pico8','sweetie16','c64','endesga32'];

function PaletteStrip({ id, active, onClick }: { id: PaletteKey; active: boolean; onClick: () => void }) {
  const hex = PALETTES[id].hex;
  return (
    <div onClick={onClick} style={{
      marginBottom: 3, cursor: 'pointer',
      paddingLeft: 6, paddingTop: 3, paddingBottom: 3,
      borderLeft: `2px solid ${active ? C.primary : 'transparent'}`,
      background: active ? 'rgba(172,199,253,0.05)' : 'transparent',
    }}>
      <div style={{ display: 'flex', height: 14 }}>
        {hex.length > 0
          ? hex.map((c, i) => <div key={i} style={{ flex: 1, background: c }} />)
          : <div style={{ flex: 1, background: 'linear-gradient(to right, #000, #555, #aaa, #fff)' }} />
        }
      </div>
    </div>
  );
}

// ── defaults ─────────────────────────────────────────────────────────────────

const DEFAULTS: PixelateParams = {
  mode: 'classic',
  blockSize: 8,
  gapColor: '#000000',
  shape: 'square',
  gap: 0,
  cellCount: 80,
  cellSeed: 0,
  edgeThickness: 1,
  edgeColor: '#000000',
  scatter: 0.5,
  scaleVariance: 0.2,
  depth: 2,
  topBright: 1.4,
  sideBright: 0.7,
  minBlock: 2,
  maxBlock: 24,
  mapBy: 'edge',
  invertMap: false,
  palette: 'original',
  paletteAmount: 1,
};

const MODES: { id: PixelateMode; label: string }[] = [
  { id: 'classic',     label: 'CLASSIC' },
  { id: 'crystallize', label: 'CRYSTAL' },
  { id: 'scatter',     label: 'SCATTER' },
  { id: 'isometric',   label: 'ISO' },
  { id: 'adaptive',    label: 'ADAPT' },
];

const SHAPES:  { id: BlockShape;  label: string }[] = [
  { id: 'square',  label: 'SQR' },
  { id: 'circle',  label: 'CIR' },
  { id: 'diamond', label: 'DIA' },
];

const MAP_MODES: { id: AdaptiveMap; label: string }[] = [
  { id: 'luminance',  label: 'LUM' },
  { id: 'edge',       label: 'EDGE' },
  { id: 'saturation', label: 'SAT' },
];

// ── page ─────────────────────────────────────────────────────────────────────

export default function PixelatePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [params, setParams] = useState<PixelateParams>(DEFAULTS);

  useEffect(() => {
    if (!imageData) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width  = imageData.width;
    canvas.height = imageData.height;
    canvas.getContext('2d')!.putImageData(renderPixelate(imageData, params), 0, 0);
  }, [imageData, params]);

  const set = (patch: Partial<PixelateParams>) => setParams(p => ({ ...p, ...patch }));
  const { mode } = params;

  return (
    <EffectLayout
      effectName="PIXELATE"
      description="Five mosaic modes — classic blocks, Voronoi crystal, scatter, isometric cubes, and adaptive detail."
      canvasRef={canvasRef}
      onImageLoad={setImageData}
      hasImage={!!imageData}
    >
      {/* 01 / MODE */}
      <SectNum n="01" label="MODE" />
      <SegBtn options={MODES} value={params.mode} onChange={v => set({ mode: v })} />

      {/* 02 / mode-specific settings */}
      {mode === 'classic' && (
        <>
          <SectNum n="02" label="CLASSIC" />
          <SliderRow label="Block Size" value={params.blockSize} min={1} max={48}
            fmt={v => `${v}px`} onReset={() => set({ blockSize: 8 })}
            onChange={v => set({ blockSize: v })} />
          <div style={{ ...mono, fontSize: 9, color: C.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Shape</div>
          <SegBtn options={SHAPES} value={params.shape} onChange={v => set({ shape: v })} />
          <SliderRow label="Gap" value={params.gap} min={0} max={6}
            fmt={v => `${v}px`} onReset={() => set({ gap: 0 })}
            onChange={v => set({ gap: v })} />
          <ColorSwatch label="Gap Color" value={params.gapColor} onChange={v => set({ gapColor: v })} />
        </>
      )}

      {mode === 'crystallize' && (
        <>
          <SectNum n="02" label="CRYSTALLIZE" />
          <SliderRow label="Cell Count" value={params.cellCount} min={10} max={300}
            fmt={v => String(v)} onReset={() => set({ cellCount: 80 })}
            onChange={v => set({ cellCount: v })} />
          <SliderRow label="Seed" value={params.cellSeed} min={0} max={99}
            fmt={v => String(v).padStart(2, '0')} onReset={() => set({ cellSeed: 0 })}
            onChange={v => set({ cellSeed: v })} />
          <SliderRow label="Edge Thickness" value={params.edgeThickness} min={0} max={4}
            fmt={v => v === 0 ? 'OFF' : `${v}px`} onReset={() => set({ edgeThickness: 1 })}
            onChange={v => set({ edgeThickness: v })} />
          {params.edgeThickness > 0 && (
            <ColorSwatch label="Edge Color" value={params.edgeColor} onChange={v => set({ edgeColor: v })} />
          )}
        </>
      )}

      {mode === 'scatter' && (
        <>
          <SectNum n="02" label="SCATTER" />
          <SliderRow label="Block Size" value={params.blockSize} min={2} max={48}
            fmt={v => `${v}px`} onReset={() => set({ blockSize: 8 })}
            onChange={v => set({ blockSize: v })} />
          <SliderRow label="Scatter" value={params.scatter} min={0} max={1} step={0.01}
            fmt={v => `${Math.round(v * 100)}%`} onReset={() => set({ scatter: 0.5 })}
            onChange={v => set({ scatter: v })} />
          <SliderRow label="Scale Variance" value={params.scaleVariance} min={0} max={0.5} step={0.01}
            fmt={v => `${Math.round(v * 100)}%`} onReset={() => set({ scaleVariance: 0.2 })}
            onChange={v => set({ scaleVariance: v })} />
          <ColorSwatch label="Gap Color" value={params.gapColor} onChange={v => set({ gapColor: v })} />
        </>
      )}

      {mode === 'isometric' && (
        <>
          <SectNum n="02" label="ISOMETRIC" />
          <SliderRow label="Block Size" value={params.blockSize} min={4} max={48}
            fmt={v => `${v}px`} onReset={() => set({ blockSize: 12 })}
            onChange={v => set({ blockSize: v })} />
          <SliderRow label="Depth" value={params.depth} min={1} max={8}
            fmt={v => `${v}px`} onReset={() => set({ depth: 2 })}
            onChange={v => set({ depth: v })} />
          <SliderRow label="Top Brightness" value={params.topBright} min={0.5} max={2} step={0.05}
            fmt={v => v.toFixed(2)} onReset={() => set({ topBright: 1.4 })}
            onChange={v => set({ topBright: v })} />
          <SliderRow label="Side Brightness" value={params.sideBright} min={0.3} max={1.5} step={0.05}
            fmt={v => v.toFixed(2)} onReset={() => set({ sideBright: 0.7 })}
            onChange={v => set({ sideBright: v })} />
          <ColorSwatch label="Gap Color" value={params.gapColor} onChange={v => set({ gapColor: v })} />
        </>
      )}

      {mode === 'adaptive' && (
        <>
          <SectNum n="02" label="ADAPTIVE" />
          <SliderRow label="Min Block" value={params.minBlock} min={1} max={16}
            fmt={v => `${v}px`} onReset={() => set({ minBlock: 2 })}
            onChange={v => set({ minBlock: v })} />
          <SliderRow label="Max Block" value={params.maxBlock} min={4} max={64}
            fmt={v => `${v}px`} onReset={() => set({ maxBlock: 24 })}
            onChange={v => set({ maxBlock: v })} />
          <div style={{ ...mono, fontSize: 9, color: C.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Map By</div>
          <SegBtn options={MAP_MODES} value={params.mapBy} onChange={v => set({ mapBy: v })} />
          <Toggle label="Invert Map" value={params.invertMap} onChange={v => set({ invertMap: v })} />
        </>
      )}

      {/* 03 / PALETTE */}
      <SectNum n="03" label="PALETTE" />
      <div style={{ marginBottom: 8 }}>
        {PALETTE_KEYS.map(k => (
          <PaletteStrip key={k} id={k} active={params.palette === k} onClick={() => set({ palette: k })} />
        ))}
      </div>
      <SliderRow
        label="Amount" value={params.paletteAmount} min={0} max={1} step={0.01}
        fmt={v => `${Math.round(v * 100)}%`} onReset={() => set({ paletteAmount: 1 })}
        onChange={v => set({ paletteAmount: v })}
      />

      <div style={{ height: 16 }} />
    </EffectLayout>
  );
}
