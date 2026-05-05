'use client';

import { useState, useRef, useEffect } from 'react';
import { renderGlassify, GlassifyParams } from '@/lib/effects/glassify';
import { saveCanvasToGallery } from '@/lib/gallery';
import { detectVideoFormats, startCanvasRecording, exportVideoFull, VideoFormat } from '@/lib/export';
import { C, effects } from '@/lib/effects-data';
import ExportDropdown from '@/components/ExportDropdown';

const EFFECTS = ['None', 'Radial', 'Glitch', 'Stripe', 'Organic', 'Ripple'];

const DEFAULT_PARAMS: GlassifyParams = {
  effect: 'radial',
  layers: 6,
  offset: 12,
  rotation: 0.15,
  radius: 0.7,
  shadowStrength: 0.35,
  shadowWidth: 0.08,
  highlightStrength: 0.15,
  highlightWidth: 0.015,
  seed: 10,
  strength: 10,
  size: 0.3,
  angle: 0,
  distortion: 0.1,
  shift: 0.5,
  blur: 2,
};

export default function GlassifyPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRafRef = useRef<number>(0);
  const imageRafRef = useRef<number>(0);

  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [params, setParams] = useState<GlassifyParams>(DEFAULT_PARAMS);
  const exportBtnRef = useRef<HTMLDivElement>(null);
  const [showExport, setShowExport] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
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
    imageRafRef.current = requestAnimationFrame((timestamp) => {
      if (canvasRef.current) {
        const result = renderGlassify(imageData, params, timestamp);
        canvasRef.current.width = result.width;
        canvasRef.current.height = result.height;
        canvasRef.current.getContext('2d')!.putImageData(result, 0, 0);
      }
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

    const tick = (timestamp: number) => {
      videoRafRef.current = requestAnimationFrame(tick);
      const vid = videoRef.current;
      if (!canvasRef.current || !vid || vid.readyState < 2) return;
      const vc = videoCanvasRef.current!;
      let w = vid.videoWidth, h = vid.videoHeight;
      if (w === 0) return;
      if (vc.width !== w || vc.height !== h) { vc.width = w; vc.height = h; }
      const vCtx = vc.getContext('2d')!;
      vCtx.drawImage(vid, 0, 0, w, h);
      const result = renderGlassify(vCtx.getImageData(0, 0, w, h), paramsRef.current, timestamp);
      canvasRef.current.width = result.width;
      canvasRef.current.height = result.height;
      canvasRef.current.getContext('2d')!.putImageData(result, 0, 0);
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
        const c = document.createElement('canvas');
        c.width = img.width; c.height = img.height;
        const ctx = c.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        setImageData(ctx.getImageData(0, 0, img.width, img.height));
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
          setVideoError('Video must be under 5 minutes.');
          return;
        }
        setVideoDuration(vid.duration);
        setVideoPaused(false);
        setMediaType('video');
        vid.play().catch(() => {});
      };
    }
  };

  const handleExportFull = async (fmt: 'webm' | 'mp4' = 'webm') => {
    if (!videoRef.current || !canvasRef.current || isExporting) return;
    cancelAnimationFrame(videoRafRef.current);
    setIsExporting(true);
    setExportProgress(0);
    setShowExport(false);
    await exportVideoFull(
      videoRef.current,
      canvasRef.current,
      (vid) => {
        const w = vid.videoWidth, h = vid.videoHeight;
        if (!videoCanvasRef.current) videoCanvasRef.current = document.createElement('canvas');
        const vc = videoCanvasRef.current;
        if (vc.width !== w || vc.height !== h) { vc.width = w; vc.height = h; }
        const vCtx = vc.getContext('2d')!;
        vCtx.drawImage(vid, 0, 0, w, h);
        const result = renderGlassify(vCtx.getImageData(0, 0, w, h), paramsRef.current, vid.currentTime * 1000);
        const c = canvasRef.current!;
        c.width = result.width; c.height = result.height;
        c.getContext('2d')!.putImageData(result, 0, 0);
      },
      'glassify',
      setExportProgress,
      fmt,
    );
    setIsExporting(false);
    setVideoPaused(false);
  };

  const exportImage = (fmt: 'png' | 'jpeg' | 'webp') => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const mime = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' }[fmt];
    const a = document.createElement('a');
    a.href = canvas.toDataURL(mime, 1.0);
    a.download = `glassify.${fmt}`;
    a.click();
    setShowExport(false);
  };

  const exportVideo = (fmt: VideoFormat, secs: number, fromStart = false) => {
    const canvas = canvasRef.current;
    if (!canvas || isRecording) return;
    startCanvasRecording(
      canvas, fmt, secs, 'glassify',
      () => setIsRecording(true),
      () => setIsRecording(false),
      fromStart ? videoRef.current : null,
    );
    setShowExport(false);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasMedia) return;
    const ok = saveCanvasToGallery(canvas, 'Glassify', 'glassify', mediaType === 'video' ? 'video' : 'image');
    if (ok) { setSavedFeedback(true); setTimeout(() => setSavedFeedback(false), 1800); }
  };

  const set = (patch: Partial<GlassifyParams>) => setParams((p) => ({ ...p, ...patch }));
  const e = params.effect;

  return (
    <div
      style={{ display: 'flex', height: 'calc(100vh - 44px)', overflow: 'hidden', fontFamily: 'system-ui, sans-serif', background: C.bg }}
      onClick={() => showExport && setShowExport(false)}
    >
      <video ref={videoRef} style={{ display: 'none' }} loop muted playsInline />

      {/* ── LEFT PANEL ── */}
      <div style={{ width: 320, minWidth: 320, background: C.surface, borderRight: `1px solid ${C.border}`, overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column' }}>

        <div style={{ padding: '16px 18px 14px' }}>
          <div style={{ fontFamily: '"Courier New", monospace', fontSize: 21, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.text, marginBottom: 8, textShadow: '0 0 20px rgba(172,199,253,0.2)' }}>
            GLASSIFY
          </div>
          <p style={{ fontSize: 12, color: C.textDim, lineHeight: 1.65, margin: '0 0 14px' }}>
            Layered glass distortion engine. Stacks and warps image and video frames through six refraction modes.
          </p>

          <div style={{ display: 'flex', gap: 6 }} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => uploadRef.current?.click()} style={btnStyle}>Upload</button>
            <input ref={uploadRef} type="file" accept="image/*,video/*" onChange={handleUpload} style={{ display: 'none' }} />

            <button onClick={handleSave} style={{
              ...btnStyle, flex: 'none',
              background: savedFeedback ? '#0a3300' : C.surfaceHigh,
              color: savedFeedback ? C.green : hasMedia ? C.primary : C.textMuted,
              border: savedFeedback ? `1px solid ${C.green}40` : `1px solid ${C.border}`,
              cursor: hasMedia ? 'pointer' : 'not-allowed',
            }}>
              {savedFeedback ? '✓ Saved' : 'Save'}
            </button>

            <div ref={exportBtnRef} style={{ position: 'relative', flex: 1 }}>
              <button
                onClick={() => {
                  if (!hasMedia || isRecording || isExporting) return;
                  if (exportBtnRef.current) {
                    const rect = exportBtnRef.current.getBoundingClientRect();
                    setDropdownPos({ top: rect.bottom + 2, right: window.innerWidth - rect.right });
                  }
                  setShowExport((v) => !v);
                }}
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
          <Sect label="Effect" />
          <BtnGrid options={EFFECTS} value={params.effect} cols={3}
            onChange={(v) => set({ effect: v.toLowerCase() as GlassifyParams['effect'] })} />

          {e === 'radial' && (
            <>
              <Sect label="Layer" />
              <Slider label="Layer"    value={params.layers}   min={1}   max={20}  step={1}     onChange={(v) => set({ layers: v })} />
              <Slider label="Offset"   value={params.offset}   min={0}   max={100} step={1}     onChange={(v) => set({ offset: v })} />
              <Slider label="Rotation" value={params.rotation} min={0}   max={1}   step={0.01}  onChange={(v) => set({ rotation: v })} />
              <Slider label="Radius"   value={params.radius}   min={0}   max={1}   step={0.01}  onChange={(v) => set({ radius: v })} />
              <Sect label="Shadow" />
              <Slider label="Shadow Strength" value={params.shadowStrength} min={0} max={1}   step={0.01}  onChange={(v) => set({ shadowStrength: v })} />
              <Slider label="Shadow Width"    value={params.shadowWidth}    min={0} max={0.2} step={0.005} onChange={(v) => set({ shadowWidth: v })} />
              <Sect label="Highlight" />
              <Slider label="Highlight Strength" value={params.highlightStrength} min={0} max={1}    step={0.01}  onChange={(v) => set({ highlightStrength: v })} />
              <Slider label="Highlight Width"    value={params.highlightWidth}    min={0} max={0.05} step={0.001} onChange={(v) => set({ highlightWidth: v })} />
            </>
          )}

          {e === 'glitch' && (
            <>
              <Sect label="Block" />
              <Slider label="Strength" value={params.strength} min={1} max={20} step={1} onChange={(v) => set({ strength: v })} />
              <Slider label="Seed"     value={params.seed}     min={1} max={20} step={1} onChange={(v) => set({ seed: v })} />
            </>
          )}

          {e === 'stripe' && (
            <>
              <Sect label="Pattern" />
              <Slider label="Distortion" value={params.distortion} min={0} max={1} step={0.01} onChange={(v) => set({ distortion: v })} />
            </>
          )}

          {e === 'organic' && (
            <>
              <Sect label="Noise" />
              <Slider label="Size" value={params.size} min={0.05} max={1} step={0.01} onChange={(v) => set({ size: v })} />
            </>
          )}

          {e === 'ripple' && (
            <>
              <Sect label="Motion" />
              <Slider label="Speed" value={params.shift} min={0} max={1} step={0.05} onChange={(v) => set({ shift: v })} />
            </>
          )}
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <VideoStage
        hasMedia={hasMedia}
        mediaType={mediaType}
        videoPaused={videoPaused}
        onUpload={() => uploadRef.current?.click()}
        onToggle={toggleVideo}
        canvasRef={canvasRef}
        effectName="GLASSIFY"
      />

      {showExport && (
        <div onClick={(e) => e.stopPropagation()} style={{ position: 'fixed', top: dropdownPos.top, right: dropdownPos.right, zIndex: 9999 }}>
          <ExportDropdown
            onImageExport={exportImage}
            onClipExport={mediaType === 'video' ? undefined : exportVideo}
            videoFormats={mediaType === 'video' ? [] : videoFormats}
            isRecording={isRecording}
            onFullExport={mediaType === 'video' ? handleExportFull : undefined}
            isVideoSource={mediaType === 'video'}
            isExporting={isExporting}
            exportProgress={exportProgress}
          />
        </div>
      )}
    </div>
  );
}

