import { NextResponse } from "next/server";
import { isCmsAuthenticated } from "@/lib/cms/auth";
import { isGithubConfigured, updateSiteDesign } from "@/lib/cms/github";
import {
  getSiteDesign,
  validateSiteDesignInput,
} from "@/lib/site-design";
import {
  MAX_MEDIA_UPLOAD_BYTES,
  MAX_MEDIA_UPLOAD_LABEL,
} from "@/lib/cms/media-limits";

export const runtime = "nodejs";

const MAX_BYTES = MAX_MEDIA_UPLOAD_BYTES;
const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function parseDataUrl(
  dataUrl: string,
): { contentType: string; base64: string } | null {
  const match = /^data:([^;,]+);base64,([\s\S]+)$/i.exec(dataUrl.trim());
  if (!match) return null;
  return {
    contentType: match[1].trim().toLowerCase(),
    base64: match[2].replace(/\s/g, ""),
  };
}

export async function GET() {
  if (!(await isCmsAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  return NextResponse.json({ ok: true, design: getSiteDesign() });
}

export async function PUT(request: Request) {
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

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "Expected JSON { design, dataUrl? }." },
      { status: 400 },
    );
  }

  const payload = body as {
    design?: unknown;
    dataUrl?: unknown;
    filename?: unknown;
  };

  const validated = validateSiteDesignInput(payload.design);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  let imageUpload:
    | { base64: string; contentType: string; filename?: string }
    | undefined;

  if (typeof payload.dataUrl === "string" && payload.dataUrl.trim()) {
    const parsed = parseDataUrl(payload.dataUrl);
    if (!parsed) {
      return NextResponse.json(
        { error: "Invalid data URL. Use data:image/...;base64,..." },
        { status: 400 },
      );
    }
    if (!ALLOWED.has(parsed.contentType)) {
      return NextResponse.json(
        { error: "Unsupported image type. Use JPEG, PNG, WebP, or GIF." },
        { status: 400 },
      );
    }
    const approxBytes = Math.floor((parsed.base64.length * 3) / 4);
    if (approxBytes > MAX_BYTES) {
      return NextResponse.json(
        { error: `Image too large. Max is about ${MAX_MEDIA_UPLOAD_LABEL}.` },
        { status: 400 },
      );
    }
    imageUpload = {
      base64: parsed.base64,
      contentType: parsed.contentType,
      filename:
        typeof payload.filename === "string" ? payload.filename : undefined,
    };
  }

  try {
    const result = await updateSiteDesign({
      design: validated.design,
      imageUpload,
    });
    return NextResponse.json({
      ok: true,
      design: result.design,
      commitUrl: result.commitUrl,
      note: "Committed to main. Homepage hero updates after the Vercel redeploy finishes.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Save failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
