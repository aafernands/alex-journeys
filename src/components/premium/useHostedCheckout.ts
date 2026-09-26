"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useReaderLoginPrompt } from "@/components/ReaderLoginPrompt";
import type { PremiumPlan } from "@/lib/membership";

const INTENT_KEY = "aj-premium-checkout";
let checkoutResumeStarted = false;

function readIntent(): PremiumPlan | null {
  try {
    const raw = sessionStorage.getItem(INTENT_KEY);
    if (raw === "monthly" || raw === "yearly") return raw;
  } catch {
    return null;
  }
  return null;
}

function writeIntent(plan: PremiumPlan | null) {
  try {
    if (!plan) sessionStorage.removeItem(INTENT_KEY);
    else sessionStorage.setItem(INTENT_KEY, plan);
  } catch {
    // Private mode can block storage. Sign-in still returns to the page.
  }
}

/** Open Stripe's billing portal for a member. */
export async function openPremiumPortal(): Promise<string | null> {
  try {
    const res = await fetch("/api/premium/portal", { method: "POST" });
    const data = (await res.json()) as { url?: string; error?: string };
    if (!res.ok || !data.url) return data.error || "The membership page isn’t available right now.";
    window.location.assign(data.url);
    return null;
  } catch {
    return "The membership page isn’t available right now.";
  }
}

/**
 * Hosted Stripe Checkout (phase 1). Used when the on-site checkout has no
 * Premium publishable key, so joining never breaks. Needs a signed-in reader.
 */
export function useHostedCheckout(options: {
  enabled: boolean;
  isPremium: boolean;
  premiumLoading: boolean;
  returnTo: string;
}) {
  const { status } = useSession();
  const openSignIn = useReaderLoginPrompt();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startRef = useRef<(plan: PremiumPlan) => Promise<void>>(async () => {});

  const start = useCallback(
    async (next: PremiumPlan) => {
      if (!options.enabled || pending) return;
      setError(null);
      if (options.isPremium) {
        setPending(true);
        const failed = await openPremiumPortal();
        if (failed) {
          setError(failed);
          setPending(false);
        }
        return;
      }
      if (status !== "authenticated") {
        writeIntent(next);
        openSignIn({
          returnTo: options.returnTo,
          intro: "Sign in to become a member. Checkout opens right after.",
          onAuthenticated: () => {
            writeIntent(null);
            void startRef.current(next);
          },
        });
        return;
      }
      setPending(true);
      try {
        const res = await fetch("/api/premium/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: next }),
        });
        const data = (await res.json()) as {
          url?: string;
          error?: string;
          alreadyMember?: boolean;
          comingSoon?: boolean;
        };
        if (data.alreadyMember) {
          const failed = await openPremiumPortal();
          if (failed) {
            setError(failed);
            setPending(false);
          }
          return;
        }
        if (!res.ok || !data.url) {
          setError(
            data.comingSoon
              ? "Membership is coming soon."
              : data.error || "Checkout isn’t available right now.",
          );
          setPending(false);
          return;
        }
        window.location.assign(data.url);
      } catch {
        setError("Checkout isn’t available right now.");
        setPending(false);
      }
    },
    [options.enabled, options.isPremium, options.returnTo, pending, status, openSignIn],
  );

  useEffect(() => {
    startRef.current = start;
  }, [start]);

  const signedIn = status === "authenticated";
  useEffect(() => {
    if (!options.enabled || !signedIn || options.premiumLoading || checkoutResumeStarted) return;
    const intent = readIntent();
    if (!intent) return;
    checkoutResumeStarted = true;
    writeIntent(null);
    if (!options.isPremium) void startRef.current(intent);
  }, [options.enabled, signedIn, options.premiumLoading, options.isPremium]);

  return { start, pending, error, setError };
}
