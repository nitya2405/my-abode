// Shared video format detection, canvas recording, and offline video export

export interface VideoFormat {
  label: string;
  mime: string;
  ext: string;
}

export const VIDEO_BITRATE = 25_000_000; // 25 Mbps

const FORMAT_CANDIDATES: VideoFormat[] = [
  { label: 'WebM  VP9', mime: 'video/webm;codecs=vp9', ext: 'webm' },
  { label: 'WebM  VP8', mime: 'video/webm;codecs=vp8', ext: 'webm' },
  { label: 'MP4  H.264', mime: 'video/mp4;codecs=avc1.42E01E', ext: 'mp4' },
  { label: 'WebM', mime: 'video/webm', ext: 'webm' },
];

export function detectVideoFormats(): VideoFormat[] {
  if (typeof MediaRecorder === 'undefined') return [];
  const seen = new Set<string>();
  return FORMAT_CANDIDATES.filter((f) => {
    if (seen.has(f.mime)) return false;
    if (!MediaRecorder.isTypeSupported(f.mime)) return false;
    seen.add(f.mime);
    return true;
  });
}

/**
 * Clip recording — for animated image-based effects (Scanline, SuperG, etc.).
 * Not for video sources — use exportVideoFull for that instead.
 */
export function startCanvasRecording(
  canvas: HTMLCanvasElement,
  fmt: VideoFormat,
  secs: number,
  filename: string,
  onStart: () => void,
  onStop: () => void,
  seekVideoFirst?: HTMLVideoElement | null,
): void {
  if (!('captureStream' in canvas)) return;

  const doRecord = () => {
    const stream = (canvas as any).captureStream(30);
    const recorder = new MediaRecorder(stream, {
      mimeType: fmt.mime,
      videoBitsPerSecond: VIDEO_BITRATE,
    });
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (ev) => { if (ev.data.size > 0) chunks.push(ev.data); };
    recorder.onstop = () => {
      onStop();
      const blob = new Blob(chunks, { type: fmt.mime.split(';')[0] });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${filename}.${fmt.ext}`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 200);
    };
    onStart();
    recorder.start(100);
    setTimeout(() => recorder.stop(), secs * 1000);
  };

  if (seekVideoFirst) {
    seekVideoFirst.currentTime = 0;
    seekVideoFirst.onseeked = () => {
      (seekVideoFirst as HTMLVideoElement).onseeked = null;
      doRecord();
    };
  } else {
    doRecord();
  }
}

/**
 * Export animated canvas as GIF — captures N frames over `durationMs` milliseconds.
 * Works with any animated effect that continuously renders to canvas via rAF.
 */
export async function exportGif(
  canvas: HTMLCanvasElement,
  filename: string,
  durationMs = 3000,
  fps = 15,
  onProgress?: (pct: number) => void,
): Promise<void> {
  const { GIFEncoder, quantize, applyPalette } = await import('gifenc');

  const w = canvas.width;
  const h = canvas.height;
  const totalFrames = Math.round((durationMs / 1000) * fps);
  const delay = Math.round(1000 / fps);
  const gif = GIFEncoder();
  const ctx = canvas.getContext('2d')!;

  for (let i = 0; i < totalFrames; i++) {
    await new Promise<void>(r => requestAnimationFrame(() => r()));
    const { data } = ctx.getImageData(0, 0, w, h);
    const palette = quantize(data, 256);
    const index = applyPalette(data, palette);
    gif.writeFrame(index, w, h, { palette, delay });
    onProgress?.(i / totalFrames);
  }

  gif.finish();
  const blob = new Blob([gif.bytesView()], { type: 'image/gif' });
  download(blob, `${filename}.gif`);
  onProgress?.(1);
}

/**
 * Full offline video export — renders every source frame through the effect and
 * encodes with WebCodecs (VP9 WebM, highest quality). Falls back to full-duration
 * MediaRecorder if WebCodecs is unavailable (Firefox <130, older Safari).
 *
 * @param video        The source video element
 * @param canvas       The output canvas (effect renders to this)
 * @param renderFrame  Callback: draw one video frame through the effect onto canvas
 * @param filename     Download filename (without extension)
 * @param onProgress   Called with 0→1 as encoding progresses
 */
function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
}

async function findH264Codec(w: number, h: number, fps: number): Promise<string | null> {
  if (typeof VideoEncoder === 'undefined') return null;
  // Try profiles from high to baseline — pick first that hardware supports
  const candidates = [
    'avc1.640033', // High L5.1
    'avc1.640028', // High L4.0
    'avc1.4d0032', // Main L5.0
    'avc1.4d0028', // Main L4.0
    'avc1.42E01E', // Baseline L3.0
    'avc1.42001f', // Baseline L3.1
  ];
  for (const codec of candidates) {
    try {
      const cfg: VideoEncoderConfig = { codec, width: w, height: h, bitrate: 25_000_000, framerate: fps };
      (cfg as any).avc = { format: 'avc' };
      const { supported } = await VideoEncoder.isConfigSupported(cfg);
      if (supported) return codec;
    } catch { /* try next */ }
  }
  return null;
}

function mediaRecorderFull(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  mime: string,
  ext: string,
  filename: string,
  duration: number,
  wasLooping: boolean,
  onProgress: (p: number) => void,
): Promise<void> {
  video.loop = wasLooping;
  return new Promise((resolve) => {
    video.currentTime = 0;
    video.addEventListener('seeked', () => {
      const stream = (canvas as any).captureStream(30);
      const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: VIDEO_BITRATE });
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (ev) => { if (ev.data.size > 0) chunks.push(ev.data); };
      recorder.onstop = () => {
        download(new Blob(chunks, { type: mime.split(';')[0] }), `${filename}.${ext}`);
        resolve();
      };
      onProgress(0);
      recorder.start(100);
      video.play().catch(() => {});
      const iv = setInterval(() => {
        onProgress(Math.min(video.currentTime / duration, 0.99));
        if (video.currentTime >= duration - 0.15) { clearInterval(iv); recorder.stop(); }
      }, 100);
    }, { once: true });
  });
}

export async function exportVideoFull(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  renderFrame: (video: HTMLVideoElement) => void,
  filename: string,
  onProgress: (pct: number) => void,
  format: 'webm' | 'mp4' = 'mp4',
): Promise<void> {
  const w = video.videoWidth;
  const h = video.videoHeight;
  const duration = video.duration;
  const FPS = 30;

  const wasLooping = video.loop;
  video.loop = false;
  video.pause();

  const hasWebCodecs = typeof VideoEncoder !== 'undefined' && typeof VideoFrame !== 'undefined';

  // Seek-based frame loop used by both WebCodecs paths
  const seekAndEncode = async (encodeFrame: (timestampUs: number) => void) => {
    const vid = video;
    await new Promise<void>((resolve) => {
      const total = Math.ceil(duration * FPS);
      let i = 0;
      const next = () => {
        if (i >= total) { resolve(); return; }
        const time = i / FPS;
        vid.currentTime = Math.min(time, duration - 0.001);
        vid.addEventListener('seeked', () => {
          encodeFrame(Math.round(time * 1_000_000));
          onProgress(Math.min((i + 1) / total, 1));
          i++;
          next();
        }, { once: true });
      };
      next();
    });
  };

  // ── MP4 path ──────────────────────────────────────────────────────────────
  if (format === 'mp4') {
    // 1. WebCodecs H.264 + mp4-muxer (best quality, offline, no choppiness)
    if (hasWebCodecs) {
      const h264Codec = await findH264Codec(w, h, FPS);
      if (h264Codec) {
        const { Muxer, ArrayBufferTarget } = await import('mp4-muxer');
        const target = new ArrayBufferTarget();
        const muxer = new Muxer({ target, video: { codec: 'avc', width: w, height: h }, fastStart: 'in-memory' });

        let frameIndex = 0;
        const encoder = new VideoEncoder({
          output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
          error: (e) => console.error('VideoEncoder:', e),
        });
        const encCfg: VideoEncoderConfig = { codec: h264Codec, width: w, height: h, bitrate: 25_000_000, framerate: FPS };
        (encCfg as any).avc = { format: 'avc' };
        encoder.configure(encCfg);

        await seekAndEncode((ts) => {
          renderFrame(video);
          const vf = new VideoFrame(canvas, { timestamp: ts });
          encoder.encode(vf, { keyFrame: frameIndex % 30 === 0 });
          vf.close();
          frameIndex++;
        });

        video.pause();
        await encoder.flush();
        muxer.finalize();
        video.loop = wasLooping;
        download(new Blob([target.buffer], { type: 'video/mp4' }), `${filename}.mp4`);
        return;
      }
    }

    // 2. MediaRecorder MP4 fallback (real-time, but widely supported including Safari/iOS)
    if ('captureStream' in canvas && typeof MediaRecorder !== 'undefined') {
      const mp4Mimes = ['video/mp4;codecs=avc1.42E01E', 'video/mp4;codecs=avc1', 'video/mp4'];
      const mime = mp4Mimes.find((m) => MediaRecorder.isTypeSupported(m));
      if (mime) {
        await mediaRecorderFull(video, canvas, mime, 'mp4', filename, duration, wasLooping, onProgress);
        return;
      }
    }

    // 3. Nothing produced MP4 — fall through to WebM so the user gets something
  }

  // ── WebM path ─────────────────────────────────────────────────────────────
  if (hasWebCodecs) {
    const vpConfig: VideoEncoderConfig = {
      codec: 'vp09.00.51.08',
      width: w, height: h, bitrate: 25_000_000, framerate: FPS,
    };
    let useVP9 = false;
    try { const { supported } = await VideoEncoder.isConfigSupported(vpConfig); useVP9 = !!supported; } catch {}

    if (useVP9) {
      const { Muxer, ArrayBufferTarget } = await import('webm-muxer');
      const target = new ArrayBufferTarget();
      const muxer = new Muxer({ target, video: { codec: 'V_VP9', width: w, height: h, frameRate: FPS }, firstTimestampBehavior: 'offset' });

      let frameIndex = 0;
      const encoder = new VideoEncoder({
        output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
        error: (e) => console.error('VideoEncoder:', e),
      });
      encoder.configure(vpConfig);

      await seekAndEncode((ts) => {
        renderFrame(video);
        const vf = new VideoFrame(canvas, { timestamp: ts });
        encoder.encode(vf, { keyFrame: frameIndex % 60 === 0 });
        vf.close();
        frameIndex++;
      });

      video.pause();
      await encoder.flush();
      muxer.finalize();
      video.loop = wasLooping;
      download(new Blob([target.buffer], { type: 'video/webm' }), `${filename}.webm`);
      return;
    }
  }

  // ── Last resort: MediaRecorder WebM ───────────────────────────────────────
  if ('captureStream' in canvas) {
    const formats = detectVideoFormats();
    if (formats.length) {
      const fmt = formats[0];
      await mediaRecorderFull(video, canvas, fmt.mime, fmt.ext, filename, duration, wasLooping, onProgress);
    }
  }
}
