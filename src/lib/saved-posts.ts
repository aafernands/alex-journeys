/**
 * Reader saved posts — Cloud Firestore subcollection:
 *   users/{userId}/saved/{slug}
 * Fields: { slug, title, savedAt, href? }
 */
import { getFirestoreDb, isFirebaseConfigured } from "@/lib/firebase-admin";
import { getPostBySlug } from "@/lib/posts";

export type SavedPost = {
  slug: string;
  title: string;
  savedAt: string;
  href: string;
};

export class SavedPostsUnavailableError extends Error {
  constructor(message = "Firestore is not configured.") {
    super(message);
    this.name = "SavedPostsUnavailableError";
  }
}

function requireDb() {
  if (!isFirebaseConfigured()) {
    throw new SavedPostsUnavailableError();
  }
  const db = getFirestoreDb();
  if (!db) {
    throw new SavedPostsUnavailableError();
  }
  return db;
}

function savedCollection(userId: string) {
  return requireDb().collection("users").doc(userId).collection("saved");
}

function sanitizeUserId(userId: string): string {
  const id = userId.trim();
  if (!id || id.includes("/") || id.length > 256) {
    throw new Error("Invalid user id.");
  }
  return id;
}

function sanitizeSlug(slug: string): string {
  const s = slug.trim();
  if (!s || s.includes("/") || s.length > 200) {
    throw new Error("Invalid slug.");
  }
  return s;
}

/** List saved posts for a user, newest first. */
export async function listSavedPosts(userId: string): Promise<SavedPost[]> {
  const uid = sanitizeUserId(userId);
  const snap = await savedCollection(uid)
    .orderBy("savedAt", "desc")
    .get();

  return snap.docs.map((doc) => {
    const data = doc.data();
    const slug = typeof data.slug === "string" ? data.slug : doc.id;
    const title =
      typeof data.title === "string" && data.title.trim()
        ? data.title
        : slug;
    const savedAt =
      typeof data.savedAt === "string"
        ? data.savedAt
        : data.savedAt?.toDate?.()?.toISOString?.() ?? new Date(0).toISOString();
    const href =
      typeof data.href === "string" && data.href.startsWith("/")
        ? data.href
        : `/${slug}`;
    return { slug, title, savedAt, href };
  });
}

/** Whether the user has saved this slug. */
export async function isPostSaved(
  userId: string,
  slug: string,
): Promise<boolean> {
  const uid = sanitizeUserId(userId);
  const s = sanitizeSlug(slug);
  const doc = await savedCollection(uid).doc(s).get();
  return doc.exists;
}

/**
 * Save a post. Loads title from content when available.
 * Returns the saved record.
 */
export async function addSavedPost(
  userId: string,
  slug: string,
): Promise<SavedPost> {
  const uid = sanitizeUserId(userId);
  const s = sanitizeSlug(slug);
  const post = getPostBySlug(s);
  if (!post) {
    throw new Error("Post not found.");
  }

  const href = `/${s}`;
  const savedAt = new Date().toISOString();
  const record: SavedPost = {
    slug: s,
    title: post.title,
    savedAt,
    href,
  };

  await savedCollection(uid).doc(s).set(
    {
      slug: record.slug,
      title: record.title,
      savedAt: record.savedAt,
      href: record.href,
    },
    { merge: true },
  );

  return record;
}

/** Remove a saved post. Idempotent. */
export async function removeSavedPost(
  userId: string,
  slug: string,
): Promise<void> {
  const uid = sanitizeUserId(userId);
  const s = sanitizeSlug(slug);
  await savedCollection(uid).doc(s).delete();
}
