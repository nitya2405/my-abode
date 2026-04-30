'use client';

import { useState, useRef, useEffect } from 'react';
import EffectLayout from '@/components/EffectLayout';
import { detectBlobs, renderImageTrack, ImageTrackParams, Blob } from '@/lib/effects/image-track';
import { C } from '@/lib/effects-data';

// ── palette ──────────────────────────────────────────────────────────────────
const TRACKER_COLORS = [
  '#ffffff', '#000000', '#00d4ff', '#00e676', '#00c853',
  '#64dd17', '#ffd600', '#ff6d00', '#f44336', '#e91e63',
  '#ce93d8', '#7b1fa2', '#3f51b5', '#1565c0', '#0288d1',
  '#006064', '#1b5e20', '#827717', '#bf360c', '#4e342e',
  '#546e7a', '#212121',
];

const BASIC_STYLES  = ['Basic', 'Cross', 'Label', 'Frame', 'L-Frame', 'X-Frame', 'Grid', 'Particle', 'Dash', 'Scope', 'Win2K', 'Label 2'];
const FILTER_STYLES = ['Inv', 'Glitch', 'Thermal', 'Pixel', 'Tone', 'Blur', 'Dither', 'Zoom', 'X-Ray', 'Water', 'Mask', 'CRT', 'Edge'];
const FILTER_KEYS   = ['inv', 'glitch', 'thermal', 'pixel', 'tone', 'blur', 'dither', 'zoom', 'xray', 'water', 'mask', 'crt', 'edge'];
const BASIC_KEYS    = ['basic', 'cross', 'label', 'frame', 'l-frame', 'x-frame', 'grid', 'particle', 'dash', 'scope', 'win2k', 'label2'];
const CONN_RATES    = [0, 0.25, 0.5, 0.75, 1, 2];
const BOUND_SIZES   = [0, 32, 64, 128, 256, 512];
const BLOB_COUNTS   = [16, 32, 64, 128, 256, 512];
const FONT_SIZES    = [10, 12, 16, 18, 20];
const LINE_STYLES: { key: ImageTrackParams['lineStyle']; icon: string }[] = [
  { key: 'straight', icon: '╱' },
  { key: 'curved',   icon: '∫' },
  { key: 'zigzag',   icon: '⌇' },
  { key: 'pulse',    icon: '∿' },
];

// ── style tokens ──────────────────────────────────────────────────────────────
const sect: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '10px 0 6px', borderTop: `1px solid ${C.border}`, marginTop: 4,
};
const sectLabel: React.CSSProperties = {
  fontSize: 11, color: C.textDim, fontFamily: '"Courier New", monospace',
  letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700,
};
const subHdr: React.CSSProperties = {
  fontSize: 10, color: C.textMuted, fontFamily: '"Courier New", monospace',
  letterSpacing: '0.08em', textTransform: 'uppercase', margin: '8px 0 4px',
};
const btnBase = (active: boolean): React.CSSProperties => ({
  padding: '6px 4px', fontSize: 11, border: `1px solid ${active ? C.primary : C.border}`,
  borderRadius: 0, background: active ? C.primary : C.surfaceHigh, color: active ? C.bg : C.textDim,
  fontFamily: '"Courier New", monospace', cursor: 'pointer', fontWeight: 600, letterSpacing: '0.04em',
  transition: 'all 0.1s',
});

// ── sub-components ────────────────────────────────────────────────────────────
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }} onClick={() => onChange(!value)}>
      <div style={{
        width: 34, height: 19, border: `1px solid ${C.border}`,
        background: value ? C.green : C.surfaceHigh, position: 'relative', flexShrink: 0,
      }}>
        <div style={{
          position: 'absolute', top: 3, left: value ? 16 : 3, width: 11, height: 11,
          background: value ? C.bg : C.textDim, transition: 'left 0.18s',
        }} />
      </div>
    </div>
  );
}

function ToggleLabel({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }} onClick={() => onChange(!value)}>
      <Toggle value={value} onChange={onChange} />
      <span style={{ fontSize: 11, color: value ? C.primary : C.textDim, fontFamily: '"Courier New", monospace' }}>{label}</span>
    </div>
  );
}

function BtnGrid3<T extends string>({ items, keys, value, onChange }: {
  items: string[]; keys: T[]; value: T; onChange: (v: T) => void;
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, marginBottom: 4 }}>
      {items.map((label, i) => (
        <button key={keys[i]} onClick={() => onChange(keys[i])} style={btnBase(value === keys[i])}>
          {label}
        </button>
      ))}
    </div>
  );
}

