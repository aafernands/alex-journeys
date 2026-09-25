"use client";

import { Bookmark, BookmarkCheck } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { useReaderLoginPrompt } from "@/components/ReaderLoginPrompt";
import {
  forgetPendingPostSave,
  rememberPendingPostSave,
  takePendingPostSave,
} from "@/lib/pending-save";

type Props = {
  slug: string;
};

/**
 * Save / Saved toggle on blog posts. Signed-out users are prompted to sign in.
 */
export function SavePostButton({ slug }: Props) {
  const { data: session, status } = useSession();
  const openReaderLogin = useReaderLoginPrompt();
  const signedIn = status === "authenticated" && Boolean(session?.user?.id);
  const [saved, setSaved] = useState(false);
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveStory = useCallback(async () => {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/saved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      if (res.status === 503) {
        setError("Saving is temporarily unavailable.");
        return;
      }
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(data?.error ?? "Could not save.");
        return;
      }
      setSaved(true);
    } catch {
      setError("Something went wrong.");
    } finally {
      setPending(false);
    }
  }, [slug]);

  const refresh = useCallback(async () => {
    if (!signedIn) {
      setSaved(false);
      setReady(true);
      return;
    }
    try {
      const res = await fetch("/api/saved");
      if (res.status === 503) {
        setError("Saving is temporarily unavailable.");
        setReady(true);
        return;
      }
      if (!res.ok) {
        setReady(true);
        return;
      }
      const data = (await res.json()) as {
        posts?: { slug: string }[];
      };
      setSaved(
        Array.isArray(data.posts) &&
          data.posts.some((p) => p.slug === slug),
      );
      setError(null);
    } catch {
      // ignore network blips
    } finally {
      setReady(true);
    }
  }, [signedIn, slug]);

  useEffect(() => {
    if (status === "loading") return;
    let cancelled = false;
    void (async () => {
      await refresh();
      if (cancelled || !signedIn || !takePendingPostSave(slug)) return;
      await saveStory();
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh, saveStory, signedIn, slug, status]);

  const onClick = async () => {
    setError(null);
    if (!signedIn) {
      const path = window.location.pathname + window.location.search;
      rememberPendingPostSave(slug);
      openReaderLogin({
        returnTo: path || "/",
        intro: "Sign in to save this story.",
        onClose: () => forgetPendingPostSave(slug),
      });
      return;
    }

    setPending(true);
    try {
      if (saved) {
        const res = await fetch("/api/saved", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug }),
        });
        if (res.status === 503) {
          setError("Saving is temporarily unavailable.");
          return;
        }
        if (!res.ok) {
          setError("Could not unsave.");
          return;
        }
        setSaved(false);
      } else {
        await saveStory();
        return;
      }
    } catch {
      setError("Something went wrong.");
    } finally {
      setPending(false);
    }
  };

  const label = !signedIn
    ? "Sign in to save"
    : saved
      ? "Saved"
      : "Save";

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={() => void onClick()}
        disabled={pending || (!ready && signedIn)}
        className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-semibold transition disabled:opacity-60 ${
          saved
            ? "border-accent bg-accent/10 text-accent-deep hover:bg-accent/15"
            : "border-border bg-white text-heading hover:border-accent hover:text-accent"
        }`}
        aria-pressed={signedIn ? saved : undefined}
        aria-label={label}
      >
        {saved ? (
          <BookmarkCheck className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        ) : (
          <Bookmark className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        )}
        {pending ? (saved ? "Removing…" : "Saving…") : label}
      </button>
      {error ? (
        <p className="text-xs text-red-600" role="status">
          {error}
        </p>
      ) : null}
    </div>
  );
}
