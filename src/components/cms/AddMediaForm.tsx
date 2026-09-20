"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { MediaItem } from "@/lib/cms/media-types";

type Props = {
  onAdded?: (item: MediaItem) => void;
};

const MAX_BYTES = Math.floor(2.5 * 1024 * 1024);

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Could not read file."));
    };
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}

const fieldClass =
  "mt-2 min-h-11 w-full rounded-lg border border-border bg-white px-4 text-sm text-heading placeholder:text-muted transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25";

export function AddMediaForm({ onAdded }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"url" | "upload">("url");
  const [url, setUrl] = useState("");
  const [alt, setAlt] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setPending(true);
        try {
          let res: Response;
          if (mode === "url") {
            if (!url.trim()) {
              setError("Paste an image URL.");
              setPending(false);
              return;
            }
            res = await fetch("/api/cms/media", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ url: url.trim(), alt }),
            });
          } else {
            const file = fileRef.current?.files?.[0];
            if (!file) {
              setError("Choose an image file first.");
              setPending(false);
              return;
            }
            if (file.size > MAX_BYTES) {
              setError("Image too large. Max is about 2.5MB.");
              setPending(false);
              return;
            }
            const dataUrl = await readFileAsDataUrl(file);
            res = await fetch("/api/cms/media", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                dataUrl,
                filename: file.name,
                alt,
              }),
            });
          }
          const data = (await res.json()) as {
            error?: string;
            note?: string;
            item?: MediaItem;
            commitUrl?: string;
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
          if (fileRef.current) fileRef.current.value = "";
          router.refresh();
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
          onClick={() => setMode("url")}
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
          onClick={() => setMode("upload")}
        >
          Upload file
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
            Image file
          </label>
          <input
            ref={fileRef}
            id="media-file"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/*"
            className="mt-2 block w-full text-sm text-text file:mr-3 file:rounded-lg file:border-0 file:bg-surface-soft file:px-3 file:py-2 file:text-sm file:font-semibold file:text-heading"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) {
                setPreview(null);
                return;
              }
              setPreview(URL.createObjectURL(file));
            }}
          />
          <p className="mt-1 text-xs text-muted">
            JPEG, PNG, WebP, or GIF · max ~2.5MB · commits to{" "}
            <code className="rounded bg-surface-soft px-1">public/media</code>
          </p>
        </div>
      )}

      <div>
        <label htmlFor="media-alt" className="text-sm font-semibold text-heading">
          Alt text
        </label>
        <input
          id="media-alt"
          value={alt}
          onChange={(e) => setAlt(e.target.value)}
          placeholder="Describe the image"
          className={fieldClass}
        />
      </div>

      {preview ? (
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
        {pending ? "Saving…" : mode === "url" ? "Add URL to library" : "Upload & register"}
      </button>
    </form>
  );
}
