import type { SitePage } from "@/lib/pages";
import { sanitizeSlug } from "@/lib/cms/validate";

export type PageInput = {
  title?: unknown;
  slug?: unknown;
  description?: unknown;
  label?: unknown;
  contentHtml?: unknown;
};

export type ValidatedPage = {
  title: string;
  slug: string;
  description: string;
  label?: string;
  contentHtml: string;
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

  const contentHtml = asString(input.contentHtml);
  if (!contentHtml) {
    return { ok: false, error: "Content HTML is required." };
  }

  return {
    ok: true,
    data: { title, slug, description, label, contentHtml },
  };
}

export function toSitePage(
  data: ValidatedPage,
  existing?: SitePage | null,
): SitePage {
  return {
    slug: data.slug,
    title: data.title,
    description: data.description,
    label: data.label,
    contentHtml: data.contentHtml,
    source: existing?.source,
  };
}
