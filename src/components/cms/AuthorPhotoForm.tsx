"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

type Props = {
  currentSrc: string;
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

export function AuthorPhotoForm({ currentSrc }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    commitUrl: string;
    note: string;
    src: string;
  } | null>(null);

  const displaySrc = success?.src || preview || currentSrc;

  return (
    <form
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        const file = inputRef.current?.files?.[0];
        if (!file) {
          setError("Choose an image file first.");
          return;
        }
        if (file.size > MAX_BYTES) {
          setError("Image too large. Max is about 2.5MB.");
          return;
        }
        const type = (file.type || "").toLowerCase();
        if (!["image/jpeg", "image/png", "image/webp"].includes(type)) {
          setError("Use JPEG, PNG, or WebP.");
          return;
        }

        setPending(true);
        try {
          const dataUrl = await readFileAsDataUrl(file);
          const res = await fetch("/api/cms/author-photo", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dataUrl }),
          });
          const data = (await res.json()) as {
            error?: string;
            commitUrl?: string;
            note?: string;
            src?: string;
            ok?: boolean;
          };
          if (!res.ok || !data.ok) {
            setError(data.error || "Upload failed.");
            setPending(false);
            return;
          }
          setSuccess({
            commitUrl: data.commitUrl || "#",
            note:
              data.note ||
              "Committed. Live after Vercel redeploy.",
            src: data.src || currentSrc,
          });
          setPreview(null);
          setFileName(null);
          if (inputRef.current) inputRef.current.value = "";
          router.refresh();
        } catch {
          setError("Network error. Try again.");
        } finally {
          setPending(false);
        }
      }}
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-full border border-border bg-surface-soft">
          {/* eslint-disable-next-line @next/next/no-img-element -- preview may be blob/data URL */}
          <img
            src={displaySrc}
            alt="Author photo preview"
            className="h-full w-full object-cover"
          />
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <p className="text-sm text-muted">
            Used on About, blog posts, Footer, homepage AuthorIntro, and media
            kit. JPEG, PNG, or WebP · max ~2.5MB.
          </p>
          <label
            htmlFor="author-photo-file"
            className="block text-sm font-semibold text-heading"
          >
            Choose new photo
          </label>
          <input
            ref={inputRef}
            id="author-photo-file"
            name="file"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/*"
            className="block w-full text-sm text-text file:mr-3 file:rounded-lg file:border-0 file:bg-surface-soft file:px-3 file:py-2 file:text-sm file:font-semibold file:text-heading"
            onChange={(e) => {
              setError(null);
              setSuccess(null);
              const file = e.target.files?.[0];
              if (!file) {
                setPreview(null);
                setFileName(null);
                return;
              }
              setFileName(file.name);
              const url = URL.createObjectURL(file);
              setPreview(url);
            }}
          />
          {fileName ? (
            <p className="text-xs text-muted">Selected: {fileName}</p>
          ) : null}
        </div>
      </div>

      {error ? (
        <p className="text-sm font-medium text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {success ? (
        <div className="rounded-lg border border-border bg-surface-soft p-4 text-sm text-text">
          <p className="font-semibold text-heading">Photo uploaded</p>
          <p className="mt-1">{success.note}</p>
          <p className="mt-2">
            <a
              href={success.commitUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-accent underline-offset-2 hover:underline"
            >
              View commit
            </a>
            <span className="text-muted"> · live after Vercel redeploy</span>
          </p>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="btn btn-primary disabled:opacity-60"
      >
        {pending ? "Uploading…" : "Upload author photo"}
      </button>
    </form>
  );
}
