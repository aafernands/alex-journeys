import { NextResponse } from "next/server";
import { memberFileDecision, readReaderAccess } from "@/lib/premium-access";
import { attachmentDisposition, cleanDownloadId } from "@/lib/member-downloads-shared";
import { DownloadsUnavailableError, readDownloadFile } from "@/lib/member-downloads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Robots-Tag": "noindex, nofollow",
};

function deny(status: number, error: string) {
  return NextResponse.json({ error }, { status, headers: PRIVATE_HEADERS });
}

/**
 * GET /api/premium/download/{id}: a members-only file. Membership is checked
 * here on the server on every request (401 signed out, 403 not a member).
 * The file has no public URL anywhere else.
 */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await readReaderAccess();
  const decision = memberFileDecision(access);
  if (!decision.ok) return deny(decision.status, decision.error);

  const { id: rawId } = await context.params;
  const id = cleanDownloadId(rawId);
  if (!id) return deny(404, "That download isn\u2019t here.");

  try {
    const file = await readDownloadFile(id);
    if (!file) return deny(404, "That download isn\u2019t here.");
    return new Response(new Uint8Array(file.bytes), {
      status: 200,
      headers: {
        ...PRIVATE_HEADERS,
        "Content-Type": file.download.contentType,
        "Content-Length": String(file.bytes.length),
        "Content-Disposition": attachmentDisposition(file.download.fileName),
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    if (err instanceof DownloadsUnavailableError) {
      return deny(503, "Downloads aren\u2019t available right now. Try again in a little while.");
    }
    console.error("[premium/download] failed:", err);
    return deny(500, "Could not open that download.");
  }
}
