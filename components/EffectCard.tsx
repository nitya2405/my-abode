'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { TagBadge } from './TagBadge';

interface EffectCardProps {
  name: string;
  description: string;
  href: string;
  tags: string[];
  image: string;
}

export function EffectCard({ name, description, href, tags, image }: EffectCardProps) {
  return (
    <Link href={href} className="group relative bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-indigo-500 hover:shadow-[0_0_20px_rgba(79,70,229,0.2)] transition-all flex flex-col h-full">
      <div className="aspect-[16/10] overflow-hidden relative">
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute top-3 left-3 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <TagBadge key={tag} label={tag} variant={tag === 'Popular' ? 'popular' : tag === 'Experimental' ? 'experimental' : 'default'} />
          ))}
        </div>
      </div>
      <div className="p-5 flex flex-col flex-grow">
        <h3 className="text-xl font-bold text-white mb-2">{name}</h3>
        <p className="text-zinc-400 text-sm mb-4 flex-grow">{description}</p>
        <div className="flex items-center text-indigo-400 font-semibold group-hover:translate-x-1 transition-transform">
          Try it now <ArrowRight className="w-4 h-4 ml-2" />
        </div>
      </div>
    </Link>
  );
}
