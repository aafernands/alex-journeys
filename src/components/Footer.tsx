"use client";

import Image from "next/image";
import Link from "next/link";
import { NewsletterForm } from "@/components/newsletter/NewsletterForm";
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
      {/* Dark inset CTA / newsletter slab */}
      <section
        id="newsletter"
        className="border-t border-border"
        aria-labelledby="newsletter-heading"
      >
        <div className="section-shell py-12 md:py-16">
          <div className="rounded-xl bg-heading p-6 text-white md:p-8 lg:p-10">
            <div className="md:grid md:grid-cols-12 md:gap-12">
              <div className="md:col-span-7">
                <p className="eyebrow !text-accent">Newsletter</p>
                <h2
                  id="newsletter-heading"
                  className="font-display mt-2 text-3xl tracking-tight sm:text-4xl"
                >
                  <span className="font-normal">The Traveler&apos;s</span>{" "}
                  <span className="font-bold">Journal</span>
                </h2>
                <p className="mt-4 max-w-lg text-base leading-relaxed text-white/75">
                  Join for travel inspiration, trip notes, and exclusive insights
                  from the road — no agency pitches, just the journal.
                </p>

                <NewsletterForm />
              </div>

              <div className="mt-10 border-t border-white/10 pt-8 md:col-span-5 md:mt-0 md:border-t-0 md:border-l md:pt-0 md:pl-10">
                <p className="eyebrow !text-accent">About</p>
                <div className="mt-3 flex gap-4">
                  <div className="relative size-14 shrink-0 overflow-hidden rounded-lg border border-white/15 bg-white/5">
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
