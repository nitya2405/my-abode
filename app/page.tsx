'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import HeroCanvas from '@/components/HeroCanvas';
import { C, effects } from '@/lib/effects-data';

export default function HomePage() {
  const [bootText, setBootText] = useState('');
  const [query, setQuery] = useState('');
  const fullBootSequence = '> INITIALIZING ABODE_STUDIO... OK';

  const filtered = query.trim()
    ? effects.filter(e =>
        e.label.toLowerCase().includes(query.toLowerCase()) ||
        e.tags.some(t => t.toLowerCase().includes(query.toLowerCase())) ||
        e.description.toLowerCase().includes(query.toLowerCase())
      )
    : effects;

  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      setBootText(fullBootSequence.slice(0, i));
      i++;
      if (i > fullBootSequence.length) clearInterval(timer);
    }, 40);
    return () => clearInterval(timer);
  }, []);

  const marqueeText = effects.map(e => `[ ${e.label} v${e.version} ]`).join(' ++ ') + ' ++ [ KERNEL READY ] ++ [ GPU_OPT ENABLED ] ++ [ ALL SYSTEMS NOMINAL ]';

  return (
    <div style={{ minHeight: '100%', background: C.bg }}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>

        {/* ── HERO SECTION (CRT TERMINAL REDESIGN) ── */}
        <section className="hero-bg hero-crt hero-flicker hero-section-mobile" style={{
          height: '52vh', minHeight: 460, position: 'relative', overflow: 'hidden',
          borderBottom: `1px solid rgba(0, 255, 65, 0.2)`, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{ position: 'absolute', inset: 0, opacity: 0.15 }}>
            <HeroCanvas />
          </div>

          <div className="hero-content-mobile" style={{ position: 'relative', zIndex: 10, textAlign: 'center', padding: '0 40px' }}>
            {/* Boot Sequence */}
            <div style={{ 
              fontFamily: 'monospace', fontSize: 11, color: '#00ff41', 
              letterSpacing: '0.15em', marginBottom: 16, height: 14, opacity: 0.8
            }}>
              {bootText}<span className="cursor-blink">_</span>
            </div>

            <h1 className="hero-title-mobile" style={{
              fontFamily: 'monospace', fontSize: 56, fontWeight: 900,
              color: '#d7ffc5', letterSpacing: '0.25em', marginBottom: 16,
              textShadow: '0 0 10px #00ff41, 0 0 20px rgba(0, 255, 65, 0.4)'
            }}>
              MY_HUMBLE_ABODE
            </h1>

            <p className="hero-desc-mobile" style={{
              fontSize: 13, color: 'rgba(0, 255, 65, 0.7)', letterSpacing: '0.08em',
              maxWidth: 620, margin: '0 auto 32px', lineHeight: 1.6, fontFamily: 'monospace'
            }}>
              HIGH PERFORMANCE IMAGE PROCESSING KERNELS & NEURAL VISION MODELS.<br />
              BUILT FOR CREATIVE ENGINEERS AND VISUAL RESEARCHERS.
            </p>

            {/* CTA Button */}
            <Link href="#modules" 
              className="terminal-cta"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 10,
                padding: '12px 24px', border: '1px solid #00ff41',
                color: '#00ff41', textDecoration: 'none',
                fontFamily: 'monospace', fontSize: 13, letterSpacing: '0.12em',
                transition: 'all 0.2s ease',
              }}
            >
              [ EXPLORE_MODULES ]<span className="cursor-blink">_</span>
            </Link>
          </div>

          {/* Marquee Ticker */}
          <div className="marquee-container">
            <div className="marquee-content" style={{ fontFamily: 'monospace', fontSize: 10, color: '#00ff41', opacity: 0.8, letterSpacing: '0.1em' }}>
              {marqueeText} &nbsp;&nbsp; {marqueeText}
            </div>
          </div>
        </section>

        {/* ── MODULES ── */}
        <section id="modules" className="modules-section-mobile" style={{ padding: '40px 40px 64px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 8, height: 8, background: C.primary }} />
              <span style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700, color: C.text, letterSpacing: '0.12em' }}>
                AVAILABLE_MODULES
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="SEARCH_MODULES..."
                style={{
                  background: 'transparent', border: `1px solid ${C.border}`,
                  color: C.primary, fontFamily: 'monospace', fontSize: 11,
                  padding: '6px 12px', outline: 'none', letterSpacing: '0.08em',
                  width: 200,
                }}
              />
              <span style={{ fontFamily: 'monospace', fontSize: 10, color: C.textDim, letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
                {filtered.length}/{effects.length} MODULES
              </span>
            </div>
          </div>

          {/* Module grid */}
          <div className="modules-grid-mobile" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
            {filtered.length > 0 ? filtered.map((effect) => (
              <ModuleCard key={effect.slug} effect={effect} />
            )) : (
              <div style={{ gridColumn: '1/-1', padding: '40px 0', fontFamily: 'monospace', fontSize: 12, color: C.textMuted, letterSpacing: '0.1em' }}>
                NO MODULES MATCH &quot;{query}&quot;
              </div>
            )}
          </div>
        </section>

        {/* Footer */}
        <footer className="footer-mobile" style={{ borderTop: `1px solid ${C.border}`, padding: '20px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'monospace', fontSize: 10, color: C.textMuted, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
            ABODE // v1.0
          </span>
          <span style={{ fontFamily: 'monospace', fontSize: 10, color: C.textMuted, letterSpacing: '0.06em' }}>
            {effects.length} EFFECTS LOADED // SYSTEM NOMINAL
          </span>
        </footer>
      </div>
    </div>
  );
}

/* ── Module Card ── */
function ModuleCard({ effect }: { effect: typeof effects[0] }) {
  return (
    <Link href={`/effects/${effect.slug}`} 
      className="module-card"
      style={{ 
        textDecoration: 'none', display: 'block',
        '--hover-accent': effect.accent 
      } as React.CSSProperties}
    >
      <div
        className="module-card-inner"
        style={{ 
          background: C.surface, 
          border: `1px solid ${C.border}`, 
          transition: 'border-color 0.15s, box-shadow 0.15s',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>{effect.icon}</span>
            <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: C.text, letterSpacing: '0.1em' }}>
              {effect.label}
            </span>
          </div>
          {effect.badge && (
            <span style={{ 
              fontSize: 8, padding: '2px 6px', background: effect.badge.color + '20', 
              color: effect.badge.color, border: `1px solid ${effect.badge.color}40`, 
              fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.1em' 
            }}>
              {effect.badge.label}
            </span>
          )}
        </div>
        <div style={{ padding: '20px', flex: 1 }}>
          <p style={{ fontSize: 12, color: C.textDim, lineHeight: 1.6, marginBottom: 16 }}>
            {effect.description}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {effect.tags.map(tag => (
              <span key={tag} style={{ 
                fontSize: 9, padding: '2px 6px', background: C.surfaceHigh, 
                color: C.textDim, border: `1px solid ${C.border}`, 
                fontFamily: 'monospace', letterSpacing: '0.05em' 
              }}>
                {tag}
              </span>
            ))}
          </div>
        </div>
        <div style={{ padding: '12px 20px', background: 'rgba(0,0,0,0.15)', borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 9, fontFamily: 'monospace', color: C.textMuted }}>
            VER: {effect.version}
          </span>
          <span style={{ fontSize: 9, fontFamily: 'monospace', color: effect.latency ? C.primary : C.amber }}>
            {effect.latency ? `LAT: ${effect.latency}` : `STB: ${effect.stability}`}
          </span>
        </div>
      </div>
    </Link>
  );
}
