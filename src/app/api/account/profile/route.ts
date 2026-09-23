import { NextResponse } from "next/server";
import { auth, isReaderAuthConfigured } from "@/auth";
import { rateLimit } from "@/lib/cms/rate-limit";
import {
  updateUserProfile,
  UsersUnavailableError,
} from "@/lib/users";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = Math.floor(400 * 1024);
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

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

export async function PATCH(request: Request) {
  if (!isReaderAuthConfigured()) {
    return NextResponse.json(
      { error: "Profile updates are unavailable." },
      { status: 503 },
    );
  }

  const session = await auth();
  const userId = session?.user?.id?.trim();
  if (!userId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const limited = await rateLimit(`account-profile:${userId}:${ip}`, 20, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Try again shortly." },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      },
    );
  }

  const contentTypeHeader = request.headers.get("content-type") || "";

  let name: string | null | undefined = undefined;
  let image: string | null | undefined = undefined;

  try {
    if (contentTypeHeader.includes("multipart/form-data")) {
      const form = await request.formData();
      if (form.has("name")) {
        const raw = form.get("name");
        name = typeof raw === "string" ? raw : null;
      }
      if (form.has("clearImage") && String(form.get("clearImage")) === "1") {
        image = null;
      }
      const file = form.get("file");
      if (file instanceof File && file.size > 0) {
        if (file.size > MAX_UPLOAD_BYTES) {
          return NextResponse.json(
            { error: "Image too large. Max is about 400KB." },
            { status: 400 },
          );
        }
        const mime = (file.type || "application/octet-stream").toLowerCase();
        if (!ALLOWED.has(mime)) {
          return NextResponse.json(
            { error: "Unsupported image type. Use JPEG, PNG, or WebP." },
            { status: 400 },
          );
        }
        const buf = Buffer.from(await file.arrayBuffer());
        image = `data:${mime};base64,${buf.toString("base64")}`;
      } else if (form.has("imageUrl")) {
        const raw = form.get("imageUrl");
        if (typeof raw === "string") {
          image = raw.trim() ? raw.trim() : null;
        }
      }
    } else {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json(
          { error: "Invalid JSON body." },
          { status: 400 },
        );
      }
      if (typeof body !== "object" || body === null) {
        return NextResponse.json({ error: "Invalid body." }, { status: 400 });
      }
      const record = body as {
        name?: unknown;
        image?: unknown;
        imageUrl?: unknown;
        clearImage?: unknown;
      };
      if ("name" in record) {
        name =
          record.name == null
            ? null
            : typeof record.name === "string"
              ? record.name
              : undefined;
        if (name === undefined) {
          return NextResponse.json(
            { error: "name must be a string or null." },
            { status: 400 },
          );
        }
      }
      if (record.clearImage === true) {
        image = null;
      } else if (typeof record.image === "string") {
        const trimmed = record.image.trim();
        if (trimmed.startsWith("data:")) {
          const parsed = parseDataUrl(trimmed);
          if (!parsed || !ALLOWED.has(parsed.contentType)) {
            return NextResponse.json(
              {
                error:
                  "Invalid image data URL. Use JPEG, PNG, or WebP base64.",
              },
              { status: 400 },
            );
          }
          const approxBytes = Math.floor((parsed.base64.length * 3) / 4);
          if (approxBytes > MAX_UPLOAD_BYTES) {
            return NextResponse.json(
              { error: "Image too large. Max is about 400KB." },
              { status: 400 },
            );
          }
          image = trimmed;
        } else {
          image = trimmed || null;
        }
      } else if (typeof record.imageUrl === "string") {
        image = record.imageUrl.trim() || null;
      } else if ("image" in record && record.image === null) {
        image = null;
      }
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not read profile update.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (name === undefined && image === undefined) {
    return NextResponse.json(
      { error: "Provide name and/or image to update." },
      { status: 400 },
    );
  }

  try {
    const user = await updateUserProfile(userId, { name, image });
    return NextResponse.json({
      ok: true,
      message: "Profile updated.",
      name: user.name,
      image: user.image,
      email: user.email,
    });
  } catch (err) {
    if (err instanceof UsersUnavailableError) {
      return NextResponse.json(
        { error: "Profile updates are temporarily unavailable." },
        { status: 503 },
      );
    }
    const message =
      err instanceof Error ? err.message : "Could not update profile.";
    const clientError =
      message.includes("Name must") ||
      message.includes("Image") ||
      message.includes("Nothing to update") ||
      message.includes("not found") ||
      message.includes("disabled") ||
      message.includes("https URL");
    if (!clientError) {
      console.error("[api/account/profile] failed:", err);
    }
    return NextResponse.json(
      { error: clientError ? message : "Could not update profile." },
      { status: clientError ? 400 : 500 },
    );
  }
}
