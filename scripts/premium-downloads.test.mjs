import assert from "node:assert/strict";
import test, { describe, it, mock } from "node:test";
import { createFakeFirestore } from "./fixtures/fake-firestore.mjs";

const db = createFakeFirestore();
let session = null;
let membership = null;
let membershipThrows = false;
let cmsAllowed = false;

class FakeNextResponse extends Response {
  static json(body, init = {}) {
    return new FakeNextResponse(JSON.stringify(body), {
      ...init,
      headers: { "content-type": "application/json", ...(init.headers || {}) },
    });
  }
}
mock.module("next/server.js", { namedExports: { NextResponse: FakeNextResponse } });
mock.module("@/auth", { namedExports: { auth: async () => session } });
mock.module("@/lib/firebase-admin", {
  namedExports: { isFirebaseConfigured: () => true, getFirestoreDb: () => db },
});
mock.module("@/lib/membership-store", {
  namedExports: {
    getReaderMembership: async () => {
      if (membershipThrows) throw new Error("firestore down");
      return membership;
    },
  },
});
mock.module("@/lib/cms/auth", { namedExports: { isCmsAuthenticated: async () => cmsAllowed } });

const shared = await import("../src/lib/member-downloads-shared.ts");
const store = await import("../src/lib/member-downloads.ts");
const access = await import("../src/lib/premium-access.ts");
const downloadRoute = await import("../src/app/api/premium/download/[id]/route.ts");
const cmsList = await import("../src/app/api/cms/downloads/route.ts");
const cmsItem = await import("../src/app/api/cms/downloads/[id]/route.ts");

const ACTIVE = { status: "active", plan: "monthly" };
const TRIAL = { status: "trialing", plan: "yearly" };
const PAST_DUE = { status: "past_due", plan: "monthly" };
const CANCELED = { status: "canceled", plan: "monthly" };

function getFile(id) {
  return downloadRoute.GET(new Request(`http://test/api/premium/download/${id}`), {
    params: Promise.resolve({ id }),
  });
}

// A file bigger than one chunk, so the split and join are exercised.
const bytes = Buffer.alloc(store.CHUNK_BYTES * 2 + 1234);
for (let i = 0; i < bytes.length; i += 1) bytes[i] = i % 251;
const saved = await store.createDownload(
  { title: "Lisbon guide", description: "Three days.", type: "guide-pdf", coverUrl: null },
  { bytes, fileName: "lisbon-guide.pdf", contentType: "application/pdf" },
);

describe("member file authorization (decision)", () => {
  it("401 signed out, 403 not a member, ok for a member, 503 on a failed lookup", () => {
    const out = { signedIn: false, userId: null, member: false, unavailable: false };
    assert.equal(access.memberFileDecision(out).status, 401);
    const free = { signedIn: true, userId: "u1", member: false, unavailable: false };
    assert.equal(access.memberFileDecision(free).status, 403);
    assert.equal(access.memberFileDecision({ ...free, member: true }).ok, true);
    assert.equal(access.memberFileDecision({ ...free, unavailable: true }).status, 503);
  });
});

describe("GET /api/premium/download/[id]", () => {
  it("returns 401 when signed out", async () => {
    session = null;
    const res = await getFile(saved.id);
    assert.equal(res.status, 401);
    assert.equal(res.headers.get("content-disposition"), null);
  });

  it("returns 403 for a signed-in reader without Premium", async () => {
    session = { user: { id: "free", email: "free@example.com" } };
    for (const record of [null, CANCELED, PAST_DUE, { status: "active", plan: null }]) {
      membership = record;
      const res = await getFile(saved.id);
      assert.equal(res.status, 403, `status for ${JSON.stringify(record)}`);
    }
  });

  it("returns 503, not the file, when membership cannot be read", async () => {
    session = { user: { id: "any", email: "any@example.com" } };
    membershipThrows = true;
    const res = await getFile(saved.id);
    membershipThrows = false;
    assert.equal(res.status, 503);
  });

  it("serves the exact file to an active member, privately", async () => {
    session = { user: { id: "member", email: "member@example.com" } };
    membership = ACTIVE;
    const res = await getFile(saved.id);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("content-type"), "application/pdf");
    assert.match(res.headers.get("content-disposition"), /^attachment; filename="lisbon-guide\.pdf"/);
    assert.match(res.headers.get("cache-control"), /private/);
    assert.match(res.headers.get("cache-control"), /no-store/);
    const body = Buffer.from(await res.arrayBuffer());
    assert.equal(body.length, bytes.length);
    assert.ok(body.equals(bytes));
  });

  it("serves a member on a free trial", async () => {
    session = { user: { id: "trial", email: "trial@example.com" } };
    membership = TRIAL;
    assert.equal((await getFile(saved.id)).status, 200);
  });

  it("returns 404 for a member asking for a missing or malformed id", async () => {
    session = { user: { id: "member", email: "member@example.com" } };
    membership = ACTIVE;
    assert.equal((await getFile("nope")).status, 404);
    assert.equal((await getFile("../../etc/passwd")).status, 404);
  });

  it("checks auth before touching the id, so a stranger learns nothing", async () => {
    session = null;
    assert.equal((await getFile("nope")).status, 401);
  });
});

