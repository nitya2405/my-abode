'use client';

import React from 'react';

interface EffectSelectProps {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: any) => void;
}

export function EffectSelect({ label, value, options, onChange }: EffectSelectProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-zinc-400">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-dark bg-zinc-900 border-zinc-800 focus:ring-indigo-500"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
