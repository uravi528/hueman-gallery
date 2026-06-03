// Reads a File, returns its natural dimensions plus a downscaled JPEG thumbnail.
// Thumbnails are generated in-browser so we stay entirely on Supabase's free tier
// (no paid image-transformation add-on needed).

export interface Processed {
  thumbBlob: Blob;
  width: number;
  height: number;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objUrl);
      reject(new Error('Could not read image'));
    };
    img.src = objUrl;
  });
}

export async function processImage(file: File, maxEdge = 1200, quality = 0.82): Promise<Processed> {
  const img = await loadImage(file);
  const { naturalWidth: width, naturalHeight: height } = img;
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  const tw = Math.max(1, Math.round(width * scale));
  const th = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = tw;
  canvas.height = th;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unsupported');
  ctx.drawImage(img, 0, 0, tw, th);

  const thumbBlob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/jpeg', quality)
  );

  return { thumbBlob, width, height };
}

// URL-safe slug from a title plus a short random suffix so links are unguessable.
export function makeSlug(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'gallery';
  const rand = Math.random().toString(36).slice(2, 8);
  return `${base}-${rand}`;
}

// Force a real download of a (possibly cross-origin) image.
export async function downloadFile(url: string, filename: string): Promise<void> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  } catch {
    window.open(url, '_blank');
  }
}
