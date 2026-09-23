import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const revalidate = 3600;

const CODE_RE = /^[A-Z]{3}$/;

function code(value: string | null): string {
  const normalized = value?.trim().toUpperCase() ?? "";
  return CODE_RE.test(normalized) ? normalized : "";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const from = code(url.searchParams.get("from"));
  const to = code(url.searchParams.get("to"));

  if (!from || !to) {
    return NextResponse.json(
      { error: "Use valid three-letter currency codes." },
      { status: 400 },
    );
  }

  if (from === to) {
    return NextResponse.json({
      base: from,
      quote: to,
      rate: 1,
      updatedAt: new Date().toISOString().slice(0, 10),
    });
  }

  try {
    const upstream = await fetch(
      `https://api.frankfurter.app/latest?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 3600 },
      },
    );

    if (!upstream.ok) {
      return NextResponse.json(
        { error: "Exchange rate is unavailable right now." },
        { status: 502 },
      );
    }

    const payload = (await upstream.json()) as {
      amount?: number;
      base?: string;
      date?: string;
      rates?: Record<string, number>;
    };
    const rate = payload.rates?.[to];

    if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) {
      return NextResponse.json(
        { error: "That currency pair is not available." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      base: payload.base || from,
      quote: to,
      rate,
      updatedAt: payload.date || "",
    });
  } catch {
    return NextResponse.json(
      { error: "Exchange rate is unavailable right now." },
      { status: 502 },
    );
  }
}
