import type { DestinationContinent } from "@/data/destinations";
import type { MediaIndex, MediaItem } from "@/lib/cms/media-types";
import type { Post, PostMeta } from "@/lib/post-types";
import {
  detectMediaSource,
  ensureUniqueMediaId,
  isOwnedUploadUrl,
  mediaIdFromUrl,
  normalizeMediaUrl,
  uploadPathFromUrl,
} from "@/lib/cms/media";
import { toPostMeta, type ValidatedPost } from "@/lib/cms/validate";
import type { SiteDesign } from "@/lib/site-design";
import {
  MAX_MEDIA_UPLOAD_BYTES,
  MAX_MEDIA_UPLOAD_LABEL,
} from "@/lib/cms/media-limits";

const DEFAULT_REPO = "aafernands/fernandes-journeys";
const DEFAULT_BRANCH = "main";
const POSTS_PATH = "src/content/posts";
const PAGES_PATH = "src/content/pages";
const DRAFTS_PATH = "src/content/drafts";
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
    ...(validated.guideHubs.length > 0
      ? { guideHubs: validated.guideHubs }
      : {}),
    contentHtml: validated.contentHtml,
    source: "cms" as const,
    ...(validated.itinerary ? { itinerary: validated.itinerary } : {}),
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

/** Live draft JSON from GitHub Contents API (avoids stale Vercel deploy FS). */
export async function fetchDraftFromGithub(
  slug: string,
): Promise<{
  slug: string;
  title: string;
  date: string;
  status?: "draft";
  excerpt: string;
  featuredImage: Post["featuredImage"];
  destinations: string[];
  guideHubs?: string[];
  contentHtml: string;
  itinerary?: Post["itinerary"];
  source?: unknown;
} | null> {
  const file = await getFileJson<{
    slug: string;
    title: string;
    date: string;
    status?: "draft";
    excerpt: string;
    featuredImage: Post["featuredImage"];
    destinations: string[];
    guideHubs?: string[];
    contentHtml: string;
    itinerary?: Post["itinerary"];
    source?: unknown;
  }>(`${DRAFTS_PATH}/${slug}.json`);
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
    ...(validated.guideHubs.length > 0
      ? { guideHubs: validated.guideHubs }
      : {}),
    contentHtml: validated.contentHtml,
    source: "cms" as const,
    ...(validated.itinerary ? { itinerary: validated.itinerary } : {}),
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
    sections?: Record<string, unknown>;
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

  // Preserve WordPress source metadata + sections when updating
  let source = page.source;
  let sections = page.sections;
  if (existingSha) {
    const existing = await getFileJson<{
      source?: SitePageSource;
      sections?: Record<string, unknown>;
    }>(pagePath);
    if (!source) source = existing?.data?.source;
    if (sections === undefined) sections = existing?.data?.sections;
  }

  const payload = {
    slug: page.slug,
    title: page.title,
    label: page.label,
    description: page.description,
    contentHtml: page.contentHtml,
    ...(sections && Object.keys(sections).length > 0 ? { sections } : {}),
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

export const MEDIA_INDEX_PATH = "src/content/media/_index.json";
const MEDIA_UPLOAD_DIR = "public/media";

const MEDIA_UPLOAD_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};


const SITE_DESIGN_PATH = "src/data/site-design.json";

type DesignImageUpload = {
  base64: string;
  contentType: string;
  filename?: string;
};

async function commitBrandLogoUpload(
  upload: DesignImageUpload,
  slot: "logoOnLight" | "logoOnDark",
): Promise<{ publicUrl: string; commitUrl: string }> {
  const contentType = (
    upload.contentType.trim().toLowerCase().split(";")[0] || ""
  ).trim();
  const ext = MEDIA_UPLOAD_TYPES[contentType];
  if (!ext) {
    throw new Error(
      "Unsupported image type. Use JPEG, PNG, WebP, or GIF.",
    );
  }
  const base64 = upload.base64.replace(/\s/g, "");
  if (!base64) throw new Error("Empty image data.");
  const decodedBytes = Buffer.from(base64, "base64");
  if (decodedBytes.length === 0) {
    throw new Error("Could not decode image data.");
  }
  if (decodedBytes.length > MAX_MEDIA_UPLOAD_BYTES) {
    throw new Error(
      `Image too large (${(decodedBytes.length / (1024 * 1024)).toFixed(1)}MB). Max is about ${MAX_MEDIA_UPLOAD_LABEL}.`,
    );
  }

  const basename =
    slot === "logoOnLight" ? `logo-on-light${ext}` : `logo-on-dark${ext}`;
  const imagePath = `${AUTHOR_PHOTO_DIR}/${basename}`;
  const publicUrl = `/brand/${basename}`;
  const existingSha = await getFileSha(imagePath);
  const imageResult = await putBinaryFile(
    imagePath,
    base64,
    `cms: update brand ${slot} (${basename})`,
    existingSha,
  );
  return { publicUrl, commitUrl: imageResult.commitUrl };
}

export async function updateSiteDesign(options: {
  design: SiteDesign;
  /** Optional new hero image upload (base64, no data: prefix) */
  imageUpload?: DesignImageUpload;
  /** Optional logo for light backgrounds (dark mark) */
  logoOnLightUpload?: DesignImageUpload;
  /** Optional logo for dark backgrounds (white mark) */
  logoOnDarkUpload?: DesignImageUpload;
}): Promise<{ commitUrl: string; design: SiteDesign }> {
  let design = options.design;
  let imageCommitUrl = "";

  if (options.logoOnLightUpload) {
    const result = await commitBrandLogoUpload(
      options.logoOnLightUpload,
      "logoOnLight",
    );
    imageCommitUrl = result.commitUrl || imageCommitUrl;
    design = {
      ...design,
      branding: {
        ...design.branding,
        logoOnLight: result.publicUrl,
      },
      updatedAt: new Date().toISOString(),
    };
  }

  if (options.logoOnDarkUpload) {
    const result = await commitBrandLogoUpload(
      options.logoOnDarkUpload,
      "logoOnDark",
    );
    imageCommitUrl = result.commitUrl || imageCommitUrl;
    design = {
      ...design,
      branding: {
        ...design.branding,
        logoOnDark: result.publicUrl,
      },
      updatedAt: new Date().toISOString(),
    };
  }

  if (options.imageUpload) {
    const contentType = (
      options.imageUpload.contentType.trim().toLowerCase().split(";")[0] || ""
    ).trim();
    const ext = MEDIA_UPLOAD_TYPES[contentType];
    if (!ext) {
      throw new Error(
        "Unsupported image type. Use JPEG, PNG, WebP, or GIF.",
      );
    }
    const base64 = options.imageUpload.base64.replace(/\s/g, "");
    if (!base64) throw new Error("Empty image data.");
    const decodedBytes = Buffer.from(base64, "base64");
    if (decodedBytes.length === 0) {
      throw new Error("Could not decode image data.");
    }
    if (decodedBytes.length > MAX_MEDIA_UPLOAD_BYTES) {
      throw new Error(
        `Image too large (${(decodedBytes.length / (1024 * 1024)).toFixed(1)}MB). Max is about ${MAX_MEDIA_UPLOAD_LABEL}.`,
      );
    }

    const rawName = (options.imageUpload.filename || `hero${ext}`)
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);
    const stem = rawName.replace(/\.[a-z0-9]+$/i, "") || "hero";
    const stamp = Date.now().toString(36);
    const filename = `hero-${stem}-${stamp}${ext}`;
    const imagePath = `${MEDIA_UPLOAD_DIR}/${filename}`;
    const publicUrl = `/media/${filename}`;

    const imageResult = await putBinaryFile(
      imagePath,
      base64,
      `cms: upload hero image ${filename}`,
      null,
    );
    imageCommitUrl = imageResult.commitUrl;

    // Best-effort: index in media library (ignore failures so design still saves)
    try {
      await addMediaByUrl({
        url: publicUrl,
        alt: design.hero.imageAlt || "Homepage hero",
      });
    } catch {
      // non-fatal
    }

    design = {
      ...design,
      hero: {
        ...design.hero,
        image: publicUrl,
      },
      updatedAt: new Date().toISOString(),
    };
  }

  const existingSha = await getFileSha(SITE_DESIGN_PATH);
  const metaResult = await putFile(
    SITE_DESIGN_PATH,
    `${JSON.stringify(design, null, 2)}\n`,
    "cms: update site design",
    existingSha,
  );

  return {
    commitUrl: metaResult.commitUrl || imageCommitUrl,
    design,
  };
}


