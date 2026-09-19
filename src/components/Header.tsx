"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { TopicFlyout } from "@/components/header/TopicFlyout";
import { MobileTopicSection } from "@/components/header/MobileTopicSection";
import { destinationsTree } from "@/data/destinations";
import {
  experiencesNav,
  resourcesMenuExtras,
  resourcesNav,
} from "@/data/nav";

type LatestPost = { slug: string; title: string };

type Props = {
  latestPost?: LatestPost | null;
};

const resourcesFlyoutItems = [...resourcesMenuExtras, ...resourcesNav];

export function Header({ latestPost = null }: Props) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [destOpen, setDestOpen] = useState(false);
  const [desktopOpenContinent, setDesktopOpenContinent] = useState<
    string | null
  >(null);
  const [desktopOpenRegion, setDesktopOpenRegion] = useState<string | null>(
    null,
  );
  const [mobileDestOpen, setMobileDestOpen] = useState(false);
  const [mobileContinent, setMobileContinent] = useState<string | null>(null);
  const [mobileRegion, setMobileRegion] = useState<string | null>(null);

  const destMenuId = useId();
  const destWrapRef = useRef<HTMLDivElement>(null);
  const destButtonRef = useRef<HTMLButtonElement>(null);

  const closeDest = useCallback(() => {
    setDestOpen(false);
    setDesktopOpenContinent(null);
    setDesktopOpenRegion(null);
  }, []);

  const closeAll = useCallback(() => {
    setMobileOpen(false);
    setMobileDestOpen(false);
    setMobileContinent(null);
    setMobileRegion(null);
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
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAll();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen, closeAll]);

  const navLinkClass = "text-text hover:text-heading";
  const chevronClass = "text-muted";

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white/95 backdrop-blur-md">
      {/* Slim metastrip */}
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
              href={`/blog/${latestPost.slug}`}
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

      <div className="section-shell flex items-center justify-between gap-4 py-3 md:py-3.5">
        <Link
          href="/"
          className="relative z-10 shrink-0"
          onClick={closeAll}
          aria-label="Alex Journly home"
        >
          <Image
            src="/brand/logo-alex-journly.png"
            alt="alex journly"
            width={200}
            height={55}
            priority
            className="h-8 w-auto md:h-10"
          />
        </Link>

        <nav
          className="hidden items-center gap-6 lg:gap-7 md:flex"
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
                setDesktopOpenRegion(null);
              }}
            >
              Destinations
              <span className={chevronClass}>
                <ChevronDown open={destOpen} />
              </span>
            </button>

            {destOpen && (
              <div
                id={destMenuId}
                role="menu"
                aria-label="Destinations"
                className="absolute left-0 top-full z-50 mt-3 min-w-[14rem] rounded-xl border border-border bg-white py-2"
              >
                <Link
                  href="/destinations"
                  role="menuitem"
                  className="block px-4 py-2 text-sm font-semibold text-heading transition hover:bg-surface-soft hover:text-accent"
                  onClick={closeDest}
                >
                  All destinations
                </Link>
                <div className="my-1 border-t border-surface" />

                {destinationsTree.map((continent) => {
                  const hasRegions = Boolean(continent.regions?.length);
                  const isContinentOpen = desktopOpenContinent === continent.id;

                  if (!hasRegions && continent.countries) {
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
                            setDesktopOpenRegion(null);
                          }}
                          onMouseEnter={() => {
                            setDesktopOpenContinent(continent.id);
                            setDesktopOpenRegion(null);
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
                                  href={`/destinations/${country.slug}`}
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
                  }

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
                          setDesktopOpenRegion(null);
                        }}
                        onMouseEnter={() => {
                          setDesktopOpenContinent(continent.id);
                          setDesktopOpenRegion(null);
                        }}
                      >
                        {continent.name}
                        <ChevronRight />
                      </button>
                      {isContinentOpen && continent.regions && (
                        <ul
                          role="menu"
                          className="absolute left-full top-0 ml-1 min-w-[13rem] rounded-xl border border-border bg-white py-2"
                        >
                          {continent.regions.map((region) => {
                            const isRegionOpen =
                              desktopOpenRegion === region.id;
                            return (
                              <li
                                key={region.id}
                                role="none"
                                className="relative"
                              >
                                <button
                                  type="button"
                                  role="menuitem"
                                  aria-expanded={isRegionOpen}
                                  aria-haspopup="true"
                                  className="flex w-full items-center justify-between gap-4 px-4 py-2 text-left text-sm text-text transition hover:bg-surface-soft hover:text-accent"
                                  onClick={() =>
                                    setDesktopOpenRegion(
                                      isRegionOpen ? null : region.id,
                                    )
                                  }
                                  onMouseEnter={() =>
                                    setDesktopOpenRegion(region.id)
                                  }
                                >
                                  {region.name}
                                  <ChevronRight />
                                </button>
                                {isRegionOpen && (
                                  <ul
                                    role="menu"
                                    className="absolute left-full top-0 ml-1 min-w-[11rem] rounded-xl border border-border bg-white py-2"
                                  >
                                    {region.countries.map((country) => (
                                      <li key={country.slug} role="none">
                                        <Link
                                          href={`/destinations/${country.slug}`}
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
                              </li>
                            );
                          })}
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
            Blog
          </Link>

          <TopicFlyout
            label="Resources"
            href="/resources"
            items={resourcesFlyoutItems}
            navLinkClass={navLinkClass}
            chevronClass={chevronClass}
          />

          <Link
            href="/start-here"
            className={`font-sans text-sm font-semibold tracking-tight transition ${navLinkClass}`}
          >
            Start Here
          </Link>

          <Link
            href="/plan-your-trip"
            className="btn btn-ink !min-h-9 !px-4 !py-1.5 text-sm"
          >
            Trip tools
          </Link>
        </nav>

        <button
          type="button"
          className="inline-flex items-center justify-center rounded-lg bg-accent p-2.5 text-white transition hover:bg-accent-deep md:hidden"
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav"
          onClick={() => setMobileOpen((v) => !v)}
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

      {mobileOpen && (
        <nav
          id="mobile-nav"
          className="max-h-[min(80vh,32rem)] overflow-y-auto border-t border-border bg-white px-5 py-4 md:hidden"
          aria-label="Mobile"
        >
          <ul className="flex flex-col gap-1">
            <li>
              <button
                type="button"
                className="flex w-full items-center justify-between py-2.5 text-base font-semibold tracking-tight text-heading"
                aria-expanded={mobileDestOpen}
                onClick={() => setMobileDestOpen((v) => !v)}
              >
                Destinations
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
                      All destinations
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
                            {continent.countries?.map((country) => (
                              <li key={country.slug}>
                                <Link
                                  href={`/destinations/${country.slug}`}
                                  className="block py-1.5 text-sm text-text hover:text-accent"
                                  onClick={closeAll}
                                >
                                  {country.name}
                                </Link>
                              </li>
                            ))}
                            {continent.regions?.map((region) => {
                              const regionOpen = mobileRegion === region.id;
                              return (
                                <li key={region.id}>
                                  <button
                                    type="button"
                                    className="flex w-full items-center justify-between py-1.5 text-sm font-medium text-text"
                                    aria-expanded={regionOpen}
                                    onClick={() =>
                                      setMobileRegion(
                                        regionOpen ? null : region.id,
                                      )
                                    }
                                  >
                                    {region.name}
                                    <ChevronDown open={regionOpen} />
                                  </button>
                                  {regionOpen && (
                                    <ul className="mb-1 ml-2 border-l border-border pl-3">
                                      {region.countries.map((country) => (
                                        <li key={country.slug}>
                                          <Link
                                            href={`/destinations/${country.slug}`}
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
                    );
                  })}
                </ul>
              )}
            </li>

            <li>
              <Link
                href="/blog"
                className="block py-2.5 text-base font-semibold tracking-tight text-heading hover:text-accent"
                onClick={closeAll}
              >
                Blog
              </Link>
            </li>

            <MobileTopicSection
              label="Resources"
              href="/resources"
              items={resourcesFlyoutItems}
              onNavigate={closeAll}
            />

            <li>
              <Link
                href="/start-here"
                className="block py-2.5 text-base font-semibold tracking-tight text-heading hover:text-accent"
                onClick={closeAll}
              >
                Start Here
              </Link>
            </li>

            <MobileTopicSection
              label="Experiences"
              href="/experiences"
              items={experiencesNav}
              onNavigate={closeAll}
            />

            <li>
              <Link
                href="/about"
                className="block py-2.5 text-base font-semibold tracking-tight text-heading hover:text-accent"
                onClick={closeAll}
              >
                About
              </Link>
            </li>
            <li>
              <Link
                href="/contact"
                className="block py-2.5 text-base font-semibold tracking-tight text-heading hover:text-accent"
                onClick={closeAll}
              >
                Contact
              </Link>
            </li>

            <li className="pt-2">
              <Link
                href="/plan-your-trip"
                className="btn btn-primary btn-block"
                onClick={closeAll}
              >
                Trip tools
              </Link>
            </li>
          </ul>
        </nav>
      )}
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
