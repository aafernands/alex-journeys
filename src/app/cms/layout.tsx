import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CmsShell } from "@/components/cms/CmsShell";
import {
  hasOauthAdminSession,
  isCmsAuthenticated,
} from "@/lib/cms/auth";

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

  return (
    <main className="bg-bg">
      <div className="section-shell py-10 md:py-14">
        <CmsShell oauthSession={oauthAdmin}>{children}</CmsShell>
      </div>
    </main>
  );
}
