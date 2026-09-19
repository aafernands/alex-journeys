import { NextResponse } from "next/server";
import { CMS_COOKIE_NAME, cookieOptions } from "@/lib/cms/auth";

export const runtime = "nodejs";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(CMS_COOKIE_NAME, "", { ...cookieOptions(0), maxAge: 0 });
  return res;
}
