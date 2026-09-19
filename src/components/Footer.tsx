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
      {/* Postcard / airmail newsletter */}
      <section
        id="newsletter"
        className="border-t border-border"
        aria-labelledby="newsletter-heading"
      >
        <div className="section-shell py-12 md:py-16">
          <div className="newsletter-postcard relative overflow-hidden rounded-xl bg-heading text-white shadow-[0_20px_50px_-28px_rgba(0,0,0,0.55)]">
            {/* Airmail stripe frame */}
            <div
              className="pointer-events-none absolute inset-0 rounded-xl opacity-90"
              style={{
                padding: "3px",
                background:
                  "repeating-linear-gradient(135deg, #f97316 0 14px, #ffffff 14px 22px, #1d4ed8 22px 36px, #ffffff 36px 44px)",
                WebkitMask:
                  "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
                WebkitMaskComposite: "xor",
                maskComposite: "exclude",
              }}
              aria-hidden="true"
            />

            {/* Giant postmark watermark */}
            <PostmarkWatermark className="pointer-events-none absolute -right-16 -top-10 h-[22rem] w-[22rem] rotate-[-18deg] text-white/25 md:-right-10 md:top-1/2 md:h-[26rem] md:w-[26rem] md:-translate-y-1/2" />

            {/* Soft paper glow */}
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(249,115,22,0.22),transparent_55%),radial-gradient(ellipse_at_90%_80%,rgba(255,255,255,0.06),transparent_45%)]"
              aria-hidden="true"
            />

            <div className="relative z-10 p-6 md:p-8 lg:p-10">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="eyebrow !text-accent">Dispatch from the road</p>
                  <h2
                    id="newsletter-heading"
                    className="font-display mt-2 max-w-xl text-3xl tracking-tight sm:text-4xl lg:text-[2.75rem]"
                  >
                    <span className="font-normal">The Traveler&apos;s</span>{" "}
                    <span className="font-bold">Journal</span>
                  </h2>
                </div>
                <PostageStamp className="hidden shrink-0 sm:block" />
              </div>

              <div className="mt-8 md:grid md:grid-cols-12 md:gap-12 md:items-start">
                <div className="md:col-span-7">
                  <p className="max-w-lg text-base leading-relaxed text-white/80">
                    Drop your email like a postcard home. Trip notes, hidden
                    corners, and journal dispatches — no agency pitches, just
                    what I&apos;m actually packing and booking.
                  </p>

                  <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">
                    <span className="size-1.5 rounded-full bg-accent" />
                    Postmark · free · unsubscribe anytime
                  </div>

                  <NewsletterForm />
                </div>

                <div className="mt-10 border-t border-white/10 pt-8 md:col-span-5 md:mt-0 md:border-t-0 md:border-l md:border-white/10 md:pt-0 md:pl-10">
                  <p className="eyebrow !text-accent">About the sender</p>
                  <div className="mt-3 flex gap-4">
                    <div className="relative size-14 shrink-0 overflow-hidden rounded-lg border border-white/15 bg-white/5 ring-2 ring-accent/30 ring-offset-2 ring-offset-heading">
                      <Image
                        src={site.authorPhoto}
                        alt={site.authorName}
                        fill
                        sizes="56px"
                        className="object-cover object-top"
                      />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-display text-xl font-bold text-white">
                        {about.headline}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-white/70">
                        {about.paragraphs[0]}
                      </p>
                      <Link
                        href="/about"
                        className="mt-3 inline-flex text-sm font-semibold text-white transition hover:text-accent"
                      >
                        Learn more →
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
      <div className="bg-near-black text-white">
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
