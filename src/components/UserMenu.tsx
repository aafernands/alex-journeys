"use client";

import Image from "next/image";
import Link from "next/link";
import { LayoutDashboard, LogOut, Shield } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useCallback, useEffect, useId, useRef, useState } from "react";

type Props = {
  /** Desktop: photo + name. Mobile: photo only. */
  variant?: "header" | "mobile";
  onNavigate?: () => void;
};

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

  const itemClass =
    "flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm font-medium text-text transition hover:bg-surface-soft hover:text-heading";

  function onItemNavigate() {
    close();
    onNavigate?.();
  }

  return (
    <div
      className={`relative ${isMobile ? "flex justify-start" : ""}`}
      ref={wrapRef}
    >
      <button
        ref={buttonRef}
        type="button"
        className={
          isMobile
            ? "inline-flex items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            : "inline-flex max-w-[11rem] items-center gap-2 rounded-full py-0.5 pl-0.5 pr-2.5 transition hover:bg-surface-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:max-w-[13rem]"
        }
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="sr-only">
          {open ? "Close account menu" : "Open account menu"}
        </span>
        {user.image ? (
          <Image
            src={user.image}
            alt=""
            width={36}
            height={36}
            className="h-9 w-9 shrink-0 rounded-full border border-border object-cover"
          />
        ) : (
          <span
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface-soft text-xs font-semibold text-heading"
            aria-hidden="true"
          >
            {initials(user.name, user.email)}
          </span>
        )}
        {!isMobile ? (
          <span className="min-w-0 truncate font-sans text-sm font-semibold tracking-tight text-heading">
            {name}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Account"
          className={
            isMobile
              ? "absolute left-0 bottom-full z-50 mb-2 min-w-[14rem] rounded-xl border border-border bg-white py-1.5 shadow-lg"
              : "absolute right-0 top-full z-50 mt-2 min-w-[14rem] rounded-xl border border-border bg-white py-1.5 shadow-lg"
          }
        >
          <div className="border-b border-border px-3.5 py-2.5">
            <p className="truncate text-sm font-semibold text-heading">{name}</p>
            {user.email ? (
              <p className="mt-0.5 truncate text-xs text-muted">{user.email}</p>
            ) : null}
          </div>

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
