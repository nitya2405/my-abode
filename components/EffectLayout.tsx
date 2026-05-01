'use client';

import React, { useRef, useState, useEffect } from 'react';
import styled from 'styled-components';
import { saveCanvasToGallery } from '@/lib/gallery';
import { detectVideoFormats, startCanvasRecording, VideoFormat } from '@/lib/export';
import { C } from '@/lib/effects-data';

interface EffectLayoutProps {
  effectName: string;
  description?: string;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  onImageLoad: (imageData: ImageData) => void;
  animated?: boolean;
  hasImage?: boolean;
  children: React.ReactNode;
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

const sHdr: React.CSSProperties = {
  padding: '6px 12px 4px', fontSize: 9, color: C.textMuted,
  letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: 'monospace',
};
const btnStyle: React.CSSProperties = {
  flex: 1, padding: '7px 10px', background: C.surfaceHigh, color: C.primary,
  border: `1px solid ${C.border}`, borderRadius: 0, cursor: 'pointer',
  fontSize: 11, fontFamily: '"Courier New", monospace', fontWeight: 600,
  letterSpacing: '0.08em',
};
const menuItemStyle: React.CSSProperties = {
  display: 'block', width: '100%', padding: '8px 14px', background: 'transparent',
  color: C.primary, border: 'none', cursor: 'pointer', textAlign: 'left',
  fontSize: 11, fontFamily: '"Courier New", monospace', letterSpacing: '0.05em',
};

export default function EffectLayout({
  effectName,
  description,
  canvasRef,
  onImageLoad,
  hasImage = false,
  children,
}: EffectLayoutProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [videoFormats, setVideoFormats] = useState<VideoFormat[]>([]);
  useEffect(() => { setVideoFormats(detectVideoFormats()); }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      onImageLoad(ctx.getImageData(0, 0, img.width, img.height));
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(file);
    e.target.value = '';
  };

  const exportImage = (fmt: 'png' | 'jpeg' | 'webp') => {
    const canvas = canvasRef.current;
    if (!canvas || !hasImage) return;
    const mime = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' }[fmt];
    const a = document.createElement('a');
    a.href = canvas.toDataURL(mime, 0.92);
    a.download = `${effectName.toLowerCase()}.${fmt}`;
    a.click();
    setShowExport(false);
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

  return (
    <Shell onClick={() => showExport && setShowExport(false)}>
      <Panel>
        <PanelTop>
          <EffectName>{effectName}</EffectName>
          {description && <Description>{description}</Description>}

          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />

          <div style={{ display: 'flex', gap: 6 }} onClick={(e) => e.stopPropagation()}>
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

            <div style={{ position: 'relative', flex: 1 }}>
              <button
                onClick={() => hasImage && !isRecording && setShowExport((v) => !v)}
                style={{
                  ...btnStyle, width: '100%',
                  background: isRecording ? '#3b0a0a' : C.surfaceHigh,
                  color: isRecording ? '#ff6b6b' : hasImage ? C.primary : C.textMuted,
                  border: isRecording ? '1px solid #ff4a4a40' : `1px solid ${C.border}`,
                  cursor: isRecording ? 'wait' : hasImage ? 'pointer' : 'not-allowed',
                }}
              >
                {isRecording ? '● REC' : 'Export ▾'}
              </button>

              {showExport && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 2, background: '#041016', border: `1px solid ${C.border}`, overflow: 'hidden', zIndex: 200 }}>
                  <div style={sHdr}>Image frame</div>
                  {(['PNG', 'JPEG', 'WebP'] as const).map((f) => (
                    <button key={f} onClick={() => exportImage(f.toLowerCase() as 'png' | 'jpeg' | 'webp')} style={menuItemStyle}>{f}</button>
                  ))}
                  {videoFormats.map((fmt) => (
                    <div key={fmt.mime}>
                      <div style={{ borderTop: `1px solid ${C.border}40`, margin: '4px 0' }} />
                      <div style={sHdr}>Video — {fmt.label}</div>
                      {[5, 10, 30].map((s) => (
                        <button key={s} onClick={() => exportVideo(fmt, s)} style={menuItemStyle}>Clip — {s}s</button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </PanelTop>

        <div style={{ borderTop: `1px solid ${C.border}` }} />
        <PanelBody>{children}</PanelBody>
      </Panel>

      <Stage>
        {!hasImage && (
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{ color: 'rgba(172,199,253,0.08)', textAlign: 'center', userSelect: 'none', cursor: 'pointer' }}
          >
            <div style={{ fontFamily: '"Courier New", monospace', fontSize: 52, fontWeight: 900, letterSpacing: '0.1em', marginBottom: 12 }}>
              {effectName}
            </div>
            <div style={{ fontSize: 13, color: 'rgba(172,199,253,0.25)', letterSpacing: '0.08em', fontFamily: 'monospace' }}>
              [ CLICK TO UPLOAD IMAGE ]
            </div>
          </div>
        )}
        <Canvas ref={canvasRef} $visible={hasImage} />
      </Stage>
    </Shell>
  );
}
