/** Server-only: reads the CMS Downloads manager form upload. */
import {
  MAX_MEMBER_FILE_BYTES,
  MAX_MEMBER_FILE_LABEL,
  validateDownloadMeta,
  validateMemberFile,
  type DownloadMeta,
} from "@/lib/member-downloads-shared";
import type { MemberFileUpload } from "@/lib/member-downloads";

/** Room for the form fields on top of the file. */
const FORM_OVERHEAD_BYTES = 64 * 1024;

export type ParsedDownloadForm =
  | { ok: true; meta: DownloadMeta; file: MemberFileUpload | null }
  | { ok: false; status: number; error: string };

/** Multipart body from the CMS Downloads manager: title, description, type, coverUrl, file. */
export async function parseDownloadForm(
  request: Request,
  options: { fileRequired: boolean },
): Promise<ParsedDownloadForm> {
  const length = Number(request.headers.get("content-length") || "0");
  if (length > MAX_MEMBER_FILE_BYTES + FORM_OVERHEAD_BYTES) {
    return {
      ok: false,
      status: 413,
      error: `That file is too large. The limit is ${MAX_MEMBER_FILE_LABEL} per file.`,
    };
  }
  const type = request.headers.get("content-type") || "";
  if (!type.includes("multipart/form-data")) {
    return { ok: false, status: 400, error: "Send the download as a form upload." };
  }
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return { ok: false, status: 400, error: "Could not read the upload." };
  }
  const text = (key: string) => {
    const value = form.get(key);
    return typeof value === "string" ? value : "";
  };
  const meta = validateDownloadMeta({
    title: text("title"),
    description: text("description"),
    type: text("type"),
    coverUrl: text("coverUrl"),
  });
  if (!meta.ok) return { ok: false, status: 400, error: meta.error };

  const raw = form.get("file");
  const hasFile = raw instanceof File && raw.size > 0;
  if (!hasFile) {
    if (options.fileRequired) return { ok: false, status: 400, error: "Choose a file to upload." };
    return { ok: true, meta: meta.data, file: null };
  }
  const file = raw as File;
  const check = validateMemberFile({ name: file.name, size: file.size });
  if (!check.ok) return { ok: false, status: 400, error: check.error };
  const bytes = Buffer.from(await file.arrayBuffer());
  return {
    ok: true,
    meta: meta.data,
    file: { bytes, fileName: check.fileName, contentType: check.contentType },
  };
}
