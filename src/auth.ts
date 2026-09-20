import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";

/**
 * Auth.js (next-auth v5) for CMS admins.
 *
 * TODO: Public reader accounts (email magic-link / OAuth for non-admin visitors)
 * are not implemented yet — do not add Credentials or public signup here until
 * product requirements are defined.
 */

function adminEmails(): Set<string> {
  const raw = process.env.CMS_ADMIN_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().has(email.trim().toLowerCase());
}

/** True when Google OAuth client env vars are set. */
export function isGoogleAuthConfigured(): boolean {
  return Boolean(
    process.env.AUTH_GOOGLE_ID?.trim() &&
      process.env.AUTH_GOOGLE_SECRET?.trim(),
  );
}

/** True when GitHub OAuth client env vars are set. */
export function isGitHubAuthConfigured(): boolean {
  return Boolean(
    process.env.AUTH_GITHUB_ID?.trim() &&
      process.env.AUTH_GITHUB_SECRET?.trim(),
  );
}

/** True when Auth.js can run (secret + at least one provider). */
export function isOauthConfigured(): boolean {
  return (
    Boolean(process.env.AUTH_SECRET?.trim()) &&
    (isGoogleAuthConfigured() || isGitHubAuthConfigured())
  );
}

const providers = [
  ...(isGoogleAuthConfigured()
    ? [
        Google({
          clientId: process.env.AUTH_GOOGLE_ID!,
          clientSecret: process.env.AUTH_GOOGLE_SECRET!,
        }),
      ]
    : []),
  ...(isGitHubAuthConfigured()
    ? [
        GitHub({
          clientId: process.env.AUTH_GITHUB_ID!,
          clientSecret: process.env.AUTH_GITHUB_SECRET!,
        }),
      ]
    : []),
];

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Allow build without AUTH_SECRET; production runtime must set it for OAuth.
  secret: process.env.AUTH_SECRET || "build-placeholder-not-for-production",
  trustHost: true,
  providers,
  pages: {
    signIn: "/cms",
    error: "/cms",
  },
  callbacks: {
    async jwt({ token, user }) {
      const email =
        user?.email ??
        (typeof token.email === "string" ? token.email : undefined);
      token.isAdmin = isAdminEmail(email);
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.isAdmin = Boolean(token.isAdmin);
      }
      return session;
    },
    async signIn({ user }) {
      // Reject non-allowlisted emails at sign-in when allowlist is configured.
      const allow = adminEmails();
      if (allow.size === 0) {
        // Misconfiguration: no admins listed — deny OAuth access.
        return false;
      }
      return isAdminEmail(user.email);
    },
  },
});
