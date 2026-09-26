import type { Metadata } from "next";
import { auth } from "@/auth";
import { VerifyEmailClient } from "@/components/VerifyEmailClient";
import { isFirebaseConfigured } from "@/lib/firebase-admin";
import { getUserById } from "@/lib/users";

export const metadata: Metadata = {
  title: "Confirm your email",
  description: "Confirm the email on your Alex Journeys account.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/verify-email" },
};

export const dynamic = "force-dynamic";

function safeNext(raw: unknown): string {
  if (typeof raw !== "string") return "/account";
  const next = raw.trim();
  return next.startsWith("/") && !next.startsWith("//") ? next : "/account";
}

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ uid?: string; token?: string; next?: string }>;
}) {
  const params = await searchParams;
  const uid = typeof params.uid === "string" ? params.uid.trim() : "";
  const token = typeof params.token === "string" ? params.token.trim() : "";
  const session = await auth();
  const userId = session?.user?.id?.trim() || null;

  let email: string | null = session?.user?.email ?? null;
  let verified = false;
  if (userId && isFirebaseConfigured()) {
    try {
      const profile = await getUserById(userId);
      if (profile) {
        email = profile.email || email;
        verified = profile.emailVerified;
      }
    } catch (err) {
      console.warn("[verify-email] profile lookup failed:", err);
    }
  }

  return (
    <main className="account-page bg-bg" data-density="compact">
      <div className="section-shell py-6 md:py-10">
        <div className="mx-auto max-w-md">
          <VerifyEmailClient
            link={uid && token ? { uid, token } : null}
            signedIn={Boolean(userId)}
            email={email}
            verified={verified}
            next={safeNext(params.next)}
          />
        </div>
      </div>
    </main>
  );
}
