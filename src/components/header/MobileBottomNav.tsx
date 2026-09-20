"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NavIcon } from "@/components/icons/NavIcon";

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
      path === "/destinations" || path.startsWith("/destinations/"),
  },
  {
    href: "/blog",
    label: "Stories",
    icon: "book-open",
    match: (path) => path === "/blog" || path.startsWith("/blog/"),
  },
  {
    href: "/guides",
    label: "Guides",
    icon: "book-marked",
    match: (path) => path === "/guides" || path.startsWith("/guides/"),
  },
  {
    href: "/account",
    label: "Saved",
    icon: "bookmark",
    match: (path) => path === "/account" || path.startsWith("/account/"),
  },
];

/** Show bottom bar once scrollY exceeds this; hide when back near top. */
const SHOW_THRESHOLD_PX = 80;

const BODY_VISIBLE_CLASS = "mobile-bottom-nav-visible";

/**
 * Fixed bottom tab bar (mobile only): Places / Stories / Guides / Saved.
 * Hidden near the top of the page; appears after scrolling down past the threshold.
 */
export function MobileBottomNav() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const update = () => {
      setVisible(window.scrollY >= SHOW_THRESHOLD_PX);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  useEffect(() => {
    document.body.classList.toggle(BODY_VISIBLE_CLASS, visible);
    return () => {
      document.body.classList.remove(BODY_VISIBLE_CLASS);
    };
  }, [visible]);

  return (
    <nav
      className={`fixed inset-x-0 bottom-0 z-[150] border-t border-border bg-white/95 backdrop-blur-md transition-[transform,opacity] duration-200 ease-out md:hidden motion-reduce:transition-none ${
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-full opacity-0"
      }`}
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="Primary mobile"
      aria-hidden={!visible}
    >
      <ul className="grid h-14 grid-cols-4 items-stretch">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          return (
            <li key={tab.href} className="flex">
              <Link
                href={tab.href}
                tabIndex={visible ? undefined : -1}
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
