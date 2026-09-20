/** Canonical public URL path for a published blog post. */
export function publicPostPath(slug: string): string {
  return `/${slug}`;
}

/** Canonical public URL path for a destination country page. */
export function publicDestinationPath(slug: string): string {
  return `/${slug}`;
}
