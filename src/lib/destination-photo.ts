export type DestinationPhoto = {
  image: string;
  photographer: string;
  photographerUrl: string;
  source: string;
  sourceUrl: string;
  license: string;
};

function cleanDestination(value: string): string {
  return value.replace(/[<>"'&]/g, "").replace(/\s+/g, " ").trim().slice(0, 80);
}

/** A local, attribution-free image that keeps the hero visual even offline. */
export function fallbackDestinationPhoto(destination: string): DestinationPhoto {
  const label = cleanDestination(destination) || "Your destination";
  const encoded = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900"><rect width="1600" height="900" fill="#243c48"/><path d="M0 690C260 520 410 760 650 600s390-40 520 40 260 70 430-80v340H0Z" fill="#d18a4b"/><path d="M0 760c260-120 400 30 650-90s430 10 950-60v290H0Z" fill="#13242d" opacity=".7"/><circle cx="1260" cy="190" r="92" fill="#e8c88a"/><path d="M180 610c150-130 260-130 410 0M690 650c130-160 250-160 390 0" fill="none" stroke="#f4dfb0" stroke-width="18" stroke-linecap="round" opacity=".75"/><text x="90" y="150" fill="#fff7e8" font-family="Georgia,serif" font-size="68" font-weight="700">${label}</text><text x="94" y="205" fill="#f4dfb0" font-family="Arial,sans-serif" font-size="22" letter-spacing="5">YOUR JOURNEY STARTS HERE</text></svg>`,
  );
  return {
    image: `data:image/svg+xml;charset=UTF-8,${encoded}`,
    photographer: "Alex Journeys",
    photographerUrl: "/destinations",
    source: "Alex Journeys artwork",
    sourceUrl: "/destinations",
    license: "Original artwork",
  };
}

function plainMetadata(value: unknown): string {
  return typeof value === "string"
    ? value.replace(/<[^>]*>/g, "").replace(/&(?:amp|quot|lt|gt);/g, (token) => ({
        "&amp;": "&",
        "&quot;": '"',
        "&lt;": "<",
        "&gt;": ">",
      })[token] ?? token).trim().slice(0, 120)
    : "";
}

function validImageUrl(value: unknown, hostname: string): URL | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === hostname ? url : null;
  } catch {
    return null;
  }
}

async function findCommonsPhoto(destination: string): Promise<DestinationPhoto | null> {
  const query = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrsearch: `${destination.trim()} landmark`,
    gsrnamespace: "6",
    gsrlimit: "1",
    prop: "imageinfo",
    iiprop: "url|extmetadata",
    iiurlwidth: "1800",
    format: "json",
    origin: "*",
  });
  try {
    const response = await fetch(`https://commons.wikimedia.org/w/api.php?${query}`, {
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) return null;
    const body = await response.json();
    const page = Object.values(body?.query?.pages ?? {})[0] as {
      title?: unknown;
      imageinfo?: Array<{
        thumburl?: unknown;
        descriptionurl?: unknown;
        extmetadata?: {
          Artist?: { value?: unknown };
          LicenseShortName?: { value?: unknown };
        };
      }>;
    } | undefined;
    const info = page?.imageinfo?.[0];
    const image = validImageUrl(info?.thumburl, "upload.wikimedia.org");
    const fileUrl =
      typeof info?.descriptionurl === "string" && info.descriptionurl.startsWith("https://commons.wikimedia.org/")
        ? info.descriptionurl
        : `https://commons.wikimedia.org/wiki/${encodeURIComponent(String(page?.title ?? ""))}`;
    const artist = plainMetadata(info?.extmetadata?.Artist?.value);
    const license = plainMetadata(info?.extmetadata?.LicenseShortName?.value);
    if (!image || !fileUrl || !page?.title || !artist || !license) return null;
    return {
      image: image.toString(),
      photographer: artist,
      photographerUrl: fileUrl,
      source: "Wikimedia Commons",
      sourceUrl: fileUrl,
      license,
    };
  } catch {
    return null;
  }
}

/** Server-side lookup: preserve the full place name to disambiguate cities. */
export async function findDestinationPhoto(destination: string): Promise<DestinationPhoto | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY?.trim();
  if (!destination.trim()) return null;
  const fallback = fallbackDestinationPhoto(destination);
  if (!key) return (await findCommonsPhoto(destination)) ?? fallback;
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
    if (!response.ok) return (await findCommonsPhoto(destination)) ?? fallback;
    const body = await response.json();
    const photo = body.results?.[0];
    if (
      typeof photo?.urls?.regular !== "string" ||
      typeof photo?.user?.links?.html !== "string" ||
      typeof photo?.user?.name !== "string"
    ) {
      return (await findCommonsPhoto(destination)) ?? fallback;
    }
    const image = validImageUrl(photo.urls.regular, "images.unsplash.com");
    const profile = validImageUrl(photo.user.links.html, "unsplash.com");
    if (!image || !profile) return (await findCommonsPhoto(destination)) ?? fallback;
    image.searchParams.set("w", "1800");
    image.searchParams.set("q", "85");
    profile.searchParams.set("utm_source", "alex_journeys");
    profile.searchParams.set("utm_medium", "referral");
    return {
      image: image.toString(),
      photographer: photo.user.name,
      photographerUrl: profile.toString(),
      source: "Unsplash",
      sourceUrl: "https://unsplash.com/",
      license: "Unsplash License",
    };
  } catch {
    return (await findCommonsPhoto(destination)) ?? fallback;
  }
}
