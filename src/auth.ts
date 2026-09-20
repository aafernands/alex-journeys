import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";

/**
 * Auth.js (next-auth v5).
 *
 * - Google: any signed-in user is a public reader (save posts, /saved).
 * - CMS access still requires email in CMS_ADMIN_EMAILS (or passcode) —
 *   see src/lib/cms/auth.ts. Reader sessions alone never unlock /cms.
 * - GitHub OAuth remains available for CMS admins only.
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
    // CMS login UI for provider-less / admin entry; readers call signIn("google").
    signIn: "/cms",
    error: "/cms",
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user?.id) {
        token.sub = user.id;
      } else if (account?.providerAccountId) {
        token.sub = account.providerAccountId;
      }

      const email =
        user?.email ??
        (typeof token.email === "string" ? token.email : undefined);
      token.isAdmin = isAdminEmail(email);
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        if (typeof token.sub === "string" && token.sub) {
          session.user.id = token.sub;
        }
        session.user.isAdmin = Boolean(token.isAdmin);
      }
      return session;
    },
    async signIn({ user, account }) {
      // Public readers: any Google account may sign in.
      if (account?.provider === "google") {
        return true;
      }
      // GitHub (CMS tooling): allowlisted admins only.
      const allow = adminEmails();
      if (allow.size === 0) {
        return false;
      }
      return isAdminEmail(user.email);
    },
  },
});
