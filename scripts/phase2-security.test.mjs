import assert from "node:assert/strict";
import test from "node:test";
import { commitFilesAtomically } from "../src/lib/cms/github-atomic.ts";
import { rateLimit } from "../src/lib/cms/rate-limit.ts";

const env = {
  NODE_ENV: process.env.NODE_ENV,
  CMS_GITHUB_TOKEN: process.env.CMS_GITHUB_TOKEN,
  CMS_GITHUB_REPO: process.env.CMS_GITHUB_REPO,
  CMS_GITHUB_BRANCH: process.env.CMS_GITHUB_BRANCH,
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
};

test.afterEach(() => {
  global.fetch = env.fetch;
  for (const [key, value] of Object.entries(env)) {
    if (key === "fetch") continue;
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

test("rate limiter uses local memory only outside production", async () => {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  process.env.NODE_ENV = "test";
  const first = await rateLimit("phase2-local", 1, 60_000);
  const second = await rateLimit("phase2-local", 1, 60_000);
  assert.equal(first.backend, "memory");
  assert.equal(first.ok, true);
  assert.equal(second.ok, false);
});

test("rate limiter fails closed in production without shared store", async () => {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  process.env.NODE_ENV = "production";
  const result = await rateLimit("phase2-production", 1, 60_000);
  assert.equal(result.ok, false);
  assert.equal(result.configured, false);
});

function response(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function setupGithubFetch(sequence) {
  process.env.CMS_GITHUB_TOKEN = "test-token";
  process.env.CMS_GITHUB_REPO = "aafernands/fernandes-journeys";
  process.env.CMS_GITHUB_BRANCH = "main";
  let index = 0;
  global.fetch = async () => {
    const next = sequence[index++];
    if (!next) throw new Error("Unexpected mocked GitHub request.");
    return typeof next === "function" ? next() : next;
  };
}

test("atomic GitHub commit rejects stale files before creating blobs", async () => {
  setupGithubFetch([
    response({ object: { sha: "head" } }),
    response({ tree: { sha: "tree" } }),
    response({ tree: [{ path: "src/content/posts/a.json", type: "blob", sha: "new-sha" }] }),
  ]);
  await assert.rejects(
    commitFilesAtomically(
      [{ path: "src/content/posts/a.json", content: "{}", expectedSha: "old-sha" }],
      "test conflict",
    ),
    /changed; reload and retry/,
  );
});

test("atomic GitHub commit creates one commit and updates the branch", async () => {
  const requests = [];
  setupGithubFetch([
    response({ object: { sha: "head" } }),
    response({ tree: { sha: "tree" } }),
    response({ tree: [{ path: "a.json", type: "blob", sha: "old" }] }),
    async () => {
      requests.push("blob");
      return response({ sha: "new-blob" });
    },
    async () => {
      requests.push("tree");
      return response({ sha: "new-tree" });
    },
    async () => {
      requests.push("commit");
      return response({ sha: "new-commit", html_url: "https://github.com/test/commit/new-commit" });
    },
    async () => {
      requests.push("ref");
      return response({});
    },
  ]);
  const result = await commitFilesAtomically(
    [
      { path: "a.json", content: "new", expectedSha: "old" },
      { path: "deleted.json", content: null, expectedSha: null },
    ],
    "test atomic commit",
  );
  assert.equal(result.commitSha, "new-commit");
  assert.deepEqual(requests, ["blob", "tree", "commit", "ref"]);
});

test("atomic GitHub commit surfaces blob and ref failures without partial success", async () => {
  setupGithubFetch([
    response({ object: { sha: "head" } }),
    response({ tree: { sha: "tree" } }),
    response({ tree: [] }),
    response({ message: "blob failed" }, 500),
  ]);
  await assert.rejects(
    commitFilesAtomically([{ path: "a.json", content: "new", expectedSha: null }], "test blob failure"),
    /create blob a\.json failed/,
  );
});

test("atomic GitHub commit stops before tree creation when a later metadata blob fails", async () => {
  const requests = [];
  setupGithubFetch([
    response({ object: { sha: "head" } }),
    response({ tree: { sha: "tree" } }),
    response({ tree: [{ path: "meta.json", type: "blob", sha: "old-meta" }] }),
    async () => {
      requests.push("image-blob");
      return response({ sha: "new-image" });
    },
    async () => {
      requests.push("metadata-blob");
      return response({ message: "metadata failed" }, 500);
    },
  ]);

  await assert.rejects(
    commitFilesAtomically(
      [
        { path: "image.png", content: "image", expectedSha: null },
        { path: "meta.json", content: "{}", expectedSha: "old-meta" },
      ],
      "test metadata failure",
    ),
    /create blob meta\.json failed/,
  );
  assert.deepEqual(requests, ["image-blob", "metadata-blob"]);
});

test("atomic GitHub commit can retry successfully after a stale conflict", async () => {
  setupGithubFetch([
    response({ object: { sha: "head" } }),
    response({ tree: { sha: "tree" } }),
    response({ tree: [{ path: "meta.json", type: "blob", sha: "new-meta" }] }),
  ]);
  await assert.rejects(
    commitFilesAtomically(
      [{ path: "meta.json", content: "{}", expectedSha: "old-meta" }],
      "stale attempt",
    ),
    /changed; reload and retry/,
  );

  const requests = [];
  setupGithubFetch([
    response({ object: { sha: "head-2" } }),
    response({ tree: { sha: "tree-2" } }),
    response({ tree: [{ path: "meta.json", type: "blob", sha: "new-meta" }] }),
    async () => {
      requests.push("blob");
      return response({ sha: "retry-blob" });
    },
    async () => {
      requests.push("tree");
      return response({ sha: "retry-tree" });
    },
    async () => {
      requests.push("commit");
      return response({ sha: "retry-commit" });
    },
    async () => {
      requests.push("ref");
      return response({});
    },
  ]);
  const result = await commitFilesAtomically(
    [{ path: "meta.json", content: "retry", expectedSha: "new-meta" }],
    "retry after conflict",
  );
  assert.equal(result.commitSha, "retry-commit");
  assert.deepEqual(requests, ["blob", "tree", "commit", "ref"]);
});
