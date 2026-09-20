"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { useState } from "react";

type Props = {
  mode: "sign-in" | "sign-out";
  /** When false and mode is sign-in, show unavailable message. */
  googleConfigured?: boolean;
};

/**
 * Account-page auth actions: link to /login or sign out.
 */
export function AccountAuthActions({
  mode,
  googleConfigured = true,
}: Props) {
  const [pending, setPending] = useState(false);

  if (mode === "sign-in" && !googleConfigured) {
    return (
      <p className="text-sm text-muted">
        Sign-in is not configured on this deployment.
      </p>
    );
  }

  if (mode === "sign-in") {
    return (
      <Link
        href="/login?callbackUrl=%2Faccount"
        className="btn btn-primary"
      >
        Sign in
      </Link>
    );
  }

  return (
    <button
      type="button"
      className="inline-flex items-center justify-center rounded-lg border border-border bg-white px-4 py-2 text-sm font-semibold tracking-tight text-heading transition hover:bg-surface-soft disabled:opacity-60"
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
