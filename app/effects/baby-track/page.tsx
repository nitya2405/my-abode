'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { saveCanvasToGallery } from '@/lib/gallery';
import { detectVideoFormats, startCanvasRecording, VideoFormat } from '@/lib/export';
import {
  detectBlobs,
  renderImageTrack,
  ImageTrackParams,
  Blob as TrackBlob,
} from '@/lib/effects/image-track';

const SHAPES = ['Circle', 'Rect', 'Pill'];
const STYLES = ['Basic', 'Scope', 'Frame', 'Dash', 'Cross', 'Label', 'Particle'];
const FILTERS = ['None', 'Thermal', 'Tone', 'Inv', 'Pixel', 'Blur', 'Glitch'];

const hint: React.CSSProperties = { fontSize: 11, color: '#888', lineHeight: 1.6, margin: '0 0 10px' };

export default function BabyTrackPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const offRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const blobsRef = useRef<TrackBlob[]>([]);
  const frameRef = useRef(0);
  const paramsRef = useRef<ImageTrackParams & { mirror: boolean }>(null as any);

  const [isActive, setIsActive] = useState(false);
  const [mirror, setMirror] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const [videoFormats, setVideoFormats] = useState<VideoFormat[]>([]);
  useEffect(() => { setVideoFormats(detectVideoFormats()); }, []);
  const [params, setParams] = useState<ImageTrackParams>({
    shape: 'circle',
    regionStyle: 'scope',
    filterEffect: 'none',
    invert: false,
    blobCount: 8,
    threshold: 140,
    minSize: 200,
  });

  // Keep a ref so the rAF loop always reads fresh params without restarting
  useEffect(() => {
    paramsRef.current = { ...params, mirror };
  }, [params, mirror]);

  const tick = useCallback((timestamp: number) => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    const w = video.videoWidth;
    const h = video.videoHeight;
    if (w === 0 || h === 0) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    if (!offRef.current) offRef.current = document.createElement('canvas');
    const off = offRef.current;
    if (off.width !== w || off.height !== h) {
      off.width = w;
      off.height = h;
      canvas.width = w;
      canvas.height = h;
    }

    const offCtx = off.getContext('2d')!;
    const p = paramsRef.current;

    if (p?.mirror) {
      offCtx.save();
      offCtx.translate(w, 0);
      offCtx.scale(-1, 1);
      offCtx.drawImage(video, 0, 0);
      offCtx.restore();
    } else {
      offCtx.drawImage(video, 0, 0);
    }

    const imageData = offCtx.getImageData(0, 0, w, h);

    // Re-detect blobs every 8 frames — blob detection is expensive
    if (frameRef.current % 8 === 0) {
      blobsRef.current = detectBlobs(imageData, p ?? params);
    }
    frameRef.current++;

    const rendered = renderImageTrack(imageData, blobsRef.current, p ?? params, timestamp);
    canvas.getContext('2d')!.putImageData(rendered, 0, 0);

    rafRef.current = requestAnimationFrame(tick);
  }, []); // no deps — reads everything from refs

  const startCamera = async () => {
    setCamError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
      });
      streamRef.current = stream;
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      setIsActive(true);
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      setCamError('Camera access was denied or is unavailable.');
    }
  };

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    blobsRef.current = [];
    frameRef.current = 0;
    setIsActive(false);
    // Clear canvas
    const canvas = canvasRef.current;
    if (canvas) canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  // Cleanup on unmount
  useEffect(() => () => stopCamera(), [stopCamera]);

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
    a.href = canvas.toDataURL(mime, 0.92);
    a.download = `babytrack.${fmt}`;
    a.click();
    setShowExport(false);
  };

  const exportVideo = (fmt: VideoFormat, secs: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !isActive || isRecording) return;
    startCanvasRecording(
      canvas, fmt, secs, 'babytrack',
      () => setIsRecording(true),
      () => setIsRecording(false),
    );
    setShowExport(false);
  };

  const set = (patch: Partial<ImageTrackParams>) => setParams((p) => ({ ...p, ...patch }));

  const btnBase: React.CSSProperties = {
    padding: '7px 10px', border: '1px solid #333', borderRadius: 6,
    fontSize: 11, fontFamily: '"Courier New", monospace', fontWeight: 600,
    letterSpacing: '0.08em', cursor: 'pointer', background: '#2a2a2a', color: '#fff',
  };
  const menuItem: React.CSSProperties = {
    display: 'block', width: '100%', padding: '8px 14px', background: 'transparent',
    color: '#bbb', border: 'none', cursor: 'pointer', textAlign: 'left',
    fontSize: 11, fontFamily: '"Courier New", monospace', letterSpacing: '0.05em',
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: 'system-ui, sans-serif' }} onClick={() => showExport && setShowExport(false)}>
      {/* Hidden video element for webcam feed */}
      <video ref={videoRef} style={{ display: 'none' }} playsInline muted />

      {/* LEFT PANEL */}
      <div style={{
        width: 360, minWidth: 360, background: '#1a1a1a',
        borderRight: '1px solid #222', overflowY: 'auto', overflowX: 'hidden',
        display: 'flex', flexDirection: 'column', padding: '18px 18px 48px',
      }}>
        <Link href="/" style={{ fontSize: 10, color: '#888', textDecoration: 'none', letterSpacing: '0.18em', marginBottom: 18, display: 'block', textTransform: 'uppercase' }}>
          ← Back
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{ fontFamily: '"Courier New", monospace', fontSize: 21, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#fff' }}>
            BABYTRACK
          </div>
          <span style={{ fontSize: 10, background: '#4ade80', color: '#000', fontWeight: 700, padding: '2px 8px', borderRadius: 20, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Live
          </span>
        </div>

        <p style={{ fontSize: 12, color: '#888', lineHeight: 1.65, margin: '0 0 16px' }}>
          Real-time blob tracking on your webcam feed. Detects high-contrast regions and draws animated connections between them by color, size, and proximity affinity.
        </p>

        {/* Camera + Save + Export buttons */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 6 }} onClick={(e) => e.stopPropagation()}>
          <button
            onClick={isActive ? stopCamera : startCamera}
            style={{
              ...btnBase, flex: 1,
              background: isActive ? '#4ade80' : '#2a2a2a',
              color: isActive ? '#000' : '#fff',
              borderColor: isActive ? '#4ade80' : '#333',
            }}
          >
            {isActive ? '● Stop' : 'Camera'}
          </button>
          <button
            onClick={handleSave}
            disabled={!isActive}
            style={{
              ...btnBase, flex: 'none' as const,
              background: savedFeedback ? '#14532d' : isActive ? '#2a2a2a' : '#1c1c1c',
              color: savedFeedback ? '#4ade80' : isActive ? '#bbb' : '#444',
              border: savedFeedback ? '1px solid #166534' : '1px solid #333',
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
                background: isRecording ? '#7f1d1d' : isActive ? '#2a2a2a' : '#1c1c1c',
                color: isRecording ? '#fca5a5' : isActive ? '#bbb' : '#444',
                cursor: isRecording ? 'wait' : isActive ? 'pointer' : 'not-allowed',
              }}
            >
              {isRecording ? '● REC' : 'Export ▾'}
            </button>
            {showExport && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: '#131313', border: '1px solid #2a2a2a', borderRadius: 8, overflow: 'hidden', zIndex: 200 }}>
                <div style={{ padding: '6px 12px 4px', fontSize: 9, color: '#555', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Snapshot</div>
                {(['PNG', 'JPEG', 'WebP'] as const).map((f) => (
                  <button key={f} onClick={() => exportImage(f.toLowerCase() as 'png' | 'jpeg' | 'webp')} style={menuItem}>{f}</button>
                ))}
                {videoFormats.map((fmt) => (
                  <div key={fmt.mime}>
                    <div style={{ borderTop: '1px solid #222', margin: '4px 0' }} />
                    <div style={{ padding: '4px 12px 4px', fontSize: 9, color: '#555', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Video — {fmt.label}</div>
                    {[5, 10, 30].map((s) => (
                      <button key={s} onClick={() => exportVideo(fmt, s)} style={menuItem}>Clip — {s}s</button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Mirror toggle */}
        <button
          onClick={() => setMirror((m) => !m)}
          style={{ ...btnBase, width: '100%', marginBottom: 14, background: mirror ? '#2a2a2a' : '#1c1c1c', color: mirror ? '#fff' : '#555' }}
        >
          Mirror {mirror ? 'On' : 'Off'}
        </button>

        {camError && (
          <div style={{ fontSize: 11, color: '#f87171', background: '#1c0a0a', border: '1px solid #3f1010', borderRadius: 6, padding: '8px 10px', marginBottom: 12 }}>
            {camError}
          </div>
        )}

        <div style={{ borderTop: '1px solid #222', marginBottom: 18 }} />

        {/* Controls — same as ImageTrack */}
        <Sect label="Tracker Shape" />
        <p style={hint}>The marker drawn around each detected blob.</p>
        <BtnGrid options={SHAPES} value={params.shape} cols={3}
          onChange={(v) => set({ shape: v.toLowerCase() as ImageTrackParams['shape'] })} />

        <Sect label="Style" />
        <p style={hint}>Scope = animated radar rings. Frame = corner brackets. Particle = connection dots pulse.</p>
        <BtnGrid options={STYLES} value={params.regionStyle} cols={4}
          onChange={(v) => set({ regionStyle: v.toLowerCase() as ImageTrackParams['regionStyle'] })} />

        <Sect label="Filter" />
        <p style={hint}>Color filter applied to the base feed. Thermal and Glitch are especially striking on live video.</p>
        <BtnGrid options={FILTERS} value={params.filterEffect} cols={4}
          onChange={(v) => set({ filterEffect: v.toLowerCase() as ImageTrackParams['filterEffect'] })} />

        <Sect label="Detection" />
        <p style={hint}>
          Blob Count = max tracked regions. Threshold = brightness cutoff.
          Min Size = minimum area — raise to ignore noise and background movement.
        </p>
        <SliderRow label="Blob Count" value={params.blobCount} min={2} max={20} step={1}
          display={params.blobCount.toString()} onChange={(v) => set({ blobCount: v })} />
        <SliderRow label="Threshold" value={params.threshold} min={0} max={255} step={1}
          display={params.threshold.toString()} onChange={(v) => set({ threshold: v })} />
        <SliderRow label="Min Size" value={params.minSize} min={50} max={3000} step={50}
          display={params.minSize.toString()} onChange={(v) => set({ minSize: v })} />
      </div>

      {/* RIGHT PANEL */}
      <div style={{
        flex: 1, background: '#0a0a0a', display: 'flex', alignItems: 'center',
        justifyContent: 'center', overflow: 'hidden', position: 'relative',
      }}>
        {!isActive && (
          <div
            onClick={startCamera}
            style={{ position: 'absolute', textAlign: 'center', cursor: 'pointer', userSelect: 'none', zIndex: 1 }}
          >
            <div style={{ fontFamily: '"Courier New", monospace', fontSize: 52, fontWeight: 900, color: '#1a1a1a', letterSpacing: '0.1em', marginBottom: 16 }}>
              BABYTRACK
            </div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: '#1e1e1e', border: '1px solid #333', borderRadius: 8,
              padding: '12px 24px', fontSize: 13, color: '#666', letterSpacing: '0.04em',
            }}>
              <span style={{ fontSize: 18 }}>◉</span> Click to start camera
            </div>
          </div>
        )}
        <canvas
          ref={canvasRef}
          style={{
            maxWidth: '96%', maxHeight: '96%', objectFit: 'contain',
            display: isActive ? 'block' : 'none',
          }}
        />
      </div>
    </div>
  );
}

/* ── sub-components ── */

function Sect({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginTop: 14, marginBottom: 7, paddingTop: 12, borderTop: '1px solid #222' }}>
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
        const isActive = value === opt.toLowerCase() || value === opt;
        return (
          <button key={opt} onClick={() => onChange(opt)} style={{
            padding: '6px 4px', fontSize: 11, borderRadius: 5, border: 'none', cursor: 'pointer',
            fontFamily: '"Courier New", monospace', fontWeight: isActive ? 700 : 500,
            background: isActive ? '#fff' : '#2a2a2a', color: isActive ? '#000' : '#aaa',
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
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 11, color: '#777', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
        <span style={{ fontSize: 11, color: '#ccc', fontFamily: '"Courier New", monospace' }}>{display}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', accentColor: '#4ade80' }} />
    </div>
  );
}
