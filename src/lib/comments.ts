/**
 * Post comments — Cloud Firestore top-level collection:
 *   comments/{commentId}
 * Fields: { slug, body, authorId, authorName, authorImage, createdAt,
 *           parentId, status, updatedAt? }
 *
 * status: pending | approved | rejected (default pending on create).
 * Public surfaces only show approved. CMS moderates the rest.
 */
import type {
  DocumentData,
  Query,
} from "firebase-admin/firestore";
import {
  COMMENT_MAX_BODY,
  type Comment,
  type CommentStatus,
} from "@/lib/comment-types";
import { getFirestoreDb, isFirebaseConfigured } from "@/lib/firebase-admin";
import { getPostBySlug } from "@/lib/posts";

export { COMMENT_MAX_BODY, type Comment, type CommentStatus };

export class CommentsUnavailableError extends Error {
  constructor(message = "Firestore is not configured.") {
    super(message);
    this.name = "CommentsUnavailableError";
  }
}

function requireDb() {
  if (!isFirebaseConfigured()) {
    throw new CommentsUnavailableError();
  }
  const db = getFirestoreDb();
  if (!db) {
    throw new CommentsUnavailableError();
  }
  return db;
}

function commentsCollection() {
  return requireDb().collection("comments");
}

function sanitizeSlug(slug: string): string {
  const s = slug.trim();
  if (!s || s.includes("/") || s.length > 200) {
    throw new Error("Invalid slug.");
  }
  return s;
}

function sanitizeUserId(userId: string): string {
  const id = userId.trim();
  if (!id || id.includes("/") || id.length > 256) {
    throw new Error("Invalid user id.");
  }
  return id;
}

/** Plain text only: strip control chars except newline/tab; normalize newlines. */
export function sanitizeCommentBody(raw: string): string {
  const normalized = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  // eslint-disable-next-line no-control-regex -- intentional strip of C0 controls
  const cleaned = normalized.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
  return cleaned.trim();
}

function parseStatus(value: unknown): CommentStatus {
  if (value === "pending" || value === "approved" || value === "rejected") {
    return value;
  }
  return "pending";
}

function docToComment(id: string, data: DocumentData): Comment {
  const createdAt =
    typeof data.createdAt === "string"
      ? data.createdAt
      : data.createdAt?.toDate?.()?.toISOString?.() ?? new Date(0).toISOString();
  const updatedAt =
    typeof data.updatedAt === "string"
      ? data.updatedAt
      : data.updatedAt?.toDate?.()?.toISOString?.() ?? undefined;

  return {
    id,
    slug: typeof data.slug === "string" ? data.slug : "",
    body: typeof data.body === "string" ? data.body : "",
    authorId: typeof data.authorId === "string" ? data.authorId : "",
    authorName:
      typeof data.authorName === "string" && data.authorName.trim()
        ? data.authorName.trim()
        : "Reader",
    authorImage:
      typeof data.authorImage === "string" && data.authorImage.trim()
        ? data.authorImage.trim()
        : null,
    createdAt,
    parentId:
      typeof data.parentId === "string" && data.parentId.trim()
        ? data.parentId.trim()
        : null,
    status: parseStatus(data.status),
    updatedAt,
  };
}

/** True when Firestore rejects a query for a missing composite index. */
function isFirestoreIndexError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: number | string; message?: string };
  const code = e.code;
  const msg = typeof e.message === "string" ? e.message : "";
  return (
    code === 9 ||
    code === "failed-precondition" ||
    /failed[-_]?precondition/i.test(msg) ||
    /requires an index/i.test(msg) ||
    /The query requires an index/i.test(msg)
  );
}