function VideoStage({ hasMedia, mediaType, videoPaused, onUpload, onToggle, canvasRef, effectName }: {
  hasMedia: boolean;
  mediaType: 'image' | 'video' | null;
  videoPaused: boolean;
  onUpload: () => void;
  onToggle: () => void;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  effectName: string;
}) {
  const [hovered, setHovered] = useState(false);
  const isVideo = mediaType === 'video' && hasMedia;

  return (
    <div
      style={{ flex: 1, background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative', cursor: isVideo ? 'pointer' : 'default' }}
      onMouseEnter={() => isVideo && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => isVideo && onToggle()}
    >
      {!hasMedia && (
        <div
          onClick={(e) => { e.stopPropagation(); onUpload(); }}
          style={{ color: 'rgba(172,199,253,0.08)', textAlign: 'center', userSelect: 'none', cursor: 'pointer' }}
        >
          <div style={{ fontFamily: '"Courier New", monospace', fontSize: 52, fontWeight: 900, letterSpacing: '0.1em', marginBottom: 12 }}>{effectName}</div>
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
const mItem: React.CSSProperties = {
  display: 'block', width: '100%', padding: '8px 14px', background: 'transparent',
  color: C.primary, border: 'none', cursor: 'pointer', textAlign: 'left',
  fontSize: 11, fontFamily: '"Courier New", monospace', letterSpacing: '0.05em',
};
const sHdr: React.CSSProperties = {
  padding: '6px 12px 4px', fontSize: 9, color: C.textMuted, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'monospace',
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
            style={{ width: 56, background: C.bg, border: `1px solid ${C.border}`, color: C.primary,
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
