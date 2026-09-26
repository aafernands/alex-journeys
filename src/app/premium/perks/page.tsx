import type { Metadata } from "next";
import Link from "next/link";
import {
  BedDouble,
  BookOpen,
  FileDown,
  Lock,
  Map as MapIcon,
  Plane,
  type LucideIcon,
} from "lucide-react";
import { PremiumPageHeader } from "@/components/premium/PremiumPageHeader";
import { PremiumSignInButton } from "@/components/premium/PremiumSignInButton";
import { formatPostDate, getAllPosts } from "@/lib/posts";
import { readReaderAccess } from "@/lib/premium-access";
import {
  HUB_PERKS,
  JOIN_PATH,
  PERKS_HUB_PATH,
  memberStories,
  type HubPerkId,
} from "@/lib/premium-perks";
import { publicPostPath } from "@/lib/public-paths";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Member perks",
  description:
    "Everything that comes with Alex Journeys Premium: member stories, downloads, weekly deals, and the unlimited trip planner.",
  alternates: { canonical: PERKS_HUB_PATH },
};

const ICONS: Record<HubPerkId, LucideIcon> = {
  stories: BookOpen,
  downloads: FileDown,
  deals: Plane,
  "trip-planner": MapIcon,
  "hotel-rates": BedDouble,
};

export default async function PremiumPerksPage() {
  const access = await readReaderAccess();
  const member = access.member;
  const stories = memberStories(getAllPosts()).slice(0, 6);

  return (
    <main className="premium-perks bg-bg" data-member={member ? "true" : "false"}>
      <PremiumPageHeader
        id="perks-title"
        eyebrow={member ? "Your membership" : "Premium"}
        title={member ? "Your member perks" : "Member perks"}
        lead={
          member
            ? "Everything that comes with your membership, in one place."
            : "Here is what opens when you join. Stories, destinations, and booking stay free for everyone."
        }
        actions={
          member ? null : (
            <>
              <Link href={JOIN_PATH} className="btn btn-primary w-full sm:w-auto">
                Join Premium
              </Link>
              {access.signedIn ? null : (
                <PremiumSignInButton
                  returnTo={PERKS_HUB_PATH}
                  intro="Sign in to see your perks if you already joined."
                />
              )}
            </>
          )
        }
      />

      <section className="section-shell section-band" aria-label="Perks">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {HUB_PERKS.map((perk) => {
            const Icon = ICONS[perk.id];
            const locked = !member && !perk.comingSoon;
            return (
              <li key={perk.id}>
                <article
                  className={`flex h-full flex-col rounded-2xl border bg-white p-5 sm:p-6 ${
                    locked ? "border-border" : perk.comingSoon ? "border-border" : "border-accent/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${
                        perk.comingSoon
                          ? "bg-surface-soft text-muted"
                          : locked
                            ? "bg-accent/10 text-accent"
                            : "bg-accent text-on-solid"
                      }`}
                      aria-hidden="true"
                    >
                      <Icon size={22} />
                    </span>
                    {perk.comingSoon ? (
                      <span className="rounded-full bg-surface-soft px-2.5 py-1 text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-muted">
                        Coming soon
                      </span>
                    ) : locked ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1 text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-accent-deep">
                        <Lock size={12} aria-hidden="true" />
                        Members
                      </span>
                    ) : (
                      <span className="rounded-full bg-accent px-2.5 py-1 text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-on-solid">
                        Included
                      </span>
                    )}
                  </div>
                  <h2 className="card-title mt-4">{perk.title}</h2>
                  <p className="card-body mt-1 flex-1">{locked ? perk.lockedDetail : perk.detail}</p>
                  <div className="mt-5">
                    {perk.comingSoon ? null : locked ? (
                      <Link href={JOIN_PATH} className="btn btn-primary w-full sm:w-auto">
                        Join to unlock
                      </Link>
                    ) : perk.href ? (
                      <Link href={perk.href} className="btn btn-secondary w-full sm:w-auto">
                        {perk.cta}
                      </Link>
                    ) : null}
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      </section>

      <section
        id="member-stories"
        className="border-t border-border bg-surface-soft"
        aria-labelledby="member-stories-title"
      >
        <div className="section-shell section-band">
          <p className="eyebrow">Members-only stories</p>
          <h2 id="member-stories-title" className="font-display text-title mt-2 text-heading">
            {member ? "Read in full" : "Stories members read in full"}
          </h2>
          {stories.length === 0 ? (
            <p className="mt-4 text-sm text-text">The first member stories are on their way.</p>
          ) : (
            <ul className="mt-6 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-white">
              {stories.map((story) => (
                <li key={story.slug}>
                  <Link
                    href={publicPostPath(story.slug)}
                    className="flex min-h-16 items-center gap-4 px-4 py-3 transition hover:bg-surface-soft sm:px-6"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold leading-snug text-heading">{story.title}</span>
                      <span className="mt-0.5 block text-xs text-muted">{formatPostDate(story.date)}</span>
                    </span>
                    {member ? null : <Lock size={16} className="shrink-0 text-accent" aria-label="Members only" />}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
