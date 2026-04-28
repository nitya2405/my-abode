'use client';

import React, { useEffect, useRef } from 'react';

interface CanvasProps {
  imageData: ImageData | null;
  className?: string;
}

export function Canvas({ imageData, className }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current && imageData) {
      const canvas = canvasRef.current;
      canvas.width = imageData.width;
      canvas.height = imageData.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.putImageData(imageData, 0, 0);
      }
    }
  }, [imageData]);

  return (
    <div className={`relative overflow-hidden rounded-lg bg-zinc-950 flex items-center justify-center min-h-[300px] border border-zinc-800 ${className}`}>
      {!imageData && (
        <div className="text-zinc-500 text-sm">
          No image uploaded
        </div>
      )}
      <canvas
        ref={canvasRef}
        className="max-w-full max-h-full object-contain"
      />
    </div>
  );
}
