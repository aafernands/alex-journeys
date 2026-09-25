"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";
import { TripFocusProvider } from "@/components/trip-planner/TripFocus";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <TripFocusProvider>{children}</TripFocusProvider>
    </SessionProvider>
  );
}
