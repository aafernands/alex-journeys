"use client";

import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  /** When true, also clear the Auth.js OAuth session. */
  oauthSession?: boolean;
};

export function LogoutButton({ oauthSession = false }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      className="btn btn-secondary disabled:opacity-60"
      onClick={async () => {
        setPending(true);
        try {
          await fetch("/api/cms/logout", { method: "POST" });
          if (oauthSession) {
            await signOut({ redirect: false });
          }
          router.refresh();
        } catch {
          setPending(false);
        }
      }}
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
