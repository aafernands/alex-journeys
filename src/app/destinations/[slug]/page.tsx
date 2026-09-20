import { permanentRedirect } from "next/navigation";
import { publicDestinationPath } from "@/lib/public-paths";

type PageProps = {
  params: Promise<{ slug: string }>;
};

/** Legacy `/destinations/{slug}` → canonical `/{slug}` (also in next.config). */
export default async function LegacyDestinationSlugRedirect({
  params,
}: PageProps) {
  const { slug } = await params;
  permanentRedirect(publicDestinationPath(slug));
}
