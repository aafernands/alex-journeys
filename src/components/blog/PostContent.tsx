import { rewriteHtmlExternalLinks } from "@/lib/outbound";

type Props = {
  html: string;
};

/** Add id attributes to h2s so in-page TOC anchors work. */
function withHeadingIds(html: string): string {
  return html.replace(/<h2([^>]*)>([\s\S]*?)<\/h2>/gi, (_full, attrs, inner) => {
    const label = String(inner).replace(/<[^>]+>/g, "").trim();
    const id = label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    if (!id || /\sid\s*=/.test(attrs)) {
      return `<h2${attrs}>${inner}</h2>`;
    }
    return `<h2${attrs} id="${id}">${inner}</h2>`;
  });
}

/** Renders cleaned WordPress HTML with prose styles and outbound rewrites. */
export function PostContent({ html }: Props) {
  const prepared = rewriteHtmlExternalLinks(withHeadingIds(html));

  return (
    <div
      className="post-prose"
      dangerouslySetInnerHTML={{ __html: prepared }}
    />
  );
}
