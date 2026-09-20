"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import { compressImageForUpload } from "@/lib/cms/compress-image";
import {
  MAX_MEDIA_UPLOAD_BYTES,
  MAX_MEDIA_UPLOAD_LABEL,
} from "@/lib/cms/media-limits";
import type { MediaItem } from "@/lib/cms/media-types";

type Props = {
  onAdded?: (item: MediaItem) => void;
};

const MAX_BYTES = MAX_MEDIA_UPLOAD_BYTES;
const ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.heic,.heif,image/*";
const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

type FileStatus =
  | "processing"
  | "queued"
  | "uploading"
  | "done"
  | "error"
  | "skipped";

type SelectedFile = {
  key: string;
  file: File;
  previewUrl: string;
  status: FileStatus;
  message?: string;
  originalSize: number;
  compressed: boolean;
};

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function isAllowedType(file: File): boolean {
  const type = (file.type || "").toLowerCase();
  if (ALLOWED.has(type)) return true;
  // Some browsers leave type empty; fall back to extension.
  const name = file.name.toLowerCase();
  return /\.(jpe?g|png|webp|gif)$/.test(name);
}

function isHeicLike(file: File): boolean {
  const type = (file.type || "").toLowerCase();
  if (type === "image/heic" || type === "image/heif") return true;
  return /\.hei[cf]$/i.test(file.name);
}

const fieldClass =
  "mt-2 min-h-11 w-full rounded-lg border border-border bg-white px-4 text-sm text-heading placeholder:text-muted transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25";

export function AddMediaForm({ onAdded }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const [mode, setMode] = useState<"url" | "upload">("url");
  const [url, setUrl] = useState("");
  const [alt, setAlt] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [selected, setSelected] = useState<SelectedFile[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function revokePreviews(files: SelectedFile[]) {
    for (const f of files) {
      if (f.previewUrl.startsWith("blob:")) URL.revokeObjectURL(f.previewUrl);
    }
  }

  function clearSelected() {
    setSelected((prev) => {
      revokePreviews(prev);
      return [];
    });
    if (fileRef.current) fileRef.current.value = "";
  }

  function addFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const batch: { key: string; file: File }[] = [];
    const placeholders: SelectedFile[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const key = `${file.name}-${file.size}-${file.lastModified}-${i}-${Date.now()}`;
      batch.push({ key, file });
      placeholders.push({
        key,
        file,
        previewUrl: URL.createObjectURL(file),
        status: "processing",
        message: "Preparing…",
        originalSize: file.size,
        compressed: false,
      });
    }

    setSelected((prev) => [...prev, ...placeholders]);
    setError(null);
    setSuccess(null);
    if (fileRef.current) fileRef.current.value = "";

    void (async () => {
      for (const { key, file } of batch) {
        const result = await compressImageForUpload(file);

        if (!result.ok) {
          setSelected((prev) =>
            prev.map((f) => {
              if (f.key !== key) return f;
              return {
                ...f,
                status: "skipped",
                message: result.message,
                originalSize: result.originalSize,
                compressed: false,
              };
            }),
          );
          continue;
        }

        const out = result.file;
        const allowed =
          isAllowedType(out) ||
          // HEIC decoded → JPEG/WebP; original may have been heic-like
          (isHeicLike(file) &&
            (out.type === "image/jpeg" || out.type === "image/webp"));

        if (!allowed) {
          setSelected((prev) =>
            prev.map((f) => {
              if (f.key !== key) return f;
              if (f.previewUrl.startsWith("blob:")) {
                URL.revokeObjectURL(f.previewUrl);
              }
              return {
                ...f,
                file: out,
                previewUrl: URL.createObjectURL(out),
                status: "skipped",
                message: "Unsupported type — use JPEG, PNG, WebP, or GIF.",
                originalSize: result.originalSize,
                compressed: result.compressed,
              };
            }),
          );
          continue;
        }

        if (out.size > MAX_BYTES) {
          setSelected((prev) =>
            prev.map((f) => {
              if (f.key !== key) return f;
              if (f.previewUrl.startsWith("blob:")) {
                URL.revokeObjectURL(f.previewUrl);
              }
              return {
                ...f,
                file: out,
                previewUrl: URL.createObjectURL(out),
                status: "skipped",
                message: `Too large (${formatBytes(out.size)}; max ~${MAX_MEDIA_UPLOAD_LABEL}).`,
                originalSize: result.originalSize,
                compressed: result.compressed,
              };
            }),
          );
          continue;
        }

        setSelected((prev) =>
          prev.map((f) => {
            if (f.key !== key) return f;
            if (f.previewUrl.startsWith("blob:")) {
              URL.revokeObjectURL(f.previewUrl);
            }
            return {
              ...f,
              file: out,
              previewUrl: URL.createObjectURL(out),
              status: "queued",
              message: result.compressed
                ? `Compressed ${formatBytes(result.originalSize)} → ${formatBytes(out.size)}`
                : undefined,
              originalSize: result.originalSize,
              compressed: result.compressed,
            };
          }),
        );
      }
    })();
  }

  function removeSelected(key: string) {
    setSelected((prev) => {
      const target = prev.find((f) => f.key === key);
      if (target?.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((f) => f.key !== key);
    });
  }

  async function uploadOne(
    entry: SelectedFile,
    sharedAlt: string,
  ): Promise<{ ok: boolean; item?: MediaItem; message: string }> {
    try {
      // Multipart avoids base64 inflation (important for travel JPEGs).
      const form = new FormData();
      form.append("file", entry.file);
      form.append("alt", sharedAlt);
      const res = await fetch("/api/cms/media", {
        method: "POST",
        body: form,
      });
      const data = (await res.json()) as {
        error?: string;
        note?: string;
        item?: MediaItem;
      };
      if (!res.ok) {
        return { ok: false, message: data.error || "Upload failed." };
      }
      return {
        ok: true,
        item: data.item,
        message: data.note || "Uploaded.",
      };
    } catch {
      return { ok: false, message: "Network error." };
    }
  }

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setPending(true);
        try {
          if (mode === "url") {
            if (!url.trim()) {
              setError("Paste an image URL.");
              setPending(false);
              return;
            }
            const res = await fetch("/api/cms/media", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ url: url.trim(), alt }),
            });
            const data = (await res.json()) as {
              error?: string;
              note?: string;
              item?: MediaItem;
            };
            if (!res.ok) {
              setError(data.error || "Save failed.");
              setPending(false);
              return;
            }
            setSuccess(data.note || "Saved.");
            if (data.item) onAdded?.(data.item);
            setUrl("");
            setAlt("");
            setPreview(null);
            router.refresh();
            return;
          }

          if (selected.some((f) => f.status === "processing")) {
            setError("Still preparing images — wait a moment, then try again.");
            setPending(false);
            return;
          }

          const uploadable = selected.filter((f) => f.status === "queued");
          if (selected.length === 0) {
            setError("Choose one or more image files first.");
            setPending(false);
            return;
          }
          if (uploadable.length === 0) {
            setError(
              "No valid files to upload. Remove oversize/unsupported items or pick new files.",
            );
            setPending(false);
            return;
          }

          let okCount = 0;
          let failCount = 0;
          let lastItem: MediaItem | undefined;

          for (const entry of uploadable) {
            setSelected((prev) =>
              prev.map((f) =>
                f.key === entry.key
                  ? { ...f, status: "uploading", message: "Uploading…" }
                  : f,
              ),
            );
            const result = await uploadOne(entry, alt);
            if (result.ok && result.item) {
              okCount += 1;
              lastItem = result.item;
              onAdded?.(result.item);
              setSelected((prev) =>
                prev.map((f) =>
                  f.key === entry.key
                    ? { ...f, status: "done", message: "Uploaded." }
                    : f,
                ),
              );
            } else {
              failCount += 1;
              setSelected((prev) =>
                prev.map((f) =>
                  f.key === entry.key
                    ? {
                        ...f,
                        status: "error",
                        message: result.message,
                      }
                    : f,
                ),
              );
            }
          }

          const skipped = selected.filter((f) => f.status === "skipped").length;
          const parts: string[] = [];
          if (okCount) parts.push(`${okCount} uploaded`);
          if (failCount) parts.push(`${failCount} failed`);
          if (skipped) parts.push(`${skipped} skipped`);
          setSuccess(
            parts.length
              ? `${parts.join(" · ")}. Live after Vercel redeploy.`
              : "Done.",
          );
          if (failCount && !okCount) {
            setError("All uploads failed. See per-file messages below.");
          } else if (failCount) {
            setError(null);
          }

          if (okCount > 0) {
            // Drop successful entries; keep failed/skipped for retry/review.
            setSelected((prev) => {
              const keep = prev.filter(
                (f) => f.status === "error" || f.status === "skipped",
              );
              const drop = prev.filter(
                (f) => f.status === "done" || f.status === "uploading",
              );
              revokePreviews(drop);
              return keep.map((f) =>
                f.status === "error"
                  ? { ...f, status: "queued" as FileStatus }
                  : f,
              );
            });
            setAlt("");
            if (lastItem) {
              // keep grid refresh
            }
            router.refresh();
          }
        } catch {
          setError("Network error. Try again.");
        } finally {
          setPending(false);
        }
      }}
    >
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
            mode === "url"
              ? "border-accent bg-accent/10 text-heading"
              : "border-border bg-white text-text"
          }`}
          onClick={() => {
            setMode("url");
            setError(null);
            setSuccess(null);
          }}
        >
          Add by URL
        </button>
        <button
          type="button"
          className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
            mode === "upload"
              ? "border-accent bg-accent/10 text-heading"
              : "border-border bg-white text-text"
          }`}
          onClick={() => {
            setMode("upload");
            setError(null);
            setSuccess(null);
            setPreview(null);
          }}
        >
          Upload files
        </button>
      </div>

      {mode === "url" ? (
        <div>
          <label htmlFor="media-url" className="text-sm font-semibold text-heading">
            Image URL
          </label>
          <input
            id="media-url"
            type="url"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setPreview(e.target.value.trim() || null);
            }}
            placeholder="https://…"
            className={fieldClass}
          />
        </div>
      ) : (
        <div>
          <label
            htmlFor="media-file"
            className="text-sm font-semibold text-heading"
          >
            Image files
          </label>
          <input
            ref={fileRef}
            id="media-file"
            type="file"
            multiple
            accept={ACCEPT}
            className="mt-2 block w-full text-sm text-text file:mr-3 file:rounded-lg file:border-0 file:bg-surface-soft file:px-3 file:py-2 file:text-sm file:font-semibold file:text-heading"
            onChange={(e) => addFiles(e.target.files)}
          />
          <p className="mt-1 text-xs text-muted">
            JPEG, PNG, WebP, or GIF · iPhone photos compressed in-browser (max
            edge ~2048px) · hard max ~{MAX_MEDIA_UPLOAD_LABEL} each · select
            multiple · commits to{" "}
            <code className="rounded bg-surface-soft px-1">public/media</code>
          </p>

          {selected.length > 0 ? (
            <div className="mt-3 space-y-2" aria-labelledby={listId}>
              <div className="flex items-center justify-between gap-2">
                <p
                  id={listId}
                  className="text-xs font-semibold uppercase tracking-wide text-muted"
                >
                  {selected.length} selected
                </p>
                <button
                  type="button"
                  className="text-xs font-semibold text-link hover:text-accent disabled:opacity-50"
                  disabled={pending}
                  onClick={() => clearSelected()}
                >
                  Clear all
                </button>
              </div>
              <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-white">
                {selected.map((entry) => (
                  <li
                    key={entry.key}
                    className="flex items-start gap-3 px-3 py-2.5"
                  >
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded border border-border bg-surface-soft">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={entry.previewUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-heading">
                        {entry.file.name}
                      </p>
                      <p className="text-xs text-muted">
                        {entry.compressed
                          ? `${formatBytes(entry.originalSize)} → ${formatBytes(entry.file.size)}`
                          : formatBytes(entry.file.size)}
                        {entry.status === "processing"
                          ? " · preparing…"
                          : entry.status === "uploading"
                            ? " · uploading…"
                            : entry.status === "done"
                              ? " · done"
                              : entry.status === "error"
                                ? " · error"
                                : entry.status === "skipped"
                                  ? " · skipped"
                                  : entry.compressed
                                    ? " · compressed"
                                    : ""}
                      </p>
                      {entry.message ? (
                        <p
                          className={`mt-0.5 text-xs ${
                            entry.status === "error" ||
                            entry.status === "skipped"
                              ? "text-red-600"
                              : entry.status === "done"
                                ? "text-steel"
                                : "text-muted"
                          }`}
                        >
                          {entry.message}
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      className="shrink-0 rounded-md px-2 py-1 text-xs font-semibold text-muted hover:bg-surface-soft hover:text-heading disabled:opacity-50"
                      disabled={pending && entry.status === "uploading"}
                      onClick={() => removeSelected(entry.key)}
                      aria-label={`Remove ${entry.file.name}`}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}

      <div>
        <label htmlFor="media-alt" className="text-sm font-semibold text-heading">
          Alt text
          {mode === "upload" && selected.length > 1 ? (
            <span className="ml-1 font-normal text-muted">
              (applied to each file in this batch)
            </span>
          ) : null}
        </label>
        <input
          id="media-alt"
          value={alt}
          onChange={(e) => setAlt(e.target.value)}
          placeholder="Describe the image"
          className={fieldClass}
        />
      </div>

      {mode === "url" && preview ? (
        <div className="overflow-hidden rounded-lg border border-border bg-surface-soft">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt={alt || "Preview"}
            className="max-h-48 w-full object-contain"
            onError={() => setPreview(null)}
          />
        </div>
      ) : null}

      {error ? (
        <p className="text-sm font-medium text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="text-sm text-steel" role="status">
          {success}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="btn btn-primary disabled:opacity-60"
      >
        {pending
          ? mode === "upload"
            ? "Uploading…"
            : "Saving…"
          : mode === "url"
            ? "Add URL to library"
            : selected.filter((f) => f.status === "queued").length > 1
              ? `Upload ${selected.filter((f) => f.status === "queued").length} files`
              : "Upload & register"}
      </button>
    </form>
  );
}
