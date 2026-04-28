'use client';

import { useState, useRef, useEffect } from 'react';
import EffectLayout from '@/components/EffectLayout';
import ButtonGroup from '@/components/ButtonGroup';
import ParamSlider from '@/components/ParamSlider';
import SectionLabel from '@/components/SectionLabel';
import { applyRetroman, RetromanParams } from '@/lib/effects/retroman';

const ALGORITHMS = ['Atkinson', 'Floyd', 'Bayer', 'Blue'];

const BG_COLORS = [
  { label: 'Gray', value: '#888888' },
  { label: 'Black', value: '#111111' },
  { label: 'Teal', value: '#00897b' },
  { label: 'Green', value: '#43a047' },
  { label: 'Olive', value: '#827717' },
  { label: 'Orange', value: '#e65100' },
  { label: 'Cream', value: '#f5e6c8' },
  { label: 'White', value: '#f8f8f8' },
];

const hint: React.CSSProperties = { fontSize: 11, color: '#888', lineHeight: 1.6, margin: '0 0 12px' };

export default function RetromanPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [params, setParams] = useState<RetromanParams>({
    algorithm: 'atkinson',
    brightness: 0,
    contrast: 20,
    scale: 1,
    bgColor: '#e65100',
  });

  useEffect(() => {
    if (!imageData) return;
    const timer = setTimeout(() => {
      const result = applyRetroman(imageData, params);
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = result.width;
      canvas.height = result.height;
      canvas.getContext('2d')!.putImageData(result, 0, 0);
    }, 200);
    return () => clearTimeout(timer);
  }, [imageData, params]);

  const set = (patch: Partial<RetromanParams>) => setParams((p) => ({ ...p, ...patch }));

  return (
    <EffectLayout
      effectName="RETROMAN"
      description="Two-color dithering engine. Reduces the image to black ink on a colored background using classic halftone dither algorithms."
      canvasRef={canvasRef}
      onImageLoad={setImageData}
      hasImage={!!imageData}
    >
      <SectionLabel label="Algorithm" />
      <p style={hint}>
        Atkinson = classic Mac look, preserves highlights by diffusing 75% of error.
        Floyd = maximum detail, full diffusion. Bayer = ordered matrix pattern. Blue = smooth organic grain.
      </p>
      <ButtonGroup
        options={ALGORITHMS}
        value={params.algorithm}
        onChange={(v) => set({ algorithm: v as RetromanParams['algorithm'] })}
        cols={4}
      />

      <SectionLabel label="Tone" />
      <p style={hint}>Adjust luminosity before dithering. High contrast pushes midtones to black or white.</p>
      <ParamSlider label="Brightness" value={params.brightness} min={-100} max={100} step={1} onChange={(v) => set({ brightness: v })} />
      <ParamSlider label="Contrast" value={params.contrast} min={-100} max={100} step={1} onChange={(v) => set({ contrast: v })} />

      <SectionLabel label="Resolution" />
      <p style={hint}>Pixelizes before dithering. Higher values create chunky retro pixel art.</p>
      <ParamSlider label="Scale" value={params.scale} min={1} max={8} step={1} unit="x" onChange={(v) => set({ scale: v })} />

      <SectionLabel label="Background" />
      <p style={hint}>The second color — black is always the ink.</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
        {BG_COLORS.map((c) => (
          <div
            key={c.value}
            onClick={() => set({ bgColor: c.value })}
            title={c.label}
            style={{
              width: 28,
              height: 28,
              borderRadius: 5,
              background: c.value,
              cursor: 'pointer',
              border: params.bgColor === c.value ? '2px solid #fff' : '2px solid #333',
              transition: 'border-color 0.1s',
            }}
          />
        ))}
      </div>
      <div style={{ marginTop: 8 }}>
        <input
          type="color"
          value={params.bgColor}
          onChange={(e) => set({ bgColor: e.target.value })}
          style={{ width: '100%', height: 32, borderRadius: 5, border: '1px solid #333', background: 'none', cursor: 'pointer' }}
        />
      </div>
    </EffectLayout>
  );
}
