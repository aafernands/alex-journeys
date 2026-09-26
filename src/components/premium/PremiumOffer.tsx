"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useReaderLoginPrompt } from "@/components/ReaderLoginPrompt";
import { usePremium } from "@/components/premium/usePremium";
import type { PremiumPlan } from "@/lib/membership";

const INTENT_KEY = "aj-premium-checkout";
let checkoutResumeStarted = false;

type Props = {
  monthlyLabel: string;
  yearlyLabel: string;
  yearlyPerMonthLabel: string;
  savingsLabel: string;
  savingsPercent: number;
  trialDays: number;
  checkoutConfigured: boolean;
};

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
    // Private mode can block storage. Sign-in still returns to /premium.
  }
}

export function PremiumOffer({
  monthlyLabel,
  yearlyLabel,
  yearlyPerMonthLabel,
  savingsLabel,
  savingsPercent,
  trialDays,
  checkoutConfigured,
}: Props) {
  const { status } = useSession();
  const { isPremium, loading } = usePremium();
  const openSignIn = useReaderLoginPrompt();
  const [plan, setPlan] = useState<PremiumPlan>("yearly");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startCheckoutRef = useRef<(plan: PremiumPlan) => Promise<void>>(async () => {});

  const signedIn = status === "authenticated";
  const priceLabel = plan === "yearly" ? yearlyLabel : monthlyLabel;
  const cadence = plan === "yearly" ? "per year" : "per month";

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

  async function startCheckout(next: PremiumPlan) {
    if (!checkoutConfigured || pending) return;
    if (isPremium) {
      await openPortal();
      return;
    }
    if (status !== "authenticated") {
      writeIntent(next);
      openSignIn({
        returnTo: "/premium",
        intro: "Sign in to become a member. Checkout opens right after.",
        onAuthenticated: () => {
          writeIntent(null);
          void startCheckout(next);
        },
      });
      return;
    }
    setError(null);
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
        await openPortal();
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
  }

  startCheckoutRef.current = startCheckout;

  useEffect(() => {
    if (!signedIn || loading || checkoutResumeStarted) return;
    const intent = readIntent();
    if (!intent) return;
    checkoutResumeStarted = true;
    writeIntent(null);
    if (!isPremium) void startCheckoutRef.current(intent);
  }, [signedIn, loading, isPremium]);

  const buttonLabel = !checkoutConfigured
    ? "Coming soon"
    : isPremium
      ? pending
        ? "Opening…"
        : "Manage membership"
      : pending
        ? "Opening checkout…"
        : trialDays > 0
          ? `Start ${trialDays}-day free trial`
          : "Become a member";

  function checkoutButton() {
    return (
      <button
        type="button"
        className="btn btn-primary w-full disabled:opacity-60"
        disabled={!checkoutConfigured || pending || (signedIn && loading)}
        onClick={() => void startCheckout(plan)}
      >
        {buttonLabel}
      </button>
    );
  }

  return (
    <>
      <section id="plans" className="scroll-mt-28" aria-labelledby="premium-plan-title">
        <div className="panel mx-auto max-w-md p-6 sm:p-8">
          <div className="flex justify-center">
            <div
              className="inline-flex rounded-full border border-border bg-surface-soft p-1"
              role="group"
              aria-label="Billing period"
            >
              <button
                type="button"
                className={`min-h-11 rounded-full px-4 text-sm font-semibold ${
                  plan === "monthly" ? "bg-ink text-on-solid" : "text-muted"
                }`}
                aria-pressed={plan === "monthly"}
                onClick={() => setPlan("monthly")}
              >
                Monthly
              </button>
              <button
                type="button"
                className={`min-h-11 rounded-full px-4 text-sm font-semibold ${
                  plan === "yearly" ? "bg-ink text-on-solid" : "text-muted"
                }`}
                aria-pressed={plan === "yearly"}
                onClick={() => setPlan("yearly")}
              >
                Yearly
                {savingsPercent > 0 ? (
                  <span className={plan === "yearly" ? "ml-2 text-on-solid/80" : "ml-2 text-accent"}>
                    Save {savingsPercent}%
                  </span>
                ) : null}
              </button>
            </div>
          </div>

          <h2 id="premium-plan-title" className="sr-only">
            Premium plan
          </h2>
          <p className="mt-6 text-center font-display text-4xl font-bold text-heading">
            {priceLabel}
            <span className="ml-2 font-sans text-base font-medium text-muted">{cadence}</span>
          </p>
          {plan === "yearly" && savingsPercent > 0 ? (
            <p className="mt-2 text-center text-sm text-muted">
              {yearlyPerMonthLabel} a month, {savingsLabel} less than paying monthly.
            </p>
          ) : (
            <p className="mt-2 text-center text-sm text-muted">
              {yearlyLabel} a year
              {savingsPercent > 0 ? `, ${savingsLabel} less than paying monthly` : ""}.
            </p>
          )}
          {trialDays > 0 ? (
            <p className="mt-3 text-center text-sm font-semibold text-heading">
              {trialDays} days free, then {priceLabel} {cadence}.
            </p>
          ) : null}

          <div className="mt-6 hidden md:block">{checkoutButton()}</div>
          <p className="mt-4 text-center text-sm text-muted">Cancel anytime.</p>
          {error ? (
            <p className="mt-3 text-center text-sm text-heading" role="alert">
              {error}
            </p>
          ) : null}
          {isPremium ? (
            <p className="mt-3 text-center text-sm text-text">
              You’re a member.{" "}
              <Link href="/account?section=settings" className="font-semibold text-accent">
                View it on your account
              </Link>
              .
            </p>
          ) : null}
        </div>
      </section>

      <div
        className="glass glass-strip fixed inset-x-0 bottom-0 z-40 p-3 md:hidden"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <p className="mb-2 text-center text-xs font-semibold text-heading">
          {priceLabel} {cadence}
          {plan === "yearly" && savingsPercent > 0 ? ` · save ${savingsPercent}%` : ""}
        </p>
        {checkoutButton()}
      </div>
    </>
  );
}
