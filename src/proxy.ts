import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { CMS_COOKIE_NAME } from "@/lib/cms/constants";

/**
 * Guard nested CMS routes. Login UI at /cms stays public;
 * full token verify happens in pages and API handlers.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const needsAuth =
    pathname.startsWith("/cms/new") || pathname.startsWith("/cms/edit");

  if (!needsAuth) {
    return NextResponse.next();
  }

  const token = request.cookies.get(CMS_COOKIE_NAME)?.value;
  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = "/cms";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/cms/new", "/cms/new/:path*", "/cms/edit/:path*"],
};
