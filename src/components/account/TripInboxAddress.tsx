"use client";

import { Check, Copy, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/Skeleton";

type Mailbox = { address: string; enabled: boolean };

/**
 * Trip inbox (forward bookings) address for the account. Loaded only when the
 * Profile section is open, because the first read creates the address.
 */
export function TripInboxAddress() {
  const [mailbox, setMailbox] = useState<Mailbox | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/trips/forward", { cache: "no-store" });
        const body = (await res.json().catch(() => ({}))) as {
          mailbox?: Mailbox;
          error?: string;
        };
        if (!alive) return;
        if (!res.ok || !body.mailbox) {
          setError(body.error || "The trip inbox isn’t available right now.");
          return;
        }
        setMailbox({ address: body.mailbox.address, enabled: body.mailbox.enabled });
      } catch {
        if (alive) setError("The trip inbox isn’t available right now.");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function copy() {
    if (!mailbox) return;
    try {
      await navigator.clipboard.writeText(mailbox.address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setError("Copy didn’t work. Select the address and copy it.");
    }
  }

  async function toggle() {
    if (!mailbox) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/trips/forward", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !mailbox.enabled }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        mailbox?: Mailbox;
        error?: string;
      };
      if (!res.ok || !body.mailbox) {
        setError(body.error || "Could not update the trip inbox.");
        return;
      }
      setMailbox({ address: body.mailbox.address, enabled: body.mailbox.enabled });
    } catch {
      setError("Could not update the trip inbox.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="ui-card p-3 sm:p-4" aria-labelledby="journey-inbox">
      <h3 id="journey-inbox" className="flex items-center gap-2 text-sm font-semibold text-heading">
        <Mail className="h-4 w-4 text-accent" strokeWidth={2} aria-hidden="true" />
        Trip inbox
      </h3>
      <p className="mt-1 text-xs text-muted">
        Forward booking confirmations to this address and they’re added to your trips.
      </p>
      {mailbox ? (
        <>
          <div className="mt-3 flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-[var(--radius-control)] border border-border bg-surface-soft px-3 py-2.5 text-xs text-heading">
              {mailbox.address}
            </code>
            <button
              type="button"
              onClick={copy}
              className="btn btn-secondary shrink-0"
              aria-label="Copy trip inbox address"
            >
              {copied ? (
                <Check className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              ) : (
                <Copy className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              )}
              <span className="text-xs">{copied ? "Copied" : "Copy"}</span>
            </button>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="text-xs text-muted" role="status">
              {mailbox.enabled ? "On. Forwarded emails are imported." : "Off. Forwarded emails are ignored."}
            </p>
            <button
              type="button"
              onClick={toggle}
              disabled={busy}
              className="btn btn-ghost shrink-0 text-xs"
            >
              {mailbox.enabled ? "Turn off" : "Turn on"}
            </button>
          </div>
        </>
      ) : error ? null : (
        <div className="mt-3" aria-hidden="true">
          <Skeleton className="block h-10 w-full" />
        </div>
      )}
      {error ? (
        <p className="mt-2 text-xs text-[var(--link)]" role="status">
          {error}
        </p>
      ) : null}
    </section>
  );
}
