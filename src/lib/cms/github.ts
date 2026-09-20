import type { DestinationContinent } from "@/data/destinations";
import type { Post, PostMeta } from "@/lib/post-types";
import { toPostMeta, type ValidatedPost } from "@/lib/cms/validate";

const DEFAULT_REPO = "aafernands/fernandes-journeys";
const DEFAULT_BRANCH = "main";
const POSTS_PATH = "src/content/posts";
export const DESTINATIONS_TREE_PATH = "src/content/destinations/tree.json";

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

async function putBinaryFile(
  path: string,
  base64Content: string,
  message: string,
  sha?: string | null,
): Promise<{ commitUrl: string }> {
  const body: Record<string, string> = {
    message,
    content: base64Content.replace(/\s/g, ""),
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

  // Best-effort: remove matching draft after publish
  try {
    const draftPath = `src/content/drafts/${validated.slug}.json`;
    const draftSha = await getFileSha(draftPath);
    if (draftSha) {
      await deleteFile(draftPath, `cms: promote draft ${validated.slug}`, draftSha);
    }
  } catch {
    // ignore draft cleanup failures
  }

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

const AUTHOR_PHOTO_META_PATH = "src/data/author-photo.json";
const AUTHOR_PHOTO_DIR = "public/brand";
const MAX_AUTHOR_PHOTO_BYTES = Math.floor(2.5 * 1024 * 1024);

const AUTHOR_PHOTO_TYPES: Record<string, { basename: string }> = {
  "image/jpeg": { basename: "alex-fernandes.jpg" },
  "image/png": { basename: "alex-fernandes.png" },
  "image/webp": { basename: "alex-fernandes.webp" },
};

export async function updateAuthorPhoto(options: {
  base64: string;
  contentType: string;
  filename?: string;
}): Promise<{ commitUrl: string; src: string }> {
  void options.filename;
  const contentType = (options.contentType.trim().toLowerCase().split(";")[0] || "").trim();
  const mapping = AUTHOR_PHOTO_TYPES[contentType];
  if (!mapping) {
    throw new Error(
      "Unsupported image type. Use JPEG, PNG, or WebP (image/jpeg, image/png, image/webp).",
    );
  }

  const base64 = options.base64.replace(/\s/g, "");
  if (!base64) {
    throw new Error("Empty image data.");
  }

  const decodedBytes = Buffer.from(base64, "base64");
  if (decodedBytes.length === 0) {
    throw new Error("Could not decode image data.");
  }
  if (decodedBytes.length > MAX_AUTHOR_PHOTO_BYTES) {
    throw new Error(
      `Image too large (${(decodedBytes.length / (1024 * 1024)).toFixed(1)}MB). Max is about 2.5MB.`,
    );
  }

  const imagePath = `${AUTHOR_PHOTO_DIR}/${mapping.basename}`;
  const src = `/brand/${mapping.basename}`;
  const updatedAt = new Date().toISOString();

  const existingImageSha = await getFileSha(imagePath);
  const imageResult = await putBinaryFile(
    imagePath,
    base64,
    `cms: update author photo (${mapping.basename})`,
    existingImageSha,
  );

  const meta = {
    src,
    updatedAt,
  };
  const existingMetaSha = await getFileSha(AUTHOR_PHOTO_META_PATH);
  const metaResult = await putFile(
    AUTHOR_PHOTO_META_PATH,
    `${JSON.stringify(meta, null, 2)}\n`,
    `cms: update author photo meta`,
    existingMetaSha,
  );

  return {
    commitUrl: metaResult.commitUrl || imageResult.commitUrl,
    src: `${src}?v=${encodeURIComponent(updatedAt)}`,
  };
}

export async function fetchDestinationsTreeFromGithub(): Promise<{
  data: DestinationContinent[];
  sha: string;
} | null> {
  return getFileJson<DestinationContinent[]>(DESTINATIONS_TREE_PATH);
}

export async function publishDestinationsTree(
  tree: DestinationContinent[],
): Promise<{ commitUrl: string }> {
  const existingSha = await getFileSha(DESTINATIONS_TREE_PATH);
  return putFile(
    DESTINATIONS_TREE_PATH,
    `${JSON.stringify(tree, null, 2)}\n`,
    "cms: update destinations",
    existingSha,
  );
}

const PAGES_PATH = "src/content/pages";
const DRAFTS_PATH = "src/content/drafts";

type PagesIndexFile = {
  migratedAt?: string;
  source?: string;
  pages: string[];
  hubs?: string[];
  skipped?: unknown[];
  draft?: string;
  nav?: unknown;
};

async function deleteFile(
  path: string,
  message: string,
  sha: string,
): Promise<{ commitUrl: string; commitSha?: string }> {
  const res = await ghFetch(path, {
    method: "DELETE",
    body: JSON.stringify({
      message,
      sha,
      branch: getBranch(),
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `GitHub DELETE ${path} failed (${res.status}): ${text.slice(0, 300)}`,
    );
  }
  const data = (await res.json()) as GhPutResponse;
  return {
    commitUrl:
      data.commit?.html_url ||
      `https://github.com/${getRepo()}/commit/${data.commit?.sha || ""}`,
    commitSha: data.commit?.sha,
  };
}

export async function deletePost(
  slug: string,
): Promise<{ commitUrl: string; commitSha?: string }> {
  const postPath = `${POSTS_PATH}/${slug}.json`;
  const existingSha = await getFileSha(postPath);
  if (!existingSha) {
    throw new Error(`Post "${slug}" not found on GitHub.`);
  }

  const delResult = await deleteFile(
    postPath,
    `cms: delete post ${slug}`,
    existingSha,
  );

  const indexPath = `${POSTS_PATH}/_index.json`;
  const indexFile = await getFileJson<PostsIndex>(indexPath);
  if (indexFile) {
    const posts = indexFile.data.posts.filter((p) => p.slug !== slug);
    const featuredHomepage = (indexFile.data.featuredHomepage || []).filter(
      (s) => s !== slug,
    );
    const nextIndex: PostsIndex = {
      ...indexFile.data,
      count: posts.length,
      posts,
      featuredHomepage,
    };
    const indexResult = await putFile(
      indexPath,
      `${JSON.stringify(nextIndex, null, 2)}\n`,
      `cms: remove ${slug} from posts index`,
      indexFile.sha,
    );
    return {
      commitUrl: indexResult.commitUrl || delResult.commitUrl,
      commitSha: delResult.commitSha,
    };
  }

  return delResult;
}

export async function publishDraft(
  validated: ValidatedPost,
): Promise<{ commitUrl: string; slug: string }> {
  const draft = {
    slug: validated.slug,
    title: validated.title,
    date: validated.date,
    status: "draft" as const,
    excerpt: validated.excerpt,
    featuredImage: validated.featuredImage,
    destinations: validated.destinations,
    contentHtml: validated.contentHtml,
    source: "cms" as const,
  };

  const draftPath = `${DRAFTS_PATH}/${validated.slug}.json`;
  const existingSha = await getFileSha(draftPath);
  const result = await putFile(
    draftPath,
    `${JSON.stringify(draft, null, 2)}\n`,
    existingSha
      ? `cms: update draft ${validated.slug}`
      : `cms: save draft ${validated.slug}`,
    existingSha,
  );
  return { commitUrl: result.commitUrl, slug: validated.slug };
}

export async function deleteDraft(
  slug: string,
): Promise<{ commitUrl: string } | null> {
  const draftPath = `${DRAFTS_PATH}/${slug}.json`;
  const existingSha = await getFileSha(draftPath);
  if (!existingSha) return null;
  return deleteFile(draftPath, `cms: delete draft ${slug}`, existingSha);
}

export async function publishPage(
  page: {
    slug: string;
    title: string;
    description: string;
    label?: string;
    contentHtml: string;
    source?: SitePageSource;
  },
  options?: { update?: boolean },
): Promise<{ commitUrl: string; slug: string; created: boolean }> {
  const pagePath = `${PAGES_PATH}/${page.slug}.json`;
  const existingSha = await getFileSha(pagePath);
  const created = !existingSha;

  if (!options?.update && existingSha) {
    throw new Error(`A page with slug "${page.slug}" already exists.`);
  }

  // Preserve WordPress source metadata when updating
  let source = page.source;
  if (existingSha && !source) {
    const existing = await getFileJson<{ source?: SitePageSource }>(pagePath);
    source = existing?.data?.source;
  }

  const payload = {
    slug: page.slug,
    title: page.title,
    label: page.label,
    description: page.description,
    contentHtml: page.contentHtml,
    ...(source ? { source } : {}),
  };

  const pageResult = await putFile(
    pagePath,
    `${JSON.stringify(payload, null, 2)}\n`,
    created
      ? `cms: create page ${page.slug}`
      : `cms: update page ${page.slug}`,
    existingSha,
  );

  const indexPath = `${PAGES_PATH}/_index.json`;
  const indexFile = await getFileJson<PagesIndexFile>(indexPath);
  if (indexFile) {
    const pages = indexFile.data.pages.includes(page.slug)
      ? indexFile.data.pages
      : [...indexFile.data.pages, page.slug];
    const nextIndex: PagesIndexFile = { ...indexFile.data, pages };
    const indexResult = await putFile(
      indexPath,
      `${JSON.stringify(nextIndex, null, 2)}\n`,
      `cms: update pages index for ${page.slug}`,
      indexFile.sha,
    );
    return {
      commitUrl: indexResult.commitUrl || pageResult.commitUrl,
      slug: page.slug,
      created,
    };
  }

  return {
    commitUrl: pageResult.commitUrl,
    slug: page.slug,
    created,
  };
}

type SitePageSource = {
  site: string;
  url: string;
  wpId: number;
  wpSlug: string;
};

export async function deletePage(
  slug: string,
): Promise<{ commitUrl: string; commitSha?: string }> {
  const pagePath = `${PAGES_PATH}/${slug}.json`;
  const existingSha = await getFileSha(pagePath);
  if (!existingSha) {
    throw new Error(`Page "${slug}" not found on GitHub.`);
  }

  const delResult = await deleteFile(
    pagePath,
    `cms: delete page ${slug}`,
    existingSha,
  );

  const indexPath = `${PAGES_PATH}/_index.json`;
  const indexFile = await getFileJson<PagesIndexFile>(indexPath);
  if (indexFile) {
    const pages = indexFile.data.pages.filter((s) => s !== slug);
    const nextIndex: PagesIndexFile = { ...indexFile.data, pages };
    const indexResult = await putFile(
      indexPath,
      `${JSON.stringify(nextIndex, null, 2)}\n`,
      `cms: remove ${slug} from pages index`,
      indexFile.sha,
    );
    return {
      commitUrl: indexResult.commitUrl || delResult.commitUrl,
      commitSha: delResult.commitSha,
    };
  }

  return delResult;
}
