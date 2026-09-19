import type { Metadata } from "next";
import { Montserrat, Open_Sans } from "next/font/google";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getLatestPost } from "@/lib/posts";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
  display: "swap",
});

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
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
      className={`${montserrat.variable} ${openSans.variable} h-full antialiased`}
    >
      <body id="top" className="min-h-full flex flex-col font-sans">
        <Header latestPost={latestPost} />
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
