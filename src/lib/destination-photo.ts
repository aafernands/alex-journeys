export type DestinationPhoto = {
  image: string;
  photographer: string;
  photographerUrl: string;
};

/** Server-side lookup: preserve the full place name to disambiguate cities. */
export async function findDestinationPhoto(destination: string): Promise<DestinationPhoto | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY?.trim();
  if (!key || !destination.trim()) return null;
  const query = new URLSearchParams({
    query: `${destination.trim()} landscape landmark`,
    orientation: "landscape",
    content_filter: "high",
    per_page: "1",
  });
  try {
    const response = await fetch(`https://api.unsplash.com/search/photos?${query}`, {
      headers: { Authorization: `Client-ID ${key}` },
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) return null;
    const body = await response.json();
    const photo = body.results?.[0];
    if (typeof photo?.urls?.regular !== "string" || typeof photo?.user?.links?.html !== "string" || typeof photo?.user?.name !== "string") return null;
    const image = new URL(photo.urls.regular);
    const profile = new URL(photo.user.links.html);
    if (image.protocol !== "https:" || image.hostname !== "images.unsplash.com" || profile.protocol !== "https:" || profile.hostname !== "unsplash.com") return null;
    image.searchParams.set("w", "1800");
    image.searchParams.set("q", "85");
    profile.searchParams.set("utm_source", "alex_journeys");
    profile.searchParams.set("utm_medium", "referral");
    return { image: image.toString(), photographer: photo.user.name, photographerUrl: profile.toString() };
  } catch {
    return null;
  }
}
