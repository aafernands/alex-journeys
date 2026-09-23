import { NextResponse } from "next/server";
import { suggestStay } from "@/lib/stays-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const destination = (url.searchParams.get("dest") || "").trim().slice(0, 80);
  if (!destination) {
    return NextResponse.json({ error: "Destination is required." }, { status: 400 });
  }

  const hotel = await suggestStay(destination);
  if (!hotel) {
    return NextResponse.json({ hotel: null });
  }

  return NextResponse.json({ hotel });
}
