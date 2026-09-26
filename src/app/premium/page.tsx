import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  BookOpen,
  Camera,
  Check,
  ChevronDown,
  CircleHelp,
  Map as MapIcon,
  Minus,
  Plane,
} from "lucide-react";
import {
  SocialInstagramIcon,
  SocialPinterestIcon,
  SocialYouTubeIcon,
} from "@/components/icons/SocialIcons";
import { OutboundLink } from "@/components/outbound/OutboundLink";
import { PremiumOffer } from "@/components/premium/PremiumOffer";
import { PremiumPerkRail, type PerkRailItem } from "@/components/premium/PremiumPerkRail";
import { site } from "@/data/content";
import { asRecord, asString } from "@/lib/cms-section-utils";
import {
  PREMIUM_EXAMPLE_PATH,
  PREMIUM_PERKS,
  formatUsd,
  isPremiumCheckoutConfigured,
  premiumPrices,
  premiumTrialDays,
} from "@/lib/membership";
import { isFirebaseConfigured } from "@/lib/firebase-admin";
import { PAGE_DEFAULTS } from "@/lib/page-defaults";
import { premiumPublishableKey } from "@/lib/premium-join";
import { getPageWithFallback } from "@/lib/pages";
import { FREE_SAVED_TRIPS } from "@/lib/trip-record";
import { PERKS_HUB_PATH } from "@/lib/premium-perks";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Premium",
  description:
    "Member stories, a fuller trip planner, guides you can keep, and a weekly deal note from Newark, JFK, and Philadelphia.",
  alternates: { canonical: "/premium" },
};

const HERO_PHOTO = "/media/img_5141-muaa0na5.jpg";
const ON_THE_ROAD_PHOTO = "/media/img_0276-muekdx8s.jpg";
const CLOSING_PHOTO = "/media/img_8846-mueke72m.jpg";

const PERK_PHOTOS: Record<string, { photo: string; position?: string }> = {
  "hotel-rates": { photo: "/media/img_8782-muekdtzn.jpg" },
  "trip-planner": { photo: "/media/img_8705-muekdqkn.jpg" },
  "pdf-guides": { photo: "/media/photo-1683_singular_display_fullpicture-mua3ya4f.jpg", position: "center 35%" },
  "deal-email": { photo: "/media/img_0680-mueke9t4.jpg", position: "center 40%" },
  "lightroom-presets": { photo: "/media/photo-1405_singular_display_fullpicture-mua3yltx.jpg" },
};

const FOR_WHOM = [
  {
    icon: MapIcon,
    title: "Trip planners",
    body: "You plan more than one trip and want the itinerary to grow with you.",
  },
  {
    icon: BookOpen,
    title: "Story readers",
    body: "You want the longer stories, and guides you can take offline.",
  },
  {
    icon: Plane,
    title: "Newark, JFK & Philly flyers",
    body: "You leave from Newark, JFK, or Philadelphia and want a weekly deal note.",
  },
  {
    icon: Camera,
    title: "Photo editors",
    body: "You edit photos and want Alex’s Lightroom presets.",
  },
];

type Row = { label: string; free: string | boolean; member: string | boolean };

function Mark({ value }: { value: string | boolean }) {
  if (value === true) {
    return (
      <span className="inline-flex size-6 items-center justify-center rounded-full bg-accent/15 text-accent">
        <Check size={14} strokeWidth={3} aria-hidden="true" />
        <span className="sr-only">Included</span>
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="inline-flex size-6 items-center justify-center text-muted-light">
        <Minus size={16} aria-hidden="true" />
        <span className="sr-only">Not included</span>
      </span>
    );
  }
  return <span className="text-xs font-semibold leading-snug text-heading">{value}</span>;
}

function SectionHeading({
  id,
  eyebrow,
  title,
  lead,
}: {
  id: string;
  eyebrow: string;
  title: string;
  lead?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="eyebrow">{eyebrow}</p>
      <h2 id={id} className="font-display text-title mt-2 text-heading">
        {title}
      </h2>
      {lead ? <p className="mt-3 text-base leading-relaxed text-text">{lead}</p> : null}
    </div>
  );
}

