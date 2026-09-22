/**
 * Nuitee / LiteAPI key lookup. Safe to import from tests.
 * The key is read on the server only — never prefixed with NEXT_PUBLIC_.
 */

export type LiteApiKeySource = "LITEAPI_API_KEY" | "NUITEE_API_KEY";

export type LiteApiKeyInfo = {
  key: string;
  source: LiteApiKeySource;
  /** sand_ / sandbox_ keys book with Nuitee’s simulated account card. */
  sandbox: boolean;
};

export function readLiteApiKey(
  env: Record<string, string | undefined> = process.env,
): LiteApiKeyInfo | null {
  const primary = env.LITEAPI_API_KEY?.trim() ?? "";
  const alias = env.NUITEE_API_KEY?.trim() ?? "";
  const key = primary || alias;
  if (!key) return null;
  return {
    key,
    source: primary ? "LITEAPI_API_KEY" : "NUITEE_API_KEY",
    sandbox: isSandboxLiteApiKey(key),
  };
}

/** Sandbox keys are documented as `sand_` or `sandbox_`. */
export function isSandboxLiteApiKey(key: string): boolean {
  return /^sand(box)?_/i.test(key.trim());
}