describe("member file storage", () => {
  it("stores the file in pieces and replaces it cleanly", async () => {
    const small = Buffer.from("preset data");
    const updated = await store.updateDownload(
      saved.id,
      { title: "Lisbon guide v2", description: "", type: "guide-pdf", coverUrl: null },
      { bytes: small, fileName: "lisbon.zip", contentType: "application/zip" },
    );
    assert.equal(updated.title, "Lisbon guide v2");
    const file = await store.readDownloadFile(saved.id);
    assert.ok(file.bytes.equals(small));
    const chunks = await db.collection("memberDownloads").doc(saved.id).collection("chunks").get();
    assert.equal(chunks.size, 1, "old pieces are removed after a replace");
  });

  it("lists newest first and deletes the file with the entry", async () => {
    const extra = await store.createDownload(
      { title: "Presets", description: "", type: "lightroom-presets", coverUrl: "/media/cover.jpg" },
      { bytes: Buffer.from("x"), fileName: "presets.zip", contentType: "application/zip" },
    );
    const rows = await store.listDownloads();
    assert.ok(rows.length >= 2);
    await store.deleteDownload(extra.id);
    assert.equal(await store.getDownload(extra.id), null);
    const chunks = await db.collection("memberDownloads").doc(extra.id).collection("chunks").get();
    assert.equal(chunks.size, 0);
  });

  it("splits at the chunk size", () => {
    const parts = store.splitIntoChunks(Buffer.alloc(10), 4);
    assert.deepEqual(parts.map((p) => p.length), [4, 4, 2]);
  });
});

describe("download validation", () => {
  it("accepts the listed file types up to 4 MB", () => {
    assert.equal(shared.MAX_MEMBER_FILE_BYTES, 4 * 1024 * 1024);
    assert.equal(shared.validateMemberFile({ name: "Guide.PDF", size: 1000 }).ok, true);
    assert.equal(shared.validateMemberFile({ name: "presets.zip", size: 1000 }).ok, true);
    assert.equal(shared.validateMemberFile({ name: "run.exe", size: 1000 }).ok, false);
    assert.equal(shared.validateMemberFile({ name: "big.pdf", size: shared.MAX_MEMBER_FILE_BYTES + 1 }).ok, false);
    assert.equal(shared.validateMemberFile({ name: "empty.pdf", size: 0 }).ok, false);
  });

  it("requires a title and a known type, and a library cover", () => {
    assert.equal(shared.validateDownloadMeta({ title: "", type: "guide-pdf" }).ok, false);
    assert.equal(shared.validateDownloadMeta({ title: "A", type: "video" }).ok, false);
    assert.equal(shared.validateDownloadMeta({ title: "A", type: "other", coverUrl: "https://evil.test/x.jpg" }).ok, false);
    const ok = shared.validateDownloadMeta({ title: " A  guide ", type: "other", coverUrl: "/media/a.jpg" });
    assert.equal(ok.ok, true);
    assert.equal(ok.data.title, "A guide");
  });

  it("keeps file names safe in the header", () => {
    assert.equal(shared.cleanFileName('../x/"evil"\r\nname.pdf'), "-evil-name.pdf");
    assert.doesNotMatch(shared.attachmentDisposition('a"b.pdf'), /a"b/);
  });
});

describe("CMS downloads API is admin only", () => {
  const form = () => {
    const body = new FormData();
    body.append("title", "Guide");
    body.append("type", "guide-pdf");
    body.append("file", new File([Buffer.from("%PDF-1.4")], "guide.pdf", { type: "application/pdf" }));
    return new Request("http://test/api/cms/downloads", { method: "POST", body });
  };
  const ctx = { params: Promise.resolve({ id: saved.id }) };

  it("denies every method without a CMS session", async () => {
    cmsAllowed = false;
    assert.equal((await cmsList.GET()).status, 401);
    assert.equal((await cmsList.POST(form())).status, 401);
    assert.equal((await cmsItem.PATCH(form(), ctx)).status, 401);
    assert.equal((await cmsItem.DELETE(new Request("http://test"), ctx)).status, 401);
  });

  it("uploads for an admin and the file is then member-only", async () => {
    cmsAllowed = true;
    const res = await cmsList.POST(form());
    assert.equal(res.status, 200);
    const { download } = await res.json();
    assert.equal(download.fileName, "guide.pdf");
    session = { user: { id: "free", email: "free@example.com" } };
    membership = null;
    assert.equal((await getFile(download.id)).status, 403);
    cmsAllowed = false;
  });

  it("rejects an oversized upload from its Content-Length", async () => {
    cmsAllowed = true;
    const req = new Request("http://test/api/cms/downloads", {
      method: "POST",
      headers: { "content-type": "multipart/form-data; boundary=x", "content-length": String(6 * 1024 * 1024) },
      body: "x",
    });
    assert.equal((await cmsList.POST(req)).status, 413);
    cmsAllowed = false;
  });
});
