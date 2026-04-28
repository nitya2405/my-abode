'use client';

import { useState, useRef, useEffect } from 'react';
import EffectLayout from '@/components/EffectLayout';
import ButtonGroup from '@/components/ButtonGroup';
import ParamSlider from '@/components/ParamSlider';
import SectionLabel from '@/components/SectionLabel';
import { renderGlassify, GlassifyParams } from '@/lib/effects/glassify';

const EFFECTS = ['None', 'Radial', 'Glitch', 'Stripe', 'Organic', 'Ripple'];

const hint: React.CSSProperties = { fontSize: 11, color: '#888', lineHeight: 1.6, margin: '0 0 12px' };

export default function GlassifyPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [params, setParams] = useState<GlassifyParams>({
    effect: 'radial',
    layers: 10,
    offset: 20,
    rotation: 0.2,
    radius: 0.5,
  });

  useEffect(() => {
    if (!imageData) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = imageData.width;
    canvas.height = imageData.height;

    const tick = (timestamp: number) => {
      const frame = renderGlassify(imageData, params, timestamp);
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) ctx.putImageData(frame, 0, 0);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [imageData, params]);

  const set = (patch: Partial<GlassifyParams>) => setParams((p) => ({ ...p, ...patch }));

  return (
    <EffectLayout
      effectName="GLASSIFY"
      description="Stacks copies of the image with incremental rotation and offset, simulating light refracted through layered glass surfaces."
      canvasRef={canvasRef}
      onImageLoad={setImageData}
      animated
      hasImage={!!imageData}
    >
      <SectionLabel label="Effect" />
      <p style={hint}>
        None = static stacking. Radial = rotation animates continuously, layers spin.
        Glitch = layers jump randomly. Stripe/Organic/Ripple = distort the layer offset pattern.
      </p>
      <ButtonGroup
        options={EFFECTS}
        value={params.effect}
        onChange={(v) => set({ effect: v as GlassifyParams['effect'] })}
        cols={3}
      />

      <SectionLabel label="Shape" />
      <p style={hint}>
        Layers = number of stacked copies; more layers creates denser overlap.
        Offset = how far each successive layer is displaced.
        Rotation = angle step between layers.
        Radius = size of the circular crop applied to each layer.
      </p>
      <ParamSlider label="Layers" value={params.layers} min={1} max={20} step={1} onChange={(v) => set({ layers: v })} />
      <ParamSlider label="Offset" value={params.offset} min={0} max={100} step={1} onChange={(v) => set({ offset: v })} />
      <ParamSlider label="Rotation" value={params.rotation} min={0} max={1} step={0.01} decimals={2} onChange={(v) => set({ rotation: v })} />
      <ParamSlider label="Radius" value={params.radius} min={0} max={1} step={0.01} decimals={2} onChange={(v) => set({ radius: v })} />
    </EffectLayout>
  );
}
