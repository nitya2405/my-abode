# FOTOGRAPHER — ABODE

> Browser-based image & video effects studio. No server. No installs. All processing runs in your browser.

---

## What it is

A creative tool for applying high-quality visual effects to images and videos in real-time. Upload anything, tweak parameters, export at full resolution. The interface is intentionally terminal-style — monospace fonts, dark background, precise controls.

---

## Effects (11 total)

| Effect | Description |
|--------|-------------|
| **ASCIIKit** | Converts images/video to animated character art with edge detection, custom fonts, and color modes |
| **BlurSuite** | 6 blur modes — Linear, Radial, Zoom, Wave, TB, LR — with grain and RGB shift |
| **Glassify** | Glass distortion with 6 modes: Radial, Glitch, Stripe, Organic, Ripple |
| **Recolor** | Hue shift cycling and gradient map duotone with custom palette builder |
| **Retroman** | Two-color dithering — Floyd-Steinberg, Atkinson, Bayer, and blue-noise |
| **Scanline** | CRT/VHS emulator — phosphor flicker, chroma aberration, tracking bands |
| **Super-G** | Stochastic glitch art — RGB splits, block displacement, stripe corruption |
| **ToneKit** | Halftone — converts luminosity to dots, crosses, rings, and spirals |
| **LoopFlow** | Droste recursive zoom — the image contains itself infinitely |
| **ImageTrack** | Static blob detection with animated connection graph |
| **BabyTrack** | Real-time motion analysis via webcam |

---

## Export

- **Images** — PNG, JPEG, WebP at maximum quality
- **Video (full)** — MP4 (H.264) or WebM (VP9) via WebCodecs offline encoding — frame-perfect, no choppiness
- **Video (clips)** — Short clips from animated effects
- **Video scrubber** — Play/pause and seek to any frame on every video-capable effect

---

## Tech Stack

- **Next.js 14** — App Router, client-side canvas rendering
- **TypeScript**
- **styled-components** for layout, **Tailwind** for utilities
- **Three.js** — hero canvas animation on homepage
- **WebCodecs API** — offline video encoding (VP9 + H.264)
- **webm-muxer / mp4-muxer** — container muxing
- **Canvas 2D API** — all effect rendering, CPU-based
- **LocalStorage** — gallery persistence

---

## Running locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project structure

```
app/
  page.tsx              # Homepage
  effects/              # One folder per effect
    asciikit/
    blur-suite/
    glassify/
    recolor/
    retroman/
    scanline/
    super-g/
    tonekit/
    loopflow/
    image-track/
    baby-track/
components/             # Shared UI (EffectLayout, VideoControls, ExportDropdown, ...)
lib/
  effects/              # Effect rendering kernels (pure functions, no side effects)
  effects-data.ts       # Effect registry + design tokens
  export.ts             # MP4/WebM video export
  gallery.ts            # LocalStorage gallery
  utils.ts              # Pixel/color math, edge detection, seeded random
```

---

## License

MIT
