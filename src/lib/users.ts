/**
 * Reader user profiles in Cloud Firestore (`users/{userId}`).
 *
 * Document id strategy (keep stable for saved-posts subcollections):
 * - Google / GitHub OAuth: Auth.js provider account id (`account.providerAccountId`),
 *   same as `session.user.id` today so existing `users/{id}/saved` paths stay valid.
 * - Email/password (credentials): `cred_` + first 40 hex chars of SHA-256 of
 *   normalized email (`email:lowercased`). Deterministic across sessions.
 *
 * When registering credentials for an email that already has an OAuth profile,
 * credentials are attached to the existing OAuth doc id (so saves stay unified).
 *
 * Parent docs may also hold a `saved` subcollection (see saved-posts.ts).
 * Profile fields live on the parent; never expose `passwordHash` to clients.
 */
import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import type { DocumentData } from "firebase-admin/firestore";
import { getFirestoreDb, isFirebaseConfigured } from "@/lib/firebase-admin";

import type { AuthProviderId, UserPublic } from "@/lib/user-types";

export type { AuthProviderId, UserPublic } from "@/lib/user-types";

export type UserProfile = UserPublic & {
  /** Present only in server-side reads that need verify; stripped from public APIs. */
  passwordHash: string | null;
};

export class UsersUnavailableError extends Error {
  constructor(message = "Firestore is not configured.") {
    super(message);
    this.name = "UsersUnavailableError";
  }
}

const BCRYPT_ROUNDS = 12;

function requireDb() {
  if (!isFirebaseConfigured()) {
    throw new UsersUnavailableError();
  }
  const db = getFirestoreDb();
  if (!db) {
    throw new UsersUnavailableError();
  }
  return db;
}

function usersCollection() {
  return requireDb().collection("users");
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Stable Firestore doc id for email/password accounts. */
export function credentialsUserId(email: string): string {
  const normalized = normalizeEmail(email);
  const hash = createHash("sha256")
    .update(`email:${normalized}`)
    .digest("hex")
    .slice(0, 40);
  return `cred_${hash}`;
}

function isAuthProviderId(value: unknown): value is AuthProviderId {
  return value === "google" || value === "github" || value === "credentials";
}

function toIso(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value;
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    try {
      return (value as { toDate: () => Date }).toDate().toISOString();
    } catch {
      return null;
    }
  }
  return null;
}

function parseProviders(raw: unknown): AuthProviderId[] {
  if (!Array.isArray(raw)) return [];
  const out: AuthProviderId[] = [];
  for (const item of raw) {
    if (isAuthProviderId(item) && !out.includes(item)) out.push(item);
  }
  return out;
}

function docToProfile(
  id: string,
  data: DocumentData,
): UserProfile {
  const email =
    typeof data.email === "string" ? normalizeEmail(data.email) : "";
  const createdAt = toIso(data.createdAt) ?? new Date(0).toISOString();
  const updatedAt = toIso(data.updatedAt) ?? createdAt;
  return {
    id,
    email,
    name: typeof data.name === "string" ? data.name : null,
    passwordHash:
      typeof data.passwordHash === "string" ? data.passwordHash : null,
    providers: parseProviders(data.providers),
    image: typeof data.image === "string" ? data.image : null,
    createdAt,
    updatedAt,
    lastLoginAt: toIso(data.lastLoginAt),
    disabled: data.disabled === true,
  };
}

export function toUserPublic(user: UserProfile): UserPublic {
  const { passwordHash: _omit, ...rest } = user;
  void _omit;
  return rest;
}

export async function getUserById(
  userId: string,
): Promise<UserProfile | null> {
  const id = userId.trim();
  if (!id || id.includes("/")) return null;
  const snap = await usersCollection().doc(id).get();
  if (!snap.exists) return null;
  return docToProfile(snap.id, snap.data() ?? {});
}

export async function getUserByEmail(
  email: string,
): Promise<UserProfile | null> {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;

  const credId = credentialsUserId(normalized);
  const byCred = await getUserById(credId);
  if (byCred && byCred.email === normalized) return byCred;

  const snap = await usersCollection()
    .where("email", "==", normalized)
    .limit(5)
    .get();
  if (snap.empty) return null;
  const profiles = snap.docs.map((d) => docToProfile(d.id, d.data()));
  return (
    profiles.find((p) => p.providers.includes("credentials")) ??
    profiles[0] ??
    null
  );
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

export type RegisterInput = {
  name: string;
  email: string;
  password: string;
};

/**
 * Create an email/password user. Throws Error with message for validation /
 * conflict; throws UsersUnavailableError when Firestore is down.
 */
export async function registerCredentialsUser(
  input: RegisterInput,
): Promise<UserPublic> {
  const name = input.name.trim();
  const email = normalizeEmail(input.email);
  const password = input.password;

  if (!name) throw new Error("Name is required.");
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Enter a valid email address.");
  }
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  const byEmail = await getUserByEmail(email);
  if (byEmail?.passwordHash) {
    throw new Error("An account with this email already exists.");
  }

  const now = new Date().toISOString();
  const passwordHash = await hashPassword(password);

  // Prefer existing OAuth doc id so saves stay under the same user.
  const docId = byEmail?.id ?? credentialsUserId(email);
  const ref = usersCollection().doc(docId);
  const prior = await ref.get();
  const priorData = prior.exists ? prior.data() ?? {} : {};
  const priorProviders = parseProviders(priorData.providers);
  const mergedProviders = [...priorProviders];
  if (!mergedProviders.includes("credentials")) {
    mergedProviders.push("credentials");
  }

  await ref.set(
    {
      email,
      name,
      passwordHash,
      providers: mergedProviders,
      image: typeof priorData.image === "string" ? priorData.image : null,
      createdAt: prior.exists ? (toIso(priorData.createdAt) ?? now) : now,
      updatedAt: now,
      lastLoginAt: toIso(priorData.lastLoginAt) ?? null,
      disabled: priorData.disabled === true,
    },
    { merge: true },
  );

  const created = await getUserById(docId);
  if (!created) throw new Error("Could not create account.");
  return toUserPublic(created);
}

