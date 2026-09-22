/** Shared helpers for the stays route handlers. */

export function staysCallerKey(request: Request, action: string): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  const ip = forwarded || request.headers.get("x-real-ip")?.trim() || "local";
  return `${action}:${ip.slice(0, 80)}`;
}
