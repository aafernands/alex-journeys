import { NextResponse } from "next/server";
import { isCmsAuthenticated } from "@/lib/cms/auth";
import {
  deleteDownload,
  DownloadsUnavailableError,
  updateDownload,
} from "@/lib/member-downloads";
import { cleanDownloadId } from "@/lib/member-downloads-shared";
import { parseDownloadForm } from "@/lib/member-downloads-form";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

function unavailable() {
  return NextResponse.json(
    { error: "Downloads need Firestore. Check the Firebase environment variables." },
    { status: 503 },
  );
}

/** PATCH /api/cms/downloads/{id}: edit details, optionally replace the file (admin only). */
export async function PATCH(request: Request, context: Context) {
  if (!(await isCmsAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const id = cleanDownloadId((await context.params).id);
  if (!id) return NextResponse.json({ error: "Download not found." }, { status: 404 });
  const parsed = await parseDownloadForm(request, { fileRequired: false });
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  try {
    const download = await updateDownload(id, parsed.meta, parsed.file);
    if (!download) return NextResponse.json({ error: "Download not found." }, { status: 404 });
    return NextResponse.json({ ok: true, download });
  } catch (err) {
    if (err instanceof DownloadsUnavailableError) return unavailable();
    console.error("[cms/downloads] update failed:", err);
    return NextResponse.json({ error: "Could not save the download." }, { status: 500 });
  }
}

/** DELETE /api/cms/downloads/{id}: remove the download and its file (admin only). */
export async function DELETE(_request: Request, context: Context) {
  if (!(await isCmsAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const id = cleanDownloadId((await context.params).id);
  if (!id) return NextResponse.json({ error: "Download not found." }, { status: 404 });
  try {
    await deleteDownload(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof DownloadsUnavailableError) return unavailable();
    console.error("[cms/downloads] delete failed:", err);
    return NextResponse.json({ error: "Could not delete the download." }, { status: 500 });
  }
}
