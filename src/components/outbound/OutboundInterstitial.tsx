"use client";

import { Plane } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  OUTBOUND_DELAY_MS,
  OUTBOUND_REDUCED_MOTION_DELAY_MS,
} from "@/lib/outbound";
import { site } from "@/data/content";

type Props = {
  destinationUrl: string;
  hostname: string;
  affiliate: boolean;
};

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function OutboundInterstitial({
  destinationUrl,
  hostname,
  affiliate,
}: Props) {
  const [delayMs, setDelayMs] = useState(OUTBOUND_DELAY_MS);
  const [remainingMs, setRemainingMs] = useState(OUTBOUND_DELAY_MS);
  const [progress, setProgress] = useState(0);

  const continueNow = useCallback(() => {
    window.location.replace(destinationUrl);
  }, [destinationUrl]);

  useEffect(() => {
    const reduced = prefersReducedMotion();
    const delay = reduced
      ? OUTBOUND_REDUCED_MOTION_DELAY_MS
      : OUTBOUND_DELAY_MS;
    setDelayMs(delay);
    setRemainingMs(delay);

    const startedAt = performance.now();
    let raf = 0;
    let timeoutId = 0;

    const tick = (now: number) => {
      const elapsed = now - startedAt;
      const pct = Math.min(100, (elapsed / delay) * 100);
      setProgress(pct);
      setRemainingMs(Math.max(0, Math.ceil(delay - elapsed)));
      if (elapsed < delay) {
        raf = window.requestAnimationFrame(tick);
      }
    };

    raf = window.requestAnimationFrame(tick);
    timeoutId = window.setTimeout(() => {
      window.location.replace(destinationUrl);
    }, delay);

    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(timeoutId);
    };
  }, [destinationUrl]);

  const seconds = Math.max(1, Math.ceil(remainingMs / 1000));

  return (
    <main className="relative flex min-h-[70vh] flex-col items-center justify-center overflow-hidden bg-bg px-4 py-16 md:py-24">
      {/* Soft paper wash */}
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, color-mix(in srgb, var(--accent) 12%, transparent), transparent 55%), radial-gradient(ellipse at 80% 100%, color-mix(in srgb, var(--sand) 40%, transparent), transparent 50%)",
        }}
        aria-hidden="true"
      />

      {/* Plane watermark — upper right, nose forward like in flight */}
      <div
        className="pointer-events-none absolute -right-8 top-6 overflow-hidden sm:-right-4 sm:top-10 md:right-6 md:top-12"
        aria-hidden="true"
      >
        <Plane
          className="h-40 w-40 rotate-90 text-heading opacity-[0.08] sm:h-52 sm:w-52 md:h-64 md:w-64 dark:opacity-[0.1]"
          strokeWidth={1.25}
        />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <p className="eyebrow text-center">Departure</p>
        <h1 className="font-display mt-2 text-center text-2xl font-bold tracking-tight text-heading sm:text-3xl">
          Leaving the journal
        </h1>

        <div className="panel mt-8 p-6 sm:p-8">
          <p className="text-center text-sm leading-relaxed text-text">
            You&apos;re opening another site
            {hostname ? (
              <>
                :{" "}
                <span className="font-semibold text-heading">{hostname}</span>
              </>
            ) : (
              "."
            )}
          </p>

          {affiliate ? (
            <p className="mt-3 text-center text-sm leading-relaxed text-muted">
              This link is an affiliate partner link. If you book or buy there,{" "}
              {site.name} may earn a commission at no extra cost to you.
            </p>
          ) : (
            <p className="mt-3 text-center text-sm leading-relaxed text-muted">
              The journal stays here — this tab will take you to their page.
            </p>
          )}

          <div className="mt-6" aria-hidden={delayMs < 500}>
            <div
              className="h-1.5 overflow-hidden rounded-full bg-surface"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress)}
              aria-label="Redirect progress"
            >
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-100 ease-linear motion-reduce:transition-none"
                style={{ width: `${progress}%` }}
              />
            </div>
            {delayMs >= 500 ? (
              <p className="mt-2 text-center text-xs text-muted">
                Continuing in {seconds}s…
              </p>
            ) : (
              <p className="mt-2 text-center text-xs text-muted">Continuing…</p>
            )}
          </div>

          <div className="mt-6">
            <a
              href={destinationUrl}
              onClick={(e) => {
                e.preventDefault();
                continueNow();
              }}
              className="btn btn-ink btn-block justify-center"
              rel="noopener noreferrer"
            >
              Continue to {hostname || "site"}
            </a>
          </div>
        </div>

        <footer className="mt-10 flex flex-col items-center gap-3 text-center">
          <Link
            href="/"
            className="inline-flex opacity-90 transition hover:opacity-100"
            aria-label={`${site.name} home`}
          >
            <BrandLogo className="h-14 w-auto sm:h-16" width={280} height={84} priority />
          </Link>
          <p className="text-xs text-muted">
            <Link href="/" className="text-link hover:text-accent">
              Stay in the journal
            </Link>
            {" · "}
            <a
              href={destinationUrl}
              onClick={(e) => {
                e.preventDefault();
                continueNow();
              }}
              className="text-link hover:text-accent"
              rel="noopener noreferrer"
            >
              Continue now
            </a>
          </p>
        </footer>
      </div>
    </main>
  );
}
