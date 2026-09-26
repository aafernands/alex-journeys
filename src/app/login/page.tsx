import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import {
  auth,
  isCredentialsAuthConfigured,
  isGoogleAuthConfigured,
  isOauthConfigured,
  isTwitterAuthConfigured,
} from "@/auth";
import { ReaderLoginForm } from "@/components/ReaderLoginForm";
import { NeedHelpLink } from "@/components/NeedHelpLink";

export const metadata: Metadata = {
  title: "Sign in",
  description:
    "Sign in to Alex Journeys to save stories and trip plans.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/login" },
};

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;
  if (session?.user) {
    const dest =
      params.callbackUrl &&
      params.callbackUrl.startsWith("/") &&
      !params.callbackUrl.startsWith("//")
        ? params.callbackUrl
        : "/account";
    redirect(dest);
  }

  const googleConfigured =
    isOauthConfigured() && isGoogleAuthConfigured();
  const twitterConfigured =
    isOauthConfigured() && isTwitterAuthConfigured();
  const credentialsConfigured = isCredentialsAuthConfigured();
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
            <ReaderLoginForm
              googleConfigured={googleConfigured}
              twitterConfigured={twitterConfigured}
              credentialsConfigured={credentialsConfigured}
            />
          </Suspense>
          <NeedHelpLink />
        </div>
      </div>
    </main>
  );
}
