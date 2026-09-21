"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { ViatorScript, ViatorWidget } from "./viator-embeds";
import { HtmlEmbed, renderHtmlEmbedElement } from "./html-embed";
import { viatorWidgetMarkup } from "@/lib/viator";
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link2,
  ImageIcon,
  Undo2,
  Redo2,
  Code2,
  Blocks,
} from "lucide-react";
import { MediaPicker } from "./MediaPicker";
import { WidgetInsertDialog, type WidgetInsert } from "./WidgetInsertDialog";

type Props = {
  id?: string;
  value: string;
  onChange: (html: string) => void;
  required?: boolean;
};

function htmlCountsAsContent(html: string): boolean {
  if (/data-vi-widget-ref\s*=/i.test(html)) return true;
  if (/data-cms-html-embed\s*=/i.test(html)) return true;
  return Boolean(html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim());
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active ? true : undefined}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-md border text-sm transition ${
        active
          ? "border-accent bg-accent/15 text-heading"
          : "border-transparent text-heading/80 hover:border-border hover:bg-white"
      } disabled:opacity-40`}
    >
      {children}
    </button>
  );
}

export function RichTextEditor({ id, value, onChange, required }: Props) {
  const [showHtml, setShowHtml] = useState(false);
  const [htmlDraft, setHtmlDraft] = useState(value);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [widgetOpen, setWidgetOpen] = useState(false);
  const htmlAreaRef = useRef<HTMLTextAreaElement>(null);
  const widgetButtonRef = useRef<HTMLButtonElement>(null);

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-link underline underline-offset-2",
          rel: "noopener noreferrer",
          target: "_blank",
        },
      }),
      Image.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: {
          class: "rounded-lg max-w-full h-auto my-4",
        },
      }),
      Placeholder.configure({
        placeholder:
          "Write your story… Use the toolbar for headings, lists, and links.",
      }),
      ViatorWidget,
      ViatorScript,
      HtmlEmbed,
    ],
    [],
  );

  const editor = useEditor({
    extensions,
    content: value || "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        id: id || "cms-content-editor",
        class:
          "tiptap post-prose min-h-[18rem] px-4 py-3 focus:outline-none text-heading",
      },
    },
    onUpdate: ({ editor: ed }) => {
      const html = ed.isEmpty ? "" : ed.getHTML();
      onChange(html);
      setHtmlDraft(html);
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.isEmpty ? "" : editor.getHTML();
    if (value !== current) {
      editor.commands.setContent(value || "", { emitUpdate: false });
      setHtmlDraft(value || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync when value prop changes from outside
  }, [value, editor]);

  const setLink = () => {
    if (!editor) return;
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", previous || "https://");
    if (url === null) return;
    const trimmed = url.trim();
    if (!trimmed) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: trimmed }).run();
  };

  const setImageFromUrl = () => {
    if (!editor) return;
    const url = window.prompt("Image URL", "https://");
    if (url === null) return;
    const trimmed = url.trim();
    if (!trimmed) return;
    const alt = window.prompt("Alt text (optional)", "") || "";
    editor.chain().focus().setImage({ src: trimmed, alt }).run();
  };

  const setImage = () => {
    setLibraryOpen(true);
  };

  const appendHtml = (snippet: string) => {
    if (!editor) return;
    const area = htmlAreaRef.current;
    const start = area?.selectionStart ?? htmlDraft.length;
    const end = area?.selectionEnd ?? start;
    const needsBreak = start > 0 && !/\s$/.test(htmlDraft.slice(0, start));
    const piece = `${needsBreak ? "\n" : ""}${snippet}`;
    const next = `${htmlDraft.slice(0, start)}${piece}${htmlDraft.slice(end)}`;
    setHtmlDraft(next);
    onChange(next);
    editor.commands.setContent(next || "", { emitUpdate: false });
    const cursor = start + piece.length;
    window.setTimeout(() => {
      const field = htmlAreaRef.current;
      if (!field) return;
      field.focus();
      field.setSelectionRange(cursor, cursor);
    }, 0);
  };

  const insertBlock = (content: Record<string, unknown>) => {
    if (!editor) return;
    const { selection } = editor.state;
    // A selected atom would be replaced. Insert after it so an existing
    // widget stays put, then leave a text cursor after the new block.
    if ("node" in selection && selection.node) {
      editor.chain().insertContentAt(selection.to, content).run();
    } else {
      editor.chain().insertContent(content).run();
    }
    const pos = editor.state.selection.to;
    editor.chain().setTextSelection(pos).run();
    window.setTimeout(() => editor.commands.focus(), 0);
  };

  const insertWidget = (widget: WidgetInsert) => {
    if (!editor) return;
    if (widget.type === "viator") {
      const markup = viatorWidgetMarkup(widget.widgetRef, widget.partnerId);
      if (showHtml) {
        appendHtml(markup);
        return;
      }
      insertBlock({
        type: "viatorWidget",
        attrs: {
          class: "viator-widget",
          partnerId: widget.partnerId,
          widgetRef: widget.widgetRef,
        },
      });
      return;
    }

    if (showHtml) {
      const element = renderHtmlEmbedElement(widget.html);
      if (!element) return;
      appendHtml(element.outerHTML);
      return;
    }

    insertBlock({
      type: "htmlEmbed",
      attrs: { html: widget.html },
    });
  };

  if (!editor) {
    return (
      <div className="mt-2 min-h-[18rem] rounded-lg border border-border bg-white px-4 py-3 text-sm text-muted">
        Loading editor…
      </div>
    );
  }

  return (
    <div className="relative mt-2">
      <div className="flex flex-wrap items-center gap-1 rounded-t-lg border border-b-0 border-border bg-surface-soft px-2 py-1.5">
        <ToolbarButton
          label="Bold"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Italic"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-border" aria-hidden />
        <ToolbarButton
          label="Heading 2"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Heading 3"
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-border" aria-hidden />
        <ToolbarButton
          label="Bullet list"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Numbered list"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Quote"
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Link" active={editor.isActive("link")} onClick={setLink}>
          <Link2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Image from library" onClick={setImage}>
          <ImageIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Image from URL" onClick={setImageFromUrl}>
          <span className="text-[0.65rem] font-bold">URL</span>
        </ToolbarButton>
        <button
          ref={widgetButtonRef}
          type="button"
          title="Insert widget"
          aria-label="Insert widget"
          aria-haspopup="dialog"
          aria-expanded={widgetOpen}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setWidgetOpen(true)}
          className="inline-flex h-9 items-center gap-1 rounded-md border border-transparent px-2 text-xs font-semibold text-heading/80 transition hover:border-border hover:bg-white"
        >
          <Blocks className="h-4 w-4" aria-hidden />
          Widget
        </button>
        <span className="mx-1 h-5 w-px bg-border" aria-hidden />
        <ToolbarButton
          label="Undo"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
        >
          <Undo2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Redo"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
        >
          <Redo2 className="h-4 w-4" />
        </ToolbarButton>
        <span className="ml-auto" />
        <ToolbarButton
          label={showHtml ? "Hide HTML" : "Edit HTML"}
          active={showHtml}
          onClick={() => {
            if (!showHtml) setHtmlDraft(editor.isEmpty ? "" : editor.getHTML());
            setShowHtml((v) => !v);
          }}
        >
          <Code2 className="h-4 w-4" />
        </ToolbarButton>
      </div>

      <div className="rounded-b-lg border border-border bg-white">
        {showHtml ? (
          <textarea
            ref={htmlAreaRef}
            aria-label="HTML source"
            value={htmlDraft}
            onChange={(e) => {
              const next = e.target.value;
              setHtmlDraft(next);
              onChange(next);
              editor.commands.setContent(next || "", { emitUpdate: false });
            }}
            rows={16}
            className="w-full resize-y rounded-b-lg border-0 bg-white px-4 py-3 font-mono text-[0.8125rem] leading-relaxed text-heading focus:outline-none focus:ring-2 focus:ring-accent/25"
            spellCheck={false}
          />
        ) : (
          <EditorContent editor={editor} />
        )}
      </div>

      <input
        tabIndex={-1}
        aria-hidden
        className="pointer-events-none absolute h-0 w-0 opacity-0"
        value={htmlCountsAsContent(value || "") ? "ok" : ""}
        onChange={() => {}}
        required={required}
      />

      <p className="mt-1 text-xs text-muted">
        Write normally with the toolbar. HTML is saved automatically for the
        site. Use the code icon if you ever need the raw HTML. Image icon opens
        the media library; URL inserts by paste. Widget inserts a Viator card
        or another HTML embed.
      </p>

      <MediaPicker
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onSelect={({ url, alt }) => {
          if (!editor) return;
          editor.chain().focus().setImage({ src: url, alt: alt || "" }).run();
        }}
        title="Insert image from library"
      />

      <WidgetInsertDialog
        open={widgetOpen}
        onClose={() => {
          setWidgetOpen(false);
          window.setTimeout(() => widgetButtonRef.current?.focus(), 0);
        }}
        onInsert={(widget) => {
          insertWidget(widget);
          setWidgetOpen(false);
        }}
      />
    </div>
  );
}
