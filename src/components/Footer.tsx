"use client";

import Image from "next/image";
import Link from "next/link";
import { BrandLogo } from "@/components/brand/BrandLogo";
import {
  SocialCoffeeIcon,
  SocialInstagramIcon,
  SocialPinterestIcon,
  SocialYouTubeIcon,
} from "@/components/icons/SocialIcons";
import { NewsletterForm } from "@/components/newsletter/NewsletterForm";
import { OutboundLink } from "@/components/outbound/OutboundLink";
import {
  PostageStamp,
  PostmarkWatermark,
} from "@/components/newsletter/PostmarkWatermark";
import { site, about } from "@/data/content";

const social = [
  { label: "Instagram", href: site.social.instagram, icon: SocialInstagramIcon },
  { label: "YouTube", href: site.social.youtube, icon: SocialYouTubeIcon },
  { label: "Pinterest", href: site.social.pinterest, icon: SocialPinterestIcon },
];

const explore = [
  { href: "/destinations", label: "Places" },
  { href: "/blog", label: "Stories" },
  { href: "/guides", label: "Guides" },
  { href: "/start-here", label: "Start here" },
  { href: "/tools", label: "Tools I use" },
  { href: "/premium", label: "Premium" },
];

const company = [
  { href: "/about", label: "About" },
  { href: "/media-kit", label: "Media kit" },
  { href: "/contact", label: "Help & contact" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/affiliate-disclosure", label: "Affiliate disclosure" },
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
        <div className="section-shell section-band">
          <div className="newsletter-postcard relative overflow-x-clip overflow-y-hidden rounded-xl bg-near-black text-hero-type shadow-[0_20px_50px_-28px_rgba(0,0,0,0.55)]">
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
            <PostmarkWatermark className="pointer-events-none absolute -right-10 -top-8 h-[18rem] w-[18rem] max-w-none rotate-[-18deg] text-hero-type/25 md:-right-6 md:top-1/2 md:h-[22rem] md:w-[22rem] md:-translate-y-1/2" />

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
                    className="font-display text-display mt-2 max-w-xl text-hero-type"
                  >
                    <span className="font-normal">The Traveler&apos;s</span>{" "}
                    <span className="font-bold">Journal</span>
                  </h2>
                </div>
                <PostageStamp className="hidden max-w-[5.5rem] shrink-0 overflow-hidden sm:block" />
              </div>

              <div className="mt-8 md:grid md:grid-cols-12 md:gap-12 md:items-start">
                <div className="md:col-span-7">
                  <p className="max-w-lg text-base leading-relaxed text-hero-type/80">
                    Drop your email like a postcard home. Trip notes, hidden
                    corners, and journal dispatches — no agency pitches, just
                    what I&apos;m actually packing and booking.
                  </p>

                  <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-hero-type/15 bg-hero-type/5 px-3 py-1 text-[0.8125rem] font-semibold uppercase tracking-[0.14em] text-hero-type/55">
                    <span className="size-1.5 rounded-full bg-accent" />
                    Postmark · free · unsubscribe anytime
                  </div>

                  <NewsletterForm />
                </div>

                <div className="mt-10 border-t border-hero-type/10 pt-8 md:col-span-5 md:mt-0 md:border-t-0 md:border-l md:border-hero-type/10 md:pt-0 md:pl-10">
                  <p className="eyebrow !text-accent">About the sender</p>
                  <div className="mt-3 flex gap-4">
                    <div className="relative size-14 shrink-0 overflow-hidden rounded-lg border border-hero-type/15 bg-hero-type/5 ring-2 ring-accent/30 ring-offset-2 ring-offset-near-black">
                      <Image
                        src={site.authorPhoto}
                        alt={site.authorName}
                        fill
                        sizes="56px"
                        className="object-cover object-top"
                      />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-display text-xl font-bold text-hero-type">
                        {about.headline}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-hero-type/70">
                        {about.paragraphs[0]}
                      </p>
                      <Link
                        href="/about"
                        className="mt-3 inline-flex text-sm font-semibold text-hero-type transition hover:text-accent"
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
      <div className="bg-near-black text-hero-type">
        <div className="section-shell section-band">
          <div className="grid gap-10 md:grid-cols-12 md:gap-8">
            <div className="min-w-0 md:col-span-4">
              <BrandLogo className="h-10 w-auto" variant="on-dark" />
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-hero-type/60">
                A personal travel journal by {site.authorName}. Places
                I&apos;ve been, notes from the road.
              </p>
              <nav aria-label="Social" className="mt-6">
                <ul className="flex flex-wrap gap-x-5 gap-y-3">
                  {social.map((item) => (
                    <li key={item.label}>
                      <OutboundLink
                        href={item.href}
                        className="inline-flex items-center gap-2 text-sm font-semibold text-hero-type/80 transition hover:text-accent"
                      >
                        <item.icon size={18} />
                        {item.label}
                      </OutboundLink>
                    </li>
                  ))}
                  <li>
                    <OutboundLink
                      href={site.social.coffee}
                      className="inline-flex items-center gap-2 text-sm font-semibold text-hero-type/80 transition hover:text-accent"
                    >
                      <SocialCoffeeIcon size={18} />
                      Buy me a coffee
                    </OutboundLink>
                  </li>
                </ul>
              </nav>
            </div>

            <div className="min-w-0 md:col-span-3">
              <p className="text-label text-hero-type/45">Explore</p>
              <ul className="mt-3 space-y-2">
                {explore.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-sm text-hero-type/70 transition hover:text-accent"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="min-w-0 md:col-span-3">
              <p className="text-label text-hero-type/45">Journal</p>
              <ul className="mt-3 space-y-2">
                {company.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-sm text-hero-type/70 transition hover:text-accent"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="min-w-0 md:col-span-2">
              <p className="text-label text-hero-type/45">Contact</p>
              <a
                href={`mailto:${site.email}`}
                className="mt-3 block min-w-0 break-words text-sm text-hero-type/70 transition hover:text-accent"
              >
                {site.email}
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-hero-type/10">
          <div className="section-shell flex flex-col gap-3 py-5 text-sm text-hero-type/45 md:flex-row md:items-center md:justify-between">
            <p>
              © {year} {site.name}. Personal travel journal.
            </p>
            <Link
              href="#top"
              className="inline-flex items-center gap-1.5 self-start rounded-lg border border-hero-type/15 px-3 py-1.5 text-hero-type/70 transition hover:bg-hero-type/5 hover:text-hero-type md:self-auto"
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
