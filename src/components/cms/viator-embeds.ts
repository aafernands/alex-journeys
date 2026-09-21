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
