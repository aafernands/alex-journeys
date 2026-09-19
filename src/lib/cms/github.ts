import type { Post, PostMeta } from "@/lib/post-types";
import { toPostMeta, type ValidatedPost } from "@/lib/cms/validate";

const DEFAULT_REPO = "aafernands/travel-lifestyle-site";
const DEFAULT_BRANCH = "main";
const POSTS_PATH = "src/content/posts";

type GhFileResponse = {
  sha: string;
  content?: string;
  encoding?: string;
  html_url?: string;
};

type GhPutResponse = {
  content?: { html_url?: string; sha?: string; path?: string };
  commit?: { html_url?: string; sha?: string };
};

function getToken(): string | undefined {
  return (
    process.env.CMS_GITHUB_TOKEN ||
    process.env.GITHUB_TOKEN ||
    undefined
  );
}

function getRepo(): string {
  return process.env.CMS_GITHUB_REPO?.trim() || DEFAULT_REPO;
}

function getBranch(): string {
  return process.env.CMS_GITHUB_BRANCH?.trim() || DEFAULT_BRANCH;
}

export function isGithubConfigured(): boolean {
  return Boolean(getToken());
}

function apiUrl(path: string): string {
  const repo = getRepo();
  return `https://api.github.com/repos/${repo}/contents/${path}`;
}

async function ghFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const token = getToken();
  if (!token) {
    throw new Error("GitHub token not configured (CMS_GITHUB_TOKEN).");
  }
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Accept", "application/vnd.github+json");
  headers.set("X-GitHub-Api-Version", "2022-11-28");
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(apiUrl(path), { ...init, headers });
}

function encodeContent(text: string): string {
  return Buffer.from(text, "utf8").toString("base64");
}

async function getFileSha(path: string): Promise<string | null> {
  const res = await ghFetch(`${path}?ref=${encodeURIComponent(getBranch())}`);
  if (res.status === 404) return null;
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub GET ${path} failed (${res.status}): ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as GhFileResponse;
  return data.sha;
}

async function getFileJson<T>(path: string): Promise<{ data: T; sha: string } | null> {
  const res = await ghFetch(`${path}?ref=${encodeURIComponent(getBranch())}`);
  if (res.status === 404) return null;
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub GET ${path} failed (${res.status}): ${body.slice(0, 200)}`);
  }
  const file = (await res.json()) as GhFileResponse;
  if (!file.content) return null;
  const raw = Buffer.from(file.content.replace(/\n/g, ""), "base64").toString(
    "utf8",
  );
  return { data: JSON.parse(raw) as T, sha: file.sha };
}

async function putFile(
  path: string,
  content: string,
  message: string,
  sha?: string | null,
): Promise<{ commitUrl: string }> {
  const body: Record<string, string> = {
    message,
    content: encodeContent(content),
    branch: getBranch(),
  };
  if (sha) body.sha = sha;

  const res = await ghFetch(path, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub PUT ${path} failed (${res.status}): ${text.slice(0, 300)}`);
  }
  const data = (await res.json()) as GhPutResponse;
  const commitUrl =
    data.commit?.html_url ||
    data.content?.html_url ||
    `https://github.com/${getRepo()}/blob/${getBranch()}/${path}`;
  return { commitUrl };
}

type PostsIndex = {
  migratedAt?: string;
  source?: string;
  count: number;
  featuredHomepage: string[];
  posts: PostMeta[];
};

function upsertIndex(index: PostsIndex, meta: PostMeta): PostsIndex {
  const without = index.posts.filter((p) => p.slug !== meta.slug);
  const posts = [meta, ...without].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  return {
    ...index,
    count: posts.length,
    posts,
  };
}

export async function publishPost(
  validated: ValidatedPost,
  options?: { update?: boolean },
): Promise<{ commitUrl: string; slug: string; created: boolean }> {
  const post = {
    title: validated.title,
    slug: validated.slug,
    date: validated.date,
    excerpt: validated.excerpt,
    featuredImage: validated.featuredImage,
    destinations: validated.destinations,
    contentHtml: validated.contentHtml,
    source: "cms" as const,
  } satisfies Post;

  const postPath = `${POSTS_PATH}/${validated.slug}.json`;
  const existingSha = await getFileSha(postPath);
  const created = !existingSha;

  if (!options?.update && existingSha) {
    throw new Error(`A post with slug "${validated.slug}" already exists.`);
  }

  const postResult = await putFile(
    postPath,
    `${JSON.stringify(post, null, 2)}\n`,
    created
      ? `cms: create post ${validated.slug}`
      : `cms: update post ${validated.slug}`,
    existingSha,
  );

  const indexPath = `${POSTS_PATH}/_index.json`;
  const indexFile = await getFileJson<PostsIndex>(indexPath);
  if (!indexFile) {
    throw new Error("Could not read posts _index.json from GitHub.");
  }
  const nextIndex = upsertIndex(indexFile.data, toPostMeta(validated));
  const indexResult = await putFile(
    indexPath,
    `${JSON.stringify(nextIndex, null, 2)}\n`,
    `cms: update posts index for ${validated.slug}`,
    indexFile.sha,
  );

  return {
    commitUrl: indexResult.commitUrl || postResult.commitUrl,
    slug: validated.slug,
    created,
  };
}

export async function fetchPostFromGithub(
  slug: string,
): Promise<Post | null> {
  const file = await getFileJson<Post>(`${POSTS_PATH}/${slug}.json`);
  return file?.data ?? null;
}
