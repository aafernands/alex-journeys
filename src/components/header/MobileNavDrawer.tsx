"use client";

import { BrandLogo } from "@/components/brand/BrandLogo";
import {
  Chevron,
  MobileTopicSection,
} from "@/components/header/MobileTopicSection";
import {
  SocialCoffeeIcon,
  SocialInstagramIcon,
  SocialPinterestIcon,
  SocialYouTubeIcon,
} from "@/components/icons/SocialIcons";
import { OutboundLink } from "@/components/outbound/OutboundLink";
import { ReaderAuthButtons } from "@/components/ReaderAuthButtons";
import { SearchInput } from "@/components/search/SearchInput";
import { ThemeAppearanceControl } from "@/components/ThemeToggle";
import { site } from "@/data/content";
import { destinationsTree } from "@/data/destinations";
import { guidesNav } from "@/data/guides";
import Link from "next/link";
import { useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  /**
   * Reader auth available (email/password and/or Google).
   * Prop name matches Header; this is not Google-only.
   */
  googleConfigured?: boolean;
};

const topLinkClass =
  "font-display block py-3 text-3xl font-semibold leading-none tracking-tight text-heading transition hover:text-accent";
const topButtonClass =
  "font-display flex w-full items-center justify-between gap-3 py-3 text-left text-3xl font-semibold leading-none tracking-tight text-heading transition hover:text-accent";
const midLinkClass =
  "font-display block py-2 text-xl font-semibold leading-snug tracking-tight text-heading transition hover:text-accent";
const midButtonClass =
  "font-display flex w-full items-center justify-between gap-3 py-2 text-left text-xl font-semibold leading-snug tracking-tight text-heading transition hover:text-accent";
const leafLinkClass =
  "block py-1.5 text-sm leading-snug text-text transition hover:text-accent";

/**
 * Mobile hamburger drawer: oversized editorial hub list.
 * Places and Guides restore nested expanders (no leading icons).
 */
export function MobileNavDrawer({
  open,
  onClose,
  googleConfigured = false,
}: Props) {
  const [placesOpen, setPlacesOpen] = useState(false);
  const [openContinent, setOpenContinent] = useState<string | null>(null);

  if (!open) return null;

  return (
    <div
      className="mobile-nav-drawer-shell fixed inset-x-0 top-0 bottom-0 z-[200] md:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Site menu"
    >
      <button
        type="button"
        className="absolute inset-0 bg-heading/40 backdrop-blur-[1px]"
        aria-label="Close menu"
        onClick={onClose}
      />

      <nav
        id="mobile-nav"
        className="absolute inset-0 flex w-full flex-col bg-bg shadow-xl"
        aria-label="Mobile"
      >
        <div className="flex shrink-0 items-center gap-2.5 border-b border-border px-3 py-3">
          <div className="flex shrink-0 items-center">
            <BrandLogo
              className="h-8 w-auto"
              width={150}
              height={42}
              priority
              onClick={onClose}
            />
          </div>
          <SearchInput
            variant="drawer"
            id="mobile-drawer-search"
            className="min-w-0 flex-1"
            onNavigate={onClose}
          />
          <button
            type="button"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-heading transition hover:bg-surface-soft"
            aria-label="Close menu"
            onClick={onClose}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {googleConfigured ? (
          <div className="shrink-0 border-b border-border px-5 py-4">
            <ReaderAuthButtons
              variant="drawer-cta"
              googleConfigured={googleConfigured}
              onNavigate={onClose}
            />
          </div>
        ) : null}

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pt-4">
          <ul className="flex flex-col" aria-label="Primary">
            <li>
              <Link
                href="/start-here"
                className={topLinkClass}
                onClick={onClose}
              >
                Start here
              </Link>
            </li>

            <li>
              <button
                type="button"
                className={topButtonClass}
                aria-expanded={placesOpen}
                onClick={() => setPlacesOpen((v) => !v)}
              >
                Places
                <Chevron open={placesOpen} size={20} />
              </button>
              {placesOpen ? (
                <ul className="mb-3 ml-0.5 border-l border-border pl-4">
                  <li>
                    <Link
                      href="/destinations"
                      className={midLinkClass}
                      onClick={onClose}
                    >
                      All places
                    </Link>
                  </li>
                  {destinationsTree.map((continent) => {
                    const continentOpen = openContinent === continent.id;
                    return (
                      <li key={continent.id}>
                        <button
                          type="button"
                          className={midButtonClass}
                          aria-expanded={continentOpen}
                          onClick={() =>
                            setOpenContinent(
                              continentOpen ? null : continent.id,
                            )
                          }
                        >
                          {continent.name}
                          <Chevron open={continentOpen} size={16} />
                        </button>
                        {continentOpen ? (
                          <ul className="mb-2 ml-1 border-l border-border pl-3">
                            {continent.countries.map((country) => (
                              <li key={country.slug}>
                                <Link
                                  href={`/${country.slug}`}
                                  className={leafLinkClass}
                                  onClick={onClose}
                                >
                                  {country.name}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </li>

            <li>
              <Link
                href="/guides/plan-a-trip"
                className={topLinkClass}
                onClick={onClose}
              >
                Plan a trip
              </Link>
            </li>

            <MobileTopicSection
              label="Guides"
              href="/guides"
              allLabel="All guides"
              items={guidesNav}
              onNavigate={onClose}
            />

            <li>
              <Link href="/tools" className={topLinkClass} onClick={onClose}>
                Tools I use
              </Link>
            </li>
            <li>
              <Link href="/about" className={topLinkClass} onClick={onClose}>
                About
              </Link>
            </li>
            <li>
              <Link href="/contact" className={topLinkClass} onClick={onClose}>
                Contact
              </Link>
            </li>
          </ul>

          <div className="mt-auto space-y-3 border-t border-border pt-4 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">
            <ThemeAppearanceControl />

            <ul
              className="flex flex-row items-center justify-center gap-5"
              aria-label="Social"
            >
              <li>
                <OutboundLink
                  href={site.social.instagram}
                  className="inline-flex h-10 w-10 items-center justify-center text-heading transition hover:text-accent"
                  aria-label="Instagram"
                  onClick={onClose}
                >
                  <SocialInstagramIcon />
                </OutboundLink>
              </li>
              <li>
                <OutboundLink
                  href={site.social.youtube}
                  className="inline-flex h-10 w-10 items-center justify-center text-heading transition hover:text-accent"
                  aria-label="YouTube"
                  onClick={onClose}
                >
                  <SocialYouTubeIcon />
                </OutboundLink>
              </li>
              <li>
                <OutboundLink
                  href={site.social.pinterest}
                  className="inline-flex h-10 w-10 items-center justify-center text-heading transition hover:text-accent"
                  aria-label="Pinterest"
                  onClick={onClose}
                >
                  <SocialPinterestIcon />
                </OutboundLink>
              </li>
              <li>
                <OutboundLink
                  href={site.social.coffee}
                  className="inline-flex h-10 w-10 items-center justify-center text-accent transition hover:text-accent-deep"
                  aria-label="Buy me a coffee"
                  onClick={onClose}
                >
                  <SocialCoffeeIcon />
                </OutboundLink>
              </li>
            </ul>
          </div>
        </div>
      </nav>
    </div>
  );
}
