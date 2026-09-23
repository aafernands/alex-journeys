import type { SitePage } from "@/lib/pages";
import { sanitizeSlug } from "@/lib/cms/validate";
import { sanitizeCmsHtml } from "@/lib/cms/sanitize-html";

export type PageInput = {
  title?: unknown;
  slug?: unknown;
  description?: unknown;
  label?: unknown;
  contentHtml?: unknown;
  sections?: unknown;
};

export type ValidatedPage = {
  title: string;
  slug: string;
  description: string;
  label?: string;
  contentHtml: string;
  sections?: Record<string, unknown>;
};

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function validatePageInput(
  input: PageInput,
): { ok: true; data: ValidatedPage } | { ok: false; error: string } {
  const title = asString(input.title);
  if (!title || title.length > 200) {
    return { ok: false, error: "Title is required (max 200 characters)." };
  }

  const slug = sanitizeSlug(input.slug);
  if (!slug) {
    return {
      ok: false,
      error:
        "Slug must be kebab-case (lowercase letters, numbers, hyphens only).",
    };
  }

  const description = asString(input.description);
  if (!description || description.length > 600) {
    return {
      ok: false,
      error: "Description is required (max 600 characters).",
    };
  }

  const label = asString(input.label) || undefined;
  if (label && label.length > 80) {
    return { ok: false, error: "Label max is 80 characters." };
  }

  // Allow empty / placeholder HTML for hub chrome pages; require *some* string.
  const contentHtml =
    typeof input.contentHtml === "string" ? input.contentHtml : "";
  if (contentHtml.trim().length === 0) {
    // Soft default so hub intros can publish with title/description only
  }
  const html = contentHtml.trim() ? sanitizeCmsHtml(contentHtml) : "<p></p>";

  let sections: Record<string, unknown> | undefined;
  if (input.sections !== undefined && input.sections !== null) {
    if (typeof input.sections === "string") {
      const raw = input.sections.trim();
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as unknown;
          if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
            return {
              ok: false,
              error: "Sections must be a JSON object (not an array).",
            };
          }
          sections = parsed as Record<string, unknown>;
        } catch {
          return { ok: false, error: "Sections JSON is invalid." };
        }
      }
    } else if (
      typeof input.sections === "object" &&
      !Array.isArray(input.sections)
    ) {
      sections = input.sections as Record<string, unknown>;
    } else {
      return {
        ok: false,
        error: "Sections must be a JSON object.",
      };
    }
  }

  return {
    ok: true,
    data: { title, slug, description, label, contentHtml: html, sections },
  };
}

export function toSitePage(
  data: ValidatedPage,
  existing?: SitePage | null,
): SitePage {
  const sections =
    data.sections !== undefined
      ? data.sections
      : existing?.sections;
  return {
    slug: data.slug,
    title: data.title,
    description: data.description,
    label: data.label,
    contentHtml: data.contentHtml,
    ...(sections && Object.keys(sections).length > 0 ? { sections } : {}),
    source: existing?.source,
  };
}
