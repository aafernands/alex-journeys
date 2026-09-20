import { NextResponse } from "next/server";
import { isCmsAuthenticated } from "@/lib/cms/auth";
import { isGithubConfigured, publishMediaIndex } from "@/lib/cms/github";
import { buildMediaIndexFromContent, readMediaIndex } from "@/lib/cms/media";

export const runtime = "nodejs";

export async function POST() {
  if (!(await isCmsAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!isGithubConfigured()) {
    return NextResponse.json(
      {
        error:
          "GitHub token not configured. Set CMS_GITHUB_TOKEN (or GITHUB_TOKEN).",
      },
      { status: 503 },
    );
  }

  try {
    const previous = readMediaIndex();
    const next = buildMediaIndexFromContent(previous);
    const result = await publishMediaIndex(next);
    return NextResponse.json({
      ok: true,
      count: next.count,
      commitUrl: result.commitUrl,
      note: "Rescanned posts/pages and published media index.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Reindex failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
