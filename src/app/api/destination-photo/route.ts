import { findDestinationPhoto } from "@/lib/destination-photo";
import { getTripPlannerConfig } from "@/lib/trip-planner";

export async function GET(request: Request) {
  const destination = new URL(request.url).searchParams.get("destination")?.trim() ?? "";
  if (!destination || destination.length > 160) {
    return Response.json({ error: "Provide a destination up to 160 characters." }, { status: 400 });
  }
  const photo = await findDestinationPhoto(destination, getTripPlannerConfig().fallbackImage);
  return Response.json({ photo }, {
    headers: { "Cache-Control": "no-store" },
  });
}
