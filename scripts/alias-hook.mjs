/**
 * Resolve `@/` imports when Node runs TypeScript tests directly.
 * Next.js handles this alias in the app; the test runner does not.
 */
export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const url = new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url);
    return nextResolve(url.href, context);
  }
  return nextResolve(specifier, context);
}
