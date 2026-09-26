import type { Metadata } from "next";
import { Suspense } from "react";
import { isCredentialsAuthConfigured } from "@/auth";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";
import { NeedHelpLink } from "@/components/NeedHelpLink";

export const metadata: Metadata = {
  title: "Reset password",
  description: "Choose a new Alex Journeys reader password.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/reset-password" },
};

export const dynamic = "force-dynamic";

function ResetPasswordInner({
  token,
  credentialsConfigured,
}: {
  token: string | null;
  credentialsConfigured: boolean;
}) {
  return (
    <ResetPasswordForm
      token={token}
      credentialsConfigured={credentialsConfigured}
    />
  );
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token =
    typeof params.token === "string" && params.token.trim()
      ? params.token.trim()
      : null;
  const credentialsConfigured = isCredentialsAuthConfigured();

  return (
    <main className="bg-bg">
      <div className="section-shell py-10 md:py-14">
        <div className="mx-auto max-w-md">
          <Suspense
            fallback={
              <div className="panel p-6 md:p-8">
                <p className="text-sm text-muted">Loading…</p>
              </div>
            }
          >
            <ResetPasswordInner
              token={token}
              credentialsConfigured={credentialsConfigured}
            />
          </Suspense>
          <NeedHelpLink />
        </div>
      </div>
    </main>
  );
}
