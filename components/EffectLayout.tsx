'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { saveCanvasToGallery } from '@/lib/gallery';
import { detectVideoFormats, startCanvasRecording, exportGif, VideoFormat } from '@/lib/export';
import { C } from '@/lib/effects-data';
import ExportDropdown from '@/components/ExportDropdown';
import VideoControls from '@/components/VideoControls';

interface EffectLayoutProps {
  effectName: string;
  description?: string;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  onImageLoad: (imageData: ImageData) => void;
  onVideoLoad?: (file: File) => void;
  animated?: boolean;
  hasImage?: boolean;
  children: React.ReactNode;
  isVideoSource?: boolean;
  onFullVideoExport?: (fmt: 'webm' | 'mp4') => void;
  isExporting?: boolean;
  exportProgress?: number;
  videoRef?: React.RefObject<HTMLVideoElement>;
}

const Shell = styled.div`
  display: flex;
  height: calc(100vh - 44px);
  overflow: hidden;
  font-family: 'Space Grotesk', system-ui, sans-serif;
  background: ${C.bg};
  @media (max-width: 767px) {
    flex-direction: column;
    height: auto;
    min-height: calc(100vh - 44px);
    overflow: visible;
  }
`;

const Panel = styled.div`
  width: 320px;
  min-width: 320px;
  background: ${C.surface};
  border-right: 1px solid ${C.border};
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  @media (max-width: 767px) {
    width: 100%;
    min-width: 100%;
    border-right: none;
    border-top: 1px solid ${C.border};
    order: 2;
  }
`;

const PanelTop = styled.div`
  padding: 16px 18px 14px;
`;

const PanelBody = styled.div`
  padding: 0 18px 48px;
  display: flex;
  flex-direction: column;
`;

const EffectName = styled.div`
  font-family: 'Courier New', Courier, monospace;
  font-size: 21px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: ${C.text};
  margin-bottom: 8px;
  text-shadow: 0 0 20px rgba(172,199,253,0.2);
`;

const Description = styled.p`
  font-size: 12px;
  color: ${C.textDim};
  line-height: 1.65;
  margin: 0 0 14px;
`;

const Stage = styled.div`
  flex: 1;
  background: ${C.bg};
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
  @media (max-width: 767px) {
    flex: none;
    height: 42vh;
    min-height: 240px;
    order: 1;
  }
`;

const Canvas = styled.canvas<{ $visible: boolean }>`
  max-width: 96%;
  max-height: 96%;
  object-fit: contain;
  display: ${(p) => (p.$visible ? 'block' : 'none')};
`;

const btnStyle: React.CSSProperties = {
  flex: 1, padding: '7px 10px', background: C.surfaceHigh, color: C.primary,
  border: `1px solid ${C.border}`, borderRadius: 0, cursor: 'pointer',
  fontSize: 11, fontFamily: '"Courier New", monospace', fontWeight: 600,
  letterSpacing: '0.08em',
};

