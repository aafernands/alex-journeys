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
import { Section } from "@/components/ui/Section";
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

/**
 * Post-hero field-note card — reuses the window-chrome photo treatment
 * that used to live in the hero.
 */
export function FeaturedFieldNote() {
  const design = getSiteDesign();
  const { hero } = design;
  const showStats = design.flags.showHeroStats && hero.stats.length > 0;

  return (
    <Section
      id="featured-field-note"
      tone="soft"
      hairline
      size="md"
      aria-labelledby="featured-field-note-heading"
    >
      <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-7">
          <div className="panel overflow-hidden shadow-sm">
            <div className="window-chrome">
              <span className="window-dot" aria-hidden="true" />
              <span className="window-dot" aria-hidden="true" />
              <span className="window-dot" aria-hidden="true" />
              <span className="ml-2 truncate text-sm-tight font-semibold text-muted">
                {hero.imageCaption}
              </span>
              {hero.windowBadge ? (
                <span className="ml-auto hidden rounded-md border border-border bg-white px-2 py-0.5 text-[0.8125rem] font-semibold uppercase tracking-wide text-muted sm:inline dark:bg-surface">
                  {hero.windowBadge}
                </span>
              ) : null}
            </div>
            <div className="relative aspect-[4/3] bg-surface sm:aspect-[16/11]">
              <Image
                src={hero.image}
                alt={hero.imageAlt}
                fill
                sizes="(max-width: 1024px) 100vw, 55vw"
                className="object-cover"
                style={{ objectPosition: hero.objectPosition || "center" }}
              />
              <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-black/5 to-transparent"
                aria-hidden="true"
              />
            </div>
            {showStats ? <NatureIconStrip stats={hero.stats} /> : null}
          </div>
        </div>

        <div className="lg:col-span-5">
          <p className="eyebrow">From the road</p>
          <h2
            id="featured-field-note-heading"
            className="font-display mt-2 text-display text-heading"
          >
            A field note worth opening.
          </h2>
          <p className="mt-3 max-w-md text-lead text-text">
            Sunrise at {hero.imageCaption.replace(" · ", ", ")} — cold air,
            quiet lake, and the kind of light that makes you glad you left
            before dawn. Start here for places, stories, and guides from trips
            already behind me.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link href="/marron-bells" className="btn btn-ink btn-block sm:w-auto">
              Read the sunrise story
              <span aria-hidden="true">→</span>
            </Link>
            <Link
              href="/start-here"
              className="btn btn-secondary btn-block sm:w-auto"
            >
              New here? Start here
            </Link>
          </div>
        </div>
      </div>
    </Section>
  );
}
