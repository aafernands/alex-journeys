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

function parseOptionalUpload(
  dataUrl: unknown,
  filename: unknown,
  label: string,
):
  | { ok: true; upload?: { base64: string; contentType: string; filename?: string } }
  | { ok: false; error: string } {
  if (typeof dataUrl !== "string" || !dataUrl.trim()) {
    return { ok: true, upload: undefined };
  }
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) {
    return {
      ok: false,
      error: `Invalid ${label} data URL. Use data:image/...;base64,...`,
    };
  }
  if (!ALLOWED.has(parsed.contentType)) {
    return {
      ok: false,
      error: `Unsupported ${label} type. Use JPEG, PNG, WebP, or GIF.`,
    };
  }
  const approxBytes = Math.floor((parsed.base64.length * 3) / 4);
  if (approxBytes > MAX_BYTES) {
    return {
      ok: false,
      error: `${label} too large. Max is about ${MAX_MEDIA_UPLOAD_LABEL}.`,
    };
  }
  return {
    ok: true,
    upload: {
      base64: parsed.base64,
      contentType: parsed.contentType,
      filename: typeof filename === "string" ? filename : undefined,
    },
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
      {
        error:
          "Expected JSON { design, dataUrl?, logoOnLightDataUrl?, logoOnDarkDataUrl? }.",
      },
      { status: 400 },
    );
  }

  const payload = body as {
    design?: unknown;
    dataUrl?: unknown;
    filename?: unknown;
    logoOnLightDataUrl?: unknown;
    logoOnLightFilename?: unknown;
    logoOnDarkDataUrl?: unknown;
    logoOnDarkFilename?: unknown;
    faviconDataUrl?: unknown;
    faviconFilename?: unknown;
  };

  const validated = validateSiteDesignInput(payload.design);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const heroParsed = parseOptionalUpload(
    payload.dataUrl,
    payload.filename,
    "Hero image",
  );
  if (!heroParsed.ok) {
    return NextResponse.json({ error: heroParsed.error }, { status: 400 });
  }

  const lightParsed = parseOptionalUpload(
    payload.logoOnLightDataUrl,
    payload.logoOnLightFilename,
    "Logo (on light)",
  );
  if (!lightParsed.ok) {
    return NextResponse.json({ error: lightParsed.error }, { status: 400 });
  }

  const darkParsed = parseOptionalUpload(
    payload.logoOnDarkDataUrl,
    payload.logoOnDarkFilename,
    "Logo (on dark)",
  );
  if (!darkParsed.ok) {
    return NextResponse.json({ error: darkParsed.error }, { status: 400 });
  }

  const faviconParsed = parseOptionalUpload(
    payload.faviconDataUrl,
    payload.faviconFilename,
    "Favicon",
  );
  if (!faviconParsed.ok) {
    return NextResponse.json({ error: faviconParsed.error }, { status: 400 });
  }

  try {
    const result = await updateSiteDesign({
      design: validated.design,
      imageUpload: heroParsed.upload,
      logoOnLightUpload: lightParsed.upload,
      logoOnDarkUpload: darkParsed.upload,
      faviconUpload: faviconParsed.upload,
    });
    return NextResponse.json({
      ok: true,
      design: result.design,
      commitUrl: result.commitUrl,
      note: "Committed to main. Branding and homepage design update after the Vercel redeploy finishes.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Save failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
