'use client';
import { useState } from 'react';
import { VideoFormat } from '@/lib/export';
import { C } from '@/lib/effects-data';

interface ExportDropdownProps {
  onImageExport: (fmt: 'png' | 'jpeg' | 'webp') => void;
  // Clip recording (animated image effects)
  onClipExport?: (fmt: VideoFormat, secs: number) => void;
  videoFormats?: VideoFormat[];
  isRecording?: boolean;
  // Full offline video export (video-source effects)
  onFullExport?: () => void;
  isVideoSource?: boolean;
  isExporting?: boolean;
  exportProgress?: number;
}

const tabBtn = (active: boolean): React.CSSProperties => ({
  flex: 1, padding: '8px 0', border: 'none',
  borderBottom: active ? `2px solid ${C.primary}` : '2px solid transparent',
  background: active ? C.surfaceHigh : 'transparent',
  color: active ? C.text : C.textDim,
  cursor: 'pointer', fontSize: 10,
  fontFamily: '"Courier New", monospace',
  fontWeight: 700, letterSpacing: '0.12em',
  textTransform: 'uppercase',
  transition: 'color 0.12s, background 0.12s',
});

const fmtBtn: React.CSSProperties = {
  padding: '10px 4px', fontSize: 11, border: `1px solid ${C.border}`,
  background: C.surfaceHigh, color: C.primary, cursor: 'pointer',
  fontFamily: '"Courier New", monospace', fontWeight: 700, letterSpacing: '0.06em',
};

const subLabel: React.CSSProperties = {
  fontSize: 9, color: C.textMuted, fontFamily: 'monospace',
  letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8,
};

export default function ExportDropdown({
  onImageExport,
  onClipExport,
  videoFormats = [],
  isRecording = false,
  onFullExport,
  isVideoSource = false,
  isExporting = false,
  exportProgress = 0,
}: ExportDropdownProps) {
  const [tab, setTab] = useState<'image' | 'video'>('image');

  return (
    <div style={{ background: '#041016', border: `1px solid ${C.border}`, overflow: 'hidden' }}>

      {/* ── Tab row ── */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}` }}>
        <button style={tabBtn(tab === 'image')} onClick={() => setTab('image')}>⬜ Image</button>
        <button style={tabBtn(tab === 'video')} onClick={() => setTab('video')}>▶ Video</button>
      </div>

      {/* ── Image tab ── */}
      {tab === 'image' && (
        <div style={{ padding: 8 }}>
          <div style={subLabel}>Lossless / Maximum quality</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5 }}>
            {(['PNG', 'JPEG', 'WebP'] as const).map((f) => (
              <button
                key={f}
                onClick={() => onImageExport(f.toLowerCase() as 'png' | 'jpeg' | 'webp')}
                style={fmtBtn}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Video tab ── */}
      {tab === 'video' && (
        <div style={{ padding: 8 }}>
          {isVideoSource && onFullExport ? (
            // Full offline export for video-source effects
            isExporting ? (
              <>
                <div style={{ height: 3, background: C.surfaceHigh, marginBottom: 6 }}>
                  <div style={{
                    height: 3, background: C.green, transition: 'width 0.2s',
                    width: `${Math.round(exportProgress * 100)}%`,
                  }} />
                </div>
                <div style={{ fontSize: 10, color: C.green, textAlign: 'center', fontFamily: 'monospace', letterSpacing: '0.06em' }}>
                  {Math.round(exportProgress * 100)}% — encoding VP9…
                </div>
              </>
            ) : (
              <>
                <div style={subLabel}>VP9 WebM · 25 Mbps · Source Resolution</div>
                <button
                  onClick={onFullExport}
                  style={{ ...fmtBtn, width: '100%', border: `1px solid ${C.primary}40`, letterSpacing: '0.08em' }}
                >
                  Export Full Video ↓
                </button>
              </>
            )
          ) : onClipExport && videoFormats.length > 0 ? (
            // Clip recording for animated image effects
            <>
              <div style={subLabel}>{videoFormats[0]?.label} · 25 Mbps</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5 }}>
                {[5, 10, 30].map((s) => (
                  <button
                    key={s}
                    onClick={() => onClipExport(videoFormats[0], s)}
                    disabled={isRecording}
                    style={{
                      ...fmtBtn,
                      background: isRecording ? '#3b0a0a' : C.surfaceHigh,
                      color: isRecording ? '#ff6b6b' : C.primary,
                      border: isRecording ? '1px solid #ff4a4a40' : `1px solid ${C.border}`,
                      cursor: isRecording ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {s}s
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 11, color: C.textMuted, fontFamily: 'monospace', textAlign: 'center', padding: '10px 0' }}>
              No video source loaded
            </div>
          )}
        </div>
      )}
    </div>
  );
}
