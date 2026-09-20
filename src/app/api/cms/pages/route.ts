import { NextResponse } from "next/server";
import { isCmsAuthenticated } from "@/lib/cms/auth";
import {
  deletePage,
  isGithubConfigured,
  publishPage,
} from "@/lib/cms/github";
import { sanitizeSlug } from "@/lib/cms/validate";
import { validatePageInput } from "@/lib/cms/validate-page";

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

  const validated = validatePageInput(input);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const update = Boolean(input.update);

  try {
    const result = await publishPage(validated.data, { update });
    return NextResponse.json({
      ok: true,
      slug: result.slug,
      created: result.created,
      commitUrl: result.commitUrl,
      note: "Committed to main. Vercel will redeploy shortly — the page updates after deploy finishes.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Publish failed.";
    const status = message.includes("already exists") ? 409 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: Request) {
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

  const slug = sanitizeSlug(input.slug);
  if (!slug) {
    return NextResponse.json({ error: "Valid slug is required." }, { status: 400 });
  }

  try {
    const result = await deletePage(slug);
    return NextResponse.json({
      ok: true,
      slug,
      commitUrl: result.commitUrl,
      commitSha: result.commitSha,
      note: "Page deleted from GitHub. Vercel will redeploy shortly.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Delete failed.";
    const status = message.includes("not found") ? 404 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
