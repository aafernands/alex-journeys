"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLayoutEffect } from "react";
import { getSession, useSession } from "next-auth/react";
import { destinationSlugs } from "@/data/destinations";
import { NavIcon } from "@/components/icons/NavIcon";
import { useReaderLoginPrompt } from "@/components/ReaderLoginPrompt";
import { useTripFocus } from "@/components/trip-planner/TripFocus";
import {
  SAVED_ACCOUNT_HREF,
  SAVED_SIGN_IN_INTRO,
  SAVED_SIGN_IN_RETURN,
} from "@/lib/account-section";

type Tab = {
  href: string;
  label: string;
  icon: string;
  match: (path: string) => boolean;
  saved?: boolean;
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
    href: SAVED_ACCOUNT_HREF,
    label: "Saved",
    icon: "bookmark",
    saved: true,
    match: (path) => path === "/account" || path.startsWith("/account/"),
  },
];

const BODY_VISIBLE_CLASS = "mobile-bottom-nav-visible";

const tabClass =
  "flex flex-1 flex-col items-center justify-center gap-0 px-1 text-xs font-medium leading-none transition focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-accent";

function TabBody({ tab, active }: { tab: Tab; active: boolean }) {
  return (
    <>
      <span className={`flex h-7 w-7 items-center justify-center rounded-full ${active ? "bg-ink text-on-solid" : ""}`}>
        <NavIcon name={tab.icon} size={20} />
      </span>
      <span>{tab.label}</span>
    </>
  );
}

function SavedTab({ tab, active }: { tab: Tab; active: boolean }) {
  const { status } = useSession();
  const router = useRouter();
  const openReaderLogin = useReaderLoginPrompt();
  const signedIn = status === "authenticated";

  async function openSaved() {
    let signedInNow = signedIn;
    if (status === "loading") {
      const session = await getSession();
      signedInNow = Boolean(session?.user);
    }
    if (signedInNow) {
      router.push(SAVED_ACCOUNT_HREF);
      return;
    }
    openReaderLogin({
      returnTo: SAVED_SIGN_IN_RETURN,
      intro: SAVED_SIGN_IN_INTRO,
    });
  }

  if (signedIn) {
    return (
      <Link
        href={tab.href}
        className={`${tabClass} ${active ? "text-heading" : "text-muted hover:text-heading"}`}
        aria-current={active ? "page" : undefined}
      >
        <TabBody tab={tab} active={active} />
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={`${tabClass} ${active ? "text-heading" : "text-muted hover:text-heading"}`}
      aria-haspopup="dialog"
      aria-current={active ? "page" : undefined}
      onClick={() => {
        void openSaved();
      }}
    >
      <TabBody tab={tab} active={active} />
    </button>
  );
}

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
      className="mobile-bottom-nav app-tab-bar glass fixed z-[150] xl:hidden"
      aria-label="Primary mobile"
    >
      <ul className="grid h-full grid-cols-4 items-stretch">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          return (
            <li key={tab.href} className="flex">
              {tab.saved ? (
                <SavedTab tab={tab} active={active} />
              ) : (
                <Link
                  href={tab.href}
                  className={`${tabClass} ${active ? "text-heading" : "text-muted hover:text-heading"}`}
                  aria-current={active ? "page" : undefined}
                >
                  <TabBody tab={tab} active={active} />
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
