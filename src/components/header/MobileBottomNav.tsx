"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavIcon } from "@/components/icons/NavIcon";

type Tab =
  | { kind: "link"; href: string; label: string; icon: string; match: (path: string) => boolean }
  | { kind: "menu"; label: string };

const TABS: Tab[] = [
  {
    kind: "link",
    href: "/destinations",
    label: "Places",
    icon: "map-pin",
    match: (path) => path === "/destinations" || path.startsWith("/destinations/"),
  },
  {
    kind: "link",
    href: "/blog",
    label: "Stories",
    icon: "book-open",
    match: (path) => path === "/blog" || path.startsWith("/blog/"),
  },
  {
    kind: "link",
    href: "/guides",
    label: "Guides",
    icon: "book-marked",
    match: (path) => path === "/guides" || path.startsWith("/guides/"),
  },
  {
    kind: "link",
    href: "/account",
    label: "Saved",
    icon: "bookmark",
    match: (path) => path === "/account" || path.startsWith("/account/"),
  },
  { kind: "menu", label: "Menu" },
];

type Props = {
  menuOpen: boolean;
  onOpenMenu: () => void;
};

/**
 * AllTrails-style fixed bottom tab bar (mobile only).
 * Primary destinations live here; secondary links open via the Menu tab drawer.
 */
export function MobileBottomNav({ menuOpen, onOpenMenu }: Props) {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-[150] border-t border-border bg-white/95 backdrop-blur-md md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="Primary mobile"
    >
      <ul className="grid h-14 grid-cols-5 items-stretch">
        {TABS.map((tab) => {
          if (tab.kind === "menu") {
            return (
              <li key="menu" className="flex">
                <button
                  type="button"
                  className={`flex flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-semibold tracking-tight transition ${
                    menuOpen ? "text-accent" : "text-muted hover:text-heading"
                  }`}
                  aria-expanded={menuOpen}
                  aria-controls="mobile-nav"
                  onClick={onOpenMenu}
                >
                  <MenuGlyph active={menuOpen} />
                  <span>{tab.label}</span>
                </button>
              </li>
            );
          }

          const active = !menuOpen && tab.match(pathname);
          return (
            <li key={tab.href} className="flex">
              <Link
                href={tab.href}
                className={`flex flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-semibold tracking-tight transition ${
                  active ? "text-accent" : "text-muted hover:text-heading"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <NavIcon
                  name={tab.icon}
                  size={20}
                  className={active ? "text-accent" : "text-current"}
                />
                <span>{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function MenuGlyph({ active }: { active: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={active ? "text-accent" : "text-current"}
      aria-hidden="true"
    >
      <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
    </svg>
  );
}
