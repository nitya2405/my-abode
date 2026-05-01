'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { C } from '@/lib/effects-data';

export default function Header() {
  const pathname = usePathname();
  const isEffect = pathname.startsWith('/effects/');

  const navItems = [
    { label: 'EXPLORE', href: '/', active: pathname === '/' },
    { label: 'GALLERY', href: '/gallery', active: pathname === '/gallery' },
  ];

  return (
    <header style={{
      height: 44,
      display: 'flex',
      alignItems: 'stretch',
      borderBottom: `1px solid ${C.border}`,
      background: '#041016',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      {/* Mobile back button — only on effect pages, hidden on desktop */}
      {isEffect && (
        <Link href="/" className="desktop-hide" style={{
          padding: '0 16px',
          height: 44,
          display: 'flex',
          alignItems: 'center',
          textDecoration: 'none',
          fontSize: 11,
          letterSpacing: '0.1em',
          fontFamily: 'monospace',
          color: C.textDim,
          borderBottom: '2px solid transparent',
          gap: 6,
        }}>
          ← <span>BACK</span>
        </Link>
      )}

      {/* Nav links */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '0 24px', gap: 0 }}>
        {navItems.map((item) => (
          <Link key={item.label} href={item.href} style={{
            padding: '0 18px',
            height: 44,
            display: 'flex',
            alignItems: 'center',
            textDecoration: 'none',
            fontSize: 11,
            letterSpacing: '0.1em',
            fontFamily: 'monospace',
            color: item.active ? C.text : C.textDim,
            borderBottom: item.active ? `2px solid ${C.primary}` : '2px solid transparent',
            fontWeight: item.active ? 600 : 400,
            transition: 'color 0.15s',
          }}>
            {item.active ? '' : '[ '}{item.label}{item.active ? '' : ' ]'}
          </Link>
        ))}
      </div>
    </header>
  );
}
