export type AtomicFile = {
  path: string;
  content: string | null;
  encoding?: "utf-8" | "base64";
  expectedSha?: string | null;
};

const DEFAULT_REPO = "aafernands/fernandes-journeys";
const DEFAULT_BRANCH = "main";

function getToken(): string | undefined {
  return process.env.CMS_GITHUB_TOKEN || process.env.GITHUB_TOKEN || undefined;
}

function getRepo(): string {
  return process.env.CMS_GITHUB_REPO?.trim() || DEFAULT_REPO;
}

function getBranch(): string {
  return process.env.CMS_GITHUB_BRANCH?.trim() || DEFAULT_BRANCH;
}

function gitApiUrl(path: string): string {
  return `https://api.github.com/repos/${getRepo()}/git/${path}`;
}

async function ghGitFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = getToken();
  if (!token) throw new Error("GitHub token not configured (CMS_GITHUB_TOKEN).");
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Accept", "application/vnd.github+json");
  headers.set("X-GitHub-Api-Version", "2022-11-28");
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(gitApiUrl(path), { ...init, headers });
}

async function githubError(res: Response, operation: string): Promise<never> {
  const text = await res.text();
  throw new Error(`GitHub ${operation} failed (${res.status}): ${text.slice(0, 300)}`);
}

export async function commitFilesAtomically(
  files: AtomicFile[],
  message: string,
): Promise<{ commitUrl: string; commitSha: string }> {
  const refRes = await ghGitFetch(`ref/heads/${encodeURIComponent(getBranch())}`);
  if (!refRes.ok) return githubError(refRes, "read branch ref");
  const ref = (await refRes.json()) as { object?: { sha?: string } };
  const headSha = ref.object?.sha;
  if (!headSha) throw new Error("GitHub branch ref did not include a commit SHA.");

  const commitRes = await ghGitFetch(`commits/${headSha}`);
  if (!commitRes.ok) return githubError(commitRes, "read branch commit");
  const commit = (await commitRes.json()) as { tree?: { sha?: string } };
  const baseTreeSha = commit.tree?.sha;
  if (!baseTreeSha) throw new Error("GitHub commit did not include a tree SHA.");

  const treeRes = await ghGitFetch(`trees/${baseTreeSha}?recursive=1`);
  if (!treeRes.ok) return githubError(treeRes, "read branch tree");
  const tree = (await treeRes.json()) as {
    tree?: Array<{ path?: string; type?: string; sha?: string }>;
  };
  const current = new Map(
    (tree.tree || [])
      .filter((entry) => entry.type === "blob" && entry.path && entry.sha)
      .map((entry) => [entry.path!, entry.sha!] as const),
  );
  for (const file of files) {
    if (file.expectedSha !== undefined && (current.get(file.path) ?? null) !== file.expectedSha) {
      throw new Error(`GitHub conflict: ${file.path} changed; reload and retry.`);
    }
  }

  const entries: Array<Record<string, string | null>> = [];
  for (const file of files) {
    if (file.content === null) {
      entries.push({ path: file.path, mode: "100644", type: "blob", sha: null });
      continue;
    }
    const blobRes = await ghGitFetch("blobs", {
      method: "POST",
      body: JSON.stringify({
        content: file.encoding === "base64" ? file.content.replace(/\s/g, "") : file.content,
        encoding: file.encoding === "base64" ? "base64" : "utf-8",
      }),
    });
    if (!blobRes.ok) return githubError(blobRes, `create blob ${file.path}`);
    const blob = (await blobRes.json()) as { sha?: string };
    if (!blob.sha) throw new Error(`GitHub blob missing SHA for ${file.path}.`);
    entries.push({ path: file.path, mode: "100644", type: "blob", sha: blob.sha });
  }

  const newTreeRes = await ghGitFetch("trees", {
    method: "POST",
    body: JSON.stringify({ base_tree: baseTreeSha, tree: entries }),
  });
  if (!newTreeRes.ok) return githubError(newTreeRes, "create tree");
  const newTree = (await newTreeRes.json()) as { sha?: string };
  if (!newTree.sha) throw new Error("GitHub tree did not include a SHA.");

  const newCommitRes = await ghGitFetch("commits", {
    method: "POST",
    body: JSON.stringify({ message, tree: newTree.sha, parents: [headSha] }),
  });
  if (!newCommitRes.ok) return githubError(newCommitRes, "create commit");
  const newCommit = (await newCommitRes.json()) as { sha?: string; html_url?: string };
  if (!newCommit.sha) throw new Error("GitHub commit did not include a SHA.");

  const updateRefRes = await ghGitFetch(`refs/heads/${encodeURIComponent(getBranch())}`, {
    method: "PATCH",
    body: JSON.stringify({ sha: newCommit.sha, force: false }),
  });
  if (!updateRefRes.ok) return githubError(updateRefRes, "update branch ref");
  return {
    commitSha: newCommit.sha,
    commitUrl: newCommit.html_url || `https://github.com/${getRepo()}/commit/${newCommit.sha}`,
  };
}