function emptyMediaIndex(): MediaIndex {
  return { updatedAt: new Date().toISOString(), count: 0, items: [] };
}

async function readMediaIndexFromGithub(): Promise<{
  data: MediaIndex;
  sha: string | null;
}> {
  const file = await getFileJson<MediaIndex>(MEDIA_INDEX_PATH);
  if (!file) return { data: emptyMediaIndex(), sha: null };
  return {
    data: {
      updatedAt: file.data.updatedAt || new Date().toISOString(),
      count: file.data.items?.length ?? 0,
      items: Array.isArray(file.data.items) ? file.data.items : [],
    },
    sha: file.sha,
  };
}

async function writeMediaIndex(
  index: MediaIndex,
  sha: string | null,
  message: string,
): Promise<{ commitUrl: string }> {
  const payload: MediaIndex = {
    ...index,
    updatedAt: new Date().toISOString(),
    count: index.items.length,
  };
  return putFile(
    MEDIA_INDEX_PATH,
    `${JSON.stringify(payload, null, 2)}\n`,
    message,
    sha,
  );
}

export async function publishMediaIndex(
  index: MediaIndex,
): Promise<{ commitUrl: string }> {
  const existing = await readMediaIndexFromGithub();
  return writeMediaIndex(index, existing.sha, "cms: update media library index");
}

