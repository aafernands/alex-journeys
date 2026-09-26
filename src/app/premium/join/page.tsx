import type { Metadata } from "next";
import { Suspense } from "react";
import { PremiumJoinFlow } from "@/components/premium/join/PremiumJoinFlow";
import { isFirebaseConfigured } from "@/lib/firebase-admin";
import {
  formatUsd,
  isPremiumCheckoutConfigured,
  premiumPrices,
  premiumTrialDays,
} from "@/lib/membership";
import { parsePremiumPlan, premiumPublishableKey } from "@/lib/premium-join";
import { premiumChargeAmounts } from "@/lib/stripe-premium";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Join Premium",
  description: "Become an Alex Journeys Premium member.",
  alternates: { canonical: "/premium" },
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PremiumJoinPage({ searchParams }: PageProps) {
  const raw = await searchParams;
  const planParam = Array.isArray(raw.plan) ? raw.plan[0] : raw.plan;
  const plan = parsePremiumPlan(planParam);

  const display = premiumPrices();
  const checkoutConfigured = isPremiumCheckoutConfigured() && isFirebaseConfigured();
  const charge = checkoutConfigured
    ? await premiumChargeAmounts({
        monthlyCents: display.monthlyCents,
        yearlyCents: display.yearlyCents,
      })
    : { monthlyCents: display.monthlyCents, yearlyCents: display.yearlyCents, currency: "usd" };

  // Read at request time and passed down, so adding the key in Vercel needs
  // no client rebuild beyond the normal redeploy.
  const publishableKey = checkoutConfigured ? premiumPublishableKey() : null;

  return (
    <main className="premium-join bg-bg">
      <Suspense fallback={null}>
        <PremiumJoinFlow
          initialPlan={plan}
          prices={{
            monthlyCents: charge.monthlyCents,
            yearlyCents: charge.yearlyCents,
            monthlyLabel: formatUsd(charge.monthlyCents),
            yearlyLabel: formatUsd(charge.yearlyCents),
            currency: charge.currency,
          }}
          trialDays={premiumTrialDays()}
          checkoutConfigured={checkoutConfigured}
          publishableKey={publishableKey}
        />
      </Suspense>
    </main>
  );
}
