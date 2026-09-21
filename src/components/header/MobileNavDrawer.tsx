"use client";

import { BrandLogo } from "@/components/brand/BrandLogo";
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
import Link from "next/link";

type Props = {
  open: boolean;
  onClose: () => void;
  googleConfigured?: boolean;
};

const PRIMARY_LINKS = [
  { href: "/start-here", label: "Start here" },
  { href: "/destinations", label: "Places" },
  { href: "/guides", label: "Guides" },
  { href: "/tools", label: "Tools I use" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
] as const;

/**
 * Mobile hamburger drawer: oversized editorial list of hub links.
 * Places / Stories / Guides / Saved also live in the scroll-reveal bottom bar.
 */
export function MobileNavDrawer({
  open,
  onClose,
  googleConfigured = false,
}: Props) {
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
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
          <BrandLogo className="h-10 w-auto" priority onClick={onClose} />
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-heading transition hover:bg-surface-soft"
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
          <div className="shrink-0 border-b border-border px-5 py-2.5">
            <ReaderAuthButtons
              variant="drawer"
              googleConfigured={googleConfigured}
              onNavigate={onClose}
            />
          </div>
        ) : null}

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pt-4">
          <ul className="flex flex-col" aria-label="Primary">
            {PRIMARY_LINKS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="font-display block py-3 text-3xl font-semibold leading-none tracking-tight text-heading transition hover:text-accent"
                  onClick={onClose}
                >
                  {item.label}
                </Link>
              </li>
            ))}
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
