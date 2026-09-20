"use client";

import { BrandLogo } from "@/components/brand/BrandLogo";
import { MobileTopicSection } from "@/components/header/MobileTopicSection";
import { NavIcon } from "@/components/icons/NavIcon";
import { OutboundLink } from "@/components/outbound/OutboundLink";
import { ReaderAuthButtons } from "@/components/ReaderAuthButtons";
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

/**
 * Secondary mobile drawer (opened from bottom Menu tab).
 * Primary Places/Stories/Guides/Saved live in the bottom bar — drawer holds the rest.
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
      className="fixed inset-x-0 top-0 z-[200] bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px))] md:hidden"
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
        {/* Header: logo + close */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
          <BrandLogo className="h-9 w-auto" priority onClick={onClose} />
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-on-solid transition hover:bg-accent-deep"
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

        {/* Scrollable secondary links */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <ul className="flex flex-col gap-0.5">
            <li>
              <Link
                href="/start-here"
                className="flex items-center gap-2.5 rounded-lg px-2 py-2.5 text-base font-semibold tracking-tight text-heading hover:bg-surface-soft hover:text-accent"
                onClick={onClose}
              >
                <NavIcon name="compass" size={18} className="text-accent" />
                Start here
              </Link>
            </li>

            <li>
              <Link
                href="/tools"
                className="flex items-center gap-2.5 rounded-lg px-2 py-2.5 text-base font-semibold tracking-tight text-heading hover:bg-surface-soft hover:text-accent"
                onClick={onClose}
              >
                <NavIcon name="wrench" size={18} className="text-accent" />
                Tools I use
              </Link>
            </li>

            <li>
              <Link
                href="/about"
                className="flex items-center gap-2.5 rounded-lg px-2 py-2.5 text-base font-semibold tracking-tight text-heading hover:bg-surface-soft hover:text-accent"
                onClick={onClose}
              >
                About
              </Link>
            </li>

            <li>
              <Link
                href="/contact"
                className="flex items-center gap-2.5 rounded-lg px-2 py-2.5 text-base font-semibold tracking-tight text-heading hover:bg-surface-soft hover:text-accent"
                onClick={onClose}
              >
                Contact
              </Link>
            </li>

            <li className="mt-3 border-t border-border pt-3">
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
        </div>

        {/* Sticky footer: auth above clean social icon row */}
        <div className="shrink-0 px-4 pb-3 pt-2">
          {googleConfigured ? (
            <div className="mb-3 px-2">
              <ReaderAuthButtons
                variant="mobile"
                googleConfigured={googleConfigured}
                onNavigate={onClose}
              />
            </div>
          ) : null}

          <ul
            className="flex flex-row items-center justify-center gap-5 px-2"
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

function SocialInstagramIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function SocialYouTubeIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2.5 8.5A3.5 3.5 0 0 1 6 5h12a3.5 3.5 0 0 1 3.5 3.5v7A3.5 3.5 0 0 1 18 19H6a3.5 3.5 0 0 1-3.5-3.5v-7Z" />
      <path d="m10 9.5 5 2.5-5 2.5v-5Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

function SocialPinterestIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2C6.5 2 2 6.3 2 11.6c0 4 2.5 7.4 6.1 8.7-.1-.7-.2-1.9 0-2.7.2-.7 1.2-5 1.2-5s-.3-.6-.3-1.5c0-1.4.8-2.4 1.8-2.4.9 0 1.3.6 1.3 1.4 0 .9-.6 2.2-.9 3.4-.3 1 0.5 1.8 1.5 1.8 1.8 0 3.1-2.2 3.1-4.8 0-2-1.4-3.5-3.9-3.5-2.8 0-4.5 2.1-4.5 4.4 0 .9.3 1.8.7 2.3.1.1.1.2.1.3l-.3 1c0 .1-.1.2-.3.1-1.2-.5-1.8-1.9-1.8-3.4 0-2.6 2.2-5.7 6.6-5.7 3.5 0 5.8 2.5 5.8 5.3 0 3.6-2 6.3-5 6.3-1 0-1.9-.5-2.2-1.2l-.6 2.3c-.2.8-.8 1.8-1.2 2.4.9.3 1.9.4 2.9.4 5.5 0 10-4.3 10-9.6C22 6.3 17.5 2 12 2Z" />
    </svg>
  );
}

function SocialCoffeeIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 8h13v7a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8Z" />
      <path d="M16 8h2.5a3.5 3.5 0 0 1 0 7H16" />
      <path d="M6 2v2M10 2v2M14 2v2" />
    </svg>
  );
}
