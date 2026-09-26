/**
 * Members-only downloads in Cloud Firestore. Server-only.
 *
 *   memberDownloads/{id}                  title, type, file details
 *   memberDownloads/{id}/chunks/{v}-{n}   the file bytes, split into pieces
 *
 * The GitHub repo is public, so member files never go through the CMS GitHub
 * publish path or public/. Firestore is private to the server (Admin SDK) and
 * already holds accounts and memberships. A Firestore document tops out at
 * 1 MiB, so each file is stored in pieces of CHUNK_BYTES.
 */
import { createHash } from "node:crypto";
import { getFirestoreDb, isFirebaseConfigured } from "@/lib/firebase-admin";
import {
  cleanDownloadId,
  isDownloadType,
  MAX_MEMBER_FILE_BYTES,
  type DownloadMeta,
  type MemberDownload,
} from "@/lib/member-downloads-shared";

const COLLECTION = "memberDownloads";
export const CHUNK_BYTES = 750_000;

export class DownloadsUnavailableError extends Error {
  constructor(message = "Downloads aren\u2019t available right now.") {
    super(message);
    this.name = "DownloadsUnavailableError";
  }
}

function collection() {
  if (!isFirebaseConfigured()) throw new DownloadsUnavailableError();
  const db = getFirestoreDb();
  if (!db) throw new DownloadsUnavailableError();
  return db.collection(COLLECTION);
}

function iso(value: unknown): string {
  if (typeof value === "string" && !Number.isNaN(Date.parse(value))) return value;
  return new Date(0).toISOString();
}

export function splitIntoChunks(bytes: Buffer, size = CHUNK_BYTES): Buffer[] {
  const chunks: Buffer[] = [];
  for (let offset = 0; offset < bytes.length; offset += size) {
    chunks.push(bytes.subarray(offset, offset + size));
  }
  return chunks;
}

function chunkId(version: number, index: number): string {
  return `v${version}-${String(index).padStart(3, "0")}`;
}

function recordFrom(id: string, data: Record<string, unknown> | undefined): MemberDownload | null {
  if (!data) return null;
  const title = typeof data.title === "string" ? data.title : "";
  if (!title || !isDownloadType(data.type)) return null;
  return {
    id,
    title,
    description: typeof data.description === "string" ? data.description : "",
    type: data.type,
    coverUrl: typeof data.coverUrl === "string" && data.coverUrl ? data.coverUrl : null,
    fileName: typeof data.fileName === "string" ? data.fileName : "download",
    contentType:
      typeof data.contentType === "string" ? data.contentType : "application/octet-stream",
    size: typeof data.size === "number" ? data.size : 0,
    createdAt: iso(data.createdAt),
    updatedAt: iso(data.updatedAt),
  };
}

/** Newest first. */
export async function listDownloads(): Promise<MemberDownload[]> {
  const snap = await collection().orderBy("createdAt", "desc").get();
  const rows: MemberDownload[] = [];
  for (const doc of snap.docs) {
    const row = recordFrom(doc.id, doc.data() as Record<string, unknown>);
    if (row) rows.push(row);
  }
  return rows;
}

export async function getDownload(id: string): Promise<MemberDownload | null> {
  const clean = cleanDownloadId(id);
  if (!clean) return null;
  const snap = await collection().doc(clean).get();
  if (!snap.exists) return null;
  return recordFrom(snap.id, snap.data() as Record<string, unknown>);
}

export type MemberFileUpload = {
  bytes: Buffer;
  fileName: string;
  contentType: string;
};

function assertFile(file: MemberFileUpload) {
  if (file.bytes.length === 0) throw new Error("Invalid file: empty.");
  if (file.bytes.length > MAX_MEMBER_FILE_BYTES) throw new Error("Invalid file: too large.");
}

