import type { Metadata } from "next";
import { Suspense } from "react";
import { ConfirmEmailClient } from "@/components/ConfirmEmailClient";

export const metadata: Metadata = {
  title: "Confirm email",
  description: "Confirm your new Alex Journeys account email.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/account/confirm-email" },
};

export const dynamic = "force-dynamic";

export default async function ConfirmEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token =
    typeof params.token === "string" && params.token.trim()
      ? params.token.trim()
      : null;

  return (
    <main className="account-page bg-bg" data-density="compact">
      <div className="section-shell py-6 md:py-10">
        <div className="mx-auto max-w-md">
          <Suspense
            fallback={
              <div className="panel p-4">
                <p className="text-sm text-muted">Loading…</p>
              </div>
            }
          >
            <ConfirmEmailClient token={token} />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
