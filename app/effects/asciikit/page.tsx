'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { renderASCIIKit, ASCIIKitParams } from '@/lib/effects/asciikit';
import { saveCanvasToGallery } from '@/lib/gallery';
import { detectVideoFormats, startCanvasRecording, exportVideoFull, VideoFormat } from '@/lib/export';
import { C, effects } from '@/lib/effects-data';
import { useIsMobile } from '@/lib/useIsMobile';

const MAX_DIM = 1200;

const CHAR_COLORS = [
  '#ffffff','#cccccc','#888888','#facc15','#fb923c','#f87171',
  '#f472b6','#c084fc','#818cf8','#60a5fa','#34d399','#4ade80',
  '#a3e635','#00bcd4','#ff5722','#e91e63','#9c27b0','#3f51b5',
  '#2196f3','#000000',
];
const BG_COLORS = [
  '#000000','#0a0a0a','#111111','#1a1a1a','#222222','#333333',
  '#ffffff','#facc15','#fb923c','#f87171','#f472b6','#c084fc',
  '#818cf8','#60a5fa','#34d399','#4ade80','#00bcd4','#9c27b0',
  '#3f51b5','#2196f3',
];

const BLEND_MODES: { label: string; value: string }[] = [
  { label: 'Normal',      value: 'source-over' },
  { label: 'Multiply',    value: 'multiply' },
  { label: 'Screen',      value: 'screen' },
  { label: 'Overlay',     value: 'overlay' },
  { label: 'Darken',      value: 'darken' },
  { label: 'Lighten',     value: 'lighten' },
  { label: 'Dodge',       value: 'color-dodge' },
  { label: 'Burn',        value: 'color-burn' },
  { label: 'Hard Light',  value: 'hard-light' },
  { label: 'Soft Light',  value: 'soft-light' },
  { label: 'Difference',  value: 'difference' },
  { label: 'Exclusion',   value: 'exclusion' },
];

const DEFAULT_PARAMS: ASCIIKitParams = {
  charSet: 'standard',
  customChars: '01',
  fontFamily: 'Monospace',
  fontScale: 1.0,
  charSpacing: 1.0,
  lineHeight: 1.2,
  contrast: 1.5,
  brightness: 0.0,
  invert: false,
  overlayOriginal: false,
  overlayOpacity: 0.9,
  overlayBlur: 0,
  blendMode: 'source-over',
  edgeDetection: false,
  edgeThreshold: 40,
  charColor: '#ffffff',
  useOriginalColor: false,
  charShadow: true,
  charThreshold: 0,
  bgColor: '#000000',
  bgTransparent: false,
};

