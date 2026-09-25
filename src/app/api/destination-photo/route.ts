import { findDestinationPhoto } from "@/lib/destination-photo";

export async function GET(request: Request) {
  const destination = new URL(request.url).searchParams.get("destination")?.trim() ?? "";
  if (!destination || destination.length > 160) {
    return Response.json({ error: "Provide a destination up to 160 characters." }, { status: 400 });
  }
  const photo = await findDestinationPhoto(destination);
  return Response.json({ photo }, {
    headers: { "Cache-Control": photo ? "public, s-maxage=86400, stale-while-revalidate=3600" : "no-store" },
  });
}
