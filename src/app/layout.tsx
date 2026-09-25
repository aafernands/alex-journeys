import type { Metadata, Viewport } from "next";
import { Outfit, Inter } from "next/font/google";
import { Header } from "@/components/Header";
import { PinterestPinReveal } from "@/components/pinterest/PinterestPinReveal";
import { Providers } from "@/components/Providers";
import { Footer } from "@/components/Footer";
import { HomeScreenPrompt } from "@/components/HomeScreenPrompt";
import { InstallServiceWorker } from "@/components/InstallServiceWorker";
import { INSTALL_CAPTURE_SCRIPT } from "@/lib/install-prompt";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { JsonLd } from "@/components/JsonLd";
import { isReaderAuthConfigured } from "@/auth";
import { getGoogleSiteVerification } from "@/lib/analytics";
import { getLatestPost } from "@/lib/posts";
import { getSiteDesign } from "@/lib/site-design";
import {
  absoluteUrl,
  organizationJsonLd,
  siteConfig,
  websiteJsonLd,
} from "@/lib/seo";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { TRIP_FOCUS_BOOT } from "@/lib/trip-focus";
import "./globals.css";

const googleSiteVerification = getGoogleSiteVerification();
const adsenseClientId = "ca-pub-6769938844993028";
const siteDesign = getSiteDesign();
const faviconBase = siteDesign.branding.favicon || "/favicon.ico";
const faviconHref = `${faviconBase}${faviconBase.includes("?") ? "&" : "?"}v=${encodeURIComponent(siteDesign.updatedAt)}`;

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: "Alex Journeys — Travel Journal",
    template: "%s · Alex Journeys",
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  authors: [{ name: siteConfig.author, url: absoluteUrl("/about") }],
  creator: siteConfig.author,
  publisher: siteConfig.name,
  keywords: [...siteConfig.keywords],
  openGraph: {
    type: "website",
    url: siteConfig.url,
    siteName: siteConfig.name,
    locale: siteConfig.locale,
    title: "Alex Journeys — Travel Journal",
    description: siteConfig.shortDescription,
    images: [
      {
        url: siteConfig.ogImage,
        alt: `${siteConfig.name} logo`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Alex Journeys — Travel Journal",
    description: siteConfig.shortDescription,
    images: [siteConfig.ogImage],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: faviconHref,
    shortcut: faviconHref,
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: siteConfig.name,
    statusBarStyle: "default",
  },
  other: {
    "google-adsense-account": adsenseClientId,
    "apple-mobile-web-app-capable": "yes",
  },
  ...(googleSiteVerification
    ? { verification: { google: googleSiteVerification } }
    : {}),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f0e6" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1612" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const latest = getLatestPost();
  const latestPost = latest
    ? { slug: latest.slug, title: latest.title }
    : null;
  // Email/password and/or Google — not the Google client id alone.
  const googleConfigured = isReaderAuthConfigured();

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${outfit.variable} ${inter.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
        <script
          dangerouslySetInnerHTML={{ __html: TRIP_FOCUS_BOOT }}
        />
        <script
          dangerouslySetInnerHTML={{ __html: INSTALL_CAPTURE_SCRIPT }}
        />
        <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
        <script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClientId}`}
          crossOrigin="anonymous"
        />
      </head>
      <body id="top" className="min-h-full flex flex-col font-sans">
        <Providers>
          <Header
            latestPost={latestPost}
            googleConfigured={googleConfigured}
          />
          <PinterestPinReveal />
          <HomeScreenPrompt />
          <InstallServiceWorker />
          <div className="flex min-h-0 flex-1 flex-col mobile-bottom-nav-pad">
            <div className="flex-1">{children}</div>
            <Footer />
          </div>
        </Providers>
        <GoogleAnalytics />
      </body>
    </html>
  );
}
