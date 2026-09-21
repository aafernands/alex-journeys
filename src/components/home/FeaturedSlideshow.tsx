"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useState } from "react";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Compass,
  Leaf,
  Mountain,
  Play,
  Sun,
  Trees,
  type LucideIcon,
} from "lucide-react";
import type { FeaturedSlide, FeaturedSlideshow, HeroStat } from "@/lib/site-design";

const NATURE_ICONS: LucideIcon[] = [Sun, Camera, Compass];

function iconForStat(stat: HeroStat, index: number): LucideIcon {
  const hay = `${stat.label} ${stat.value}`.toLowerCase();
  if (/sun|light|sunrise|dawn|day/.test(hay)) return Sun;
  if (/camera|photo|capture|shot|frame/.test(hay)) return Camera;
  if (/compass|trail|map|discover|route|nav/.test(hay)) return Compass;
  if (/mountain|alpine|peak|summit|ridge/.test(hay)) return Mountain;
  if (/tree|forest|leaf|nature|green|season/.test(hay)) return Trees;
  if (/journal|story|inspire|field|note/.test(hay)) return Leaf;
  return NATURE_ICONS[index % NATURE_ICONS.length];
}

function NatureIconStrip({ stats }: { stats: HeroStat[] }) {
  const visible = stats.filter((s) => s.label.trim() || s.value.trim());
  if (!visible.length) return null;

  return (
    <ul className="grid grid-cols-3 gap-2 border-t border-border/70 bg-surface-soft/70 px-2 py-3.5 sm:gap-3 sm:px-4">
      {visible.map((stat, i) => {
        const Icon = iconForStat(stat, i);
        return (
          <li
            key={`${stat.label}-${stat.value}-${i}`}
            className="relative flex min-w-0 items-center gap-2.5 px-1 sm:gap-3 sm:px-1.5"
          >
            {i > 0 ? (
              <span
                className="absolute -left-1.5 top-1/2 hidden h-7 w-px -translate-y-1/2 bg-gradient-to-b from-transparent via-sand to-transparent sm:block"
                aria-hidden="true"
              />
            ) : null}
            <span
              className={`flex size-9 shrink-0 items-center justify-center rounded-full ${
                stat.accent
                  ? "bg-accent/15 text-accent"
                  : "bg-surface text-steel"
              }`}
            >
              <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
            </span>
            <span className="min-w-0 text-left">
              <span className="block truncate text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted">
                {stat.label}
              </span>
              <span
                className={`mt-0.5 block truncate text-sm font-semibold ${
                  stat.accent ? "text-accent" : "text-heading"
                }`}
              >
                {stat.value}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

type Props = {
  slideshow: FeaturedSlideshow;
  slides: FeaturedSlide[];
  headingId?: string;
};

export function FeaturedSlideshowView({ slideshow, slides, headingId }: Props) {
  const generatedId = useId();
  const labelId = headingId || generatedId;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const multi = slides.length > 1;
  const safeIndex = slides.length ? index % slides.length : 0;
  const slide = slides[safeIndex];

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!slideshow.autoplay || paused || reducedMotion || !multi) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, slideshow.intervalMs);
    return () => window.clearInterval(id);
  }, [
    slideshow.autoplay,
    slideshow.intervalMs,
    paused,
    reducedMotion,
    multi,
    slides.length,
  ]);

  if (!slide) return null;

  function go(next: number) {
    setIndex((next + slides.length) % slides.length);
  }

  const canAutoplay = slideshow.autoplay && multi && !reducedMotion;
  const live = paused || !canAutoplay ? "polite" : "off";

  return (
    <div
      className="grid items-center gap-8 lg:grid-cols-12 lg:gap-12"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setPaused(false);
        }
      }}
    >
      <div className="lg:col-span-7">
        <div
          className="panel overflow-hidden shadow-sm"
          role="region"
          aria-roledescription="carousel"
          aria-labelledby={labelId}
        >
          <div className="window-chrome">
            <span className="window-dot" aria-hidden="true" />
            <span className="window-dot" aria-hidden="true" />
            <span className="window-dot" aria-hidden="true" />
            <span className="ml-2 truncate text-sm-tight font-semibold text-muted">
              {slide.caption || "Field note"}
            </span>
            {slide.windowBadge ? (
              <span className="ml-auto hidden rounded-md border border-border bg-surface px-2 py-0.5 text-[0.8125rem] font-semibold uppercase tracking-wide text-muted sm:inline">
                {slide.windowBadge}
              </span>
            ) : null}
          </div>
          <div
            className="relative aspect-[4/3] bg-surface sm:aspect-[16/11]"
            aria-live={live}
            aria-atomic="true"
          >
            <Image
              src={slide.image}
              alt={slide.imageAlt || slide.caption || "Featured field note"}
              fill
              sizes="(max-width: 1024px) 100vw, 55vw"
              className="object-cover"
            />
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-black/5 to-transparent"
              aria-hidden="true"
            />
          </div>
          <NatureIconStrip stats={slide.stats} />
          {multi ? (
            <div className="flex items-center justify-between gap-3 border-t border-border bg-surface-soft/60 px-3 py-2.5">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  className="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-surface text-heading transition hover:border-border-strong"
                  onClick={() => go(safeIndex - 1)}
                  aria-label="Previous field note"
                >
                  <ChevronLeft size={18} strokeWidth={2} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-surface text-heading transition hover:border-border-strong"
                  onClick={() => go(safeIndex + 1)}
                  aria-label="Next field note"
                >
                  <ChevronRight size={18} strokeWidth={2} aria-hidden="true" />
                </button>
              </div>
              <div className="flex min-w-0 items-center gap-2">
                <p className="shrink-0 text-[11px] font-semibold tabular-nums text-muted">
                  {safeIndex + 1} of {slides.length}
                </p>
                <div
                  className="flex items-center gap-1.5"
                  role="tablist"
                  aria-label="Field notes"
                >
                  {slides.map((item, i) => {
                    const selected = i === safeIndex;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        aria-label={`Show slide ${i + 1}${item.caption ? `: ${item.caption}` : ""}`}
                        className={`rounded-full transition ${
                          selected
                            ? "h-2.5 w-7 bg-accent"
                            : "h-2.5 w-2.5 bg-heading/30 hover:bg-heading/50"
                        }`}
                        onClick={() => setIndex(i)}
                      />
                    );
                  })}
                </div>
              </div>
              {canAutoplay ? (
                <button
                  type="button"
                  className="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-surface text-heading transition hover:border-border-strong"
                  onClick={() => setPaused((p) => !p)}
                  aria-label={paused ? "Play slideshow" : "Pause slideshow"}
                >
                  {paused ? (
                    <Play
                      size={16}
                      strokeWidth={2.5}
                      fill="currentColor"
                      aria-hidden="true"
                    />
                  ) : (
                    <span
                      className="inline-flex h-3.5 items-center gap-[3px]"
                      aria-hidden="true"
                    >
                      <span className="h-full w-[3.5px] rounded-[1px] bg-current" />
                      <span className="h-full w-[3.5px] rounded-[1px] bg-current" />
                    </span>
                  )}
                </button>
              ) : (
                <span className="size-9" aria-hidden="true" />
              )}
            </div>
          ) : null}
        </div>
      </div>

      <div className="lg:col-span-5">
        {slideshow.eyebrow ? (
          <p className="eyebrow">{slideshow.eyebrow}</p>
        ) : null}
        <h2
          id={labelId}
          className={`font-display text-display text-heading ${slideshow.eyebrow ? "mt-2" : ""}`}
        >
          {slideshow.title || "A field note worth opening."}
        </h2>
        {slide.note ? (
          <p className="mt-3 max-w-md text-lead text-text">{slide.note}</p>
        ) : null}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {slide.href ? (
            <Link href={slide.href} className="btn btn-ink btn-block sm:w-auto">
              {slide.ctaLabel || "Read the story"}
              <span aria-hidden="true">→</span>
            </Link>
          ) : null}
          {slideshow.secondaryCta.href && slideshow.secondaryCta.label ? (
            <Link
              href={slideshow.secondaryCta.href}
              className="btn btn-secondary btn-block sm:w-auto"
            >
              {slideshow.secondaryCta.label}
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
