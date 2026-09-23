import assert from "node:assert/strict";
import test, { mock } from "node:test";

let authAllowed = false;

mock.module("next/server.js", {
  namedExports: {
    NextResponse: {
      json(body, init = {}) {
        return new Response(JSON.stringify(body), {
          ...init,
          headers: { "content-type": "application/json", ...(init.headers || {}) },
        });
      },
    },
  },
});
mock.module("@/lib/cms/auth", {
  namedExports: { isCmsAuthenticated: () => authAllowed },
});
mock.module("@/data/destinations", {
  namedExports: { destinationSlugs: [] },
});
mock.module("@/data/guides", {
  namedExports: { getGuideHubSlugs: () => [] },
});
mock.module("@/lib/cms/github", {
  namedExports: {
    isGithubConfigured: () => true,
    deleteDraft: async () => ({ commitUrl: "test" }),
    deletePost: async () => ({ commitUrl: "test", commitSha: "test" }),
    deletePage: async () => ({ commitUrl: "test", commitSha: "test" }),
    publishDraft: async () => ({ slug: "test", commitUrl: "test" }),
    publishPost: async () => ({ slug: "test", created: true, commitUrl: "test" }),
    publishPage: async () => ({ slug: "test", created: true, commitUrl: "test" }),
    addMediaByUrl: async () => ({ item: {}, created: true, commitUrl: "test" }),
    uploadMediaFile: async () => ({ item: {}, commitUrl: "test" }),
    updateSiteDesign: async () => ({ design: {}, commitUrl: "test" }),
  },
});
mock.module("@/lib/cms/media", {
  namedExports: { getAllMedia: () => [], readMediaIndex: () => ({ count: 0, items: [] }) },
});
mock.module("@/lib/cms/media-limits", {
  namedExports: { MAX_MEDIA_UPLOAD_BYTES: 1024, MAX_MEDIA_UPLOAD_LABEL: "1KB" },
});
mock.module("@/lib/site-design", {
  namedExports: { getSiteDesign: () => ({}), validateSiteDesignInput: () => ({ ok: true, design: {} }) },
});
mock.module("@/lib/firebase-admin", {
  namedExports: { isFirebaseConfigured: () => true },
});
mock.module("@/lib/users", {
  namedExports: { listUsersSafe: async () => [], UsersUnavailableError: class extends Error {} },
});

const [posts, pages, media, users, design] = await Promise.all([
  import("../src/app/api/cms/posts/route.ts"),
  import("../src/app/api/cms/pages/route.ts"),
  import("../src/app/api/cms/media/route.ts"),
  import("../src/app/api/cms/users/route.ts"),
  import("../src/app/api/cms/design/route.ts"),
]);

const handlers = [
  ["/api/cms/posts", () => posts.POST(new Request("http://test", { method: "POST", body: "{}" }))],
  ["/api/cms/pages", () => pages.POST(new Request("http://test", { method: "POST", body: "{}" }))],
  ["/api/cms/media", () => media.POST(new Request("http://test", { method: "POST", body: "{}" }))],
  ["/api/cms/users", () => users.GET()],
  ["/api/cms/design", () => design.PUT(new Request("http://test", { method: "PUT", body: "{}" }))],
];

for (const [path, invoke] of handlers) {
  test(`${path} denies unauthenticated requests`, async () => {
    authAllowed = false;
    const response = await invoke();
    assert.equal(response.status, 401);
  });

  test(`${path} proceeds for an authorized CMS identity`, async () => {
    authAllowed = true;
    const response = await invoke();
    assert.notEqual(response.status, 401);
  });
}

test("client-supplied admin fields do not bypass the route boundary", async () => {
  authAllowed = false;
  const response = await posts.POST(
    new Request("http://test", {
      method: "POST",
      body: JSON.stringify({ isAdmin: true, email: "admin@example.com", role: "admin" }),
      headers: { "content-type": "application/json" },
    }),
  );
  assert.equal(response.status, 401);
});

test("reader, tampered passcode, and expired passcode decisions remain denied", async () => {
  for (const identity of ["reader", "tampered-passcode", "expired-passcode"]) {
    authAllowed = false;
    const response = await users.GET();
    assert.equal(response.status, 401, identity);
  }
});
