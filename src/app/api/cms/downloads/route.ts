import { NextResponse } from "next/server";
import { isCmsAuthenticated } from "@/lib/cms/auth";
import {
  createDownload,
  DownloadsUnavailableError,
  listDownloads,
} from "@/lib/member-downloads";
import { parseDownloadForm } from "@/lib/member-downloads-form";

export const runtime = "nodejs";

function unavailable() {
  return NextResponse.json(
    { error: "Downloads need Firestore. Check the Firebase environment variables." },
    { status: 503 },
  );
}

/** GET /api/cms/downloads: every member download (admin only). */
export async function GET() {
  if (!(await isCmsAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    return NextResponse.json({ ok: true, downloads: await listDownloads() });
  } catch (err) {
    if (err instanceof DownloadsUnavailableError) return unavailable();
    console.error("[cms/downloads] list failed:", err);
    return NextResponse.json({ error: "Could not load downloads." }, { status: 500 });
  }
}

/** POST /api/cms/downloads: add a download with its file (admin only). */
export async function POST(request: Request) {
  if (!(await isCmsAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const parsed = await parseDownloadForm(request, { fileRequired: true });
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  try {
    const download = await createDownload(parsed.meta, parsed.file!);
    return NextResponse.json({ ok: true, download });
  } catch (err) {
    if (err instanceof DownloadsUnavailableError) return unavailable();
    console.error("[cms/downloads] create failed:", err);
    return NextResponse.json({ error: "Could not save the download." }, { status: 500 });
  }
}
