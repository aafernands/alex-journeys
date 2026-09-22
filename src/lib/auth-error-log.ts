/**
 * Fields safe to print from an Auth.js / oauth4webapi failure.
 * Never include the response, headers, or token body — those can hold
 * the client secret or an access token.
 */
export function safeAuthErrorDetails(error: unknown): {
  name: string;
  message: string;
  oauthError?: string;
  oauthDescription?: string;
} {
  const record =
    error && typeof error === "object"
      ? (error as Record<string, unknown>)
      : {};
  const cause =
    record.cause && typeof record.cause === "object"
      ? (record.cause as Record<string, unknown>)
      : {};
  const nested =
    cause.err && typeof cause.err === "object"
      ? (cause.err as Record<string, unknown>)
      : {};
  const oauthError = firstString(record.error, cause.error, nested.error);
  const oauthDescription = firstString(
    record.error_description,
    cause.error_description,
    nested.error_description,
  );
  const name =
    typeof record.name === "string"
      ? record.name
      : error instanceof Error
        ? error.name
        : "Error";
  const message =
    error instanceof Error
      ? error.message
      : typeof record.message === "string"
        ? record.message
        : String(error);
  return {
    name,
    message,
    ...(oauthError ? { oauthError } : {}),
    ...(oauthDescription ? { oauthDescription } : {}),
  };
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value;
  }
  return undefined;
}
