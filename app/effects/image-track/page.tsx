'use client';

import { useState, useRef, useEffect } from 'react';
import EffectLayout from '@/components/EffectLayout';
import ButtonGroup from '@/components/ButtonGroup';
import ParamSlider from '@/components/ParamSlider';
import SectionLabel from '@/components/SectionLabel';
import { detectBlobs, renderImageTrack, ImageTrackParams, Blob } from '@/lib/effects/image-track';

const SHAPES = ['Circle', 'Rect', 'Pill'];
const STYLES = ['Basic', 'Scope', 'Frame', 'Dash', 'Cross', 'Label', 'Particle'];
const FILTERS = ['None', 'Thermal', 'Tone', 'Inv', 'Pixel', 'Blur', 'Glitch'];

const hint: React.CSSProperties = { fontSize: 11, color: '#888', lineHeight: 1.6, margin: '0 0 12px' };

export default function ImageTrackPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const blobsRef = useRef<Blob[]>([]);
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [params, setParams] = useState<ImageTrackParams>({
    shape: 'circle',
    regionStyle: 'scope',
    filterEffect: 'none',
    invert: false,
    blobCount: 8,
    threshold: 140,
    minSize: 200,
  });

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

    const tick = (timestamp: number) => {
      const frame = renderImageTrack(imageData, blobsRef.current, params, timestamp);
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) ctx.putImageData(frame, 0, 0);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [imageData, params]);

  const set = (patch: Partial<ImageTrackParams>) => setParams((p) => ({ ...p, ...patch }));

  return (
    <EffectLayout
      effectName="IMAGETRACK"
      description="Detects high-contrast blobs and draws animated connections between them. Blobs connect by affinity — color similarity, proximity, and size similarity all factor in."
      canvasRef={canvasRef}
      onImageLoad={setImageData}
      animated
      hasImage={!!imageData}
    >
      <SectionLabel label="Tracker Shape" />
      <p style={hint}>The marker drawn around each detected blob. Circle = radar ring; Rect = bounding box; Pill = rounded rectangle.</p>
      <ButtonGroup
        options={SHAPES}
        value={params.shape}
        onChange={(v) => set({ shape: v as ImageTrackParams['shape'] })}
        cols={3}
      />

      <SectionLabel label="Style" />
      <p style={hint}>
        Scope = animated radar rings. Frame = corner brackets. Dash/Cross = detail markers.
        Label = ID text overlay. Particle = dots pulse along connection edges.
      </p>
      <ButtonGroup
        options={STYLES}
        value={params.regionStyle}
        onChange={(v) => set({ regionStyle: v as ImageTrackParams['regionStyle'] })}
        cols={4}
      />

      <SectionLabel label="Filter" />
      <p style={hint}>Color filter on the base image. Thermal and Tone remap colors; Glitch adds per-frame distortion.</p>
      <ButtonGroup
        options={FILTERS}
        value={params.filterEffect}
        onChange={(v) => set({ filterEffect: v as ImageTrackParams['filterEffect'] })}
        cols={4}
      />

      <SectionLabel label="Detection" />
      <p style={hint}>
        Blob Count = max regions to track. Threshold = brightness cutoff — lower includes darker areas.
        Min Size = minimum pixel area; raise to ignore small noise regions.
      </p>
      <ParamSlider label="Blob Count" value={params.blobCount} min={3} max={20} step={1} onChange={(v) => set({ blobCount: v })} />
      <ParamSlider label="Threshold" value={params.threshold} min={0} max={255} step={1} onChange={(v) => set({ threshold: v })} />
      <ParamSlider label="Min Size" value={params.minSize} min={50} max={2000} step={50} onChange={(v) => set({ minSize: v })} />
    </EffectLayout>
  );
}
