"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { isPremium, type MembershipPublic } from "@/lib/membership";

type StatusResponse = {
  signedIn?: boolean;
  isPremium?: boolean;
  membership?: MembershipPublic | null;
};

/**
 * Client view of Premium. Reads `/api/premium/status` so a webhook can change
 * membership without waiting for a new sign-in.
 */
export function usePremium() {
  const { status } = useSession();
  const [membership, setMembership] = useState<MembershipPublic | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") return;
    if (status !== "authenticated") {
      setMembership(null);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    fetch("/api/premium/status", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return null;
        const data = (await res.json()) as StatusResponse;
        return data.membership ?? null;
      })
      .then((next) => {
        if (active) setMembership(next);
      })
      .catch(() => {
        if (active) setMembership(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [status]);

  return {
    loading: status === "loading" || loading,
    signedIn: status === "authenticated",
    membership,
    isPremium: isPremium({ membership }),
  };
}
