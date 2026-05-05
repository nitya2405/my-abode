'use client';
import { useEffect, useRef, useState } from 'react';
import { C } from '@/lib/effects-data';

interface VideoControlsProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  /** If provided, called for play/pause instead of direct video.play/pause.
   *  Use this when the parent manages a videoPaused state that gates the rAF loop. */
  onToggle?: () => void;
}

function fmt(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
}

export default function VideoControls({ videoRef, onToggle }: VideoControlsProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [paused, setPaused] = useState(false);
  const dragging = useRef(false);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const tick = () => {
      if (!dragging.current) setCurrentTime(video.currentTime);
      setPaused(video.paused);
      setDuration(video.duration || 0);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [videoRef]);

  const togglePlay = () => {
    if (onToggle) { onToggle(); return; }
    const v = videoRef.current;
    if (!v) return;
    v.paused ? v.play() : v.pause();
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'linear-gradient(transparent, rgba(4,16,22,0.92) 40%)',
        padding: '28px 14px 12px',
        display: 'flex', alignItems: 'center', gap: 10,
      }}
    >
      <button
        onClick={togglePlay}
        style={{
          flexShrink: 0, width: 28, height: 28,
          background: 'rgba(172,199,253,0.08)', border: `1px solid ${C.border}`,
          color: C.primary, cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          fontSize: 9, fontFamily: 'monospace',
        }}
      >
        {paused ? '▶' : '⏸'}
      </button>

      <span style={{ fontSize: 10, color: C.textMuted, fontFamily: 'monospace', flexShrink: 0, letterSpacing: '0.04em' }}>
        {fmt(currentTime)}
      </span>

      <input
        type="range"
        min={0}
        max={duration || 1}
        step={0.01}
        value={currentTime}
        onMouseDown={() => { dragging.current = true; }}
        onTouchStart={() => { dragging.current = true; }}
        onMouseUp={() => { dragging.current = false; }}
        onTouchEnd={() => { dragging.current = false; }}
        onChange={(e) => {
          const t = parseFloat(e.target.value);
          setCurrentTime(t);
          if (videoRef.current) videoRef.current.currentTime = t;
        }}
        style={{ flex: 1, accentColor: C.primary, cursor: 'pointer' }}
      />

      <span style={{ fontSize: 10, color: C.textMuted, fontFamily: 'monospace', flexShrink: 0, letterSpacing: '0.04em' }}>
        {fmt(duration)}
      </span>
    </div>
  );
}
