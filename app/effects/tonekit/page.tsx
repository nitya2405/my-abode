'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { renderTonekit, TonekitParams } from '@/lib/effects/tonekit';
import { saveCanvasToGallery } from '@/lib/gallery';
import { detectVideoFormats, startCanvasRecording, VideoFormat } from '@/lib/export';

const MAX_DIM = 1200;

const SHAPE_COLORS = [
  '#000000','#222222','#444444','#666666','#888888','#cccccc',
  '#ffffff','#facc15','#fb923c','#f87171','#f472b6','#c084fc',
  '#818cf8','#60a5fa','#34d399','#4ade80','#a3e635','#00bcd4',
  '#ff5722','#e91e63',
];
const BG_COLORS = [
  '#000000','#0a0a0a','#1a1a1a','#222222','#444444','#888888',
  '#ffffff','#f0f0f0','#e0e0e0','#cccccc','#facc15','#fb923c',
  '#f87171','#f472b6','#c084fc','#818cf8','#60a5fa','#34d399',
  '#4ade80','#9c27b0',
];

const SHAPES = ['Square','Circle','Cross','Triangle','Line','Spiral','Hexagon','Ring','Stroke','Polar','Capsule','Heart'];

const DEFAULT_PARAMS: TonekitParams = {
  shape: 'circle',
  sample: 24,
  scale: 0.5,
  rotation: 0,
  invert: false,
  thresholdMode: false,
  threshold: 128,
  useOriginalColor: false,
  shapeColor: '#ffffff',
  bgColor: '#000000',
  bgTransparent: false,
  overlayOriginal: false,
  overlayOpacity: 0.7,
  overlayBlur: 0,
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

export default function TonekitPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRafRef = useRef<number>(0);
  const imageRafRef = useRef<number>(0);

  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [params, setParams] = useState<TonekitParams>(DEFAULT_PARAMS);
  const [showExport, setShowExport] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [videoPaused, setVideoPaused] = useState(false);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const paramsRef = useRef(params);
  useEffect(() => { paramsRef.current = params; }, [params]);
  const [videoFormats, setVideoFormats] = useState<VideoFormat[]>([]);
  useEffect(() => { setVideoFormats(detectVideoFormats()); }, []);

  const hasMedia = mediaType !== null;

  useEffect(() => {
    if (mediaType !== 'image' || !imageData || !canvasRef.current) return;
    cancelAnimationFrame(imageRafRef.current);
    imageRafRef.current = requestAnimationFrame(() => {
      if (canvasRef.current) renderTonekit(canvasRef.current, imageData, params);
    });
    return () => cancelAnimationFrame(imageRafRef.current);
  }, [imageData, params, mediaType]);

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
      renderTonekit(canvasRef.current, vCtx.getImageData(0, 0, w, h), paramsRef.current);
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

  const exportImage = (fmt: 'png' | 'jpeg' | 'webp') => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const mime = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' }[fmt];
    const a = document.createElement('a');
    a.href = canvas.toDataURL(mime, 0.92);
    a.download = `tonekit.${fmt}`;
    a.click();
    setShowExport(false);
  };

  const exportVideo = (fmt: VideoFormat, secs: number, fromStart = false) => {
    const canvas = canvasRef.current;
    if (!canvas || isRecording) return;
    startCanvasRecording(
      canvas, fmt, secs, 'tonekit',
      () => setIsRecording(true),
      () => setIsRecording(false),
      fromStart ? videoRef.current : null,
    );
    setShowExport(false);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasMedia) return;
    const ok = saveCanvasToGallery(canvas, 'ToneKit', 'tonekit', mediaType === 'video' ? 'video' : 'image');
    if (ok) { setSavedFeedback(true); setTimeout(() => setSavedFeedback(false), 1800); }
  };

  const set = <K extends keyof TonekitParams>(key: K) =>
    (val: TonekitParams[K]) => setParams((p) => ({ ...p, [key]: val }));

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
            TONEKIT
          </div>
          <p style={{ fontSize: 12, color: '#888', lineHeight: 1.65, margin: '0 0 14px' }}>
            Halftone pattern generator. Maps image luminosity to repeating geometric shapes with full color and layout control.
          </p>

          <div style={{ display: 'flex', gap: 6 }} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => uploadRef.current?.click()} style={btnStyle}>
              Upload
            </button>
            <input ref={uploadRef} type="file" accept="image/*,video/*" onChange={handleUpload} style={{ display: 'none' }} />

            <button
              onClick={handleSave}
              style={{
                ...btnStyle, flex: 'none',
                background: savedFeedback ? '#14532d' : '#222',
                color: savedFeedback ? '#4ade80' : hasMedia ? '#bbb' : '#444',
                cursor: hasMedia ? 'pointer' : 'not-allowed',
                border: savedFeedback ? '1px solid #166534' : '1px solid #333',
              }}
            >
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
                  <div style={{ padding: '6px 12px 4px', fontSize: 9, color: '#444', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Image frame</div>
                  {(['PNG', 'JPEG', 'WebP'] as const).map((f) => (
                    <button key={f} onClick={() => exportImage(f.toLowerCase() as 'png' | 'jpeg' | 'webp')} style={menuItem}>{f}</button>
                  ))}
                  <div style={{ borderTop: '1px solid #222', margin: '4px 0' }} />
                  {videoFormats.map((fmt) => (
                    <div key={fmt.mime}>
                      <div style={{ borderTop: '1px solid #222', margin: '4px 0' }} />
                      <div style={{ padding: '4px 12px 4px', fontSize: 9, color: '#444', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Video — {fmt.label}</div>
                      {[5, 10, 30].map((s) => (
                        <button key={s} onClick={() => exportVideo(fmt, s)} style={menuItem}>Clip — {s}s</button>
                      ))}
                      {videoDuration && (
                        <button onClick={() => exportVideo(fmt, Math.ceil(videoDuration), true)} style={{ ...menuItem, color: '#4ade80' }}>
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

          {/* Shape */}
          <Sect label="Shape" />
          <BtnGrid
            options={SHAPES}
            value={params.shape}
            cols={4}
            onChange={(v) => set('shape')(v.toLowerCase() as TonekitParams['shape'])}
          />

          {/* Scale */}
          <Sect label="Scale" />
          <Slider label="Sample"   value={params.sample}   min={4}   max={80}  step={1}    unit="px" onChange={set('sample')} />
          <Slider label="Scale"    value={params.scale}    min={0.05} max={1.0} step={0.05}          onChange={set('scale')} />
          <Slider label="Rotation" value={params.rotation} min={0}   max={360} step={1}    unit="°"  onChange={set('rotation')} />

          {/* Tone */}
          <Sect label="Tone" />
          <Toggle label="Invert"          value={params.invert}         onChange={set('invert')} />
          <Toggle label="Threshold Mode"  value={params.thresholdMode}  onChange={set('thresholdMode')} />
          {params.thresholdMode && (
            <Slider label="Threshold" value={params.threshold} min={0} max={255} step={1} onChange={set('threshold')} />
          )}

          {/* Overlay */}
          <Sect label="Overlay Original" />
          <p style={hint}>ON: original image shows beneath shapes. OFF: solid background — pure halftone art.</p>
          <Toggle label="Enable" value={params.overlayOriginal} onChange={set('overlayOriginal')} />
          {params.overlayOriginal && (
            <>
              <Slider label="Opacity" value={params.overlayOpacity} min={0} max={1}  step={0.02} onChange={set('overlayOpacity')} />
              <Slider label="Blur"    value={params.overlayBlur}    min={0} max={20} step={1}    unit="px" onChange={set('overlayBlur')} />
            </>
          )}

          {/* Color */}
          <Sect label="Shape Color" />
          <Toggle label="Use Original Colors" value={params.useOriginalColor} onChange={set('useOriginalColor')} />
          {!params.useOriginalColor && (
            <ColorPicker colors={SHAPE_COLORS} selected={params.shapeColor} onChange={set('shapeColor')} />
          )}

          {/* Background — only in pure halftone mode */}
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
  hasMedia: boolean;
  mediaType: 'image' | 'video' | null;
  videoPaused: boolean;
  onUpload: () => void;
  onToggle: () => void;
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
        <div
          onClick={(e) => { e.stopPropagation(); onUpload(); }}
          style={{ color: '#3a3a3a', textAlign: 'center', userSelect: 'none', cursor: 'pointer' }}
        >
          <div style={{ fontFamily: '"Courier New", monospace', fontSize: 52, fontWeight: 900, letterSpacing: '0.1em', marginBottom: 12 }}>TONEKIT</div>
          <div style={{ fontSize: 13, color: '#666', letterSpacing: '0.05em' }}>Click to upload an image or video</div>
        </div>
      )}

      <canvas
        ref={canvasRef}
        style={{ maxWidth: '96%', maxHeight: '96%', objectFit: 'contain', display: hasMedia ? 'block' : 'none', cursor: 'default' }}
      />

      {isVideo && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
          opacity: hovered || videoPaused ? 1 : 0,
          transition: 'opacity 0.2s ease',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
            border: '1px solid rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, color: '#fff',
            transition: 'transform 0.15s, background 0.15s',
            transform: hovered ? 'scale(1.08)' : 'scale(1)',
          }}>
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
  fontSize: 11, fontFamily: '"Courier New", monospace', fontWeight: 600,
  letterSpacing: '0.08em',
};
const menuItem: React.CSSProperties = {
  display: 'block', width: '100%', padding: '8px 14px', background: 'transparent',
  color: '#bbb', border: 'none', cursor: 'pointer', textAlign: 'left',
  fontSize: 11, fontFamily: '"Courier New", monospace', letterSpacing: '0.05em',
};
const hint: React.CSSProperties = { fontSize: 11, color: '#888', lineHeight: 1.6, margin: '0 0 10px' };

/* ── sub-components ── */

function Sect({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginTop: 18, marginBottom: 8, paddingTop: 12, borderTop: '1px solid #222' }}>
      <span style={{ fontSize: 11, color: '#666', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</span>
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
          <input
            type="number" min={min} max={max} step={step}
            value={value.toFixed(dec)}
            onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) onChange(Math.max(min, Math.min(max, v))); }}
            style={{ width: 52, background: '#232323', border: '1px solid #2e2e2e', color: '#ccc',
              fontSize: 10, fontFamily: '"Courier New", monospace', padding: '2px 5px',
              borderRadius: 3, textAlign: 'right', outline: 'none' }}
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

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
      <span style={{ fontSize: 12, color: '#888' }}>{label}</span>
      <button onClick={() => onChange(!value)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
        <div style={{ width: 34, height: 19, borderRadius: 10, background: value ? '#e2e2e2' : '#2e2e2e', position: 'relative', transition: 'background 0.18s' }}>
          <div style={{ position: 'absolute', top: 3, left: value ? 16 : 3, width: 13, height: 13, borderRadius: '50%', background: value ? '#000' : '#555', transition: 'left 0.18s' }} />
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
            style={{ width: 26, height: 26, borderRadius: 6, background: c, border: 'none', cursor: 'pointer',
              outline: selected === c ? '2px solid #fff' : '2px solid transparent', outlineOffset: 1, position: 'relative' }}>
            {selected === c && (
              <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, color: ['#ffffff','#f0f0f0','#e0e0e0','#cccccc','#facc15','#a3e635','#4ade80','#34d399'].includes(c) ? '#000' : '#fff' }}>✓</span>
            )}
          </button>
        ))}
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
        <div style={{ width: 26, height: 26, borderRadius: 6, background: selected, border: '1px solid #444', position: 'relative', flexShrink: 0 }}>
          <input type="color" value={selected} onChange={(e) => onChange(e.target.value)}
            style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer', border: 'none', padding: 0 }}
          />
        </div>
        <span style={{ fontSize: 11, color: '#888', letterSpacing: '0.06em' }}>Custom — {selected}</span>
      </label>
    </div>
  );
}
