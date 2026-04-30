'use client';

import { useState, useRef, useEffect } from 'react';
import EffectLayout from '@/components/EffectLayout';
import { renderSuperG, SuperGParams } from '@/lib/effects/super-g';

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

function Slider({ label, value, min, max, step, onChange }: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void;
}) {
  return (
    <>
      <div style={sliderRow}>
        <span>{label}</span>
        <span style={{ color: '#acc7fd' }}>{value.toFixed(3)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(+e.target.value)}
        style={{ width: '100%', marginBottom: 10, accentColor: '#acc7fd' }} />
    </>
  );
}

const DEFAULT_PARAMS: SuperGParams = {
  rgbSplit: 0.02,
  digitalStripe: 0.2,
  imageBlock: 0.3,
  lineBlock: 0.2,
  scanlineJitter: 0,
  screenJump: 0,
  screenShake: 0,
  tileJitter: 0.1,
  waveJitter: 0,
  analogNoise: 0.1,
};

export default function SuperGPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [params, setParams] = useState<SuperGParams>(DEFAULT_PARAMS);

  useEffect(() => {
    if (!imageData) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const tick = (timestamp: number) => {
      const frame = renderSuperG(imageData, params, timestamp);
      canvasRef.current?.getContext('2d')!.putImageData(frame, 0, 0);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [imageData, params]);

  const set = (patch: Partial<SuperGParams>) => setParams((p) => ({ ...p, ...patch }));

  return (
    <>
      {/* Photosensitive warning */}
      {!confirmed && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)',
          zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: '#0d1f26', border: '1px solid rgba(172,199,253,0.18)',
            borderRadius: 8, padding: '32px 28px', maxWidth: 420,
            fontFamily: '"Courier New", monospace',
          }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#acc7fd', marginBottom: 14, letterSpacing: '0.08em' }}>
              Warning
            </div>
            <p style={{ fontSize: 12, color: '#8e9aaa', lineHeight: 1.7, marginBottom: 26 }}>
              This effect contains flashing and intense visual elements that may cause discomfort for individuals with photosensitive epilepsy or those sensitive to flashing lights.
            </p>
            <button
              onClick={() => setConfirmed(true)}
              style={{
                width: '100%', padding: '12px', fontSize: 12, borderRadius: 4,
                fontFamily: '"Courier New", monospace', fontWeight: 700, letterSpacing: '0.1em',
                border: '1px solid rgba(172,199,253,0.3)', background: '#152028',
                color: '#acc7fd', cursor: 'pointer',
              }}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      <EffectLayout
        effectName="SUPER-G"
        description="Extreme glitch art engine — every frame is deterministically randomized for consistent exports."
        canvasRef={canvasRef}
        onImageLoad={setImageData}
        animated
        hasImage={!!imageData}
      >
        <div style={{ height: 10 }} />

        {/* Channel */}
        <div style={{ ...sect, borderTop: 'none', paddingTop: 0 }}>
          <span style={sectLabel}>Channel</span>
        </div>
        <Slider label="RGB Split" value={params.rgbSplit} min={0} max={1} step={0.001} onChange={(v) => set({ rgbSplit: v })} />

        {/* Corruption */}
        <div style={sect}>
          <span style={sectLabel}>Corruption</span>
        </div>
        <Slider label="Digital Stripe" value={params.digitalStripe} min={0} max={1} step={0.01} onChange={(v) => set({ digitalStripe: v })} />
        <Slider label="Image Block" value={params.imageBlock} min={0} max={1} step={0.01} onChange={(v) => set({ imageBlock: v })} />
        <Slider label="Line Block" value={params.lineBlock} min={0} max={1} step={0.01} onChange={(v) => set({ lineBlock: v })} />

        {/* Jitter */}
        <div style={sect}>
          <span style={sectLabel}>Jitter</span>
        </div>
        <Slider label="Scanline Jitter" value={params.scanlineJitter} min={0} max={1} step={0.001} onChange={(v) => set({ scanlineJitter: v })} />
        <Slider label="Screen Jump" value={params.screenJump} min={0} max={1} step={0.001} onChange={(v) => set({ screenJump: v })} />
        <Slider label="Screen Shake" value={params.screenShake} min={0} max={1} step={0.001} onChange={(v) => set({ screenShake: v })} />
        <Slider label="Tile Jitter" value={params.tileJitter} min={0} max={1} step={0.001} onChange={(v) => set({ tileJitter: v })} />
        <Slider label="Wave Jitter" value={params.waveJitter} min={0} max={1} step={0.001} onChange={(v) => set({ waveJitter: v })} />

        {/* Noise */}
        <div style={sect}>
          <span style={sectLabel}>Noise</span>
        </div>
        <Slider label="Analog Noise" value={params.analogNoise} min={0} max={1} step={0.001} onChange={(v) => set({ analogNoise: v })} />
      </EffectLayout>
    </>
  );
}
