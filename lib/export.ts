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
export async function exportVideoFull(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  renderFrame: (video: HTMLVideoElement) => void,
  filename: string,
  onProgress: (pct: number) => void,
  format: 'webm' | 'mp4' = 'webm',
): Promise<void> {
  const w = video.videoWidth;
  const h = video.videoHeight;
  const duration = video.duration;

  const wasLooping = video.loop;
  video.loop = false;
  video.pause();

  // ── WebCodecs path (Chrome 94+, Edge 94+, Firefox 130+, Safari 16.4+) ──
  const hasWebCodecs =
    typeof VideoEncoder !== 'undefined' && typeof VideoFrame !== 'undefined';

  if (hasWebCodecs) {
    const FPS = 30;

    const seekAndEncode = async (
      encodeFrame: (timestampUs: number) => void,
    ) => {
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

    if (format === 'mp4') {
      const h264Config: VideoEncoderConfig = {
        codec: 'avc1.640033', // H.264 High profile, level 5.1
        width: w,
        height: h,
        bitrate: 25_000_000,
        framerate: FPS,
        avc: { format: 'avc' },
      };
      let useH264 = false;
      try {
        const { supported } = await VideoEncoder.isConfigSupported(h264Config);
        useH264 = !!supported;
      } catch { useH264 = false; }

      if (useH264) {
        const { Muxer, ArrayBufferTarget } = await import('mp4-muxer');
        const target = new ArrayBufferTarget();
        const muxer = new Muxer({
          target,
          video: { codec: 'avc', width: w, height: h },
          fastStart: 'in-memory',
        });

        let frameIndex = 0;
        const encoder = new VideoEncoder({
          output: (chunk, meta) => muxer.addVideoChunk(chunk, meta ?? undefined),
          error: (e) => console.error('VideoEncoder:', e),
        });
        encoder.configure(h264Config);

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

        const blob = new Blob([target.buffer], { type: 'video/mp4' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `${filename}.mp4`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
        return;
      }
      // H.264 not supported — fall through to WebM VP9
    }

    const vpConfig: VideoEncoderConfig = {
      codec: 'vp09.00.51.08', // VP9, profile 0, level 5.1, 8-bit
      width: w,
      height: h,
      bitrate: 25_000_000,
      framerate: FPS,
    };
    let useVP9 = false;
    try {
      const { supported } = await VideoEncoder.isConfigSupported(vpConfig);
      useVP9 = !!supported;
    } catch { useVP9 = false; }

    if (useVP9) {
      const { Muxer, ArrayBufferTarget } = await import('webm-muxer');
      const target = new ArrayBufferTarget();
      const muxer = new Muxer({
        target,
        video: { codec: 'V_VP9', width: w, height: h, frameRate: FPS },
        firstTimestampBehavior: 'offset',
      });

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

      const blob = new Blob([target.buffer], { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${filename}.webm`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
      return;
    }
  }

  // ── Fallback: MediaRecorder for full duration ──
  video.loop = wasLooping;
  if (!('captureStream' in canvas)) return;
  const formats = detectVideoFormats();
  if (!formats.length) return;
  const fmt = formats[0];

  await new Promise<void>((resolve) => {
    video.currentTime = 0;
    video.addEventListener('seeked', () => {
      const stream = (canvas as any).captureStream(30);
      const recorder = new MediaRecorder(stream, {
        mimeType: fmt.mime,
        videoBitsPerSecond: VIDEO_BITRATE,
      });
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (ev) => { if (ev.data.size > 0) chunks.push(ev.data); };
      recorder.onstop = () => {
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
        resolve();
      };
      onProgress(0);
      recorder.start(100);
      video.play().catch(() => {});
      const iv = setInterval(() => {
        onProgress(Math.min(video.currentTime / duration, 0.99));
        if (video.currentTime >= duration - 0.15) {
          clearInterval(iv);
          recorder.stop();
        }
      }, 100);
    }, { once: true });
  });
}
