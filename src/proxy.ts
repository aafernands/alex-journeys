import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  AUTHJS_SESSION_COOKIES,
  CMS_COOKIE_NAME,
} from "@/lib/cms/constants";

/**
 * Guard nested CMS routes. Login UI at /cms stays public;
 * full token/session verify happens in pages and API handlers.
 * Accepts passcode cookie OR Auth.js session cookie presence.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const needsAuth =
    pathname.startsWith("/cms/new") ||
    pathname.startsWith("/cms/edit") ||
    pathname.startsWith("/cms/seo") ||
    pathname.startsWith("/cms/destinations");

  if (!needsAuth) {
    return NextResponse.next();
  }

  const hasPasscode = Boolean(request.cookies.get(CMS_COOKIE_NAME)?.value);
  const hasOauth = AUTHJS_SESSION_COOKIES.some((name) =>
    Boolean(request.cookies.get(name)?.value),
  );

  if (!hasPasscode && !hasOauth) {
    const url = request.nextUrl.clone();
    url.pathname = "/cms";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/cms/new",
    "/cms/new/:path*",
    "/cms/edit/:path*",
    "/cms/seo",
    "/cms/seo/:path*",
    "/cms/destinations",
    "/cms/destinations/:path*",
  ],
};
