"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { useSession } from "next-auth/react";
import { useReaderLoginPrompt } from "@/components/ReaderLoginPrompt";
import { usePremium } from "@/components/premium/usePremium";
import type { PremiumPerk, PremiumPlan } from "@/lib/membership";

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
  perks: PremiumPerk[];
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
  perks,
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
        <div className="premium-plan-card relative mx-auto max-w-lg rounded-2xl bg-white px-5 pb-6 pt-9 sm:px-8 sm:pb-8">
          <p className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-accent px-3.5 py-1 text-xs font-bold uppercase tracking-[0.08em] text-on-solid">
            {plan === "yearly" && savingsPercent > 0 ? "Best value" : "Premium"}
          </p>
          <h2
            id="premium-plan-title"
            className="text-center font-display text-2xl font-bold text-heading"
          >
            Alex Journeys Premium
          </h2>

          <div className="mt-5 flex justify-center">
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

          <p className="mt-6 text-center font-display text-5xl font-bold tracking-tight text-heading">
            {priceLabel}
            <span className="ml-2 font-sans text-base font-medium tracking-normal text-muted">
              {cadence}
            </span>
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

          <ul className="mt-6 space-y-3 border-t border-border pt-6">
            {perks.map((perk) => (
              <li key={perk.id} className="flex items-start gap-3 text-sm leading-snug text-text">
                <span
                  className="mt-px flex size-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent"
                  aria-hidden="true"
                >
                  <Check size={13} strokeWidth={3} />
                </span>
                <span>
                  <span className="font-semibold text-heading">{perk.title}</span>
                  {perk.comingSoon ? (
                    <span className="ml-2 inline-block rounded-full border border-border px-2 py-px align-[1px] text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-muted">
                      Coming soon
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-center text-sm text-muted">
            Cancel anytime. Booking stays open to everyone.
          </p>
        </div>
      </section>

      <div className="premium-join-bar glass fixed inset-x-3 z-40 rounded-2xl p-3 md:hidden">
        <p className="mb-2 text-center text-xs font-semibold text-heading">
          {priceLabel} {cadence}
          {plan === "yearly" && savingsPercent > 0 ? ` · save ${savingsPercent}%` : ""}
        </p>
        {checkoutButton()}
      </div>
    </>
  );
}
