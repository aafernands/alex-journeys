/**
 * Members-only downloads (PDF guides, Lightroom presets). Types, limits, and
 * validation shared by the CMS, the public pages, and the APIs. No Firestore.
 */

export const DOWNLOAD_TYPES = ["guide-pdf", "lightroom-presets", "other"] as const;
export type DownloadType = (typeof DOWNLOAD_TYPES)[number];

export const DOWNLOAD_TYPE_LABEL: Record<DownloadType, string> = {
  "guide-pdf": "Guide PDF",
  "lightroom-presets": "Lightroom presets",
  other: "Other",
};

/**
 * Vercel functions accept about 4.5 MB per request and per response, and the
 * file travels through one on upload and one on download. 4 MB leaves room
 * for the form fields.
 */
export const MAX_MEMBER_FILE_BYTES = 4 * 1024 * 1024;
export const MAX_MEMBER_FILE_LABEL = "4 MB";

export const MAX_DOWNLOAD_TITLE = 120;
export const MAX_DOWNLOAD_DESCRIPTION = 280;

const EXTENSION_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  zip: "application/zip",
  xmp: "application/octet-stream",
  lrtemplate: "application/octet-stream",
  dng: "image/x-adobe-dng",
};

export const MEMBER_FILE_EXTENSIONS = Object.keys(EXTENSION_TYPES).map((ext) => `.${ext}`);

/** Public shape. The file itself never leaves the server except through the member route. */
export type MemberDownload = {
  id: string;
  title: string;
  description: string;
  type: DownloadType;
  /** Optional cover from the media library (a /media/ path). */
  coverUrl: string | null;
  fileName: string;
  contentType: string;
  size: number;
  createdAt: string;
  updatedAt: string;
};

export type DownloadMeta = {
  title: string;
  description: string;
  type: DownloadType;
  coverUrl: string | null;
};

export function isDownloadType(value: unknown): value is DownloadType {
  return typeof value === "string" && (DOWNLOAD_TYPES as readonly string[]).includes(value);
}

export function cleanDownloadId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim();
  return /^[A-Za-z0-9_-]{1,64}$/.test(id) ? id : null;
}

function cleanLine(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

/** Library covers only: same-site /media/ paths, which next/image already allows. */
export function cleanCoverUrl(value: unknown): string | null | undefined {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return undefined;
  const url = value.trim();
  if (!url) return null;
  if (!/^\/media\/[A-Za-z0-9._/-]+$/.test(url) || url.includes("..")) return undefined;
  return url;
}

export function validateDownloadMeta(
  input: Record<string, unknown>,
): { ok: true; data: DownloadMeta } | { ok: false; error: string } {
  const title = cleanLine(input.title, MAX_DOWNLOAD_TITLE);
  if (!title) return { ok: false, error: "Add a title." };
  const description = cleanLine(input.description, MAX_DOWNLOAD_DESCRIPTION);
  const type = isDownloadType(input.type) ? input.type : null;
  if (!type) return { ok: false, error: "Pick a type: Guide PDF, Lightroom presets, or Other." };
  const coverUrl = cleanCoverUrl(input.coverUrl);
  if (coverUrl === undefined) {
    return { ok: false, error: "Choose the cover from the media library." };
  }
  return { ok: true, data: { title, description, type, coverUrl } };
}

export function fileExtension(name: string): string {
  const match = /\.([A-Za-z0-9]+)$/.exec(name.trim());
  return match ? match[1]!.toLowerCase() : "";
}

/** Safe name for Content-Disposition: letters, digits, dot, dash, underscore, space. */
export function cleanFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  const cleaned = base.replace(/[^A-Za-z0-9._ -]+/g, "-").replace(/-+/g, "-").trim();
  return cleaned.slice(-120) || "download";
}

export function validateMemberFile(file: {
  name: string;
  size: number;
}): { ok: true; fileName: string; contentType: string } | { ok: false; error: string } {
  const ext = fileExtension(file.name);
  const contentType = EXTENSION_TYPES[ext];
  if (!contentType) {
    return {
      ok: false,
      error: `Use a ${MEMBER_FILE_EXTENSIONS.join(", ")} file. Zip anything else first.`,
    };
  }
  if (!Number.isFinite(file.size) || file.size <= 0) {
    return { ok: false, error: "That file is empty." };
  }
  if (file.size > MAX_MEMBER_FILE_BYTES) {
    return {
      ok: false,
      error: `That file is ${formatFileSize(file.size)}. The limit is ${MAX_MEMBER_FILE_LABEL} per file.`,
    };
  }
  return { ok: true, fileName: cleanFileName(file.name), contentType };
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function memberDownloadHref(id: string): string {
  return `/api/premium/download/${encodeURIComponent(id)}`;
}

/** Content-Disposition with an ASCII fallback and the UTF-8 name. */
export function attachmentDisposition(fileName: string): string {
  const safe = cleanFileName(fileName).replace(/"/g, "");
  return `attachment; filename="${safe}"; filename*=UTF-8''${encodeURIComponent(safe)}`;
}
