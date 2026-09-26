"use client";

import Image from "next/image";
import { useRef, useState, type FormEvent } from "react";
import { FileDown, ImageIcon, Lock, Pencil, Plus, Trash2, X } from "lucide-react";
import { MediaPicker } from "./MediaPicker";
import {
  DOWNLOAD_TYPES,
  DOWNLOAD_TYPE_LABEL,
  MAX_DOWNLOAD_DESCRIPTION,
  MAX_DOWNLOAD_TITLE,
  MAX_MEMBER_FILE_LABEL,
  MEMBER_FILE_EXTENSIONS,
  formatFileSize,
  validateMemberFile,
  type DownloadType,
  type MemberDownload,
} from "@/lib/member-downloads-shared";

type Props = {
  initial: MemberDownload[];
  unavailable: string | null;
};

type Draft = {
  id: string | null;
  title: string;
  description: string;
  type: DownloadType;
  coverUrl: string;
};

const EMPTY: Draft = { id: null, title: "", description: "", type: "guide-pdf", coverUrl: "" };

const fieldClass =
  "mt-2 min-h-11 w-full rounded-lg border border-border bg-white px-4 text-sm text-heading placeholder:text-muted transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25";
const areaClass =
  "mt-2 w-full rounded-lg border border-border bg-white px-4 py-3 text-sm text-heading placeholder:text-muted transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25";

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(d);
}

