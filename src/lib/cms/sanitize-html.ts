import sanitizeHtml, { type IOptions } from "sanitize-html";

const allowedOptions: IOptions = {
  allowedTags: [
    "a",
    "b",
    "blockquote",
    "br",
    "code",
    "del",
    "div",
    "em",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "hr",
    "img",
    "i",
    "li",
    "ol",
    "p",
    "pre",
    "s",
    "strong",
    "span",
    "table",
    "tbody",
    "td",
    "tfoot",
    "th",
    "thead",
    "tr",
    "u",
    "ul",
  ],
  allowedAttributes: {
    a: ["class", "data-affiliate", "href", "rel", "target", "title"],
    div: [
      "class",
      "data-cms-html-embed",
      "data-vi-campaign",
      "data-vi-currency",
      "data-vi-language",
      "data-vi-partner-id",
      "data-vi-search-term",
      "data-vi-travel-date-from",
      "data-vi-travel-date-to",
      "data-vi-travellers-adults",
      "data-vi-travellers-children",
      "data-vi-widget-ref",
    ],
    img: ["alt", "class", "height", "loading", "src", "width"],
    table: ["class"],
    td: ["colspan", "rowspan"],
    th: ["colspan", "rowspan"],
    "*": ["aria-label", "aria-hidden", "class", "id"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowProtocolRelative: false,
  disallowedTagsMode: "discard",
  transformTags: {
    a: (tagName, attribs) => {
      if (attribs.target === "_blank") {
        const rel = new Set((attribs.rel ?? "").split(/\s+/).filter(Boolean));
        rel.add("noopener");
        rel.add("noreferrer");
        attribs.rel = [...rel].join(" ");
      }
      return { tagName, attribs };
    },
  },
};

/** Sanitize CMS and legacy article HTML before it reaches the HTML sink. */
export function sanitizeCmsHtml(html: string): string {
  return sanitizeHtml(html, allowedOptions);
}