'use client';

import { useState, useRef, useEffect } from 'react';
import EffectLayout from '@/components/EffectLayout';
import ButtonGroup from '@/components/ButtonGroup';
import ParamSlider from '@/components/ParamSlider';
import SectionLabel from '@/components/SectionLabel';
import { renderScanline, ScanlineParams } from '@/lib/effects/scanline';

const PRESETS = ['Full', 'Analog', 'Digital', 'Subtle'];

const hint: React.CSSProperties = { fontSize: 11, color: '#888', lineHeight: 1.6, margin: '0 0 12px' };

export default function ScanlinePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [params, setParams] = useState<ScanlineParams>({
    preset: 'full',
    analogEnabled: true,
    analogIntensity: 0.6,
    analogChroma: 0.4,
    analogTracking: 0.3,
    digitalEnabled: true,
    digitalBlockSpeed: 0.4,
  });

  useEffect(() => {
    if (!imageData) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = imageData.width;
    canvas.height = imageData.height;

    const tick = (timestamp: number) => {
      const frame = renderScanline(imageData, params, timestamp);
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) ctx.putImageData(frame, 0, 0);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [imageData, params]);

  const set = (patch: Partial<ScanlineParams>) => setParams((p) => ({ ...p, ...patch }));

  return (
    <EffectLayout
      effectName="SCANLINE"
      description="CRT and VHS emulator. Reproduces analog phosphor flicker, chroma aberration, VHS tracking bands, and digital block corruption in real time."
      canvasRef={canvasRef}
      onImageLoad={setImageData}
      animated
      hasImage={!!imageData}
    >
      <SectionLabel label="Preset" />
      <p style={hint}>Full = all effects combined. Analog = CRT phosphor only. Digital = corruption only. Subtle = low-intensity blend.</p>
      <ButtonGroup
        options={PRESETS}
        value={params.preset}
        onChange={(v) => set({ preset: v as ScanlineParams['preset'] })}
        cols={4}
      />

      <SectionLabel label="Analog" />
      <p style={hint}>
        Intensity = overall scanline darkness and flicker strength.
        Chroma = oscillates RGB channel alignment — the color fringing on old CRT screens.
        Tracking = drifting bands that simulate a VHS tape losing sync.
      </p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Enable</span>
        <button
          onClick={() => set({ analogEnabled: !params.analogEnabled })}
          style={{
            width: 40, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer',
            background: params.analogEnabled ? '#4ade80' : '#333', transition: 'background 0.2s',
          }}
        />
      </div>
      <ParamSlider label="Intensity" value={params.analogIntensity} min={0} max={1} step={0.01} decimals={2} onChange={(v) => set({ analogIntensity: v })} />
      <ParamSlider label="Chroma" value={params.analogChroma} min={0} max={1} step={0.01} decimals={2} onChange={(v) => set({ analogChroma: v })} />
      <ParamSlider label="Tracking" value={params.analogTracking} min={0} max={1} step={0.01} decimals={2} onChange={(v) => set({ analogTracking: v })} />

      <SectionLabel label="Digital" />
      <p style={hint}>Block Speed controls how rapidly corruption blocks change position. Higher = more frantic.</p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Enable</span>
        <button
          onClick={() => set({ digitalEnabled: !params.digitalEnabled })}
          style={{
            width: 40, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer',
            background: params.digitalEnabled ? '#4ade80' : '#333', transition: 'background 0.2s',
          }}
        />
      </div>
      <ParamSlider label="Block Speed" value={params.digitalBlockSpeed} min={0} max={1} step={0.01} decimals={2} onChange={(v) => set({ digitalBlockSpeed: v })} />
    </EffectLayout>
  );
}
