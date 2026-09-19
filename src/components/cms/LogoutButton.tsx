"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      className="btn btn-secondary disabled:opacity-60"
      onClick={async () => {
        setPending(true);
        await fetch("/api/cms/logout", { method: "POST" });
        router.refresh();
      }}
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
