import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import {
  auth,
  isCredentialsAuthConfigured,
  isGoogleAuthConfigured,
  isOauthConfigured,
} from "@/auth";
import { ReaderLoginForm } from "@/components/ReaderLoginForm";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in or create a Fernandes Journeys reader account.",
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
            <ReaderLoginForm
              googleConfigured={googleConfigured}
              credentialsConfigured={credentialsConfigured}
            />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
