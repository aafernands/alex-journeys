"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ChevronDown,
  ChevronRight,
  Gem,
  LayoutDashboard,
  LogOut,
  Pencil,
  Shield,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { usePremium } from "@/components/premium/usePremium";
import { PERKS_HUB_PATH } from "@/lib/premium-perks";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";

type Variant = "header" | "header-mobile" | "mobile" | "drawer" | "drawer-cta";

type Props = {
  /**
   * Desktop header: smaller photo + name (~32px).
   * header-mobile: the phone header's 40px avatar button (via HeaderAccountButton).
   * Drawer: account row (name and avatar) that opens this menu.
   */
  variant?: Variant;
  onNavigate?: () => void;
};

function isDrawerVariant(variant: Variant): boolean {
  return variant === "drawer" || variant === "drawer-cta";
}

function displayName(name?: string | null, email?: string | null): string {
  const trimmed = name?.trim();
  if (trimmed) return trimmed;
  const local = email?.split("@")[0]?.trim();
  return local || "Account";
}

export function initials(name?: string | null, email?: string | null): string {
  const source = name?.trim() || email?.trim() || "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

/** Account settings tab on /account (profile name, photo, password). */
const EDIT_PROFILE_HREF = "/account#settings";

/**
 * "Member perks" row, for Premium members only. Mounted inside the open menu
 * so the membership check runs when the menu opens, not on every page.
 */
function MemberPerksItem({ className, onNavigate }: { className: string; onNavigate: () => void }) {
  const { isPremium } = usePremium();
  if (!isPremium) return null;
  return (
    <Link href={PERKS_HUB_PATH} role="menuitem" className={className} onClick={onNavigate}>
      <Gem className="h-5 w-5 shrink-0 text-accent" strokeWidth={2.25} aria-hidden="true" />
      Member perks
    </Link>
  );
}

/**
 * Logged-in avatar menu: profile header with Edit profile, My Journey,
 * Admin console (admins only, from the session's server-computed isAdmin),
 * and Sign out.
 */
export function UserMenu({ variant = "header", onNavigate }: Props) {
  const { data: session } = useSession();
  const user = session?.user;
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const close = useCallback(() => setOpen(false), []);

  // Close on route change.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    // Move focus into the menu when it opens.
    const first = menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]');
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
        buttonRef.current?.focus();
      }
    };
    const onPointer = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        close();
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open, close]);

  function onMenuKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])') ?? [],
    );
    if (items.length === 0) return;
    const index = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      items[(index + 1) % items.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      items[(index - 1 + items.length) % items.length]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      items[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      items[items.length - 1]?.focus();
    } else if (e.key === "Tab") {
      close();
    }
  }

  if (!user) return null;

  const name = displayName(user.name, user.email);
  const isAdmin = user.isAdmin === true;
  const isMobile = variant === "mobile";
  const isHeaderMobile = variant === "header-mobile";
  const isDrawer = isDrawerVariant(variant);
  const avatarBox = isDrawer ? "h-10 w-10 text-sm" : "h-8 w-8 text-xs";
  const avatarPx = isDrawer ? 40 : 32;

  const itemClass =
    "flex min-h-11 w-full items-center gap-3 px-4 text-left text-base font-medium text-text transition hover:bg-surface-soft hover:text-heading focus-visible:bg-surface-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring";

  function onItemNavigate() {
    close();
    onNavigate?.();
  }

  /**
   * The account page reads its tab from the URL hash on mount and on
   * hashchange. When already on /account, switch the tab via the hash
   * instead of a soft navigation that would not re-read it.
   */
  function accountTab(section: "overview" | "settings") {
    return (e: ReactMouseEvent<HTMLAnchorElement>) => {
      if (pathname === "/account") {
        e.preventDefault();
        window.location.hash = section;
      }
      onItemNavigate();
    };
  }

  const largeAvatar = user.image ? (
    <Image
      src={user.image}
      alt=""
      width={60}
      height={60}
      className="h-15 w-15 shrink-0 rounded-full border border-border object-cover"
    />
  ) : (
    <span
      className="inline-flex h-15 w-15 shrink-0 items-center justify-center rounded-full border border-border bg-surface font-display text-xl font-bold text-heading"
      aria-hidden="true"
    >
      {initials(user.name, user.email)}
    </span>
  );

  const avatar = user.image ? (
    <Image
      src={user.image}
      alt=""
      width={avatarPx}
      height={avatarPx}
      className={`${avatarBox} shrink-0 rounded-full border border-border object-cover`}
    />
  ) : (
    <span
      className={`inline-flex ${avatarBox} shrink-0 items-center justify-center rounded-full border border-border bg-surface-soft font-semibold text-heading`}
      aria-hidden="true"
    >
      {initials(user.name, user.email)}
    </span>
  );

  const triggerClass = isDrawer
    ? "flex min-h-11 w-full items-center gap-3 rounded-xl border border-border bg-white px-3 py-2.5 text-left transition hover:bg-surface-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    : isHeaderMobile || isMobile
      ? isHeaderMobile
        ? "inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border-strong text-heading transition hover:bg-surface-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        : "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      : "inline-flex min-h-9 max-w-[12rem] items-center gap-2 rounded-full py-0.5 pl-0.5 pr-2 transition hover:bg-surface-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:max-w-[13rem]";

  const menuClass = isDrawer
    ? "absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-[var(--radius-card)] border border-border bg-white py-1 shadow-[var(--glass-shadow)]"
    : isMobile
      ? "absolute left-0 bottom-full z-50 mb-2 w-60 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-[var(--radius-card)] border border-border bg-white py-1 shadow-[var(--glass-shadow)]"
      : "absolute right-0 top-full z-50 mt-2 w-60 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-[var(--radius-card)] border border-border bg-white py-1 shadow-[var(--glass-shadow)]";

  return (
    <div
      className={`relative ${isMobile ? "flex justify-start" : ""} ${isDrawer ? "w-full" : ""}`}
      ref={wrapRef}
    >
      <button
        ref={buttonRef}
        type="button"
        className={triggerClass}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        {isDrawer ? (
          <>
            {avatar}
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-semibold uppercase tracking-wide text-accent">
                Account
              </span>
              <span className="block truncate font-sans text-base font-semibold tracking-tight text-heading">
                {name}
              </span>
              {user.email ? (
                <span className="mt-0.5 block truncate text-xs text-muted">
                  {user.email}
                </span>
              ) : null}
            </span>
            <ChevronRight
              className={`h-4 w-4 shrink-0 text-muted transition ${open ? "rotate-90" : ""}`}
              strokeWidth={2}
              aria-hidden="true"
            />
            <span className="sr-only">
              {open ? "Close account menu" : "Open account menu"}
            </span>
          </>
        ) : (
          <>
            <span className="sr-only">
              {open ? "Close account menu" : "Open account menu"}
            </span>
            {avatar}
            {variant === "header" ? (
              <>
                <span className="min-w-0 truncate font-sans text-sm font-semibold tracking-tight text-heading">
                  {name}
                </span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-muted transition ${open ? "rotate-180" : ""}`}
                  strokeWidth={2}
                  aria-hidden="true"
                />
              </>
            ) : null}
          </>
        )}
      </button>

      {open ? (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label="Account"
          className={menuClass}
          onKeyDown={onMenuKeyDown}
        >
          <div className="flex flex-col items-center gap-1 px-4 pt-3 pb-1 text-center">
            {largeAvatar}
            <p className="mt-1 w-full truncate text-sm font-semibold text-heading">{name}</p>
            {user.email && user.email !== name ? (
              <p className="w-full truncate text-sm text-muted">{user.email}</p>
            ) : null}
            <Link
              href={EDIT_PROFILE_HREF}
              role="menuitem"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-[var(--radius-control)] px-2 text-sm font-semibold text-accent transition hover:text-accent-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={accountTab("settings")}
            >
              <Pencil className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden="true" />
              Edit profile
            </Link>
          </div>

          <div className="my-1 border-t border-border" role="separator" />

          <Link
            href="/account"
            role="menuitem"
            className={itemClass}
            onClick={accountTab("overview")}
          >
            <LayoutDashboard
              className="h-5 w-5 shrink-0 text-muted"
              strokeWidth={2}
              aria-hidden="true"
            />
            My Journey
          </Link>

          <MemberPerksItem className={itemClass} onNavigate={onItemNavigate} />

          {isAdmin ? (
            <Link
              href="/cms"
              role="menuitem"
              className={itemClass}
              onClick={onItemNavigate}
            >
              <Shield
                className="h-5 w-5 shrink-0 text-muted"
                strokeWidth={2}
                aria-hidden="true"
              />
              Admin console
            </Link>
          ) : null}

          <div className="my-1 border-t border-border" role="separator" />

          <button
            type="button"
            role="menuitem"
            className={`${itemClass} !text-link disabled:opacity-60`}
            disabled={pending}
            onClick={async () => {
              setPending(true);
              try {
                await signOut({ callbackUrl: "/" });
              } finally {
                setPending(false);
                close();
                onNavigate?.();
              }
            }}
          >
            <LogOut
              className="h-5 w-5 shrink-0"
              strokeWidth={2}
              aria-hidden="true"
            />
            {pending ? "Signing out…" : "Sign out"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
