import { NextResponse } from "next/server";
import { isCmsAuthenticated } from "@/lib/cms/auth";
import {
  addMediaByUrl,
  isGithubConfigured,
  uploadMediaFile,
} from "@/lib/cms/github";
import { getAllMedia, readMediaIndex } from "@/lib/cms/media";

export const runtime = "nodejs";

const MAX_BYTES = Math.floor(2.5 * 1024 * 1024);
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
  const index = readMediaIndex();
  return NextResponse.json({
    ok: true,
    updatedAt: index.updatedAt,
    count: index.count,
    items: getAllMedia(),
  });
}

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

  const contentTypeHeader = request.headers.get("content-type") || "";

  try {
    if (contentTypeHeader.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      const alt =
        typeof form.get("alt") === "string" ? String(form.get("alt")) : "";
      if (!(file instanceof File)) {
        return NextResponse.json(
          { error: "Missing file field in multipart body." },
          { status: 400 },
        );
      }
      if (file.size > MAX_BYTES) {
        return NextResponse.json(
          { error: "Image too large. Max is about 2.5MB." },
          { status: 400 },
        );
      }
      const type = (file.type || "application/octet-stream").toLowerCase();
      if (!ALLOWED.has(type)) {
        return NextResponse.json(
          { error: "Unsupported image type. Use JPEG, PNG, WebP, or GIF." },
          { status: 400 },
        );
      }
      const buf = Buffer.from(await file.arrayBuffer());
      const result = await uploadMediaFile({
        base64: buf.toString("base64"),
        contentType: type,
        filename: file.name,
        alt,
      });
      return NextResponse.json({
        ok: true,
        item: result.item,
        commitUrl: result.commitUrl,
        note: "Uploaded to public/media and registered in the media index. Live after Vercel redeploy.",
      });
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

    // Upload via data URL
    if (typeof input.dataUrl === "string") {
      const parsed = parseDataUrl(input.dataUrl);
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
          { error: "Image too large. Max is about 2.5MB." },
          { status: 400 },
        );
      }
      const result = await uploadMediaFile({
        base64: parsed.base64,
        contentType: parsed.contentType,
        filename: typeof input.filename === "string" ? input.filename : undefined,
        alt: typeof input.alt === "string" ? input.alt : undefined,
      });
      return NextResponse.json({
        ok: true,
        item: result.item,
        commitUrl: result.commitUrl,
        note: "Uploaded to public/media and registered in the media index. Live after Vercel redeploy.",
      });
    }

    // Add by URL
    const url = typeof input.url === "string" ? input.url.trim() : "";
    if (!url) {
      return NextResponse.json(
        { error: "Provide url, dataUrl, or multipart file." },
        { status: 400 },
      );
    }
    const result = await addMediaByUrl({
      url,
      alt: typeof input.alt === "string" ? input.alt : undefined,
      width: typeof input.width === "number" ? input.width : undefined,
      height: typeof input.height === "number" ? input.height : undefined,
    });
    return NextResponse.json({
      ok: true,
      item: result.item,
      created: result.created,
      commitUrl: result.commitUrl || undefined,
      note: result.created
        ? "Added to media index. Live after Vercel redeploy."
        : "Already in library (alt updated if provided).",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Media save failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