export default function EffectLayout({
  effectName,
  description,
  canvasRef,
  onImageLoad,
  onVideoLoad,
  hasImage = false,
  isVideoSource = false,
  onFullVideoExport,
  isExporting = false,
  exportProgress = 0,
  videoRef,
  animated = false,
  children,
}: EffectLayoutProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const exportBtnRef = useRef<HTMLDivElement>(null);
  const originalCanvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
  const [videoFormats, setVideoFormats] = useState<VideoFormat[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showBeforeAfter, setShowBeforeAfter] = useState(false);
  const [splitPos, setSplitPos] = useState(0.5);
  const [originalImage, setOriginalImage] = useState<ImageData | null>(null);
  const isDraggingSplit = useRef(false);

  useEffect(() => { setVideoFormats(detectVideoFormats()); }, []);

  // Draw original image to overlay canvas when before/after is active
  useEffect(() => {
    const orig = originalCanvasRef.current;
    if (!orig || !originalImage || !showBeforeAfter) return;
    orig.width = originalImage.width;
    orig.height = originalImage.height;
    orig.getContext('2d')!.putImageData(originalImage, 0, 0);
  }, [originalImage, showBeforeAfter]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      switch (e.key.toLowerCase()) {
        case 'u': fileInputRef.current?.click(); break;
        case 's': if (hasImage) handleSave(); break;
        case 'e':
          if (hasImage && !isRecording && !isExporting) {
            if (exportBtnRef.current) {
              const rect = exportBtnRef.current.getBoundingClientRect();
              setDropdownPos({ top: rect.bottom + 2, right: window.innerWidth - rect.right });
            }
            setShowExport(v => !v);
          }
          break;
        case 'b': if (hasImage && !isVideoSource) setShowBeforeAfter(v => !v); break;
        case 'escape': setShowExport(false); setShowBeforeAfter(false); break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasImage, isRecording, isExporting, isVideoSource]);

  // Split-line drag
  const onSplitMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingSplit.current = true;
    const onMove = (mv: MouseEvent) => {
      const stage = stageRef.current;
      if (!stage) return;
      const rect = stage.getBoundingClientRect();
      setSplitPos(Math.max(0.05, Math.min(0.95, (mv.clientX - rect.left) / rect.width)));
    };
    const onUp = () => {
      isDraggingSplit.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const processFile = useCallback((file: File) => {
    if (file.type.startsWith('video/') && onVideoLoad) {
      onVideoLoad(file);
      setShowBeforeAfter(false);
      return;
    }
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, img.width, img.height);
      setOriginalImage(data);
      onImageLoad(data);
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(file);
  }, [onImageLoad, onVideoLoad]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    processFile(file);
  };

  const exportImage = (fmt: 'png' | 'jpeg' | 'webp') => {
    const canvas = canvasRef.current;
    if (!canvas || !hasImage) return;
    const mime = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' }[fmt];
    const a = document.createElement('a');
    a.href = canvas.toDataURL(mime, 1.0);
    a.download = `${effectName.toLowerCase()}.${fmt}`;
    a.click();
    setShowExport(false);
  };

  const exportGifClip = async (secs: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !hasImage || isRecording) return;
    setShowExport(false);
    await exportGif(canvas, effectName.toLowerCase(), secs * 1000);
  };

  const exportVideo = (fmt: VideoFormat, secs: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !hasImage || isRecording) return;
    startCanvasRecording(canvas, fmt, secs, effectName.toLowerCase(), () => setIsRecording(true), () => setIsRecording(false));
    setShowExport(false);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasImage) return;
    const ok = saveCanvasToGallery(canvas, effectName, effectName.toLowerCase().replace(/\s+/g, '-'), 'image');
    if (ok) { setSavedFeedback(true); setTimeout(() => setSavedFeedback(false), 1800); }
  };

  const accept = onVideoLoad ? 'image/*,video/*' : 'image/*';

  return (
    <Shell onClick={() => showExport && setShowExport(false)} style={{ position: 'relative' }}>
      <Panel>
        <PanelTop>
          <EffectName>{effectName}</EffectName>
          {description && <Description>{description}</Description>}

          <input ref={fileInputRef} type="file" accept={accept} onChange={handleFileChange} style={{ display: 'none' }} />

          <div style={{ display: 'flex', gap: 6, marginBottom: 6 }} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => fileInputRef.current?.click()} style={btnStyle}>
              Upload
            </button>

            <button onClick={handleSave} style={{
              ...btnStyle, flex: 'none',
              background: savedFeedback ? '#0a3300' : C.surfaceHigh,
              color: savedFeedback ? C.green : hasImage ? C.primary : C.textMuted,
              border: savedFeedback ? `1px solid ${C.green}40` : `1px solid ${C.border}`,
              cursor: hasImage ? 'pointer' : 'not-allowed',
            }}>
              {savedFeedback ? '✓ Saved' : 'Save'}
            </button>

            <div ref={exportBtnRef} style={{ position: 'relative', flex: 1 }}>
              <button
                onClick={() => {
                  if (!hasImage || isRecording || isExporting) return;
                  if (exportBtnRef.current) {
                    const rect = exportBtnRef.current.getBoundingClientRect();
                    setDropdownPos({ top: rect.bottom + 2, right: window.innerWidth - rect.right });
                  }
                  setShowExport((v) => !v);
                }}
                style={{
                  ...btnStyle, width: '100%',
                  background: isExporting ? '#0a1a12' : isRecording ? '#3b0a0a' : C.surfaceHigh,
                  color: isExporting ? C.green : isRecording ? '#ff6b6b' : hasImage ? C.primary : C.textMuted,
                  border: `1px solid ${isRecording ? '#ff4a4a40' : C.border}`,
                  cursor: isExporting || isRecording ? 'wait' : hasImage ? 'pointer' : 'not-allowed',
                }}
              >
                {isExporting ? `↓ ${Math.round(exportProgress * 100)}%` : isRecording ? '● REC' : 'Export ▾'}
              </button>
            </div>
          </div>

          {/* Before/After toggle — only for image sources */}
          {!isVideoSource && (
            <div onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => hasImage && setShowBeforeAfter(v => !v)}
                title="Toggle Before/After split (B)"
                style={{
                  ...btnStyle, width: '100%',
                  background: showBeforeAfter ? 'rgba(172,199,253,0.1)' : C.surfaceHigh,
                  color: showBeforeAfter ? C.primary : hasImage ? C.textDim : C.textMuted,
                  border: `1px solid ${showBeforeAfter ? C.border : 'rgba(172,199,253,0.08)'}`,
                  cursor: hasImage ? 'pointer' : 'not-allowed',
                  fontSize: 10,
                }}
              >
                {showBeforeAfter ? '◧ Before / After — drag to split' : '◧ Before / After'}
              </button>
            </div>
          )}
        </PanelTop>

        {/* Keyboard hint */}
        <div style={{ padding: '0 18px 10px', fontSize: 9, color: C.textMuted, fontFamily: 'monospace', letterSpacing: '0.08em', lineHeight: 1.8 }}>
          U — upload &nbsp;·&nbsp; S — save &nbsp;·&nbsp; E — export{!isVideoSource ? ' · B — before/after' : ''}
        </div>

        <div style={{ borderTop: `1px solid ${C.border}` }} />
        <PanelBody>{children}</PanelBody>
      </Panel>

      <Stage
        ref={stageRef}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={(e) => { if (!stageRef.current?.contains(e.relatedTarget as Node)) setIsDragOver(false); }}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          const file = e.dataTransfer.files[0];
          if (file) processFile(file);
        }}
        style={isDragOver ? { outline: `2px dashed ${C.primary}`, outlineOffset: -2 } as React.CSSProperties : undefined}
      >
        {!hasImage && (
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{ color: 'rgba(172,199,253,0.08)', textAlign: 'center', userSelect: 'none', cursor: 'pointer' }}
          >
            <div style={{ fontFamily: '"Courier New", monospace', fontSize: 52, fontWeight: 900, letterSpacing: '0.1em', marginBottom: 12 }}>
              {effectName}
            </div>
            <div style={{ fontSize: 13, color: 'rgba(172,199,253,0.25)', letterSpacing: '0.08em', fontFamily: 'monospace' }}>
              {onVideoLoad ? '[ CLICK OR DROP IMAGE / VIDEO ]' : '[ CLICK OR DROP IMAGE ]'}
            </div>
          </div>
        )}

        <Canvas ref={canvasRef} $visible={hasImage} />

        {/* Before/After overlay */}
        {showBeforeAfter && hasImage && originalImage && (
          <>
            {/* Original canvas clipped to left of split */}
            <canvas
              ref={originalCanvasRef}
              style={{
                position: 'absolute', inset: 0, margin: 'auto',
                maxWidth: '96%', maxHeight: '96%', objectFit: 'contain',
                clipPath: `inset(0 ${(1 - splitPos) * 100}% 0 0)`,
                pointerEvents: 'none',
              }}
            />
            {/* Labels */}
            <div style={{ position: 'absolute', top: 12, left: `${splitPos * 48}%`, transform: 'translateX(-50%)', fontSize: 9, fontFamily: 'monospace', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em', pointerEvents: 'none' }}>BEFORE</div>
            <div style={{ position: 'absolute', top: 12, right: `${(1 - splitPos) * 48}%`, transform: 'translateX(50%)', fontSize: 9, fontFamily: 'monospace', color: 'rgba(172,199,253,0.5)', letterSpacing: '0.1em', pointerEvents: 'none' }}>AFTER</div>
            {/* Drag handle */}
            <div
              onMouseDown={onSplitMouseDown}
              style={{
                position: 'absolute', top: 0, bottom: 0,
                left: `${splitPos * 100}%`, width: 2,
                background: 'rgba(255,255,255,0.7)',
                cursor: 'col-resize',
                transform: 'translateX(-50%)',
              }}
            >
              <div style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%,-50%)',
                width: 28, height: 28, borderRadius: '50%',
                background: '#fff', border: '1px solid rgba(0,0,0,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, color: '#333', userSelect: 'none',
              }}>
                ⇔
              </div>
            </div>
          </>
        )}

        {isVideoSource && videoRef && <VideoControls videoRef={videoRef} />}
      </Stage>

      {showExport && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ position: 'fixed', top: dropdownPos.top, right: dropdownPos.right, zIndex: 9999 }}
        >
          <ExportDropdown
            onImageExport={exportImage}
            onClipExport={isVideoSource ? undefined : exportVideo}
            videoFormats={isVideoSource ? [] : videoFormats}
            isRecording={isRecording}
            onFullExport={isVideoSource ? onFullVideoExport : undefined}
            isVideoSource={isVideoSource}
            isExporting={isExporting}
            exportProgress={exportProgress}
            onGifExport={animated && !isVideoSource ? exportGifClip : undefined}
          />
        </div>
      )}
    </Shell>
  );
}
