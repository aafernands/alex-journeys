"use client";

import Image from "next/image";
import Link from "next/link";
import { NewsletterForm } from "@/components/newsletter/NewsletterForm";
import {
  PostageStamp,
  PostmarkWatermark,
} from "@/components/newsletter/PostmarkWatermark";
import { site, about } from "@/data/content";

const social = [
  { label: "Instagram", href: site.social.instagram },
  { label: "YouTube", href: site.social.youtube },
  { label: "Pinterest", href: site.social.pinterest },
];

const explore = [
  { href: "/destinations", label: "Places" },
  { href: "/blog", label: "Stories" },
  { href: "/guides", label: "Guides" },
  { href: "/start-here", label: "Start here" },
  { href: "/tools", label: "Tools I use" },
];

const company = [
  { href: "/about", label: "About" },
  { href: "/media-kit", label: "Media kit" },
  { href: "/contact", label: "Contact" },
  { href: "/policies", label: "Policies" },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-bg" role="contentinfo">
            {/* Journal spread newsletter */}
      <section
        id="newsletter"
        className="border-t border-border bg-surface/40"
        aria-labelledby="newsletter-heading"
      >
        <div className="section-shell py-12 md:py-16">
          <div className="newsletter-postcard relative overflow-hidden rounded-sm border border-border bg-white text-heading shadow-[0_18px_40px_-28px_rgba(31,26,20,0.45)]">
            {/* Ruled paper lines */}
            <div
              className="pointer-events-none absolute inset-0 opacity-70"
              style={{
                backgroundImage:
                  "linear-gradient(to bottom, transparent 0, transparent calc(2rem - 1px), color-mix(in srgb, var(--sand) 55%, transparent) calc(2rem - 1px), color-mix(in srgb, var(--sand) 55%, transparent) 2rem)",
                backgroundSize: "100% 2rem",
                backgroundPosition: "0 3.5rem",
              }}
              aria-hidden="true"
            />
            {/* Margin line */}
            <div
              className="pointer-events-none absolute bottom-0 left-8 top-0 w-px bg-[color-mix(in_srgb,#c45c4a_40%,transparent)] md:left-10"
              aria-hidden="true"
            />

            <PostmarkWatermark className="pointer-events-none absolute -right-10 bottom-[-2rem] h-64 w-64 rotate-[-14deg] text-heading/10 md:h-80 md:w-80" />

            <div className="relative z-10 p-6 pl-12 md:p-10 md:pl-14">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="journal-entry-label">
                    <span aria-hidden="true">✉</span>
                    New entry · subscribe
                  </p>
                  <h2
                    id="newsletter-heading"
                    className="font-display mt-4 max-w-xl text-3xl tracking-tight text-heading sm:text-4xl lg:text-[2.6rem]"
                  >
                    Keep this journal{" "}
                    <span className="italic text-accent-deep">open</span>
                  </h2>
                  <p className="mt-3 max-w-lg text-base leading-relaxed text-text">
                    Leave your email like a note on the last page. I&apos;ll
                    send trip notes, places I&apos;m still thinking about, and
                    the tools that actually made the packing list — no agency
                    noise.
                  </p>
                </div>
                <PostageStamp className="hidden shrink-0 sm:block" />
              </div>

              <div className="mt-8 md:grid md:grid-cols-12 md:items-start md:gap-12">
                <div className="md:col-span-7">
                  <NewsletterForm variant="journal" />
                </div>

                <div className="mt-10 border-t border-dashed border-border pt-8 md:col-span-5 md:mt-0 md:border-l md:border-t-0 md:pl-10 md:pt-0">
                  <p className="text-label text-muted">About the author</p>
                  <div className="mt-3 flex gap-4">
                    <div className="relative size-14 shrink-0 overflow-hidden rounded-sm border border-border bg-surface ring-1 ring-sand">
                      <Image
                        src={site.authorPhoto}
                        alt={site.authorName}
                        fill
                        sizes="56px"
                        className="object-cover object-top"
                      />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-display text-xl font-semibold text-heading">
                        {about.headline}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-text/80">
                        {about.paragraphs[0]}
                      </p>
                      <Link
                        href="/about"
                        className="mt-3 inline-flex text-sm font-semibold text-link transition hover:text-accent-deep"
                      >
                        Read the about page →
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

{/* Full-bleed dark footer */}
      <div className="border-t border-border bg-ink text-[color-mix(in_srgb,var(--white)_92%,transparent)]">
        <div className="section-shell py-12 md:py-14">
          <div className="grid gap-10 md:grid-cols-12 md:gap-8">
            <div className="md:col-span-4">
              <p className="font-display text-lg font-bold tracking-tight">
                {site.name}
              </p>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-white/60">
                A personal travel journal by {site.authorName}. Places
                I&apos;ve been, notes from the road.
              </p>
              <nav aria-label="Social" className="mt-6">
                <ul className="flex flex-wrap gap-2">
                  {social.map((item) => (
                    <li key={item.label}>
                      <a
                        href={item.href}
                        className="inline-flex rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm font-semibold text-white/90 transition hover:bg-white/10"
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        {item.label}
                      </a>
                    </li>
                  ))}
                  <li>
                    <a
                      href={site.social.coffee}
                      className="inline-flex rounded-lg border border-accent/40 bg-accent/15 px-3 py-1.5 text-sm font-semibold text-accent transition hover:bg-accent/25"
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      Buy me a coffee
                    </a>
                  </li>
                </ul>
              </nav>
            </div>

            <div className="md:col-span-3">
              <p className="text-label text-white/45">Explore</p>
              <ul className="mt-3 space-y-2">
                {explore.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-sm text-white/70 transition hover:text-accent"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="md:col-span-3">
              <p className="text-label text-white/45">Journal</p>
              <ul className="mt-3 space-y-2">
                {company.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-sm text-white/70 transition hover:text-accent"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="md:col-span-2">
              <p className="text-label text-white/45">Contact</p>
              <a
                href={`mailto:${site.email}`}
                className="mt-3 inline-block text-sm text-white/70 transition hover:text-accent"
              >
                {site.email}
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10">
          <div className="section-shell flex flex-col gap-3 py-5 text-sm text-white/45 md:flex-row md:items-center md:justify-between">
            <p>
              © {year} {site.name}. Personal travel journal.
            </p>
            <Link
              href="#top"
              className="inline-flex items-center gap-1.5 self-start rounded-lg border border-white/15 px-3 py-1.5 text-white/70 transition hover:bg-white/5 hover:text-white md:self-auto"
            >
              Back to top
              <span aria-hidden="true">↑</span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
