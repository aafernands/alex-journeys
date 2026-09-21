"use client";

import { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";
import {
  VIATOR_PARTNER_ID,
  isViatorPartnerId,
  isViatorWidgetRef,
} from "@/lib/viator";
import { MAX_HTML_EMBED_CHARS, renderHtmlEmbedElement } from "./html-embed";

export type WidgetInsert =
  | { type: "viator"; partnerId: string; widgetRef: string }
  | { type: "html"; html: string };

type Props = {
  open: boolean;
  onClose: () => void;
  onInsert: (widget: WidgetInsert) => void;
};

const fieldClass =
  "mt-2 min-h-11 w-full rounded-lg border border-border bg-white px-4 text-sm text-heading placeholder:text-muted transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25";

export function WidgetInsertDialog({ open, onClose, onInsert }: Props) {
  const titleId = useId();
  const typeId = useId();
  const partnerIdField = useId();
  const refId = useId();
  const refHelpId = useId();
  const htmlId = useId();
  const htmlHelpId = useId();
  const errorId = useId();
  const typeRef = useRef<HTMLSelectElement>(null);

  const [kind, setKind] = useState<"viator" | "html">("viator");
  const [partnerId, setPartnerId] = useState(VIATOR_PARTNER_ID);
  const [widgetRef, setWidgetRef] = useState("");
  const [html, setHtml] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setKind("viator");
    setPartnerId(VIATOR_PARTNER_ID);
    setWidgetRef("");
    setHtml("");
    setError(null);
    const id = window.setTimeout(() => typeRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const submit = () => {
    if (kind === "viator") {
      const nextPartner = partnerId.trim();
      const nextRef = widgetRef.trim();
      if (!nextPartner) {
        setError("Partner ID is required.");
        return;
      }
      if (!isViatorPartnerId(nextPartner)) {
        setError("Partner ID should look like the Viator id already filled in.");
        return;
      }
      if (!nextRef) {
        setError("Widget ref is required.");
        return;
      }
      if (!isViatorWidgetRef(nextRef)) {
        setError("Widget ref should look like W- followed by the id from Viator.");
        return;
      }
      onInsert({ type: "viator", partnerId: nextPartner, widgetRef: nextRef });
      return;
    }

    const snippet = html.trim();
    if (!snippet) {
      setError("Paste an HTML snippet.");
      return;
    }
    if (snippet.length > MAX_HTML_EMBED_CHARS) {
      setError("That snippet is too long to insert.");
      return;
    }
    if (!renderHtmlEmbedElement(snippet)) {
      setError(
        "This snippet could not be kept as HTML. Paste an embed fragment, such as an iframe, not a full page.",
      );
      return;
    }
    onInsert({ type: "html", html: snippet });
  };

  const onPanelKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    const inTextarea = event.target instanceof HTMLTextAreaElement;
    if (inTextarea && !(event.metaKey || event.ctrlKey)) return;
    event.preventDefault();
    submit();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-2xl border border-border bg-surface shadow-xl sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={onPanelKeyDown}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
          <div>
            <h2 id={titleId} className="font-display text-lg font-bold text-heading">
              Insert widget
            </h2>
            <p className="mt-1 text-xs text-muted">
              Places a Viator card or another HTML embed at the cursor.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-secondary inline-flex h-10 w-10 shrink-0 items-center justify-center p-0"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
          <div>
            <label htmlFor={typeId} className="text-sm font-semibold text-heading">
              Type
            </label>
            <select
              ref={typeRef}
              id={typeId}
              value={kind}
              onChange={(event) => {
                setKind(event.target.value === "html" ? "html" : "viator");
                setError(null);
              }}
              className={fieldClass}
            >
              <option value="viator">Viator</option>
              <option value="html">Custom HTML</option>
            </select>
          </div>

          {kind === "viator" ? (
            <>
              <div>
                <label htmlFor={partnerIdField} className="text-sm font-semibold text-heading">
                  Partner ID
                </label>
                <input
                  id={partnerIdField}
                  value={partnerId}
                  onChange={(event) => {
                    setPartnerId(event.target.value);
                    setError(null);
                  }}
                  autoComplete="off"
                  spellCheck={false}
                  className={fieldClass}
                  aria-invalid={error?.startsWith("Partner") ? true : undefined}
                  aria-describedby={error ? errorId : undefined}
                />
              </div>
              <div>
                <label htmlFor={refId} className="text-sm font-semibold text-heading">
                  Widget ref <span className="text-accent">*</span>
                </label>
                <input
                  id={refId}
                  value={widgetRef}
                  onChange={(event) => {
                    setWidgetRef(event.target.value);
                    setError(null);
                  }}
                  placeholder="W-…"
                  autoComplete="off"
                  spellCheck={false}
                  required
                  className={fieldClass}
                  aria-invalid={error?.startsWith("Widget ref") ? true : undefined}
                  aria-describedby={error ? `${refHelpId} ${errorId}` : refHelpId}
                />
                <p id={refHelpId} className="mt-2 text-xs text-muted">
                  Paste the widget ref from your Viator partner dashboard.
                </p>
              </div>
            </>
          ) : (
            <div>
              <label htmlFor={htmlId} className="text-sm font-semibold text-heading">
                HTML snippet <span className="text-accent">*</span>
              </label>
              <textarea
                id={htmlId}
                value={html}
                onChange={(event) => {
                  setHtml(event.target.value);
                  setError(null);
                }}
                rows={8}
                required
                spellCheck={false}
                placeholder='<iframe src="https://…"></iframe>'
                className="mt-2 w-full resize-y rounded-lg border border-border bg-white px-4 py-3 font-mono text-[0.8125rem] leading-relaxed text-heading placeholder:text-muted transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `${htmlHelpId} ${errorId}` : htmlHelpId}
              />
              <p id={htmlHelpId} className="mt-2 text-xs text-muted">
                Paste an embed fragment, such as an iframe. It is saved inside a
                block the editor will not strip. Script tags are kept in the HTML
                but do not run here or on the public story. For Viator, choose
                Viator and paste the widget ref — the site already loads that
                script. Press Ctrl or ⌘ Enter to insert.
              </p>
            </div>
          )}

          {error ? (
            <p id={errorId} className="text-sm font-medium text-red-600" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-border px-4 py-3 sm:flex-row sm:justify-end sm:px-5">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={submit}>
            Insert widget
          </button>
        </div>
      </div>
    </div>
  );
}
