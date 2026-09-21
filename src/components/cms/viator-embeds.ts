import { mergeAttributes, Node } from "@tiptap/core";
import { VIATOR_WIDGET_SCRIPT_SRC } from "@/lib/viator";

/**
 * Empty partner divs. TipTap's default schema would drop them on paste
 * or when the visual editor rewrites HTML.
 */
export const ViatorWidget = Node.create({
  name: "viatorWidget",
  group: "block",
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      class: {
        default: "viator-widget",
        parseHTML: (element) => element.getAttribute("class") || "viator-widget",
      },
      partnerId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-vi-partner-id"),
        renderHTML: (attributes) =>
          attributes.partnerId
            ? { "data-vi-partner-id": attributes.partnerId }
            : {},
      },
      widgetRef: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-vi-widget-ref"),
        renderHTML: (attributes) =>
          attributes.widgetRef
            ? { "data-vi-widget-ref": attributes.widgetRef }
            : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-vi-widget-ref]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    if (typeof document === "undefined") return null;
    return ({ node }) => {
      const dom = document.createElement("div");
      dom.className = "viator-widget-placeholder";
      dom.setAttribute("contenteditable", "false");
      const title = document.createElement("p");
      title.textContent = "Viator widget";
      const ref = document.createElement("code");
      const partner = document.createElement("p");
      partner.className = "viator-widget-placeholder-partner";

      const paint = (current: typeof node) => {
        const widgetRef = current.attrs.widgetRef
          ? String(current.attrs.widgetRef)
          : "Missing widget ref";
        const partnerId = current.attrs.partnerId
          ? String(current.attrs.partnerId)
          : "";
        ref.textContent = widgetRef;
        partner.textContent = partnerId
          ? `Partner ${partnerId}`
          : "Missing partner id";
        dom.setAttribute(
          "aria-label",
          partnerId
            ? `Viator widget ${widgetRef}, partner ${partnerId}`
            : `Viator widget ${widgetRef}`,
        );
      };
      paint(node);
      dom.append(title, ref, partner);
      return {
        dom,
        ignoreMutation: () => true,
        update: (updated) => {
          if (updated.type.name !== "viatorWidget") return false;
          paint(updated);
          return true;
        },
      };
    };
  },
});

/**
 * The official loader tag, if an editor pastes it next to a widget div.
 * A node view keeps a real script element out of the editing surface.
 */
export const ViatorScript = Node.create({
  name: "viatorScript",
  group: "block",
  atom: true,
  selectable: true,

  parseHTML() {
    return [
      {
        tag: "script",
        getAttrs: (node) => {
          if (!(node instanceof HTMLElement)) return false;
          const src = node.getAttribute("src") || "";
          if (!src.includes("viator.com/orion/partner/widget.js")) return false;
          return {};
        },
      },
    ];
  },

  renderHTML() {
    return [
      "script",
      { async: "async", src: VIATOR_WIDGET_SCRIPT_SRC },
    ];
  },

  addNodeView() {
    if (typeof document === "undefined") return null;
    return () => {
      const dom = document.createElement("div");
      dom.setAttribute("data-viator-script", "1");
      dom.setAttribute("contenteditable", "false");
      dom.textContent = "Viator booking widget script";
      return { dom };
    };
  },
});