function PresetRow<T extends number>({ options, value, onChange, fmt }: {
  options: T[]; value: T; onChange: (v: T) => void; fmt?: (v: T) => string;
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${options.length}, 1fr)`, gap: 4, marginBottom: 6 }}>
      {options.map(opt => (
        <button key={opt} onClick={() => onChange(opt)} style={btnBase(value === opt)}>
          {fmt ? fmt(opt) : String(opt)}
        </button>
      ))}
    </div>
  );
}

// ── defaults ──────────────────────────────────────────────────────────────────
const DEFAULT_PARAMS: ImageTrackParams = {
  shape: 'circle',
  regionStyle: 'basic',
  filterEffect: 'none',
  invert: false,
  fusion: false,
  blobCount: 32,
  blobCountMode: 'by-size',
  threshold: 140,
  minSize: 200,
  strokeWidth: 1,
  boundingSize: 128,
  sameSize: false,
  connectionRate: 0.5,
  lineStyle: 'straight',
  dashed: true,
  dashSize: 5,
  gapSize: 5,
  centerHub: false,
  singleTracking: false,
  blink: false,
  showText: false,
  textPosition: 'center',
  textContent: 'random',
  fontSize: 12,
  trackerColor: '#ffffff',
  crazyMode: false,
};

// ── page ──────────────────────────────────────────────────────────────────────
export default function ImageTrackPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const blobsRef = useRef<Blob[]>([]);
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [params, setParams] = useState<ImageTrackParams>(DEFAULT_PARAMS);

  useEffect(() => {
    if (!imageData) return;
    blobsRef.current = detectBlobs(imageData, params);
  }, [imageData, params.threshold, params.blobCount, params.minSize]);

  useEffect(() => {
    if (!imageData) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const tick = (ts: number) => {
      const frame = renderImageTrack(imageData, blobsRef.current, params, ts);
      canvasRef.current?.getContext('2d')!.putImageData(frame, 0, 0);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [imageData, params]);

  const set = (patch: Partial<ImageTrackParams>) => setParams((p) => ({ ...p, ...patch }));

  return (
    <EffectLayout
      effectName="IMAGETRACK"
      description="Detects blobs and draws tracker overlays with connections, filters, and color effects."
      canvasRef={canvasRef}
      onImageLoad={setImageData}
      animated
      hasImage={!!imageData}
    >
      <div style={{ height: 10 }} />

      <div style={{ ...sect, borderTop: 'none', paddingTop: 0 }}>
        <span style={sectLabel}>Shape</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, marginBottom: 8 }}>
        {[
          { key: 'rect' as const,   icon: '□' },
          { key: 'circle' as const, icon: '○' },
          { key: 'pill' as const,   icon: '⬜' },
        ].map(({ key, icon }) => (
          <button key={key} onClick={() => set({ shape: key })} style={{ ...btnBase(params.shape === key), fontSize: 16 }}>
            {icon}
          </button>
        ))}
      </div>

      <div style={sect}>
        <span style={sectLabel}>Region Style</span>
      </div>
      <div style={subHdr}>Basic Effects</div>
      <BtnGrid3
        items={BASIC_STYLES} keys={BASIC_KEYS as ImageTrackParams['regionStyle'][]}
        value={params.regionStyle} onChange={(v) => set({ regionStyle: v })}
      />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '8px 0 4px' }}>
        <span style={subHdr}>Filter Effects</span>
        <ToggleLabel label="Invert" value={params.invert} onChange={(v) => set({ invert: v })} />
      </div>
      <BtnGrid3
        items={FILTER_STYLES} keys={FILTER_KEYS as ImageTrackParams['filterEffect'][]}
        value={params.filterEffect} onChange={(v) => set({ filterEffect: v })}
      />

      <div style={sect}>
        <span style={sectLabel}>Connection</span>
        <ToggleLabel label="Center Hub" value={params.centerHub} onChange={(v) => set({ centerHub: v })} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 10, color: C.textDim, fontFamily: '"Courier New", monospace', letterSpacing: '0.06em' }}>Line Style</span>
        <ToggleLabel label="Dashed" value={params.dashed} onChange={(v) => set({ dashed: v })} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, marginBottom: 8 }}>
        {LINE_STYLES.map(({ key, icon }) => (
          <button key={key} onClick={() => set({ lineStyle: key })} style={{ ...btnBase(params.lineStyle === key), fontSize: 16 }}>
            {icon}
          </button>
        ))}
      </div>

      <span style={{ fontSize: 10, color: C.textDim, fontFamily: '"Courier New", monospace', letterSpacing: '0.06em' }}>Connection Rate</span>
      <div style={{ height: 4 }} />
      <PresetRow options={CONN_RATES} value={params.connectionRate as typeof CONN_RATES[number]}
        onChange={(v) => set({ connectionRate: v })} fmt={(v) => String(v)} />

      {params.dashed && (<>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ fontSize: 10, color: C.textDim, fontFamily: '"Courier New", monospace' }}>Dash Size</span>
          <span style={{ fontSize: 10, color: C.primary, fontFamily: '"Courier New", monospace' }}>{params.dashSize}px</span>
        </div>
        <input type="range" min={1} max={20} value={params.dashSize}
          onChange={(e) => set({ dashSize: +e.target.value })}
          style={{ width: '100%', marginBottom: 8, accentColor: C.green }} />
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 10, color: C.textDim, fontFamily: '"Courier New", monospace' }}>Gap Size</span>
          <span style={{ fontSize: 10, color: C.primary, fontFamily: '"Courier New", monospace' }}>{params.gapSize}px</span>
        </div>
        <input type="range" min={1} max={20} value={params.gapSize}
          onChange={(e) => set({ gapSize: +e.target.value })}
          style={{ width: '100%', marginBottom: 8, accentColor: C.green }} />
      </>)}

      <div style={sect}>
        <span style={sectLabel}>Bounding Size</span>
        <ToggleLabel label="Same Size" value={params.sameSize} onChange={(v) => set({ sameSize: v })} />
      </div>
      <PresetRow options={BOUND_SIZES} value={params.boundingSize as typeof BOUND_SIZES[number]}
        onChange={(v) => set({ boundingSize: v })} />

      <div style={sect}>
        <span style={sectLabel}>Blob Count</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 6 }}>
        {(['by-size', 'by-count'] as const).map((m) => (
          <button key={m} onClick={() => set({ blobCountMode: m })} style={btnBase(params.blobCountMode === m)}>
            {m === 'by-size' ? 'By Size' : 'By Count'}
          </button>
        ))}
      </div>
      <PresetRow options={BLOB_COUNTS} value={params.blobCount as typeof BLOB_COUNTS[number]}
        onChange={(v) => set({ blobCount: v })} />

      <div style={sect}>
        <span style={sectLabel}>Stroke Width</span>
        <span style={{ fontSize: 11, color: C.primary, fontFamily: '"Courier New", monospace' }}>{params.strokeWidth}px</span>
      </div>
      <input type="range" min={0.5} max={8} step={0.5} value={params.strokeWidth}
        onChange={(e) => set({ strokeWidth: +e.target.value })}
        style={{ width: '100%', marginBottom: 10, accentColor: C.green }} />

      <div style={sect}>
        <span style={sectLabel}>Color and Text</span>
        <div style={{ display: 'flex', gap: 10 }}>
          <ToggleLabel label="Crazy" value={params.crazyMode} onChange={(v) => set({ crazyMode: v })} />
          <ToggleLabel label="Text" value={params.showText} onChange={(v) => set({ showText: v })} />
        </div>
      </div>

      {params.showText && (<>
        <span style={subHdr}>Text Position</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, marginBottom: 6 }}>
          {(['center', 'top', 'bottom'] as const).map((pos) => (
            <button key={pos} onClick={() => set({ textPosition: pos })} style={btnBase(params.textPosition === pos)}>
              {pos.charAt(0).toUpperCase() + pos.slice(1)}
            </button>
          ))}
        </div>
        <span style={subHdr}>Text Content</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, marginBottom: 6 }}>
          {(['random', 'position', 'count'] as const).map((c) => (
            <button key={c} onClick={() => set({ textContent: c })} style={btnBase(params.textContent === c)}>
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </button>
          ))}
        </div>
        <span style={subHdr}>Font Size</span>
        <PresetRow options={FONT_SIZES} value={params.fontSize as typeof FONT_SIZES[number]}
          onChange={(v) => set({ fontSize: v })} fmt={(v) => `${v}px`} />
      </>)}

      {!params.crazyMode && (<>
        <span style={subHdr}>Color</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(11, 1fr)', gap: 3, marginBottom: 10 }}>
          {TRACKER_COLORS.map((c) => (
            <div
              key={c}
              onClick={() => set({ trackerColor: c })}
              style={{
                aspectRatio: '1', background: c, cursor: 'pointer',
                border: params.trackerColor === c ? `2px solid ${C.primary}` : `1px solid ${C.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {params.trackerColor === c && (
                <span style={{ fontSize: 8, color: c === '#ffffff' ? '#000' : '#fff', fontWeight: 900 }}>✓</span>
              )}
            </div>
          ))}
        </div>
      </>)}
    </EffectLayout>
  );
}
