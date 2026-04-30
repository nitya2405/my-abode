'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { renderGlassify, GlassifyParams } from '@/lib/effects/glassify';
import { saveCanvasToGallery } from '@/lib/gallery';
import { detectVideoFormats, startCanvasRecording, VideoFormat } from '@/lib/export';

const MAX_DIM = 1200;

const EFFECTS = ['None', 'Radial', 'Glitch', 'Stripe', 'Organic', 'Ripple'];

const DEFAULT_PARAMS: GlassifyParams = {
  effect: 'radial',
  layers: 10,
  offset: 0,
  rotation: 0.20,
  radius: 0.5,
  shadowStrength: 0.3,
  shadowWidth: 0.05,
  highlightStrength: 0.3,
  highlightWidth: 0.01,
  seed: 1,
  strength: 4,
  size: 0.5,
  angle: 0,
  distortion: 0.5,
  shift: 0,
  blur: 0,
};

function scaleAndExtract(source: HTMLImageElement | HTMLVideoElement, srcW: number, srcH: number): ImageData {
  let w = srcW, h = srcH;
  if (w > MAX_DIM) { h = Math.round(h * MAX_DIM / w); w = MAX_DIM; }
  else if (h > MAX_DIM) { w = Math.round(w * MAX_DIM / h); h = MAX_DIM; }
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  c.getContext('2d')!.drawImage(source, 0, 0, w, h);
  return c.getContext('2d')!.getImageData(0, 0, w, h);
}

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
  const [showExport, setShowExport] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [videoPaused, setVideoPaused] = useState(false);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [videoFormats, setVideoFormats] = useState<VideoFormat[]>([]);
  const paramsRef = useRef(params);
  useEffect(() => { paramsRef.current = params; }, [params]);
  useEffect(() => { setVideoFormats(detectVideoFormats()); }, []);

  const hasMedia = mediaType !== null;

  // Image loop — keeps animating with timestamp (for Radial rotation, Ripple phase, etc.)
  useEffect(() => {
    if (mediaType !== 'image' || !imageData || !canvasRef.current) return;
    cancelAnimationFrame(imageRafRef.current);
    const canvas = canvasRef.current;
    canvas.width = imageData.width;
    canvas.height = imageData.height;

    const tick = (ts: number) => {
      imageRafRef.current = requestAnimationFrame(tick);
      const frame = renderGlassify(imageData, paramsRef.current, ts);
      canvasRef.current?.getContext('2d')?.putImageData(frame, 0, 0);
    };
    imageRafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(imageRafRef.current);
  }, [imageData, mediaType]);

  // Video loop
  useEffect(() => {
    if (mediaType !== 'video' || videoPaused) {
      cancelAnimationFrame(videoRafRef.current);
      return;
    }
    if (!videoCanvasRef.current) videoCanvasRef.current = document.createElement('canvas');

    const tick = (ts: number) => {
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
      const frame = renderGlassify(vCtx.getImageData(0, 0, w, h), paramsRef.current, ts);
      const canvas = canvasRef.current!;
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      canvas.getContext('2d')!.putImageData(frame, 0, 0);
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
          URL.revokeObjectURL(vid.src); vid.src = '';
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

  const exportImage = (fmt: 'png' | 'jpeg' | 'webp') => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const mime = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' }[fmt];
    const a = document.createElement('a');
    a.href = canvas.toDataURL(mime, 0.92);
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
      style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: 'system-ui, sans-serif', background: '#0a0a0a' }}
      onClick={() => showExport && setShowExport(false)}
    >
      <video ref={videoRef} style={{ display: 'none' }} loop muted playsInline />

      {/* ── LEFT PANEL ── */}
      <div style={{ width: 360, minWidth: 360, background: '#1a1a1a', borderRight: '1px solid #222', overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column' }}>

        <div style={{ padding: '16px 18px 14px' }}>
          <Link href="/" style={{ fontSize: 10, color: '#888', textDecoration: 'none', letterSpacing: '0.18em', textTransform: 'uppercase', display: 'block', marginBottom: 14 }}>
            ← Back
          </Link>
          <div style={{ fontFamily: '"Courier New", monospace', fontSize: 21, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#fff', marginBottom: 8 }}>
            GLASSIFY
          </div>
          <p style={{ fontSize: 12, color: '#888', lineHeight: 1.65, margin: '0 0 14px' }}>
            Layered glass distortion engine. Stacks and warps image and video frames through six animated refraction modes.
          </p>

          <div style={{ display: 'flex', gap: 6 }} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => uploadRef.current?.click()} style={btnStyle}>Upload</button>
            <input ref={uploadRef} type="file" accept="image/*,video/*" onChange={handleUpload} style={{ display: 'none' }} />

            <button onClick={handleSave} style={{
              ...btnStyle, flex: 'none',
              background: savedFeedback ? '#14532d' : '#222',
              color: savedFeedback ? '#4ade80' : hasMedia ? '#bbb' : '#444',
              cursor: hasMedia ? 'pointer' : 'not-allowed',
              border: savedFeedback ? '1px solid #166534' : '1px solid #333',
            }}>
              {savedFeedback ? '✓ Saved' : 'Save'}
            </button>

            <div style={{ position: 'relative', flex: 1 }}>
              <button
                onClick={() => hasMedia && !isRecording && setShowExport((v) => !v)}
                style={{
                  ...btnStyle, width: '100%',
                  background: isRecording ? '#7f1d1d' : '#222',
                  color: isRecording ? '#fca5a5' : hasMedia ? '#bbb' : '#444',
                  cursor: isRecording ? 'wait' : hasMedia ? 'pointer' : 'not-allowed',
                }}
              >
                {isRecording ? '● REC' : 'Export ▾'}
              </button>

              {showExport && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: '#131313', border: '1px solid #2a2a2a', borderRadius: 8, overflow: 'hidden', zIndex: 200 }}>
                  <div style={sHdr}>Image frame</div>
                  {(['PNG', 'JPEG', 'WebP'] as const).map((f) => (
                    <button key={f} onClick={() => exportImage(f.toLowerCase() as 'png' | 'jpeg' | 'webp')} style={mItem}>{f}</button>
                  ))}
                  {videoFormats.map((fmt) => (
                    <div key={fmt.mime}>
                      <div style={{ borderTop: '1px solid #222', margin: '4px 0' }} />
                      <div style={sHdr}>Video — {fmt.label}</div>
                      {[5, 10, 30].map((s) => (
                        <button key={s} onClick={() => exportVideo(fmt, s)} style={mItem}>Clip — {s}s</button>
                      ))}
                      {videoDuration && (
                        <button onClick={() => exportVideo(fmt, Math.ceil(videoDuration), true)} style={{ ...mItem, color: '#4ade80' }}>
                          Full — {Math.round(videoDuration)}s (from start)
                        </button>
                      )}
                    </div>
                  ))}
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

        <div style={{ borderTop: '1px solid #222' }} />

        <div style={{ padding: '0 18px 48px', display: 'flex', flexDirection: 'column' }}>

          <Sect label="Effect" />
          <p style={hint}>
            None = static. Radial = animated rotation rings. Glitch = frame-seeded block displacement.
            Stripe / Organic / Ripple = pixel-level refraction.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5, marginBottom: 8 }}>
            {EFFECTS.map((opt) => {
              const active = e === opt.toLowerCase();
              return (
                <button key={opt} onClick={() => set({ effect: opt.toLowerCase() as GlassifyParams['effect'] })}
                  style={{
                    padding: '6px 4px', fontSize: 11, borderRadius: 5, border: 'none', cursor: 'pointer',
                    fontFamily: '"Courier New", monospace', fontWeight: active ? 700 : 500,
                    background: active ? '#fff' : '#2a2a2a', color: active ? '#000' : '#aaa',
                    transition: 'all 0.1s',
                  }}>
                  {opt}
                </button>
              );
            })}
          </div>

          {/* Radial controls */}
          {e === 'radial' && (
            <>
              <Sect label="Layer" />
              <p style={hint}>Number of stacked copies inside the radial region.</p>
              <Slider label="Layer"    value={params.layers}   min={1}   max={20}  step={1}     onChange={(v) => set({ layers: v })} />
              <Slider label="Offset"   value={params.offset}   min={0}   max={100} step={1}     onChange={(v) => set({ offset: v })} />
              <Slider label="Rotation" value={params.rotation} min={0}   max={1}   step={0.01}  onChange={(v) => set({ rotation: v })} />
              <Slider label="Radius"   value={params.radius}   min={0}   max={1}   step={0.01}  onChange={(v) => set({ radius: v })} />
              <Sect label="Shadow" />
              <p style={hint}>Dark arc on each ring edge — simulates glass depth.</p>
              <Slider label="Shadow Strength" value={params.shadowStrength} min={0} max={1}   step={0.01}  onChange={(v) => set({ shadowStrength: v })} />
              <Slider label="Shadow Width"    value={params.shadowWidth}    min={0} max={0.2} step={0.005} onChange={(v) => set({ shadowWidth: v })} />
              <Sect label="Highlight" />
              <p style={hint}>Light arc on each ring edge — opposing glass reflection.</p>
              <Slider label="Highlight Strength" value={params.highlightStrength} min={0} max={1}    step={0.01}  onChange={(v) => set({ highlightStrength: v })} />
              <Slider label="Highlight Width"    value={params.highlightWidth}    min={0} max={0.05} step={0.001} onChange={(v) => set({ highlightWidth: v })} />
            </>
          )}

          {/* Glitch controls */}
          {e === 'glitch' && (
            <>
              <Sect label="Glitch" />
              <p style={hint}>Seed locks the base pattern. Strength controls block count and shift magnitude.</p>
              <Slider label="Seed"     value={params.seed}     min={1} max={20} step={1} onChange={(v) => set({ seed: v })} />
              <Slider label="Strength" value={params.strength} min={1} max={20} step={1} onChange={(v) => set({ strength: v })} />
            </>
          )}

          {/* Stripe / Organic / Ripple shared controls */}
          {(e === 'stripe' || e === 'organic' || e === 'ripple') && (
            <>
              <Sect label={e === 'stripe' ? 'Stripe' : e === 'organic' ? 'Organic' : 'Ripple'} />
              <p style={hint}>
                {e === 'stripe' && 'Ribbed glass — columns displaced perpendicular to the stripe direction.'}
                {e === 'organic' && 'Flow-field warp — layered sine approximation of noise for natural displacement.'}
                {e === 'ripple' && 'Concentric wave displacement radiating from the image center.'}
              </p>
              <Slider label="Size"       value={params.size}       min={0.05} max={1}   step={0.01} onChange={(v) => set({ size: v })} />
              <Slider label="Angle"      value={params.angle}      min={0}    max={360} step={1}    unit="°" onChange={(v) => set({ angle: v })} />
              <Slider label="Distortion" value={params.distortion} min={0}    max={1}   step={0.01} onChange={(v) => set({ distortion: v })} />
              <Slider label="Shift"      value={params.shift}      min={0}    max={1}   step={0.01} onChange={(v) => set({ shift: v })} />
              <Slider label="Blur"       value={params.blur}       min={0}    max={10}  step={0.5}  unit="px" onChange={(v) => set({ blur: v })} />
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
      />
    </div>
  );
}

/* ── VideoStage ── */
function VideoStage({ hasMedia, mediaType, videoPaused, onUpload, onToggle, canvasRef }: {
  hasMedia: boolean; mediaType: 'image' | 'video' | null;
  videoPaused: boolean; onUpload: () => void; onToggle: () => void;
  canvasRef: React.RefObject<HTMLCanvasElement>;
}) {
  const [hovered, setHovered] = useState(false);
  const isVideo = mediaType === 'video' && hasMedia;
  return (
    <div
      style={{ flex: 1, background: '#0f0f0f', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative', cursor: isVideo ? 'pointer' : 'default' }}
      onMouseEnter={() => isVideo && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => isVideo && onToggle()}
    >
      {!hasMedia && (
        <div onClick={(e) => { e.stopPropagation(); onUpload(); }} style={{ color: '#3a3a3a', textAlign: 'center', userSelect: 'none', cursor: 'pointer' }}>
          <div style={{ fontFamily: '"Courier New", monospace', fontSize: 52, fontWeight: 900, letterSpacing: '0.1em', marginBottom: 12 }}>GLASSIFY</div>
          <div style={{ fontSize: 13, color: '#666', letterSpacing: '0.05em' }}>Click to upload an image or video</div>
        </div>
      )}
      <canvas ref={canvasRef} style={{ maxWidth: '96%', maxHeight: '96%', objectFit: 'contain', display: hasMedia ? 'block' : 'none', cursor: 'default' }} />
      {isVideo && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', opacity: hovered || videoPaused ? 1 : 0, transition: 'opacity 0.2s ease' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: '#fff', transition: 'transform 0.15s', transform: hovered ? 'scale(1.08)' : 'scale(1)' }}>
            {videoPaused ? '▶' : '⏸'}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── shared styles ── */
const btnStyle: React.CSSProperties = {
  flex: 1, padding: '7px 10px', background: '#222', color: '#bbb',
  border: '1px solid #333', borderRadius: 6, cursor: 'pointer',
  fontSize: 11, fontFamily: '"Courier New", monospace', fontWeight: 600, letterSpacing: '0.08em',
};
const mItem: React.CSSProperties = {
  display: 'block', width: '100%', padding: '8px 14px', background: 'transparent',
  color: '#bbb', border: 'none', cursor: 'pointer', textAlign: 'left',
  fontSize: 11, fontFamily: '"Courier New", monospace', letterSpacing: '0.05em',
};
const sHdr: React.CSSProperties = { padding: '6px 12px 4px', fontSize: 9, color: '#555', letterSpacing: '0.12em', textTransform: 'uppercase' };
const hint: React.CSSProperties = { fontSize: 11, color: '#888', lineHeight: 1.6, margin: '0 0 10px' };

function Sect({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginTop: 18, marginBottom: 8, paddingTop: 12, borderTop: '1px solid #222' }}>
      <span style={{ fontSize: 11, color: '#666', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</span>
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
        <span style={{ fontSize: 11, color: '#777', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <input type="number" min={min} max={max} step={step} value={value.toFixed(dec)}
            onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) onChange(Math.max(min, Math.min(max, v))); }}
            style={{ width: 56, background: '#232323', border: '1px solid #2e2e2e', color: '#ccc', fontSize: 10, fontFamily: '"Courier New", monospace', padding: '2px 5px', borderRadius: 3, textAlign: 'right', outline: 'none' }}
          />
          {unit && <span style={{ fontSize: 10, color: '#888' }}>{unit}</span>}
        </div>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', accentColor: '#555' }}
      />
    </div>
  );
}
