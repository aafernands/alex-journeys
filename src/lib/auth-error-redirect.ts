import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Auth.js does not treat InvalidCheck as a client-safe error, so a state or
 * PKCE parse failure arrives as `/login?error=Configuration`. Record the real
 * type during the request and rewrite that redirect.
 */

const storage = new AsyncLocalStorage<{ code?: string }>();

function walk(
  error: unknown,
  visit: (value: unknown) => void,
  seen = new Set<unknown>(),
) {
  if (!error || typeof error !== "object" || seen.has(error)) return;
  seen.add(error);
  visit(error);
  if ("err" in error) walk(error.err, visit, seen);
  if ("cause" in error) walk(error.cause, visit, seen);
}

/** Query value for `/login?error=` when the failure is a state/PKCE check. */
export function readerFacingAuthError(error: unknown): string | null {
  let code: string | null = null;
  walk(error, (value) => {
    if (!value || typeof value !== "object" || code) return;
    const record = value as { type?: unknown; name?: unknown };
    const type = typeof record.type === "string" ? record.type : "";
    const name = typeof record.name === "string" ? record.name : "";
    if (type === "InvalidCheck" || name === "InvalidCheck") {
      code = "InvalidCheck";
    }
  });
  return code;
}

export function noteAuthError(error: unknown) {
  const store = storage.getStore();
  if (!store || store.code) return;
  const code = readerFacingAuthError(error);
  if (code) store.code = code;
}

export function takeAuthErrorCode(): string | null {
  return storage.getStore()?.code ?? null;
}

export function runWithAuthErrorCapture<T>(fn: () => Promise<T>): Promise<T> {
  return storage.run({}, fn);
}

/**
 * Replace `/login?error=Configuration` when the failure was InvalidCheck
 * (state or PKCE cookie missing or unreadable). Leave every other redirect,
 * including a real configuration failure, unchanged.
 */
export function rewriteAuthFailureRedirect(
  response: Response,
  code: string | null,
): Response {
  if (code !== "InvalidCheck") return response;
  const location = response.headers.get("location");
  if (!location) return response;
  let url: URL;
  try {
    url = new URL(location, "https://www.fernandesjourneys.com");
  } catch {
    return response;
  }
  if (url.searchParams.get("error") !== "Configuration") return response;
  url.searchParams.set("error", "InvalidCheck");
  const headers = new Headers();
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie" || key.toLowerCase() === "location") {
      return;
    }
    headers.set(key, value);
  });
  for (const cookie of response.headers.getSetCookie()) {
    headers.append("set-cookie", cookie);
  }
  headers.set("location", url.toString());
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
