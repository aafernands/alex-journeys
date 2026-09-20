"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { MediaPicker } from "./MediaPicker";
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
  guideHubs?: string[];
};

type Props = {
  destinations: DestinationOption[];
  mode: "create" | "edit";
  initial?: Partial<PostFormInitial>;
  /** When editing a file under src/content/drafts */
  isDraft?: boolean;
};

type TemplateKind = "blank" | "itinerary";

const PLAN_A_TRIP = "plan-a-trip";

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
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isContentEmpty(html: string): boolean {
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length === 0;
}

function buildItineraryTemplate(days: number): string {
  const n = Math.min(14, Math.max(1, Math.floor(days) || 3));
  const parts: string[] = [
    "<p>Introduce the trip — where you went, when, and the vibe in a sentence or two…</p>",
  ];
  for (let i = 1; i <= n; i++) {
    parts.push(`<h2>Day ${i} — [Morning / place]</h2>`);
    for (const period of ["Morning", "Afternoon", "Evening"] as const) {
      parts.push(`<h3>${period}</h3>`);
      parts.push("<p>What you did…</p>");
    }
  }
  parts.push("<h2>Tips</h2>");
  parts.push(
    "<ul><li>Book early for popular spots…</li><li>Pack layers for changing weather…</li><li>Leave room for one spontaneous detour…</li></ul>",
  );
  return parts.join("\n");
}

const fieldClass =
  "mt-2 min-h-11 w-full rounded-lg border border-border bg-white px-4 text-sm text-heading placeholder:text-muted transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25";
const areaClass =
  "mt-2 w-full rounded-lg border border-border bg-white px-4 py-3 text-sm text-heading placeholder:text-muted transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25";

const EXCERPT_IDEAL_MIN = 150;
const EXCERPT_IDEAL_MAX = 160;
const EXCERPT_HARD_MAX = 600;

