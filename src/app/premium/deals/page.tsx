import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Lock } from "lucide-react";
import { PremiumGate } from "@/components/premium/PremiumGate";
import { PremiumComingSoon, PremiumPageHeader } from "@/components/premium/PremiumPageHeader";
import { formatPostDate, getAllPosts } from "@/lib/posts";
import { readReaderAccess } from "@/lib/premium-access";
import { DEALS_PATH, PERKS_HUB_PATH, dealNotes } from "@/lib/premium-perks";
import { publicPostPath } from "@/lib/public-paths";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Weekly deals",
  description: "Weekly deal notes on flights out of Newark, JFK, and Philadelphia, for Alex Journeys Premium members.",
  alternates: { canonical: DEALS_PATH },
};

export default async function PremiumDealsPage() {
  const access = await readReaderAccess();
  const member = access.member;
  const deals = dealNotes(getAllPosts());

  return (
    <main className="premium-deals bg-bg" data-member={member ? "true" : "false"}>
      <PremiumPageHeader
        id="deals-title"
        eyebrow="Members"
        title="Weekly deals"
        lead="A weekly note on deals leaving Newark, JFK, and Philadelphia. Newest first."
        back={{ href: PERKS_HUB_PATH, label: "Member perks" }}
      />

      <section className="section-shell section-band" aria-labelledby="deals-title">
        <div className="mx-auto max-w-3xl">
          {!member ? (
            <PremiumGate
              signedIn={access.signedIn}
              returnTo={DEALS_PATH}
              title="Deal notes are for members"
              body="Join Premium to read each week’s deals from Newark, JFK, and Philadelphia. Booking stays open to everyone."
              signInIntro="Sign in to read the deal notes if you already joined."
              className="mb-8"
            />
          ) : null}

          {deals.length === 0 ? (
            <PremiumComingSoon body="The first deal notes are on their way. Each week’s note will show up here." />
          ) : (
            <ol className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-white">
              {deals.map((deal) => (
                <li key={deal.slug}>
                  <Link
                    href={publicPostPath(deal.slug)}
                    className="flex min-h-16 items-start gap-4 px-4 py-4 transition hover:bg-surface-soft sm:px-6"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-semibold uppercase tracking-[0.06em] text-accent">
                        {formatPostDate(deal.date)}
                      </span>
                      <span className="mt-1 block font-display text-lg font-bold leading-snug text-heading">
                        {deal.title}
                      </span>
                      {member && deal.excerpt ? (
                        <span className="mt-1 block text-sm leading-relaxed text-text">{deal.excerpt}</span>
                      ) : null}
                    </span>
                    {member ? (
                      <ChevronRight size={18} className="mt-6 shrink-0 text-muted" aria-hidden="true" />
                    ) : (
                      <Lock size={16} className="mt-6 shrink-0 text-accent" aria-label="Members only" />
                    )}
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>
    </main>
  );
}
