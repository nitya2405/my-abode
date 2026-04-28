'use client';

import Link from 'next/link';
import HeroCanvas from '@/components/HeroCanvas';

const effects = [
  {
    slug: 'asciikit',
    name: 'ASCIIKit',
    label: 'ASCIIKIT',
    description: 'Render images as character art. In overlay modes, characters animate over detected edges in real time.',
    tags: ['Animated'],
    badge: null,
    accent: '#facc15',
  },
  {
    slug: 'baby-track',
    name: 'BabyTrack',
    label: 'BABYTRACK',
    description: 'Real-time blob tracking on your webcam feed. Detects high-contrast regions and connects them with animated lines based on color, size, and proximity affinity.',
    tags: ['Live'],
    badge: { label: 'Live', color: '#4ade80' },
    accent: '#4ade80',
  },
  {
    slug: 'blur-suite',
    name: 'BlurSuite',
    label: 'BLURSUITE',
    description: 'Radial, zoom, linear, and wave blur modes. Simulates motion, depth-of-field, and optical distortion.',
    tags: ['Static'],
    badge: null,
    accent: '#60a5fa',
  },
  {
    slug: 'glassify',
    name: 'Glassify',
    label: 'GLASSIFY',
    description: 'Stacks copies of the image with rotation and offset to simulate light refracted through layered glass.',
    tags: ['Animated'],
    badge: { label: 'Experimental', color: '#f59e0b' },
    accent: '#67e8f9',
  },
  {
    slug: 'image-track',
    name: 'ImageTrack',
    label: 'IMAGETRACK',
    description: 'Detects blobs by contrast and draws animated connections between them based on color, size, and proximity affinity.',
    tags: ['Animated'],
    badge: null,
    accent: '#f87171',
  },
  {
    slug: 'loopflow',
    name: 'LoopFlow',
    label: 'LOOPFLOW',
    description: 'Infinite Droste zoom — the image recursively contains itself. Animates continuously with full iteration control.',
    tags: ['Animated'],
    badge: { label: 'Experimental', color: '#f59e0b' },
    accent: '#818cf8',
  },
  {
    slug: 'recolor',
    name: 'ReColor',
    label: 'RECOLOR',
    description: 'Remap image hues with animated cycling. Shift colors across a span or apply gradient-map duotone grading.',
    tags: ['Animated'],
    badge: null,
    accent: '#fb923c',
  },
  {
    slug: 'retroman',
    name: 'Retroman',
    label: 'RETROMAN',
    description: 'Two-color dithering engine. Floyd-Steinberg, Atkinson, Bayer, and blue-noise algorithms with custom background color.',
    tags: ['Static'],
    badge: null,
    accent: '#c084fc',
  },
  {
    slug: 'scanline',
    name: 'Scanline',
    label: 'SCANLINE',
    description: 'CRT and VHS emulator. Phosphor flicker, chroma aberration, tracking bands, and digital block corruption.',
    tags: ['Animated'],
    badge: null,
    accent: '#34d399',
  },
  {
    slug: 'super-g',
    name: 'Super-G',
    label: 'SUPER-G',
    description: 'Live glitch art engine. RGB splits, image blocks, stripe corruption, and scanline jitter — randomized every frame.',
    tags: ['Animated'],
    badge: null,
    accent: '#f472b6',
  },
  {
    slug: 'tonekit',
    name: 'ToneKit',
    label: 'TONEKIT',
    description: 'Converts image luminosity into repeating shapes — dots, crosses, rings, spirals. Classic halftone with full geometric control.',
    tags: ['Static'],
    badge: { label: 'Popular', color: '#22c55e' },
    accent: '#a3e635',
  },
];

