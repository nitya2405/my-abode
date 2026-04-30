'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { saveCanvasToGallery } from '@/lib/gallery';
import { detectVideoFormats, startCanvasRecording, VideoFormat } from '@/lib/export';
import {
  detectBlobs,
  renderImageTrack,
  ImageTrackParams,
  Blob as TrackBlob,
} from '@/lib/effects/image-track';
import { C, effects } from '@/lib/effects-data';

const SHAPES = ['Circle', 'Rect', 'Pill'];
const BASIC_STYLES = ['Basic', 'Cross', 'Label', 'Frame', 'L-Frame', 'X-Frame', 'Grid', 'Particle', 'Dash', 'Scope', 'Win2K', 'Label2', 'Glow', 'Backdrop'];
const FILTERS = ['None', 'Inv', 'Glitch', 'Thermal', 'Pixel', 'Tone', 'Blur', 'Dither', 'Zoom', 'X-Ray', 'Water', 'Mask', 'CRT', 'Edge'];
const LINE_STYLES = ['Straight', 'Curved', 'Zigzag', 'Pulse'];
const TEXT_POSITIONS = ['Center', 'Top', 'Bottom'];
const TEXT_CONTENTS = ['Random', 'Position', 'Count'];
const FONT_SIZES = [10, 12, 16, 18, 20];
const CONN_RATES = [0, 0.25, 0.5, 0.75, 1];
const BOUNDING_SIZES = [0, 32, 64, 128, 256, 512];
const BLOB_COUNT_PRESETS = [4, 8, 16, 32, 64, 128];
const VIDEO_SPEEDS = [1, 2, 3, 4];

const TRACKER_COLORS = [
  '#ffffff', '#000000', '#00d4ff', '#00e676', '#00cc44', '#a8ff3e',
  '#ffeb3b', '#ff9100', '#ff4081', '#e040fb', '#ff3d00', '#cc0000',
  '#7c4dff', '#2979ff', '#00b8d4', '#00bfa5', '#f48fb1', '#ff6d00',
  '#cddc39', '#4caf50', '#ff5722', '#9c27b0',
];

const DEFAULT_PARAMS: ImageTrackParams = {
  shape: 'circle',
  regionStyle: 'basic',
  filterEffect: 'none',
  invert: false,
  fusion: false,
  blobCount: 8,
  blobCountMode: 'by-size',
  threshold: 140,
  minSize: 200,
  strokeWidth: 1.5,
  boundingSize: 0,
  sameSize: false,
  connectionRate: 0.25,
  lineStyle: 'straight',
  dashed: true,
  dashSize: 5,
  gapSize: 5,
  centerHub: false,
  singleTracking: false,
  blink: false,
  showText: false,
  textPosition: 'center',
  textContent: 'random',
  fontSize: 12,
  trackerColor: '#ffffff',
  crazyMode: false,
};

