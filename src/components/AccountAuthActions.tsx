"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { useState } from "react";

type Props = {
  mode: "sign-in" | "sign-out";
  /** When false and mode is sign-in, show unavailable message. */
  googleConfigured?: boolean;
  className?: string;
};

/**
 * Account-page auth actions: link to /login or sign out.
 */
export function AccountAuthActions({
  mode,
  googleConfigured = true,
  className,
}: Props) {
  const [pending, setPending] = useState(false);

  if (mode === "sign-in" && !googleConfigured) {
    return (
      <p className="text-sm text-muted">
        Sign-in isn’t available right now. You can still read stories and plan
        a trip in this browser.
      </p>
    );
  }

  if (mode === "sign-in") {
    return (
      <Link
        href="/login?callbackUrl=%2Faccount"
        className={`btn btn-primary ${className ?? ""}`}
      >
        Sign in
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={`inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-white px-4 py-2 text-sm font-semibold tracking-tight text-heading transition hover:bg-surface-soft disabled:opacity-60 ${className ?? ""}`}
      disabled={pending}
      onClick={async () => {
        setPending(true);
        try {
          await signOut({ callbackUrl: "/" });
        } finally {
          setPending(false);
        }
      }}
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
