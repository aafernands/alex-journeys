import { Node } from "@tiptap/core";

/** Wrapper kept in saved HTML so the public page can render the snippet. */
export const HTML_EMBED_CLASS = "cms-html-embed";
export const HTML_EMBED_ATTR = "data-cms-html-embed";

/** Rejects pastes large enough to freeze the editor. */
export const MAX_HTML_EMBED_CHARS = 100_000;

/**
 * Builds the saved embed element without string-concatenating the snippet,
 * so a closing tag in the paste cannot break out of the wrapper.
 * Returns null when the browser drops the snippet (for example a full document).
 */
export function renderHtmlEmbedElement(html: string): HTMLElement | null {
  if (typeof document === "undefined") return null;
  const template = document.createElement("template");
  template.innerHTML = html;
  const nodes = [...template.content.childNodes];
  if (nodes.length === 0) return null;
  const wrapper = document.createElement("div");
  wrapper.className = HTML_EMBED_CLASS;
  wrapper.setAttribute(HTML_EMBED_ATTR, "1");
  wrapper.append(...nodes);
  return wrapper;
}

/**
 * Arbitrary embed HTML. TipTap's schema would otherwise drop iframes and
 * empty divs. The node view is a placeholder; getHTML() writes the snippet
 * inside the wrapper for the public page.
 *
 * Limit: script tags are stored but do not run in the editor, and the public
 * story renderer injects HTML in a way that also does not run scripts.
 */
export const HtmlEmbed = Node.create({
  name: "htmlEmbed",
  group: "block",
  atom: true,
  selectable: true,
  draggable: false,
  isolating: true,

  addAttributes() {
    return {
      html: {
        default: "",
        rendered: false,
        parseHTML: (element) =>
          element instanceof HTMLElement ? element.innerHTML : "",
      },
    };
  },

  parseHTML() {
    return [{ tag: `div[${HTML_EMBED_ATTR}]`, priority: 100 }];
  },

  renderHTML({ node }) {
    const html = typeof node.attrs.html === "string" ? node.attrs.html : "";
    const element = renderHtmlEmbedElement(html);
    if (element) return element;
    return [
      "div",
      { class: HTML_EMBED_CLASS, [HTML_EMBED_ATTR]: "1" },
    ];
  },

  addNodeView() {
    if (typeof document === "undefined") return null;
    return ({ node }) => {
      const dom = document.createElement("div");
      dom.className = "cms-html-embed-placeholder";
      dom.setAttribute("contenteditable", "false");
      dom.setAttribute("aria-label", "Custom HTML embed");
      const title = document.createElement("p");
      title.textContent = "Custom HTML";
      const preview = document.createElement("pre");

      const paint = (current: typeof node) => {
        const raw = typeof current.attrs.html === "string" ? current.attrs.html : "";
        preview.textContent = raw.length > 240 ? `${raw.slice(0, 240)}…` : raw;
      };
      paint(node);
      dom.append(title, preview);
      return {
        dom,
        ignoreMutation: () => true,
        update: (updated) => {
          if (updated.type.name !== "htmlEmbed") return false;
          paint(updated);
          return true;
        },
      };
    };
  },
});
