import { permanentRedirect } from "next/navigation";
import { publicPostPath } from "@/lib/public-paths";

type PageProps = {
  params: Promise<{ slug: string }>;
};

/** Legacy `/blog/{slug}` → canonical `/{slug}` (also in next.config). */
export default async function LegacyBlogSlugRedirect({ params }: PageProps) {
  const { slug } = await params;
  permanentRedirect(publicPostPath(slug));
}
