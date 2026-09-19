"use client";

import Link from "next/link";
import { site, about } from "@/data/content";

const social = [
  { label: "Instagram", href: site.social.instagram },
  { label: "YouTube", href: site.social.youtube },
  { label: "Pinterest", href: site.social.pinterest },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-surface-soft" role="contentinfo">
      {/* Traveler's Journal newsletter */}
      <section
        id="newsletter"
        className="border-b border-surface"
        aria-labelledby="newsletter-heading"
      >
        <div className="mx-auto max-w-6xl px-5 py-14 md:grid md:grid-cols-12 md:gap-12 md:px-8 md:py-16">
          <div className="md:col-span-7">
            <h2
              id="newsletter-heading"
              className="font-display text-4xl tracking-tight text-heading sm:text-5xl"
            >
              <span className="font-normal">The Traveler&apos;s</span>
              <br />
              <span className="font-bold">Journal</span>
            </h2>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-text">
              Join for travel inspiration, trip notes, and exclusive insights
              from the road — no agency pitches, just the journal.
            </p>

            <form
              className="mt-8 max-w-md space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
              }}
              aria-label="Newsletter signup"
            >
              <label htmlFor="footer-email" className="sr-only">
                Email address
              </label>
              <input
                id="footer-email"
                name="email"
                type="email"
                required
                placeholder="Enter your email"
                autoComplete="email"
                className="min-h-12 w-full rounded-[5px] border border-muted-light bg-white px-4 text-sm text-heading placeholder:text-muted transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
              />
              <label className="flex items-start gap-2.5 text-sm leading-snug text-text">
                <input
                  type="checkbox"
                  required
                  className="mt-1 size-4 shrink-0 rounded border-muted-light accent-accent"
                />
                <span>
                  By entering your email, you agree to receive Alex Journly
                  emails and agree to our{" "}
                  <Link href="/#newsletter" className="text-link underline">
                    Terms and Conditions
                  </Link>{" "}
                  and{" "}
                  <Link href="/#newsletter" className="text-link underline">
                    Privacy Policy
                  </Link>
                  .
                </span>
              </label>
              <button
                type="submit"
                className="min-h-12 w-full rounded-[5px] bg-white px-6 font-display text-base font-bold text-heading shadow-sm ring-1 ring-surface transition hover:ring-accent"
              >
                Subscribe
              </button>
            </form>
          </div>

          <div className="mt-12 md:col-span-5 md:mt-0">
            <p className="text-label text-muted">About</p>
            <h3 className="font-display mt-2 text-2xl font-bold text-heading">
              {about.headline}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-text">
              {about.paragraphs[0]}
            </p>
            <Link
              href="/#hidden-gems"
              className="mt-4 inline-block text-sm font-semibold text-link transition hover:text-accent"
            >
              Learn more →
            </Link>

            <nav aria-label="Social" className="mt-8">
              <p className="text-label text-muted">Follow my adventures</p>
              <ul className="mt-3 flex flex-wrap gap-4">
                {social.map((item) => (
                  <li key={item.label}>
                    <a
                      href={item.href}
                      className="text-sm font-semibold text-heading transition hover:text-accent"
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
                    className="text-sm font-semibold text-accent transition hover:text-accent-deep"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    Buy me a coffee
                  </a>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </section>

      <div className="bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-6 text-sm text-muted md:flex-row md:items-center md:justify-between md:px-8">
          <p>
            © {year} {site.name}. A personal travel journal — also known as{" "}
            {site.journalName}.
          </p>
          <nav aria-label="Legal" className="flex flex-wrap gap-4">
            <Link href="/blog" className="text-link hover:text-accent">
              Blog
            </Link>
            <Link href="/destinations" className="text-link hover:text-accent">
              Destinations
            </Link>
            <Link href="/#newsletter" className="text-link hover:text-accent">
              Privacy
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
