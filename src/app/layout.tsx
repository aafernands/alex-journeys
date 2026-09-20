import type { Metadata } from "next";
import { Outfit, Inter } from "next/font/google";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getLatestPost } from "@/lib/posts";
import "./globals.css";

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
  title: {
    default: "Fernandes Journeys — Travel Journal",
    template: "%s · Fernandes Journeys",
  },
  description:
    "Fernandes Journeys is a personal travel journal — destinations from past trips, trip notes, and photos from the road. Written by Alex Fernandes.",
  openGraph: {
    title: "Fernandes Journeys — Travel Journal",
    description:
      "Personal travel journal — destinations from past trips and notes from the road.",
    type: "website",
    locale: "en_US",
  },
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

  return (
    <html
      lang="en"
      className={`${outfit.variable} ${inter.variable} h-full antialiased`}
    >
      <body id="top" className="min-h-full flex flex-col font-sans">
        <Header latestPost={latestPost} />
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
