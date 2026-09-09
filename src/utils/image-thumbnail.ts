export interface ThumbnailResult {
  file: File;
  base64: string;
}

export interface ThumbnailOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

/**
 * Generates a proportional WebP thumbnail from an image File.
 * Preserves the aspect ratio while scaling down so neither width nor height exceeds limits.
 * Falls back gracefully to original file on non-browser / unsupported canvas environments.
 */
export async function generateThumbnail(
  file: File,
  options: ThumbnailOptions = {},
): Promise<ThumbnailResult> {
  const { maxWidth = 600, maxHeight = 600, quality = 0.82 } = options;

  if (
    typeof window === 'undefined' ||
    typeof document === 'undefined' ||
    typeof Image === 'undefined' ||
    typeof URL?.createObjectURL !== 'function'
  ) {
    return { file, base64: '' };
  }

  let objectUrl: string | null = null;

  try {
    objectUrl = URL.createObjectURL(file);

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      const timeout = setTimeout(() => {
        reject(new Error('Image load timeout'));
      }, 3000);
      image.onload = () => {
        clearTimeout(timeout);
        resolve(image);
      };
      image.onerror = (err) => {
        clearTimeout(timeout);
        reject(err);
      };
      image.src = objectUrl!;
    });

    let { width, height } = img;

    if (width > maxWidth || height > maxHeight) {
      const ratio = Math.min(maxWidth / width, maxHeight / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return { file, base64: '' };
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/webp', quality);
    });

    if (!blob) {
      return { file, base64: '' };
    }

    const baseName =
      file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    const thumbFileName = `${baseName}_thumb.webp`;
    const thumbFile = new File([blob], thumbFileName, { type: 'image/webp' });

    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(blob);
    });

    return {
      file: thumbFile,
      base64,
    };
  } catch (e) {
    console.warn(
      '[image-thumbnail] Thumbnail generation failed, falling back to original:',
      e,
    );
    return { file, base64: '' };
  } finally {
    if (objectUrl) {
      try {
        URL.revokeObjectURL(objectUrl);
      } catch {
        // ignore
      }
    }
  }
}
