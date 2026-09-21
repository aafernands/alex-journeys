"use client";

import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import type { ReactNode } from "react";

/**
 * Renders children only for an allowlisted Auth.js CMS admin
 * (`session.user.isAdmin === true`). Nothing is painted for loading,
 * signed-out, or non-admin sessions. Hidden on `/cms` itself.
 */
export function AdminGate({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  if (pathname === "/cms" || pathname.startsWith("/cms/")) return null;
  if (status !== "authenticated") return null;
  if (session.user?.isAdmin !== true) return null;

  return <>{children}</>;
}
