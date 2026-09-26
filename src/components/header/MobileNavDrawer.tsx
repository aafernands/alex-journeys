"use client";

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
import { SearchInput } from "@/components/search/SearchInput";
import { useReaderLoginPrompt } from "@/components/ReaderLoginPrompt";
import { Gem, UserRound, X } from "lucide-react";
import { AddToHomeScreenButton } from "@/components/AddToHomeScreenButton";
import { useSession } from "next-auth/react";
import { usePremium } from "@/components/premium/usePremium";
import { PERKS_HUB_PATH } from "@/lib/premium-perks";
import { BrandLogo } from "@/components/brand/BrandLogo";
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
  "font-display flex min-h-12 items-center text-base font-semibold leading-snug tracking-tight text-heading transition hover:text-accent";
const topButtonClass =
  "font-display flex min-h-12 w-full items-center justify-between gap-3 text-left text-base font-semibold leading-snug tracking-tight text-heading transition hover:text-accent";
const midLinkClass =
  "flex min-h-11 items-center text-base font-medium leading-snug text-heading transition hover:text-accent";
const midButtonClass =
  "flex min-h-11 w-full items-center justify-between gap-3 text-left text-base font-medium leading-snug text-heading transition hover:text-accent";
const leafLinkClass =
  "flex min-h-11 items-center text-base leading-snug text-text transition hover:text-accent";

/**
 * Mobile hamburger drawer: compact hub list (48px primary rows, 44px nested rows, 16px text).
 * Places and Guides restore nested expanders (no leading icons).
 */
/**
 * Bottom of the drawer: Subscribe for readers, Member perks for members.
 * Only mounted while the drawer is open, so the membership check runs then.
 */
function DrawerPremiumLink({ onClose }: { onClose: () => void }) {
  const { isPremium } = usePremium();
  return (
    <Link
      href={isPremium ? PERKS_HUB_PATH : "/premium"}
      className="flex min-h-14 w-full items-center justify-center gap-2.5 rounded-lg bg-accent px-4 font-display text-lg font-bold tracking-tight text-on-solid transition hover:bg-accent-deep"
      onClick={onClose}
    >
      <Gem size={20} strokeWidth={2.25} aria-hidden="true" />
      {isPremium ? "Member perks" : "Subscribe"}
    </Link>
  );
}

export function MobileNavDrawer({ open, onClose }: Props) {
  const [placesOpen, setPlacesOpen] = useState(false);
  const openReaderLogin = useReaderLoginPrompt();
  const { status } = useSession();
  const [openContinent, setOpenContinent] = useState<string | null>(null);

  if (!open) return null;

  return (
    <div
      className="mobile-nav-drawer-shell fixed inset-x-0 top-0 bottom-0 z-[200] xl:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Site menu"
    >
      <button
        type="button"
        className="absolute inset-0 bg-heading/25"
        aria-label="Close menu"
        onClick={onClose}
      />

      <nav
        id="mobile-nav"
        className="mobile-nav-panel glass-strong absolute inset-0 flex w-full flex-col"
        aria-label="Mobile"
      >
        <div className="shrink-0 border-b border-border px-4 py-3">
          <div className="grid grid-cols-[44px_1fr_44px] items-center gap-3">
            <button
              type="button"
              className="drawer-header-icon"
              aria-label="Close menu"
              onClick={onClose}
            >
              <X size={23} aria-hidden="true" />
            </button>
            <div className="mx-auto w-full max-w-[12rem]">
              <BrandLogo
                href="/"
                onClick={onClose}
                applyScale={false}
                width={320}
                height={88}
                className="block h-auto w-full object-contain"
              />
            </div>
            {status === "authenticated" ? (
              <Link
                href="/account"
                className="drawer-header-icon"
                aria-label="Your account"
                onClick={onClose}
              >
                <UserRound size={22} aria-hidden="true" />
              </Link>
            ) : (
              <button
                type="button"
                className="drawer-header-icon"
                aria-label="Sign in"
                aria-haspopup="dialog"
                onClick={() => openReaderLogin({ onAuthenticated: onClose })}
              >
                <UserRound size={22} aria-hidden="true" />
              </button>
            )}
          </div>
          <SearchInput
            variant="drawer"
            id="mobile-drawer-search"
            className="mt-3 w-full"
            onNavigate={onClose}
          />
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pt-2 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
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
                <Chevron open={placesOpen} size={18} />
              </button>
              {placesOpen ? (
                <ul className="mb-2 ml-0.5 border-l border-border pl-4">
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
                Help &amp; contact
              </Link>
            </li>
          </ul>

          <section className="mt-6 text-center" aria-label="Follow Alex Journeys">
            <p className="mb-2 text-ds-caption font-bold uppercase tracking-[.18em] text-muted">
              Follow the journey
            </p>
            <ul
              className="flex items-center justify-center gap-3"
              aria-label="Social"
            >
              <li>
                <OutboundLink
                  href={site.social.instagram}
                  className="inline-flex h-11 w-11 items-center justify-center text-heading transition hover:text-accent"
                  aria-label="Instagram"
                  onClick={onClose}
                >
                  <SocialInstagramIcon />
                </OutboundLink>
              </li>
              <li>
                <OutboundLink
                  href={site.social.youtube}
                  className="inline-flex h-11 w-11 items-center justify-center text-heading transition hover:text-accent"
                  aria-label="YouTube"
                  onClick={onClose}
                >
                  <SocialYouTubeIcon />
                </OutboundLink>
              </li>
              <li>
                <OutboundLink
                  href={site.social.pinterest}
                  className="inline-flex h-11 w-11 items-center justify-center text-heading transition hover:text-accent"
                  aria-label="Pinterest"
                  onClick={onClose}
                >
                  <SocialPinterestIcon />
                </OutboundLink>
              </li>
              <li>
                <OutboundLink
                  href={site.social.coffee}
                  className="inline-flex h-11 w-11 items-center justify-center text-accent transition hover:text-accent-deep"
                  aria-label="Buy me a coffee"
                  onClick={onClose}
                >
                  <SocialCoffeeIcon />
                </OutboundLink>
              </li>
            </ul>
          </section>

          {/* End of the scrolling list, not pinned: install shortcut, then Subscribe. */}
          <div className="mt-auto pt-6">
            <div className="flex flex-col gap-3 border-t border-border pt-5">
              <AddToHomeScreenButton
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-border-strong bg-white px-4 text-sm font-semibold text-heading transition hover:bg-surface-soft"
                onPress={onClose}
              />
              <DrawerPremiumLink onClose={onClose} />
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
}
