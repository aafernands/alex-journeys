import { NextResponse } from "next/server";
import { isCmsAuthenticated } from "@/lib/cms/auth";
import { isGithubConfigured, updateAuthorPhoto } from "@/lib/cms/github";

export const runtime = "nodejs";

const MAX_BYTES = Math.floor(2.5 * 1024 * 1024);
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

function parseDataUrl(dataUrl: string): { contentType: string; base64: string } | null {
  const match = /^data:([^;,]+);base64,([\s\S]+)$/i.exec(dataUrl.trim());
  if (!match) return null;
  return {
    contentType: match[1].trim().toLowerCase(),
    base64: match[2].replace(/\s/g, ""),
  };
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

  let contentType: string;
  let base64: string;
  let filename: string | undefined;

  try {
    if (contentTypeHeader.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
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
      contentType = (file.type || "application/octet-stream").toLowerCase();
      filename = file.name || undefined;
      const buf = Buffer.from(await file.arrayBuffer());
      base64 = buf.toString("base64");
    } else {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
      }
      const dataUrl =
        typeof body === "object" &&
        body !== null &&
        typeof (body as { dataUrl?: unknown }).dataUrl === "string"
          ? (body as { dataUrl: string }).dataUrl
          : null;
      if (!dataUrl) {
        return NextResponse.json(
          { error: "Expected JSON { dataUrl: \"data:image/...;base64,...\" }." },
          { status: 400 },
        );
      }
      const parsed = parseDataUrl(dataUrl);
      if (!parsed) {
        return NextResponse.json(
          { error: "Invalid data URL. Use data:image/...;base64,..." },
          { status: 400 },
        );
      }
      contentType = parsed.contentType;
      base64 = parsed.base64;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not read upload.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (!ALLOWED.has(contentType)) {
    return NextResponse.json(
      {
        error:
          "Unsupported image type. Use JPEG, PNG, or WebP.",
      },
      { status: 400 },
    );
  }

  const approxBytes = Math.floor((base64.length * 3) / 4);
  if (approxBytes > MAX_BYTES) {
    return NextResponse.json(
      { error: "Image too large. Max is about 2.5MB." },
      { status: 400 },
    );
  }

  try {
    const result = await updateAuthorPhoto({ base64, contentType, filename });
    return NextResponse.json({
      ok: true,
      src: result.src,
      commitUrl: result.commitUrl,
      note: "Committed to main. Live on About, Footer, blog posts, AuthorIntro, and media kit after the Vercel redeploy finishes.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
