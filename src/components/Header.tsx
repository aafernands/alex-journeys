"use client";

import { BrandLogo } from "@/components/brand/BrandLogo";
import { Search as SearchIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { TopicFlyout } from "@/components/header/TopicFlyout";
import { MobileTopicSection } from "@/components/header/MobileTopicSection";
import { NavIcon } from "@/components/icons/NavIcon";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ReaderAuthButtons } from "@/components/ReaderAuthButtons";
import {
  SearchInput,
  type SearchInputHandle,
} from "@/components/search/SearchInput";
import { destinationsTree } from "@/data/destinations";
import { guidesNav } from "@/data/guides";

type LatestPost = { slug: string; title: string };

type Props = {
  latestPost?: LatestPost | null;
  googleConfigured?: boolean;
};

export function Header({ latestPost = null, googleConfigured = false }: Props) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [destOpen, setDestOpen] = useState(false);
  const [desktopOpenContinent, setDesktopOpenContinent] = useState<
    string | null
  >(null);
  const [mobileDestOpen, setMobileDestOpen] = useState(false);
  const [mobileContinent, setMobileContinent] = useState<string | null>(null);

  const destMenuId = useId();
  const destWrapRef = useRef<HTMLDivElement>(null);
  const destButtonRef = useRef<HTMLButtonElement>(null);
  const desktopSearchRef = useRef<SearchInputHandle>(null);
  const mobileSearchRef = useRef<SearchInputHandle>(null);

  const closeDest = useCallback(() => {
    setDestOpen(false);
    setDesktopOpenContinent(null);
  }, []);

  const closeAll = useCallback(() => {
    setMobileOpen(false);
    setMobileSearchOpen(false);
    setMobileDestOpen(false);
    setMobileContinent(null);
    closeDest();
  }, [closeDest]);

  useEffect(() => {
    closeAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- close menus on route change only
  }, [pathname]);

  useEffect(() => {
    if (!destOpen) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeDest();
        destButtonRef.current?.focus();
      }
    };

    const onPointer = (e: MouseEvent) => {
      if (
        destWrapRef.current &&
        !destWrapRef.current.contains(e.target as Node)
      ) {
        closeDest();
      }
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [destOpen, closeDest]);

  useEffect(() => {
    if (!mobileOpen && !mobileSearchOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAll();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen, mobileSearchOpen, closeAll]);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  /** Press `/` to focus site search (skip when typing in a field). */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        target?.isContentEditable
      ) {
        return;
      }
      e.preventDefault();
      const isDesktop = window.matchMedia("(min-width: 768px)").matches;
      if (isDesktop) {
        desktopSearchRef.current?.focus();
      } else {
        setMobileOpen(false);
        setMobileSearchOpen(true);
        requestAnimationFrame(() => {
          mobileSearchRef.current?.focus();
        });
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const navLinkClass = "text-text hover:text-heading";
  const chevronClass = "text-muted";

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white/95 backdrop-blur-md">
      <div className="border-b border-border bg-surface-soft">
        <div className="section-shell flex items-center justify-between gap-3 py-1.5">
          <a
            href="#newsletter"
            className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-accent transition hover:text-accent-deep"
          >
            <BellIcon />
            Get Travel Alerts
          </a>
          {latestPost ? (
            <Link
              href={`/${latestPost.slug}`}
              className="min-w-0 truncate text-sm font-medium text-text transition hover:text-accent sm:max-w-md"
            >
              <span className="hidden sm:inline">Latest from the road: </span>
              <span className="sm:hidden">Latest: </span>
              {latestPost.title}
            </Link>
          ) : (
            <Link
              href="/blog"
              className="hidden text-sm font-medium text-text transition hover:text-accent sm:inline"
            >
              Latest from the road
            </Link>
          )}
        </div>
      </div>

      <div className="section-shell relative flex h-[4.5rem] items-center md:h-20 justify-between gap-3 md:justify-start md:gap-4 lg:gap-6">
        {/* Mobile: search (left) */}
        <button
          type="button"
          className="relative z-10 inline-flex h-10 w-10 items-center justify-center rounded-lg text-heading transition hover:bg-surface-soft md:hidden"
          aria-expanded={mobileSearchOpen}
          aria-controls="mobile-search-panel"
          onClick={() => {
            setMobileOpen(false);
            setMobileSearchOpen((v) => {
              const next = !v;
              if (next) {
                requestAnimationFrame(() => mobileSearchRef.current?.focus());
              }
              return next;
            });
          }}
        >
          <span className="sr-only">
            {mobileSearchOpen ? "Close search" : "Open search"}
          </span>
          {mobileSearchOpen ? (
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
          ) : (
            <SearchIcon className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
          )}
        </button>

        {/* Logo: centered on mobile, left on desktop — image only (wordmark is in the asset) */}
        <Link
          href="/"
          className="absolute left-1/2 z-10 flex -translate-x-1/2 items-center md:static md:shrink-0 md:translate-x-0"
          onClick={closeAll}
          aria-label="Fernandes Journeys home"
        >
          <BrandLogo className="h-12 w-auto sm:h-14 md:h-16" width={260} height={78} priority />
        </Link>

        {/* Desktop: primary nav (center zone) */}
        <nav
          className="hidden min-w-0 flex-1 items-center justify-center gap-5 lg:gap-6 md:flex"
          aria-label="Primary"
        >
          <div className="relative" ref={destWrapRef}>
            <button
              ref={destButtonRef}
              type="button"
              className={`inline-flex items-center gap-1.5 font-sans text-sm font-semibold tracking-tight transition ${navLinkClass}`}
              aria-expanded={destOpen}
              aria-haspopup="true"
              aria-controls={destMenuId}
              onClick={() => {
                setDestOpen((v) => !v);
                setDesktopOpenContinent(null);
              }}
            >
              Places
              <span className={chevronClass}>
                <ChevronDown open={destOpen} />
              </span>
            </button>

            {destOpen && (
              <div
                id={destMenuId}
                role="menu"
                aria-label="Places"
                className="absolute left-0 top-full z-50 mt-3 min-w-[14rem] rounded-xl border border-border bg-white py-2"
              >
                <Link
                  href="/destinations"
                  role="menuitem"
                  className="block px-4 py-2 text-sm font-semibold text-heading transition hover:bg-surface-soft hover:text-accent"
                  onClick={closeDest}
                >
                  All places
                </Link>
                <div className="my-1 border-t border-surface" />

                {destinationsTree.map((continent) => {
                  const isContinentOpen = desktopOpenContinent === continent.id;
                  return (
                    <div key={continent.id} className="relative">
                      <button
                        type="button"
                        role="menuitem"
                        aria-expanded={isContinentOpen}
                        aria-haspopup="true"
                        className="flex w-full items-center justify-between gap-4 px-4 py-2 text-left text-sm text-text transition hover:bg-surface-soft hover:text-accent"
                        onClick={() => {
                          setDesktopOpenContinent(
                            isContinentOpen ? null : continent.id,
                          );
                        }}
                        onMouseEnter={() => {
                          setDesktopOpenContinent(continent.id);
                        }}
                      >
                        {continent.name}
                        <ChevronRight />
                      </button>
                      {isContinentOpen && (
                        <ul
                          role="menu"
                          className="absolute left-full top-0 ml-1 min-w-[11rem] rounded-xl border border-border bg-white py-2"
                        >
                          {continent.countries.map((country) => (
                            <li key={country.slug} role="none">
                              <Link
                                href={`/${country.slug}`}
                                role="menuitem"
                                className="block px-4 py-2 text-sm text-text transition hover:bg-surface-soft hover:text-accent"
                                onClick={closeDest}
                              >
                                {country.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <Link
            href="/blog"
            className={`font-sans text-sm font-semibold tracking-tight transition ${navLinkClass}`}
          >
            Stories
          </Link>

          <TopicFlyout
            label="Guides"
            href="/guides"
            items={guidesNav}
            navLinkClass={navLinkClass}
            chevronClass={chevronClass}
          />

          <Link
            href="/start-here"
            className={`font-sans text-sm font-semibold tracking-tight transition ${navLinkClass}`}
          >
            Start here
          </Link>
        </nav>

        {/* Desktop: right actions (search + auth + theme + CTA) */}
        <div className="hidden shrink-0 items-center gap-2 lg:gap-3 md:flex">
          <SearchInput
            ref={desktopSearchRef}
            variant="header"
            id="header-search"
            className="w-44 max-w-xs shrink-0 lg:w-52"
          />

          <ReaderAuthButtons
            variant="header"
            googleConfigured={googleConfigured}
          />

          <ThemeToggle />

          <Link
            href="/tools"
            className="btn btn-ink !min-h-9 shrink-0 !px-4 !py-1.5 text-sm"
          >
            Tools I use
          </Link>
        </div>

        {/* Mobile: theme + menu drawer (right) */}
        <div className="relative z-10 flex items-center gap-1 md:hidden">
          <ThemeToggle />
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-on-solid transition hover:bg-accent-deep"
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav"
          onClick={() => {
            setMobileSearchOpen(false);
            setMobileOpen((v) => !v);
          }}
        >
          <span className="sr-only">{mobileOpen ? "Close menu" : "Open menu"}</span>
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            {mobileOpen ? (
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            )}
          </svg>
        </button>
        </div>
      </div>

      {mobileSearchOpen && (
        <div
          id="mobile-search-panel"
          className="border-t border-border bg-white px-4 py-3 md:hidden"
        >
          <SearchInput
            ref={mobileSearchRef}
            variant="drawer"
            id="mobile-search"
            onNavigate={closeAll}
          />
        </div>
      )}

      {mobileOpen
        ? createPortal(
        <div className="fixed inset-0 z-[200] md:hidden" role="dialog" aria-modal="true" aria-label="Site menu">
          {/* Scrim — tap the thin right gap to close */}
          <button
            type="button"
            className="absolute inset-0 bg-heading/40 backdrop-blur-[1px]"
            aria-label="Close menu"
            onClick={closeAll}
          />

          {/* Near-full-width drawer, small gap on the right */}
          <nav
            id="mobile-nav"
            className="absolute inset-y-0 left-0 flex w-[calc(100%-0.75rem)] max-w-[28rem] flex-col bg-bg shadow-xl"
            aria-label="Mobile"
          >
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <Link href="/" onClick={closeAll} aria-label="Fernandes Journeys home">
                <BrandLogo className="h-9 w-auto" priority />
              </Link>
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-on-solid transition hover:bg-accent-deep"
                aria-label="Close menu"
                onClick={closeAll}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3">
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
                  {mobileDestOpen && (
                    <ul className="mb-2 ml-3 border-l border-border pl-3">
                      <li>
                        <Link
                          href="/destinations"
                          className="block py-1.5 text-sm text-text hover:text-accent"
                          onClick={closeAll}
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
                            {continentOpen && (
                              <ul className="mb-1 ml-2 border-l border-border pl-3">
                                {continent.countries.map((country) => (
                                  <li key={country.slug}>
                                    <Link
                                      href={`/${country.slug}`}
                                      className="block py-1.5 text-sm text-text hover:text-accent"
                                      onClick={closeAll}
                                    >
                                      {country.name}
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>

                <li>
                  <Link
                    href="/blog"
                    className="flex items-center gap-2.5 rounded-lg px-2 py-2.5 text-base font-semibold tracking-tight text-heading hover:bg-surface-soft hover:text-accent"
                    onClick={closeAll}
                  >
                    <NavIcon name="book-open" size={18} className="text-accent" />
                    Stories
                  </Link>
                </li>

                <MobileTopicSection
                  label="Guides"
                  href="/guides"
                  items={guidesNav}
                  icon="book-marked"
                  onNavigate={closeAll}
                />

                <li>
                  <Link
                    href="/start-here"
                    className="flex items-center gap-2.5 rounded-lg px-2 py-2.5 text-base font-semibold tracking-tight text-heading hover:bg-surface-soft hover:text-accent"
                    onClick={closeAll}
                  >
                    <NavIcon name="compass" size={18} className="text-accent" />
                    Start here
                  </Link>
                </li>

                <li>
                  <Link
                    href="/tools"
                    className="flex items-center gap-2.5 rounded-lg px-2 py-2.5 text-base font-semibold tracking-tight text-heading hover:bg-surface-soft hover:text-accent"
                    onClick={closeAll}
                  >
                    <NavIcon name="wrench" size={18} className="text-accent" />
                    Tools I use
                  </Link>
                </li>

                <li className="mt-3 border-t border-border pt-3">
                  <Link
                    href="/about"
                    className="block rounded-lg px-2 py-2 text-sm font-semibold text-text hover:bg-surface-soft hover:text-accent"
                    onClick={closeAll}
                  >
                    About
                  </Link>
                </li>
                <li>
                  <Link
                    href="/contact"
                    className="block rounded-lg px-2 py-2 text-sm font-semibold text-text hover:bg-surface-soft hover:text-accent"
                    onClick={closeAll}
                  >
                    Contact
                  </Link>
                </li>
                {googleConfigured ? (
                  <li className="mt-3 border-t border-border pt-3 px-2">
                    <ReaderAuthButtons
                      variant="mobile"
                      googleConfigured={googleConfigured}
                      onNavigate={closeAll}
                    />
                  </li>
                ) : null}
              </ul>
            </div>
          </nav>
        </div>
          ,
          document.body,
        )
      : null}
    </header>
  );
}

function BellIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path
        d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 21a2 2 0 0 0 4 0"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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

function ChevronRight() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
