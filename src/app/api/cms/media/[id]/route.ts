import { NextResponse } from "next/server";
import { isCmsAuthenticated } from "@/lib/cms/auth";
import {
  deleteMediaItem,
  isGithubConfigured,
  updateMediaItem,
} from "@/lib/cms/github";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
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

  const { id } = await ctx.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Missing media id." }, { status: 400 });
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

  if (typeof input.alt !== "string") {
    return NextResponse.json(
      { error: "Provide { alt: string }." },
      { status: 400 },
    );
  }

  try {
    const result = await updateMediaItem(id, { alt: input.alt });
    return NextResponse.json({
      ok: true,
      item: result.item,
      commitUrl: result.commitUrl,
      note: "Alt text updated in media index.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed.";
    const status = message.includes("not found") ? 404 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
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

  const { id } = await ctx.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Missing media id." }, { status: 400 });
  }

  try {
    const result = await deleteMediaItem(id);
    return NextResponse.json({
      ok: true,
      id,
      commitUrl: result.commitUrl,
      deletedFile: result.deletedFile,
      note: result.deletedFile
        ? "Removed from index and deleted uploaded file."
        : "Removed from index (CDN/external URL left unchanged; posts still reference it).",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Delete failed.";
    const status = message.includes("not found") ? 404 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