export default function PremiumPage() {
  const prices = premiumPrices();
  const trialDays = premiumTrialDays();
  const checkoutConfigured = isPremiumCheckoutConfigured();
  const onsiteCheckout = checkoutConfigured && isFirebaseConfigured() && Boolean(premiumPublishableKey());

  const mediaKit = getPageWithFallback("media-kit", PAGE_DEFAULTS["media-kit"]);
  const audience = asRecord(mediaKit.sections?.audience);
  const stats = (Array.isArray(audience.stats) ? audience.stats : [])
    .map((item) => {
      const o = asRecord(item);
      return { value: asString(o.value), label: asString(o.label) };
    })
    .filter((s) => s.value && s.label)
    .slice(0, 3);

  const railItems: PerkRailItem[] = PREMIUM_PERKS.map((perk) => ({
    ...perk,
    photo: PERK_PHOTOS[perk.id]?.photo ?? HERO_PHOTO,
    photoPosition: PERK_PHOTOS[perk.id]?.position,
  }));

  const rows: Row[] = [
    { label: "Stories, destinations, and guides", free: true, member: true },
    { label: "Book hotels and flights", free: true, member: true },
    {
      label: "Saved trips in the trip planner",
      free: `Up to ${FREE_SAVED_TRIPS}`,
      member: "Unlimited",
    },
    { label: "Trip PDF download", free: true, member: true },
    { label: "Share a trip link", free: false, member: true },
    { label: "Members-only stories", free: false, member: true },
    { label: "Downloadable PDF guides", free: false, member: true },
    { label: "Alex’s Lightroom presets", free: false, member: true },
    { label: "Weekly deal notes: Newark, JFK, Philadelphia", free: false, member: true },
    { label: "Deal notes by email", free: false, member: "Coming soon" },
    { label: "Member hotel rates", free: false, member: "Coming soon" },
  ];

  const monthlyYearCents = prices.monthlyCents * 12;

  const faqGroups = [
    {
      title: "About Premium",
      items: [
        {
          q: "What is Premium?",
          a: "A membership for readers who want more of the journal. The stories, destination pages, and booking stay free. Members get the extras listed above.",
        },
        {
          q: "Do I need Premium to book a hotel or a flight?",
          a: "Hotels and flights stay bookable for every reader. Premium doesn’t sit in front of checkout.",
        },
        {
          q: "How do I join?",
          a: onsiteCheckout
            ? "Pick monthly or yearly, add your email and name, and pay right here. Your membership shows on your account for that email."
            : "Pick monthly or yearly and sign in. Checkout opens right after, and your membership shows on your account.",
        },
      ],
    },
    {
      title: "Perks",
      items: [
        {
          q: "When do member hotel rates start?",
          a: "They’re marked coming soon. Regular hotel search and booking work today.",
        },
        {
          q: "Which airports are in the weekly deal note?",
          a: "Newark, JFK, and Philadelphia. That’s the note. It isn’t a feed for every airport.",
        },
        {
          q: "Where do I read the deal notes?",
          a: "On the Deals page, newest first, once you’re signed in as a member. An email version is coming later.",
        },
        {
          q: "Where do I find my downloads and perks?",
          a: "Everything lives on your Member perks page: the PDF guides and Lightroom presets, the deal notes, and the member stories. It’s linked from your account menu.",
        },
        {
          q: "How many trips can I save without Premium?",
          a: `Free accounts save up to ${FREE_SAVED_TRIPS} trips. Members save as many as they plan and can share a link to any trip. Downloading a trip as a PDF stays free for everyone.`,
        },
        {
          q: "What happens to my trips if I cancel?",
          a: `Nothing is deleted. Every trip you saved stays in My trips. You just can’t add a new one past ${FREE_SAVED_TRIPS} until you rejoin or remove a few.`,
        },
      ],
    },
    {
      title: "Billing and cancelling",
      items: [
        {
          q: "Can I cancel?",
          a: "Yes. Cancel anytime from your account. You keep Premium through the end of the time you’ve already paid for.",
        },
        {
          q: "Can I switch between monthly and yearly?",
          a: "Yes. Manage membership opens the page where you change the plan or cancel.",
        },
        ...(trialDays > 0
          ? [
              {
                q: "How does the free trial work?",
                a: `You won’t be charged for ${trialDays} days. Cancel before then and the plan doesn’t bill you.`,
              },
            ]
          : []),
      ],
    },
  ];

  const socials = [
    { name: "Instagram", handle: "@alexjrnys", href: site.social.instagram, Icon: SocialInstagramIcon },
    { name: "YouTube", handle: "@alexjrnys", href: site.social.youtube, Icon: SocialYouTubeIcon },
    { name: "Pinterest", handle: "@alexjrnys", href: site.social.pinterest, Icon: SocialPinterestIcon },
  ];

  return (
    <main className="premium-page bg-bg">
      {/* Hero */}
      <header className="relative isolate overflow-hidden bg-near-black">
        <Image
          src={HERO_PHOTO}
          alt=""
          fill
          priority
          sizes="100vw"
          className="-z-10 object-cover"
        />
        <div className="premium-hero-scrim absolute inset-0 -z-10" aria-hidden="true" />
        <div className="section-shell pb-28 pt-10 text-center md:pb-40 md:pt-16">
          <div className="premium-portrait relative mx-auto size-28 overflow-hidden rounded-full md:size-36">
            <Image
              src={site.authorPhoto}
              alt={site.authorName}
              fill
              priority
              sizes="(max-width: 768px) 112px, 144px"
              className="object-cover object-top"
            />
          </div>
          <p className="mt-5 text-[0.8125rem] font-semibold uppercase tracking-[0.12em] text-accent">
            Alex Journeys Premium
          </p>
          <h1 className="font-display text-hero mx-auto mt-3 max-w-3xl text-balance text-hero-type">
            The journal, with the doors open.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-hero-type/85 md:text-lg">
            Member stories, a trip planner that can grow with you, guides you can
            keep, and a weekly note on deals out of Newark, JFK, and Philadelphia.
          </p>
        </div>
      </header>

      {/* Plan */}
      <div className="section-shell relative z-10 -mt-16 md:-mt-24">
        <PremiumOffer
          monthlyLabel={prices.monthlyLabel}
          yearlyLabel={prices.yearlyLabel}
          yearlyPerMonthLabel={prices.yearlyPerMonthLabel}
          savingsLabel={prices.savingsLabel}
          savingsPercent={prices.savingsPercent}
          trialDays={trialDays}
          checkoutConfigured={checkoutConfigured}
          onsiteCheckout={onsiteCheckout}
          perks={PREMIUM_PERKS}
        />
        {!checkoutConfigured ? (
          <p className="mx-auto mt-4 max-w-md text-center text-sm text-muted">
            Joining isn’t open yet. The plan above is what it will cost when it is.
          </p>
        ) : null}
      </div>

      {/* Join us */}
      <section className="section-shell pt-16 md:pt-24" aria-labelledby="premium-join">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">Come along</p>
          <h2 id="premium-join" className="font-display text-title mt-2 text-heading">
            More of the road, for members.
          </h2>
          <p className="mt-3 text-base leading-relaxed text-text md:text-lg">
            The journal stays free for everyone. Premium opens a little more:
            the longer stories, guides to keep, a planner that grows with your
            trips, and a weekly note on deals from the airports close to home.
          </p>
          <a href="#plans" className="btn btn-primary mt-6">
            See the plan
          </a>
        </div>
      </section>

      {/* From Alex */}
      <section className="section-shell pt-12 md:pt-16" aria-labelledby="premium-creator">
        <div className="premium-creator grid items-center gap-8 overflow-hidden rounded-3xl bg-white p-6 sm:p-8 md:grid-cols-[minmax(0,18rem)_1fr] md:gap-12 md:p-12">
          <div className="premium-creator-photo relative mx-auto aspect-square w-full max-w-[15rem] overflow-hidden rounded-full md:max-w-none">
            <Image
              src={ON_THE_ROAD_PHOTO}
              alt={`${site.authorName} on a helicopter ride`}
              fill
              sizes="(max-width: 768px) 240px, 288px"
              className="object-cover"
              style={{ objectPosition: "68% 40%" }}
            />
          </div>
          <div>
            <p className="eyebrow">From Alex</p>
            <h2 id="premium-creator" className="font-display text-title mt-2 text-heading">
              Hi, I’m Alex.
            </h2>
            <p className="mt-3 text-base leading-relaxed text-text">
              I’m a traveler and photographer based in New Jersey. Alex Journeys is
              my trip journal: places I’ve already been, the routes, and the small
              details I’d tell a friend. Premium is for readers who want more of it.
            </p>
            <ul className="mt-5 space-y-2.5">
              {[
                "Trip notes from places I’ve actually been",
                "Deals watched from Newark, JFK, and Philadelphia, where I fly from",
                "The same Lightroom presets I use on my own photos",
              ].map((line) => (
                <li key={line} className="flex items-start gap-3 text-sm leading-snug text-text md:text-base">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent" aria-hidden="true">
                    <Check size={13} strokeWidth={3} />
                  </span>
                  {line}
                </li>
              ))}
            </ul>
            {stats.length > 0 ? (
              <dl className="mt-6 grid grid-cols-3 gap-3 border-t border-border pt-5">
                {stats.map((stat) => (
                  <div key={stat.label} className="flex flex-col">
                    <dt className="order-2 text-xs leading-snug text-muted">{stat.label}</dt>
                    <dd className="font-display text-2xl font-bold text-heading md:text-3xl">
                      {stat.value}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href={PREMIUM_EXAMPLE_PATH} className="btn btn-primary">
                Read a members-only story
              </Link>
              <Link href={PERKS_HUB_PATH} className="btn btn-secondary">
                See every perk
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Inside the membership */}
      <section className="section-shell section-band" aria-labelledby="premium-inside">
        <SectionHeading
          id="premium-inside"
          eyebrow="What members get"
          title="Inside the membership"
          lead="Everything that comes with Premium. Booking stays open to everyone."
        />
        <div className="mt-8 md:mt-10">
          <PremiumPerkRail items={railItems} />
        </div>
      </section>

      {/* Who it's for */}
      <section className="border-y border-border bg-surface-soft" aria-labelledby="premium-for">
        <div className="section-shell section-band">
          <SectionHeading id="premium-for" eyebrow="Who it’s for" title="Made for readers like you" />
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 md:mt-10">
            {FOR_WHOM.map(({ icon: Icon, title, body }) => (
              <li
                key={title}
                className="flex items-start gap-4 rounded-2xl border border-border bg-white p-5 sm:flex-col sm:items-center sm:p-6 sm:text-center"
              >
                <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-accent text-on-solid" aria-hidden="true">
                  <Icon size={22} />
                </span>
                <div>
                  <h3 className="card-title">{title}</h3>
                  <p className="card-body mt-1 sm:mt-2">{body}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-8 text-center">
            <a href="#plans" className="btn btn-primary w-full sm:w-auto">
              Choose your plan
            </a>
          </div>
        </div>
      </section>

      {/* Free vs member */}
      <section className="section-shell section-band" aria-labelledby="premium-compare">
        <SectionHeading
          id="premium-compare"
          eyebrow="Free vs. member"
          title="What changes when you join"
        />
        <div className="premium-plan-card mx-auto mt-8 max-w-2xl overflow-hidden rounded-2xl bg-white md:mt-10">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-soft">
                <th scope="col" className="px-4 py-3 font-semibold text-muted sm:px-6">
                  <span className="sr-only">Feature</span>
                </th>
                <th scope="col" className="w-[22%] px-2 py-3 text-center font-display font-bold text-heading">
                  Free
                </th>
                <th scope="col" className="w-[26%] px-2 py-3 text-center font-display font-bold text-accent sm:pr-6">
                  Member
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-b border-border last:border-b-0">
                  <th scope="row" className="px-4 py-3.5 font-medium leading-snug text-text sm:px-6">
                    {row.label}
                  </th>
                  <td className="px-2 py-3.5 text-center">
                    <Mark value={row.free} />
                  </td>
                  <td className="px-2 py-3.5 text-center sm:pr-6">
                    <Mark value={row.member} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-border bg-surface-soft px-5 py-7 text-center sm:px-8">
            <p className="text-sm text-muted">Pay yearly and keep Premium all year</p>
            {prices.savingsPercent > 0 ? (
              <p className="mt-2 text-sm text-muted">
                <span className="line-through">{formatUsd(monthlyYearCents)}</span> paying monthly
              </p>
            ) : null}
            <p className="mt-1 font-display text-4xl font-bold tracking-tight text-heading">
              {prices.yearlyLabel}
              <span className="ml-1 font-sans text-base font-medium tracking-normal text-muted">/year</span>
            </p>
            <p className="mt-1 text-sm text-muted">or {prices.monthlyLabel} a month</p>
            <a href="#plans" className="btn btn-primary mt-5 w-full sm:w-auto">
              Choose your plan
            </a>
            <p className="mt-4 text-xs text-muted">
              Cancel anytime from your account. You keep Premium through the time you’ve paid for.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-border bg-surface-soft" aria-labelledby="premium-faq">
        <div className="section-shell section-band">
          <SectionHeading
            id="premium-faq"
            eyebrow="Still have questions?"
            title="Frequently asked questions"
          />
          <div className="mx-auto mt-8 max-w-5xl space-y-10 md:mt-10">
            {faqGroups.map((group) => (
              <div key={group.title}>
                <h3 className="text-center font-display text-lg font-bold text-accent md:text-xl">
                  {group.title}
                </h3>
                <div className="mt-4 grid items-start gap-3 md:grid-cols-2">
                  {group.items.map((item) => (
                    <details key={item.q} className="group rounded-xl border border-border bg-white">
                      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-3 font-semibold leading-snug text-heading [&::-webkit-details-marker]:hidden">
                        <CircleHelp size={18} className="shrink-0 text-accent" aria-hidden="true" />
                        <span className="flex-1 text-[0.9375rem]">{item.q}</span>
                        <ChevronDown
                          size={18}
                          className="shrink-0 text-muted transition group-open:rotate-180"
                          aria-hidden="true"
                        />
                      </summary>
                      <p className="px-4 pb-4 pl-11 text-sm leading-relaxed text-text">{item.a}</p>
                    </details>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <a href="#plans" className="btn btn-primary w-full sm:w-auto">
              See the plan
            </a>
          </div>
        </div>
      </section>

      {/* Closing band */}
      <section className="relative isolate overflow-hidden bg-near-black" aria-labelledby="premium-close">
        <Image src={CLOSING_PHOTO} alt="" fill sizes="100vw" className="-z-10 object-cover" />
        <div className="premium-close-scrim absolute inset-0 -z-10" aria-hidden="true" />
        <div className="section-shell section-band text-center">
          <h2 id="premium-close" className="font-display text-title mx-auto max-w-2xl text-hero-type">
            Come along for the next trip.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-hero-type/85">
            Start when you’re ready. Stop from your account whenever you want. No
            long lock-in, and booking a hotel or a flight never requires Premium.
          </p>
          <a href="#plans" className="btn btn-primary mt-6 w-full sm:w-auto">
            Back to the plan
          </a>
          <ul className="mx-auto mt-10 grid max-w-2xl grid-cols-3 gap-3">
            {socials.map(({ name, handle, href, Icon }) => (
              <li key={name}>
                <OutboundLink
                  href={href}
                  className="flex h-full flex-col items-center gap-2 rounded-2xl border border-hero-type/20 bg-near-black/45 px-2 py-4 text-hero-type transition hover:border-hero-type/40"
                >
                  <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-on-solid">
                    <Icon size={22} />
                  </span>
                  <span className="text-sm font-semibold">{name}</span>
                  <span className="text-xs text-hero-type/70">{handle}</span>
                </OutboundLink>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
