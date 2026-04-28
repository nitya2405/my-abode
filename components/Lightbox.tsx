'use client';

import React from 'react';
import { X, Download, Trash2 } from 'lucide-react';

interface LightboxProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  effectName: string;
  onDelete?: () => void;
}

export function Lightbox({ isOpen, onClose, imageUrl, effectName, onDelete }: LightboxProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col p-4 md:p-8 animate-in fade-in duration-200">
      <div className="flex justify-between items-center mb-4">
        <div className="flex flex-col">
          <h2 className="text-xl font-bold text-white">{effectName} Result</h2>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={imageUrl}
            download={`fotographer-${effectName.toLowerCase()}.png`}
            className="p-2 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-colors"
          >
            <Download className="w-6 h-6" />
          </a>
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-2 hover:bg-red-500/20 rounded-full text-zinc-400 hover:text-red-500 transition-colors"
            >
              <Trash2 className="w-6 h-6" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>
      <div className="flex-grow flex items-center justify-center overflow-hidden">
        <img
          src={imageUrl}
          alt="Gallery result"
          className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
        />
      </div>
    </div>
  );
}
