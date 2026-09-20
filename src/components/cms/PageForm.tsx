"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { redirectedPageSlugs } from "@/data/guides";
import { RichTextEditor } from "./RichTextEditor";

export type PageFormInitial = {
  title: string;
  slug: string;
  description: string;
  label: string;
  contentHtml: string;
  /** Optional structured sections as pretty JSON string */
  sectionsJson: string;
};

type Props = {
  mode: "create" | "edit";
  initial?: Partial<PageFormInitial>;
};

function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

const fieldClass =
  "mt-2 min-h-11 w-full rounded-lg border border-border bg-white px-4 text-sm text-heading placeholder:text-muted transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25";
const areaClass =
  "mt-2 w-full rounded-lg border border-border bg-white px-4 py-3 text-sm text-heading placeholder:text-muted transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25";

export function PageForm({ mode, initial }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [label, setLabel] = useState(initial?.label ?? "");
  const [contentHtml, setContentHtml] = useState(initial?.contentHtml ?? "");
  const [sectionsJson, setSectionsJson] = useState(initial?.sectionsJson ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    commitUrl: string;
    note: string;
    slug: string;
  } | null>(null);
  const [pending, setPending] = useState(false);
  const [dirty, setDirty] = useState(false);
  const baselineRef = useRef(false);

  const derivedSlug = useMemo(() => slugify(title), [title]);
  const finalSlug = slugTouched ? slug : derivedSlug || slug;
  const descLen = description.length;

  const markDirty = useCallback(() => {
    if (baselineRef.current) setDirty(true);
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      baselineRef.current = true;
    }, 400);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirty || pending || success) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty, pending, success]);

  const submit = useCallback(async () => {
    setError(null);
    setSuccess(null);
    setPending(true);
    try {
      const res = await fetch("/api/cms/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          slug: finalSlug,
          description,
          label,
          contentHtml,
          sections: sectionsJson.trim() || undefined,
          update: mode === "edit",
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        commitUrl?: string;
        note?: string;
        slug?: string;
      };
      if (!res.ok) {
        setError(data.error || "Publish failed.");
        setPending(false);
        return;
      }
      setDirty(false);
      setSuccess({
        commitUrl: data.commitUrl || "",
        note: data.note || "Published.",
        slug: data.slug || finalSlug,
      });
      setPending(false);
      router.refresh();
    } catch {
      setError("Network error. Try again.");
      setPending(false);
    }
  }, [contentHtml, description, finalSlug, label, mode, router, sectionsJson, title]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!pending) void submit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pending, submit]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await submit();
  }

  return (
    <form className="panel space-y-5 p-6 md:p-8" onSubmit={onSubmit}>
      <p className="text-xs text-muted">
        {dirty ? "Unsaved changes" : "Synced with form"} ·{" "}
        <kbd className="rounded border border-border bg-surface-soft px-1.5 py-0.5 font-mono text-[0.65rem]">
          ⌘/Ctrl+S
        </kbd>{" "}
        publishes
      </p>

      <div>
        <label htmlFor="cms-page-title" className="text-sm font-semibold text-heading">
          Title <span className="text-accent">*</span>
        </label>
        <input
          id="cms-page-title"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            markDirty();
            if (!slugTouched) setSlug(slugify(e.target.value));
          }}
          required
          className={fieldClass}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="cms-page-slug" className="text-sm font-semibold text-heading">
            Slug <span className="text-accent">*</span>
          </label>
          <input
            id="cms-page-slug"
            value={slugTouched ? slug : derivedSlug || slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value.toLowerCase());
              markDirty();
            }}
            required
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            disabled={mode === "edit"}
            className={`${fieldClass} disabled:bg-surface-soft`}
          />
          <p className="mt-1 text-xs text-muted">
            Public URL: /{finalSlug || "{slug}"}. Known slugs have explicit
            routes; other CMS-only slugs are served by the catch-all when they
            don’t collide with a post or destination.
          </p>
        </div>
        <div>
          <label htmlFor="cms-page-label" className="text-sm font-semibold text-heading">
            Eyebrow label
          </label>
          <input
            id="cms-page-label"
            value={label}
            onChange={(e) => {
              setLabel(e.target.value);
              markDirty();
            }}
            placeholder="e.g. Food & culture"
            className={fieldClass}
          />
        </div>
      </div>

      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <label htmlFor="cms-page-desc" className="text-sm font-semibold text-heading">
            Description / meta <span className="text-accent">*</span>
          </label>
          <span className="text-xs text-muted">{descLen}/600</span>
        </div>
        <textarea
          id="cms-page-desc"
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            markDirty();
          }}
          required
          rows={3}
          maxLength={600}
          className={areaClass}
        />
        <p className="mt-1 text-xs text-muted">
          Ideal SEO length ~150–160 characters ({descLen} now).
        </p>
      </div>

      <div>
        <label htmlFor="cms-page-content" className="text-sm font-semibold text-heading">
          Content
        </label>
        <RichTextEditor
          id="cms-page-content"
          value={contentHtml}
          onChange={(html) => {
            setContentHtml(html);
            markDirty();
          }}
        />
        <p className="mt-1 text-xs text-muted">
          Hub intros can leave body empty — title, description, and sections
          drive the page chrome.
        </p>
      </div>

      <div>
        <label htmlFor="cms-page-sections" className="text-sm font-semibold text-heading">
          Sections (optional JSON)
        </label>
        <textarea
          id="cms-page-sections"
          value={sectionsJson}
          onChange={(e) => {
            setSectionsJson(e.target.value);
            markDirty();
          }}
          rows={8}
          spellCheck={false}
          placeholder='{"disclosure":{"title":"…","body":"…"}}'
          className={`${areaClass} font-mono text-xs`}
        />
        <p className="mt-1 text-xs text-muted">
          Structured extras for hubs, contact form labels, media kit stats, etc.
          Must be a JSON object. Leave blank to keep existing sections on update.
        </p>
      </div>

      {error ? (
        <p className="text-sm font-medium text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {success ? (
        <div className="rounded-lg border border-border bg-surface-soft p-4 text-sm text-text">
          <p className="font-semibold text-heading">Published</p>
          <p className="mt-1">{success.note}</p>
          {success.commitUrl ? (
            <p className="mt-2">
              <a
                href={success.commitUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-link underline-offset-2 hover:text-accent hover:underline"
              >
                View commit on GitHub
              </a>
              {" · "}
              <a
                href={redirectedPageSlugs[success.slug] ?? `/${success.slug}`}
                className="text-link underline-offset-2 hover:text-accent hover:underline"
              >
                Open {redirectedPageSlugs[success.slug] ?? `/${success.slug}`}
              </a>
              {" (after deploy)"}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="btn btn-primary disabled:opacity-60"
        >
          {pending
            ? "Publishing…"
            : mode === "edit"
              ? "Update page"
              : "Publish page"}
        </button>
        <a href="/cms/pages" className="btn btn-secondary">
          Back to pages
        </a>
      </div>
    </form>
  );
}
