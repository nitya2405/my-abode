'use client';

import React, { useCallback, useRef } from 'react';
import { Upload, Image as ImageIcon } from 'lucide-react';

interface ImageUploaderProps {
  onImageUpload: (imageData: ImageData, base64: string) => void;
}

export function ImageUploader({ onImageUpload }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        onImageUpload(imageData, base64);
      };
      img.src = base64;
    };
    reader.readAsDataURL(file);
  }, [onImageUpload]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      processFile(file);
    }
  }, [processFile]);

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      className="border-2 border-dashed border-zinc-800 rounded-xl p-8 flex flex-col items-center justify-center gap-4 hover:border-indigo-500 hover:bg-indigo-500/5 transition-all cursor-pointer group"
    >
      <input
        type="file"
        ref={inputRef}
        onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
        accept="image/*"
        className="hidden"
      />
      <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center group-hover:scale-110 transition-transform">
        <Upload className="w-6 h-6 text-zinc-400 group-hover:text-indigo-400" />
      </div>
      <div className="text-center">
        <p className="text-zinc-200 font-medium">Click to upload or drag & drop</p>
        <p className="text-zinc-500 text-sm mt-1">PNG, JPG, WEBP up to 10MB</p>
      </div>
    </div>
  );
}
