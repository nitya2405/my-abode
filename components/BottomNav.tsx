'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { C } from '@/lib/effects-data';

export default function BottomNav() {
  const pathname = usePathname();
  const isHome    = pathname === '/';
  const isGallery = pathname === '/gallery';
  const isEffect  = pathname.startsWith('/effects/');

  return (
    <nav className="bottom-nav">
      <Link href="/" className="bottom-nav-item" style={{ color: isHome ? C.primary : C.textDim }}>
        <span style={{ fontSize: 18 }}>▣</span>
        <span style={{ fontSize: 9, fontFamily: 'monospace', letterSpacing: '0.08em' }}>HOME</span>
      </Link>

      {isEffect && (
        <Link href="/" className="bottom-nav-item" style={{ color: C.textDim }}>
          <span style={{ fontSize: 18 }}>←</span>
          <span style={{ fontSize: 9, fontFamily: 'monospace', letterSpacing: '0.08em' }}>BACK</span>
        </Link>
      )}

      <Link href="/gallery" className="bottom-nav-item" style={{ color: isGallery ? C.primary : C.textDim }}>
        <span style={{ fontSize: 18 }}>◫</span>
        <span style={{ fontSize: 9, fontFamily: 'monospace', letterSpacing: '0.08em' }}>GALLERY</span>
      </Link>
    </nav>
  );
}
