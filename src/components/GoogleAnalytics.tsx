import Script from "next/script";
import {
  ga4InlineSnippet,
  ga4ScriptSrc,
  getGaMeasurementId,
} from "@/lib/analytics";

/**
 * Loads GA4 (gtag.js) for every route that shares the root layout.
 * Renders nothing when `NEXT_PUBLIC_GA_MEASUREMENT_ID` / `NEXT_PUBLIC_GA_ID`
 * is unset, empty, or not a valid G- id — no extra dependency.
 *
 * /cms uses the same root layout, so admin hits are included. Filter
 * `/cms` in the GA4 property if you want them out of reports.
 */
export function GoogleAnalytics() {
  const measurementId = getGaMeasurementId();
  if (!measurementId) return null;

  return (
    <>
      <Script
        src={ga4ScriptSrc(measurementId)}
        strategy="afterInteractive"
      />
      <Script id="ga4-gtag" strategy="afterInteractive">
        {ga4InlineSnippet(measurementId)}
      </Script>
    </>
  );
}
