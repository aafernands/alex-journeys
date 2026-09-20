import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CmsShell } from "@/components/cms/CmsShell";
import {
  hasOauthAdminSession,
  isCmsAuthenticated,
} from "@/lib/cms/auth";
import { countPendingComments } from "@/lib/comments";
import { isFirebaseConfigured } from "@/lib/firebase-admin";

export const metadata: Metadata = {
  title: "CMS",
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default async function CmsLayout({ children }: { children: ReactNode }) {
  const authed = await isCmsAuthenticated();

  if (!authed) {
    return (
      <main className="bg-bg">
        <div className="section-shell py-10 md:py-14">{children}</div>
      </main>
    );
  }

  const oauthAdmin = await hasOauthAdminSession();

  let pendingComments = 0;
  if (isFirebaseConfigured()) {
    try {
      pendingComments = await countPendingComments();
    } catch {
      pendingComments = 0;
    }
  }

  return (
    <main className="bg-bg">
      <div className="section-shell py-10 md:py-14">
        <CmsShell oauthSession={oauthAdmin} pendingComments={pendingComments}>
          {children}
        </CmsShell>
      </div>
    </main>
  );
}
