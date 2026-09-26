"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  BookOpen,
  Compass,
  FileText,
  HelpCircle,
  ImageIcon,
  LayoutDashboard,
  ListChecks,
  MapPin,
  Menu,
  MessageSquare,
  Palette,
  PenLine,
  Gem,
  Users,
  X,
} from "lucide-react";
import { LogoutButton } from "./LogoutButton";

const NAV = [
  { href: "/cms", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/cms/posts", label: "Posts", icon: PenLine },
  { href: "/cms/seo", label: "SEO", icon: ListChecks },
  { href: "/cms/comments", label: "Comments", icon: MessageSquare },
  { href: "/cms/pages", label: "Pages", icon: FileText },
  { href: "/cms/trip-planner", label: "Trip planner", icon: Compass },
  { href: "/cms/destinations", label: "Destinations", icon: MapPin },
  { href: "/cms/media", label: "Media", icon: ImageIcon },
  { href: "/cms/design", label: "Website design", icon: Palette },
  { href: "/cms/users", label: "Users", icon: Users },
  { href: "/cms/members", label: "Members", icon: Gem },
  { href: "/cms/help", label: "Help", icon: HelpCircle },
] as const;

function isActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) return pathname === href;
  if (href === "/cms/posts") {
    return (
      pathname === "/cms/posts" ||
      pathname.startsWith("/cms/new") ||
      pathname.startsWith("/cms/edit/")
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

type Props = {
  children: ReactNode;
  oauthSession?: boolean;
  pendingComments?: number;
};

export function CmsShell({
  children,
  oauthSession = false,
  pendingComments = 0,
}: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(pendingComments);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    setPending(pendingComments);
  }, [pendingComments]);

  useEffect(() => {
    let cancelled = false;
    async function refreshBadge() {
      try {
        const res = await fetch("/api/cms/comments?pendingCount=1");
        if (!res.ok) return;
        const data = (await res.json()) as { pendingCount?: number };
        if (!cancelled && typeof data.pendingCount === "number") {
          setPending(data.pendingCount);
        }
      } catch {
        /* ignore */
      }
    }
    void refreshBadge();
    const id = window.setInterval(() => void refreshBadge(), 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const nav = (
    <nav className="flex flex-col gap-1" aria-label="CMS">
      {NAV.map((item) => {
        const active = isActive(pathname, item.href, "exact" in item && item.exact);
        const Icon = item.icon;
        const showBadge =
          item.href === "/cms/comments" && pending > 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
              active
                ? "bg-accent/15 text-heading ring-1 ring-accent/30"
                : "text-text hover:bg-white/70 hover:text-heading"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
            <span className="flex-1">{item.label}</span>
            {showBadge ? (
              <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-on-solid">
                {pending > 99 ? "99+" : pending}
              </span>
            ) : null}
          </Link>
        );
      })}
      <Link
        href="/blog"
        className="mt-2 flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-muted transition hover:bg-white/70 hover:text-heading"
      >
        <BookOpen className="h-3.5 w-3.5 shrink-0" aria-hidden />
        View live site
      </Link>
    </nav>
  );

  return (
    <div className="min-h-[70vh]">
      <div className="mb-6 flex items-center justify-between gap-3 border-b border-border pb-4 lg:hidden">
        <div>
          <p className="eyebrow text-accent">CMS</p>
          <p className="font-display text-lg font-bold text-heading">
            Alex Journeys
          </p>
        </div>
        <div className="flex items-center gap-2">
          <LogoutButton oauthSession={oauthSession} />
          <button
            type="button"
            className="btn btn-secondary inline-flex h-11 w-11 items-center justify-center p-0"
            aria-expanded={open}
            aria-controls="cms-mobile-nav"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            <span className="sr-only">Menu</span>
          </button>
        </div>
      </div>

      {open ? (
        <div
          id="cms-mobile-nav"
          className="mb-6 rounded-xl border border-border bg-surface-soft p-3 lg:hidden"
        >
          {nav}
        </div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="sticky top-6 space-y-6">
            <div>
              <p className="eyebrow text-accent">In-site CMS</p>
              <p className="font-display mt-1 text-lg font-bold text-heading">
                Alex Journeys
              </p>
            </div>
            {nav}
            <div className="border-t border-border pt-4">
              <LogoutButton oauthSession={oauthSession} />
            </div>
          </div>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
