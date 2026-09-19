import { NextResponse } from "next/server";
import { createHash } from "crypto";

export const runtime = "nodejs";

type Body = {
  email?: string;
};

function datacenterFromApiKey(apiKey: string): string | null {
  const parts = apiKey.split("-");
  const dc = parts[parts.length - 1];
  return dc && /^[a-z]{1,3}\d+$/i.test(dc) ? dc : null;
}

export async function POST(req: Request) {
  const apiKey = process.env.MAILCHIMP_API_KEY?.trim();
  const audienceId = process.env.MAILCHIMP_AUDIENCE_ID?.trim();

  if (!apiKey || !audienceId) {
    return NextResponse.json(
      {
        error:
          "Newsletter is not configured yet. Add MAILCHIMP_API_KEY and MAILCHIMP_AUDIENCE_ID.",
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
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 400 },
    );
  }

  const subscriberHash = createHash("md5").update(email).digest("hex");
  const url = `https://${dc}.api.mailchimp.com/3.0/lists/${audienceId}/members/${subscriberHash}`;

  const auth = Buffer.from(`anystring:${apiKey}`).toString("base64");

  try {
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email_address: email,
        status_if_new: "subscribed",
        // Keep existing members subscribed if they re-submit
        status: "subscribed",
      }),
      cache: "no-store",
    });

    const data = (await res.json().catch(() => ({}))) as {
      title?: string;
      detail?: string;
      status?: string | number;
    };

    if (!res.ok) {
      // Already subscribed / member exists quirks
      const title = (data.title || "").toLowerCase();
      if (title.includes("member exists") || res.status === 400) {
        // Treat “already on list” as success for UX when Mailchimp says so
        if (title.includes("member exists")) {
          return NextResponse.json({
            ok: true,
            message: "You're already on the list — thanks!",
          });
        }
      }
      console.error("Mailchimp error", res.status, data);
      return NextResponse.json(
        {
          error:
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
