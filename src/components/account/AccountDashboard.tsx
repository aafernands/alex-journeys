"use client";

import Link from "next/link";
import {
  BookOpen,
  Compass,
  ExternalLink,
  Luggage,
  MapPin,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { AccountAuthActions } from "@/components/AccountAuthActions";
import {
  MyTripsList,
  type AccountTripRow,
} from "@/components/account/MyTripsList";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";
import { ProfileAvatar } from "@/components/account/ProfileAvatar";
import { ProfileSettingsForm } from "@/components/ProfileSettingsForm";
import {
  SavedPostsList,
  type SavedPostRow,
} from "@/components/SavedPostsList";
import { planATripHref } from "@/lib/trip-record";

const SECTIONS = ["overview", "trips", "saved", "settings"] as const;
type Section = (typeof SECTIONS)[number];

const SECTION_LABEL: Record<Section, string> = {
  overview: "Overview",
  trips: "Trips",
  saved: "Saved",
  settings: "Settings",
};

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
  posts: SavedPostRow[];
  postsError: string | null;
};

function sectionFromHash(hash: string): Section {
  const id = hash.replace(/^#/, "");
  return (SECTIONS as readonly string[]).includes(id)
    ? (id as Section)
    : "overview";
}

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
  action,
  icon,
  onOpen,
}: {
  eyebrow: string;
  value: string;
  detail: string;
  action: string;
  icon: ReactNode;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="panel-interactive flex h-full flex-col p-5 text-left"
    >
      <span className="flex items-center justify-between gap-3">
        <span className="eyebrow">{eyebrow}</span>
        {icon}
      </span>
      <span className="font-display mt-3 text-3xl font-bold text-heading">
        {value}
      </span>
      <span className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted">
        {detail}
      </span>
      <span className="mt-4 text-sm font-semibold text-accent">{action}</span>
    </button>
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
  posts,
  postsError,
}: AccountDashboardProps) {
  const [section, setSection] = useState<Section>("overview");
  const headerHeight = useSiteHeaderHeight();
  const displayName = name.trim() || "Traveler";
  const googlePhoto = Boolean(image?.includes("googleusercontent.com"));

  useEffect(() => {
    const apply = () => setSection(sectionFromHash(window.location.hash));
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  function select(next: Section) {
    setSection(next);
    const base = `${window.location.pathname}${window.location.search}`;
    const url = next === "overview" ? base : `${base}#${next}`;
    window.history.replaceState(null, "", url);
    document.getElementById("account-sections")?.scrollIntoView({
      block: "start",
    });
  }

  const tripDetail = tripsError
    ? tripsError
    : trips.length === 0
      ? "No trips saved yet. Plan one and it will wait here."
      : [trips[0]?.title, trips[0]?.destination].filter(Boolean).join(" · ");
  const savedDetail = postsError
    ? postsError
    : posts.length === 0
      ? "No stories saved yet. Tap Save on any story."
      : posts[0]?.title || "Stories you wanted to come back to.";

  const tabCount = (id: Section): number | null => {
    if (id === "trips") return tripsError ? null : trips.length;
    if (id === "saved") return postsError ? null : posts.length;
    return null;
  };

  return (
    <>
      <nav
        id="account-sections"
        aria-label="Account sections"
        className="sticky z-40 border-b border-border bg-bg/95 backdrop-blur-md"
        style={{ top: headerHeight, scrollMarginTop: headerHeight }}
      >
        <div className="section-shell">
          <div
            className="mx-auto flex max-w-5xl gap-1 overflow-x-auto py-2"
            role="tablist"
          >
            {SECTIONS.map((id) => {
              const active = section === id;
              const count = tabCount(id);
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  id={`account-tab-${id}`}
                  aria-selected={active}
                  aria-controls={id}
                  className={`inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-sm font-semibold transition ${
                    active
                      ? "bg-accent text-on-solid"
                      : "text-muted hover:bg-surface-soft hover:text-heading"
                  }`}
                  onClick={() => select(id)}
                >
                  {SECTION_LABEL[id]}
                  {count !== null ? (
                    <span
                      className={`ml-2 rounded-full px-1.5 py-0.5 text-xs ${
                        active ? "bg-on-solid/20" : "bg-surface text-heading"
                      }`}
                    >
                      {count}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      <div className="section-shell section-band">
        <div className="mx-auto max-w-5xl">
          <div
            id="overview"
            role="tabpanel"
            aria-labelledby="account-tab-overview"
            hidden={section !== "overview"}
            className="space-y-6"
          >
            <section className="panel p-5 sm:p-7" aria-labelledby="account-identity">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                  <ProfileAvatar src={image} name={displayName} email={email} />
                  <div className="min-w-0">
                    <h2
                      id="account-identity"
                      className="font-display truncate text-2xl font-bold text-heading sm:text-3xl"
                    >
                      {displayName}
                    </h2>
                    {email ? (
                      <p className="mt-0.5 truncate text-sm text-muted">{email}</p>
                    ) : null}
                    {pendingNewEmail ? (
                      <p className="mt-2 text-sm text-text">
                        Confirm the link sent to{" "}
                        <span className="font-semibold text-heading">
                          {pendingNewEmail}
                        </span>{" "}
                        to finish changing your email.
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <Link
                    href={planATripHref()}
                    className="btn btn-primary w-full sm:w-auto"
                  >
                    Plan a trip
                  </Link>
                  <Link href="/blog" className="btn btn-secondary w-full sm:w-auto">
                    Browse stories
                  </Link>
                  <AccountAuthActions
                    mode="sign-out"
                    className="w-full sm:w-auto"
                  />
                </div>
              </div>
            </section>

            <div className="grid gap-4 sm:grid-cols-2">
              <SummaryCard
                eyebrow="Trips"
                value={tripsError ? "—" : String(trips.length)}
                detail={tripDetail}
                action="View trips"
                icon={
                  <Luggage
                    className="h-5 w-5 text-accent"
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                }
                onOpen={() => select("trips")}
              />
              <SummaryCard
                eyebrow="Saved stories"
                value={postsError ? "—" : String(posts.length)}
                detail={savedDetail}
                action="View saved"
                icon={
                  <BookOpen
                    className="h-5 w-5 text-accent"
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                }
                onOpen={() => select("saved")}
              />
            </div>

            <section aria-labelledby="account-explore">
              <h2
                id="account-explore"
                className="font-display text-lg font-bold text-heading"
              >
                Keep exploring
              </h2>
              <ul className="mt-3 grid gap-3 sm:grid-cols-3">
                <li>
                  <Link
                    href="/destinations"
                    className="panel-interactive flex items-center gap-3 p-4"
                  >
                    <MapPin
                      className="h-5 w-5 shrink-0 text-accent"
                      strokeWidth={2}
                      aria-hidden="true"
                    />
                    <span className="font-semibold text-heading">Places</span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/blog"
                    className="panel-interactive flex items-center gap-3 p-4"
                  >
                    <BookOpen
                      className="h-5 w-5 shrink-0 text-accent"
                      strokeWidth={2}
                      aria-hidden="true"
                    />
                    <span className="font-semibold text-heading">Stories</span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/guides"
                    className="panel-interactive flex items-center gap-3 p-4"
                  >
                    <Compass
                      className="h-5 w-5 shrink-0 text-accent"
                      strokeWidth={2}
                      aria-hidden="true"
                    />
                    <span className="font-semibold text-heading">Guides</span>
                  </Link>
                </li>
              </ul>
            </section>
          </div>

          <div
            id="trips"
            role="tabpanel"
            aria-labelledby="account-tab-trips"
            hidden={section !== "trips"}
          >
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="font-display text-2xl font-bold text-heading">
                  Trips
                </h2>
                <p className="mt-1 max-w-xl text-sm text-muted">
                  Itineraries you save from Plan a trip. Open one to pick up
                  flights, stays, and the days in between.
                </p>
              </div>
              {trips.length > 0 || tripsError ? (
                <Link
                  href={planATripHref()}
                  className="btn btn-primary w-full sm:w-auto"
                >
                  Plan a trip
                </Link>
              ) : null}
            </div>
            {tripsError ? (
              <div className="panel p-6 md:p-8">
                <p className="text-sm leading-relaxed text-text" role="status">
                  {tripsError}
                </p>
              </div>
            ) : (
              <MyTripsList trips={trips} />
            )}
          </div>

          <div
            id="saved"
            role="tabpanel"
            aria-labelledby="account-tab-saved"
            hidden={section !== "saved"}
          >
            <div className="mb-4">
              <h2 className="font-display text-2xl font-bold text-heading">
                Saved stories
              </h2>
              <p className="mt-1 max-w-xl text-sm text-muted">
                Bookmarks from the journal. Remove any of them whenever you like.
              </p>
            </div>
            {postsError ? (
              <div className="panel p-6 md:p-8">
                <p className="text-sm leading-relaxed text-text" role="status">
                  {postsError}
                </p>
                <Link href="/blog" className="btn btn-secondary mt-6">
                  Browse stories
                </Link>
              </div>
            ) : (
              <SavedPostsList posts={posts} />
            )}
          </div>

          <div
            id="settings"
            role="tabpanel"
            aria-labelledby="account-tab-settings"
            hidden={section !== "settings"}
            className="space-y-6"
          >
            <section className="panel p-6 md:p-8" aria-labelledby="settings-profile">
              <h2
                id="settings-profile"
                className="font-display text-2xl font-bold text-heading"
              >
                Profile
              </h2>
              <p className="mt-1 text-sm text-muted">
                Update your name, photo, and the email on this account.
              </p>
              <ProfileSettingsForm
                initialName={name}
                initialEmail={email}
                initialImage={image}
                hasPassword={hasPassword}
                pendingNewEmail={pendingNewEmail}
                emailConfigured={emailConfigured}
              />
            </section>

            {hasPassword ? (
              <section className="panel p-6 md:p-8" aria-labelledby="settings-password">
                <h2
                  id="settings-password"
                  className="font-display text-2xl font-bold text-heading"
                >
                  Password
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Update the password you use with email sign-in.
                </p>
                <ChangePasswordForm />
              </section>
            ) : profileLoaded ? (
              <p className="text-sm text-muted">
                This account signs in without a password.
              </p>
            ) : null}

            {googlePhoto ? (
              <p className="text-sm text-muted">
                <a
                  href="https://myaccount.google.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-semibold text-accent hover:underline"
                >
                  Google Account
                  <ExternalLink
                    className="h-3.5 w-3.5"
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                </a>
                <span> — manage the Google login linked to this photo.</span>
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}
