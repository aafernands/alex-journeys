"use client";

import Link from "next/link";
import {
  Bookmark,
  BookOpen,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Compass,
  ExternalLink,
  History as HistoryIcon,
  LayoutGrid,
  Luggage,
  MapPin,
  MessageSquare,
  Settings as SettingsIcon,
  UserRound,
} from "lucide-react";
import { useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import { AccountPreferences } from "@/components/account/AccountPreferences";
import { AccountAuthActions } from "@/components/AccountAuthActions";
import {
  AccountJourneyNav,
  type JourneyNavItem,
} from "@/components/account/AccountJourneyNav";
import { AccountProfileCard } from "@/components/account/AccountProfileCard";
import { AccountBookingsList } from "@/components/account/AccountBookingsList";
import { AccountHistoryList } from "@/components/account/AccountHistoryList";
import { AccountPackingLists } from "@/components/account/AccountPackingLists";
import {
  MyTripsList,
  type AccountTripRow,
} from "@/components/account/MyTripsList";
import { TripInboxAddress } from "@/components/account/TripInboxAddress";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";
import { ProfileAvatar } from "@/components/account/ProfileAvatar";
import { ProfileSettingsForm } from "@/components/ProfileSettingsForm";
import {
  SavedPostsList,
  type SavedPostRow,
} from "@/components/SavedPostsList";
import {
  SavedHotelsList,
  type SavedHotelRow,
} from "@/components/account/SavedHotelsList";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionHeader } from "@/components/ui/SectionHeader";
import {
  ACCOUNT_SECTIONS,
  accountSectionFromLocation,
  type AccountSection,
} from "@/lib/account-section";
import type { AccountBookingRow, AccountPackingRow } from "@/lib/account-journey";
import type { HistoryEntry } from "@/lib/reading-history";
import { planATripHref } from "@/lib/trip-record";
import {
  MembershipSettings,
  type MembershipPanel,
} from "@/components/account/MembershipSettings";

type Section = AccountSection;

const SECTION_LABEL: Record<Section, string> = {
  overview: "Overview",
  trips: "My trips",
  bookings: "Bookings",
  saved: "Saved",
  comments: "Comments",
  history: "History",
  profile: "Profile",
  settings: "Settings",
};

const SECTION_ICON: Record<Section, JourneyNavItem["icon"]> = {
  overview: LayoutGrid,
  trips: Luggage,
  bookings: CalendarCheck,
  saved: Bookmark,
  comments: MessageSquare,
  history: HistoryIcon,
  profile: UserRound,
  settings: SettingsIcon,
};

/** Query params the page reads once and then drops from the address bar. */
const ONE_SHOT_PARAMS = ["section", "tab", "session_id", "premium"] as const;

export type AccountDashboardProps = {
  name: string;
  email: string;
  image: string | null;
  pendingNewEmail: string | null;
  hasPassword: boolean;
  emailConfigured: boolean;
  /** Profile was read from the account store, so password-less is meaningful. */
  profileLoaded: boolean;
  trips: AccountTripRow[];
  tripsError: string | null;
  bookings: AccountBookingRow[];
  packingLists: AccountPackingRow[];
  posts: SavedPostRow[];
  postsError: string | null;
  hotels: SavedHotelRow[];
  hotelsError: string | null;
  history: HistoryEntry[];
  historyError: string | null;
  membership: MembershipPanel;
};

type SavedFilter = "all" | "hotels" | "stories";

