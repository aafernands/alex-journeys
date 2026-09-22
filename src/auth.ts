import NextAuth, { customFetch } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import Twitter from "next-auth/providers/twitter";
import {
  grantsCmsAdmin,
  hasCmsAdminAllowlist,
  isAdminEmail,
  isCredentialsAuthConfigured,
  isGitHubAuthConfigured,
  isGoogleAuthConfigured,
  isTwitterAuthConfigured,
} from "@/lib/auth-config";
import { authCookies } from "@/lib/auth-cookies";
import { noteAuthError } from "@/lib/auth-error-redirect";
import { isFirebaseConfigured } from "@/lib/firebase-admin";
import { safeAuthErrorDetails } from "@/lib/auth-error-log";
import {
  readTwitterOAuthCredentials,
  TWITTER_TOKEN_URL,
  TWITTER_USERINFO_URL,
  twitterAuthorization,
  twitterTokenFetch,
} from "@/lib/twitter-oauth";
import {
  authorizeCredentials,
  getUserById,
  optionalOauthEmail,
  upsertOauthUser,
} from "@/lib/users";

export {
  grantsCmsAdmin,
  isAdminEmail,
  isCredentialsAuthConfigured,
  isGitHubAuthConfigured,
  isGoogleAuthConfigured,
  isOauthConfigured,
  isReaderAuthConfigured,
  isTwitterAuthConfigured,
} from "@/lib/auth-config";

/**
 * Auth.js (next-auth v5).
 *
 * - Google and X (Twitter): any signed-in user is a public reader.
 * - Credentials (email/password): public readers via Firestore + bcrypt.
 * - CMS access still requires email in CMS_ADMIN_EMAILS (or passcode) —
 *   see src/lib/cms/auth.ts. Reader sessions alone never unlock /cms.
 * - X never grants CMS admin, even when an email matches the allowlist.
 * - GitHub OAuth remains available for CMS admins only.
 *
 * Sign-in UI for readers: `/login`. CMS keeps its own login at `/cms`.
 * Env helpers (`isTwitterAuthConfigured`, `isReaderAuthConfigured`, …) live in
 * `src/lib/auth-config.ts` and are re-exported above.
 */

const twitterCredentials = readTwitterOAuthCredentials();
const sharedAuthCookies = authCookies();

const providers = [
  ...(isGoogleAuthConfigured()
    ? [
        Google({
          clientId: process.env.AUTH_GOOGLE_ID!,
          clientSecret: process.env.AUTH_GOOGLE_SECRET!,
        }),
      ]
    : []),
  ...(isTwitterAuthConfigured()
    ? [
        Twitter({
          clientId: twitterCredentials.clientId,
          clientSecret: twitterCredentials.clientSecret,
          // url + params (not a raw authorize URL, and not params alone).
          // Scope matches Auth.js: users.read tweet.read offline.access.
          // tweet.read is required for GET /2/users/me. This app does not post.
          authorization: twitterAuthorization,
          token: TWITTER_TOKEN_URL,
          userinfo: TWITTER_USERINFO_URL,
          // Auth.js Basic auth omits body client_id. X then 400s and Auth.js
          // reports that as error=Configuration. See twitterTokenFetch.
          [customFetch]: twitterTokenFetch(twitterCredentials.clientId),
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
  // www and apex share state + PKCE. CSRF stays host-only (__Host-).
  ...(sharedAuthCookies ? { cookies: sharedAuthCookies } : {}),
  logger: {
    error(error) {
      noteAuthError(error);
      const details = safeAuthErrorDetails(error);
      console.error(`[auth][error] ${details.name}: ${details.message}`);
      if (details.oauthError || details.oauthDescription) {
        console.error("[auth][error] oauth:", {
          error: details.oauthError,
          error_description: details.oauthDescription,
        });
      }
    },
  },
  providers,
  pages: {
    // Public reader login (email/password, Google, X). CMS keeps `/cms` UI.
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

      if (typeof account?.provider === "string" && account.provider) {
        token.authProvider = account.provider;
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

      // Keep JWT email/name/image aligned with Firestore (esp. after email
      // change / emailManagedLocally). Refresh on login, on session.update,
      // and lightly on subsequent JWT touches (~60s). Failures keep token.
      const sub = typeof token.sub === "string" ? token.sub : "";
      if (sub && isFirebaseConfigured()) {
        const lastSync =
          typeof token.profileSyncedAt === "number"
            ? token.profileSyncedAt
            : 0;
        const shouldRefresh =
          Boolean(user) ||
          trigger === "update" ||
          !lastSync ||
          Date.now() - lastSync > 60_000;
        if (shouldRefresh) {
          try {
            const profile = await getUserById(sub);
            if (profile) {
              const syncedEmail = optionalOauthEmail(profile.email);
              if (syncedEmail) token.email = syncedEmail;
              if (profile.name !== undefined) {
                token.name = profile.name;
              }
              if (profile.image !== undefined) {
                token.picture = profile.image;
              }
              token.profileSyncedAt = Date.now();
            }
          } catch (err) {
            console.warn("[auth] profile sync from Firestore failed:", err);
          }
        }
      }

      // X often has no email. Missing or non-string values must not throw.
      const email =
        optionalOauthEmail(token.email) ??
        optionalOauthEmail(user?.email) ??
        undefined;
      token.isAdmin = grantsCmsAdmin({
        email,
        authProvider:
          typeof token.authProvider === "string" ? token.authProvider : null,
      });
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        if (typeof token.sub === "string" && token.sub) {
          session.user.id = token.sub;
        }
        // X often omits email. Only write a real address onto the session.
        const sessionEmail = optionalOauthEmail(token.email);
        if (sessionEmail) session.user.email = sessionEmail;
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

      // Public readers: Google and X may sign in (unless disabled).
      // X is not an admin provider — do not fall through to the allowlist.
      if (
        account?.provider === "google" ||
        account?.provider === "twitter"
      ) {
        const id =
          account.providerAccountId ||
          (typeof user.id === "string" ? user.id : "");
        if (!id) return false;
        try {
          const result = await upsertOauthUser({
            id,
            // null is valid: X OAuth 2 usually omits email.
            email: optionalOauthEmail(user?.email),
            name: user.name,
            image: user.image,
            provider: account.provider,
          });
          return result.ok;
        } catch (err) {
          // A thrown signIn callback becomes error=Configuration and
          // sends the reader back to /login with no session.
          console.error("[auth] oauth signIn failed:", err);
          return true;
        }
      }

      // GitHub (CMS tooling): allowlisted admins only + upsert profile.
      if (!hasCmsAdminAllowlist()) {
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