/** Metadata and every chunk go in one batch, so a half-written file never shows up. */
export async function createDownload(
  meta: DownloadMeta,
  file: MemberFileUpload,
): Promise<MemberDownload> {
  assertFile(file);
  const col = collection();
  const ref = col.doc();
  const now = new Date().toISOString();
  const version = 1;
  const chunks = splitIntoChunks(file.bytes);
  const batch = col.firestore.batch();
  const data = {
    ...meta,
    fileName: file.fileName,
    contentType: file.contentType,
    size: file.bytes.length,
    sha256: createHash("sha256").update(file.bytes).digest("hex"),
    fileVersion: version,
    chunkCount: chunks.length,
    createdAt: now,
    updatedAt: now,
  };
  batch.set(ref, data);
  chunks.forEach((chunk, index) => {
    batch.set(ref.collection("chunks").doc(chunkId(version, index)), {
      version,
      index,
      data: chunk,
    });
  });
  await batch.commit();
  return recordFrom(ref.id, data)!;
}

/** Update the text fields and, when given, swap the file. Old pieces are removed after. */
export async function updateDownload(
  id: string,
  meta: DownloadMeta,
  file?: MemberFileUpload | null,
): Promise<MemberDownload | null> {
  const clean = cleanDownloadId(id);
  if (!clean) return null;
  const col = collection();
  const ref = col.doc(clean);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const current = snap.data() as Record<string, unknown>;
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { ...meta, updatedAt: now };
  let oldVersion: number | null = null;

  if (file) {
    assertFile(file);
    oldVersion = typeof current.fileVersion === "number" ? current.fileVersion : 1;
    const version = oldVersion + 1;
    const chunks = splitIntoChunks(file.bytes);
    const batch = col.firestore.batch();
    chunks.forEach((chunk, index) => {
      batch.set(ref.collection("chunks").doc(chunkId(version, index)), {
        version,
        index,
        data: chunk,
      });
    });
    Object.assign(patch, {
      fileName: file.fileName,
      contentType: file.contentType,
      size: file.bytes.length,
      sha256: createHash("sha256").update(file.bytes).digest("hex"),
      fileVersion: version,
      chunkCount: chunks.length,
    });
    batch.update(ref, patch);
    await batch.commit();
  } else {
    await ref.update(patch);
  }

  if (oldVersion !== null) {
    const old = await ref.collection("chunks").where("version", "==", oldVersion).get();
    if (!old.empty) {
      const batch = col.firestore.batch();
      old.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }
  }
  return recordFrom(clean, { ...current, ...patch });
}

export async function deleteDownload(id: string): Promise<void> {
  const clean = cleanDownloadId(id);
  if (!clean) return;
  const col = collection();
  const ref = col.doc(clean);
  const chunks = await ref.collection("chunks").get();
  const batch = col.firestore.batch();
  chunks.docs.forEach((doc) => batch.delete(doc.ref));
  batch.delete(ref);
  await batch.commit();
}

function toBuffer(value: unknown): Buffer | null {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value);
  if (value && typeof value === "object" && "toUint8Array" in value) {
    const fn = (value as { toUint8Array?: () => Uint8Array }).toUint8Array;
    if (typeof fn === "function") return Buffer.from(fn.call(value));
  }
  return null;
}

/** The file bytes. Only the member download route should call this. */
export async function readDownloadFile(
  id: string,
): Promise<{ download: MemberDownload; bytes: Buffer } | null> {
  const clean = cleanDownloadId(id);
  if (!clean) return null;
  const ref = collection().doc(clean);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const data = snap.data() as Record<string, unknown>;
  const download = recordFrom(clean, data);
  if (!download) return null;
  const version = typeof data.fileVersion === "number" ? data.fileVersion : 1;
  const chunks = await ref.collection("chunks").where("version", "==", version).get();
  const parts = chunks.docs
    .map((doc) => doc.data() as Record<string, unknown>)
    .sort((a, b) => Number(a.index) - Number(b.index))
    .map((part) => toBuffer(part.data));
  if (parts.some((part) => !part)) return null;
  const bytes = Buffer.concat(parts as Buffer[]);
  if (download.size && bytes.length !== download.size) return null;
  return { download, bytes };
}
