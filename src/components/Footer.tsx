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
    <footer className="bg-white" role="contentinfo">
      <section
        id="newsletter"
        className="border-t border-border bg-surface-soft"
        aria-labelledby="newsletter-heading"
      >
        <div className="mx-auto max-w-6xl px-5 py-12 md:px-8 md:py-16">
          <div className="rounded-xl bg-heading p-6 text-white md:p-8 lg:p-10">
            <div className="md:grid md:grid-cols-12 md:gap-12">
              <div className="md:col-span-7">
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-accent">
                  Newsletter
                </p>
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

                <form
                  className="mt-8 max-w-md space-y-3"
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
                    className="min-h-11 w-full rounded-lg border border-white/15 bg-white/10 px-4 text-sm text-white placeholder:text-white/45 transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                  <label className="flex items-start gap-2.5 text-sm leading-snug text-white/65">
                    <input
                      type="checkbox"
                      required
                      className="mt-1 size-4 shrink-0 rounded border-white/30 accent-accent"
                    />
                    <span>
                      By entering your email, you agree to receive Alex Journly
                      emails and agree to our{" "}
                      <Link href="/policies" className="text-white underline underline-offset-2 hover:text-accent">
                        Terms and Conditions
                      </Link>{" "}
                      and{" "}
                      <Link href="/policies" className="text-white underline underline-offset-2 hover:text-accent">
                        Privacy Policy
                      </Link>
                      .
                    </span>
                  </label>
                  <button type="submit" className="btn btn-primary btn-block sm:w-auto">
                    Subscribe
                  </button>
                </form>
              </div>

              <div className="mt-10 border-t border-white/10 pt-8 md:col-span-5 md:mt-0 md:border-t-0 md:border-l md:pt-0 md:pl-10">
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-accent">
                  About
                </p>
                <h3 className="font-display mt-2 text-xl font-bold text-white">
                  {about.headline}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-white/70">
                  {about.paragraphs[0]}
                </p>
                <Link
                  href="/about"
                  className="mt-4 inline-flex text-sm font-semibold text-white transition hover:text-accent"
                >
                  Learn more →
                </Link>

                <nav aria-label="Social" className="mt-8">
                  <p className="text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-white/45">
                    Follow my adventures
                  </p>
                  <ul className="mt-3 flex flex-wrap gap-3">
                    {social.map((item) => (
                      <li key={item.label}>
                        <a
                          href={item.href}
                          className="inline-flex rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-white/10"
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
            </div>
          </div>
        </div>
      </section>

      <div className="border-t border-border bg-heading">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-6 text-sm text-white/55 md:flex-row md:items-center md:justify-between md:px-8">
          <p>
            © {year} {site.name}. A personal travel journal — also known as{" "}
            {site.journalName}.
          </p>
          <nav aria-label="Legal" className="flex flex-wrap gap-x-4 gap-y-2">
            <Link href="/start-here" className="text-white/70 transition hover:text-accent">
              Start Here
            </Link>
            <Link href="/about" className="text-white/70 transition hover:text-accent">
              About
            </Link>
            <Link href="/blog" className="text-white/70 transition hover:text-accent">
              Blog
            </Link>
            <Link href="/resources" className="text-white/70 transition hover:text-accent">
              Resources
            </Link>
            <Link href="/plan-your-trip" className="text-white/70 transition hover:text-accent">
              Trip tools
            </Link>
            <Link href="/contact" className="text-white/70 transition hover:text-accent">
              Contact
            </Link>
            <Link href="/policies" className="text-white/70 transition hover:text-accent">
              Policies
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
