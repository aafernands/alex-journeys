/**
 * Cloudflare Turnstile server verification.
 *
 * Behavior when env is partial:
 * - `TURNSTILE_SECRET_KEY` set → require a valid token (siteverify).
 * - Secret not set → skip verification so local/dev is not blocked.
 * - Client: when `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is set, the widget is shown
 *   and forms should block submit without a token.
 *
 * See docs/TURNSTILE.md.
 */

const SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export type TurnstileVerifyResult = {
  ok: boolean;
  error?: string;
  /** True when verification was skipped because no secret is configured. */
  skipped?: boolean;
};

export function isTurnstileSecretConfigured(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY?.trim());
}

export function isTurnstileSiteKeyConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim());
}

/**
 * Verify a Turnstile response token with Cloudflare.
 * Returns `{ ok: true, skipped: true }` when the secret is not configured.
 */
export async function verifyTurnstileToken(
  token: string | null | undefined,
  ip?: string | null,
): Promise<TurnstileVerifyResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) {
    return { ok: true, skipped: true };
  }

  const response = typeof token === "string" ? token.trim() : "";
  if (!response) {
    return {
      ok: false,
      error: "Please complete the security check before submitting.",
    };
  }

  try {
    const body = new URLSearchParams();
    body.set("secret", secret);
    body.set("response", response);
    if (ip) body.set("remoteip", ip);

    const res = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    });

    const data = (await res.json().catch(() => null)) as {
      success?: boolean;
      "error-codes"?: string[];
    } | null;

    if (!res.ok || !data?.success) {
      const codes = data?.["error-codes"]?.join(", ") || `HTTP ${res.status}`;
      console.warn("[turnstile] siteverify failed:", codes);
      return {
        ok: false,
        error: "Security check failed. Please try again.",
      };
    }

    return { ok: true };
  } catch (err) {
    console.error("[turnstile] siteverify request error:", err);
    return {
      ok: false,
      error: "Could not verify security check. Please try again.",
    };
  }
}

/** Client IP from common proxy headers (Vercel / Cloudflare). */
export function clientIpFromRequest(request: Request): string | undefined {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = request.headers.get("x-real-ip")?.trim();
  return real || undefined;
}

/**
 * Read `turnstileToken` from a JSON body object and verify when secret is set.
 * Convenience for API routes.
 */
export async function requireTurnstileFromBody(
  body: unknown,
  request: Request,
): Promise<TurnstileVerifyResult> {
  const token =
    typeof body === "object" &&
    body !== null &&
    "turnstileToken" in body &&
    typeof (body as { turnstileToken?: unknown }).turnstileToken === "string"
      ? (body as { turnstileToken: string }).turnstileToken
      : undefined;

  return verifyTurnstileToken(token, clientIpFromRequest(request));
}
