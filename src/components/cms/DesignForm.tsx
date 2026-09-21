"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { FeaturedSlideshowEditor } from "./FeaturedSlideshowEditor";
import { MediaPicker } from "./MediaPicker";
import {
  MAX_MEDIA_UPLOAD_BYTES,
  MAX_MEDIA_UPLOAD_LABEL,
} from "@/lib/cms/media-limits";
import {
  MAX_FROM_THE_ROAD_ITEMS,
  type FromTheRoadItem,
} from "@/lib/from-the-road";
import type { SiteDesign } from "@/lib/site-design";

type Props = {
  initial: SiteDesign;
};

const MAX_BYTES = MAX_MEDIA_UPLOAD_BYTES;

const fieldClass =
  "mt-1.5 w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-heading placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25";
const areaClass = `${fieldClass} min-h-[5.5rem] resize-y`;

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

export function DesignForm({ initial }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const logoLightFileRef = useRef<HTMLInputElement>(null);
  const logoDarkFileRef = useRef<HTMLInputElement>(null);

  const [hero, setHero] = useState(initial.hero);
  const [featuredSlideshow, setFeaturedSlideshow] = useState(
    initial.featuredSlideshow,
  );
  const [seoSnippet, setSeoSnippet] = useState(
    initial.seo.homeTitleSnippet || "",
  );
  const [showHeroStats, setShowHeroStats] = useState(
    initial.flags.showHeroStats,
  );
  const [homeSections, setHomeSections] = useState(initial.homeSections);
  const [branding, setBranding] = useState(initial.branding);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [authorLibraryOpen, setAuthorLibraryOpen] = useState(false);
  const [logoPicker, setLogoPicker] = useState<
    "logoOnLight" | "logoOnDark" | null
  >(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [pendingLogoOnLight, setPendingLogoOnLight] = useState<File | null>(
    null,
  );
  const [pendingLogoOnDark, setPendingLogoOnDark] = useState<File | null>(
    null,
  );
  const [localLogoOnLightPreview, setLocalLogoOnLightPreview] = useState<
    string | null
  >(null);
  const [localLogoOnDarkPreview, setLocalLogoOnDarkPreview] = useState<
    string | null
  >(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    commitUrl: string;
    note: string;
  } | null>(null);

  const previewSrc = localPreview || hero.image;
  const logoOnLightPreview = localLogoOnLightPreview || branding.logoOnLight;
  const logoOnDarkPreview = localLogoOnDarkPreview || branding.logoOnDark;

  function patchBranding<K extends keyof typeof branding>(
    key: K,
    value: (typeof branding)[K],
  ) {
    setBranding((b) => ({ ...b, [key]: value }));
    setSuccess(null);
  }

  function assertImageFile(file: File): string | null {
    if (file.size > MAX_BYTES) {
      return `Image too large. Max is about ${MAX_MEDIA_UPLOAD_LABEL}.`;
    }
    const type = (file.type || "").toLowerCase();
    if (
      !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(type)
    ) {
      return "Use JPEG, PNG, WebP, or GIF.";
    }
    return null;
  }

  function patchHero<K extends keyof typeof hero>(
    key: K,
    value: (typeof hero)[K],
  ) {
    setHero((h) => ({ ...h, [key]: value }));
    setSuccess(null);
  }

  return (
    <>
      <form
        className="space-y-8"
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          setSuccess(null);
          setPending(true);
          try {
            let dataUrl: string | undefined;
            let filename: string | undefined;
            if (pendingFile) {
              const errMsg = assertImageFile(pendingFile);
              if (errMsg) {
                setError(errMsg);
                setPending(false);
                return;
              }
              dataUrl = await readFileAsDataUrl(pendingFile);
              filename = pendingFile.name;
            }

            let logoOnLightDataUrl: string | undefined;
            let logoOnLightFilename: string | undefined;
            if (pendingLogoOnLight) {
              const errMsg = assertImageFile(pendingLogoOnLight);
              if (errMsg) {
                setError(`Logo (on light): ${errMsg}`);
                setPending(false);
                return;
              }
              logoOnLightDataUrl = await readFileAsDataUrl(pendingLogoOnLight);
              logoOnLightFilename = pendingLogoOnLight.name;
            }

            let logoOnDarkDataUrl: string | undefined;
            let logoOnDarkFilename: string | undefined;
            if (pendingLogoOnDark) {
              const errMsg = assertImageFile(pendingLogoOnDark);
              if (errMsg) {
                setError(`Logo (on dark): ${errMsg}`);
                setPending(false);
                return;
              }
              logoOnDarkDataUrl = await readFileAsDataUrl(pendingLogoOnDark);
              logoOnDarkFilename = pendingLogoOnDark.name;
            }

            const design: SiteDesign = {
              updatedAt: initial.updatedAt,
              branding,
              hero,
              featuredSlideshow,
              homeSections,
              seo: { homeTitleSnippet: seoSnippet.trim() },
              flags: { showHeroStats },
            };

            const res = await fetch("/api/cms/design", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                design,
                dataUrl,
                filename,
                logoOnLightDataUrl,
                logoOnLightFilename,
                logoOnDarkDataUrl,
                logoOnDarkFilename,
              }),
            });
            const data = (await res.json()) as {
              error?: string;
              ok?: boolean;
              commitUrl?: string;
              note?: string;
              design?: SiteDesign;
            };
            if (!res.ok || !data.ok) {
              setError(data.error || "Save failed.");
              setPending(false);
              return;
            }
            if (data.design) {
              setBranding(data.design.branding);
              setHero(data.design.hero);
              setFeaturedSlideshow(data.design.featuredSlideshow);
              setHomeSections(data.design.homeSections);
              setSeoSnippet(data.design.seo.homeTitleSnippet || "");
              setShowHeroStats(data.design.flags.showHeroStats);
            }
            setPendingFile(null);
            setLocalPreview(null);
            if (fileRef.current) fileRef.current.value = "";
            setPendingLogoOnLight(null);
            setPendingLogoOnDark(null);
            setLocalLogoOnLightPreview(null);
            setLocalLogoOnDarkPreview(null);
            if (logoLightFileRef.current) logoLightFileRef.current.value = "";
            if (logoDarkFileRef.current) logoDarkFileRef.current.value = "";
            setSuccess({
              commitUrl: data.commitUrl || "#",
              note:
                data.note ||
                "Committed. Live after Vercel redeploy.",
            });
            router.refresh();
          } catch {
            setError("Network error. Try again.");
          } finally {
            setPending(false);
          }
        }}
      >
        {/* Brand logos */}
        <section id="design-branding" className="panel scroll-mt-28 overflow-hidden">
          <div className="border-b border-border bg-surface-soft px-5 py-3">
            <h2 className="font-display text-sm font-bold uppercase tracking-wide text-heading">
              Brand logos
            </h2>
          </div>
          <div className="space-y-6 p-5 md:p-6">
            <p className="text-sm text-muted">
              Sitewide wordmark used in the header, footer, mobile drawer, and
              outbound interstitial. Dark mark for light backgrounds; white mark
              for dark mode and the near-black footer. The dark mark is also the
              Organization JSON-LD logo. Choose from the media library or upload
              a file (JPEG, PNG, WebP, GIF · max ~{MAX_MEDIA_UPLOAD_LABEL}).
              Live after Vercel redeploy.
            </p>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-4 rounded-xl border border-border bg-surface-soft/40 p-4">
                <div>
                  <p className="text-sm font-bold text-heading">
                    Logo on light
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    Dark / black mark for light UI backgrounds
                  </p>
                </div>
                <div className="flex min-h-24 items-center justify-center rounded-lg border border-border bg-white p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={logoOnLightPreview}
                    alt="Logo on light preview"
                    className="max-h-16 w-auto object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.opacity = "0.3";
                    }}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-secondary text-sm"
                    onClick={() => setLogoPicker("logoOnLight")}
                  >
                    Choose from library
                  </button>
                  <label className="btn btn-secondary cursor-pointer text-sm">
                    Upload new
                    <input
                      ref={logoLightFileRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif,image/*"
                      className="sr-only"
                      onChange={(e) => {
                        setError(null);
                        setSuccess(null);
                        const file = e.target.files?.[0];
                        if (!file) {
                          setPendingLogoOnLight(null);
                          setLocalLogoOnLightPreview(null);
                          return;
                        }
                        setPendingLogoOnLight(file);
                        setLocalLogoOnLightPreview(URL.createObjectURL(file));
                      }}
                    />
                  </label>
                </div>
                {pendingLogoOnLight ? (
                  <p className="text-xs text-muted">
                    Will upload on save: {pendingLogoOnLight.name}
                  </p>
                ) : null}
                <div>
                  <label
                    htmlFor="design-logo-on-light"
                    className="text-sm font-semibold text-heading"
                  >
                    Path / URL
                  </label>
                  <input
                    id="design-logo-on-light"
                    value={branding.logoOnLight}
                    onChange={(e) => {
                      setPendingLogoOnLight(null);
                      setLocalLogoOnLightPreview(null);
                      if (logoLightFileRef.current)
                        logoLightFileRef.current.value = "";
                      patchBranding("logoOnLight", e.target.value);
                    }}
                    placeholder="/brand/… or /media/…"
                    className={fieldClass}
                  />
                </div>
              </div>

              <div className="space-y-4 rounded-xl border border-border bg-surface-soft/40 p-4">
                <div>
                  <p className="text-sm font-bold text-heading">
                    Logo on dark
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    White / light mark for dark UI backgrounds
                  </p>
                </div>
                <div className="flex min-h-24 items-center justify-center rounded-lg border border-border bg-zinc-900 p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={logoOnDarkPreview}
                    alt="Logo on dark preview"
                    className="max-h-16 w-auto object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.opacity = "0.3";
                    }}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-secondary text-sm"
                    onClick={() => setLogoPicker("logoOnDark")}
                  >
                    Choose from library
                  </button>
                  <label className="btn btn-secondary cursor-pointer text-sm">
                    Upload new
                    <input
                      ref={logoDarkFileRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif,image/*"
                      className="sr-only"
                      onChange={(e) => {
                        setError(null);
                        setSuccess(null);
                        const file = e.target.files?.[0];
                        if (!file) {
                          setPendingLogoOnDark(null);
                          setLocalLogoOnDarkPreview(null);
                          return;
                        }
                        setPendingLogoOnDark(file);
                        setLocalLogoOnDarkPreview(URL.createObjectURL(file));
                      }}
                    />
                  </label>
                </div>
                {pendingLogoOnDark ? (
                  <p className="text-xs text-muted">
                    Will upload on save: {pendingLogoOnDark.name}
                  </p>
                ) : null}
                <div>
                  <label
                    htmlFor="design-logo-on-dark"
                    className="text-sm font-semibold text-heading"
                  >
                    Path / URL
                  </label>
                  <input
                    id="design-logo-on-dark"
                    value={branding.logoOnDark}
                    onChange={(e) => {
                      setPendingLogoOnDark(null);
                      setLocalLogoOnDarkPreview(null);
                      if (logoDarkFileRef.current)
                        logoDarkFileRef.current.value = "";
                      patchBranding("logoOnDark", e.target.value);
                    }}
                    placeholder="/brand/… or /media/…"
                    className={fieldClass}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Homepage hero image */}
        <section id="design-hero" className="panel scroll-mt-28 overflow-hidden">
          <div className="border-b border-border bg-surface-soft px-5 py-3">
            <h2 className="font-display text-sm font-bold uppercase tracking-wide text-heading">
              Homepage hero
            </h2>
          </div>
          <div className="space-y-5 p-5 md:p-6">
            <p className="text-sm text-muted">
              Full-bleed photo behind the “Inspire. Capture. Discover.” headline
              only. This is <strong>not</strong> the featured field-note card —
              manage that in <strong>Featured slideshow</strong> below. Pick from
              the media library or upload a new file (JPEG, PNG, WebP, GIF · max
              ~{MAX_MEDIA_UPLOAD_LABEL}).
            </p>
            <div className="overflow-hidden rounded-xl border border-border bg-surface-soft">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewSrc}
                alt={hero.imageAlt || "Hero preview"}
                className="max-h-64 w-full object-cover"
                style={{ objectPosition: hero.objectPosition || "center" }}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.opacity = "0.3";
                }}
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="btn btn-secondary text-sm"
                onClick={() => setLibraryOpen(true)}
              >
                Choose from library
              </button>
              <label className="btn btn-secondary cursor-pointer text-sm">
                Upload new
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,image/*"
                  className="sr-only"
                  onChange={(e) => {
                    setError(null);
                    setSuccess(null);
                    const file = e.target.files?.[0];
                    if (!file) {
                      setPendingFile(null);
                      setLocalPreview(null);
                      return;
                    }
                    setPendingFile(file);
                    setLocalPreview(URL.createObjectURL(file));
                  }}
                />
              </label>
            </div>
            {pendingFile ? (
              <p className="text-xs text-muted">
                Will upload on save: {pendingFile.name}
              </p>
            ) : null}
            <div>
              <label
                htmlFor="design-image-url"
                className="text-sm font-semibold text-heading"
              >
                Image URL / path
              </label>
              <input
                id="design-image-url"
                value={hero.image}
                onChange={(e) => {
                  setPendingFile(null);
                  setLocalPreview(null);
                  if (fileRef.current) fileRef.current.value = "";
                  patchHero("image", e.target.value);
                }}
                placeholder="/media/…"
                className={fieldClass}
              />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="design-image-alt"
                  className="text-sm font-semibold text-heading"
                >
                  Alt text
                </label>
                <input
                  id="design-image-alt"
                  value={hero.imageAlt}
                  onChange={(e) => patchHero("imageAlt", e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div>
                <label
                  htmlFor="design-image-caption"
                  className="text-sm font-semibold text-heading"
                >
                  Location label on hero photo
                </label>
                <input
                  id="design-image-caption"
                  value={hero.imageCaption}
                  onChange={(e) => patchHero("imageCaption", e.target.value)}
                  placeholder="Maroon Bells · Colorado"
                  className={fieldClass}
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="design-object-position"
                className="text-sm font-semibold text-heading"
              >
                Object position
              </label>
              <input
                id="design-object-position"
                value={hero.objectPosition}
                onChange={(e) => patchHero("objectPosition", e.target.value)}
                placeholder="center, top, 50% 30%"
                className={fieldClass}
              />
            </div>
            <label className="flex items-center gap-2.5 text-sm text-text">
              <input
                type="checkbox"
                checked={hero.overlay}
                onChange={(e) => patchHero("overlay", e.target.checked)}
                className="size-4 rounded border-border text-accent focus:ring-accent/30"
              />
              Soft dark overlay on hero image
            </label>
          </div>
        </section>

        {/* Hero copy */}
        <section className="panel overflow-hidden">
          <div className="border-b border-border bg-surface-soft px-5 py-3">
            <h2 className="font-display text-sm font-bold uppercase tracking-wide text-heading">
              Hero copy &amp; CTAs
            </h2>
          </div>
          <div className="space-y-5 p-5 md:p-6">
            <div>
              <label
                htmlFor="design-eyebrow"
                className="text-sm font-semibold text-heading"
              >
                Eyebrow / badge text
              </label>
              <input
                id="design-eyebrow"
                value={hero.eyebrow}
                onChange={(e) => patchHero("eyebrow", e.target.value)}
                placeholder="Personal travel journal"
                className={fieldClass}
              />
              <p className="mt-1 text-xs text-muted">
                Shown after the site name in the small pill above the headline.
              </p>
            </div>
            <div>
              <label
                htmlFor="design-tagline"
                className="text-sm font-semibold text-heading"
              >
                Tagline <span className="text-accent">*</span>
              </label>
              <input
                id="design-tagline"
                value={hero.tagline}
                onChange={(e) => patchHero("tagline", e.target.value)}
                required
                className={fieldClass}
              />
            </div>
            <div>
              <label
                htmlFor="design-subtitle"
                className="text-sm font-semibold text-heading"
              >
                Subtitle <span className="text-accent">*</span>
              </label>
              <textarea
                id="design-subtitle"
                value={hero.subtitle}
                onChange={(e) => patchHero("subtitle", e.target.value)}
                required
                rows={3}
                className={areaClass}
              />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="design-cta1-label"
                  className="text-sm font-semibold text-heading"
                >
                  Primary CTA label
                </label>
                <input
                  id="design-cta1-label"
                  value={hero.ctaPrimary.label}
                  onChange={(e) =>
                    patchHero("ctaPrimary", {
                      ...hero.ctaPrimary,
                      label: e.target.value,
                    })
                  }
                  className={fieldClass}
                />
                <label
                  htmlFor="design-cta1-href"
                  className="mt-3 block text-sm font-semibold text-heading"
                >
                  Primary CTA link
                </label>
                <input
                  id="design-cta1-href"
                  value={hero.ctaPrimary.href}
                  onChange={(e) =>
                    patchHero("ctaPrimary", {
                      ...hero.ctaPrimary,
                      href: e.target.value,
                    })
                  }
                  className={fieldClass}
                />
              </div>
              <div>
                <label
                  htmlFor="design-cta2-label"
                  className="text-sm font-semibold text-heading"
                >
                  Secondary CTA label
                </label>
                <input
                  id="design-cta2-label"
                  value={hero.ctaSecondary.label}
                  onChange={(e) =>
                    patchHero("ctaSecondary", {
                      ...hero.ctaSecondary,
                      label: e.target.value,
                    })
                  }
                  className={fieldClass}
                />
                <label
                  htmlFor="design-cta2-href"
                  className="mt-3 block text-sm font-semibold text-heading"
                >
                  Secondary CTA link
                </label>
                <input
                  id="design-cta2-href"
                  value={hero.ctaSecondary.href}
                  onChange={(e) =>
                    patchHero("ctaSecondary", {
                      ...hero.ctaSecondary,
                      href: e.target.value,
                    })
                  }
                  className={fieldClass}
                />
              </div>
            </div>
          </div>
        </section>

        {/* From the road (hero strip only) */}
        <section className="panel overflow-hidden">
          <div className="border-b border-border bg-surface-soft px-5 py-3">
            <h2 className="font-display text-sm font-bold uppercase tracking-wide text-heading">
              From the road (hero strip)
            </h2>
          </div>
          <div className="space-y-5 p-5 md:p-6">
            <p className="text-sm text-muted">
              Small list under the hero headline CTAs. Photo stats for the
              featured card live in Featured slideshow, not here.
            </p>
            <label className="flex items-center gap-2.5 text-sm text-text">
              <input
                type="checkbox"
                checked={hero.showFromTheRoad}
                onChange={(e) =>
                  patchHero("showFromTheRoad", e.target.checked)
                }
                className="size-4 rounded border-border text-accent focus:ring-accent/30"
              />
              Show “From the road” strip under the CTAs
            </label>
            <div>
              <label
                htmlFor="design-ftr-label"
                className="text-sm font-semibold text-heading"
              >
                Strip heading
              </label>
              <input
                id="design-ftr-label"
                value={hero.fromTheRoad.label}
                onChange={(e) =>
                  patchHero("fromTheRoad", {
                    ...hero.fromTheRoad,
                    label: e.target.value,
                  })
                }
                className={fieldClass}
              />
            </div>
            <div className="space-y-4">
              <p className="text-sm font-semibold text-heading">
                Strip items
              </p>
              <p className="text-xs text-muted">
                Each item is a real link on the desktop hero strip. Defaults:
                Places → /destinations, Stories → /blog, Tools → /tools.
              </p>
              {hero.fromTheRoad.items.map((item, index) => (
                <div
                  key={`ftr-${index}`}
                  className="grid gap-3 rounded-lg border border-border bg-surface-soft/50 p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
                >
                  <div>
                    <label
                      htmlFor={`design-ftr-label-${index}`}
                      className="text-sm font-semibold text-heading"
                    >
                      Label
                    </label>
                    <input
                      id={`design-ftr-label-${index}`}
                      value={item.label}
                      onChange={(e) => {
                        const items = hero.fromTheRoad.items.map((row, i) =>
                          i === index ? { ...row, label: e.target.value } : row,
                        );
                        patchHero("fromTheRoad", {
                          ...hero.fromTheRoad,
                          items,
                        });
                      }}
                      className={fieldClass}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`design-ftr-href-${index}`}
                      className="text-sm font-semibold text-heading"
                    >
                      Link
                    </label>
                    <input
                      id={`design-ftr-href-${index}`}
                      value={item.href}
                      onChange={(e) => {
                        const items = hero.fromTheRoad.items.map((row, i) =>
                          i === index ? { ...row, href: e.target.value } : row,
                        );
                        patchHero("fromTheRoad", {
                          ...hero.fromTheRoad,
                          items,
                        });
                      }}
                      placeholder="/destinations"
                      className={fieldClass}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary h-[2.625rem] text-sm"
                    onClick={() =>
                      patchHero("fromTheRoad", {
                        ...hero.fromTheRoad,
                        items: hero.fromTheRoad.items.filter((_, i) => i !== index),
                      })
                    }
                    disabled={hero.fromTheRoad.items.length <= 1}
                    aria-label={`Remove strip item ${item.label || index + 1}`}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="btn btn-secondary text-sm"
                disabled={hero.fromTheRoad.items.length >= MAX_FROM_THE_ROAD_ITEMS}
                onClick={() => {
                  const next: FromTheRoadItem = { label: "", href: "/" };
                  patchHero("fromTheRoad", {
                    ...hero.fromTheRoad,
                    items: [...hero.fromTheRoad.items, next].slice(
                      0,
                      MAX_FROM_THE_ROAD_ITEMS,
                    ),
                  });
                }}
              >
                Add item
              </button>
            </div>
          </div>
        </section>

        <FeaturedSlideshowEditor
          value={featuredSlideshow}
          onChange={(next) => {
            setFeaturedSlideshow(next);
            setSuccess(null);
          }}
          onError={(message) => {
            setError(message);
            if (message) setSuccess(null);
          }}
        />


        {/* Homepage section chrome */}
        <section className="panel overflow-hidden">
          <div className="border-b border-border bg-surface-soft px-5 py-3">
            <h2 className="font-display text-sm font-bold uppercase tracking-wide text-heading">
              Homepage sections
            </h2>
          </div>
          <div className="space-y-8 p-5 md:p-6">
            <p className="text-sm text-muted">
              Edit major homepage section titles and copy (Start here, Places,
              Latest stories, Guides, Tools, Google Sign-In note, Author intro).
              Cards and hub lists stay data-driven where noted.
            </p>

            {(
              [
                ["startHere", "Start here"],
                ["places", "Places strip"],
                ["latest", "Latest stories"],
                ["guides", "Guides strip"],
                ["tools", "Tools strip"],
              ] as const
            ).map(([key, label]) => {
              const section = homeSections[key];
              return (
                <div
                  key={key}
                  id={`design-${key}`}
                  className="scroll-mt-28 rounded-lg border border-border bg-surface-soft/50 p-4"
                >
                  <p className="text-sm font-bold text-heading">{label}</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wide text-muted">
                        Eyebrow
                      </label>
                      <input
                        value={section.eyebrow}
                        onChange={(e) => {
                          setHomeSections((hs) => ({
                            ...hs,
                            [key]: { ...section, eyebrow: e.target.value },
                          }));
                          setSuccess(null);
                        }}
                        className={fieldClass}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wide text-muted">
                        Title
                      </label>
                      <input
                        value={section.title}
                        onChange={(e) => {
                          setHomeSections((hs) => ({
                            ...hs,
                            [key]: { ...section, title: e.target.value },
                          }));
                          setSuccess(null);
                        }}
                        className={fieldClass}
                      />
                    </div>
                  </div>
                  {"description" in section ? (
                    <div className="mt-3">
                      <label className="text-xs font-semibold uppercase tracking-wide text-muted">
                        Description
                      </label>
                      <textarea
                        value={section.description || ""}
                        onChange={(e) => {
                          setHomeSections((hs) => ({
                            ...hs,
                            [key]: { ...section, description: e.target.value },
                          }));
                          setSuccess(null);
                        }}
                        rows={2}
                        className={areaClass}
                      />
                    </div>
                  ) : null}
                  {"ctaLabel" in section ? (
                    <div className="mt-3">
                      <label className="text-xs font-semibold uppercase tracking-wide text-muted">
                        CTA label
                      </label>
                      <input
                        value={section.ctaLabel || ""}
                        onChange={(e) => {
                          setHomeSections((hs) => ({
                            ...hs,
                            [key]: { ...section, ctaLabel: e.target.value },
                          }));
                          setSuccess(null);
                        }}
                        className={fieldClass}
                      />
                    </div>
                  ) : null}
                </div>
              );
            })}

            <div className="rounded-lg border border-border bg-surface-soft/50 p-4">
              <p className="text-sm font-bold text-heading">
                Start here cards (JSON)
              </p>
              <p className="mt-1 text-xs text-muted">
                Array of title, href, icon, description, cta.
              </p>
              <textarea
                value={JSON.stringify(homeSections.startHere.cards, null, 2)}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value) as unknown;
                    if (!Array.isArray(parsed)) return;
                    setHomeSections((hs) => ({
                      ...hs,
                      startHere: {
                        ...hs.startHere,
                        cards: parsed as typeof hs.startHere.cards,
                      },
                    }));
                    setSuccess(null);
                    setError(null);
                  } catch {
                    /* allow typing invalid JSON until blur/save */
                  }
                }}
                rows={10}
                spellCheck={false}
                className={`${areaClass} font-mono text-xs`}
              />
            </div>

            <div
              id="design-oauth"
              className="scroll-mt-28 rounded-lg border border-border bg-surface-soft/50 p-4"
            >
              <p className="text-sm font-bold text-heading">Google Sign-In note</p>
              <div className="mt-3 grid gap-3">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Eyebrow
                  </label>
                  <input
                    value={homeSections.oauthNote.eyebrow}
                    onChange={(e) => {
                      setHomeSections((hs) => ({
                        ...hs,
                        oauthNote: {
                          ...hs.oauthNote,
                          eyebrow: e.target.value,
                        },
                      }));
                      setSuccess(null);
                    }}
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Title (blank = site name)
                  </label>
                  <input
                    value={homeSections.oauthNote.title}
                    onChange={(e) => {
                      setHomeSections((hs) => ({
                        ...hs,
                        oauthNote: { ...hs.oauthNote, title: e.target.value },
                      }));
                      setSuccess(null);
                    }}
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Body
                  </label>
                  <textarea
                    value={homeSections.oauthNote.body}
                    onChange={(e) => {
                      setHomeSections((hs) => ({
                        ...hs,
                        oauthNote: { ...hs.oauthNote, body: e.target.value },
                      }));
                      setSuccess(null);
                    }}
                    rows={3}
                    className={areaClass}
                  />
                </div>
              </div>
            </div>

            <div
              id="design-author"
              className="scroll-mt-28 rounded-lg border border-border bg-surface-soft/50 p-4"
            >
              <p className="text-sm font-bold text-heading">Author intro</p>
              <p className="mt-1 text-xs text-muted">
                Portrait shown on the homepage right after the hero. Pick from
                the media library (upload new files under Media first if needed).
              </p>
              <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="relative size-28 shrink-0 overflow-hidden rounded-lg border border-border bg-white sm:size-32">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={
                      homeSections.author.photo ||
                      "/brand/alex-fernandes.jpg"
                    }
                    alt={
                      homeSections.author.photoAlt || "Author photo preview"
                    }
                    className="h-full w-full object-cover object-top"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.opacity = "0.3";
                    }}
                  />
                </div>
                <div className="min-w-0 flex-1 space-y-3">
                  <button
                    type="button"
                    className="btn btn-secondary text-sm"
                    onClick={() => setAuthorLibraryOpen(true)}
                  >
                    Choose from library
                  </button>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-muted">
                      Photo URL / path
                    </label>
                    <input
                      value={homeSections.author.photo}
                      onChange={(e) => {
                        setHomeSections((hs) => ({
                          ...hs,
                          author: { ...hs.author, photo: e.target.value },
                        }));
                        setSuccess(null);
                      }}
                      placeholder="/media/… or /brand/…"
                      className={fieldClass}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-muted">
                      Photo alt text
                    </label>
                    <input
                      value={homeSections.author.photoAlt}
                      onChange={(e) => {
                        setHomeSections((hs) => ({
                          ...hs,
                          author: { ...hs.author, photoAlt: e.target.value },
                        }));
                        setSuccess(null);
                      }}
                      placeholder="Alex Fernandes"
                      className={fieldClass}
                    />
                  </div>
                </div>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Eyebrow
                  </label>
                  <input
                    value={homeSections.author.eyebrow}
                    onChange={(e) => {
                      setHomeSections((hs) => ({
                        ...hs,
                        author: { ...hs.author, eyebrow: e.target.value },
                      }));
                      setSuccess(null);
                    }}
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Headline
                  </label>
                  <input
                    value={homeSections.author.headline}
                    onChange={(e) => {
                      setHomeSections((hs) => ({
                        ...hs,
                        author: { ...hs.author, headline: e.target.value },
                      }));
                      setSuccess(null);
                    }}
                    className={fieldClass}
                  />
                </div>
              </div>
              <div className="mt-3">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Body
                </label>
                <textarea
                  value={homeSections.author.body}
                  onChange={(e) => {
                    setHomeSections((hs) => ({
                      ...hs,
                      author: { ...hs.author, body: e.target.value },
                    }));
                    setSuccess(null);
                  }}
                  rows={3}
                  className={areaClass}
                />
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Learn more link label / href
                  </label>
                  <input
                    value={homeSections.author.primaryCta.label}
                    onChange={(e) => {
                      setHomeSections((hs) => ({
                        ...hs,
                        author: {
                          ...hs.author,
                          primaryCta: {
                            ...hs.author.primaryCta,
                            label: e.target.value,
                          },
                        },
                      }));
                      setSuccess(null);
                    }}
                    className={fieldClass}
                  />
                  <input
                    value={homeSections.author.primaryCta.href}
                    onChange={(e) => {
                      setHomeSections((hs) => ({
                        ...hs,
                        author: {
                          ...hs.author,
                          primaryCta: {
                            ...hs.author.primaryCta,
                            href: e.target.value,
                          },
                        },
                      }));
                      setSuccess(null);
                    }}
                    className={fieldClass}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SEO + theme stub */}
        <section className="panel overflow-hidden">
          <div className="border-b border-border bg-surface-soft px-5 py-3">
            <h2 className="font-display text-sm font-bold uppercase tracking-wide text-heading">
              SEO &amp; theme
            </h2>
          </div>
          <div className="space-y-5 p-5 md:p-6">
            <div>
              <label
                htmlFor="design-seo-snippet"
                className="text-sm font-semibold text-heading"
              >
                Homepage title snippet (optional)
              </label>
              <input
                id="design-seo-snippet"
                value={seoSnippet}
                onChange={(e) => {
                  setSeoSnippet(e.target.value);
                  setSuccess(null);
                }}
                placeholder="Leave blank to keep the site default"
                className={fieldClass}
              />
              <p className="mt-1 text-xs text-muted">
                Reserved for a future homepage &lt;title&gt; override. Empty =
                unchanged.
              </p>
            </div>
            <div className="rounded-lg border border-dashed border-border bg-surface-soft p-4">
              <p className="text-sm font-semibold text-heading">Theme</p>
              <p className="mt-1 text-sm text-muted">
                Full visual theme builder (fonts, color tokens) — coming next.
                Hero design ships first so you can change the homepage image and
                copy without waiting on a theme UI.
              </p>
            </div>
          </div>
        </section>

        {error ? (
          <p className="text-sm font-medium text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        {success ? (
          <div className="rounded-lg border border-border bg-surface-soft p-4 text-sm text-text">
            <p className="font-semibold text-heading">Design saved</p>
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
          {pending ? "Saving…" : "Save website design"}
        </button>
      </form>

      <MediaPicker
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        title="Choose homepage hero image (headline photo only)"
        onSelect={(item) => {
          setPendingFile(null);
          setLocalPreview(null);
          if (fileRef.current) fileRef.current.value = "";
          setHero((h) => ({
            ...h,
            image: item.url,
            imageAlt: item.alt || h.imageAlt,
          }));
          setSuccess(null);
        }}
      />

      <MediaPicker
        open={logoPicker !== null}
        onClose={() => setLogoPicker(null)}
        title={
          logoPicker === "logoOnDark"
            ? "Choose logo (on dark)"
            : "Choose logo (on light)"
        }
        onSelect={(item) => {
          if (logoPicker === "logoOnDark") {
            setPendingLogoOnDark(null);
            setLocalLogoOnDarkPreview(null);
            if (logoDarkFileRef.current) logoDarkFileRef.current.value = "";
            patchBranding("logoOnDark", item.url);
          } else {
            setPendingLogoOnLight(null);
            setLocalLogoOnLightPreview(null);
            if (logoLightFileRef.current) logoLightFileRef.current.value = "";
            patchBranding("logoOnLight", item.url);
          }
          setLogoPicker(null);
        }}
      />

      <MediaPicker
        open={authorLibraryOpen}
        onClose={() => setAuthorLibraryOpen(false)}
        title="Choose author intro photo"
        onSelect={(item) => {
          setHomeSections((hs) => ({
            ...hs,
            author: {
              ...hs.author,
              photo: item.url,
              photoAlt: item.alt || hs.author.photoAlt,
            },
          }));
          setSuccess(null);
        }}
      />
    </>
  );
}
