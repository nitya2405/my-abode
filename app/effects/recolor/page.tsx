'use client';

import { useState, useRef, useEffect } from 'react';
import EffectLayout from '@/components/EffectLayout';
import ButtonGroup from '@/components/ButtonGroup';
import ParamSlider from '@/components/ParamSlider';
import SectionLabel from '@/components/SectionLabel';
import { renderRecolor, RecolorParams } from '@/lib/effects/recolor';

const MODES = ['Hueshift', 'Gradientmap'];

const hint: React.CSSProperties = { fontSize: 11, color: '#888', lineHeight: 1.6, margin: '0 0 12px' };

export default function RecolorPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [params, setParams] = useState<RecolorParams>({
    mode: 'hueshift',
    hue: 0,
    span: 300,
    saturation: 100,
    brightness: 100,
    flow: 0,
  });

  useEffect(() => {
    if (!imageData) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = imageData.width;
    canvas.height = imageData.height;

    const tick = (timestamp: number) => {
      const frame = renderRecolor(imageData, params, timestamp);
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) ctx.putImageData(frame, 0, 0);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [imageData, params]);

  const set = (patch: Partial<RecolorParams>) => setParams((p) => ({ ...p, ...patch }));

  return (
    <EffectLayout
      effectName="RECOLOR"
      description="Remap image colors with animated hue cycling. Hueshift rotates each pixel's hue; Gradientmap maps luminosity to a custom color range for duotone and thermal looks."
      canvasRef={canvasRef}
      onImageLoad={setImageData}
      animated
      hasImage={!!imageData}
    >
      <SectionLabel label="Mode" />
      <p style={hint}>Hueshift = rotates original hues. Gradientmap = replaces all color using brightness as a gradient index.</p>
      <ButtonGroup
        options={MODES}
        value={params.mode}
        onChange={(v) => set({ mode: v as RecolorParams['mode'] })}
        cols={2}
      />

      <SectionLabel label="Color" />
      <p style={hint}>Hue sets the starting offset. Span controls how wide a color range is used in gradient mode.</p>
      <ParamSlider label="Hue" value={params.hue} min={0} max={360} step={1} unit="°" onChange={(v) => set({ hue: v })} />
      <ParamSlider label="Span" value={params.span} min={0} max={360} step={1} unit="°" onChange={(v) => set({ span: v })} />
      <ParamSlider label="Saturation" value={params.saturation} min={0} max={200} step={1} unit="%" onChange={(v) => set({ saturation: v })} />
      <ParamSlider label="Brightness" value={params.brightness} min={0} max={200} step={1} unit="%" onChange={(v) => set({ brightness: v })} />

      <SectionLabel label="Animation" />
      <p style={hint}>Flow advances the hue offset each frame, creating a continuous color cycle. Set to 0 to freeze.</p>
      <ParamSlider label="Flow" value={params.flow} min={0} max={10} step={0.1} decimals={1} onChange={(v) => set({ flow: v })} />
    </EffectLayout>
  );
}
