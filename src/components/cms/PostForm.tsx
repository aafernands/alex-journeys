"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  POST_BOOKING_TOOLS,
  type PostBookingTool,
  type PostItinerary,
} from "@/lib/post-types";
import { formatPostDate } from "@/lib/dates";
import {
  ItineraryEditor,
  itineraryFromInitial,
} from "./ItineraryEditor";
import type { SeoLinkCatalog } from "@/lib/seo-audit";
import { MediaPicker } from "./MediaPicker";
import { RichTextEditor } from "./RichTextEditor";
import { SeoPanel } from "./SeoPanel";

export type DestinationOption = { slug: string; name: string };

export type PostFormInitial = {
  title: string;
  slug: string;
  date: string;
  updatedAt?: string;
  excerpt: string;
  contentHtml: string;
  featuredImageUrl: string;
  featuredImageAlt: string;
  destinations: string[];
  guideHubs?: string[];
  bookingTools?: PostBookingTool[];
  bookingDestination?: string;
  experienceWidgetHtml?: string;
  itinerary?: PostItinerary;
  seoTitle?: string;
  seoDescription?: string;
  focusKeyword?: string;
  noindex?: boolean;
  membersOnly?: boolean;
};

type Props = {
  destinations: DestinationOption[];
  mode: "create" | "edit";
  initial?: Partial<PostFormInitial>;
  /** When editing a file under src/content/drafts */
  isDraft?: boolean;
  linkCatalog: SeoLinkCatalog;
};

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
  linkCatalog,
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
  const [selectedBookingTools, setSelectedBookingTools] = useState<PostBookingTool[]>(
    initial?.bookingTools ?? [],
  );
  const [bookingDestination, setBookingDestination] = useState(
    initial?.bookingDestination ?? "",
  );
  const [experienceWidgetHtml, setExperienceWidgetHtml] = useState(
    initial?.experienceWidgetHtml ?? "",
  );
  const [itinerary, setItinerary] = useState<PostItinerary>(() =>
    itineraryFromInitial(initial?.itinerary),
  );
  const [seoTitle, setSeoTitle] = useState(initial?.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(
    initial?.seoDescription ?? "",
  );
  const [focusKeyword, setFocusKeyword] = useState(initial?.focusKeyword ?? "");
  const [noindex, setNoindex] = useState(initial?.noindex === true);
  const [membersOnly, setMembersOnly] = useState(initial?.membersOnly === true);
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
            bookingTools: selectedBookingTools,
            bookingDestination,
            experienceWidgetHtml,
            itinerary: itinerary.enabled ? itinerary : { enabled: false },
            seoTitle,
            seoDescription,
            focusKeyword,
            noindex,
            membersOnly,
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
        // Draft saves: keep success banner + in-memory form (edit page loads
        // drafts from GitHub on next navigation/refresh). Publish still refreshes.
        if (!asDraft) {
          router.refresh();
        }
      } catch {
        setError("Network error. Try again.");
        setPending(null);
      }
    },
    [
      contentHtml,
      bookingDestination,
      date,
      excerpt,
      experienceWidgetHtml,
      focusKeyword,
      noindex,
      membersOnly,
      featuredImageAlt,
      featuredImageUrl,
      finalSlug,
      isDraft,
      itinerary,
      mode,
      router,
      selectedBookingTools,
      selectedDestinations,
      selectedGuideHubs,
      seoDescription,
      seoTitle,
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
                Publish date <span className="text-accent">*</span>
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
              <p className="mt-1 text-xs text-muted">
                First published date. Update &amp; publish sets a separate last-updated
                date on the live post.
              </p>
              {mode === "edit" && !isDraft && initial?.updatedAt ? (
                <p className="mt-1 text-xs text-muted">
                  Last updated {formatPostDate(initial.updatedAt)}
                </p>
              ) : null}
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <label htmlFor="cms-excerpt" className="text-sm font-semibold text-heading">
                Excerpt <span className="text-accent">*</span>
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
            <p className="mt-1 text-xs text-muted">
              {excerptHint} Shown on cards. The SEO panel uses this as the meta
              description when its description field is empty.
            </p>
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
                type="text"
                inputMode="url"
                value={featuredImageUrl}
                onChange={(e) => {
                  setFeaturedImageUrl(e.target.value);
                  markDirty();
                }}
                placeholder="/media/… or https://…"
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
            <legend className="text-sm font-semibold text-heading">Book from this post</legend>
            <p className="mt-1 text-xs text-muted">
              Add a booking box to the live article. Enter the exact city or place readers
              should see when they open Flights, Stays, or Experiences.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {POST_BOOKING_TOOLS.map((tool) => {
                const on = selectedBookingTools.includes(tool);
                const label =
                  tool === "flight"
                    ? "Flights"
                    : tool === "hotel"
                      ? "Hotels"
                      : "Experiences";
                return (
                  <label
                    key={tool}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-3 text-sm transition ${
                      on
                        ? "border-accent bg-accent/10 text-heading"
                        : "border-border bg-white text-text hover:border-border-strong"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="size-4 rounded border-border text-accent focus:ring-accent/25"
                      checked={on}
                      onChange={() => {
                        markDirty();
                        setSelectedBookingTools((prev) =>
                          on ? prev.filter((item) => item !== tool) : [...prev, tool],
                        );
                      }}
                    />
                    <span className="font-semibold">{label}</span>
                  </label>
                );
              })}
            </div>
            {selectedBookingTools.length > 0 ? (
              <div className="mt-4">
                <label
                  htmlFor="cms-booking-destination"
                  className="text-sm font-semibold text-heading"
                >
                  Booking destination *
                </label>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  Separate from the country tags above. Example: Niagara Falls, New York,
                  United States.
                </p>
                <input
                  id="cms-booking-destination"
                  value={bookingDestination}
                  onChange={(e) => {
                    setBookingDestination(e.target.value);
                    markDirty();
                  }}
                  required
                  maxLength={200}
                  placeholder="Niagara Falls, New York, United States"
                  className={fieldClass}
                />
                {!bookingDestination.trim() ? (
                  <p className="mt-2 text-xs font-semibold text-link">
                    Enter a booking destination before publishing.
                  </p>
                ) : null}
              </div>
            ) : null}

            {selectedBookingTools.includes("experience") ? (
              <div className="mt-4 rounded-lg border border-border bg-surface-soft p-4">
                <label
                  htmlFor="cms-experience-widget-html"
                  className="text-sm font-semibold text-heading"
                >
                  Experiences affiliate widget HTML
                </label>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  Paste the affiliate widget embed code here. Viator widget markup is supported.
                  Script tags are removed for security; Alex Journeys loads the approved
                  Viator widget script itself.
                </p>
                <textarea
                  id="cms-experience-widget-html"
                  value={experienceWidgetHtml}
                  onChange={(e) => {
                    setExperienceWidgetHtml(e.target.value);
                    markDirty();
                  }}
                  rows={8}
                  maxLength={20000}
                  spellCheck={false}
                  placeholder={'<div class="viator-widget" data-vi-partner-id="..." data-vi-widget-ref="..."></div>'}
                  className={areaClass + " font-mono text-xs"}
                />
                <p className="mt-2 text-xs text-muted">
                  Leave this blank to use the normal Experiences card instead.
                </p>
              </div>
            ) : null}
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

          <fieldset>
            <legend className="text-sm font-semibold text-heading">Members</legend>
            <p className="mt-1 text-xs text-muted">
              Readers see the excerpt, then a membership prompt, before the rest of the story.
              Booking tools on the post stay visible.
            </p>
            <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-sm text-text">
              <input
                type="checkbox"
                className="size-4 rounded border-border text-accent focus:ring-accent/25"
                checked={membersOnly}
                onChange={() => {
                  markDirty();
                  setMembersOnly((value) => !value);
                }}
              />
              Members only
            </label>
          </fieldset>

          <div>
            <label htmlFor="cms-content" className="text-sm font-semibold text-heading">
              Content <span className="text-accent">*</span>
            </label>
            <p className="mt-1 text-xs text-muted">
              Story prose — intro, photos, tips. Day-by-day plans belong in Trip
              timeline below, not here.
            </p>
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

          <ItineraryEditor
            value={itinerary}
            onChange={(next) => {
              setItinerary(next);
              markDirty();
            }}
          />
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
            {selectedBookingTools.length > 0 ? (
              <div className="mt-4 border-t border-border pt-4">
                <p className="text-xs font-bold uppercase tracking-wide text-muted">
                  Booking box
                </p>
                <p className="mt-1 text-sm text-text">
                  {selectedBookingTools
                    .map((tool) =>
                      tool === "flight" ? "Flights" : tool === "hotel" ? "Hotels" : "Experiences",
                    )
                    .join(" · ")}
                  {bookingDestination.trim()
                    ? ` · prefills ${bookingDestination.trim()}`
                    : " · destination required"}
                </p>
              </div>
            ) : null}
            {itinerary.enabled && itinerary.days.length > 0 ? (
              <div className="mt-4 border-t border-border pt-4">
                <p className="text-xs font-bold uppercase tracking-wide text-muted">
                  Timeline
                </p>
                <p className="mt-1 font-display text-base font-semibold text-heading">
                  {itinerary.title?.trim() || "Itinerary"}
                </p>
                <ul className="mt-2 space-y-2 text-xs text-text">
                  {itinerary.days.map((d) => (
                    <li key={d.id}>
                      <span className="font-semibold">{d.label}</span>
                      {d.title ? ` — ${d.title}` : ""}
                      {d.blocks.length
                        ? ` (${d.blocks.length} block${d.blocks.length === 1 ? "" : "s"})`
                        : ""}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <SeoPanel
        title={title}
        excerpt={excerpt}
        slug={finalSlug}
        seoTitle={seoTitle}
        seoDescription={seoDescription}
        focusKeyword={focusKeyword}
        noindex={noindex}
        onNoindex={setNoindex}
        contentHtml={contentHtml}
        featuredImageUrl={featuredImageUrl}
        featuredImageAlt={featuredImageAlt}
        itinerary={itinerary}
        linkCatalog={linkCatalog}
        onSeoTitle={setSeoTitle}
        onSeoDescription={setSeoDescription}
        onFocusKeyword={setFocusKeyword}
        onDirty={markDirty}
      />

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
        <Link href="/cms/posts" className="btn btn-secondary">
          Back to posts
        </Link>
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
