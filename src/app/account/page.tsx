import type { Metadata } from "next";
import { Suspense } from "react";
import {
  auth,
  isCredentialsAuthConfigured,
  isGoogleAuthConfigured,
  isOauthConfigured,
  isTwitterAuthConfigured,
} from "@/auth";
import { AccountSignIn } from "@/components/account/AccountSignIn";
import {
  AccountDashboard,
  type AccountDashboardProps,
} from "@/components/account/AccountDashboard";
import { type AccountTripRow } from "@/components/account/MyTripsList";
import { type SavedPostRow } from "@/components/SavedPostsList";
import { type SavedHotelRow } from "@/components/account/SavedHotelsList";
import { isEmailConfigured } from "@/lib/email";
import { isFirebaseConfigured } from "@/lib/firebase-admin";
import { getPostBySlug } from "@/lib/posts";
import {
  getPendingEmailChangeForUser,
  getUserById,
} from "@/lib/users";
import {
  listSavedPosts,
  SavedPostsUnavailableError,
} from "@/lib/saved-posts";
import {
  listSavedHotels,
  SavedHotelsUnavailableError,
} from "@/lib/saved-hotels";
import {
  isPremium,
  isPremiumCheckoutConfigured,
  membershipDetail,
  planLabel,
  statusLabel,
  toMembershipPublic,
  type MembershipPublic,
} from "@/lib/membership";
import { getReaderMembership, saveMembership } from "@/lib/membership-store";
import { subscriptionSyncFromCheckoutSession } from "@/lib/stripe-premium";
import type { MembershipPanel } from "@/components/account/MembershipSettings";
import { dateSummary } from "@/lib/trip-planner-model";
import { getTripPlannerConfig } from "@/lib/trip-planner";
import {
  plannerStateFromTrip,
  TRIPS_LIST_UNAVAILABLE,
} from "@/lib/trip-record";
import { listTrips, TripsUnavailableError } from "@/lib/trips";
import {
  accountBookings,
  accountPackingLists,
  type AccountBookingRow,
  type AccountPackingRow,
} from "@/lib/account-journey";
import { listHistory, type HistoryEntry } from "@/lib/reading-history";

export const metadata: Metadata = {
  title: "My Journey",
  description:
    "Your Alex Journeys journal — trips you’re planning and stories you’ve saved.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/account" },
};

export const dynamic = "force-dynamic";

type AccountPageProps = {
  searchParams: Promise<{ premium?: string; session_id?: string }>;
};

