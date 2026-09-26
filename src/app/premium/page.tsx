import type { Metadata } from "next";
import Link from "next/link";
import { PremiumOffer } from "@/components/premium/PremiumOffer";
import {
  PREMIUM_EXAMPLE_PATH,
  PREMIUM_PERKS,
  isPremiumCheckoutConfigured,
  premiumPrices,
  premiumTrialDays,
} from "@/lib/membership";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Premium",
  description:
    "Member stories, a fuller trip planner, guides you can keep, and a weekly deal note from Newark, JFK, and Philadelphia.",
  alternates: { canonical: "/premium" },
};

const FOR_WHOM = [
  "You plan more than one trip and want the itinerary to grow with you.",
  "You want the longer stories, and guides you can take offline.",
  "You leave from Newark, JFK, or Philadelphia and want a weekly deal note.",
  "You edit photos and want Alex’s Lightroom presets.",
];

export default function PremiumPage() {
  const prices = premiumPrices();
  const trialDays = premiumTrialDays();
  const checkoutConfigured = isPremiumCheckoutConfigured();
  const faqs = [
    {
      q: "Can I cancel?",
      a: "Yes. Cancel anytime from your account. You keep Premium through the end of the time you’ve already paid for.",
    },
    {
      q: "Do I need Premium to book a hotel or a flight?",
      a: "Hotels and flights stay bookable for every reader. Premium doesn’t sit in front of checkout.",
    },
    {
      q: "When do member hotel rates start?",
      a: "They’re marked coming soon. Regular hotel search and booking work today.",
    },
    ...(trialDays > 0
      ? [
          {
            q: "How does the free trial work?",
            a: `You won’t be charged for ${trialDays} days. Cancel before then and the plan doesn’t bill you.`,
          },
        ]
      : []),
    {
      q: "Can I switch between monthly and yearly?",
      a: "Yes. Manage membership opens the page where you change the plan or cancel.",
    },
    {
      q: "Which airports are in the weekly deal note?",
      a: "Newark, JFK, and Philadelphia. That’s the note. It isn’t a feed for every airport.",
    },
  ];

  return (
    <main className="bg-bg pb-36 md:pb-0">
      <header className="border-b border-border bg-white">
        <div className="section-shell py-10 md:py-16">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">Premium</p>
            <h1 className="font-display text-display mt-3 text-heading">
              The journal, with the doors open.
            </h1>
            <p className="mt-4 text-base leading-relaxed text-text md:text-lg">
              Member stories, a trip planner that can grow with you, guides you
              can keep, and a weekly note on deals out of Newark, JFK, and
              Philadelphia.
            </p>
            <p className="mt-6">
              <a href="#plans" className="text-sm font-semibold text-accent">
                See the plan
              </a>
            </p>
          </div>
        </div>
      </header>

      <div className="section-shell section-band">
        <PremiumOffer
          monthlyLabel={prices.monthlyLabel}
          yearlyLabel={prices.yearlyLabel}
          yearlyPerMonthLabel={prices.yearlyPerMonthLabel}
          savingsLabel={prices.savingsLabel}
          savingsPercent={prices.savingsPercent}
          trialDays={trialDays}
          checkoutConfigured={checkoutConfigured}
        />
        {!checkoutConfigured ? (
          <p className="mx-auto mt-4 max-w-md text-center text-sm text-muted">
            Joining isn’t open yet. The plan above is what it will cost when it is.
          </p>
        ) : null}
      </div>

      <section className="border-t border-border" aria-labelledby="premium-benefits">
        <div className="section-shell section-band">
          <div className="mx-auto max-w-2xl">
            <h2 id="premium-benefits" className="font-display text-2xl font-bold text-heading md:text-3xl">
              What members get
            </h2>
            <ul className="mt-6 divide-y divide-border border-y border-border">
              {PREMIUM_PERKS.map((perk) => (
                <li key={perk.id} className="py-4">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h3 className="font-display text-lg font-bold text-heading">{perk.title}</h3>
                    {perk.comingSoon ? (
                      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                        Coming soon
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-text">{perk.detail}</p>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-muted">
              <Link href={PREMIUM_EXAMPLE_PATH} className="font-semibold text-accent">
                Read a members-only story
              </Link>
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-white" aria-labelledby="premium-for">
        <div className="section-shell section-band">
          <div className="mx-auto max-w-2xl">
            <h2 id="premium-for" className="font-display text-2xl font-bold text-heading md:text-3xl">
              Who it’s for
            </h2>
            <ul className="mt-6 space-y-3">
              {FOR_WHOM.map((line) => (
                <li key={line} className="flex gap-3 text-sm leading-relaxed text-text md:text-base">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="border-t border-border" aria-labelledby="premium-faq">
        <div className="section-shell section-band">
          <div className="mx-auto max-w-2xl">
            <h2 id="premium-faq" className="font-display text-2xl font-bold text-heading md:text-3xl">
              Questions
            </h2>
            <div className="mt-4">
              {faqs.map((item) => (
                <details key={item.q} className="group border-b border-border py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-heading [&::-webkit-details-marker]:hidden">
                    {item.q}
                    <span className="text-xl leading-none text-muted transition group-open:rotate-45" aria-hidden="true">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 max-w-xl text-sm leading-relaxed text-text">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-white" aria-labelledby="premium-cancel">
        <div className="section-shell section-band">
          <div className="mx-auto max-w-2xl text-center">
            <h2 id="premium-cancel" className="font-display text-2xl font-bold text-heading md:text-3xl">
              Cancel anytime
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-text md:text-base">
              Start when you’re ready. Stop from your account whenever you want.
              No long lock-in, and booking a hotel or a flight never requires Premium.
            </p>
            <p className="mt-6">
              <a href="#plans" className="text-sm font-semibold text-accent">
                Back to the plan
              </a>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