function scaleAndExtract(source: HTMLImageElement | HTMLVideoElement, srcW: number, srcH: number): ImageData {
  let w = srcW, h = srcH;
  if (w > MAX_DIM) { h = Math.round(h * MAX_DIM / w); w = MAX_DIM; }
  else if (h > MAX_DIM) { w = Math.round(w * MAX_DIM / h); h = MAX_DIM; }
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(source, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
}

export default function ASCIIKitPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRafRef = useRef<number>(0);
  const imageRafRef = useRef<number>(0);

  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [params, setParams] = useState<ASCIIKitParams>(DEFAULT_PARAMS);
  const [showExport, setShowExport] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [videoPaused, setVideoPaused] = useState(false);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [videoFormats, setVideoFormats] = useState<VideoFormat[]>([]);
  const paramsRef = useRef(params);
  useEffect(() => { paramsRef.current = params; }, [params]);
  useEffect(() => { setVideoFormats(detectVideoFormats()); }, []);

  const hasMedia = mediaType !== null;

  // Image rendering
  useEffect(() => {
    if (mediaType !== 'image' || !imageData || !canvasRef.current) return;
    cancelAnimationFrame(imageRafRef.current);
    imageRafRef.current = requestAnimationFrame(() => {
      if (canvasRef.current) renderASCIIKit(canvasRef.current, imageData, params);
    });
    return () => cancelAnimationFrame(imageRafRef.current);
  }, [imageData, params, mediaType]);

  // Video loop
  useEffect(() => {
    if (mediaType !== 'video' || videoPaused) {
      cancelAnimationFrame(videoRafRef.current);
      return;
    }
    if (!videoCanvasRef.current) videoCanvasRef.current = document.createElement('canvas');

    const tick = () => {
      videoRafRef.current = requestAnimationFrame(tick);
      const vid = videoRef.current;
      if (!canvasRef.current || !vid || vid.readyState < 2) return;
      const vc = videoCanvasRef.current!;
      let w = vid.videoWidth, h = vid.videoHeight;
      if (w === 0) return;
      if (w > MAX_DIM) { h = Math.round(h * MAX_DIM / w); w = MAX_DIM; }
      else if (h > MAX_DIM) { w = Math.round(w * MAX_DIM / h); h = MAX_DIM; }
      if (vc.width !== w || vc.height !== h) { vc.width = w; vc.height = h; }
      const vCtx = vc.getContext('2d')!;
      vCtx.drawImage(vid, 0, 0, w, h);
      renderASCIIKit(canvasRef.current, vCtx.getImageData(0, 0, w, h), paramsRef.current);
    };

    videoRafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(videoRafRef.current);
  }, [mediaType, videoPaused]);

  const toggleVideo = () => {
    const vid = videoRef.current;
    if (!vid) return;
    if (videoPaused) { vid.play().catch(() => {}); setVideoPaused(false); }
    else { vid.pause(); setVideoPaused(true); }
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    if (file.type.startsWith('image/')) {
      const img = new Image();
      img.onload = () => {
        setImageData(scaleAndExtract(img, img.width, img.height));
        setMediaType('image');
        URL.revokeObjectURL(img.src);
      };
      img.src = URL.createObjectURL(file);
    } else if (file.type.startsWith('video/')) {
      const vid = videoRef.current!;
      if (vid.src) URL.revokeObjectURL(vid.src);
      setVideoError(null);
      setVideoDuration(null);
      vid.src = URL.createObjectURL(file);
      vid.onloadeddata = () => {
        if (vid.duration > 300) {
          URL.revokeObjectURL(vid.src);
          vid.src = '';
          setVideoError('Video must be under 5 minutes. Please trim it first.');
          return;
        }
        setVideoDuration(vid.duration);
        setVideoPaused(false);
        setMediaType('video');
        vid.play().catch(() => {});
      };
    }
  };

  const handleExportFull = async () => {
    if (!videoRef.current || !canvasRef.current || isExporting) return;
    cancelAnimationFrame(videoRafRef.current);
    setIsExporting(true);
    setExportProgress(0);
    setShowExport(false);
    const MAX = 1200;
    await exportVideoFull(
      videoRef.current,
      canvasRef.current,
      (vid) => {
        let w = vid.videoWidth, h = vid.videoHeight;
        if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
        else if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; }
        if (!videoCanvasRef.current) videoCanvasRef.current = document.createElement('canvas');
        const vc = videoCanvasRef.current;
        if (vc.width !== w || vc.height !== h) { vc.width = w; vc.height = h; }
        const vCtx = vc.getContext('2d')!;
        vCtx.drawImage(vid, 0, 0, w, h);
        renderASCIIKit(canvasRef.current!, vCtx.getImageData(0, 0, w, h), paramsRef.current);
      },
      'asciikit',
      setExportProgress,
    );
    setIsExporting(false);
    setVideoPaused(false);
  };

  const exportImage = (fmt: 'png' | 'jpeg' | 'webp') => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const mime = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' }[fmt];
    const a = document.createElement('a');
    a.href = canvas.toDataURL(mime, 0.92);
    a.download = `asciikit.${fmt}`;
    a.click();
    setShowExport(false);
  };

  const exportVideo = (fmt: VideoFormat, secs: number, fromStart = false) => {
    const canvas = canvasRef.current;
    if (!canvas || isRecording) return;
    startCanvasRecording(
      canvas, fmt, secs, 'asciikit',
      () => setIsRecording(true),
      () => setIsRecording(false),
      fromStart ? videoRef.current : null,
    );
    setShowExport(false);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasMedia) return;
    const ok = saveCanvasToGallery(canvas, 'ASCIIKit', 'asciikit', mediaType === 'video' ? 'video' : 'image');
    if (ok) { setSavedFeedback(true); setTimeout(() => setSavedFeedback(false), 1800); }
  };

  const set = <K extends keyof ASCIIKitParams>(key: K) =>
    (val: ASCIIKitParams[K]) => setParams((p) => ({ ...p, [key]: val }));

  const isMobile = useIsMobile();

  return (
    <div style={{
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      height: isMobile ? 'auto' : 'calc(100vh - 44px)',
      minHeight: isMobile ? 'calc(100vh - 44px)' : undefined,
      overflow: isMobile ? 'visible' : 'hidden',
      fontFamily: 'system-ui, sans-serif',
      background: C.bg,
    }}
      onClick={() => showExport && setShowExport(false)}>
      <video ref={videoRef} style={{ display: 'none' }} loop muted playsInline />

      {/* ── LEFT PANEL ── */}
      <div style={{
        width: isMobile ? '100%' : 320,
        minWidth: isMobile ? '100%' : 320,
        background: C.surface,
        borderRight: isMobile ? 'none' : `1px solid ${C.border}`,
        borderTop: isMobile ? `1px solid ${C.border}` : 'none',
        overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column',
        order: isMobile ? 2 : undefined,
      }}>

        <div style={{ padding: '16px 18px 14px' }}>
          <div style={{ fontFamily: '"Courier New", monospace', fontSize: 21, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.text, marginBottom: 8, textShadow: '0 0 20px rgba(172,199,253,0.2)' }}>
            ASCIIKIT
          </div>
          <p style={{ fontSize: 12, color: C.textDim, lineHeight: 1.65, margin: '0 0 14px' }}>
            Convert images and video to character art with full color, font, and layout control.
          </p>

          <div style={{ display: 'flex', gap: 6 }} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => uploadRef.current?.click()} style={btnStyle}>Upload</button>
            <input ref={uploadRef} type="file" accept="image/*,video/*" onChange={handleUpload} style={{ display: 'none' }} />

            <button
              onClick={handleSave}
              style={{
                ...btnStyle, flex: 'none',
                background: savedFeedback ? '#0a3300' : C.surfaceHigh,
                color: savedFeedback ? C.green : hasMedia ? C.primary : C.textMuted,
                cursor: hasMedia ? 'pointer' : 'not-allowed',
                border: savedFeedback ? `1px solid ${C.green}40` : `1px solid ${C.border}`,
              }}
            >
              {savedFeedback ? '✓ Saved' : 'Save'}
            </button>

            <div style={{ position: 'relative', flex: 1 }}>
              <button
                onClick={() => hasMedia && !isRecording && !isExporting && setShowExport((v) => !v)}
                style={{
                  ...btnStyle, width: '100%',
                  background: isExporting ? '#0a1a12' : isRecording ? '#3b0a0a' : C.surfaceHigh,
                  color: isExporting ? C.green : isRecording ? '#ff6b6b' : hasMedia ? C.primary : C.textMuted,
                  border: `1px solid ${isRecording ? '#ff4a4a40' : C.border}`,
                  cursor: isExporting || isRecording ? 'wait' : hasMedia ? 'pointer' : 'not-allowed',
                }}
              >
                {isExporting ? `↓ ${Math.round(exportProgress * 100)}%` : isRecording ? '● REC' : 'Export ▾'}
              </button>

              {showExport && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: '#041016', border: `1px solid ${C.border}`, borderRadius: 0, overflow: 'hidden', zIndex: 200 }}>
                  <div style={{ padding: '6px 12px 4px', fontSize: 9, color: C.textMuted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Image frame</div>
                  {(['PNG', 'JPEG', 'WebP'] as const).map((f) => (
                    <button key={f} onClick={() => exportImage(f.toLowerCase() as 'png' | 'jpeg' | 'webp')} style={menuItem}>{f}</button>
                  ))}
                  {mediaType === 'video' ? (
                    <>
                      <div style={{ borderTop: `1px solid ${C.border}`, margin: '4px 0' }} />
                      <div style={{ padding: '4px 12px 4px', fontSize: 9, color: C.textMuted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Full Video</div>
                      <button onClick={handleExportFull} style={menuItem}>Export Full Video</button>
                    </>
                  ) : (
                    videoFormats.map((fmt) => (
                      <div key={fmt.mime}>
                        <div style={{ borderTop: `1px solid ${C.border}`, margin: '4px 0' }} />
                        <div style={{ padding: '4px 12px 4px', fontSize: 9, color: C.textMuted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Video — {fmt.label}</div>
                        {[5, 10, 30].map((s) => (
                          <button key={s} onClick={() => exportVideo(fmt, s)} style={menuItem}>Clip — {s}s</button>
                        ))}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
          {videoError && (
            <div style={{ marginTop: 8, padding: '7px 10px', background: '#3b0a0a', border: '1px solid #7f1d1d', borderRadius: 6, fontSize: 11, color: '#fca5a5', lineHeight: 1.5 }}>
              {videoError}
            </div>
          )}
        </div>

        <div style={{ borderTop: `1px solid ${C.border}` }} />

        <div style={{ padding: '0 18px 48px', display: 'flex', flexDirection: 'column' }}>
          <Sect label="Character Set" />
          <BtnGrid
            options={['Standard', 'Blocks', 'Simple', 'Binary', 'Dense', 'Minimal', 'Retro', 'Symbols', 'Custom']}
            value={params.charSet} cols={3}
            onChange={(v) => set('charSet')(v.toLowerCase() as ASCIIKitParams['charSet'])}
          />
          {params.charSet === 'custom' && (
            <input
              value={params.customChars}
              onChange={(e) => set('customChars')(e.target.value)}
              placeholder="Characters from dark → light"
              style={{ marginBottom: 10, background: C.bg, border: `1px solid ${C.border}`, color: C.text, padding: '6px 10px', borderRadius: 0, fontSize: 13, width: '100%', boxSizing: 'border-box' }}
            />
          )}

          <Sect label="Font Family" />
          <BtnGrid
            options={['Monospace', 'Courier', 'Consolas', 'Lucida Console']}
            value={params.fontFamily} cols={2}
            onChange={(v) => set('fontFamily')(v as ASCIIKitParams['fontFamily'])}
          />

          <Sect label="Scale" />
          <Slider label="Font Scale"   value={params.fontScale}   min={0.5} max={4}   step={0.05} unit="x"  onChange={set('fontScale')} />
          <Slider label="Char Spacing" value={params.charSpacing} min={0.4} max={3}   step={0.05}           onChange={set('charSpacing')} />
          <Slider label="Line Height"  value={params.lineHeight}  min={0.5} max={3}   step={0.05}           onChange={set('lineHeight')} />

          <Sect label="Tone" />
          <Slider label="Contrast"        value={params.contrast}       min={0.1} max={5}   step={0.05} onChange={set('contrast')} />
          <Slider label="Brightness"      value={params.brightness}     min={-1}  max={1}   step={0.02} onChange={set('brightness')} />
          <Slider label="Char Threshold"  value={params.charThreshold}  min={0}   max={0.98} step={0.01} onChange={set('charThreshold')} />
          <Toggle label="Invert" value={params.invert} onChange={set('invert')} />

          <Sect label="Overlay Original" />
          <p style={hint}>ON: original image shows beneath characters. OFF: solid background.</p>
          <Toggle label="Enable" value={params.overlayOriginal} onChange={set('overlayOriginal')} />
          {params.overlayOriginal && (
            <>
              <Slider label="Opacity" value={params.overlayOpacity} min={0} max={1}  step={0.02} onChange={set('overlayOpacity')} />
              <Slider label="Blur"    value={params.overlayBlur}    min={0} max={20} step={1}    unit="px" onChange={set('overlayBlur')} />
              <Sect label="Blend Mode" />
              <BtnGrid
                options={BLEND_MODES.map((m) => m.label)}
                value={BLEND_MODES.find((m) => m.value === params.blendMode)?.label ?? 'Normal'}
                cols={3}
                onChange={(v) => set('blendMode')(BLEND_MODES.find((m) => m.label === v)?.value ?? 'source-over')}
              />
            </>
          )}

          <Sect label="Edge Detection" />
          <Toggle label="Enable" value={params.edgeDetection} onChange={set('edgeDetection')} />
          {params.edgeDetection && (
            <Slider label="Threshold" value={params.edgeThreshold} min={0} max={255} step={1} onChange={set('edgeThreshold')} />
          )}

          <Sect label="Char Color" />
          <Toggle label="Use Original Colors" value={params.useOriginalColor} onChange={set('useOriginalColor')} />
          <Toggle label="Shadow" value={params.charShadow} onChange={set('charShadow')} />
          {!params.useOriginalColor && (
            <ColorPicker colors={CHAR_COLORS} selected={params.charColor} onChange={set('charColor')} />
          )}

          {!params.overlayOriginal && (
            <>
              <Sect label="Background" />
              <Toggle label="Transparent" value={params.bgTransparent} onChange={set('bgTransparent')} />
              {!params.bgTransparent && (
                <ColorPicker colors={BG_COLORS} selected={params.bgColor} onChange={set('bgColor')} />
              )}
            </>
          )}
        </div>
      </div>

      {/* ── RIGHT STAGE ── */}
      <VideoStage
        hasMedia={hasMedia}
        mediaType={mediaType}
        videoPaused={videoPaused}
        onUpload={() => uploadRef.current?.click()}
        onToggle={toggleVideo}
        canvasRef={canvasRef}
        isMobile={isMobile}
      />
    </div>
  );
}

function VideoStage({ hasMedia, mediaType, videoPaused, onUpload, onToggle, canvasRef, isMobile }: {
  hasMedia: boolean;
  mediaType: 'image' | 'video' | null;
  videoPaused: boolean;
  onUpload: () => void;
  onToggle: () => void;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  isMobile: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const isVideo = mediaType === 'video' && hasMedia;

  return (
    <div
      style={{
        flex: isMobile ? 'none' : 1,
        height: isMobile ? '42vh' : undefined,
        minHeight: isMobile ? 240 : undefined,
        background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', position: 'relative',
        cursor: isVideo ? 'pointer' : 'default',
        order: isMobile ? 1 : undefined,
      }}
      onMouseEnter={() => isVideo && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => isVideo && onToggle()}
    >
      {!hasMedia && (
        <div
          onClick={(e) => { e.stopPropagation(); onUpload(); }}
          style={{ color: 'rgba(172,199,253,0.08)', textAlign: 'center', userSelect: 'none', cursor: 'pointer' }}
        >
          <div style={{ fontFamily: '"Courier New", monospace', fontSize: 52, fontWeight: 900, letterSpacing: '0.1em', marginBottom: 12 }}>ASCIIKIT</div>
          <div style={{ fontSize: 13, color: 'rgba(172,199,253,0.25)', letterSpacing: '0.08em', fontFamily: 'monospace' }}>[ CLICK TO UPLOAD IMAGE OR VIDEO ]</div>
        </div>
      )}

      <canvas ref={canvasRef} style={{ maxWidth: '96%', maxHeight: '96%', objectFit: 'contain', display: hasMedia ? 'block' : 'none', cursor: 'default' }} />

      {isVideo && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
          opacity: hovered || videoPaused ? 1 : 0,
          transition: 'opacity 0.2s ease',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
            border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, color: '#fff', transition: 'transform 0.15s, background 0.15s',
            transform: hovered ? 'scale(1.08)' : 'scale(1)',
          }}>
            {videoPaused ? '▶' : '⏸'}
          </div>
        </div>
      )}
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  flex: 1, padding: '7px 10px', background: C.surfaceHigh, color: C.primary,
  border: `1px solid ${C.border}`, borderRadius: 0, cursor: 'pointer',
  fontSize: 11, fontFamily: '"Courier New", monospace', fontWeight: 600,
  letterSpacing: '0.08em',
};
const menuItem: React.CSSProperties = {
  display: 'block', width: '100%', padding: '8px 14px', background: 'transparent',
  color: C.primary, border: 'none', cursor: 'pointer', textAlign: 'left',
  fontSize: 11, fontFamily: '"Courier New", monospace', letterSpacing: '0.05em',
};
const hint: React.CSSProperties = { fontSize: 11, color: C.textDim, lineHeight: 1.6, margin: '0 0 10px' };

function Sect({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginTop: 18, marginBottom: 8, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
      <span style={{ fontSize: 11, color: C.textDim, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'monospace' }}>{label}</span>
    </div>
  );
}

function BtnGrid({ options, value, cols, onChange }: {
  options: string[]; value: string; cols: number; onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 5, marginBottom: 8 }}>
      {options.map((opt) => {
        const active = value === opt || value === opt.toLowerCase();
        return (
          <button key={opt} onClick={() => onChange(opt)}
            style={{ padding: '6px 4px', fontSize: 11, borderRadius: 0, border: active ? `1px solid ${C.primary}` : `1px solid ${C.border}`, cursor: 'pointer',
              fontFamily: '"Courier New", monospace', fontWeight: active ? 700 : 500,
              background: active ? C.primary : C.surfaceHigh, color: active ? C.bg : C.textDim, transition: 'all 0.1s' }}>
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function Slider({ label, value, min, max, step, unit = '', onChange }: {
  label: string; value: number; min: number; max: number; step: number; unit?: string; onChange: (v: number) => void;
}) {
  const dec = step < 1 ? (step.toString().split('.')[1]?.length ?? 2) : 0;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
        <span style={{ fontSize: 11, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'monospace' }}>{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <input
            type="number" min={min} max={max} step={step}
            value={value.toFixed(dec)}
            onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) onChange(Math.max(min, Math.min(max, v))); }}
            style={{ width: 52, background: C.bg, border: `1px solid ${C.border}`, color: C.primary,
              fontSize: 10, fontFamily: '"Courier New", monospace', padding: '2px 5px',
              borderRadius: 0, textAlign: 'right', outline: 'none' }}
          />
          {unit && <span style={{ fontSize: 10, color: C.textDim }}>{unit}</span>}
        </div>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', accentColor: C.green }}
      />
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
      <span style={{ fontSize: 12, color: C.textDim, fontFamily: 'monospace' }}>{label}</span>
      <button onClick={() => onChange(!value)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
        <div style={{ width: 34, height: 19, borderRadius: 0, background: value ? C.green : C.surfaceHigh, border: `1px solid ${C.border}`, position: 'relative', transition: 'background 0.18s' }}>
          <div style={{ position: 'absolute', top: 3, left: value ? 16 : 3, width: 11, height: 11, borderRadius: 0, background: value ? C.bg : C.textDim, transition: 'left 0.18s' }} />
        </div>
      </button>
    </div>
  );
}

function ColorPicker({ colors, selected, onChange }: { colors: string[]; selected: string; onChange: (v: string) => void }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 6 }}>
        {colors.map((c) => (
          <button key={c} onClick={() => onChange(c)}
            style={{ width: 26, height: 26, borderRadius: 0, background: c, border: 'none', cursor: 'pointer',
              outline: selected === c ? `2px solid ${C.primary}` : '2px solid transparent', outlineOffset: 1, position: 'relative' }}>
            {selected === c && (
              <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, color: ['#ffffff','#cccccc','#facc15','#a3e635','#4ade80','#34d399'].includes(c) ? '#000' : '#fff' }}>✓</span>
            )}
          </button>
        ))}
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
        <div style={{ width: 26, height: 26, borderRadius: 0, background: selected, border: `1px solid ${C.border}`, position: 'relative', flexShrink: 0 }}>
          <input type="color" value={selected} onChange={(e) => onChange(e.target.value)}
            style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer', border: 'none', padding: 0 }}
          />
        </div>
        <span style={{ fontSize: 11, color: C.textDim, letterSpacing: '0.06em', fontFamily: 'monospace' }}>Custom — {selected}</span>
      </label>
    </div>
  );
}
