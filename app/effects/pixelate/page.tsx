'use client';

import { useState, useRef, useEffect } from 'react';
import EffectLayout from '@/components/EffectLayout';
import {
  renderPixelate, PixelateParams, PaletteKey, DitherType,
  PALETTES, DITHER_OPTIONS,
} from '@/lib/effects/pixelate';
import { C } from '@/lib/effects-data';

const mono: React.CSSProperties = { fontFamily: '"Courier New", monospace' };

function SectNum({ n, label, sub }: { n: string; label: string; sub?: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 20, marginBottom: 10,
      paddingTop: 12, borderTop: `1px solid rgba(172,199,253,0.1)`,
    }}>
      <span style={{ ...mono, fontSize: 9, color: C.textMuted, letterSpacing: '0.1em' }}>{n}</span>
      <span style={{ ...mono, fontSize: 9, color: C.textMuted }}>/</span>
      <span style={{ ...mono, fontSize: 10, color: C.primary, letterSpacing: '0.14em', fontWeight: 700, textTransform: 'uppercase' }}>{label}</span>
      {sub && <span style={{ ...mono, fontSize: 9, color: C.textMuted, letterSpacing: '0.08em' }}>{sub}</span>}
    </div>
  );
}

function SliderField({
  label, value, min, max, step = 1, display,
  onChange,
}: {
  label: string; value: number; min: number; max: number; step?: number;
  display: string; onChange: (v: number) => void;
}) {
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
        <span style={{ ...mono, fontSize: 9, color: C.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</span>
        <span style={{ ...mono, fontSize: 10, color: C.primary, letterSpacing: '0.06em' }}>{display}</span>
      </div>
      <div style={{ position: 'relative', marginBottom: 8 }}>
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(+e.target.value)}
          style={{ width: '100%', accentColor: C.primary }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
          <span style={{ ...mono, fontSize: 8, color: C.textMuted }}>{String(min).padStart(3, '0')}</span>
          <span style={{ ...mono, fontSize: 8, color: C.textMuted }}>{String(max).padStart(3, '0')}</span>
        </div>
      </div>
    </>
  );
}

function AmountField({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
        <span style={{ ...mono, fontSize: 9, color: C.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>AMOUNT</span>
        <span style={{ ...mono, fontSize: 10, color: C.primary }}>[ {Math.round(value * 100)}% ]</span>
      </div>
      <input type="range" min={0} max={1} step={0.01} value={value}
        onChange={e => onChange(+e.target.value)}
        style={{ width: '100%', accentColor: C.primary, marginBottom: 6 }} />
      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
        {([['OFF', 0], ['FULL', 1]] as [string, number][]).map(([lbl, v]) => (
          <button key={lbl} onClick={() => onChange(v)} style={{
            flex: 1, padding: '4px 0', ...mono, fontSize: 9, letterSpacing: '0.1em',
            background: value === v ? 'rgba(172,199,253,0.12)' : C.surfaceHigh,
            color: value === v ? C.primary : C.textMuted,
            border: `1px solid ${value === v ? C.border : 'rgba(172,199,253,0.06)'}`,
            cursor: 'pointer',
          }}>{lbl}</button>
        ))}
      </div>
    </>
  );
}

function PaletteRow({ id, active, onClick }: { id: PaletteKey; active: boolean; onClick: () => void }) {
  const p = PALETTES[id];
  return (
    <div onClick={onClick} style={{
      padding: '8px 10px 6px', cursor: 'pointer', marginBottom: 2,
      background: active ? 'rgba(172,199,253,0.06)' : 'transparent',
      borderLeft: `2px solid ${active ? C.primary : 'transparent'}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ ...mono, fontSize: 11, color: active ? C.primary : C.textMuted, lineHeight: 1 }}>
          {active ? '■' : '□'}
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ ...mono, fontSize: 10, color: C.text, letterSpacing: '0.08em' }}>{p.label}</div>
          <div style={{ ...mono, fontSize: 9, color: C.textMuted, marginTop: 1 }}>{p.sub}</div>
        </div>
        {p.colors > 0 && (
          <span style={{ ...mono, fontSize: 9, color: C.textMuted }}>
            {String(p.colors).padStart(2, '0')}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', marginTop: 5, height: 5, gap: 1 }}>
        {p.hex.length > 0
          ? p.hex.map((c, i) => <div key={i} style={{ flex: 1, background: c }} />)
          : <div style={{ ...mono, fontSize: 8, color: C.textMuted, letterSpacing: '0.1em' }}>────</div>
        }
      </div>
    </div>
  );
}

function DitherRow({ id, active, onClick }: { id: DitherType; active: boolean; onClick: () => void }) {
  const d = DITHER_OPTIONS[id];
  return (
    <div onClick={onClick} style={{
      padding: '7px 10px', cursor: 'pointer', marginBottom: 2,
      display: 'flex', alignItems: 'center', gap: 8,
      background: active ? 'rgba(172,199,253,0.06)' : 'transparent',
      borderLeft: `2px solid ${active ? C.primary : 'transparent'}`,
    }}>
      <span style={{ ...mono, fontSize: 11, color: active ? C.primary : C.textMuted, lineHeight: 1 }}>
        {active ? '■' : '□'}
      </span>
      <div style={{ flex: 1 }}>
        <div style={{ ...mono, fontSize: 10, color: C.text, letterSpacing: '0.08em' }}>{d.label}</div>
        <div style={{ ...mono, fontSize: 9, color: C.textMuted, marginTop: 1 }}>{d.sub}</div>
      </div>
    </div>
  );
}

export default function PixelatePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [params, setParams] = useState<PixelateParams>({
    blockSize: 8,
    pixelAmount: 1,
    palette: 'original',
    paletteAmount: 1,
    dither: 'none',
  });

  const paramsRef = useRef(params);
  useEffect(() => { paramsRef.current = params; }, [params]);

  useEffect(() => {
    if (!imageData) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    canvas.getContext('2d')!.putImageData(renderPixelate(imageData, params), 0, 0);
  }, [imageData, params]);

  const set = (patch: Partial<PixelateParams>) => setParams(p => ({ ...p, ...patch }));

  const paletteKeys = Object.keys(PALETTES) as PaletteKey[];
  const ditherKeys = Object.keys(DITHER_OPTIONS) as DitherType[];

  return (
    <EffectLayout
      effectName="PIXELATE"
      description="Mosaic pixel art — block averaging, palette quantization, and dithering."
      canvasRef={canvasRef}
      onImageLoad={setImageData}
      hasImage={!!imageData}
    >
      {/* 02 / PIXEL */}
      <SectNum n="02" label="PIXEL" />
      <SliderField
        label="BLOCK SIZE"
        value={params.blockSize}
        min={1} max={48}
        display={`[ ${String(params.blockSize).padStart(3, '0')} ]`}
        onChange={v => set({ blockSize: v })}
      />
      <AmountField value={params.pixelAmount} onChange={v => set({ pixelAmount: v })} />

      {/* 03 / PALETTE */}
      <SectNum n="03" label="PALETTE" sub={`${paletteKeys.length} PRESETS`} />
      <div style={{ marginBottom: 10 }}>
        {paletteKeys.map(k => (
          <PaletteRow key={k} id={k} active={params.palette === k} onClick={() => set({ palette: k })} />
        ))}
      </div>
      <AmountField value={params.paletteAmount} onChange={v => set({ paletteAmount: v })} />

      {/* 04 / DITHER */}
      <SectNum n="04" label="DITHER" />
      <div style={{ marginBottom: 16 }}>
        {ditherKeys.map(k => (
          <DitherRow key={k} id={k} active={params.dither === k} onClick={() => set({ dither: k })} />
        ))}
      </div>
    </EffectLayout>
  );
}