export function DownloadsManager({ initial, unavailable }: Props) {
  const [rows, setRows] = useState(initial);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const editing = draft?.id ? rows.find((row) => row.id === draft.id) ?? null : null;

  function open(next: Draft) {
    setDraft(next);
    setFile(null);
    setError(null);
    setNotice(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function pickFile(next: File | null) {
    setError(null);
    if (!next) {
      setFile(null);
      return;
    }
    const check = validateMemberFile({ name: next.name, size: next.size });
    if (!check.ok) {
      setError(check.error);
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setFile(next);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!draft || pending) return;
    if (!draft.id && !file) {
      setError("Choose a file to upload.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("title", draft.title);
      body.append("description", draft.description);
      body.append("type", draft.type);
      body.append("coverUrl", draft.coverUrl);
      if (file) body.append("file", file);
      const res = await fetch(
        draft.id ? `/api/cms/downloads/${encodeURIComponent(draft.id)}` : "/api/cms/downloads",
        { method: draft.id ? "PATCH" : "POST", body },
      );
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        download?: MemberDownload;
      };
      if (!res.ok || !data.download) {
        setError(data.error || (res.status === 413 ? `The limit is ${MAX_MEMBER_FILE_LABEL} per file.` : "Could not save."));
        return;
      }
      const saved = data.download;
      setRows((prev) =>
        draft.id ? prev.map((row) => (row.id === saved.id ? saved : row)) : [saved, ...prev],
      );
      setNotice(draft.id ? "Saved. Members see the change right away." : "Added. Members can download it now.");
      setDraft(null);
      setFile(null);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setPending(false);
    }
  }

  async function remove(row: MemberDownload) {
    if (!window.confirm(`Delete “${row.title}”? Members will no longer be able to download it.`)) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/cms/downloads/${encodeURIComponent(row.id)}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || "Could not delete.");
        return;
      }
      setRows((prev) => prev.filter((item) => item.id !== row.id));
      if (draft?.id === row.id) setDraft(null);
      setNotice("Deleted.");
    } catch {
      setError("Network error. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow text-accent">Premium</p>
          <h1 className="font-display mt-2 text-display text-heading">Downloads</h1>
          <p className="mt-3 max-w-2xl text-sm text-muted md:text-base">
            PDF guides and Lightroom presets for members. Readers see these on
            /premium/downloads; only signed-in members can download the files.
          </p>
        </div>
        {!unavailable && !draft ? (
          <button type="button" className="btn btn-primary shrink-0" onClick={() => open({ ...EMPTY })}>
            <Plus className="h-4 w-4" aria-hidden />
            Add download
          </button>
        ) : null}
      </div>

      <div className="panel flex items-start gap-3 p-4 text-sm text-text">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
        <p>
          Files are stored privately in Firestore, not in the GitHub repo or /public, and
          are only served through the member check. Limit: <strong>{MAX_MEMBER_FILE_LABEL} per file</strong>{" "}
          ({MEMBER_FILE_EXTENSIONS.join(", ")}). Zip preset packs; split a large guide or
          compress the PDF if it is over the limit. Changes are live right away, no publish step.
        </p>
      </div>

      {notice ? (
        <p className="text-sm font-semibold text-heading" role="status">
          {notice}
        </p>
      ) : null}
      {error && !draft ? (
        <p className="text-sm font-semibold text-red-700 dark:text-red-300" role="alert">
          {error}
        </p>
      ) : null}

      {unavailable ? (
        <div className="panel p-6">
          <p className="text-sm text-text" role="status">
            {unavailable}
          </p>
        </div>
      ) : null}

      {draft ? (
        <form className="panel space-y-5 p-5 sm:p-6" onSubmit={onSubmit} aria-labelledby="download-form-title">
          <div className="flex items-center justify-between gap-3">
            <h2 id="download-form-title" className="font-display text-xl font-bold text-heading">
              {draft.id ? "Edit download" : "New download"}
            </h2>
            <button
              type="button"
              className="inline-flex size-10 items-center justify-center rounded-lg text-muted hover:bg-surface-soft hover:text-heading"
              aria-label="Close"
              onClick={() => setDraft(null)}
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>

          <div>
            <label htmlFor="download-title" className="text-sm font-semibold text-heading">
              Title <span className="text-accent">*</span>
            </label>
            <input
              id="download-title"
              value={draft.title}
              maxLength={MAX_DOWNLOAD_TITLE}
              required
              className={fieldClass}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
          </div>

          <div>
            <label htmlFor="download-description" className="text-sm font-semibold text-heading">
              Short description
            </label>
            <textarea
              id="download-description"
              rows={3}
              value={draft.description}
              maxLength={MAX_DOWNLOAD_DESCRIPTION}
              className={areaClass}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />
            <p className="mt-1 text-xs text-muted">
              {draft.description.length}/{MAX_DOWNLOAD_DESCRIPTION}. Shown under the title.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="download-type" className="text-sm font-semibold text-heading">
                Type <span className="text-accent">*</span>
              </label>
              <select
                id="download-type"
                value={draft.type}
                className={fieldClass}
                onChange={(e) => setDraft({ ...draft, type: e.target.value as DownloadType })}
              >
                {DOWNLOAD_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {DOWNLOAD_TYPE_LABEL[type]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span className="text-sm font-semibold text-heading">Cover image (optional)</span>
              <div className="mt-2 flex items-center gap-3">
                {draft.coverUrl ? (
                  <Image
                    src={draft.coverUrl}
                    alt=""
                    width={64}
                    height={48}
                    className="h-12 w-16 rounded-md border border-border object-cover"
                  />
                ) : (
                  <span className="inline-flex h-12 w-16 items-center justify-center rounded-md border border-dashed border-border text-muted">
                    <ImageIcon className="h-4 w-4" aria-hidden />
                  </span>
                )}
                <button type="button" className="btn btn-secondary" onClick={() => setPickerOpen(true)}>
                  {draft.coverUrl ? "Change" : "Choose from library"}
                </button>
                {draft.coverUrl ? (
                  <button
                    type="button"
                    className="text-sm font-semibold text-muted hover:text-heading"
                    onClick={() => setDraft({ ...draft, coverUrl: "" })}
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="download-file" className="text-sm font-semibold text-heading">
              File {draft.id ? "(leave empty to keep the current file)" : <span className="text-accent">*</span>}
            </label>
            <input
              id="download-file"
              ref={fileRef}
              type="file"
              accept={MEMBER_FILE_EXTENSIONS.join(",")}
              className="mt-2 block w-full text-sm text-text file:mr-3 file:min-h-11 file:rounded-lg file:border file:border-border file:bg-white file:px-4 file:text-sm file:font-semibold file:text-heading"
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            />
            <p className="mt-1 text-xs text-muted">
              Up to {MAX_MEMBER_FILE_LABEL}. {MEMBER_FILE_EXTENSIONS.join(", ")}.
              {editing ? ` Current: ${editing.fileName} (${formatFileSize(editing.size)}).` : ""}
              {file ? ` New: ${file.name} (${formatFileSize(file.size)}).` : ""}
            </p>
          </div>

          {error ? (
            <p className="text-sm font-semibold text-red-700 dark:text-red-300" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="submit" className="btn btn-primary w-full sm:w-auto disabled:opacity-60" disabled={pending}>
              {pending ? "Saving…" : draft.id ? "Save changes" : "Upload and add"}
            </button>
            <button type="button" className="btn btn-secondary w-full sm:w-auto" onClick={() => setDraft(null)}>
              Cancel
            </button>
          </div>
          <MediaPicker
            open={pickerOpen}
            onClose={() => setPickerOpen(false)}
            onSelect={(item) => {
              if (item.url.startsWith("/media/")) {
                setDraft((current) => (current ? { ...current, coverUrl: item.url } : current));
                setError(null);
              } else {
                setError("Pick an image uploaded to the library (a /media/ image).");
              }
              setPickerOpen(false);
            }}
            title="Choose a cover image"
          />
        </form>
      ) : null}

      {!unavailable ? (
        rows.length === 0 ? (
          <div className="panel p-6 text-center">
            <FileDown className="mx-auto h-6 w-6 text-accent" aria-hidden />
            <p className="mt-3 font-semibold text-heading">No downloads yet</p>
            <p className="mt-1 text-sm text-muted">
              Members see “First ones coming soon” until you add one.
            </p>
          </div>
        ) : (
          <ul className="panel divide-y divide-border overflow-hidden p-0">
            {rows.map((row) => (
              <li key={row.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  {row.coverUrl ? (
                    <Image
                      src={row.coverUrl}
                      alt=""
                      width={64}
                      height={48}
                      className="h-12 w-16 shrink-0 rounded-md border border-border object-cover"
                    />
                  ) : (
                    <span className="inline-flex h-12 w-16 shrink-0 items-center justify-center rounded-md bg-surface-soft text-accent">
                      <FileDown className="h-5 w-5" aria-hidden />
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-heading">{row.title}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {DOWNLOAD_TYPE_LABEL[row.type]} · {row.fileName} · {formatFileSize(row.size)} · Added{" "}
                      {formatDate(row.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border bg-white px-2.5 text-xs font-semibold text-heading transition hover:bg-surface-soft"
                    onClick={() =>
                      open({
                        id: row.id,
                        title: row.title,
                        description: row.description,
                        type: row.type,
                        coverUrl: row.coverUrl ?? "",
                      })
                    }
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden />
                    Edit
                  </button>
                  <button
                    type="button"
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border bg-white px-2.5 text-xs font-semibold text-heading transition hover:bg-surface-soft disabled:opacity-60"
                    disabled={pending}
                    onClick={() => void remove(row)}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  );
}