async function confirmPremiumCheckout(userId: string, sessionId: string) {
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) return;
  try {
    const sync = await subscriptionSyncFromCheckoutSession(sessionId);
    if (!sync?.membership.plan) return;
    if (sync.userId && sync.userId !== userId) return;
    await saveMembership(userId, {
      ...sync.membership,
      stripeEventAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn("[premium] checkout confirm failed:", err);
  }
}

function membershipPanel(input: {
  membership: MembershipPublic | null;
  portalAvailable: boolean;
  welcome: boolean;
  unavailable: boolean;
}): MembershipPanel {
  const member = isPremium({ membership: input.membership });
  return {
    isMember: member,
    planLabel: planLabel(input.membership?.plan ?? null),
    statusLabel: statusLabel(input.membership?.status ?? "none"),
    detail: membershipDetail(input.membership),
    portalAvailable: input.portalAvailable,
    checkoutConfigured: isPremiumCheckoutConfigured(),
    welcome: input.welcome,
    unavailable: input.unavailable,
  };
}

function enrichSavedPosts(
  posts: Awaited<ReturnType<typeof listSavedPosts>>,
): SavedPostRow[] {
  return posts.map((p) => {
    const live = getPostBySlug(p.slug);
    return {
      slug: p.slug,
      title: live?.title ?? p.title,
      savedAt: p.savedAt,
      href: p.href,
      imageUrl: live?.featuredImage?.url ?? null,
      imageAlt: live?.featuredImage?.alt ?? p.title,
    };
  });
}

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const query = await searchParams;
  const session = await auth();
  const userId = session?.user?.id?.trim();
  const signedIn = Boolean(session?.user && userId);
  const user = session?.user;

  let posts: SavedPostRow[] = [];
  let postsError: string | null = null;
  let hotels: SavedHotelRow[] = [];
  let hotelsError: string | null = null;
  let firebaseOk = isFirebaseConfigured();
  let hasPassword = false;
  let profileLoaded = false;
  let pendingNewEmail: string | null = null;
  let profileName = user?.name?.trim() || "";
  let profileImage = user?.image ?? null;
  let profileEmail = user?.email ?? "";
  let membership: MembershipPublic | null = null;
  let membershipUnavailable = !firebaseOk;
  let portalAvailable = false;

  if (signedIn && userId && query.session_id && query.premium === "welcome") {
    await confirmPremiumCheckout(userId, query.session_id);
  }

  if (signedIn && userId && firebaseOk) {
    try {
      const stored = await getReaderMembership(userId, user?.email);
      membership = stored ? toMembershipPublic(stored) : null;
      portalAvailable = Boolean(stored?.stripeCustomerId && process.env.STRIPE_SECRET_KEY?.trim());
    } catch (err) {
      console.warn("[account] membership lookup failed:", err);
      membershipUnavailable = true;
    }
  }

  if (signedIn && userId && firebaseOk) {
    try {
      const profile = await getUserById(userId);
      profileLoaded = true;
      hasPassword = Boolean(profile?.passwordHash);
      if (profile) {
        profileName = profile.name?.trim() || profileName;
        profileImage = profile.image ?? profileImage;
        profileEmail = profile.email || profileEmail;
      }
      const pending = await getPendingEmailChangeForUser(userId);
      pendingNewEmail = pending?.newEmail ?? null;
    } catch (err) {
      console.warn("[account] profile lookup failed:", err);
    }
  }

  if (signedIn && userId) {
    if (!firebaseOk) {
      postsError =
        "Saved stories aren’t available right now. You can still browse and read.";
    } else {
      try {
        posts = enrichSavedPosts(await listSavedPosts(userId));
      } catch (err) {
        if (err instanceof SavedPostsUnavailableError) {
          firebaseOk = false;
          postsError =
            "Saved stories are temporarily unavailable. Try again later.";
        } else {
          console.error("[account] list saved failed:", err);
          postsError = "Could not load your saved stories. Try again in a moment.";
        }
      }
    }
  }

  if (signedIn && userId) {
    if (!firebaseOk) {
      hotelsError = "Saved hotels aren’t available right now.";
    } else {
      try {
        hotels = (await listSavedHotels(userId)).map((hotel) => ({
          hotelId: hotel.hotelId,
          name: hotel.name,
          city: hotel.city,
          neighborhood: hotel.neighborhood,
          photo: hotel.photo,
          rating: hotel.rating,
          stars: hotel.stars,
          savedAt: hotel.savedAt,
          href: hotel.href,
          tripId: hotel.tripId,
          tripHref: hotel.tripHref,
        }));
      } catch (err) {
        if (err instanceof SavedHotelsUnavailableError) {
          hotelsError = "Saved hotels are temporarily unavailable. Try again later.";
        } else {
          console.error("[account] list saved hotels failed:", err);
          hotelsError = "Could not load your saved hotels. Try again in a moment.";
        }
      }
    }
  }

  let trips: AccountTripRow[] = [];
  let tripsError: string | null = null;
  let bookings: AccountBookingRow[] = [];
  let packingLists: AccountPackingRow[] = [];
  if (signedIn && userId) {
    if (!isFirebaseConfigured()) {
      tripsError =
        "Saving trips to your account isn’t available on this site yet. You can still plan in this browser.";
    } else {
      try {
        const flexibleDates = getTripPlannerConfig().flexibleDates;
        const records = await listTrips(userId);
        bookings = accountBookings(records);
        packingLists = accountPackingLists(records);
        trips = records.map((trip) => ({
          id: trip.id,
          title: trip.title,
          destination: trip.destination,
          dates: dateSummary(plannerStateFromTrip(trip), flexibleDates),
        }));
      } catch (err) {
        if (err instanceof TripsUnavailableError) {
          tripsError = TRIPS_LIST_UNAVAILABLE;
        } else {
          console.error("[account] list trips failed:", err);
          tripsError = "Could not load your trips. Try again in a moment.";
        }
      }
    }
  }

  let history: HistoryEntry[] = [];
  let historyError: string | null = null;
  if (signedIn && userId) {
    if (!isFirebaseConfigured()) {
      historyError = "History isn’t available on this site right now.";
    } else {
      try {
        history = await listHistory(userId);
      } catch (err) {
        console.error("[account] list history failed:", err);
        historyError = "Could not load your history. Try again in a moment.";
      }
    }
  }

  const dashboardProps: AccountDashboardProps = {
    name: profileName,
    email: profileEmail,
    image: profileImage,
    pendingNewEmail,
    hasPassword,
    emailConfigured: isEmailConfigured(),
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
    membership: membershipPanel({
      membership,
      portalAvailable,
      welcome: query.premium === "welcome",
      unavailable: membershipUnavailable,
    }),
  };

  return (
    <main className="account-page bg-bg" data-density="compact">
      {signedIn ? (
        <AccountDashboard {...dashboardProps} />
      ) : (
        <>
          <header className="border-b border-border bg-white">
            <div className="section-shell py-6 md:py-8">
              <div className="mx-auto max-w-xl">
                <p className="eyebrow">Alex Journeys</p>
                <h1 className="font-display text-display mt-2 text-heading">
                  Your journal
                </h1>
                <p className="mt-2 max-w-xl text-sm text-muted md:text-base">
                  Sign in to keep trip plans, favorite hotels, and saved stories with you on any device.
                </p>
              </div>
            </div>
          </header>
          <div className="section-shell section-band">
          <div className="mx-auto max-w-md">
            <Suspense
              fallback={
                <div className="panel p-4">
                  <p className="text-sm text-muted">Loading…</p>
                </div>
              }
            >
              <AccountSignIn
                googleConfigured={isOauthConfigured() && isGoogleAuthConfigured()}
                twitterConfigured={isOauthConfigured() && isTwitterAuthConfigured()}
                credentialsConfigured={isCredentialsAuthConfigured()}
              />
            </Suspense>
          </div>
        </div>
        </>
      )}
    </main>
  );
}
