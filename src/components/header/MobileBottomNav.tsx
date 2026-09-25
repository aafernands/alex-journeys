"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect } from "react";
import { destinationSlugs } from "@/data/destinations";
import { NavIcon } from "@/components/icons/NavIcon";
import { useTripFocus } from "@/components/trip-planner/TripFocus";

type Tab = {
  href: string;
  label: string;
  icon: string;
  match: (path: string) => boolean;
};

const TABS: Tab[] = [
  {
    href: "/destinations",
    label: "Places",
    icon: "map-pin",
    match: (path) =>
      path === "/destinations" || path.startsWith("/destinations/") ||
      destinationSlugs.some((slug) => path === `/${slug}` || path.startsWith(`/${slug}/`)),
  },
  {
    href: "/blog",
    label: "Stories",
    icon: "book-open",
    match: (path) => path === "/blog" || path.startsWith("/blog/"),
  },
  {
    href: "/guides/plan-a-trip",
    label: "Plan trip",
    icon: "suitcase",
    match: (path) => path === "/guides/plan-a-trip",
  },
  {
    href: "/account#saved",
    label: "Saved",
    icon: "bookmark",
    match: (path) => path === "/account" || path.startsWith("/account/"),
  },
];

const BODY_VISIBLE_CLASS = "mobile-bottom-nav-visible";

/** Persistent discovery navigation. Trip workspaces, booking flows, and overlays hide it. */
export function MobileBottomNav() {
  const pathname = usePathname() ?? "";
  const { focused } = useTripFocus();
  const visible = !focused
    && !/^\/(cms|api|login|signup|forgot-password|reset-password)(\/|$)/.test(pathname)
    && !/\/(checkout|confirmation)(\/|$)/.test(pathname)
    && pathname !== "/flights/book";

  useLayoutEffect(() => {
    document.body.classList.toggle(BODY_VISIBLE_CLASS, visible);
    return () => {
      document.body.classList.remove(BODY_VISIBLE_CLASS);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <nav
      className="mobile-bottom-nav glass fixed z-[150] rounded-[1.6rem] xl:hidden"
      aria-label="Primary mobile"
    >
      <ul className="grid h-16 grid-cols-4 items-stretch">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          return (
            <li key={tab.href} className="flex">
              <Link
                href={tab.href}
                className={`flex flex-1 flex-col items-center justify-center gap-0.5 px-1 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-accent ${
                  active ? "text-heading" : "text-muted hover:text-heading"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <span className={`flex h-8 w-14 items-center justify-center rounded-full ${active ? "bg-accent text-on-solid" : ""}`}>
                  <NavIcon name={tab.icon} size={22} />
                </span>
                <span>{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
