import Image from "next/image";
import Link from "next/link";
import {
  Camera,
  Compass,
  Leaf,
  Mountain,
  Sun,
  Trees,
  type LucideIcon,
} from "lucide-react";
import { getSiteDesign, type HeroStat } from "@/lib/site-design";

const NATURE_ICONS: LucideIcon[] = [Sun, Camera, Compass];

/** Pick a Lucide nature icon from CMS label/value keywords; else cycle defaults. */
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

/** Soft mountain silhouette — light decorative ground behind hero copy. */
function HeroNatureBackdrop() {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] max-h-[28rem] select-none"
      aria-hidden="true"
    >
      <svg
        className="h-full w-full text-sand opacity-[0.45] dark:opacity-[0.22]"
        viewBox="0 0 1440 420"
        preserveAspectRatio="xMidYMax slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fill="currentColor"
          d="M0 420V268c48-22 112-58 188-62 92-5 148 48 236 52 78 4 124-38 198-48 86-12 148 34 220 28 64-5 108-42 172-38 78 5 128 58 210 54 62-3 106-36 156-48 28-7 52-8 60-8v182H0Z"
        />
        <path
          fill="currentColor"
          className="opacity-70"
          d="M0 420V312c62-18 128-46 210-42 96 5 152 54 248 48 78-5 122-44 198-52 90-10 154 36 236 32 70-3 118-40 186-36 72 4 124 52 200 46 48-4 88-26 122-40 18-8 32-14 40-16v168H0Z"
        />
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
          className="opacity-40"
          d="M0 318c90-28 170-70 278-66 118 4 178 62 292 56 98-5 156-52 256-58 108-6 178 48 268 42 72-5 130-38 186-54 28-8 50-12 60-14"
        />
      </svg>
      {/* Soft cream wash so mountains stay quiet behind type */}
      <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/70 to-transparent" />
    </div>
  );
}

function NatureIconStrip({ stats }: { stats: HeroStat[] }) {
  return (
    <ul className="grid grid-cols-3 gap-2 border-t border-border/70 bg-surface-soft/70 px-2 py-3.5 sm:gap-3 sm:px-4">
      {stats.map((stat, i) => {
        const Icon = iconForStat(stat, i);
        return (
          <li
            key={`${stat.label}-${stat.value}`}
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
                  : "bg-white/90 text-steel dark:bg-surface"
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

export function Hero() {
  const design = getSiteDesign();
  const { hero } = design;
  const showStats = design.flags.showHeroStats && hero.stats.length > 0;

  return (
    <section
      id="top"
      className="relative overflow-hidden border-b border-border bg-bg"
      aria-labelledby="hero-heading"
    >
      <HeroNatureBackdrop />

      <div className="section-shell relative py-14 md:py-20 lg:py-24">
        <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12 xl:gap-16">
          {/* Copy column */}
          <div className="lg:col-span-5 xl:col-span-5">
            <h1
              id="hero-heading"
              className="animate-fade-up font-display text-hero text-heading"
            >
              {hero.tagline}
            </h1>

            <p className="animate-fade-up animate-delay-2 mt-5 max-w-md text-lead text-text">
              {hero.subtitle}
            </p>

            <div className="animate-fade-up animate-delay-3 mt-8 flex w-full max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:items-center">
              <Link
                href={hero.ctaPrimary.href}
                className="btn btn-ink btn-block sm:w-auto sm:min-w-[11rem]"
              >
                {hero.ctaPrimary.label}
                <span aria-hidden="true">→</span>
              </Link>
              <Link
                href={hero.ctaSecondary.href}
                className="btn btn-secondary btn-block sm:w-auto sm:min-w-[11rem]"
              >
                {hero.ctaSecondary.label}
              </Link>
            </div>

            {hero.showFromTheRoad ? (
              <div className="animate-fade-up animate-delay-3 mt-8 hidden sm:block">
                <p className="inline-flex items-center gap-2 text-label text-heading">
                  <Trees
                    size={14}
                    strokeWidth={2}
                    className="text-accent"
                    aria-hidden="true"
                  />
                  {hero.fromTheRoad.label}
                </p>
                <ul className="mt-3 flex flex-wrap items-center gap-x-1 gap-y-2 text-sm text-text">
                  {hero.fromTheRoad.items.map((item, i) => (
                    <li key={item} className="inline-flex items-center gap-2">
                      {i > 0 ? (
                        <span
                          className="mx-1.5 text-muted-light"
                          aria-hidden="true"
                        >
                          ·
                        </span>
                      ) : null}
                      <Leaf
                        size={12}
                        strokeWidth={2}
                        className="shrink-0 text-accent/80"
                        aria-hidden="true"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          {/* Travel photo */}
          <div className="animate-fade-up animate-delay-2 lg:col-span-7 xl:col-span-7">
            <div className="panel overflow-hidden shadow-sm">
              <div className="window-chrome">
                <span className="window-dot" aria-hidden="true" />
                <span className="window-dot" aria-hidden="true" />
                <span className="window-dot" aria-hidden="true" />
                <span className="ml-2 truncate text-sm-tight font-semibold text-muted">
                  {hero.imageCaption}
                </span>
                {hero.windowBadge ? (
                  <span className="ml-auto hidden rounded-md border border-border bg-white px-2 py-0.5 text-[0.8125rem] font-semibold uppercase tracking-wide text-muted sm:inline">
                    {hero.windowBadge}
                  </span>
                ) : null}
              </div>
              <div className="relative aspect-[4/3] bg-surface sm:aspect-[16/11]">
                <Image
                  src={hero.image}
                  alt={hero.imageAlt}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 55vw"
                  className="object-cover"
                  style={{ objectPosition: hero.objectPosition || "center" }}
                />
                {hero.overlay ? (
                  <div
                    className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-black/10 to-transparent"
                    aria-hidden="true"
                  />
                ) : null}
              </div>
              {showStats ? <NatureIconStrip stats={hero.stats} /> : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
