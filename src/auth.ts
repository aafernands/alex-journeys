import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import {
  authorizeCredentials,
  isCredentialsStoreReady,
  upsertOauthUser,
} from "@/lib/users";

/**
 * Auth.js (next-auth v5).
 *
 * - Google: any signed-in user is a public reader (save posts on /account).
 * - Credentials (email/password): public readers via Firestore + bcrypt.
 * - CMS access still requires email in CMS_ADMIN_EMAILS (or passcode) —
 *   see src/lib/cms/auth.ts. Reader sessions alone never unlock /cms.
 * - GitHub OAuth remains available for CMS admins only.
 *
 * Sign-in UI for readers: `/login`. CMS keeps its own login at `/cms`.
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

/** True when email/password reader auth can run (AUTH_SECRET + Firebase). */
export function isCredentialsAuthConfigured(): boolean {
  return isCredentialsStoreReady();
}

/**
 * True when Auth.js can run for public readers (secret + Google and/or
 * credentials store).
 */
export function isReaderAuthConfigured(): boolean {
  return (
    Boolean(process.env.AUTH_SECRET?.trim()) &&
    (isGoogleAuthConfigured() || isCredentialsAuthConfigured())
  );
}

/** True when Auth.js can run (secret + at least one provider). */
export function isOauthConfigured(): boolean {
  return (
    Boolean(process.env.AUTH_SECRET?.trim()) &&
    (isGoogleAuthConfigured() ||
      isGitHubAuthConfigured() ||
      isCredentialsAuthConfigured())
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
  ...(isCredentialsAuthConfigured()
    ? [
        Credentials({
          id: "credentials",
          name: "Email and Password",
          credentials: {
            email: { label: "Email", type: "email" },
            password: { label: "Password", type: "password" },
          },
          async authorize(credentials) {
            const email =
              typeof credentials?.email === "string"
                ? credentials.email
                : "";
            const password =
              typeof credentials?.password === "string"
                ? credentials.password
                : "";
            if (!email || !password) return null;
            try {
              return await authorizeCredentials(email, password);
            } catch (err) {
              console.error("[auth] credentials authorize failed:", err);
              return null;
            }
          },
        }),
      ]
    : []),
];

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Allow build without AUTH_SECRET; production runtime must set it for auth.
  secret: process.env.AUTH_SECRET || "build-placeholder-not-for-production",
  trustHost: true,
  providers,
  pages: {
    // Public reader login (email/password + Google). CMS keeps `/cms` UI.
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user, account, trigger, session }) {
      if (user?.id) {
        token.sub = user.id;
      } else if (account?.providerAccountId) {
        token.sub = account.providerAccountId;
      }

      // Client `useSession().update({ name, email, image })` after profile /
      // email-change so the UI reflects Firestore without a full re-login.
      if (trigger === "update" && session && typeof session === "object") {
        const patch = session as {
          name?: string | null;
          email?: string | null;
          image?: string | null;
        };
        if (patch.name !== undefined) {
          token.name = patch.name;
        }
        if (patch.email !== undefined && typeof patch.email === "string") {
          token.email = patch.email.trim().toLowerCase();
        }
        if (patch.image !== undefined) {
          token.picture = patch.image;
        }
      }

      const email =
        (typeof token.email === "string" ? token.email : undefined) ??
        user?.email ??
        undefined;
      token.isAdmin = isAdminEmail(email);
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        if (typeof token.sub === "string" && token.sub) {
          session.user.id = token.sub;
        }
        if (typeof token.email === "string") {
          session.user.email = token.email;
        }
        if (typeof token.name === "string" || token.name === null) {
          session.user.name = token.name as string | null;
        }
        if (typeof token.picture === "string" || token.picture === null) {
          session.user.image = token.picture as string | null;
        }
        session.user.isAdmin = Boolean(token.isAdmin);
      }
      return session;
    },
    async signIn({ user, account }) {
      // Credentials: authorize() already checked password + disabled.
      if (account?.provider === "credentials") {
        return true;
      }

      // Public readers: any Google account may sign in (unless disabled in CMS).
      if (account?.provider === "google") {
        const id =
          account.providerAccountId ||
          (typeof user.id === "string" ? user.id : "");
        if (!id) return false;
        const result = await upsertOauthUser({
          id,
          email: user.email,
          name: user.name,
          image: user.image,
          provider: "google",
        });
        return result.ok;
      }

      // GitHub (CMS tooling): allowlisted admins only + upsert profile.
      const allow = adminEmails();
      if (allow.size === 0) {
        return false;
      }
      if (!isAdminEmail(user.email)) {
        return false;
      }
      if (account?.provider === "github") {
        const id =
          account.providerAccountId ||
          (typeof user.id === "string" ? user.id : "");
        if (id) {
          const result = await upsertOauthUser({
            id,
            email: user.email,
            name: user.name,
            image: user.image,
            provider: "github",
          });
          if (!result.ok) return false;
        }
      }
      return true;
    },
  },
});
