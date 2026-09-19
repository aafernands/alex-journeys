import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "CMS",
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function CmsLayout({ children }: { children: ReactNode }) {
  return (
    <main className="bg-bg">
      <div className="section-shell py-10 md:py-14">{children}</div>
    </main>
  );
}
