"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RichTextEditor } from "./RichTextEditor";

export type DestinationOption = { slug: string; name: string };

export type PostFormInitial = {
  title: string;
  slug: string;
  date: string;
  excerpt: string;
  contentHtml: string;
  featuredImageUrl: string;
  featuredImageAlt: string;
  destinations: string[];
};

type Props = {
  destinations: DestinationOption[];
  mode: "create" | "edit";
  initial?: Partial<PostFormInitial>;
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

function todayDateInput(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const fieldClass =
  "mt-2 min-h-11 w-full rounded-lg border border-border bg-white px-4 text-sm text-heading placeholder:text-muted transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25";
const areaClass =
  "mt-2 w-full rounded-lg border border-border bg-white px-4 py-3 text-sm text-heading placeholder:text-muted transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25";

export function PostForm({ destinations, mode, initial }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [date, setDate] = useState(
    initial?.date?.slice(0, 10) ?? todayDateInput(),
  );
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? "");
  const [contentHtml, setContentHtml] = useState(initial?.contentHtml ?? "");
  const [featuredImageUrl, setFeaturedImageUrl] = useState(
    initial?.featuredImageUrl ?? "",
  );
  const [featuredImageAlt, setFeaturedImageAlt] = useState(
    initial?.featuredImageAlt ?? "",
  );
  const [selectedDestinations, setSelectedDestinations] = useState<string[]>(
    initial?.destinations ?? [],
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    commitUrl: string;
    note: string;
    slug: string;
  } | null>(null);
  const [pending, setPending] = useState(false);

  const derivedSlug = useMemo(() => slugify(title), [title]);

  return (
    <form
      className="panel space-y-5 p-6 md:p-8"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setPending(true);
        const finalSlug = slugTouched ? slug : derivedSlug || slug;
        try {
          const res = await fetch("/api/cms/posts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title,
              slug: finalSlug,
              date,
              excerpt,
              contentHtml,
              featuredImageUrl,
              featuredImageAlt: featuredImageAlt || title,
              destinations: selectedDestinations,
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
          setSuccess({
            commitUrl: data.commitUrl || "",
            note: data.note || "Published.",
            slug: data.slug || finalSlug,
          });
          setPending(false);
          if (mode === "create") {
            router.refresh();
          }
        } catch {
          setError("Network error. Try again.");
          setPending(false);
        }
      }}
    >
      <div>
        <label htmlFor="cms-title" className="text-sm font-semibold text-heading">
          Title <span className="text-accent">*</span>
        </label>
        <input
          id="cms-title"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (!slugTouched) setSlug(slugify(e.target.value));
          }}
          required
          className={fieldClass}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="cms-slug" className="text-sm font-semibold text-heading">
            Slug <span className="text-accent">*</span>
          </label>
          <input
            id="cms-slug"
            value={slugTouched ? slug : derivedSlug || slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value.toLowerCase());
            }}
            required
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            disabled={mode === "edit"}
            className={`${fieldClass} disabled:bg-surface-soft`}
          />
          <p className="mt-1 text-xs text-muted">kebab-case only · becomes /blog/{"{slug}"}</p>
        </div>
        <div>
          <label htmlFor="cms-date" className="text-sm font-semibold text-heading">
            Date <span className="text-accent">*</span>
          </label>
          <input
            id="cms-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className={fieldClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="cms-excerpt" className="text-sm font-semibold text-heading">
          Excerpt <span className="text-accent">*</span>
        </label>
        <textarea
          id="cms-excerpt"
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          required
          rows={3}
          maxLength={600}
          className={areaClass}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="cms-image-url" className="text-sm font-semibold text-heading">
            Featured image URL
          </label>
          <input
            id="cms-image-url"
            type="url"
            value={featuredImageUrl}
            onChange={(e) => setFeaturedImageUrl(e.target.value)}
            placeholder="https://…"
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor="cms-image-alt" className="text-sm font-semibold text-heading">
            Featured image alt
          </label>
          <input
            id="cms-image-alt"
            value={featuredImageAlt}
            onChange={(e) => setFeaturedImageAlt(e.target.value)}
            placeholder="Defaults to title"
            className={fieldClass}
          />
        </div>
      </div>

      <fieldset>
        <legend className="text-sm font-semibold text-heading">Destinations</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {destinations.map((d) => {
            const on = selectedDestinations.includes(d.slug);
            return (
              <label
                key={d.slug}
                className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm transition ${
                  on
                    ? "border-accent bg-accent/10 text-heading"
                    : "border-border bg-white text-text hover:border-border-strong"
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={on}
                  onChange={() => {
                    setSelectedDestinations((prev) =>
                      on
                        ? prev.filter((s) => s !== d.slug)
                        : [...prev, d.slug],
                    );
                  }}
                />
                {d.name}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div>
        <label htmlFor="cms-content" className="text-sm font-semibold text-heading">
          Content <span className="text-accent">*</span>
        </label>
        <RichTextEditor
          id="cms-content"
          value={contentHtml}
          onChange={setContentHtml}
          required
        />
      </div>

      {error ? (
        <p className="text-sm font-medium text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {success ? (
        <div className="panel-soft rounded-lg border border-border p-4 text-sm text-text">
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
                href={`/blog/${success.slug}`}
                className="text-link underline-offset-2 hover:text-accent hover:underline"
              >
                Open /blog/{success.slug}
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
              ? "Update post"
              : "Publish to GitHub"}
        </button>
        <a href="/cms" className="btn btn-secondary">
          Back to dashboard
        </a>
      </div>
    </form>
  );
}
