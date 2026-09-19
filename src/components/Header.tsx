"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { site } from "@/data/content";
import { destinationsTree } from "@/data/destinations";

const links = [
  { href: "/#stories", label: "Stories" },
  { href: "/#about", label: "About" },
  { href: "/#favorites", label: "Favorites" },
  { href: "/#newsletter", label: "Newsletter" },
];

export function Header() {
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

  return (
    <header className="sticky top-0 z-50 border-b border-sand/60 bg-cream/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 md:px-8">
        <Link
          href="/"
          className="font-display text-xl tracking-tight text-ink transition hover:text-terracotta md:text-2xl"
          onClick={closeAll}
        >
          {site.name}
        </Link>

        <nav className="hidden items-center gap-7 lg:gap-8 md:flex" aria-label="Primary">
          <div className="relative" ref={destWrapRef}>
            <button
              ref={destButtonRef}
              type="button"
              className="inline-flex items-center gap-1.5 text-sm font-medium tracking-wide text-ink-soft transition hover:text-terracotta"
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
              <ChevronDown open={destOpen} />
            </button>

            {destOpen && (
              <div
                id={destMenuId}
                role="menu"
                aria-label="Destinations"
                className="absolute left-0 top-full z-50 mt-3 min-w-[14rem] rounded-xl border border-sand/80 bg-surface py-2 shadow-[0_16px_40px_-20px_rgba(28,25,23,0.45)]"
              >
                <Link
                  href="/destinations"
                  role="menuitem"
                  className="block px-4 py-2 text-sm font-medium text-ink transition hover:bg-cream-deep hover:text-terracotta"
                  onClick={closeDest}
                >
                  All destinations
                </Link>
                <div className="my-1 border-t border-sand/60" />

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
                          className="flex w-full items-center justify-between gap-4 px-4 py-2 text-left text-sm text-ink-soft transition hover:bg-cream-deep hover:text-terracotta"
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
                            className="absolute left-full top-0 ml-1 min-w-[11rem] rounded-xl border border-sand/80 bg-surface py-2 shadow-[0_16px_40px_-20px_rgba(28,25,23,0.45)]"
                          >
                            {continent.countries.map((country) => (
                              <li key={country.slug} role="none">
                                <Link
                                  href={`/destinations/${country.slug}`}
                                  role="menuitem"
                                  className="block px-4 py-2 text-sm text-ink-soft transition hover:bg-cream-deep hover:text-terracotta"
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
                        className="flex w-full items-center justify-between gap-4 px-4 py-2 text-left text-sm text-ink-soft transition hover:bg-cream-deep hover:text-terracotta"
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
                          className="absolute left-full top-0 ml-1 min-w-[13rem] rounded-xl border border-sand/80 bg-surface py-2 shadow-[0_16px_40px_-20px_rgba(28,25,23,0.45)]"
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
                                  className="flex w-full items-center justify-between gap-4 px-4 py-2 text-left text-sm text-ink-soft transition hover:bg-cream-deep hover:text-terracotta"
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
                                    className="absolute left-full top-0 ml-1 min-w-[11rem] rounded-xl border border-sand/80 bg-surface py-2 shadow-[0_16px_40px_-20px_rgba(28,25,23,0.45)]"
                                  >
                                    {region.countries.map((country) => (
                                      <li key={country.slug} role="none">
                                        <Link
                                          href={`/destinations/${country.slug}`}
                                          role="menuitem"
                                          className="block px-4 py-2 text-sm text-ink-soft transition hover:bg-cream-deep hover:text-terracotta"
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

          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium tracking-wide text-ink-soft transition hover:text-terracotta"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <button
          type="button"
          className="inline-flex items-center justify-center rounded-md p-2 text-ink md:hidden"
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
            strokeWidth="1.75"
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
          className="border-t border-sand/60 bg-cream px-5 py-4 md:hidden"
          aria-label="Mobile"
        >
          <ul className="flex flex-col gap-1">
            <li>
              <button
                type="button"
                className="flex w-full items-center justify-between py-2 text-base font-medium text-ink-soft transition hover:text-terracotta"
                aria-expanded={mobileDestOpen}
                onClick={() => setMobileDestOpen((v) => !v)}
              >
                Destinations
                <ChevronDown open={mobileDestOpen} />
              </button>
              {mobileDestOpen && (
                <ul className="mb-2 ml-3 border-l border-sand/70 pl-3">
                  <li>
                    <Link
                      href="/destinations"
                      className="block py-1.5 text-sm text-ink-soft hover:text-terracotta"
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
                          className="flex w-full items-center justify-between py-1.5 text-sm font-medium text-ink transition hover:text-terracotta"
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
                          <ul className="mb-1 ml-2 border-l border-sand/60 pl-3">
                            {continent.countries?.map((country) => (
                              <li key={country.slug}>
                                <Link
                                  href={`/destinations/${country.slug}`}
                                  className="block py-1.5 text-sm text-ink-soft hover:text-terracotta"
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
                                    className="flex w-full items-center justify-between py-1.5 text-sm font-medium text-ink-soft transition hover:text-terracotta"
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
                                    <ul className="mb-1 ml-2 border-l border-sand/50 pl-3">
                                      {region.countries.map((country) => (
                                        <li key={country.slug}>
                                          <Link
                                            href={`/destinations/${country.slug}`}
                                            className="block py-1.5 text-sm text-ink-soft hover:text-terracotta"
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
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="block py-2 text-base font-medium text-ink-soft transition hover:text-terracotta"
                  onClick={closeAll}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
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
