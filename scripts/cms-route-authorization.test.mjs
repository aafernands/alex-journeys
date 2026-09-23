import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import test from "node:test";

const root = join(process.cwd(), "src", "app", "api", "cms");
const methods = /export async function (GET|POST|PUT|PATCH|DELETE)\s*\(/g;

async function routeFiles(directory = root) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await routeFiles(path)));
    else if (entry.name === "route.ts") files.push(path);
  }
  return files;
}

test("every CMS API handler checks authorization before protected work", async () => {
  const files = await routeFiles();
  assert.ok(files.length > 0);
  for (const file of files) {
    const source = await readFile(file, "utf8");
    const handlers = [...source.matchAll(methods)];
    assert.ok(handlers.length > 0, `${file.pathname} has no exported handler`);
    for (let i = 0; i < handlers.length; i += 1) {
      const start = handlers[i].index;
      const end = handlers[i + 1]?.index ?? source.length;
      const body = source.slice(start, end);
      if (file.endsWith(`${join("api", "cms", "login", "route.ts")}`) || file.endsWith(`${join("api", "cms", "logout", "route.ts")}`)) continue;
      assert.match(
        body,
        /if \(!\(await isCmsAuthenticated\(\)\)\)/,
        `${relative(process.cwd(), file)} ${handlers[i][1]} is missing server-side CMS authorization`,
      );
    }
  }
});
