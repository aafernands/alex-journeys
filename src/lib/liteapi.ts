/**
 * Server-side Nuitee Connect (LiteAPI) client.
 * Callers must not forward the raw JSON to the browser — map it in stays.ts.
 */

import "server-only";

import { readLiteApiKey, type LiteApiKeyInfo } from "@/lib/stays-config";
import { upstreamStayMessage } from "@/lib/stays";

export const LITEAPI_SEARCH_BASE = "https://api.liteapi.travel/v3.0";
export const LITEAPI_BOOK_BASE = "https://book.liteapi.travel/v3.0";

export type LiteApiFailureCode =
  | "not_configured"
  | "bad_request"
  | "upstream"
  | "live_checkout";

export class LiteApiError extends Error {
  readonly status: number;
  readonly code: LiteApiFailureCode;

  constructor(message: string, status: number, code: LiteApiFailureCode) {
    super(message);
    this.name = "LiteApiError";
    this.status = status;
    this.code = code;
  }
}

export function liteApiKeyInfo(): LiteApiKeyInfo | null {
  return readLiteApiKey();
}

function requireKey(missing = "Stays aren’t configured."): LiteApiKeyInfo {
  const info = liteApiKeyInfo();
  if (!info) {
    throw new LiteApiError(missing, 503, "not_configured");
  }
  return info;
}

export type LiteApiProduct = "stays" | "flights";

type CallOptions = {
  base: string;
  path: string;
  method?: "GET" | "POST";
  query?: Record<string, string | undefined>;
  body?: unknown;
  timeoutMs?: number;
  /** Which product the missing-key and rejected-key messages name. */
  product?: LiteApiProduct;
};

function productMessages(product: LiteApiProduct) {
  if (product === "flights") {
    return {
      missing: "Flights aren’t configured.",
      rejected: "Nuitee rejected the flights key on the server.",
    };
  }
  return {
    missing: "Stays aren’t configured.",
    rejected: "Nuitee rejected the stays key on the server.",
  };
}

export async function liteApiCall(options: CallOptions): Promise<unknown> {
  const copy = productMessages(options.product ?? "stays");
  const info = requireKey(copy.missing);
  const url = new URL(options.path.replace(/^\//, ""), `${options.base}/`);
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value) url.searchParams.set(key, value);
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method ?? "GET",
      headers: {
        Accept: "application/json",
        "X-API-Key": info.key,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(options.timeoutMs ?? 14_000),
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    throw new LiteApiError(
      timedOut
        ? "Nuitee took too long to answer. Try the search again."
        : "Nuitee could not be reached.",
      502,
      "upstream",
    );
  }

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text) as unknown;
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new LiteApiError(copy.rejected, 502, "upstream");
    }
    throw new LiteApiError(
      upstreamStayMessage(
        payload,
        "Nuitee could not complete that request.",
        options.product ?? "stays",
      ),
      response.status >= 500 ? 502 : 400,
      "upstream",
    );
  }

  return payload;
}
