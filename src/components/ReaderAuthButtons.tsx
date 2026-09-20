"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { useState } from "react";

type Props = {
  /** Compact styling for the sticky header. */
  variant?: "header" | "mobile";
  onNavigate?: () => void;
  /** When false, hide the control (Google OAuth not configured). */
  googleConfigured?: boolean;
  /** Override sign-in return URL (default: current page). */
  callbackUrl?: string;
};

/**
 * Public reader auth: Sign in with Google / Sign out.
 * Does not expose CMS; admins still use /cms.
 * Profile / saves live under /account (nav link).
 */
export function ReaderAuthButtons({
  variant = "header",
  onNavigate,
  googleConfigured = true,
  callbackUrl,
}: Props) {
  const { data: session, status } = useSession();
  const [pending, setPending] = useState(false);

  if (!googleConfigured) {
    return null;
  }

  const signedIn = status === "authenticated" && Boolean(session?.user);
  const loading = status === "loading";

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
          await signIn("google", {
            callbackUrl: callbackUrl ?? window.location.href,
          });
        } finally {
          setPending(false);
        }
      }}
    >
      {pending ? "Signing in…" : "Sign in"}
    </button>
  );
}
