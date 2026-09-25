/**
 * Resolve `@/` imports when Node runs TypeScript tests directly.
 * Next.js handles this alias in the app; the test runner does not.
 */
export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const target = specifier.slice(2);
    const isJson = target.endsWith(".json");
    const extension = isJson ? "" : ".ts";
    const url = new URL(`../src/${target}${extension}`, import.meta.url);
    return nextResolve(url.href, {
      ...context,
      importAttributes: isJson
        ? { ...context.importAttributes, type: "json" }
        : context.importAttributes,
    });
  }
  if (specifier === "next/server") {
    return nextResolve("next/server.js", context);
  }
  return nextResolve(specifier, context);
}
