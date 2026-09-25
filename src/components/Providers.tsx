"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";
import { ReaderLoginPrompt } from "@/components/ReaderLoginPrompt";
import { TripFocusProvider } from "@/components/trip-planner/TripFocus";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ReaderLoginPrompt>
        <TripFocusProvider>{children}</TripFocusProvider>
      </ReaderLoginPrompt>
    </SessionProvider>
  );
}
