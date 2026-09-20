import type { Metadata } from "next";
import { isCredentialsAuthConfigured } from "@/auth";
import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Forgot password",
  description: "Reset your Fernandes Journeys reader password.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/forgot-password" },
};

export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  const credentialsConfigured = isCredentialsAuthConfigured();
  return (
    <main className="bg-bg">
      <div className="section-shell py-10 md:py-14">
        <div className="mx-auto max-w-md">
          <ForgotPasswordForm credentialsConfigured={credentialsConfigured} />
        </div>
      </div>
    </main>
  );
}
