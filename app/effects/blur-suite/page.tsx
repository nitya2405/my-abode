'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { renderBlurSuite, BlurSuiteParams } from '@/lib/effects/blur-suite';
import { saveCanvasToGallery } from '@/lib/gallery';
import { detectVideoFormats, startCanvasRecording, exportVideoFull, VideoFormat } from '@/lib/export';
import { C } from '@/lib/effects-data';
import { useIsMobile } from '@/lib/useIsMobile';
import ExportDropdown from '@/components/ExportDropdown';

const MODES = ['Linear', 'Radial', 'Zoom', 'Wave', 'TB', 'LR'];

const DEFAULT_PARAMS: BlurSuiteParams = {
  mode: 'linear', strength: 40, grain: 0, rgbShift: 0,
  direction: 0, motionX: 0, motionY: 0,
  bloom: false, bloomStrength: 50, gradientMask: false,
};

export default function BlurSuitePage() {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const videoRef     = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRafRef  = useRef<number>(0);
  const tempCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [imageData, setImageData]   = useState<ImageData | null>(null);
  const [sourceMode, setSourceMode] = useState<'image' | 'video'>('image');
  const [hasVideo, setHasVideo]     = useState(false);
  const [params, setParams]         = useState<BlurSuiteParams>(DEFAULT_PARAMS);
  const exportBtnRef = useRef<HTMLDivElement>(null);
  const [showExport, setShowExport] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
  const [isRecording, setIsRecording] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [videoFormats, setVideoFormats]   = useState<VideoFormat[]>([]);

  const paramsRef = useRef(params);
  useEffect(() => { paramsRef.current = params; }, [params]);
  useEffect(() => { setVideoFormats(detectVideoFormats()); }, []);

  // Image effect
  useEffect(() => {
    if (sourceMode !== 'image' || !imageData || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width  = imageData.width;
    canvas.height = imageData.height;
    renderBlurSuite(canvas, imageData, params);
  }, [imageData, params, sourceMode]);

  // Video loop
  const tick = useCallback(() => {
    const video = videoRef.current, canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      videoRafRef.current = requestAnimationFrame(tick); return;
    }
    const tc   = tempCanvasRef.current!;
    const tCtx = tc.getContext('2d')!;
    tCtx.drawImage(video, 0, 0);
    renderBlurSuite(canvas, tCtx.getImageData(0, 0, tc.width, tc.height), paramsRef.current);
    videoRafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    if (sourceMode === 'video' && hasVideo) {
      videoRafRef.current = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(videoRafRef.current);
    }
    return () => cancelAnimationFrame(videoRafRef.current);
  }, [sourceMode, hasVideo, tick]);

  // Single upload handler — auto-detects image vs video by MIME type
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('video/')) {
      const video = videoRef.current;
      if (!video) return;
      if (video.src) URL.revokeObjectURL(video.src);
      video.src  = URL.createObjectURL(file);
      video.loop = true;
      video.muted = true;
      video.onloadedmetadata = () => {
        const tc  = document.createElement('canvas');
        tc.width  = video.videoWidth;
        tc.height = video.videoHeight;
        tempCanvasRef.current = tc;
        const canvas  = canvasRef.current!;
        canvas.width  = video.videoWidth;
        canvas.height = video.videoHeight;
        video.play();
        setHasVideo(true);
        setSourceMode('video');
      };
    } else {
      const img = new Image();
      img.onload = () => {
        const c   = document.createElement('canvas');
        c.width   = img.width;
        c.height  = img.height;
        const ctx = c.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        cancelAnimationFrame(videoRafRef.current);
        setImageData(ctx.getImageData(0, 0, img.width, img.height));
        setSourceMode('image');
        URL.revokeObjectURL(img.src);
      };
      img.src = URL.createObjectURL(file);
    }

    e.target.value = '';
  };

  const exportImage = (fmt: 'png' | 'jpeg' | 'webp') => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const mime = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' }[fmt];
    const a = document.createElement('a');
    a.href = canvas.toDataURL(mime, 1.0);
    a.download = `blur-suite.${fmt}`;
    a.click();
    setShowExport(false);
  };

  const exportVideo = (fmt: VideoFormat, secs: number) => {
    const canvas = canvasRef.current;
    if (!canvas || isRecording) return;
    startCanvasRecording(canvas, fmt, secs, 'blur-suite', () => setIsRecording(true), () => setIsRecording(false));
    setShowExport(false);
  };

  const handleExportFull = async (fmt: 'webm' | 'mp4' = 'webm') => {
    if (!videoRef.current || !canvasRef.current || !tempCanvasRef.current || isExporting) return;
    cancelAnimationFrame(videoRafRef.current);
    setIsExporting(true);
    setExportProgress(0);
    setShowExport(false);
    const tc = tempCanvasRef.current;
    const tCtx = tc.getContext('2d')!;
    await exportVideoFull(
      videoRef.current,
      canvasRef.current,
      (vid) => {
        tCtx.drawImage(vid, 0, 0);
        renderBlurSuite(canvasRef.current!, tCtx.getImageData(0, 0, tc.width, tc.height), paramsRef.current);
      },
      'blur-suite',
      setExportProgress,
      fmt,
    );
    setIsExporting(false);
    videoRef.current.loop = true;
    videoRef.current.play().catch(() => {});
    videoRafRef.current = requestAnimationFrame(tick);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ok = saveCanvasToGallery(canvas, 'BlurSuite', 'blur-suite', sourceMode === 'video' ? 'video' : 'image');
    if (ok) { setSavedFeedback(true); setTimeout(() => setSavedFeedback(false), 1800); }
  };

  const set = (patch: Partial<BlurSuiteParams>) => setParams((p) => ({ ...p, ...patch }));
  const hasContent = sourceMode === 'image' ? !!imageData : hasVideo;
  const isMobile = useIsMobile();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        height: isMobile ? 'auto' : 'calc(100vh - 44px)',
        minHeight: isMobile ? 'calc(100vh - 44px)' : undefined,
        overflow: isMobile ? 'visible' : 'hidden',
        fontFamily: 'system-ui, sans-serif',
        background: C.bg,
      }}
      onClick={() => showExport && setShowExport(false)}
    >
      <video ref={videoRef} style={{ display: 'none' }} playsInline />
      {/* Single input for both image and video */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />

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
            BLURSUITE
          </div>
          <p style={{ fontSize: 12, color: C.textDim, lineHeight: 1.65, margin: '0 0 14px' }}>
            Directional and spatial blur engine. Simulates motion, depth-of-field, camera shake, and optical distortion.
          </p>

          <div style={{ display: 'flex', gap: 6 }} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => fileInputRef.current?.click()} style={btnStyle}>Upload</button>
            <button onClick={handleSave} style={{
              ...btnStyle, flex: 'none',
              background: savedFeedback ? '#0a3300' : C.surfaceHigh,
              color: savedFeedback ? C.green : hasContent ? C.primary : C.textMuted,
              border: savedFeedback ? `1px solid ${C.green}40` : `1px solid ${C.border}`,
              cursor: hasContent ? 'pointer' : 'not-allowed',
            }}>
              {savedFeedback ? '✓ Saved' : 'Save'}
            </button>

            <div ref={exportBtnRef} style={{ position: 'relative', flex: 1 }}>
              <button
                onClick={() => {
                  if (!hasContent || isRecording || isExporting) return;
                  if (exportBtnRef.current) {
                    const rect = exportBtnRef.current.getBoundingClientRect();
                    setDropdownPos({ top: rect.bottom + 2, right: window.innerWidth - rect.right });
                  }
                  setShowExport((v) => !v);
                }}
                style={{
                  ...btnStyle, width: '100%',
                  background: isExporting ? '#0a1a12' : isRecording ? '#3b0a0a' : C.surfaceHigh,
                  color: isExporting ? C.green : isRecording ? '#ff6b6b' : hasContent ? C.primary : C.textMuted,
                  border: `1px solid ${isRecording ? '#ff4a4a40' : C.border}`,
                  cursor: isExporting || isRecording ? 'wait' : hasContent ? 'pointer' : 'not-allowed',
                }}
              >
                {isExporting ? `↓ ${Math.round(exportProgress * 100)}%` : isRecording ? '● REC' : 'Export ▾'}
              </button>
            </div>
          </div>
        </div>

        <div style={{ borderTop: `1px solid ${C.border}` }} />

        <div style={{ padding: '0 18px 48px', display: 'flex', flexDirection: 'column' }}>

          <Sect label="Mode" />
          <BtnGrid options={MODES} value={params.mode} cols={3} onChange={(v) => set({ mode: v.toLowerCase() as BlurSuiteParams['mode'] })} />

          <Sect label="Core" />
          <Slider label="Strength"  value={params.strength}  min={0}   max={200} step={1} onChange={(v) => set({ strength: v })} />
          <Slider label="Grain"     value={params.grain}     min={0}   max={100} step={1} onChange={(v) => set({ grain: v })} />
          <Slider label="RGB Shift" value={params.rgbShift}  min={0}   max={50}  step={1} onChange={(v) => set({ rgbShift: v })} />

          <Sect label="Directional" />
          <Slider label="Angle"    value={params.direction} min={0}   max={360} step={1}   unit="°" onChange={(v) => set({ direction: v })} />
          <Slider label="Motion X" value={params.motionX}   min={-50} max={50}  step={1}   onChange={(v) => set({ motionX: v })} />
          <Slider label="Motion Y" value={params.motionY}   min={-50} max={50}  step={1}   onChange={(v) => set({ motionY: v })} />

          <Sect label="Bloom" />
          <Toggle label="Enabled" value={params.bloom} onChange={(v) => set({ bloom: v })} />
          {params.bloom && (
            <Slider label="Bloom Strength" value={params.bloomStrength} min={0} max={100} step={1} onChange={(v) => set({ bloomStrength: v })} />
          )}

          <Sect label="Masking" />
          <Toggle label="Gradient Mask" value={params.gradientMask} onChange={(v) => set({ gradientMask: v })} />
        </div>
      </div>

      {/* ── RIGHT STAGE ── */}
      <div style={{
        flex: isMobile ? 'none' : 1,
        height: isMobile ? '42vh' : undefined,
        minHeight: isMobile ? 240 : undefined,
        background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', position: 'relative',
        order: isMobile ? 1 : undefined,
      }}>
        {!hasContent && (
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{ color: 'rgba(172,199,253,0.08)', textAlign: 'center', userSelect: 'none', cursor: 'pointer' }}
          >
            <div style={{ fontFamily: '"Courier New", monospace', fontSize: 52, fontWeight: 900, letterSpacing: '0.1em', marginBottom: 12 }}>BLURSUITE</div>
            <div style={{ fontSize: 13, color: 'rgba(172,199,253,0.25)', letterSpacing: '0.08em', fontFamily: 'monospace' }}>[ CLICK TO UPLOAD IMAGE OR VIDEO ]</div>
          </div>
        )}
        <canvas ref={canvasRef} style={{ maxWidth: '96%', maxHeight: '96%', objectFit: 'contain', display: hasContent ? 'block' : 'none' }} />
      </div>

      {showExport && (
        <div onClick={(e) => e.stopPropagation()} style={{ position: 'fixed', top: dropdownPos.top, right: dropdownPos.right, zIndex: 9999 }}>
          <ExportDropdown
            onImageExport={exportImage}
            onClipExport={sourceMode === 'video' ? undefined : exportVideo}
            videoFormats={sourceMode === 'video' ? [] : videoFormats}
            isRecording={isRecording}
            onFullExport={sourceMode === 'video' ? handleExportFull : undefined}
            isVideoSource={sourceMode === 'video'}
            isExporting={isExporting}
            exportProgress={exportProgress}
          />
        </div>
      )}
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  flex: 1, padding: '7px 10px', background: C.surfaceHigh, color: C.primary,
  border: `1px solid ${C.border}`, borderRadius: 0, cursor: 'pointer',
  fontSize: 11, fontFamily: '"Courier New", monospace', fontWeight: 600, letterSpacing: '0.08em',
};
const mItem: React.CSSProperties = {
  display: 'block', width: '100%', padding: '8px 14px', background: 'transparent',
  color: C.primary, border: 'none', cursor: 'pointer', textAlign: 'left',
  fontSize: 11, fontFamily: '"Courier New", monospace', letterSpacing: '0.05em',
};
const sHdr: React.CSSProperties = {
  padding: '6px 12px 4px', fontSize: 9, color: C.textMuted, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'monospace',
};

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
        const active = value.toLowerCase() === opt.toLowerCase();
        return (
          <button key={opt} onClick={() => onChange(opt)} style={{
            padding: '6px 4px', fontSize: 11, borderRadius: 0,
            border: active ? `1px solid ${C.primary}` : `1px solid ${C.border}`,
            cursor: 'pointer', fontFamily: '"Courier New", monospace', fontWeight: active ? 700 : 500,
            background: active ? C.primary : C.surfaceHigh, color: active ? C.bg : C.textDim,
          }}>
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
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
        <span style={{ fontSize: 11, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'monospace' }}>{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <input
            type="number" min={min} max={max} step={step} value={value}
            onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) onChange(Math.max(min, Math.min(max, v))); }}
            style={{ width: 56, background: C.bg, border: `1px solid ${C.border}`, color: C.primary, fontSize: 10, fontFamily: '"Courier New", monospace', padding: '2px 5px', borderRadius: 0, textAlign: 'right', outline: 'none' }}
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
          <div style={{ position: 'absolute', top: 3, left: value ? 16 : 3, width: 11, height: 11, background: value ? C.bg : C.textDim, transition: 'left 0.18s' }} />
        </div>
      </button>
    </div>
  );
}
