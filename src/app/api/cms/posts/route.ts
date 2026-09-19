import { NextResponse } from "next/server";
import { isCmsAuthenticated } from "@/lib/cms/auth";
import { isGithubConfigured, publishPost } from "@/lib/cms/github";
import { validatePostInput } from "@/lib/cms/validate";

export const runtime = "nodejs";

export async function POST(request: Request) {
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const input =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>)
      : {};

  const validated = validatePostInput(input);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const update = Boolean(input.update);

  try {
    const result = await publishPost(validated.data, { update });
    return NextResponse.json({
      ok: true,
      slug: result.slug,
      created: result.created,
      commitUrl: result.commitUrl,
      note: "Committed to main. Vercel will redeploy shortly — the new post will appear after the deploy finishes.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Publish failed.";
    const status = message.includes("already exists") ? 409 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