export function PostForm({
  destinations,
  mode,
  initial,
  isDraft = false,
}: Props) {
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
  const [selectedGuideHubs, setSelectedGuideHubs] = useState<string[]>(
    initial?.guideHubs ?? [],
  );
  const [templateKind, setTemplateKind] = useState<TemplateKind>("blank");
  const [itineraryDays, setItineraryDays] = useState(3);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    commitUrl: string;
    note: string;
    slug: string;
    draft?: boolean;
  } | null>(null);
  const [pending, setPending] = useState<"publish" | "draft" | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const baselineRef = useRef(false);

  const derivedSlug = useMemo(() => slugify(title), [title]);
  const finalSlug = slugTouched ? slug : derivedSlug || slug;
  const excerptLen = excerpt.length;
  const excerptHint =
    excerptLen === 0
      ? "Aim for ~150–160 characters for SEO meta descriptions."
      : excerptLen < EXCERPT_IDEAL_MIN
        ? `${excerptLen} chars — a bit short for SEO (ideal ${EXCERPT_IDEAL_MIN}–${EXCERPT_IDEAL_MAX}).`
        : excerptLen <= EXCERPT_IDEAL_MAX
          ? `${excerptLen} chars — good SEO length.`
          : excerptLen <= 200
            ? `${excerptLen} chars — a little long; search results may truncate.`
            : `${excerptLen} / ${EXCERPT_HARD_MAX} chars — consider shortening for meta.`;

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

  const insertItineraryTemplate = useCallback(() => {
    const days = Math.min(14, Math.max(1, itineraryDays || 3));
    if (!isContentEmpty(contentHtml)) {
      const ok = window.confirm(
        "Replace the current content with the day-by-day itinerary template?",
      );
      if (!ok) return;
    }
    setContentHtml(buildItineraryTemplate(days));
    if (!title.trim()) {
      const suggestion = `${days}-day itinerary: [Place]`;
      setTitle(suggestion);
      if (!slugTouched) setSlug(slugify(suggestion));
    }
    markDirty();
  }, [contentHtml, itineraryDays, markDirty, slugTouched, title]);

  const submit = useCallback(
    async (asDraft: boolean) => {
      setError(null);
      setSuccess(null);
      setPending(asDraft ? "draft" : "publish");
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
            guideHubs: selectedGuideHubs,
            update: mode === "edit" && !isDraft && !asDraft,
            draft: asDraft,
          }),
        });
        const data = (await res.json()) as {
          error?: string;
          commitUrl?: string;
          note?: string;
          slug?: string;
          draft?: boolean;
        };
        if (!res.ok) {
          setError(data.error || "Save failed.");
          setPending(null);
          return;
        }
        setDirty(false);
        setSuccess({
          commitUrl: data.commitUrl || "",
          note: data.note || (asDraft ? "Draft saved." : "Published."),
          slug: data.slug || finalSlug,
          draft: Boolean(data.draft || asDraft),
        });
        setPending(null);
        router.refresh();
      } catch {
        setError("Network error. Try again.");
        setPending(null);
      }
    },
    [
      contentHtml,
      date,
      excerpt,
      featuredImageAlt,
      featuredImageUrl,
      finalSlug,
      isDraft,
      mode,
      router,
      selectedDestinations,
      selectedGuideHubs,
      title,
    ],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (pending) return;
        void submit(isDraft || mode === "create");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isDraft, mode, pending, submit]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await submit(false);
  }

  const planATripOn = selectedGuideHubs.includes(PLAN_A_TRIP);

  return (
    <form className="panel space-y-5 p-6 md:p-8" onSubmit={onSubmit}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted">
          {dirty ? "Unsaved changes" : "Synced with form"}
          {" · "}
          <kbd className="rounded border border-border bg-surface-soft px-1.5 py-0.5 font-mono text-[0.65rem]">
            ⌘/Ctrl+S
          </kbd>{" "}
          {mode === "create" || isDraft ? "saves draft" : "publishes"}
        </p>
        <button
          type="button"
          className="btn btn-secondary text-xs"
          onClick={() => setShowPreview((v) => !v)}
        >
          {showPreview ? "Hide preview" : "Side-by-side preview"}
        </button>
      </div>

      <div className={showPreview ? "grid gap-6 lg:grid-cols-2" : ""}>
        <div className="space-y-5">
          <div>
            <label htmlFor="cms-title" className="text-sm font-semibold text-heading">
              Title <span className="text-accent">*</span>
            </label>
            <input
              id="cms-title"
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
              <label htmlFor="cms-slug" className="text-sm font-semibold text-heading">
                Slug <span className="text-accent">*</span>
              </label>
              <input
                id="cms-slug"
                value={slugTouched ? slug : derivedSlug || slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value.toLowerCase());
                  markDirty();
                }}
                required
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                disabled={mode === "edit" && !isDraft}
                className={`${fieldClass} disabled:bg-surface-soft`}
              />
              <p className="mt-1 text-xs text-muted">
                kebab-case · becomes /{"{slug}"}
              </p>
            </div>
            <div>
              <label htmlFor="cms-date" className="text-sm font-semibold text-heading">
                Date <span className="text-accent">*</span>
              </label>
              <input
                id="cms-date"
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  markDirty();
                }}
                required
                className={fieldClass}
              />
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <label htmlFor="cms-excerpt" className="text-sm font-semibold text-heading">
                Excerpt / meta description <span className="text-accent">*</span>
              </label>
              <span
                className={`text-xs ${
                  excerptLen >= EXCERPT_IDEAL_MIN && excerptLen <= EXCERPT_IDEAL_MAX
                    ? "text-steel"
                    : "text-muted"
                }`}
              >
                {excerptLen}/{EXCERPT_HARD_MAX}
              </span>
            </div>
            <textarea
              id="cms-excerpt"
              value={excerpt}
              onChange={(e) => {
                setExcerpt(e.target.value);
                markDirty();
              }}
              required
              rows={3}
              maxLength={EXCERPT_HARD_MAX}
              className={areaClass}
            />
            <p className="mt-1 text-xs text-muted">{excerptHint}</p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label htmlFor="cms-image-url" className="text-sm font-semibold text-heading">
                  Featured image URL
                </label>
                <button
                  type="button"
                  className="text-xs font-semibold text-link hover:text-accent"
                  onClick={() => setLibraryOpen(true)}
                >
                  Choose from library
                </button>
              </div>
              <input
                id="cms-image-url"
                type="url"
                value={featuredImageUrl}
                onChange={(e) => {
                  setFeaturedImageUrl(e.target.value);
                  markDirty();
                }}
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
                onChange={(e) => {
                  setFeaturedImageAlt(e.target.value);
                  markDirty();
                }}
                placeholder="Defaults to title"
                className={fieldClass}
              />
            </div>
          </div>

          {featuredImageUrl ? (
            <div className="overflow-hidden rounded-lg border border-border bg-surface-soft">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={featuredImageUrl}
                alt={featuredImageAlt || title || "Featured preview"}
                className="max-h-56 w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          ) : null}

          <fieldset>
            <legend className="text-sm font-semibold text-heading">Destinations</legend>
            <p className="mt-1 text-xs text-muted">
              These are Place pages (Canada, Iceland…). Checking one lists this
              post on that destination page automatically. There is no separate
              Categories UI — Destinations play that role for geography.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {destinations.length === 0 ? (
                <p className="text-sm text-muted">
                  No destinations yet. Add some under Destinations first.
                </p>
              ) : (
                destinations.map((d) => {
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
                          markDirty();
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
                })
              )}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-semibold text-heading">Guides</legend>
            <p className="mt-1 text-xs text-muted">
              Optionally list this post under a Guides hub (in addition to any
              curated links already on that page).
            </p>
            <div className="mt-3">
              <label
                className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                  planATripOn
                    ? "border-accent bg-accent/10 text-heading"
                    : "border-border bg-white text-text hover:border-border-strong"
                }`}
              >
                <input
                  type="checkbox"
                  className="size-4 rounded border-border text-accent focus:ring-accent/25"
                  checked={planATripOn}
                  onChange={() => {
                    markDirty();
                    setSelectedGuideHubs((prev) =>
                      planATripOn
                        ? prev.filter((s) => s !== PLAN_A_TRIP)
                        : [...prev, PLAN_A_TRIP],
                    );
                  }}
                />
                List under Guides → Plan a trip
              </label>
            </div>
          </fieldset>

          <div>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <label htmlFor="cms-content" className="text-sm font-semibold text-heading">
                Content <span className="text-accent">*</span>
              </label>
            </div>

            <div className="mt-2 rounded-lg border border-border bg-surface-soft p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Templates
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <div
                  className="inline-flex rounded-lg border border-border bg-white p-0.5"
                  role="group"
                  aria-label="Content template"
                >
                  <button
                    type="button"
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                      templateKind === "blank"
                        ? "bg-accent/15 text-heading"
                        : "text-muted hover:text-heading"
                    }`}
                    onClick={() => setTemplateKind("blank")}
                  >
                    Blank
                  </button>
                  <button
                    type="button"
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                      templateKind === "itinerary"
                        ? "bg-accent/15 text-heading"
                        : "text-muted hover:text-heading"
                    }`}
                    onClick={() => setTemplateKind("itinerary")}
                  >
                    Day-by-day itinerary
                  </button>
                </div>

                {templateKind === "itinerary" ? (
                  <>
                    <label className="flex items-center gap-2 text-xs text-heading">
                      Days
                      <input
                        type="number"
                        min={1}
                        max={14}
                        value={itineraryDays}
                        onChange={(e) => {
                          const n = Number(e.target.value);
                          setItineraryDays(
                            Number.isFinite(n)
                              ? Math.min(14, Math.max(1, n))
                              : 3,
                          );
                        }}
                        className="min-h-9 w-16 rounded-md border border-border bg-white px-2 text-sm"
                      />
                    </label>
                    <button
                      type="button"
                      className="btn btn-secondary text-xs"
                      onClick={insertItineraryTemplate}
                    >
                      Insert template
                    </button>
                  </>
                ) : null}
              </div>
              {templateKind === "itinerary" ? (
                <p className="mt-2 text-xs text-muted">
                  Inserts intro + Day 1…N (Morning / Afternoon / Evening) + Tips.
                  Replaces content only if empty, or after you confirm.
                </p>
              ) : null}
            </div>

            <RichTextEditor
              id="cms-content"
              value={contentHtml}
              onChange={(html) => {
                setContentHtml(html);
                markDirty();
              }}
              required
            />
          </div>
        </div>

        {showPreview ? (
          <div className="space-y-4 rounded-lg border border-border bg-surface-soft p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-muted">
              Preview
            </p>
            <h2 className="font-display text-2xl font-bold text-heading">
              {title || "Untitled"}
            </h2>
            <p className="text-sm text-muted">{excerpt || "No excerpt yet."}</p>
            {featuredImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={featuredImageUrl}
                alt={featuredImageAlt || title}
                className="max-h-48 w-full rounded-lg object-cover"
              />
            ) : null}
            <div
              className="post-prose text-sm text-heading"
              dangerouslySetInnerHTML={{
                __html:
                  contentHtml || "<p class='text-muted'>Start writing…</p>",
              }}
            />
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="text-sm font-medium text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {success ? (
        <div className="rounded-lg border border-border bg-surface-soft p-4 text-sm text-text">
          <p className="font-semibold text-heading">
            {success.draft ? "Draft saved" : "Published"}
          </p>
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
              {!success.draft ? (
                <>
                  {" · "}
                  <a
                    href={`/${success.slug}`}
                    className="text-link underline-offset-2 hover:text-accent hover:underline"
                  >
                    Open /{success.slug}
                  </a>
                  {" (after deploy)"}
                </>
              ) : (
                <>
                  {" · "}
                  <a
                    href={`/cms/edit/${success.slug}?draft=1`}
                    className="text-link underline-offset-2 hover:text-accent hover:underline"
                  >
                    Keep editing draft
                  </a>
                </>
              )}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3 pt-2">
        <button
          type="submit"
          disabled={pending !== null}
          className="btn btn-primary disabled:opacity-60"
        >
          {pending === "publish"
            ? "Publishing…"
            : mode === "edit" && !isDraft
              ? "Update & publish"
              : "Publish to GitHub"}
        </button>
        <button
          type="button"
          disabled={pending !== null}
          className="btn btn-secondary disabled:opacity-60"
          onClick={() => void submit(true)}
        >
          {pending === "draft" ? "Saving draft…" : "Save draft"}
        </button>
        <a href="/cms/posts" className="btn btn-secondary">
          Back to posts
        </a>
      </div>
    <MediaPicker
      open={libraryOpen}
      onClose={() => setLibraryOpen(false)}
      onSelect={({ url, alt }) => {
        setFeaturedImageUrl(url);
        if (alt) setFeaturedImageAlt(alt);
        markDirty();
      }}
      title="Featured image from library"
    />
    </form>
  );
}
