import Image from "next/image";
import Link from "next/link";
import { hero, site } from "@/data/content";

export function Hero() {
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
            <p className="animate-fade-up inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-heading">
              <span
                className="size-1.5 rounded-full bg-accent"
                aria-hidden="true"
              />
              <span className="text-heading">{site.name}</span>
              <span className="text-muted" aria-hidden="true">
                /
              </span>
              <span className="font-medium normal-case tracking-normal text-muted">
                Personal travel journal
              </span>
            </p>

            <h1
              id="hero-heading"
              className="animate-fade-up animate-delay-1 font-display text-hero mt-6 text-heading"
            >
              {hero.tagline}
            </h1>

            <p className="animate-fade-up animate-delay-2 mt-5 max-w-md text-base leading-relaxed text-text md:text-[1.0625rem]">
              {hero.subtitle}
            </p>

            <div className="animate-fade-up animate-delay-3 mt-8 flex w-full max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:items-center">
              <Link
                href="/destinations"
                className="btn btn-ink btn-block sm:w-auto sm:min-w-[11rem]"
              >
                {hero.ctaPrimary}
                <span aria-hidden="true">→</span>
              </Link>
              <Link
                href="/blog"
                className="btn btn-secondary btn-block sm:w-auto sm:min-w-[11rem]"
              >
                {hero.ctaSecondary}
              </Link>
            </div>

            {/* Compact status strip — product density without nursing copy */}
            <div className="animate-fade-up animate-delay-3 panel-soft mt-8 hidden p-4 sm:block">
              <p className="text-label text-heading">From the road</p>
              <ul className="mt-3 grid gap-2 text-sm text-text sm:grid-cols-3">
                <li className="flex items-center gap-2">
                  <span
                    className="size-1.5 shrink-0 rounded-full bg-accent"
                    aria-hidden="true"
                  />
                  Places visited
                </li>
                <li className="flex items-center gap-2">
                  <span
                    className="size-1.5 shrink-0 rounded-full bg-accent"
                    aria-hidden="true"
                  />
                  Trip notes &amp; photos
                </li>
                <li className="flex items-center gap-2">
                  <span
                    className="size-1.5 shrink-0 rounded-full bg-accent"
                    aria-hidden="true"
                  />
                  Tools I still use
                </li>
              </ul>
            </div>
          </div>

          {/* Product window — travel photo framed in the same card language */}
          <div className="animate-fade-up animate-delay-2 lg:col-span-7 xl:col-span-7">
            <div className="panel overflow-hidden shadow-sm">
              <div className="window-chrome">
                <span className="window-dot" aria-hidden="true" />
                <span className="window-dot" aria-hidden="true" />
                <span className="window-dot" aria-hidden="true" />
                <span className="ml-2 truncate text-xs font-semibold text-muted">
                  Maroon Bells · Colorado
                </span>
                <span className="ml-auto hidden rounded-md border border-border bg-white px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-muted sm:inline">
                  Field note
                </span>
              </div>
              <div className="relative aspect-[4/3] bg-surface sm:aspect-[16/11]">
                <Image
                  src={hero.image}
                  alt={hero.imageAlt}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 55vw"
                  className="object-cover object-center"
                />
              </div>
              <div className="grid grid-cols-3 divide-x divide-border border-t border-border bg-white text-center">
                <div className="px-3 py-3">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted">
                    Light
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-heading">
                    Sunrise
                  </p>
                </div>
                <div className="px-3 py-3">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted">
                    Season
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-heading">
                    Alpine
                  </p>
                </div>
                <div className="px-3 py-3">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted">
                    Journal
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-accent">
                    Featured
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