function useSiteHeaderHeight(): number {
  const [height, setHeight] = useState(112);
  useEffect(() => {
    const header = document.querySelector("header.sticky");
    if (!header) return;
    const update = () => {
      setHeight(Math.round(header.getBoundingClientRect().height));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(header);
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);
  return height;
}

function SummaryCard({
  eyebrow,
  value,
  detail,
  icon,
  onOpen,
}: {
  eyebrow: string;
  value: string;
  detail: string;
  icon: ReactNode;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="panel-interactive flex h-full flex-col p-3 text-left"
    >
      <span className="flex items-center justify-between gap-3">
        <span className="eyebrow">{eyebrow}</span>
        {icon}
      </span>
      <span className="font-display mt-1 text-ds-title font-bold text-heading">{value}</span>
      <span className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">{detail}</span>
    </button>
  );
}

function ErrorPanel({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="ui-card p-3">
      <p className="text-sm leading-relaxed text-text" role="status">
        {message}
      </p>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

export function AccountDashboard({
  name,
  email,
  image,
  pendingNewEmail,
  hasPassword,
  emailConfigured,
  profileLoaded,
  trips,
  tripsError,
  bookings,
  packingLists,
  posts,
  postsError,
  hotels,
  hotelsError,
  history,
  historyError,
  membership,
}: AccountDashboardProps) {
  const [section, setSection] = useState<Section>("overview");
  const [savedFilter, setSavedFilter] = useState<SavedFilter>("all");
  const [historyCount, setHistoryCount] = useState(history.length);
  const headerHeight = useSiteHeaderHeight();
  const displayName = name.trim() || "Traveler";
  const googlePhoto = Boolean(image?.includes("googleusercontent.com"));
  const membershipLabel = membership.isMember ? "Premium member" : "Free member";

  useLayoutEffect(() => {
    const apply = () => {
      const next = accountSectionFromLocation(
        window.location.hash,
        window.location.search,
      );
      setSection(next);
      const params = new URLSearchParams(window.location.search);
      const shouldClean = ONE_SHOT_PARAMS.some((key) => params.has(key));
      if (!shouldClean) return;
      for (const key of ONE_SHOT_PARAMS) params.delete(key);
      const search = params.toString();
      const hash = next === "overview" ? "" : `#${next}`;
      const url = `${window.location.pathname}${search ? `?${search}` : ""}${hash}`;
      window.history.replaceState(null, "", url);
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  function select(next: Section) {
    setSection(next);
    const params = new URLSearchParams(window.location.search);
    params.delete("section");
    params.delete("tab");
    const search = params.toString();
    const hash = next === "overview" ? "" : `#${next}`;
    const url = `${window.location.pathname}${search ? `?${search}` : ""}${hash}`;
    window.history.replaceState(null, "", url);
    const top = document.getElementById("my-journey");
    if (top && top.getBoundingClientRect().top < headerHeight) {
      top.scrollIntoView({ block: "start" });
    }
  }

  const savedError = postsError || hotelsError;
  const savedCount = posts.length + hotels.length;
  const savedBadge = savedError ? null : savedCount;
  const historyBadge = historyError ? null : historyCount;

  const count = (id: Section): number | null => {
    if (id === "trips") return tripsError ? null : trips.length;
    if (id === "bookings") return tripsError ? null : bookings.length;
    if (id === "saved") return savedBadge;
    if (id === "history") return historyBadge;
    return null;
  };

  const navItems: JourneyNavItem[] = ACCOUNT_SECTIONS.map((id) => ({
    id,
    label: SECTION_LABEL[id],
    icon: SECTION_ICON[id],
    count: count(id),
  }));

  const tripDetail = tripsError
    ? tripsError
    : trips.length === 0
      ? "No trips saved yet."
      : [trips[0]?.title, trips[0]?.destination].filter(Boolean).join(" · ");
  const bookingDetail = tripsError
    ? "Bookings load with your trips."
    : bookings.length === 0
      ? "Nothing booked yet."
      : [bookings[0]?.title, bookings[0]?.when].filter(Boolean).join(" · ");

  return (
    <div
      id="my-journey"
      className="section-shell section-band"
      style={{ scrollMarginTop: headerHeight }}
    >
      <div className="mx-auto max-w-5xl md:grid md:grid-cols-[14rem_minmax(0,1fr)] md:gap-6">
        <aside className="hidden md:block">
          <div className="sticky" style={{ top: headerHeight + 16 }}>
            <p className="eyebrow mb-2 px-3">My Journey</p>
            <AccountJourneyNav
              variant="sidebar"
              items={navItems}
              active={section}
              onSelect={select}
            />
          </div>
        </aside>

        <div className="min-w-0">
          {section === "overview" ? (
            <h1 className="font-display mb-3 text-ds-title font-bold text-heading">My Journey</h1>
          ) : (
            <div className="mb-3">
              <button
                type="button"
                onClick={() => select("overview")}
                className="-ml-2 inline-flex min-h-11 items-center gap-1 px-2 text-sm font-semibold text-accent md:hidden"
              >
                <ChevronLeft className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                My Journey
              </button>
              <h1 className="font-display text-ds-title font-bold text-heading">
                {SECTION_LABEL[section]}
              </h1>
            </div>
          )}

          {/* Overview */}
          <div hidden={section !== "overview"} className="space-y-4">
            <AccountProfileCard
              name={displayName}
              email={email}
              image={image}
              membershipLabel={membershipLabel}
              pendingNewEmail={pendingNewEmail}
              comments={null}
              saved={savedBadge}
              history={historyBadge}
              onOpen={select}
            />

            <section className="ui-card flex items-center gap-3 p-3 sm:p-4" aria-labelledby="journey-cta">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                <Compass className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 id="journey-cta" className="text-sm font-semibold text-heading">
                  Plan your next trip
                </h2>
                <p className="text-xs text-muted">Flights, stays, and days in one itinerary.</p>
              </div>
              <Link href={planATripHref()} className="btn btn-primary shrink-0 text-sm">
                Plan a trip
              </Link>
            </section>

            <div className="md:hidden">
              <AccountJourneyNav
                variant="list"
                items={navItems.filter((item) => item.id !== "overview")}
                active={section}
                onSelect={select}
              />
            </div>

            <div className="hidden gap-3 md:grid md:grid-cols-2">
              <SummaryCard
                eyebrow="My trips"
                value={tripsError ? "—" : String(trips.length)}
                detail={tripDetail}
                icon={<Luggage className="h-4 w-4 text-accent" strokeWidth={2} aria-hidden="true" />}
                onOpen={() => select("trips")}
              />
              <SummaryCard
                eyebrow="Bookings"
                value={tripsError ? "—" : String(bookings.length)}
                detail={bookingDetail}
                icon={<CalendarCheck className="h-4 w-4 text-accent" strokeWidth={2} aria-hidden="true" />}
                onOpen={() => select("bookings")}
              />
            </div>

            <section aria-labelledby="account-explore">
              <h2 id="account-explore" className="eyebrow">
                Keep exploring
              </h2>
              <ul className="mt-2 grid grid-cols-3 gap-2">
                {[
                  { href: "/destinations", label: "Places", Icon: MapPin },
                  { href: "/blog", label: "Stories", Icon: BookOpen },
                  { href: "/guides", label: "Guides", Icon: Compass },
                ].map(({ href, label, Icon }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="panel-interactive flex min-h-11 items-center justify-center gap-2 px-2 text-sm font-semibold text-heading"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-accent" strokeWidth={2} aria-hidden="true" />
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* My trips */}
          <div hidden={section !== "trips"} className="space-y-6">
            <section>
              <SectionHeader
                title="Itineraries"
                subtitle="Trips you save from Plan a trip. Open one to pick up flights, stays, and the days in between."
                action={
                  trips.length > 0 || tripsError ? (
                    <Link href={planATripHref()} className="btn btn-primary text-sm">
                      Plan a trip
                    </Link>
                  ) : undefined
                }
                as="h2"
              />
              <div className="mt-3">
                {tripsError ? <ErrorPanel message={tripsError} /> : <MyTripsList trips={trips} />}
              </div>
            </section>
            {!tripsError && trips.length > 0 ? (
              <section className="border-t border-border pt-4">
                <SectionHeader
                  title="Packing lists"
                  subtitle="How far along each trip’s packing is."
                  as="h2"
                />
                <div className="mt-3">
                  <AccountPackingLists lists={packingLists} />
                </div>
              </section>
            ) : null}
          </div>

          {/* Bookings */}
          <div hidden={section !== "bookings"} className="space-y-3">
            <p className="text-sm text-muted">
              Stays and flights booked or marked booked in your trips. Open one to see the full trip.
            </p>
            {tripsError ? (
              <ErrorPanel message={tripsError} />
            ) : (
              <AccountBookingsList bookings={bookings} />
            )}
          </div>

          {/* Saved */}
          <div hidden={section !== "saved"} className="space-y-4">
            <div
              role="group"
              aria-label="Show saved"
              className="inline-flex rounded-full border border-border bg-white p-0.5"
            >
              {(
                [
                  { id: "all", label: "All", count: savedError ? null : savedCount },
                  { id: "hotels", label: "Hotels", count: hotelsError ? null : hotels.length },
                  { id: "stories", label: "Stories", count: postsError ? null : posts.length },
                ] as { id: SavedFilter; label: string; count: number | null }[]
              ).map((option) => {
                const on = savedFilter === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setSavedFilter(option.id)}
                    className={`inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition ${
                      on ? "bg-ink text-on-solid" : "text-muted hover:text-heading"
                    }`}
                  >
                    {option.label}
                    {option.count !== null ? (
                      <span className="tabular-nums opacity-80">{option.count}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            {savedFilter !== "stories" ? (
              <section aria-labelledby="saved-hotels-heading">
                <h2
                  id="saved-hotels-heading"
                  className="font-display text-base font-bold text-heading"
                >
                  Favorite hotels
                </h2>
                <p className="mt-1 text-sm text-muted">Hotels you saved while comparing stays.</p>
                <div className="mt-3">
                  {hotelsError ? (
                    <ErrorPanel
                      message={hotelsError}
                      action={
                        <Link href="/stays" className="btn btn-secondary">
                          Find hotels
                        </Link>
                      }
                    />
                  ) : (
                    <SavedHotelsList hotels={hotels} />
                  )}
                </div>
              </section>
            ) : null}

            {savedFilter !== "hotels" ? (
              <section
                aria-labelledby="saved-stories-heading"
                className={savedFilter === "all" ? "border-t border-border pt-4" : undefined}
              >
                <h2
                  id="saved-stories-heading"
                  className="font-display text-base font-bold text-heading"
                >
                  Saved stories
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Bookmarks from the journal. Remove any of them whenever you like.
                </p>
                <div className="mt-3">
                  {postsError ? (
                    <ErrorPanel
                      message={postsError}
                      action={
                        <Link href="/blog" className="btn btn-secondary">
                          Browse stories
                        </Link>
                      }
                    />
                  ) : (
                    <SavedPostsList posts={posts} />
                  )}
                </div>
              </section>
            ) : null}
          </div>

          {/* Comments */}
          <div hidden={section !== "comments"}>
            <EmptyState
              action={
                <Link href="/blog" className="btn btn-secondary">
                  Browse stories
                </Link>
              }
            >
              Comments you leave on stories and guides will be listed here, with links back.
            </EmptyState>
          </div>

          {/* History */}
          <div hidden={section !== "history"}>
            {historyError ? (
              <ErrorPanel message={historyError} />
            ) : (
              <AccountHistoryList items={history} onCountChange={setHistoryCount} />
            )}
          </div>

          {/* Profile */}
          <div hidden={section !== "profile"} className="space-y-4">
            <section className="panel p-4" aria-labelledby="settings-profile">
              <h2 id="settings-profile" className="font-display text-ds-title font-bold text-heading">
                Name, photo, and email
              </h2>
              <ProfileSettingsForm
                initialName={name}
                initialEmail={email}
                initialImage={image}
                hasPassword={hasPassword}
                pendingNewEmail={pendingNewEmail}
                emailConfigured={emailConfigured}
              />
            </section>
            {section === "profile" ? <TripInboxAddress /> : null}
          </div>

          {/* Settings */}
          <div hidden={section !== "settings"} className="space-y-4">
            <button
              type="button"
              onClick={() => select("profile")}
              className="ui-card flex min-h-12 w-full items-center gap-3 p-3 text-left transition hover:bg-surface-soft"
            >
              <ProfileAvatar src={image} name={displayName} email={email} size="settings" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-heading">
                  Edit profile
                </span>
                <span className="block truncate text-xs text-muted">
                  Name, photo, email, and trip inbox
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted" strokeWidth={2} aria-hidden="true" />
            </button>

            <MembershipSettings panel={membership} />

            <AccountPreferences />

            <section className="panel p-4" aria-labelledby="settings-security">
              <h2 id="settings-security" className="font-display text-ds-title font-bold text-heading">
                Sign-in and security
              </h2>
              {hasPassword ? (
                <>
                  <p className="mt-1 text-xs text-muted">
                    Update the password you use with email sign-in.
                  </p>
                  <ChangePasswordForm />
                </>
              ) : profileLoaded ? (
                <p className="mt-1 text-sm text-muted">This account signs in without a password.</p>
              ) : null}
              {googlePhoto ? (
                <p className="mt-3 text-sm text-muted">
                  <a
                    href="https://myaccount.google.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-accent hover:underline"
                  >
                    Google Account
                    <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                  </a>
                  <span> — manage the Google login linked to this photo.</span>
                </p>
              ) : null}
              <div className="mt-3 border-t border-border pt-3">
                <AccountAuthActions mode="sign-out" className="w-full sm:w-auto" />
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
