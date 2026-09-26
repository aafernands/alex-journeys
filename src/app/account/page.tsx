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
import { dateSummary } from "@/lib/trip-planner-model";
import { getTripPlannerConfig } from "@/lib/trip-planner";
import {
  plannerStateFromTrip,
  TRIPS_LIST_UNAVAILABLE,
} from "@/lib/trip-record";
import { listTrips, TripsUnavailableError } from "@/lib/trips";

export const metadata: Metadata = {
  title: "Account",
  description:
    "Your Alex Journeys journal — trips you’re planning and stories you’ve saved.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/account" },
};

export const dynamic = "force-dynamic";

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

export default async function AccountPage() {
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
  if (signedIn && userId) {
    if (!isFirebaseConfigured()) {
      tripsError =
        "Saving trips to your account isn’t available on this site yet. You can still plan in this browser.";
    } else {
      try {
        const flexibleDates = getTripPlannerConfig().flexibleDates;
        trips = (await listTrips(userId)).map((trip) => ({
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
    posts,
    postsError,
    hotels,
    hotelsError,
  };

  return (
    <main className="account-page bg-bg" data-density="compact">
      <header className="border-b border-border bg-white">
        <div className="section-shell py-6 md:py-8">
          <div className={`mx-auto ${signedIn ? "max-w-5xl" : "max-w-xl"}`}>
            <p className="eyebrow">Alex Journeys</p>
            <h1 className="font-display text-display mt-2 text-heading">
              Your journal
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted md:text-base">
              {signedIn
                ? "Trips you’re planning, favorite hotels, saved stories, and your account details."
                : "Sign in to keep trip plans, favorite hotels, and saved stories with you on any device."}
            </p>
          </div>
        </div>
      </header>

      {signedIn ? (
        <AccountDashboard {...dashboardProps} />
      ) : (
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
      )}
    </main>
  );
}
