'use client';

import React from 'react';

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function ColorPicker({ label, value, onChange }: ColorPickerProps) {
  return (
    <div className="flex items-center justify-between">
      <label className="text-sm font-medium text-zinc-400">{label}</label>
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono text-zinc-500 uppercase">{value}</span>
        <div className="relative w-8 h-8 rounded-full overflow-hidden border border-zinc-700">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-[-50%] w-[200%] h-[200%] cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}
