// Shared video format detection and canvas recording — used by all effect pages

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
  { label: 'WebM', mime: 'video/webm', ext: 'webm' }, // universal fallback
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
 * Start recording the canvas output as a video clip.
 * If seekVideoFirst is provided the video is seeked to 0 before recording starts.
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
      a.href = url; a.download = `${filename}.${fmt.ext}`; a.click();
      URL.revokeObjectURL(url);
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
