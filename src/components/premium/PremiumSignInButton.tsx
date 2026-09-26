"use client";

import { useReaderLoginPrompt } from "@/components/ReaderLoginPrompt";

/** Secondary "Sign in" for members pages, for readers who already joined. */
export function PremiumSignInButton({ returnTo, intro }: { returnTo: string; intro: string }) {
  const openSignIn = useReaderLoginPrompt();
  return (
    <button
      type="button"
      className="btn btn-secondary w-full sm:w-auto"
      onClick={() => openSignIn({ returnTo, intro })}
    >
      Sign in
    </button>
  );
}
