import Image from "next/image";
import Link from "next/link";
import { site } from "@/data/content";
import { getSiteDesign } from "@/lib/site-design";

export function Hero() {
  const design = getSiteDesign();
  const { hero } = design;
  const showStats = design.flags.showHeroStats && hero.stats.length > 0;

  return (
    <section
      id="top"
      className="page-grid relative overflow-hidden border-b border-border"
      aria-labelledby="hero-heading"
    >
      <div className="section-shell relative py-14 md:py-20 lg:py-24">
        <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12 xl:gap-16">
          {/* Copy column */}
          <div className="lg:col-span-5 xl:col-span-5">
            <p className="animate-fade-up inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-1.5 text-[0.8125rem] font-semibold uppercase tracking-[0.08em] text-heading">
              <span
                className="size-1.5 rounded-full bg-accent"
                aria-hidden="true"
              />
              <span className="text-heading">{site.name}</span>
              {hero.eyebrow ? (
                <>
                  <span className="text-muted" aria-hidden="true">
                    /
                  </span>
                  <span className="font-medium normal-case tracking-normal text-muted">
                    {hero.eyebrow}
                  </span>
                </>
              ) : null}
            </p>

            <h1
              id="hero-heading"
              className="animate-fade-up animate-delay-1 font-display text-hero mt-6 text-heading"
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
              <div className="animate-fade-up animate-delay-3 panel-soft mt-8 hidden p-4 sm:block">
                <p className="text-label text-heading">
                  {hero.fromTheRoad.label}
                </p>
                <ul
                  className={`mt-3 grid gap-2 text-sm text-text ${
                    hero.fromTheRoad.items.length >= 3
                      ? "sm:grid-cols-3"
                      : hero.fromTheRoad.items.length === 2
                        ? "sm:grid-cols-2"
                        : ""
                  }`}
                >
                  {hero.fromTheRoad.items.map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <span
                        className="size-1.5 shrink-0 rounded-full bg-accent"
                        aria-hidden="true"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          {/* Product window — travel photo framed in the same card language */}
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
              {showStats ? (
                <div className="grid grid-cols-3 divide-x divide-border border-t border-border bg-white text-center">
                  {hero.stats.map((stat) => (
                    <div key={`${stat.label}-${stat.value}`} className="px-3 py-3">
                      <p className="text-[0.8125rem] font-semibold uppercase tracking-wide text-muted">
                        {stat.label}
                      </p>
                      <p
                        className={`mt-0.5 text-sm font-semibold ${
                          stat.accent ? "text-accent" : "text-heading"
                        }`}
                      >
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
