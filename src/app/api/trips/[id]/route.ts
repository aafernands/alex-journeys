import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isFirebaseConfigured } from "@/lib/firebase-admin";
import {
  parseTitleOnlyPatch,
  parseTripWrite,
  TRIPS_ACCOUNT_UNAVAILABLE,
  TRIPS_LIST_UNAVAILABLE,
} from "@/lib/trip-record";
import {
  deleteTrip,
  getTrip,
  renameTrip,
  TripsUnavailableError,
  updateTrip,
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

type RouteContext = { params: Promise<{ id: string }> };

function invalidIdResponse(err: unknown): NextResponse | null {
  const message = err instanceof Error ? err.message : "";
  if (message === "Invalid trip id." || message === "Invalid user id.") {
    return clientError(message, 400);
  }
  return null;
}

/** GET /api/trips/[id] — one trip for the current reader. */
export async function GET(_request: Request, context: RouteContext) {
  const gate = await requireReaderId();
  if (gate instanceof NextResponse) return gate;
  if (!isFirebaseConfigured()) return firebaseUnavailable(TRIPS_LIST_UNAVAILABLE);

  const { id } = await context.params;
  try {
    const trip = await getTrip(gate.userId, id);
    if (!trip) return clientError("Trip not found.", 404);
    return NextResponse.json({ trip });
  } catch (err) {
    if (err instanceof TripsUnavailableError) {
      return firebaseUnavailable(TRIPS_LIST_UNAVAILABLE);
    }
    const invalid = invalidIdResponse(err);
    if (invalid) return invalid;
    console.error("[api/trips/id] GET failed:", err);
    return NextResponse.json({ error: "Could not load trip." }, { status: 500 });
  }
}

/** PATCH /api/trips/[id] — replace trip fields, or `{ title }` to rename. */
export async function PATCH(request: Request, context: RouteContext) {
  const gate = await requireReaderId();
  if (gate instanceof NextResponse) return gate;
  if (!isFirebaseConfigured()) return firebaseUnavailable(TRIPS_ACCOUNT_UNAVAILABLE);

  const { id } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return clientError("Invalid JSON body.", 400);
  }

  const titlePatch = parseTitleOnlyPatch(body);
  if (titlePatch) {
    if (!titlePatch.ok) return clientError(titlePatch.error, 400);
    try {
      const trip = await renameTrip(gate.userId, id, titlePatch.title);
      if (!trip) return clientError("Trip not found.", 404);
      return NextResponse.json({ ok: true, trip });
    } catch (err) {
      if (err instanceof TripsUnavailableError) {
        return firebaseUnavailable(TRIPS_ACCOUNT_UNAVAILABLE);
      }
      const invalid = invalidIdResponse(err);
      if (invalid) return invalid;
      console.error("[api/trips/id] rename failed:", err);
      return NextResponse.json({ error: "Could not rename trip." }, { status: 500 });
    }
  }

  const parsed = parseTripWrite(body);
  if (!parsed.ok) return clientError(parsed.error, 400);

  try {
    const trip = await updateTrip(gate.userId, id, parsed.data);
    if (!trip) return clientError("Trip not found.", 404);
    return NextResponse.json({ ok: true, trip });
  } catch (err) {
    if (err instanceof TripsUnavailableError) {
      return firebaseUnavailable(TRIPS_ACCOUNT_UNAVAILABLE);
    }
    const invalid = invalidIdResponse(err);
    if (invalid) return invalid;
    console.error("[api/trips/id] PATCH failed:", err);
    return NextResponse.json({ error: "Could not update trip." }, { status: 500 });
  }
}

/** DELETE /api/trips/[id] — remove a saved trip. */
export async function DELETE(_request: Request, context: RouteContext) {
  const gate = await requireReaderId();
  if (gate instanceof NextResponse) return gate;
  if (!isFirebaseConfigured()) return firebaseUnavailable(TRIPS_ACCOUNT_UNAVAILABLE);

  const { id } = await context.params;
  try {
    await deleteTrip(gate.userId, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof TripsUnavailableError) {
      return firebaseUnavailable(TRIPS_ACCOUNT_UNAVAILABLE);
    }
    const invalid = invalidIdResponse(err);
    if (invalid) return invalid;
    console.error("[api/trips/id] DELETE failed:", err);
    return NextResponse.json({ error: "Could not delete trip." }, { status: 500 });
  }
}
