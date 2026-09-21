"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronRight, LayoutDashboard, LogOut, Shield } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useCallback, useEffect, useId, useRef, useState } from "react";

type Variant = "header" | "header-mobile" | "mobile" | "drawer" | "drawer-cta";

type Props = {
  /**
   * Desktop header: photo + name. Sticky mobile header: photo only.
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

function initials(name?: string | null, email?: string | null): string {
  const source = name?.trim() || email?.trim() || "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

/**
 * Logged-in avatar menu: Account dashboard, Admin console (admins only), Logout.
 */
export function UserMenu({ variant = "header", onNavigate }: Props) {
  const { data: session } = useSession();
  const user = session?.user;
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
        buttonRef.current?.focus();
      }
    };
    const onPointer = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        close();
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open, close]);

  if (!user) return null;

  const name = displayName(user.name, user.email);
  const isAdmin = user.isAdmin === true;
  const isMobile = variant === "mobile";
  const isHeaderMobile = variant === "header-mobile";
  const isDrawer = isDrawerVariant(variant);
  const avatarBox = isDrawer
    ? "h-10 w-10 text-sm"
    : isHeaderMobile
      ? "h-11 w-11 text-sm"
      : "h-9 w-9 text-xs";
  const avatarPx = isDrawer ? 40 : isHeaderMobile ? 44 : 36;

  const itemClass =
    "flex min-h-11 w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-medium text-text transition hover:bg-surface-soft hover:text-heading";

  function onItemNavigate() {
    close();
    onNavigate?.();
  }

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
      ? "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      : "inline-flex max-w-[11rem] items-center gap-2 rounded-full py-0.5 pl-0.5 pr-2.5 transition hover:bg-surface-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:max-w-[13rem]";

  const menuClass = isDrawer
    ? "absolute left-0 right-0 top-full z-50 mt-1.5 rounded-xl border border-border bg-white py-1.5 shadow-lg"
    : isMobile
      ? "absolute left-0 bottom-full z-50 mb-2 min-w-[14rem] rounded-xl border border-border bg-white py-1.5 shadow-lg"
      : "absolute right-0 top-full z-50 mt-2 min-w-[14rem] rounded-xl border border-border bg-white py-1.5 shadow-lg";

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
              <span className="min-w-0 truncate font-sans text-sm font-semibold tracking-tight text-heading">
                {name}
              </span>
            ) : null}
          </>
        )}
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Account"
          className={menuClass}
        >
          {!isDrawer ? (
            <div className="border-b border-border px-3.5 py-2.5">
              <p className="truncate text-sm font-semibold text-heading">{name}</p>
              {user.email ? (
                <p className="mt-0.5 truncate text-xs text-muted">{user.email}</p>
              ) : null}
            </div>
          ) : null}

          <Link
            href="/account"
            role="menuitem"
            className={itemClass}
            onClick={onItemNavigate}
          >
            <LayoutDashboard
              className="h-4 w-4 shrink-0 text-accent"
              strokeWidth={2}
              aria-hidden="true"
            />
            Account dashboard
          </Link>

          {isAdmin ? (
            <Link
              href="/cms"
              role="menuitem"
              className={itemClass}
              onClick={onItemNavigate}
            >
              <Shield
                className="h-4 w-4 shrink-0 text-accent"
                strokeWidth={2}
                aria-hidden="true"
              />
              Admin console
            </Link>
          ) : null}

          <div className="my-1 border-t border-border" />

          <button
            type="button"
            role="menuitem"
            className={`${itemClass} disabled:opacity-60`}
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
              className="h-4 w-4 shrink-0 text-muted"
              strokeWidth={2}
              aria-hidden="true"
            />
            {pending ? "Signing out…" : "Logout"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
