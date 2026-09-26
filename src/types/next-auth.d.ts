import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      isAdmin?: boolean;
      /** Account email is verified (see src/lib/email-verification.ts). */
      emailConfirmed?: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    isAdmin?: boolean;
    /** Profile image (Auth.js often uses `picture`). */
    picture?: string | null;
    /** Last time email/name/image were refreshed from Firestore (ms). */
    profileSyncedAt?: number;
    /** Auth.js provider id from the sign-in that created this token. */
    authProvider?: string;
    /** Mirrors users/{id}.emailVerified, refreshed with the profile sync. */
    emailConfirmed?: boolean;
  }
}
