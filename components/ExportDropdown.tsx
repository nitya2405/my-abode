'use client';
import { VideoFormat } from '@/lib/export';
import { C } from '@/lib/effects-data';

interface ExportDropdownProps {
  onImageExport: (fmt: 'png' | 'jpeg' | 'webp') => void;
  onClipExport?: (fmt: VideoFormat, secs: number) => void;
  videoFormats?: VideoFormat[];
  isRecording?: boolean;
  onFullExport?: () => void;
  isVideoSource?: boolean;
  isExporting?: boolean;
  exportProgress?: number;
}

const sHdr: React.CSSProperties = {
  padding: '6px 12px 4px', fontSize: 9, color: C.textMuted,
  letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: 'monospace',
};
const item: React.CSSProperties = {
  display: 'block', width: '100%', padding: '8px 14px', background: 'transparent',
  color: C.primary, border: 'none', cursor: 'pointer', textAlign: 'left',
  fontSize: 11, fontFamily: '"Courier New", monospace', letterSpacing: '0.05em',
};
const divider: React.CSSProperties = {
  borderTop: `1px solid ${C.border}`, margin: '4px 0',
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
  const hasVideoSection =
    (isVideoSource && !!onFullExport) ||
    (!isVideoSource && !!onClipExport && videoFormats.length > 0);

  return (
    <div style={{
      background: '#041016',
      border: `1px solid ${C.border}`,
      overflow: 'hidden',
      minWidth: 200,
    }}>

      {/* ── Image ── */}
      <div style={sHdr}>Image — max quality</div>
      {(['PNG', 'JPEG', 'WebP'] as const).map((f) => (
        <button
          key={f}
          onClick={() => onImageExport(f.toLowerCase() as 'png' | 'jpeg' | 'webp')}
          style={item}
        >
          {f}
        </button>
      ))}

      {/* ── Video ── */}
      {hasVideoSection && (
        <>
          <div style={divider} />

          {isVideoSource && onFullExport ? (
            isExporting ? (
              <div style={{ padding: '8px 14px 10px' }}>
                <div style={{ height: 2, background: C.surfaceHigh, marginBottom: 6 }}>
                  <div style={{
                    height: 2, background: C.green, transition: 'width 0.2s',
                    width: `${Math.round(exportProgress * 100)}%`,
                  }} />
                </div>
                <span style={{ fontSize: 10, color: C.green, fontFamily: 'monospace', letterSpacing: '0.06em' }}>
                  {Math.round(exportProgress * 100)}% — encoding VP9…
                </span>
              </div>
            ) : (
              <>
                <div style={sHdr}>Video — VP9 WebM · 25 Mbps</div>
                <button onClick={onFullExport} style={item}>Export Full Video</button>
              </>
            )
          ) : onClipExport && videoFormats.length > 0 && (
            <>
              <div style={sHdr}>Video — {videoFormats[0]?.label}</div>
              {[5, 10, 30].map((s) => (
                <button
                  key={s}
                  onClick={() => onClipExport(videoFormats[0], s)}
                  disabled={isRecording}
                  style={{
                    ...item,
                    color: isRecording ? C.textMuted : C.primary,
                    cursor: isRecording ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isRecording ? '● Recording…' : `Clip — ${s}s`}
                </button>
              ))}
            </>
          )}
        </>
      )}

    </div>
  );
}