export async function addMediaByUrl(options: {
  url: string;
  alt?: string;
  width?: number;
  height?: number;
}): Promise<{ item: MediaItem; commitUrl: string; created: boolean }> {
  const url = options.url.trim();
  if (!url) throw new Error("URL is required.");
  if (!url.startsWith("/") && !/^https?:\/\//i.test(url)) {
    throw new Error("URL must be absolute (https://…) or a site path (/media/…).");
  }

  const { data: index, sha } = await readMediaIndexFromGithub();
  const norm = normalizeMediaUrl(url);
  const existing = index.items.find(
    (i) => normalizeMediaUrl(i.url) === norm,
  );
  if (existing) {
    const alt = (options.alt ?? "").trim();
    if (alt && alt !== existing.alt) {
      const items = index.items.map((i) =>
        i.id === existing.id
          ? {
              ...i,
              alt,
              ...(options.width ? { width: options.width } : {}),
              ...(options.height ? { height: options.height } : {}),
            }
          : i,
      );
      const result = await writeMediaIndex(
        { ...index, items },
        sha,
        `cms: update media alt ${existing.id}`,
      );
      const item = items.find((i) => i.id === existing.id)!;
      return { item, commitUrl: result.commitUrl, created: false };
    }
    return { item: existing, commitUrl: "", created: false };
  }

  const ids = new Set(index.items.map((i) => i.id));
  const id = ensureUniqueMediaId(mediaIdFromUrl(url), ids, url);
  const item: MediaItem = {
    id,
    slug: id,
    url,
    alt: (options.alt ?? "").trim(),
    source: detectMediaSource(url),
    ...(options.width ? { width: options.width } : {}),
    ...(options.height ? { height: options.height } : {}),
    usedBy: [],
    createdAt: new Date().toISOString(),
  };
  const items = [item, ...index.items];
  const result = await writeMediaIndex(
    { ...index, items },
    sha,
    `cms: add media ${id}`,
  );
  return { item, commitUrl: result.commitUrl, created: true };
}

