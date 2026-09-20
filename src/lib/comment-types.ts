/** Client-safe comment types and limits (no firebase-admin). */

export const COMMENT_MAX_BODY = 2000;

export type CommentStatus = "pending" | "approved" | "rejected";

export type Comment = {
  id: string;
  slug: string;
  body: string;
  authorId: string;
  authorName: string;
  authorImage: string | null;
  createdAt: string;
  parentId: string | null;
  status: CommentStatus;
  updatedAt?: string;
};
