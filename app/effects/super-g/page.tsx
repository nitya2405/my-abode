'use client';

import { useState, useRef, useEffect } from 'react';
import EffectLayout from '@/components/EffectLayout';
import ParamSlider from '@/components/ParamSlider';
import SectionLabel from '@/components/SectionLabel';
import { renderSuperG, SuperGParams } from '@/lib/effects/super-g';

const hint: React.CSSProperties = { fontSize: 11, color: '#888', lineHeight: 1.6, margin: '0 0 12px' };

export default function SuperGPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [params, setParams] = useState<SuperGParams>({
    rgbSplit: 0.02,
    digitalStripe: 0.2,
    imageBlock: 0.3,
    lineBlock: 0.2,
    scanlineJitter: 0,
  });

  useEffect(() => {
    if (!imageData) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = imageData.width;
    canvas.height = imageData.height;

    const tick = (timestamp: number) => {
      const frame = renderSuperG(imageData, params, timestamp);
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) ctx.putImageData(frame, 0, 0);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [imageData, params]);

  const set = (patch: Partial<SuperGParams>) => setParams((p) => ({ ...p, ...patch }));

  return (
    <EffectLayout
      effectName="SUPER-G"
      description="Live glitch art engine. Every frame is randomized — chaos is deterministic per-frame so exports are consistent, but no two seconds look the same."
      canvasRef={canvasRef}
      onImageLoad={setImageData}
      animated
      hasImage={!!imageData}
    >
      <SectionLabel label="Glitch" />
      <p style={hint}>
        RGB Split = horizontal channel separation (color tearing).
        Digital Stripe = chance of a scanline being replaced with noise.
        Image Block = displaced rectangular regions.
        Line Block = rows replaced with noisy pixel data.
      </p>
      <ParamSlider label="RGB Split" value={params.rgbSplit} min={0} max={1} step={0.01} decimals={2} onChange={(v) => set({ rgbSplit: v })} />
      <ParamSlider label="Digital Stripe" value={params.digitalStripe} min={0} max={1} step={0.01} decimals={2} onChange={(v) => set({ digitalStripe: v })} />
      <ParamSlider label="Image Block" value={params.imageBlock} min={0} max={1} step={0.01} decimals={2} onChange={(v) => set({ imageBlock: v })} />
      <ParamSlider label="Line Block" value={params.lineBlock} min={0} max={1} step={0.01} decimals={2} onChange={(v) => set({ lineBlock: v })} />

      <SectionLabel label="Jitter" />
      <p style={hint}>Shifts each horizontal scanline left or right by a random amount each frame — creates a wobbly, unstable look.</p>
      <ParamSlider label="Scanline Jitter" value={params.scanlineJitter} min={0} max={1} step={0.01} decimals={2} onChange={(v) => set({ scanlineJitter: v })} />
    </EffectLayout>
  );
}
