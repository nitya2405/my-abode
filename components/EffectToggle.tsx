'use client';

import React from 'react';

interface EffectToggleProps {
  label: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

export function EffectToggle({ label, enabled, onChange }: EffectToggleProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <label className="text-sm font-medium text-zinc-400">{label}</label>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
          enabled ? 'bg-indigo-600' : 'bg-zinc-800'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}
