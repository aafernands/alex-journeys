import type { Metadata } from "next";
import Link from "next/link";
import { OutboundInterstitial } from "@/components/outbound/OutboundInterstitial";
import {
  outboundHostname,
  parseSafeExternalUrl,
} from "@/lib/outbound";
import { site } from "@/data/content";

export const metadata: Metadata = {
  title: "Leaving the journal",
  description: `A brief pause before you leave ${site.name}.`,
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
  alternates: { canonical: "/out" },
};

type PageProps = {
  searchParams: Promise<{ to?: string | string[]; aff?: string | string[] }>;
};

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default async function OutPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const toRaw = firstParam(params.to);
  const affRaw = firstParam(params.aff);
  const affiliate = affRaw === "1" || affRaw === "true";

  const destination = parseSafeExternalUrl(toRaw);

  if (!destination) {
    return (
      <main className="section-shell flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
        <p className="eyebrow">Departure</p>
        <h1 className="font-display mt-2 text-2xl font-bold text-heading sm:text-3xl">
          Link unavailable
        </h1>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
          That outbound link is missing or not allowed. Head back into the
          journal and try another path.
        </p>
        <Link href="/" className="btn btn-ink mt-8">
          Back to {site.name}
        </Link>
      </main>
    );
  }

  return (
    <OutboundInterstitial
      destinationUrl={destination.href}
      hostname={outboundHostname(destination)}
      affiliate={affiliate}
    />
  );
}
