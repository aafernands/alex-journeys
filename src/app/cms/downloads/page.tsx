import { redirect } from "next/navigation";
import { DownloadsManager } from "@/components/cms/DownloadsManager";
import { isCmsAuthenticated } from "@/lib/cms/auth";
import { DownloadsUnavailableError, listDownloads } from "@/lib/member-downloads";
import type { MemberDownload } from "@/lib/member-downloads-shared";

export const dynamic = "force-dynamic";

export default async function CmsDownloadsPage() {
  if (!(await isCmsAuthenticated())) {
    redirect("/cms");
  }
  let rows: MemberDownload[] = [];
  let unavailable: string | null = null;
  try {
    rows = await listDownloads();
  } catch (err) {
    unavailable =
      err instanceof DownloadsUnavailableError
        ? "Downloads need Firestore. Set the Firebase environment variables to add files."
        : "Could not load downloads. Try again in a moment.";
    if (!(err instanceof DownloadsUnavailableError)) console.error("[cms/downloads] load failed:", err);
  }
  return <DownloadsManager initial={rows} unavailable={unavailable} />;
}
