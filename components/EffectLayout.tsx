'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import styled from 'styled-components';
import { saveCanvasToGallery } from '@/lib/gallery';

interface EffectLayoutProps {
  effectName: string;
  description?: string;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  onImageLoad: (imageData: ImageData) => void;
  animated?: boolean;
  hasImage?: boolean;
  children: React.ReactNode;
}

/* ── styled primitives ── */

const Shell = styled.div`
  display: flex;
  height: 100vh;
  overflow: hidden;
  font-family: system-ui, sans-serif;
  background: #0a0a0a;
`;

const Panel = styled.div`
  width: 360px;
  min-width: 360px;
  background: #1a1a1a;
  border-right: 1px solid #222;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
`;

const PanelTop = styled.div`
  padding: 16px 18px 14px;
`;

const PanelBody = styled.div`
  padding: 0 18px 48px;
  display: flex;
  flex-direction: column;
`;

const BackLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  color: #888;
  text-decoration: none;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  margin-bottom: 14px;
  display: block;
  transition: color 0.15s;
  &:hover { color: #bbb; }
`;

const EffectName = styled.div`
  font-family: 'Courier New', Courier, monospace;
  font-size: 21px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #fff;
  margin-bottom: 8px;
`;

const Description = styled.p`
  font-size: 12px;
  color: #888;
  line-height: 1.65;
  margin: 0 0 14px;
`;

const Stage = styled.div`
  flex: 1;
  background: #0f0f0f;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
`;

const Canvas = styled.canvas<{ $visible: boolean }>`
  max-width: 96%;
  max-height: 96%;
  object-fit: contain;
  display: ${(p) => (p.$visible ? 'block' : 'none')};
`;

/* ── shared button style ── */
const btnStyle: React.CSSProperties = {
  flex: 1, padding: '7px 10px', background: '#222', color: '#bbb',
  border: '1px solid #333', borderRadius: 6, cursor: 'pointer',
  fontSize: 11, fontFamily: '"Courier New", monospace', fontWeight: 600,
  letterSpacing: '0.08em',
};
const menuItemStyle: React.CSSProperties = {
  display: 'block', width: '100%', padding: '8px 14px', background: 'transparent',
  color: '#bbb', border: 'none', cursor: 'pointer', textAlign: 'left',
  fontSize: 11, fontFamily: '"Courier New", monospace', letterSpacing: '0.05em',
};

/* ── component ── */

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
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

  const exportWebM = (secs: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !hasImage || isRecording || !('captureStream' in canvas)) return;
    const stream = (canvas as any).captureStream(30);
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 12_000_000 });
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (ev) => { if (ev.data.size > 0) chunks.push(ev.data); };
    recorder.onstop = () => {
      setIsRecording(false);
      const blob = new window.Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${effectName.toLowerCase()}.webm`;
      a.click();
      URL.revokeObjectURL(url);
    };
    setIsRecording(true);
    recorder.start(100);
    setTimeout(() => recorder.stop(), secs * 1000);
    setShowExport(false);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasImage) return;
    const ok = saveCanvasToGallery(canvas, effectName, effectName.toLowerCase().replace(/\s+/g, '-'), 'image');
    if (ok) {
      setSavedFeedback(true);
      setTimeout(() => setSavedFeedback(false), 1800);
    }
  };

  return (
    <Shell onClick={() => showExport && setShowExport(false)}>
      <Panel>
        <PanelTop>
          <BackLink href="/">
            <ChevronLeft size={10} />← Back
          </BackLink>

          <EffectName>{effectName}</EffectName>
          {description && <Description>{description}</Description>}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />

          <div style={{ display: 'flex', gap: 6 }} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => fileInputRef.current?.click()} style={btnStyle}>
              Upload
            </button>

            <button
              onClick={handleSave}
              style={{
                ...btnStyle, flex: 'none',
                background: savedFeedback ? '#14532d' : '#222',
                color: savedFeedback ? '#4ade80' : hasImage ? '#bbb' : '#444',
                cursor: hasImage ? 'pointer' : 'not-allowed',
                border: savedFeedback ? '1px solid #166534' : '1px solid #333',
              }}
            >
              {savedFeedback ? '✓ Saved' : 'Save'}
            </button>

            <div style={{ position: 'relative', flex: 1 }}>
              <button
                onClick={() => hasImage && !isRecording && setShowExport((v) => !v)}
                style={{
                  ...btnStyle, width: '100%',
                  background: isRecording ? '#7f1d1d' : '#222',
                  color: isRecording ? '#fca5a5' : hasImage ? '#bbb' : '#444',
                  cursor: isRecording ? 'wait' : hasImage ? 'pointer' : 'not-allowed',
                }}
              >
                {isRecording ? '● REC' : 'Export ▾'}
              </button>

              {showExport && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: '#131313', border: '1px solid #2a2a2a', borderRadius: 8, overflow: 'hidden', zIndex: 200 }}>
                  <div style={{ padding: '6px 12px 4px', fontSize: 9, color: '#555', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Image frame</div>
                  {(['PNG', 'JPEG', 'WebP'] as const).map((f) => (
                    <button key={f} onClick={() => exportImage(f.toLowerCase() as 'png' | 'jpeg' | 'webp')} style={menuItemStyle}>{f}</button>
                  ))}
                  <div style={{ borderTop: '1px solid #222', margin: '4px 0' }} />
                  <div style={{ padding: '4px 12px 4px', fontSize: 9, color: '#555', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Video capture (WebM)</div>
                  {[5, 10, 30].map((s) => (
                    <button key={s} onClick={() => exportWebM(s)} style={menuItemStyle}>Clip — {s}s</button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </PanelTop>

        <div style={{ borderTop: '1px solid #222' }} />
        <PanelBody>
          {children}
        </PanelBody>
      </Panel>

      <Stage>
        {!hasImage && (
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{ color: '#3a3a3a', textAlign: 'center', userSelect: 'none', cursor: 'pointer' }}
          >
            <div style={{ fontFamily: '"Courier New", monospace', fontSize: 52, fontWeight: 900, letterSpacing: '0.1em', marginBottom: 12 }}>
              {effectName}
            </div>
            <div style={{ fontSize: 13, color: '#666', letterSpacing: '0.05em' }}>Click to upload an image</div>
          </div>
        )}
        <Canvas ref={canvasRef} $visible={hasImage} />
      </Stage>
    </Shell>
  );
}
