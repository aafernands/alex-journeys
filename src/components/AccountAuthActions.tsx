"use client";

import { signIn, signOut } from "next-auth/react";
import { useState } from "react";

type Props = {
  mode: "sign-in" | "sign-out";
  googleConfigured?: boolean;
};

/**
 * Account-page auth actions: Google sign-in (callback /account) or sign out.
 */
export function AccountAuthActions({
  mode,
  googleConfigured = true,
}: Props) {
  const [pending, setPending] = useState(false);

  if (mode === "sign-in" && !googleConfigured) {
    return (
      <p className="text-sm text-muted">
        Google sign-in is not configured on this deployment.
      </p>
    );
  }

  const buttonClass =
    mode === "sign-in"
      ? "btn btn-primary"
      : "inline-flex items-center justify-center rounded-lg border border-border bg-white px-4 py-2 text-sm font-semibold tracking-tight text-heading transition hover:bg-surface-soft disabled:opacity-60";

  return (
    <button
      type="button"
      className={buttonClass}
      disabled={pending}
      onClick={async () => {
        setPending(true);
        try {
          if (mode === "sign-in") {
            await signIn("google", { callbackUrl: "/account" });
          } else {
            await signOut({ callbackUrl: "/" });
          }
        } finally {
          setPending(false);
        }
      }}
    >
      {mode === "sign-in"
        ? pending
          ? "Signing in…"
          : "Sign in with Google"
        : pending
          ? "Signing out…"
          : "Sign out"}
    </button>
  );
}
