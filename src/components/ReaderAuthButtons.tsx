"use client";

import { Bookmark } from "lucide-react";
import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";
import { useState } from "react";

type Props = {
  /** Compact styling for the sticky header. */
  variant?: "header" | "mobile";
  onNavigate?: () => void;
  /** When false, hide the control (Google OAuth not configured). */
  googleConfigured?: boolean;
};

/**
 * Public reader auth: Sign in with Google / Sign out + link to /saved.
 * Does not expose CMS; admins still use /cms.
 */
export function ReaderAuthButtons({
  variant = "header",
  onNavigate,
  googleConfigured = true,
}: Props) {
  const { data: session, status } = useSession();
  const [pending, setPending] = useState(false);

  if (!googleConfigured) {
    return null;
  }

  const signedIn = status === "authenticated" && Boolean(session?.user);
  const loading = status === "loading";

  const linkClass =
    variant === "mobile"
      ? "flex items-center gap-2.5 py-2.5 text-base font-semibold tracking-tight text-heading hover:text-accent"
      : "inline-flex items-center gap-1.5 font-sans text-sm font-semibold tracking-tight text-text transition hover:text-heading";

  const buttonClass =
    variant === "mobile"
      ? "flex w-full items-center gap-2.5 py-2.5 text-left text-base font-semibold tracking-tight text-heading hover:text-accent disabled:opacity-60"
      : "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-sans text-sm font-semibold tracking-tight text-text transition hover:bg-surface-soft hover:text-heading disabled:opacity-60";

  if (loading) {
    return (
      <span
        className={
          variant === "mobile"
            ? "py-2.5 text-sm text-muted"
            : "px-2 text-sm text-muted"
        }
        aria-hidden="true"
      >
        …
      </span>
    );
  }

  if (signedIn) {
    return (
      <div
        className={
          variant === "mobile"
            ? "flex flex-col gap-0"
            : "flex items-center gap-1"
        }
      >
        <Link href="/saved" className={linkClass} onClick={onNavigate}>
          <Bookmark
            className={
              variant === "mobile"
                ? "h-[18px] w-[18px] text-accent"
                : "h-4 w-4"
            }
            strokeWidth={2}
            aria-hidden="true"
          />
          Saved
        </Link>
        <button
          type="button"
          className={buttonClass}
          disabled={pending}
          onClick={async () => {
            setPending(true);
            try {
              await signOut({ callbackUrl: "/" });
            } finally {
              setPending(false);
              onNavigate?.();
            }
          }}
        >
          {pending ? "Signing out…" : "Sign out"}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      className={buttonClass}
      disabled={pending}
      onClick={async () => {
        setPending(true);
        try {
          await signIn("google", { callbackUrl: window.location.href });
        } finally {
          setPending(false);
        }
      }}
    >
      {pending ? "Signing in…" : "Sign in"}
    </button>
  );
}
