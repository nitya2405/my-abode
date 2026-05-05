'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import EffectLayout from '@/components/EffectLayout';
import { renderRecolor, RecolorParams } from '@/lib/effects/recolor';
import { exportVideoFull } from '@/lib/export';

const GRADIENT_PRESETS: string[][] = [
  ['#000000', '#ff2200', '#ffaa00', '#ffffff'],
  ['#000033', '#0055ff', '#00eeff'],
  ['#0d1117', '#39d353', '#aaffcc'],
  ['#ff6b6b', '#feca57', '#48dbfb'],
  ['#ff0066', '#ff6600', '#ffff00'],
  ['#4400cc', '#0066ff', '#00ccff'],
  ['#000000', '#6600ff', '#ff00cc'],
  ['#111111', '#eeeeee'],
  ['#1a0030', '#7b00cc', '#ff00cc'],
  ['#ff0000', '#ffaa00', '#ffff00', '#00ff00', '#0055ff', '#8800ff'],
  ['#2d3436', '#6c5ce7', '#fd79a8'],
  ['#0a0010', '#00ccff', '#aaff00'],
];

const DEFAULT_CUSTOM = ['#ff0000', '#ff7700', '#ffff00', '#00ff00', '#0066ff', '#8800ff'];

const RAINBOW_BAR = [
  'hsl(0,100%,50%)', 'hsl(30,100%,50%)', 'hsl(60,100%,50%)',
  'hsl(90,100%,50%)', 'hsl(120,100%,50%)', 'hsl(150,100%,50%)',
  'hsl(180,100%,50%)', 'hsl(210,100%,50%)', 'hsl(240,100%,50%)',
  'hsl(270,100%,50%)', 'hsl(300,100%,50%)', 'hsl(330,100%,50%)',
  'hsl(360,100%,50%)',
].join(', ');

const sect: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '10px 0 6px', borderTop: '1px solid rgba(172,199,253,0.1)', marginTop: 4,
};
const sectLabel: React.CSSProperties = {
  fontSize: 11, color: '#acc7fd', fontFamily: '"Courier New", monospace',
  letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700,
};
const btn = (active: boolean): React.CSSProperties => ({
  flex: 1, padding: '7px 8px', fontSize: 11, borderRadius: 0,
  fontFamily: '"Courier New", monospace', fontWeight: 600, letterSpacing: '0.06em',
  border: `1px solid ${active ? '#acc7fd' : 'rgba(172,199,253,0.15)'}`,
  background: active ? '#acc7fd' : '#152028',
  color: active ? '#08151b' : '#8e9aaa', cursor: 'pointer',
});
const sliderRow: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  fontSize: 10, color: '#8e9aaa', fontFamily: '"Courier New", monospace',
  letterSpacing: '0.06em', marginBottom: 4,
};

