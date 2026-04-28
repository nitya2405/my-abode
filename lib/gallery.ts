export interface GalleryItem {
  id: string;
  thumbnail: string;    // JPEG data URL, max 600px
  effectName: string;
  effectSlug: string;
  type: 'image' | 'video';
  dateSaved: string;
}

const STORAGE_KEY = 'abode_gallery';

export function saveCanvasToGallery(
  canvas: HTMLCanvasElement,
  effectName: string,
  effectSlug: string,
  type: 'image' | 'video' = 'image'
): boolean {
  try {
    const maxDim = 600;
    const scale = Math.min(maxDim / canvas.width, maxDim / canvas.height, 1);
    const thumb = document.createElement('canvas');
    thumb.width = Math.round(canvas.width * scale);
    thumb.height = Math.round(canvas.height * scale);
    thumb.getContext('2d')!.drawImage(canvas, 0, 0, thumb.width, thumb.height);
    const thumbnail = thumb.toDataURL('image/jpeg', 0.75);

    const items = getGalleryItems();
    const newItem: GalleryItem = {
      id: Date.now().toString(),
      thumbnail,
      effectName,
      effectSlug,
      type,
      dateSaved: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify([newItem, ...items]));
    return true;
  } catch {
    return false;
  }
}

export function getGalleryItems(): GalleryItem[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

export function deleteGalleryItem(id: string): void {
  const items = getGalleryItems();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.filter((i) => i.id !== id)));
}
