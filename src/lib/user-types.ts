/** Shared reader user types (safe for client imports). */

export type AuthProviderId = "google" | "twitter" | "github" | "credentials";

/** Public user profile — never includes passwordHash. */
export type UserPublic = {
  id: string;
  email: string;
  name: string | null;
  providers: AuthProviderId[];
  image: string | null;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  disabled: boolean;
  /**
   * When true, OAuth upsert must not overwrite `email` (user changed email
   * locally and verified). Doc id stays stable.
   */
  emailManagedLocally: boolean;
  /** When true, OAuth upsert must not overwrite `name`. */
  nameManagedLocally: boolean;
  /** When true, OAuth upsert must not overwrite `image` (custom photo). */
  imageManagedLocally: boolean;
  /**
   * The account has proved it owns `email` (code/link, reset link, email
   * change, or Google). See src/lib/email-verification.ts.
   */
  emailVerified: boolean;
};