/**
 * Verify email/password against Firestore. Returns Auth.js-shaped user or null.
 */
export async function authorizeCredentials(
  emailRaw: string,
  password: string,
): Promise<{
  id: string;
  email: string;
  name: string | null;
  image: string | null;
} | null> {
  const email = normalizeEmail(emailRaw);
  if (!email || !password) return null;

  const user =
    (await getUserById(credentialsUserId(email))) ??
    (await getUserByEmail(email));

  if (!user?.passwordHash) return null;
  if (user.disabled) return null;
  if (normalizeEmail(user.email) !== email) return null;

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return null;

  await touchLastLogin(user.id);
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
  };
}

export async function touchLastLogin(userId: string): Promise<void> {
  const id = userId.trim();
  if (!id || id.includes("/")) return;
  const now = new Date().toISOString();
  await usersCollection()
    .doc(id)
    .set({ lastLoginAt: now, updatedAt: now }, { merge: true });
}

export type UpsertOauthInput = {
  id: string;
  email: string | null | undefined;
  name?: string | null;
  image?: string | null;
  provider: "google" | "github";
};

/**
 * Upsert OAuth reader/admin profile. Never clears passwordHash.
 * Returns false when the account is disabled (caller should deny sign-in).
 */
export async function upsertOauthUser(
  input: UpsertOauthInput,
): Promise<{ ok: true } | { ok: false; reason: "disabled" | "unavailable" }> {
  try {
    if (!isFirebaseConfigured()) {
      return { ok: true };
    }
    const id = input.id.trim();
    if (!id || id.includes("/")) return { ok: true };

    const email = input.email ? normalizeEmail(input.email) : "";
    const ref = usersCollection().doc(id);
    const prior = await ref.get();
    const priorData = prior.exists ? prior.data() ?? {} : {};

    if (priorData.disabled === true) {
      return { ok: false, reason: "disabled" };
    }

    if (email) {
      const byEmail = await getUserByEmail(email);
      if (byEmail?.disabled && byEmail.id !== id) {
        return { ok: false, reason: "disabled" };
      }
    }

    const now = new Date().toISOString();
    const providers = parseProviders(priorData.providers);
    if (!providers.includes(input.provider)) providers.push(input.provider);

    const patch: Record<string, unknown> = {
      providers,
      updatedAt: now,
      lastLoginAt: now,
    };
    if (email) patch.email = email;
    if (input.name != null && String(input.name).trim()) {
      patch.name = String(input.name).trim();
    } else if (!prior.exists) {
      patch.name = null;
    }
    if (input.image != null && String(input.image).trim()) {
      patch.image = String(input.image).trim();
    }
    if (!prior.exists) {
      patch.createdAt = now;
      patch.passwordHash = null;
      patch.disabled = false;
      if (!email) patch.email = "";
      if (patch.name === undefined) patch.name = null;
      if (patch.image === undefined) patch.image = null;
    }

    await ref.set(patch, { merge: true });
    return { ok: true };
  } catch (err) {
    console.error("[users] upsertOauthUser failed:", err);
    return { ok: true };
  }
}

export async function listUsers(): Promise<UserPublic[]> {
  const snap = await usersCollection().orderBy("createdAt", "desc").get();
  return snap.docs.map((d) => toUserPublic(docToProfile(d.id, d.data())));
}

/** List without requiring createdAt index — fallback sorts in memory. */
export async function listUsersSafe(): Promise<UserPublic[]> {
  try {
    return await listUsers();
  } catch (err) {
    console.warn("[users] orderBy createdAt failed, falling back:", err);
    const snap = await usersCollection().get();
    const users = snap.docs.map((d) =>
      toUserPublic(docToProfile(d.id, d.data())),
    );
    users.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return users;
  }
}

export async function setUserDisabled(
  userId: string,
  disabled: boolean,
): Promise<UserPublic | null> {
  const id = userId.trim();
  if (!id || id.includes("/")) return null;
  const ref = usersCollection().doc(id);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const now = new Date().toISOString();
  await ref.set(
    { disabled: Boolean(disabled), updatedAt: now },
    { merge: true },
  );
  const updated = await getUserById(id);
  return updated ? toUserPublic(updated) : null;
}

/**
 * Delete user profile document. Does not recursively delete `saved` —
 * subcollections may remain as orphans in Firestore.
 */
export async function deleteUserProfile(userId: string): Promise<boolean> {
  const id = userId.trim();
  if (!id || id.includes("/")) return false;
  const ref = usersCollection().doc(id);
  const snap = await ref.get();
  if (!snap.exists) return false;
  await ref.delete();
  return true;
}

/** True when credentials auth can run (secret + Firebase). */
export function isCredentialsStoreReady(): boolean {
  return Boolean(process.env.AUTH_SECRET?.trim()) && isFirebaseConfigured();
}
