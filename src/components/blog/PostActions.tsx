"use client";

import { MessageCircle, Share2 } from "lucide-react";
import { useCallback, useState } from "react";
import { SavePostButton } from "@/components/SavePostButton";

type Props = {
  slug: string;
  title: string;
};

/**
 * Save + Share + Comments jump controls on post pages.
 * Share uses navigator.share when available; otherwise copies the link.
 */
export function PostActions({ slug, title }: Props) {
  const [shareStatus, setShareStatus] = useState<string | null>(null);

  const onShare = useCallback(async () => {
    setShareStatus(null);
    const url =
      typeof window !== "undefined"
        ? window.location.href
        : `/${slug}`;
    const shareData: ShareData = {
      title,
      text: title,
      url,
    };

    try {
      if (
        typeof navigator !== "undefined" &&
        typeof navigator.share === "function" &&
        (!navigator.canShare || navigator.canShare(shareData))
      ) {
        await navigator.share(shareData);
        return;
      }
    } catch (err) {
      // User cancelled share sheet — not an error.
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setShareStatus("Link copied");
      window.setTimeout(() => setShareStatus(null), 2500);
    } catch {
      setShareStatus("Could not copy link");
      window.setTimeout(() => setShareStatus(null), 2500);
    }
  }, [slug, title]);

  const onJumpComments = useCallback(() => {
    const el = document.getElementById("comments");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      // Focus heading for a11y when present
      const heading = el.querySelector("h2");
      if (heading instanceof HTMLElement) {
        heading.setAttribute("tabindex", "-1");
        heading.focus({ preventScroll: true });
      }
    } else {
      window.location.hash = "comments";
    }
  }, []);

  const actionBtn =
    "inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3.5 py-2 text-sm font-semibold text-heading transition hover:border-accent hover:text-accent disabled:opacity-60";

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <SavePostButton slug={slug} />
        <button
          type="button"
          onClick={() => void onShare()}
          className={actionBtn}
          aria-label="Share this post"
        >
          <Share2 className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          Share
        </button>
        <button
          type="button"
          onClick={onJumpComments}
          className={actionBtn}
          aria-label="Jump to comments"
        >
          <MessageCircle className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          Comments
        </button>
      </div>
      {shareStatus ? (
        <p className="text-xs text-muted sm:text-right" role="status">
          {shareStatus}
        </p>
      ) : null}
    </div>
  );
}
