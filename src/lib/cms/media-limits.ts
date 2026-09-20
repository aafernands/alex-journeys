/** Hard max for CMS media library / hero uploads (after client compression). */
export const MAX_MEDIA_UPLOAD_BYTES = 8 * 1024 * 1024;

/** Human-readable label for UI + API error messages. */
export const MAX_MEDIA_UPLOAD_LABEL = "8MB";

/** Compress when file is larger than this, or when longest edge exceeds MAX_IMAGE_EDGE. */
export const MEDIA_COMPRESS_THRESHOLD_BYTES = Math.floor(1.25 * 1024 * 1024);

/** Longest edge after resize (travel photos from iPhone are often 4032×3024). */
export const MAX_IMAGE_EDGE = 2048;

/** JPEG / WebP encode quality for client-side compression. */
export const MEDIA_COMPRESS_QUALITY = 0.82;