export default function RecolorPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoRafRef = useRef<number>(0);
  const tempCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [sourceMode, setSourceMode] = useState<'image' | 'video'>('image');
  const [hasVideo, setHasVideo] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [customColors, setCustomColors] = useState<string[]>([...DEFAULT_CUSTOM]);
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const colorInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [params, setParams] = useState<RecolorParams>({
    mode: 'hueshift',
    hue: 0,
    span: 300,
    saturation: 100,
    brightness: 100,
    flow: 0.2,
    gradientColors: [...DEFAULT_CUSTOM],
  });

  const paramsRef = useRef(params);
  useEffect(() => { paramsRef.current = params; }, [params]);

  // Image animation loop
  useEffect(() => {
    if (sourceMode !== 'image' || !imageData) return;
    cancelAnimationFrame(videoRafRef.current);
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const tick = (timestamp: number) => {
      const frame = renderRecolor(imageData, params, timestamp);
      canvasRef.current?.getContext('2d')!.putImageData(frame, 0, 0);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [imageData, params, sourceMode]);

  // Video frame loop
  const videoTick = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      videoRafRef.current = requestAnimationFrame(videoTick);
      return;
    }
    const tc = tempCanvasRef.current!;
    const tCtx = tc.getContext('2d')!;
    tCtx.drawImage(video, 0, 0);
    const frame = renderRecolor(
      tCtx.getImageData(0, 0, tc.width, tc.height),
      paramsRef.current,
      performance.now()
    );
    canvas.getContext('2d')!.putImageData(frame, 0, 0);
    videoRafRef.current = requestAnimationFrame(videoTick);
  }, []);

  useEffect(() => {
    if (sourceMode === 'video' && hasVideo) {
      cancelAnimationFrame(rafRef.current);
      videoRafRef.current = requestAnimationFrame(videoTick);
    } else {
      cancelAnimationFrame(videoRafRef.current);
    }
    return () => cancelAnimationFrame(videoRafRef.current);
  }, [sourceMode, hasVideo, videoTick]);

  const handleVideoLoad = (file: File) => {
    const video = videoRef.current;
    if (!video) return;
    if (video.src) URL.revokeObjectURL(video.src);
    video.src = URL.createObjectURL(file);
    video.loop = true;
    video.muted = true;
    video.onloadedmetadata = () => {
      const tc = document.createElement('canvas');
      tc.width = video.videoWidth;
      tc.height = video.videoHeight;
      tempCanvasRef.current = tc;
      const canvas = canvasRef.current!;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      video.play();
      setHasVideo(true);
      setSourceMode('video');
    };
  };

  const handleExportFull = async (fmt: 'webm' | 'mp4' = 'webm') => {
    if (!videoRef.current || !canvasRef.current || !tempCanvasRef.current || isExporting) return;
    cancelAnimationFrame(videoRafRef.current);
    setIsExporting(true);
    setExportProgress(0);
    const tc = tempCanvasRef.current;
    const tCtx = tc.getContext('2d')!;
    await exportVideoFull(
      videoRef.current,
      canvasRef.current,
      (vid) => {
        tCtx.drawImage(vid, 0, 0);
        const frame = renderRecolor(
          tCtx.getImageData(0, 0, tc.width, tc.height),
          paramsRef.current,
          vid.currentTime * 1000,
        );
        canvasRef.current!.getContext('2d')!.putImageData(frame, 0, 0);
      },
      'recolor',
      setExportProgress,
      fmt,
    );
    setIsExporting(false);
    videoRef.current.loop = true;
    videoRef.current.play().catch(() => {});
    videoRafRef.current = requestAnimationFrame(videoTick);
  };

  const set = (patch: Partial<RecolorParams>) => setParams((p) => ({ ...p, ...patch }));

  const applyPreset = (idx: number) => {
    setSelectedPreset(idx);
    set({ gradientColors: GRADIENT_PRESETS[idx] });
  };

  const updateCustomColor = (i: number, color: string) => {
    const next = [...customColors];
    next[i] = color;
    setCustomColors(next);
    setSelectedPreset(null);
    set({ gradientColors: next });
  };

  const addCustomColor = () => {
    if (customColors.length >= 12) return;
    const next = [...customColors, '#ffffff'];
    setCustomColors(next);
    setSelectedPreset(null);
    set({ gradientColors: next });
  };

  const applyCustom = () => {
    setSelectedPreset(null);
    set({ gradientColors: customColors });
  };

  const hasContent = sourceMode === 'image' ? !!imageData : hasVideo;

  return (
    <>
      <video ref={videoRef} style={{ display: 'none' }} playsInline />

      <EffectLayout
        effectName="RECOLOR"
        description="Remap image colors — hue cycle or gradient map luminance to a custom palette."
        canvasRef={canvasRef}
        onImageLoad={(d) => { setImageData(d); setSourceMode('image'); }}
        onVideoLoad={handleVideoLoad}
        animated
        hasImage={hasContent}
        isVideoSource={sourceMode === 'video' && hasVideo}
        onFullVideoExport={handleExportFull}
        isExporting={isExporting}
        exportProgress={exportProgress}
        videoRef={videoRef}
      >
        <div style={{ height: 10 }} />

        {/* Mode */}
        <div style={sect}>
          <span style={sectLabel}>Mode</span>
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          <button onClick={() => set({ mode: 'hueshift' })} style={btn(params.mode === 'hueshift')}>
            Hue Shift
          </button>
          <button onClick={() => set({ mode: 'gradientmap' })} style={btn(params.mode === 'gradientmap')}>
            Gradient Map
          </button>
        </div>

        {/* Hue Shift controls */}
        {params.mode === 'hueshift' && (
          <>
            <div style={{
              width: '100%', height: 10, marginBottom: 10, position: 'relative',
              background: `linear-gradient(to right, ${RAINBOW_BAR})`,
              border: '1px solid rgba(172,199,253,0.15)',
            }}>
              <div style={{
                position: 'absolute', top: -3, bottom: -3,
                left: `${(params.hue / 360) * 100}%`,
                width: 2, background: '#ffffff', transform: 'translateX(-50%)',
              }} />
            </div>

            <div style={sliderRow}>
              <span>Hue</span>
              <span style={{ color: '#acc7fd' }}>{params.hue}°</span>
            </div>
            <input type="range" min={0} max={360} step={1} value={params.hue}
              onChange={(e) => set({ hue: +e.target.value })}
              style={{ width: '100%', marginBottom: 12, accentColor: '#acc7fd' }} />

            <div style={sliderRow}>
              <span>Span</span>
              <span style={{ color: '#acc7fd' }}>+{params.span}°</span>
            </div>
            <input type="range" min={0} max={360} step={1} value={params.span}
              onChange={(e) => set({ span: +e.target.value })}
              style={{ width: '100%', marginBottom: 10, accentColor: '#acc7fd' }} />
          </>
        )}

        {/* Gradient Map controls */}
        {params.mode === 'gradientmap' && (
          <>
            <div style={sect}>
              <span style={sectLabel}>Presets</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, marginBottom: 10 }}>
              {GRADIENT_PRESETS.map((colors, i) => (
                <div key={i} onClick={() => applyPreset(i)} style={{
                  height: 28, cursor: 'pointer',
                  background: `linear-gradient(to right, ${colors.join(', ')})`,
                  border: selectedPreset === i
                    ? '2px solid #acc7fd'
                    : '1px solid rgba(172,199,253,0.15)',
                }} />
              ))}
            </div>

            <div style={sect}>
              <span style={sectLabel}>Custom</span>
            </div>
            <div style={{
              width: '100%', height: 10, marginBottom: 8,
              background: `linear-gradient(to right, ${customColors.join(', ')})`,
              border: '1px solid rgba(172,199,253,0.15)',
            }} />
            <div style={{ display: 'flex', gap: 4, alignItems: 'stretch', marginBottom: 4 }}>
              {customColors.map((c, i) => (
                <div key={i} onClick={() => colorInputRefs.current[i]?.click()} style={{
                  flex: 1, height: 22, background: c, cursor: 'pointer',
                  border: '1px solid rgba(172,199,253,0.2)', position: 'relative',
                }}>
                  <input
                    ref={(el) => { colorInputRefs.current[i] = el; }}
                    type="color"
                    value={c}
                    onChange={(e) => updateCustomColor(i, e.target.value)}
                    style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
                  />
                </div>
              ))}
              {customColors.length < 12 && (
                <button onClick={addCustomColor} style={{
                  width: 22, height: 22, fontSize: 14, borderRadius: 0,
                  border: '1px solid rgba(172,199,253,0.25)', background: '#152028',
                  color: '#acc7fd', cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  fontFamily: '"Courier New", monospace', padding: 0,
                }}>+</button>
              )}
            </div>
            <button onClick={applyCustom} style={{
              width: '100%', padding: '7px', fontSize: 11, borderRadius: 0,
              fontFamily: '"Courier New", monospace', fontWeight: 600, letterSpacing: '0.08em',
              border: '1px solid rgba(172,199,253,0.25)', background: '#152028',
              color: '#acc7fd', cursor: 'pointer', marginBottom: 6,
            }}>
              Apply Custom
            </button>
          </>
        )}

        {/* Animation */}
        <div style={sect}>
          <span style={sectLabel}>Animation</span>
        </div>
        <div style={sliderRow}>
          <span>Flow</span>
          <span style={{ color: '#acc7fd' }}>{params.flow.toFixed(2)}</span>
        </div>
        <input type="range" min={0} max={10} step={0.05} value={params.flow}
          onChange={(e) => set({ flow: +e.target.value })}
          style={{ width: '100%', marginBottom: 10, accentColor: '#acc7fd' }} />
      </EffectLayout>
    </>
  );
}
