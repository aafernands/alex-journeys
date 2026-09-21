"use client";

import { BrandLogo } from "@/components/brand/BrandLogo";
import { MobileTopicSection } from "@/components/header/MobileTopicSection";
import { NavIcon } from "@/components/icons/NavIcon";
import {
  SocialCoffeeIcon,
  SocialInstagramIcon,
  SocialPinterestIcon,
  SocialYouTubeIcon,
} from "@/components/icons/SocialIcons";
import { OutboundLink } from "@/components/outbound/OutboundLink";
import { ReaderAuthButtons } from "@/components/ReaderAuthButtons";
import { ThemeAppearanceControl } from "@/components/ThemeToggle";
import { site } from "@/data/content";
import { destinationsTree } from "@/data/destinations";
import { guidesNav } from "@/data/guides";
import Link from "next/link";
import { useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  googleConfigured?: boolean;
};

const exploreLinkClass =
  "flex items-center gap-2.5 rounded-lg px-2 py-2.5 text-base font-semibold tracking-tight text-heading hover:bg-surface-soft hover:text-accent";

/**
 * Secondary mobile drawer (opened from header hamburger).
 * Primary Places/Stories/Guides/Saved live in the scroll-reveal bottom bar — drawer holds the rest.
 */
export function MobileNavDrawer({
  open,
  onClose,
  googleConfigured = false,
}: Props) {
  const [mobileDestOpen, setMobileDestOpen] = useState(false);
  const [mobileContinent, setMobileContinent] = useState<string | null>(null);

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
        className="absolute inset-y-0 left-0 flex w-[calc(100%-0.75rem)] max-w-[28rem] flex-col bg-bg shadow-xl"
        aria-label="Mobile"
      >
        {/* 1. Header: logo + close */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
          <BrandLogo className="h-9 w-auto" priority onClick={onClose} />
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-heading transition hover:bg-surface-soft"
            aria-label="Close menu"
            onClick={onClose}
          >
            <svg
              width="20"
              height="20"
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

        {/* 2. Account strip — pinned under header */}
        {googleConfigured ? (
          <div className="shrink-0 border-b border-border px-4 py-3">
            <ReaderAuthButtons
              variant="drawer"
              googleConfigured={googleConfigured}
              onNavigate={onClose}
            />
          </div>
        ) : null}

        {/* Scrollable body: Explore + Browse accordions + Appearance in document flow */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4">
          {/* 3. Explore */}
          <section aria-labelledby="drawer-explore-label">
            <h2
              id="drawer-explore-label"
              className="mb-1.5 px-2 text-xs font-semibold uppercase tracking-wide text-muted"
            >
              Explore
            </h2>
            <ul className="flex flex-col gap-0.5">
              <li>
                <Link
                  href="/start-here"
                  className={exploreLinkClass}
                  onClick={onClose}
                >
                  <NavIcon name="compass" size={18} className="text-accent" />
                  Start here
                </Link>
              </li>
              <li>
                <Link href="/tools" className={exploreLinkClass} onClick={onClose}>
                  <NavIcon name="wrench" size={18} className="text-accent" />
                  Tools I use
                </Link>
              </li>
              <li>
                <Link href="/about" className={exploreLinkClass} onClick={onClose}>
                  <NavIcon name="info" size={18} className="text-accent" />
                  About
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className={exploreLinkClass}
                  onClick={onClose}
                >
                  <NavIcon name="mail" size={18} className="text-accent" />
                  Contact
                </Link>
              </li>
            </ul>
          </section>

          {/* 4. Browse — Places / Guides expanders (push Appearance down when open) */}
          <section
            aria-labelledby="drawer-browse-label"
            className="mt-5 border-t border-border pt-4"
          >
            <h2
              id="drawer-browse-label"
              className="mb-1.5 px-2 text-xs font-semibold uppercase tracking-wide text-muted"
            >
              Browse
            </h2>
            <ul className="flex flex-col gap-0.5">
              <li>
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-lg px-2 py-2.5 text-base font-semibold tracking-tight text-heading hover:bg-surface-soft"
                  aria-expanded={mobileDestOpen}
                  onClick={() => setMobileDestOpen((v) => !v)}
                >
                  <span className="inline-flex items-center gap-2.5">
                    <NavIcon name="map-pin" size={18} className="text-accent" />
                    Places
                  </span>
                  <ChevronDown open={mobileDestOpen} />
                </button>
                {mobileDestOpen ? (
                  <ul className="mb-2 ml-3 border-l border-border pl-3">
                    <li>
                      <Link
                        href="/destinations"
                        className="block py-1.5 text-sm text-text hover:text-accent"
                        onClick={onClose}
                      >
                        All places
                      </Link>
                    </li>
                    {destinationsTree.map((continent) => {
                      const continentOpen = mobileContinent === continent.id;
                      return (
                        <li key={continent.id}>
                          <button
                            type="button"
                            className="flex w-full items-center justify-between py-1.5 text-sm font-semibold text-heading"
                            aria-expanded={continentOpen}
                            onClick={() =>
                              setMobileContinent(
                                continentOpen ? null : continent.id,
                              )
                            }
                          >
                            {continent.name}
                            <ChevronDown open={continentOpen} />
                          </button>
                          {continentOpen ? (
                            <ul className="mb-1 ml-2 border-l border-border pl-3">
                              {continent.countries.map((country) => (
                                <li key={country.slug}>
                                  <Link
                                    href={`/${country.slug}`}
                                    className="block py-1.5 text-sm text-text hover:text-accent"
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

              <MobileTopicSection
                label="Guides"
                href="/guides"
                items={guidesNav}
                icon="book-marked"
                onNavigate={onClose}
              />
            </ul>
          </section>

          {/* 5. Appearance + socials — in flow below nav, not sticky */}
          <div className="mt-5 space-y-3 border-t border-border pt-4 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">
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

function ChevronDown({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={`transition ${open ? "rotate-180" : ""}`}
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
