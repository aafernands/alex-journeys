import { NextResponse } from "next/server";
import { isCmsAuthenticated } from "@/lib/cms/auth";
import { EMAIL_SAMPLES, findEmailSample } from "@/lib/emails/samples";
import { defaultEmailContext } from "@/lib/emails/templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/cms/emails/preview?id=<template>&format=html|text
 * CMS admins only. Renders a template with sample data. Without `id`,
 * lists the available templates.
 */
export async function GET(request: Request) {
  if (!(await isCmsAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const url = new URL(request.url);
  const id = url.searchParams.get("id")?.trim() ?? "";
  if (!id) {
    return NextResponse.json({
      templates: EMAIL_SAMPLES.map((s) => ({ id: s.id, label: s.label, when: s.when })),
    });
  }
  const sample = findEmailSample(id);
  if (!sample) return NextResponse.json({ error: "Unknown template." }, { status: 404 });
  const rendered = sample.render(defaultEmailContext());
  const headers = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };
  if (url.searchParams.get("format") === "text") {
    return new NextResponse(`Subject: ${rendered.subject}\n\n${rendered.text}`, {
      headers: { ...headers, "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  return new NextResponse(rendered.html, {
    headers: { ...headers, "Content-Type": "text/html; charset=utf-8" },
  });
}
