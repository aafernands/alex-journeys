"use client";

import Link from "next/link";
import { useState } from "react";

export type MembershipPanel = {
  isMember: boolean;
  planLabel: string | null;
  statusLabel: string;
  detail: string | null;
  portalAvailable: boolean;
  checkoutConfigured: boolean;
  welcome: boolean;
  unavailable: boolean;
};

export function MembershipSettings({ panel }: { panel: MembershipPanel }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openPortal() {
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/premium/portal", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error || "The membership page isn’t available right now.");
        setPending(false);
        return;
      }
      window.location.assign(data.url);
    } catch {
      setError("The membership page isn’t available right now.");
      setPending(false);
    }
  }

  return (
    <section className="panel p-4" aria-labelledby="settings-membership" id="membership">
      <h2 id="settings-membership" className="font-display text-ds-title font-bold text-heading">
        Membership
      </h2>
      {panel.welcome && panel.isMember ? (
        <p className="mt-2 text-sm text-text">You’re in. Premium is on this account.</p>
      ) : null}
      {panel.welcome && !panel.isMember ? (
        <p className="mt-2 text-sm text-text">
          Checkout finished. Membership shows here as soon as it’s confirmed.
        </p>
      ) : null}
      {panel.unavailable ? (
        <p className="mt-3 text-sm leading-relaxed text-text">
          Membership details aren’t available right now. You can still read the plan.
        </p>
      ) : panel.isMember ? (
        <>
          <p className="mt-2 text-sm font-semibold text-heading">
            {panel.planLabel ?? "Premium"}
            <span className="font-normal text-muted"> · {panel.statusLabel}</span>
          </p>
          {panel.detail ? (
            <p className="mt-1 text-sm text-text">{panel.detail}</p>
          ) : null}
        </>
      ) : (
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-text">
          Premium opens member stories, guides you can keep, and the fuller trip
          planner. Hotels and flights stay bookable either way.
        </p>
      )}

      <div className="mt-4">
        {panel.isMember && panel.portalAvailable ? (
          <button
            type="button"
            className="btn btn-primary w-full sm:w-auto disabled:opacity-60"
            disabled={pending}
            onClick={() => void openPortal()}
          >
            {pending ? "Opening…" : "Manage membership"}
          </button>
        ) : panel.isMember ? (
          <p className="text-sm text-muted">
            Premium is on this account. Managing it from here isn’t available yet.
          </p>
        ) : panel.checkoutConfigured ? (
          <Link href="/premium" className="btn btn-primary w-full sm:w-auto">
            Become a member
          </Link>
        ) : (
          <Link href="/premium" className="btn btn-secondary w-full sm:w-auto">
            Coming soon
          </Link>
        )}
      </div>
      {error ? (
        <p className="mt-3 text-sm text-heading" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