function logIndexFallback(context: string, err: unknown): void {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(
    `[comments] ${context}: indexed query failed (falling back to in-memory sort).`,
    msg,
    err,
  );
  const urlMatch = msg.match(/https:\/\/console\.firebase\.google\.com[^\s)"]+/);
  if (urlMatch) {
    console.error(`[comments] Create composite index: ${urlMatch[0]}`);
  }
}

function sortByCreatedAt(comments: Comment[], direction: "asc" | "desc"): Comment[] {
  const sorted = [...comments];
  sorted.sort((a, b) =>
    direction === "asc"
      ? a.createdAt.localeCompare(b.createdAt)
      : b.createdAt.localeCompare(a.createdAt),
  );
  return sorted;
}

/** Public list: approved comments for a post, oldest first (thread-friendly). */
export async function listApprovedComments(slug: string): Promise<Comment[]> {
  const s = sanitizeSlug(slug);
  const base = () =>
    commentsCollection()
      .where("slug", "==", s)
      .where("status", "==", "approved");

  try {
    const snap = await base().orderBy("createdAt", "asc").get();
    return snap.docs.map((doc) => docToComment(doc.id, doc.data()));
  } catch (err) {
    if (!isFirestoreIndexError(err)) throw err;
    logIndexFallback("listApprovedComments", err);
    const snap = await base().get();
    return sortByCreatedAt(
      snap.docs.map((doc) => docToComment(doc.id, doc.data())),
      "asc",
    );
  }
}

export type ListCommentsForCmsOpts = {
  status?: CommentStatus | "all";
  slug?: string;
  limit?: number;
};

/**
 * CMS list. Defaults to pending. Sorted by createdAt desc.
 * Falls back to equality-only query + in-memory sort when the composite
 * index is missing (failed-precondition).
 */
export async function listCommentsForCms(
  opts: ListCommentsForCmsOpts = {},
): Promise<Comment[]> {
  const limit = Math.min(Math.max(opts.limit ?? 100, 1), 500);
  const status = opts.status ?? "pending";
  const slug = opts.slug ? sanitizeSlug(opts.slug) : undefined;

  function buildFiltered(includeOrder: boolean): Query {
    let query: Query = commentsCollection();
    if (slug) {
      query = query.where("slug", "==", slug);
    }
    if (status !== "all") {
      query = query.where("status", "==", status);
    }
    if (includeOrder) {
      query = query.orderBy("createdAt", "desc").limit(limit);
    }
    return query;
  }

  try {
    const snap = await buildFiltered(true).get();
    return snap.docs.map((doc) => docToComment(doc.id, doc.data()));
  } catch (err) {
    if (!isFirestoreIndexError(err)) throw err;
    logIndexFallback("listCommentsForCms", err);
    const snap = await buildFiltered(false).get();
    return sortByCreatedAt(
      snap.docs.map((doc) => docToComment(doc.id, doc.data())),
      "desc",
    ).slice(0, limit);
  }
}

/** Count pending comments (for CMS badge / dashboard). */
export async function countPendingComments(): Promise<number> {
  const snap = await commentsCollection()
    .where("status", "==", "pending")
    .count()
    .get();
  return snap.data().count;
}

export async function getCommentById(id: string): Promise<Comment | null> {
  const trimmed = id.trim();
  if (!trimmed || trimmed.includes("/") || trimmed.length > 256) {
    throw new Error("Invalid comment id.");
  }
  const doc = await commentsCollection().doc(trimmed).get();
  if (!doc.exists) return null;
  return docToComment(doc.id, doc.data()!);
}

export type CreateCommentInput = {
  slug: string;
  body: string;
  authorId: string;
  authorName: string;
  authorImage?: string | null;
  parentId?: string | null;
};

/** Create a comment as pending. Validates post exists and one-level replies. */
export async function createComment(
  input: CreateCommentInput,
): Promise<Comment> {
  const slug = sanitizeSlug(input.slug);
  const authorId = sanitizeUserId(input.authorId);
  const body = sanitizeCommentBody(input.body);

  if (!body) {
    throw new Error("Comment cannot be empty.");
  }
  if (body.length > COMMENT_MAX_BODY) {
    throw new Error(`Comment must be ${COMMENT_MAX_BODY} characters or fewer.`);
  }

  const post = getPostBySlug(slug);
  if (!post) {
    throw new Error("Post not found.");
  }

  let parentId: string | null = null;
  if (input.parentId) {
    const parent = await getCommentById(input.parentId);
    if (!parent) {
      throw new Error("Parent comment not found.");
    }
    if (parent.slug !== slug) {
      throw new Error("Parent comment is on a different post.");
    }
    if (parent.parentId) {
      throw new Error("Replies cannot be nested deeper than one level.");
    }
    parentId = parent.id;
  }

  const authorName =
    typeof input.authorName === "string" && input.authorName.trim()
      ? input.authorName.trim().slice(0, 120)
      : "Reader";
  const authorImage =
    typeof input.authorImage === "string" && input.authorImage.trim()
      ? input.authorImage.trim().slice(0, 2048)
      : null;

  const createdAt = new Date().toISOString();
  const ref = commentsCollection().doc();
  const record = {
    slug,
    body,
    authorId,
    authorName,
    authorImage,
    createdAt,
    parentId,
    status: "pending" as const,
  };

  await ref.set(record);

  return { id: ref.id, ...record };
}

export async function setCommentStatus(
  id: string,
  status: CommentStatus,
): Promise<Comment> {
  const comment = await getCommentById(id);
  if (!comment) {
    throw new Error("Comment not found.");
  }
  const updatedAt = new Date().toISOString();
  await commentsCollection().doc(comment.id).update({ status, updatedAt });
  return { ...comment, status, updatedAt };
}

/** Delete a comment. Idempotent if missing. Also deletes direct replies. */
export async function deleteComment(id: string): Promise<void> {
  const trimmed = id.trim();
  if (!trimmed || trimmed.includes("/") || trimmed.length > 256) {
    throw new Error("Invalid comment id.");
  }

  const ref = commentsCollection().doc(trimmed);
  const doc = await ref.get();
  if (!doc.exists) return;

  const replies = await commentsCollection()
    .where("parentId", "==", trimmed)
    .get();

  const batch = requireDb().batch();
  for (const reply of replies.docs) {
    batch.delete(reply.ref);
  }
  batch.delete(ref);
  await batch.commit();
}

export type ReaderComment = Comment & {
  /** Story title from content, or the slug when the story is gone. */
  postTitle: string;
  /** Link back to the comment on its story. */
  href: string;
};

/**
 * Every comment a reader wrote (any status), newest first, for My Journey.
 * Single-field equality on `authorId` with an in-memory sort, so no
 * composite index is needed.
 */
export async function listCommentsByAuthor(
  userId: string,
  limit = 100,
): Promise<ReaderComment[]> {
  const authorId = sanitizeUserId(userId);
  const snap = await commentsCollection().where("authorId", "==", authorId).get();
  const comments = sortByCreatedAt(
    snap.docs.map((doc) => docToComment(doc.id, doc.data())),
    "desc",
  ).slice(0, Math.min(Math.max(limit, 1), 500));
  return comments.map((comment) => {
    const post = comment.slug ? getPostBySlug(comment.slug) : null;
    return {
      ...comment,
      postTitle: post?.title ?? comment.slug,
      href: `/${comment.slug}#comments`,
    };
  });
}
