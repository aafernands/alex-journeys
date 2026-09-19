import { NextResponse } from "next/server";
import { createHash } from "crypto";

export const runtime = "nodejs";

type Body = {
  email?: string;
  firstName?: string;
};

type MergeField = {
  tag?: string;
  name?: string;
  type?: string;
  required?: boolean;
};

function datacenterFromApiKey(apiKey: string): string | null {
  const parts = apiKey.split("-");
  const dc = parts[parts.length - 1];
  return dc && /^[a-z]{1,3}\d+$/i.test(dc) ? dc : null;
}

function readConfig() {
  const apiKey =
    process.env.MAILCHIMP_API_KEY?.trim() ||
    process.env.MAILCHIMP_KEY?.trim();
  const audienceId =
    process.env.MAILCHIMP_AUDIENCE_ID?.trim() ||
    process.env.MAILCHIMP_LIST_ID?.trim();
  return { apiKey, audienceId };
}

async function requiredMergeFields(
  dc: string,
  audienceId: string,
  authHeader: string,
  firstName: string,
): Promise<Record<string, string | Record<string, string>>> {
  const merge: Record<string, string | Record<string, string>> = {};

  try {
    const res = await fetch(
      `https://${dc}.api.mailchimp.com/3.0/lists/${audienceId}/merge-fields?count=100`,
      {
        headers: { Authorization: authHeader },
        cache: "no-store",
      },
    );
    if (!res.ok) {
      // Fallback for common default audiences
      merge.FNAME = firstName || "Friend";
      return merge;
    }
    const data = (await res.json()) as { merge_fields?: MergeField[] };
    for (const field of data.merge_fields || []) {
      const tag = field.tag;
      if (!tag || tag === "EMAIL" || !field.required) continue;

      if (field.type === "address") {
        // Required address fields need a structured object; use blanks so signup still works.
        merge[tag] = {
          addr1: "",
          city: "",
          state: "",
          zip: "",
          country: "US",
        };
        continue;
      }

      if (field.type === "birthday") {
        // MM/DD — Mailchimp often accepts empty for birthday; skip if empty fails later
        continue;
      }

      const label = `${field.name || ""} ${tag}`.toLowerCase();
      if (label.includes("first") || tag === "FNAME") {
        merge[tag] = firstName || "Friend";
      } else if (label.includes("last") || tag === "LNAME") {
        merge[tag] = "Subscriber";
      } else if (field.type === "number") {
        merge[tag] = "0";
      } else {
        merge[tag] = "—";
      }
    }
  } catch {
    merge.FNAME = firstName || "Friend";
  }

  // Always include FNAME when present — harmless if the audience doesn't use it
  if (!merge.FNAME && firstName) merge.FNAME = firstName;

  return merge;
}

export async function POST(req: Request) {
  const { apiKey, audienceId } = readConfig();

  if (!apiKey || !audienceId) {
    return NextResponse.json(
      {
        error:
          "Newsletter is not configured yet. Add MAILCHIMP_API_KEY and MAILCHIMP_AUDIENCE_ID on Vercel.",
      },
      { status: 503 },
    );
  }

  const dc = datacenterFromApiKey(apiKey);
  if (!dc) {
    return NextResponse.json(
      { error: "Invalid Mailchimp API key format." },
      { status: 500 },
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const email = (body.email || "").trim().toLowerCase();
  const firstName = (body.firstName || "").trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 400 },
    );
  }

  const subscriberHash = createHash("md5").update(email).digest("hex");
  const url = `https://${dc}.api.mailchimp.com/3.0/lists/${audienceId}/members/${subscriberHash}`;
  const authHeader = `Basic ${Buffer.from(`anystring:${apiKey}`).toString("base64")}`;

  const merge_fields = await requiredMergeFields(
    dc,
    audienceId,
    authHeader,
    firstName,
  );

  const payload: Record<string, unknown> = {
    email_address: email,
    status_if_new: "subscribed",
  };
  if (Object.keys(merge_fields).length > 0) {
    payload.merge_fields = merge_fields;
  }

  try {
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const data = (await res.json().catch(() => ({}))) as {
      title?: string;
      detail?: string;
      status?: string | number;
      errors?: Array<{ field?: string; message?: string }>;
    };

    if (!res.ok) {
      const title = (data.title || "").toLowerCase();
      const detail = (data.detail || "").toLowerCase();

      if (title.includes("member exists")) {
        return NextResponse.json({
          ok: true,
          message: "You're already on the list — thanks!",
        });
      }

      // Permanently deleted / compliance — ask them to contact support or re-add
      if (title.includes("forgotten") || detail.includes("compliance")) {
        return NextResponse.json(
          {
            error:
              "This email can't be re-subscribed automatically. Please use a different email or contact me.",
          },
          { status: 400 },
        );
      }

      console.error("Mailchimp error", res.status, data);

      const fieldHints =
        data.errors?.map((e) => e.message || e.field).filter(Boolean).join("; ") ||
        "";

      return NextResponse.json(
        {
          error:
            fieldHints ||
            data.detail ||
            data.title ||
            "Could not subscribe right now. Try again in a moment.",
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      message: "You're in — welcome to The Traveler's Journal.",
    });
  } catch (err) {
    console.error("Mailchimp request failed", err);
    return NextResponse.json(
      { error: "Network error reaching Mailchimp. Try again." },
      { status: 502 },
    );
  }
}
