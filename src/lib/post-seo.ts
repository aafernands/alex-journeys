/** Google result targets used by the editor counters and the SEO checklist. */
export const SEO_TITLE_TARGET = 60;
export const SEO_DESCRIPTION_TARGET = 155;

export const SEO_TITLE_MAX = 180;
export const SEO_DESCRIPTION_MAX = 500;
export const FOCUS_KEYWORD_MAX = 80;

type SeoFields = {
  title?: string | null;
  excerpt?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
};

function asTrimmed(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Normalize editor SEO fields. Over-long values are rejected; blanks are kept empty. */
export function readSeoFields(input: {
  seoTitle?: unknown;
  seoDescription?: unknown;
  focusKeyword?: unknown;
}):
  | { ok: true; seoTitle: string; seoDescription: string; focusKeyword: string }
  | { ok: false; error: string } {
  const seoTitle = asTrimmed(input.seoTitle);
  if (seoTitle.length > SEO_TITLE_MAX) {
    return {
      ok: false,
      error: `SEO title must be at most ${SEO_TITLE_MAX} characters.`,
    };
  }
  const seoDescription = asTrimmed(input.seoDescription);
  if (seoDescription.length > SEO_DESCRIPTION_MAX) {
    return {
      ok: false,
      error: `Meta description must be at most ${SEO_DESCRIPTION_MAX} characters.`,
    };
  }
  const focusKeyword = asTrimmed(input.focusKeyword);
  if (focusKeyword.length > FOCUS_KEYWORD_MAX) {
    return {
      ok: false,
      error: `Focus keyword must be at most ${FOCUS_KEYWORD_MAX} characters.`,
    };
  }
  return { ok: true, seoTitle, seoDescription, focusKeyword };
}

/** Drop blank SEO fields so published JSON stays small. */
export function optionalSeoFields(data: {
  seoTitle: string;
  seoDescription: string;
  focusKeyword: string;
}): {
  seoTitle?: string;
  seoDescription?: string;
  focusKeyword?: string;
} {
  return {
    ...(data.seoTitle ? { seoTitle: data.seoTitle } : {}),
    ...(data.seoDescription ? { seoDescription: data.seoDescription } : {}),
    ...(data.focusKeyword ? { focusKeyword: data.focusKeyword } : {}),
  };
}

/** Search title: custom SEO title, otherwise the post title. */
export function resolvedSeoTitle(post: SeoFields): string {
  const custom = post.seoTitle?.trim();
  if (custom) return custom;
  return post.title?.trim() ?? "";
}

/**
 * Meta description: custom SEO description, otherwise the excerpt.
 * Last resort keeps an empty excerpt from publishing a blank description tag.
 */
export function resolvedSeoDescription(post: SeoFields): string {
  const custom = post.seoDescription?.trim();
  if (custom) return custom;
  const excerpt = post.excerpt?.trim();
  if (excerpt) return excerpt;
  const title = post.title?.trim();
  return title ? `Travel story: ${title}` : "";
}