export default function HomePage() {
  return (
    <div style={{ minHeight: '100vh', background: '#080808', color: '#fff' }}>
      {/* Header */}
      <header
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          background: 'rgba(8,8,8,0.88)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 28px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link
            href="/"
            style={{
              fontFamily: '"Courier New", Courier, monospace',
              fontSize: 14,
              fontWeight: 700,
              color: '#fff',
              textDecoration: 'none',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
            }}
          >
            Abode
          </Link>
          <nav style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
            <Link href="/" style={{ fontSize: 13, color: '#fff', textDecoration: 'none', fontWeight: 500, letterSpacing: '0.02em' }}>
              Explore
            </Link>
            <Link href="/gallery" style={{ fontSize: 13, color: '#555', textDecoration: 'none', letterSpacing: '0.02em' }}>
              Gallery
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <div style={{ position: 'relative', overflow: 'hidden' }}>
      <HeroCanvas />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 28px', paddingTop: 128, paddingBottom: 72, position: 'relative', zIndex: 1 }}>
        {/* Accent strip */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 40 }}>
          {effects.map((e) => (
            <div
              key={e.slug}
              style={{
                width: 24,
                height: 3,
                borderRadius: 2,
                background: e.accent,
                opacity: 0.8,
              }}
            />
          ))}
        </div>

        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontFamily: '"Courier New", Courier, monospace',
              fontSize: 'clamp(36px, 5vw, 64px)',
              fontWeight: 900,
              color: '#fff',
              letterSpacing: '-0.01em',
              lineHeight: 1.05,
            }}
          >
            Image Effects
          </div>
          <div
            style={{
              fontFamily: '"Courier New", Courier, monospace',
              fontSize: 'clamp(36px, 5vw, 64px)',
              fontWeight: 900,
              color: '#333',
              letterSpacing: '-0.01em',
              lineHeight: 1.05,
            }}
          >
            Studio
          </div>
        </div>

        <p style={{ fontSize: 15, color: '#999', maxWidth: 480, lineHeight: 1.7, marginBottom: 64 }}>
          Ten creative tools for glitch art, ASCII rendering, halftone patterns, motion blur, color cycling, and more.
          Upload an image — export a PNG or 10-second video.
        </p>

        {/* Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 14,
          }}
        >
          {effects.map((effect) => (
            <EffectCard key={effect.slug} effect={effect} />
          ))}
        </div>
      </div>
      </div>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.04)', marginTop: 80, padding: '32px 28px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span
            style={{
              fontFamily: '"Courier New", Courier, monospace',
              fontSize: 11,
              color: '#555',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
            }}
          >
            Abode
          </span>
          <span style={{ fontSize: 12, color: '#555' }}>Creative image effects studio</span>
        </div>
      </footer>
    </div>
  );
}

function EffectCard({ effect }: { effect: typeof effects[0] }) {
  return (
    <Link href={`/effects/${effect.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div
        style={{
          borderRadius: 10,
          border: '1px solid rgba(255,255,255,0.06)',
          background: '#0d0d0d',
          overflow: 'hidden',
          transition: 'border-color 0.2s, transform 0.15s',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = `${effect.accent}35`;
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.06)';
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
        }}
      >
        {/* Top accent bar */}
        <div style={{ height: 2, background: effect.accent, opacity: 0.65 }} />

        {/* Thumbnail */}
        <div
          style={{
            height: 164,
            background: '#0a0a0a',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {/* Radial glow */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `radial-gradient(circle at 50% 60%, ${effect.accent}12 0%, transparent 65%)`,
            }}
          />
          {/* Big background label */}
          <span
            style={{
              position: 'absolute',
              fontFamily: '"Courier New", Courier, monospace',
              fontSize: 42,
              fontWeight: 900,
              color: effect.accent,
              opacity: 0.07,
              letterSpacing: '-0.02em',
              userSelect: 'none',
            }}
          >
            {effect.name}
          </span>
          {/* SVG pattern */}
          <EffectThumbnail slug={effect.slug} accent={effect.accent} />

          {/* Badge */}
          {effect.badge && (
            <div style={{ position: 'absolute', top: 12, left: 12 }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  background: effect.badge.color,
                  color: '#000',
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: 20,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
              >
                {effect.badge.label}
              </span>
            </div>
          )}

          {/* Tag pill — top right */}
          <div style={{ position: 'absolute', top: 12, right: 12 }}>
            {effect.tags.map((tag) => (
              <span
                key={tag}
                style={{
                  display: 'inline-block',
                  fontSize: 10,
                  color: tag === 'Animated' || tag === 'Live' ? effect.accent : '#555',
                  border: `1px solid ${tag === 'Animated' || tag === 'Live' ? effect.accent + '50' : '#222'}`,
                  borderRadius: 4,
                  padding: '2px 8px',
                  letterSpacing: '0.04em',
                  background: tag === 'Animated' || tag === 'Live' ? effect.accent + '12' : 'transparent',
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '14px 18px 18px' }}>
          <h2
            style={{
              fontFamily: '"Courier New", Courier, monospace',
              fontSize: 13,
              fontWeight: 700,
              color: '#fff',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              margin: '0 0 8px',
            }}
          >
            {effect.label}
          </h2>
          <p
            style={{
              fontSize: 12,
              color: '#888',
              lineHeight: 1.65,
              margin: '0 0 14px',
            }}
          >
            {effect.description}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span
              style={{
                fontSize: 11,
                color: effect.accent,
                opacity: 0.6,
                fontFamily: '"Courier New", monospace',
                letterSpacing: '0.06em',
              }}
            >
              Open →
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function EffectThumbnail({ slug, accent }: { slug: string; accent: string }) {
  const svgStyle = { position: 'absolute' as const, inset: 0, width: '100%', height: '100%', opacity: 0.4 };

  switch (slug) {
    case 'baby-track':
      return (
        <svg style={svgStyle} viewBox="0 0 300 164">
          {/* Concentric scan rings */}
          <circle cx={150} cy={82} r={60} fill="none" stroke={accent} strokeWidth={1} opacity={0.3} />
          <circle cx={150} cy={82} r={40} fill="none" stroke={accent} strokeWidth={1} opacity={0.45} />
          <circle cx={150} cy={82} r={20} fill="none" stroke={accent} strokeWidth={1.5} opacity={0.6} />
          {/* Crosshair */}
          <line x1={150} y1={30} x2={150} y2={55} stroke={accent} strokeWidth={1} opacity={0.5} />
          <line x1={150} y1={109} x2={150} y2={134} stroke={accent} strokeWidth={1} opacity={0.5} />
          <line x1={90} y1={82} x2={115} y2={82} stroke={accent} strokeWidth={1} opacity={0.5} />
          <line x1={185} y1={82} x2={210} y2={82} stroke={accent} strokeWidth={1} opacity={0.5} />
          {/* Center dot */}
          <circle cx={150} cy={82} r={4} fill={accent} opacity={0.9} />
          {/* Satellite blobs */}
          {[[60, 38], [230, 50], [240, 130], [55, 130]].map(([cx, cy], i) => (
            <g key={i}>
              <circle cx={cx} cy={cy} r={12} fill="none" stroke={accent} strokeWidth={1} opacity={0.4} />
              <circle cx={cx} cy={cy} r={3} fill={accent} opacity={0.7} />
              <line x1={cx} y1={cy} x2={150} y2={82} stroke={accent} strokeWidth={0.6} opacity={0.2} strokeDasharray="4,4" />
            </g>
          ))}
        </svg>
      );
    case 'tonekit':
      return (
        <svg style={svgStyle} viewBox="0 0 300 164">
          {Array.from({ length: 7 }).map((_, row) =>
            Array.from({ length: 12 }).map((_, col) => {
              const r = 2 + ((row + col) % 5) * 1.8;
              return <circle key={`${row}-${col}`} cx={col * 26 + 13} cy={row * 24 + 12} r={r} fill={accent} />;
            })
          )}
        </svg>
      );
    case 'blur-suite':
      return (
        <svg style={svgStyle} viewBox="0 0 300 164">
          {Array.from({ length: 7 }).map((_, i) => (
            <ellipse key={i} cx={150} cy={82} rx={18 + i * 20} ry={6 + i * 8} fill="none" stroke={accent} strokeWidth={1} opacity={1 - i * 0.12} />
          ))}
        </svg>
      );
    case 'super-g':
      return (
        <svg style={svgStyle} viewBox="0 0 300 164">
          {Array.from({ length: 9 }).map((_, i) => (
            <rect key={i} x={Math.sin(i * 37) * 50 + 80} y={i * 18} width={90 + i * 10} height={13} fill={accent} opacity={0.25 + (i % 3) * 0.2} rx={1} />
          ))}
        </svg>
      );
    case 'scanline':
      return (
        <svg style={svgStyle} viewBox="0 0 300 164">
          {Array.from({ length: 14 }).map((_, i) => (
            <line key={i} x1={0} y1={i * 12 + 6} x2={300} y2={i * 12 + 6} stroke={accent} strokeWidth={i % 3 === 0 ? 2 : 0.5} opacity={i % 3 === 0 ? 0.6 : 0.2} />
          ))}
        </svg>
      );
    case 'recolor':
      return (
        <svg style={svgStyle} viewBox="0 0 300 164">
          <defs>
            <linearGradient id="rc" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={accent} />
              <stop offset="40%" stopColor="#ff6b9d" />
              <stop offset="100%" stopColor="#60a5fa" />
            </linearGradient>
          </defs>
          <rect width={300} height={164} fill="url(#rc)" opacity={0.35} />
          {Array.from({ length: 5 }).map((_, i) => (
            <circle key={i} cx={50 + i * 50} cy={82} r={28 - i * 2} fill="none" stroke="white" strokeWidth={0.5} opacity={0.25} />
          ))}
        </svg>
      );
    case 'asciikit':
      return (
        <svg style={svgStyle} viewBox="0 0 300 164">
          {['@ # % & *', '. , - ~ :', '+ = # @ !', '░ ▒ ▓ █ ▄', '. , - ~ .', '@ # % & *'].map((row, i) => (
            <text key={i} x={16} y={24 + i * 24} fontFamily="monospace" fontSize={13} fill={accent} opacity={0.55} letterSpacing={10}>{row}</text>
          ))}
        </svg>
      );
    case 'retroman':
      return (
        <svg style={svgStyle} viewBox="0 0 300 164">
          {Array.from({ length: 11 }).map((_, row) =>
            Array.from({ length: 18 }).map((_, col) => {
              const on = (row + col) % 2 === 0;
              return on ? <rect key={`${row}-${col}`} x={col * 17} y={row * 15} width={15} height={13} fill={accent} opacity={0.35} /> : null;
            })
          )}
        </svg>
      );
    case 'glassify':
      return (
        <svg style={svgStyle} viewBox="0 0 300 164">
          {Array.from({ length: 5 }).map((_, i) => (
            <ellipse key={i} cx={100 + i * 22} cy={82} rx={38 + i * 10} ry={46 - i * 4} fill="none" stroke={accent} strokeWidth={1} opacity={0.4} />
          ))}
          <ellipse cx={150} cy={82} rx={55} ry={55} fill={accent} opacity={0.06} />
        </svg>
      );
    case 'image-track':
      return (
        <svg style={svgStyle} viewBox="0 0 300 164">
          {[[55, 35], [175, 55], [235, 115], [115, 140], [75, 95], [195, 40]].map(([cx, cy], i, arr) => (
            <g key={i}>
              <circle cx={cx} cy={cy} r={16} fill="none" stroke={accent} strokeWidth={1} opacity={0.5} />
              <circle cx={cx} cy={cy} r={3} fill={accent} opacity={0.9} />
              {i < arr.length - 1 && (
                <line x1={cx} y1={cy} x2={arr[i + 1][0]} y2={arr[i + 1][1]} stroke={accent} strokeWidth={0.8} opacity={0.3} strokeDasharray="4,4" />
              )}
            </g>
          ))}
        </svg>
      );
    case 'loopflow':
      return (
        <svg style={svgStyle} viewBox="0 0 300 164">
          {Array.from({ length: 7 }).map((_, i) => {
            const s = 1 - i * 0.13;
            return (
              <rect
                key={i}
                x={150 - 100 * s}
                y={82 - 60 * s}
                width={200 * s}
                height={120 * s}
                fill="none"
                stroke={accent}
                strokeWidth={1}
                opacity={0.55 - i * 0.06}
                rx={3}
                transform={`rotate(${i * 9} 150 82)`}
              />
            );
          })}
        </svg>
      );
    default:
      return null;
  }
}
