import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isFirebaseConfigured } from "@/lib/firebase-admin";
import {
  parseTripWrite,
  TRIPS_ACCOUNT_UNAVAILABLE,
  TRIPS_LIST_UNAVAILABLE,
} from "@/lib/trip-record";
import {
  createTrip,
  listTrips,
  TripLimitError,
  TripsUnavailableError,
} from "@/lib/trips";

export const runtime = "nodejs";

function firebaseUnavailable(error: string) {
  return NextResponse.json({ error }, { status: 503 });
}

async function requireReaderId(): Promise<{ userId: string } | NextResponse> {
  const session = await auth();
  const userId = session?.user?.id?.trim();
  if (!session?.user || !userId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  return { userId };
}

function clientError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/** GET /api/trips — list trips for the current reader. */
export async function GET() {
  const gate = await requireReaderId();
  if (gate instanceof NextResponse) return gate;
  if (!isFirebaseConfigured()) return firebaseUnavailable(TRIPS_LIST_UNAVAILABLE);

  try {
    const trips = await listTrips(gate.userId);
    return NextResponse.json({ trips });
  } catch (err) {
    if (err instanceof TripsUnavailableError) {
      return firebaseUnavailable(TRIPS_LIST_UNAVAILABLE);
    }
    console.error("[api/trips] GET failed:", err);
    return NextResponse.json({ error: "Could not load trips." }, { status: 500 });
  }
}

/** POST /api/trips — create a trip from the current itinerary. */
export async function POST(request: Request) {
  const gate = await requireReaderId();
  if (gate instanceof NextResponse) return gate;
  if (!isFirebaseConfigured()) return firebaseUnavailable(TRIPS_ACCOUNT_UNAVAILABLE);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return clientError("Invalid JSON body.", 400);
  }

  const parsed = parseTripWrite(body);
  if (!parsed.ok) return clientError(parsed.error, 400);

  try {
    const trip = await createTrip(gate.userId, parsed.data);
    return NextResponse.json({ ok: true, trip });
  } catch (err) {
    if (err instanceof TripsUnavailableError) {
      return firebaseUnavailable(TRIPS_ACCOUNT_UNAVAILABLE);
    }
    if (err instanceof TripLimitError) return clientError(err.message, 409);
    const message = err instanceof Error ? err.message : "Save failed.";
    if (message === "Invalid user id.") return clientError(message, 400);
    console.error("[api/trips] POST failed:", err);
    return NextResponse.json({ error: "Could not save trip." }, { status: 500 });
  }
}
