"use client";

import { BrandLogo } from "@/components/brand/BrandLogo";
import { Search as SearchIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { TopicFlyout } from "@/components/header/TopicFlyout";
import { MobileBottomNav } from "@/components/header/MobileBottomNav";
import { MobileNavDrawer } from "@/components/header/MobileNavDrawer";
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
  const [mounted, setMounted] = useState(false);

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
    closeDest();
  }, [closeDest]);

  useEffect(() => {
    setMounted(true);
  }, []);

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
      const isDesktop = window.matchMedia("(min-width: 1280px)").matches;
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
    <>
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

        <div className="section-shell relative grid h-[4.75rem] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 sm:h-[5.5rem] xl:flex xl:h-24 xl:justify-start xl:gap-4 2xl:gap-6">
          {/* Mobile: search (left) */}
          <button
            type="button"
            className="relative z-10 inline-flex h-11 w-11 items-center justify-center rounded-lg text-heading transition hover:bg-surface-soft xl:hidden"
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
              <SearchIcon
                className="h-[22px] w-[22px]"
                strokeWidth={2}
                aria-hidden="true"
              />
            )}
          </button>

          {/* Logo: centered in the middle column on mobile, left on desktop */}
          <div className="z-10 flex min-w-0 items-center justify-center xl:shrink-0 xl:justify-start">
            <BrandLogo
              className="h-[2.8125rem] w-auto max-w-full object-contain sm:h-[3.75rem] lg:h-16 xl:h-10 xl:max-w-none"
              width={400}
              height={110}
              priority
              scaleOriginClassName="origin-center xl:origin-left"
              onClick={closeAll}
            />
          </div>

          {/* Desktop: primary nav */}
          <nav
            className="hidden min-w-0 flex-1 flex-nowrap items-center justify-center gap-3 xl:flex 2xl:gap-6"
            aria-label="Primary"
          >
            <div className="relative shrink-0" ref={destWrapRef}>
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
                  className="absolute left-0 top-full z-50 mt-3 min-w-[14rem] rounded-xl border border-border bg-white py-2 shadow-lg"
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
                    const isContinentOpen =
                      desktopOpenContinent === continent.id;
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
                            className="absolute left-full top-0 ml-1 min-w-[11rem] rounded-xl border border-border bg-white py-2 shadow-lg"
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
              href="/guides/plan-a-trip"
              className={`shrink-0 whitespace-nowrap font-sans text-sm font-semibold tracking-tight transition ${navLinkClass}`}
            >
              Plan a trip
            </Link>

            <Link
              href="/blog"
              className={`shrink-0 whitespace-nowrap font-sans text-sm font-semibold tracking-tight transition ${navLinkClass}`}
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
              className={`shrink-0 whitespace-nowrap font-sans text-sm font-semibold tracking-tight transition ${navLinkClass}`}
            >
              Start here
            </Link>
          </nav>

          {/* Desktop: right actions */}
          <div className="hidden shrink-0 items-center gap-2 xl:flex 2xl:gap-3">
            <SearchInput
              ref={desktopSearchRef}
              variant="header"
              id="header-search"
              className="w-36 max-w-xs shrink-0 lg:w-44 xl:w-52"
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

          {/* Mobile: Sign in and the account photo live in the drawer, not this row. */}
          <div className="relative z-10 flex shrink-0 items-center xl:hidden">
            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-heading transition hover:bg-surface-soft"
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav"
              onClick={() => {
                setMobileSearchOpen(false);
                setMobileOpen((v) => !v);
              }}
            >
              <span className="sr-only">
                {mobileOpen ? "Close menu" : "Menu"}
              </span>
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.25"
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
            className="border-t border-border bg-white px-5 py-3 xl:hidden"
          >
            <SearchInput
              ref={mobileSearchRef}
              variant="drawer"
              id="mobile-search"
              onNavigate={closeAll}
            />
          </div>
        )}
      </header>

      {mounted
        ? createPortal(
            <>
              {!mobileOpen && <MobileBottomNav />}
              <MobileNavDrawer
                open={mobileOpen}
                onClose={closeAll}
                googleConfigured={googleConfigured}
              />
            </>,
            document.body,
          )
        : null}
    </>
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
