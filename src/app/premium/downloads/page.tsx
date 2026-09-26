import type { Metadata } from "next";
import Image from "next/image";
import { Download, FileDown, Lock } from "lucide-react";
import { PremiumGate } from "@/components/premium/PremiumGate";
import { PremiumComingSoon, PremiumPageHeader } from "@/components/premium/PremiumPageHeader";
import { readReaderAccess } from "@/lib/premium-access";
import { DOWNLOADS_PATH, PERKS_HUB_PATH } from "@/lib/premium-perks";
import { listDownloads } from "@/lib/member-downloads";
import {
  DOWNLOAD_TYPE_LABEL,
  formatFileSize,
  memberDownloadHref,
  type MemberDownload,
} from "@/lib/member-downloads-shared";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Member downloads",
  description: "PDF guides and Alex’s Lightroom presets for Alex Journeys Premium members.",
  alternates: { canonical: DOWNLOADS_PATH },
};

async function loadDownloads(): Promise<{ rows: MemberDownload[]; failed: boolean }> {
  try {
    return { rows: await listDownloads(), failed: false };
  } catch (err) {
    console.warn("[premium/downloads] list failed:", err);
    return { rows: [], failed: true };
  }
}

export default async function PremiumDownloadsPage() {
  const [access, { rows, failed }] = await Promise.all([readReaderAccess(), loadDownloads()]);
  const member = access.member;

  return (
    <main className="premium-downloads bg-bg" data-member={member ? "true" : "false"}>
      <PremiumPageHeader
        id="downloads-title"
        eyebrow="Members"
        title="Downloads"
        lead="PDF guides and the Lightroom presets I use on my own photos. Download them and keep them."
        back={{ href: PERKS_HUB_PATH, label: "Member perks" }}
      />

      <section className="section-shell section-band" aria-labelledby="downloads-title">
        {!member ? (
          <PremiumGate
            signedIn={access.signedIn}
            returnTo={DOWNLOADS_PATH}
            title="Downloads are for members"
            body="Join Premium to download the PDF guides and Lightroom presets. Stories, destinations, and booking stay free."
            signInIntro="Sign in to download if you already joined."
            className="mb-8"
          />
        ) : null}

        {failed ? (
          <p className="panel p-5 text-sm text-text" role="status">
            Downloads aren’t loading right now. Try again in a little while.
          </p>
        ) : rows.length === 0 ? (
          <PremiumComingSoon body="The first guides and presets are on their way. They’ll show up here as soon as they’re ready." />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((row) => (
              <li key={row.id}>
                <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-white">
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-surface-soft">
                    {row.coverUrl ? (
                      <Image
                        src={row.coverUrl}
                        alt=""
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
                        className={`object-cover ${member ? "" : "opacity-80"}`}
                      />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center text-accent" aria-hidden="true">
                        <FileDown size={36} />
                      </span>
                    )}
                    <span className="absolute left-3 top-3 rounded-full bg-near-black/75 px-2.5 py-1 text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-hero-type">
                      {DOWNLOAD_TYPE_LABEL[row.type]}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <h2 className="card-title">{row.title}</h2>
                    {row.description ? <p className="card-body mt-1 flex-1">{row.description}</p> : <span className="flex-1" />}
                    <div className="mt-5 flex items-center justify-between gap-3">
                      {member ? (
                        <a
                          href={memberDownloadHref(row.id)}
                          className="btn btn-primary w-full sm:w-auto"
                          download
                        >
                          <Download size={16} aria-hidden="true" />
                          Download
                        </a>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent-deep">
                          <Lock size={14} aria-hidden="true" />
                          Members only
                        </span>
                      )}
                      <span className="shrink-0 text-xs text-muted">{formatFileSize(row.size)}</span>
                    </div>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
