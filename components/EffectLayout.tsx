'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { Upload, ImageDown, Video, ChevronLeft, Bookmark, Check } from 'lucide-react';
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
  padding: 18px 18px 48px;
`;

const BackLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  color: #777;
  text-decoration: none;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  margin-bottom: 16px;
  transition: color 0.15s;
  &:hover { color: #bbb; }
`;

const EffectName = styled.div<{ $hasDesc: boolean }>`
  font-family: 'Courier New', Courier, monospace;
  font-size: 21px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #fff;
  margin-bottom: ${(p) => (p.$hasDesc ? '8px' : '16px')};
`;

const Description = styled.p`
  font-size: 12px;
  color: #888;
  line-height: 1.65;
  margin: 0 0 16px;
`;

const ActionRow = styled.div`
  display: flex;
  gap: 6px;
  margin-bottom: 18px;
`;

const Btn = styled.button<{ $active?: boolean; $danger?: boolean; $disabled?: boolean }>`
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  border: 1px solid ${(p) => (p.$active ? '#4ade80' : '#333')};
  border-radius: 6px;
  padding: 7px 10px;
  font-size: 11px;
  font-family: 'Courier New', Courier, monospace;
  font-weight: 600;
  letter-spacing: 0.08em;
  cursor: ${(p) => (p.$disabled ? 'not-allowed' : 'pointer')};
  transition: background 0.1s, color 0.1s;
  background: ${(p) => p.$danger ? '#7f1d1d' : p.$disabled ? '#1c1c1c' : '#2a2a2a'};
  color: ${(p) => p.$danger ? '#fca5a5' : p.$disabled ? '#444' : '#bbb'};
  &:hover:not(:disabled) {
    background: ${(p) => p.$danger ? '#991b1b' : '#333'};
    color: #fff;
  }
`;

const Divider = styled.div`
  border-top: 1px solid #222;
  margin-bottom: 18px;
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

const Placeholder = styled.div`
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  user-select: none;
  z-index: 1;
`;

const PlaceholderName = styled.div`
  font-family: 'Courier New', Courier, monospace;
  font-size: 52px;
  font-weight: 700;
  color: #1e1e1e;
  letter-spacing: 0.1em;
  text-transform: uppercase;
`;

const PlaceholderHint = styled.div`
  font-size: 13px;
  color: #3a3a3a;
  letter-spacing: 0.05em;
`;

const Canvas = styled.canvas<{ $visible: boolean }>`
  max-width: 96%;
  max-height: 96%;
  object-fit: contain;
  display: ${(p) => (p.$visible ? 'block' : 'none')};
`;

/* ── component ── */

export default function EffectLayout({
  effectName,
  description,
  canvasRef,
  onImageLoad,
  animated = false,
  hasImage = false,
  children,
}: EffectLayoutProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);

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

  const handleExportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasImage) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `${effectName.toLowerCase()}.png`;
    a.click();
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

  const handleExportWebM = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasImage || isRecording) return;
    if (!('captureStream' in canvas)) return;
    const stream = (canvas as any).captureStream(30);
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (e) => chunks.push(e.data);
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
    recorder.start();
    setTimeout(() => recorder.stop(), 10000);
  };

  return (
    <Shell>
      <Panel>
        <BackLink href="/">
          <ChevronLeft size={10} />
          Back
        </BackLink>

        <EffectName $hasDesc={!!description}>{effectName}</EffectName>

        {description && <Description>{description}</Description>}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />

        <ActionRow>
          <Btn as="button" onClick={() => fileInputRef.current?.click()}>
            <Upload size={11} /> Upload
          </Btn>
          <Btn
            as="button"
            onClick={handleExportPNG}
            disabled={!hasImage}
            $disabled={!hasImage}
          >
            <ImageDown size={11} /> PNG
          </Btn>
          <Btn
            as="button"
            onClick={handleExportWebM}
            disabled={!hasImage || isRecording}
            $disabled={!hasImage}
            $danger={isRecording}
          >
            <Video size={11} />
            {isRecording ? 'REC' : 'VIDEO'}
          </Btn>
          <Btn
            as="button"
            onClick={handleSave}
            disabled={!hasImage}
            $disabled={!hasImage}
            $active={savedFeedback}
          >
            {savedFeedback ? <><Check size={11} /> Saved</> : <><Bookmark size={11} /> Save</>}
          </Btn>
        </ActionRow>

        <Divider />

        {children}
      </Panel>

      <Stage>
        {!hasImage && (
          <Placeholder onClick={() => fileInputRef.current?.click()}>
            <PlaceholderName>{effectName}</PlaceholderName>
            <PlaceholderHint>Click to upload an image</PlaceholderHint>
          </Placeholder>
        )}
        <Canvas ref={canvasRef} $visible={hasImage} />
      </Stage>
    </Shell>
  );
}
