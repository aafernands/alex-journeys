/** Shared reader user types (safe for client imports). */

export type AuthProviderId = "google" | "github" | "credentials";

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
};
