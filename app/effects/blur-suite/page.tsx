'use client';

import { useState, useRef, useEffect } from 'react';
import EffectLayout from '@/components/EffectLayout';
import ButtonGroup from '@/components/ButtonGroup';
import ParamSlider from '@/components/ParamSlider';
import SectionLabel from '@/components/SectionLabel';
import { applyBlurSuite, BlurSuiteParams } from '@/lib/effects/blur-suite';

const MODES = ['Radial', 'Zoom', 'Linear', 'Wave', 'TB', 'LR'];

const hint: React.CSSProperties = { fontSize: 11, color: '#888', lineHeight: 1.6, margin: '0 0 12px' };

export default function BlurSuitePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [params, setParams] = useState<BlurSuiteParams>({
    mode: 'radial',
    strength: 40,
    grain: 0,
    rgbShift: 0,
    direction: 0,
    centerX: 0.5,
    centerY: 0.5,
  });

  useEffect(() => {
    if (!imageData) return;
    const timer = setTimeout(() => {
      const result = applyBlurSuite(imageData, params);
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = result.width;
      canvas.height = result.height;
      canvas.getContext('2d')!.putImageData(result, 0, 0);
    }, 200);
    return () => clearTimeout(timer);
  }, [imageData, params]);

  const set = (patch: Partial<BlurSuiteParams>) => setParams((p) => ({ ...p, ...patch }));

  return (
    <EffectLayout
      effectName="BLURSUITE"
      description="Directional and spatial blur engine. Simulates motion, depth-of-field, camera shake, and optical distortion across six blur modes."
      canvasRef={canvasRef}
      onImageLoad={setImageData}
      hasImage={!!imageData}
    >
      <SectionLabel label="Mode" />
      <p style={hint}>
        Radial = angular spin blur. Zoom = radial outward motion. Linear = directional motion blur.
        Wave = horizontal wave distortion. TB/LR = gradient depth-of-field from edge to center.
      </p>
      <ButtonGroup
        options={MODES}
        value={params.mode}
        onChange={(v) => set({ mode: v as BlurSuiteParams['mode'] })}
        cols={3}
      />

      <SectionLabel label="Blur" />
      <p style={hint}>Samples taken in the blur direction. More strength = softer and more spread.</p>
      <ParamSlider label="Strength" value={params.strength} min={0} max={100} step={1} onChange={(v) => set({ strength: v })} />

      <SectionLabel label="Color" />
      <p style={hint}>Grain adds film noise over the blur. RGB Shift offsets red/blue channels for chromatic fringing.</p>
      <ParamSlider label="Grain" value={params.grain} min={0} max={100} step={1} onChange={(v) => set({ grain: v })} />
      <ParamSlider label="RGB Shift" value={params.rgbShift} min={0} max={50} step={1} unit="px" onChange={(v) => set({ rgbShift: v })} />

      {params.mode === 'linear' && (
        <>
          <SectionLabel label="Direction" />
          <p style={hint}>Angle of the motion blur. 0° = horizontal, 90° = vertical.</p>
          <ParamSlider label="Angle" value={params.direction} min={0} max={360} step={1} unit="°" onChange={(v) => set({ direction: v })} />
        </>
      )}

      {(params.mode === 'radial' || params.mode === 'zoom') && (
        <>
          <SectionLabel label="Center" />
          <p style={hint}>Point the blur radiates from. 0.5 / 0.5 = image center.</p>
          <ParamSlider label="X" value={params.centerX} min={0} max={1} step={0.01} decimals={2} onChange={(v) => set({ centerX: v })} />
          <ParamSlider label="Y" value={params.centerY} min={0} max={1} step={0.01} decimals={2} onChange={(v) => set({ centerY: v })} />
        </>
      )}
    </EffectLayout>
  );
}
