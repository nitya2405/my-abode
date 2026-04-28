'use client';

import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface TagBadgeProps {
  label: string;
  variant?: 'default' | 'popular' | 'experimental';
}

export function TagBadge({ label, variant = 'default' }: TagBadgeProps) {
  return (
    <span
      className={cn(
        "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
        variant === 'default' && "bg-zinc-800 text-zinc-400",
        variant === 'popular' && "bg-amber-500/20 text-amber-500 border border-amber-500/20",
        variant === 'experimental' && "bg-purple-500/20 text-purple-400 border border-purple-500/20"
      )}
    >
      {label}
    </span>
  );
}
