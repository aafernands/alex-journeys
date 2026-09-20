import { NextResponse } from "next/server";
import { isCmsAuthenticated } from "@/lib/cms/auth";
import {
  fetchDestinationsTreeFromGithub,
  isGithubConfigured,
  publishDestinationsTree,
} from "@/lib/cms/github";
import {
  sanitizeContinentId,
  upsertCountryInTree,
  validateDestinationCountry,
} from "@/lib/cms/validate-destination";
import { destinationsTree } from "@/data/destinations";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await isCmsAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!isGithubConfigured()) {
    return NextResponse.json(
      {
        error:
          "GitHub token not configured. Set CMS_GITHUB_TOKEN (or GITHUB_TOKEN).",
      },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const input =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>)
      : {};

  const countryRaw =
    typeof input.country === "object" && input.country !== null
      ? (input.country as Record<string, unknown>)
      : input;

  const validated = validateDestinationCountry(countryRaw);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const continentId = sanitizeContinentId(input.continentId);
  if (!continentId) {
    return NextResponse.json(
      {
        error:
          "continentId is required (kebab-case, e.g. europe or americas).",
      },
      { status: 400 },
    );
  }

  const continentName =
    typeof input.continentName === "string"
      ? input.continentName.trim()
      : undefined;
  const update = Boolean(input.update);

  try {
    const remote = await fetchDestinationsTreeFromGithub();
    const currentTree = remote?.data ?? destinationsTree;

    const upserted = upsertCountryInTree(
      currentTree,
      validated.data,
      continentId,
      { continentName, update },
    );
    if (!upserted.ok) {
      const status = upserted.error.includes("already exists") ? 409 : 400;
      return NextResponse.json({ error: upserted.error }, { status });
    }

    const result = await publishDestinationsTree(upserted.tree);
    return NextResponse.json({
      ok: true,
      slug: validated.data.slug,
      commitUrl: result.commitUrl,
      note: "Committed to main. Vercel will redeploy shortly — destination pages and the header menu update after the deploy finishes.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Publish failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
