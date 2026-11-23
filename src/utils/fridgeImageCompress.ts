export interface CompressImageOptions {
  maxDimension?: number;
  quality?: number;
  minBytesToCompress?: number;
}

const DEFAULT_MAX_DIMENSION = 1280;
const DEFAULT_QUALITY = 0.82;
const DEFAULT_MIN_BYTES = 350 * 1024;

function toJpegFileName(originalName: string): string {
  const trimmed = originalName.trim() || 'fridge-photo.jpg';
  const dotIdx = trimmed.lastIndexOf('.');
  const base = dotIdx > 0 ? trimmed.slice(0, dotIdx) : trimmed;
  return `${base}.jpg`;
}

export function computeScaledDimensions(
  width: number,
  height: number,
  maxDimension = DEFAULT_MAX_DIMENSION
): { width: number; height: number } {
  if (width <= 0 || height <= 0) {
    return { width: maxDimension, height: maxDimension };
  }
  const largest = Math.max(width, height);
  if (largest <= maxDimension) {
    return { width, height };
  }
  const scale = maxDimension / largest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function loadHtmlImage(file: File): Promise<{ width: number; height: number; drawSource: CanvasImageSource; cleanup: () => void }> {
  return new Promise((resolve, reject) => {
    if (typeof URL === 'undefined' || typeof Image === 'undefined') {
      reject(new Error('Image API unavailable'));
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
        drawSource: img,
        cleanup: () => URL.revokeObjectURL(objectUrl),
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to decode image'));
    };
    img.src = objectUrl;
  });
}

async function decodeImageSource(
  file: File
): Promise<{ width: number; height: number; drawSource: CanvasImageSource; cleanup: () => void }> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        width: bitmap.width,
        height: bitmap.height,
        drawSource: bitmap,
        cleanup: () => bitmap.close?.(),
      };
    } catch {
      // Fall back to HTMLImageElement below
    }
  }
  return loadHtmlImage(file);
}

/**
 * Downscale and JPEG-compress large fridge photos in the browser before upload
 * so Vision AI latency drops significantly without hurting label readability.
 */
export async function compressImageForUpload(
  file: File,
  options: CompressImageOptions = {}
): Promise<File> {
  const maxDimension = options.maxDimension ?? DEFAULT_MAX_DIMENSION;
  const quality = options.quality ?? DEFAULT_QUALITY;
  const minBytes = options.minBytesToCompress ?? DEFAULT_MIN_BYTES;

  if (
    !file ||
    file.size <= minBytes ||
    !file.type.startsWith('image/') ||
    typeof document === 'undefined'
  ) {
    return file;
  }

  let decoded: Awaited<ReturnType<typeof decodeImageSource>> | null = null;
  try {
    decoded = await decodeImageSource(file);
    const target = computeScaledDimensions(decoded.width, decoded.height, maxDimension);
    const canvas = document.createElement('canvas');
    canvas.width = target.width;
    canvas.height = target.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, target.width, target.height);
    ctx.drawImage(decoded.drawSource, 0, 0, target.width, target.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', quality)
    );
    if (!blob || blob.size <= 0 || blob.size >= file.size) {
      return file;
    }

    return new File([blob], toJpegFileName(file.name), {
      type: 'image/jpeg',
      lastModified: file.lastModified,
    });
  } catch {
    return file;
  } finally {
    decoded?.cleanup();
  }
}
