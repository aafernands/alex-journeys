import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isFirebaseConfigured } from "@/lib/firebase-admin";
import {
  addSavedHotel,
  listSavedHotels,
  removeSavedHotel,
  SavedHotelsUnavailableError,
} from "@/lib/saved-hotels";

export const runtime = "nodejs";

function unavailable() {
  return NextResponse.json(
    { error: "Saved hotels are temporarily unavailable." },
    { status: 503 },
  );
}

async function requireUser(): Promise<{ userId: string } | NextResponse> {
  const session = await auth();
  const userId = session?.user?.id?.trim();
  if (!session?.user || !userId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  return { userId };
}

function asBody(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export async function GET() {
  if (!isFirebaseConfigured()) return unavailable();
  const gate = await requireUser();
  if (gate instanceof NextResponse) return gate;
  try {
    const hotels = await listSavedHotels(gate.userId);
    return NextResponse.json({ hotels });
  } catch (error) {
    if (error instanceof SavedHotelsUnavailableError) return unavailable();
    console.error("[api/saved-hotels] GET failed:", error);
    return NextResponse.json({ error: "Could not load saved hotels." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isFirebaseConfigured()) return unavailable();
  const gate = await requireUser();
  if (gate instanceof NextResponse) return gate;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const record = asBody(body);
  if (!record) return NextResponse.json({ error: "Invalid hotel." }, { status: 400 });

  try {
    const hotel = await addSavedHotel(
      gate.userId,
      {
        hotelId: typeof record.hotelId === "string" ? record.hotelId : "",
        name: typeof record.name === "string" ? record.name : "",
        city: typeof record.city === "string" ? record.city : "",
        neighborhood: typeof record.neighborhood === "string" ? record.neighborhood : "",
        photo: typeof record.photo === "string" ? record.photo : "",
        rating: typeof record.rating === "number" ? record.rating : null,
        stars: typeof record.stars === "number" ? record.stars : null,
      },
      {
        destination: typeof record.destination === "string" ? record.destination : "",
        startDate: typeof record.startDate === "string" ? record.startDate : "",
        endDate: typeof record.endDate === "string" ? record.endDate : "",
        adults: typeof record.adults === "number" ? record.adults : undefined,
        children: typeof record.children === "number" ? record.children : undefined,
        rooms: typeof record.rooms === "number" ? record.rooms : undefined,
        tripId: typeof record.tripId === "string" ? record.tripId : "",
      },
    );
    return NextResponse.json({ ok: true, hotel });
  } catch (error) {
    if (error instanceof SavedHotelsUnavailableError) return unavailable();
    const message = error instanceof Error ? error.message : "Save failed.";
    if (/Invalid|Missing/.test(message)) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error("[api/saved-hotels] POST failed:", error);
    return NextResponse.json({ error: "Could not save hotel." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!isFirebaseConfigured()) return unavailable();
  const gate = await requireUser();
  if (gate instanceof NextResponse) return gate;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const record = asBody(body);
  const hotelId = typeof record?.hotelId === "string" ? record.hotelId : "";
  if (!hotelId) return NextResponse.json({ error: "Missing hotel id." }, { status: 400 });

  try {
    await removeSavedHotel(gate.userId, hotelId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof SavedHotelsUnavailableError) return unavailable();
    console.error("[api/saved-hotels] DELETE failed:", error);
    return NextResponse.json({ error: "Could not remove saved hotel." }, { status: 500 });
  }
}