export async function uploadMediaFile(options: {
  base64: string;
  contentType: string;
  filename?: string;
  alt?: string;
}): Promise<{ item: MediaItem; commitUrl: string }> {
  const contentType = (
    options.contentType.trim().toLowerCase().split(";")[0] || ""
  ).trim();
  const ext = MEDIA_UPLOAD_TYPES[contentType];
  if (!ext) {
    throw new Error(
      "Unsupported image type. Use JPEG, PNG, WebP, or GIF.",
    );
  }

  const base64 = options.base64.replace(/\s/g, "");
  if (!base64) throw new Error("Empty image data.");
  const decodedBytes = Buffer.from(base64, "base64");
  if (decodedBytes.length === 0) throw new Error("Could not decode image data.");
  if (decodedBytes.length > MAX_MEDIA_UPLOAD_BYTES) {
    throw new Error(
      `Image too large (${(decodedBytes.length / (1024 * 1024)).toFixed(1)}MB). Max is about ${MAX_MEDIA_UPLOAD_LABEL}.`,
    );
  }

  const rawName = (options.filename || `upload${ext}`)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  const stem = rawName.replace(/\.[a-z0-9]+$/i, "") || "upload";
  const stamp = Date.now().toString(36);
  const filename = `${stem}-${stamp}${ext}`;
  const imagePath = `${MEDIA_UPLOAD_DIR}/${filename}`;
  const publicUrl = `/media/${filename}`;

  const imageResult = await putBinaryFile(
    imagePath,
    base64,
    `cms: upload media ${filename}`,
    null,
  );

  const added = await addMediaByUrl({
    url: publicUrl,
    alt: options.alt,
  });

  return {
    item: added.item,
    commitUrl: added.commitUrl || imageResult.commitUrl,
  };
}

export async function updateMediaItem(
  id: string,
  patch: { alt?: string },
): Promise<{ item: MediaItem; commitUrl: string }> {
  const { data: index, sha } = await readMediaIndexFromGithub();
  const idx = index.items.findIndex((i) => i.id === id || i.slug === id);
  if (idx < 0) throw new Error(`Media "${id}" not found.`);

  const current = index.items[idx];
  const next: MediaItem = {
    ...current,
    ...(typeof patch.alt === "string" ? { alt: patch.alt.trim() } : {}),
  };
  const items = [...index.items];
  items[idx] = next;
  const result = await writeMediaIndex(
    { ...index, items },
    sha,
    `cms: update media ${next.id}`,
  );
  return { item: next, commitUrl: result.commitUrl };
}

export async function deleteMediaItem(
  id: string,
): Promise<{ commitUrl: string; deletedFile?: string }> {
  const { data: index, sha } = await readMediaIndexFromGithub();
  const item = index.items.find((i) => i.id === id || i.slug === id);
  if (!item) throw new Error(`Media "${id}" not found.`);

  const items = index.items.filter((i) => i.id !== item.id);
  const indexResult = await writeMediaIndex(
    { ...index, items },
    sha,
    `cms: remove media ${item.id}`,
  );

  let deletedFile: string | undefined;
  if (item.source === "upload" && isOwnedUploadUrl(item.url)) {
    const filePath = uploadPathFromUrl(item.url);
    if (filePath) {
      try {
        const fileSha = await getFileSha(filePath);
        if (fileSha) {
          await deleteFile(
            filePath,
            `cms: delete media file ${filePath.split("/").pop()}`,
            fileSha,
          );
          deletedFile = filePath;
        }
      } catch {
        // Index already updated; file cleanup is best-effort
      }
    }
  }

  return { commitUrl: indexResult.commitUrl, deletedFile };
}

