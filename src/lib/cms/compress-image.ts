/**
 * Browser-side image compression for CMS media uploads.
 * Uses createImageBitmap + canvas; HEIC works when the browser can decode it (e.g. Safari).
 */

import {
  MAX_IMAGE_EDGE,
  MEDIA_COMPRESS_QUALITY,
  MEDIA_COMPRESS_THRESHOLD_BYTES,
} from "@/lib/cms/media-limits";

export type CompressImageResult =
  | {
      ok: true;
      file: File;
      originalSize: number;
      compressed: boolean;
    }
  | {
      ok: false;
      originalSize: number;
      message: string;
    };

type Drawable = {
  width: number;
  height: number;
  draw: (ctx: CanvasRenderingContext2D, tw: number, th: number) => void;
  close: () => void;
};

function isHeicLike(file: File): boolean {
  const type = (file.type || "").toLowerCase();
  if (type === "image/heic" || type === "image/heif") return true;
  return /\.hei[cf]$/i.test(file.name);
}

function isGif(file: File): boolean {
  const type = (file.type || "").toLowerCase();
  return type === "image/gif" || /\.gif$/i.test(file.name);
}

function stemName(name: string): string {
  return name.replace(/\.[^.]+$/, "") || "photo";
}

function loadViaImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("decode failed"));
    };
    img.src = url;
  });
}

async function decodeDrawable(file: File): Promise<Drawable> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        width: bitmap.width,
        height: bitmap.height,
        draw: (ctx, tw, th) => ctx.drawImage(bitmap, 0, 0, tw, th),
        close: () => bitmap.close(),
      };
    } catch {
      // fall through — HEIC often fails here outside Safari
    }
  }

  const img = await loadViaImageElement(file);
  return {
    width: img.naturalWidth || img.width,
    height: img.naturalHeight || img.height,
    draw: (ctx, tw, th) => ctx.drawImage(img, 0, 0, tw, th),
    close: () => undefined,
  };
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

/**
 * Resize longest edge to MAX_IMAGE_EDGE and encode as JPEG (or WebP if source was WebP).
 * Skips compression for GIFs (preserve animation) and for small images already within limits.
 * Always recompresses oversized camera photos (by size or dimensions).
 */
export async function compressImageForUpload(
  file: File,
): Promise<CompressImageResult> {
  const originalSize = file.size;

  if (isGif(file)) {
    return { ok: true, file, originalSize, compressed: false };
  }

  let drawable: Drawable;
  try {
    drawable = await decodeDrawable(file);
  } catch {
    if (isHeicLike(file)) {
      return {
        ok: false,
        originalSize,
        message:
          "This HEIC can’t be read here. In Photos, export as JPEG (Share → Save as JPEG / Duplicate as JPEG), then upload.",
      };
    }
    return {
      ok: false,
      originalSize,
      message: "Could not read this image. Try JPEG, PNG, or WebP.",
    };
  }

  try {
    const w = drawable.width;
    const h = drawable.height;
    if (!w || !h) {
      return {
        ok: false,
        originalSize,
        message: "Could not read image dimensions.",
      };
    }

    const longest = Math.max(w, h);
    const needsResize = longest > MAX_IMAGE_EDGE;
    const needsShrink = originalSize > MEDIA_COMPRESS_THRESHOLD_BYTES;

    if (!needsResize && !needsShrink) {
      return { ok: true, file, originalSize, compressed: false };
    }

    const scale = needsResize ? MAX_IMAGE_EDGE / longest : 1;
    const tw = Math.max(1, Math.round(w * scale));
    const th = Math.max(1, Math.round(h * scale));

    const canvas = document.createElement("canvas");
    canvas.width = tw;
    canvas.height = th;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return {
        ok: false,
        originalSize,
        message: "Could not compress image (no canvas).",
      };
    }
    drawable.draw(ctx, tw, th);

    const sourceType = (file.type || "").toLowerCase();
    const outType =
      sourceType === "image/webp" ? "image/webp" : "image/jpeg";
    const outExt = outType === "image/webp" ? ".webp" : ".jpg";

    const blob = await canvasToBlob(canvas, outType, MEDIA_COMPRESS_QUALITY);
    if (!blob) {
      return {
        ok: false,
        originalSize,
        message: "Could not encode compressed image.",
      };
    }

    // Keep original if compression did not help (e.g. already small/optimized).
    if (blob.size >= originalSize && !needsResize) {
      return { ok: true, file, originalSize, compressed: false };
    }

    const outName = `${stemName(file.name)}${outExt}`;
    const outFile = new File([blob], outName, {
      type: outType,
      lastModified: file.lastModified,
    });

    return {
      ok: true,
      file: outFile,
      originalSize,
      compressed: true,
    };
  } finally {
    drawable.close();
  }
}