export default function BabyTrackPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const offRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoSrcRef = useRef<string | null>(null);
  const rafRef = useRef<number>(0);
  const blobsRef = useRef<TrackBlob[]>([]);
  const frameRef = useRef(0);
  const paramsRef = useRef<ImageTrackParams & { mirror: boolean }>(null as any);

  const [sourceMode, setSourceMode] = useState<'camera' | 'video' | null>(null);
  const [mirror, setMirror] = useState(true);
  const [videoSpeed, setVideoSpeed] = useState(1);
  const [isRecording, setIsRecording] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const [videoFormats, setVideoFormats] = useState<VideoFormat[]>([]);
  useEffect(() => { setVideoFormats(detectVideoFormats()); }, []);

  const [params, setParams] = useState<ImageTrackParams>(DEFAULT_PARAMS);
  const isActive = sourceMode !== null;

  useEffect(() => { paramsRef.current = { ...params, mirror }; }, [params, mirror]);

  useEffect(() => {
    if (videoRef.current && sourceMode === 'video') {
      videoRef.current.playbackRate = videoSpeed;
    }
  }, [videoSpeed, sourceMode]);

  const tick = useCallback((timestamp: number) => {
    const video = videoRef.current, canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(tick); return;
    }
    const w = video.videoWidth, h = video.videoHeight;
    if (w === 0 || h === 0) { rafRef.current = requestAnimationFrame(tick); return; }

    if (!offRef.current) offRef.current = document.createElement('canvas');
    const off = offRef.current;
    if (off.width !== w || off.height !== h) { off.width = w; off.height = h; canvas.width = w; canvas.height = h; }

    const offCtx = off.getContext('2d')!;
    const p = paramsRef.current;
    if (p?.mirror && sourceMode === 'camera') {
      offCtx.save(); offCtx.translate(w, 0); offCtx.scale(-1, 1);
      offCtx.drawImage(video, 0, 0); offCtx.restore();
    } else {
      offCtx.drawImage(video, 0, 0);
    }

    const imageData = offCtx.getImageData(0, 0, w, h);
    if (frameRef.current % 8 === 0) blobsRef.current = detectBlobs(imageData, p ?? params);
    frameRef.current++;

    const rendered = renderImageTrack(imageData, blobsRef.current, p ?? params, timestamp);
    canvas.getContext('2d')!.putImageData(rendered, 0, 0);
    rafRef.current = requestAnimationFrame(tick);
  }, [sourceMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const stopSource = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    const video = videoRef.current;
    if (video) {
      video.pause();
      if (video.srcObject) { video.srcObject = null; }
      if (video.src) { video.removeAttribute('src'); video.load(); }
    }
    if (videoSrcRef.current) { URL.revokeObjectURL(videoSrcRef.current); videoSrcRef.current = null; }
    blobsRef.current = []; frameRef.current = 0;
    setSourceMode(null);
    const canvas = canvasRef.current;
    if (canvas) canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  useEffect(() => () => stopSource(), [stopSource]);

  const startCamera = async () => {
    stopSource();
    setCamError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
      });
      streamRef.current = stream;
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      setSourceMode('camera');
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      setCamError('Camera access was denied or is unavailable.');
    }
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('video/')) return;
    e.target.value = '';
    stopSource();
    const url = URL.createObjectURL(file);
    videoSrcRef.current = url;
    const video = videoRef.current!;
    video.src = url;
    video.playbackRate = videoSpeed;
    video.loop = true;
    video.onloadeddata = () => {
      setSourceMode('video');
      video.play().catch(() => {});
      rafRef.current = requestAnimationFrame(tick);
    };
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas || !isActive) return;
    const ok = saveCanvasToGallery(canvas, 'BabyTrack', 'baby-track', 'image');
    if (ok) { setSavedFeedback(true); setTimeout(() => setSavedFeedback(false), 1800); }
  };

  const exportImage = (fmt: 'png' | 'jpeg' | 'webp') => {
    const canvas = canvasRef.current;
    if (!canvas || !isActive) return;
    const mime = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' }[fmt];
    const a = document.createElement('a');
    a.href = canvas.toDataURL(mime, 0.92); a.download = `babytrack.${fmt}`; a.click();
    setShowExport(false);
  };

  const exportVideo = (fmt: VideoFormat, secs: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !isActive || isRecording) return;
    startCanvasRecording(canvas, fmt, secs, 'babytrack', () => setIsRecording(true), () => setIsRecording(false));
    setShowExport(false);
  };

  const set = (patch: Partial<ImageTrackParams>) => setParams((p) => ({ ...p, ...patch }));

  return (
    <div
      style={{ display: 'flex', height: 'calc(100vh - 44px)', overflow: 'hidden', fontFamily: 'system-ui, sans-serif', background: C.bg }}
      onClick={() => showExport && setShowExport(false)}
    >
      <video ref={videoRef} style={{ display: 'none' }} playsInline muted loop />
      <input ref={uploadRef} type="file" accept="video/*" onChange={handleVideoUpload} style={{ display: 'none' }} />

      {/* LEFT PANEL */}
      <div style={{ width: 320, minWidth: 320, background: C.surface, borderRight: `1px solid ${C.border}`, overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column' }}>

        <div style={{ padding: '16px 18px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ fontFamily: '"Courier New", monospace', fontSize: 21, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.text, textShadow: '0 0 20px rgba(172,199,253,0.2)' }}>
              BABYTRACK
            </div>
            {isActive && (
              <span style={{ fontSize: 10, background: C.green, color: C.bg, fontWeight: 700, padding: '2px 8px', borderRadius: 20, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                {sourceMode === 'camera' ? 'Live' : 'Video'}
              </span>
            )}
          </div>
          <p style={{ fontSize: 12, color: C.textDim, lineHeight: 1.65, margin: '0 0 14px' }}>
            Real-time blob tracking on webcam or uploaded video. Detects high-contrast regions and draws animated connections.
          </p>

          <div style={{ display: 'flex', gap: 6, marginBottom: 6 }} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => uploadRef.current?.click()} style={{ ...btnBase, flex: 1 }}>Upload Video</button>
            <button
              onClick={sourceMode === 'camera' ? stopSource : startCamera}
              style={{
                ...btnBase, flex: 1,
                background: sourceMode === 'camera' ? C.green : C.surfaceHigh,
                color: sourceMode === 'camera' ? C.bg : C.primary,
                borderColor: sourceMode === 'camera' ? C.green : C.border,
              }}
            >
              {sourceMode === 'camera' ? '● Stop' : 'Camera'}
            </button>
          </div>

          <div style={{ display: 'flex', gap: 6, marginBottom: 6 }} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={handleSave}
              style={{
                ...btnBase, flex: 1,
                background: savedFeedback ? '#0a3300' : C.surfaceHigh,
                color: savedFeedback ? C.green : isActive ? C.primary : C.textMuted,
                border: savedFeedback ? `1px solid ${C.green}40` : `1px solid ${C.border}`,
                cursor: isActive ? 'pointer' : 'not-allowed',
              }}
            >
              {savedFeedback ? '✓ Saved' : 'Save'}
            </button>
            <div style={{ position: 'relative', flex: 1 }}>
              <button
                onClick={() => isActive && !isRecording && setShowExport((v) => !v)}
                style={{
                  ...btnBase, width: '100%',
                  background: isRecording ? '#3b0a0a' : C.surfaceHigh,
                  color: isRecording ? '#ff6b6b' : isActive ? C.primary : C.textMuted,
                  cursor: isRecording ? 'wait' : isActive ? 'pointer' : 'not-allowed',
                }}
              >
                {isRecording ? '● REC' : 'Export ▾'}
              </button>
              {showExport && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: '#041016', border: `1px solid ${C.border}`, borderRadius: 0, overflow: 'hidden', zIndex: 200 }}>
                  <div style={sHdr}>Snapshot</div>
                  {(['PNG', 'JPEG', 'WebP'] as const).map((f) => (
                    <button key={f} onClick={() => exportImage(f.toLowerCase() as 'png' | 'jpeg' | 'webp')} style={mItem}>{f}</button>
                  ))}
                  {videoFormats.map((fmt) => (
                    <div key={fmt.mime}>
                      <div style={{ borderTop: `1px solid ${C.border}`, margin: '4px 0' }} />
                      <div style={sHdr}>Video — {fmt.label}</div>
                      {[5, 10, 30].map((s) => (
                        <button key={s} onClick={() => exportVideo(fmt, s)} style={mItem}>Clip — {s}s</button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {sourceMode === 'video' && (
            <div style={{ marginTop: 6 }}>
              <div style={{ fontSize: 10, color: C.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Video Speed</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 5 }}>
                {VIDEO_SPEEDS.map((s) => (
                  <button key={s} onClick={() => setVideoSpeed(s)} style={{
                    ...btnBase, padding: '5px 4px', fontSize: 11,
                    background: videoSpeed === s ? C.primary : C.surfaceHigh,
                    color: videoSpeed === s ? C.bg : C.textDim, borderColor: 'transparent',
                  }}>{s}X</button>
                ))}
              </div>
            </div>
          )}

          {sourceMode === 'camera' && (
            <button
              onClick={() => setMirror((m) => !m)}
              style={{ ...btnBase, width: '100%', marginTop: 6, background: mirror ? C.surfaceHigh : C.bg, color: mirror ? C.text : C.textMuted }}
            >
              Mirror {mirror ? 'On' : 'Off'}
            </button>
          )}

          {camError && (
            <div style={{ fontSize: 11, color: '#f87171', background: '#1c0a0a', border: '1px solid #3f1010', borderRadius: 6, padding: '8px 10px', marginTop: 8 }}>
              {camError}
            </div>
          )}
        </div>

        <div style={{ borderTop: `1px solid ${C.border}` }} />

        <div style={{ padding: '0 18px 48px', display: 'flex', flexDirection: 'column' }}>
          <Sect label="Shape" />
          <BtnGrid options={SHAPES} value={params.shape} cols={3}
            onChange={(v) => set({ shape: v.toLowerCase() as ImageTrackParams['shape'] })} />

          <Sect label="Region Style" />
          <BtnGrid options={BASIC_STYLES} value={params.regionStyle} cols={3}
            onChange={(v) => set({ regionStyle: v.toLowerCase().replace(' ', '-') as ImageTrackParams['regionStyle'] })} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, marginBottom: 5, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 11, color: C.textDim, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Filter Effects</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Toggle label="Invert" active={params.invert} onChange={(v) => set({ invert: v })} />
              <Toggle label="Fusion" active={params.fusion} onChange={(v) => set({ fusion: v })} />
            </div>
          </div>
          <BtnGrid options={FILTERS} value={params.filterEffect} cols={3}
            onChange={(v) => set({ filterEffect: v.toLowerCase().replace('-', '') as ImageTrackParams['filterEffect'] })} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 11, color: C.textDim, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Blink</span>
            <Toggle label="" active={params.blink} onChange={(v) => set({ blink: v })} />
          </div>

          <Sect label="Connection" />
          <BtnGrid options={LINE_STYLES} value={params.lineStyle} cols={4}
            onChange={(v) => set({ lineStyle: v.toLowerCase() as ImageTrackParams['lineStyle'] })} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 5, marginBottom: 8 }}>
            {CONN_RATES.map((r) => (
              <button key={r} onClick={() => set({ connectionRate: r })} style={{
                ...btnBase, padding: '5px 4px', fontSize: 10,
                background: params.connectionRate === r ? C.primary : C.surfaceHigh,
                color: params.connectionRate === r ? C.bg : C.textDim, borderColor: 'transparent',
              }}>{r}</button>
            ))}
          </div>

          <Sect label="Stroke Width" />
          <SliderRow label="" value={params.strokeWidth} min={0.5} max={5} step={0.5}
            display={`${params.strokeWidth}px`} onChange={(v) => set({ strokeWidth: v })} />

          <Sect label="Bounding Size" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4, marginBottom: 8 }}>
            {BOUNDING_SIZES.map((s) => (
              <button key={s} onClick={() => set({ boundingSize: s })} style={{
                ...btnBase, padding: '5px 2px', fontSize: 10,
                background: params.boundingSize === s ? C.primary : C.surfaceHigh,
                color: params.boundingSize === s ? C.bg : C.textDim, borderColor: 'transparent',
              }}>{s === 0 ? 'Auto' : s}</button>
            ))}
          </div>

          <Sect label="Blob Count Control" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, marginBottom: 8 }}>
            {(['by-size', 'by-count'] as const).map((m) => (
              <button key={m} onClick={() => set({ blobCountMode: m })} style={{
                ...btnBase, padding: '6px 4px', fontSize: 11,
                background: params.blobCountMode === m ? C.primary : C.surfaceHigh,
                color: params.blobCountMode === m ? C.bg : C.textDim, borderColor: 'transparent',
              }}>{m === 'by-size' ? 'By Size' : 'By Count'}</button>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4, marginBottom: 8 }}>
            {BLOB_COUNT_PRESETS.map((n) => (
              <button key={n} onClick={() => set({ blobCount: n })} style={{
                ...btnBase, padding: '5px 2px', fontSize: 10,
                background: params.blobCount === n ? C.primary : C.surfaceHigh,
                color: params.blobCount === n ? C.bg : C.textDim, borderColor: 'transparent',
              }}>{n}</button>
            ))}
          </div>

          <Sect label="Detection" />
          <SliderRow label="Threshold" value={params.threshold} min={0} max={255} step={1}
            display={params.threshold.toString()} onChange={(v) => set({ threshold: v })} />
          <SliderRow label="Min Size" value={params.minSize} min={50} max={3000} step={50}
            display={params.minSize.toString()} onChange={(v) => set({ minSize: v })} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 11, color: C.textDim, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Single Tracking</span>
            <Toggle label="" active={params.singleTracking} onChange={(v) => set({ singleTracking: v })} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 11, color: C.textDim, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Color and Text</span>
            <Toggle label="Text" active={params.showText} onChange={(v) => set({ showText: v })} />
          </div>

          {params.showText && (
            <>
              <BtnGrid options={TEXT_POSITIONS} value={params.textPosition} cols={3}
                onChange={(v) => set({ textPosition: v.toLowerCase() as ImageTrackParams['textPosition'] })} />
              <BtnGrid options={TEXT_CONTENTS} value={params.textContent} cols={3}
                onChange={(v) => set({ textContent: v.toLowerCase() as ImageTrackParams['textContent'] })} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4, marginBottom: 8 }}>
                {FONT_SIZES.map((s) => (
                  <button key={s} onClick={() => set({ fontSize: s })} style={{
                    ...btnBase, padding: '5px 2px', fontSize: 10,
                    background: params.fontSize === s ? C.primary : C.surfaceHigh,
                    color: params.fontSize === s ? C.bg : C.textDim, borderColor: 'transparent',
                  }}>{s}px</button>
                ))}
              </div>
            </>
          )}

          <div style={{ fontSize: 10, color: C.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 10, marginBottom: 8, fontFamily: 'monospace' }}>Color</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4 }}>
            {TRACKER_COLORS.map((c) => (
              <button
                key={c} onClick={() => set({ trackerColor: c })}
                style={{
                  width: '100%', aspectRatio: '1', borderRadius: 0, border: params.trackerColor === c ? `2px solid ${C.primary}` : `1px solid ${C.border}`,
                  background: c, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {params.trackerColor === c && (
                  <span style={{ color: ['#ffffff', '#ffeb3b', '#cddc39', '#a8ff3e'].includes(c) ? '#000' : '#fff', fontSize: 11, fontWeight: 700 }}>✓</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div style={{ flex: 1, background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
        {!isActive && (
          <div style={{ textAlign: 'center', userSelect: 'none' }}>
            <div style={{ fontFamily: '"Courier New", monospace', fontSize: 52, fontWeight: 900, color: 'rgba(172,199,253,0.08)', letterSpacing: '0.1em', marginBottom: 12 }}>
              BABYTRACK
            </div>
            <div style={{ fontSize: 13, color: 'rgba(172,199,253,0.25)', letterSpacing: '0.08em', fontFamily: 'monospace' }}>
              [ CLICK TO UPLOAD VIDEO OR OPEN CAMERA ]
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 24 }}>
              <div onClick={() => uploadRef.current?.click()} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: C.surfaceHigh, border: `1px solid ${C.border}`, borderRadius: 0, padding: '12px 20px', fontSize: 11, color: C.primary, letterSpacing: '0.1em', cursor: 'pointer', fontFamily: 'monospace' }}>
                ↑ UPLOAD_VIDEO
              </div>
              <div onClick={startCamera} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: C.surfaceHigh, border: `1px solid ${C.border}`, borderRadius: 0, padding: '12px 20px', fontSize: 11, color: C.primary, letterSpacing: '0.1em', cursor: 'pointer', fontFamily: 'monospace' }}>
                ◉ OPEN_CAMERA
              </div>
            </div>
          </div>
        )}
        {sourceMode === 'video' && isActive && (
          <div
            onClick={stopSource}
            style={{ position: 'absolute', top: 14, right: 14, zIndex: 10, background: 'rgba(0,0,0,0.6)', border: `1px solid ${C.border}`, borderRadius: 0, padding: '6px 12px', fontSize: 11, color: C.textDim, cursor: 'pointer', fontFamily: '"Courier New", monospace' }}
          >
            ■ STOP_SOURCE
          </div>
        )}
        <canvas ref={canvasRef} style={{ maxWidth: '96%', maxHeight: '96%', objectFit: 'contain', display: isActive ? 'block' : 'none' }} />
      </div>
    </div>
  );
}

const btnBase: React.CSSProperties = {
  padding: '7px 10px', border: `1px solid ${C.border}`, borderRadius: 0,
  fontSize: 11, fontFamily: '"Courier New", monospace', fontWeight: 600,
  letterSpacing: '0.08em', cursor: 'pointer', background: C.surfaceHigh, color: C.primary,
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

function Toggle({ label, active, onChange }: { label: string; active: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }} onClick={() => onChange(!active)}>
      {label && <span style={{ fontSize: 10, color: active ? C.primary : C.textMuted, letterSpacing: '0.08em', fontFamily: 'monospace' }}>{label}</span>}
      <div style={{
        width: 28, height: 14, background: active ? C.green : C.surfaceHigh,
        border: `1px solid ${active ? C.green + '40' : C.border}`,
        position: 'relative', transition: 'background 0.15s', flexShrink: 0,
      }}>
        <div style={{
          position: 'absolute', top: 1, left: active ? 15 : 1, width: 10, height: 10,
          background: active ? C.bg : C.textMuted, transition: 'left 0.15s',
        }} />
      </div>
    </div>
  );
}

function BtnGrid({ options, value, cols, onChange }: {
  options: string[]; value: string; cols: number; onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 4, marginBottom: 8 }}>
      {options.map((opt) => {
        const key = opt.toLowerCase().replace(' ', '-');
        const isActive = value === key || value === opt.toLowerCase() || value === opt;
        return (
          <button key={opt} onClick={() => onChange(opt)} style={{
            padding: '5px 4px', fontSize: 10, borderRadius: 0, cursor: 'pointer',
            fontFamily: '"Courier New", monospace', fontWeight: isActive ? 700 : 400,
            background: isActive ? C.primary : C.surfaceHigh,
            color: isActive ? C.bg : C.textDim,
            border: isActive ? `1px solid ${C.primary}` : `1px solid ${C.border}`,
          }}>
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function SliderRow({ label, value, min, max, step, display, onChange }: {
  label: string; value: number; min: number; max: number; step: number; display: string; onChange: (v: number) => void;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
          <span style={{ fontSize: 11, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'monospace' }}>{label}</span>
          <span style={{ fontSize: 11, color: C.primary, fontFamily: '"Courier New", monospace' }}>{display}</span>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{ flex: 1, accentColor: C.green }} />
        {!label && <span style={{ fontSize: 10, color: C.textDim, fontFamily: '"Courier New", monospace', minWidth: 30, textAlign: 'right' }}>{display}</span>}
      </div>
    </div>
  );
}
