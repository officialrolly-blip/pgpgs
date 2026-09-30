import type { Metadata } from "next";
import { Cormorant_Garamond, Geist, Geist_Mono } from "next/font/google";
import JsonLd from "@/components/json-ld";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_KEYWORDS,
  DEFAULT_OG_IMAGE,
  DEFAULT_TITLE,
  OG_IMAGE_PATH,
  getSiteUrl,
  organizationJsonLd,
  websiteJsonLd,
} from "@/lib/seo";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: DEFAULT_TITLE,
    template: "%s | PGPGS Roxas City",
  },
  description: DEFAULT_DESCRIPTION,
  keywords: DEFAULT_KEYWORDS,
  applicationName: "PGPGS Roxas City",
  authors: [{ name: "Pi Gamma Phi Gamma Sigma Roxas City Capiz Chapter" }],
  creator: "Pi Gamma Phi Gamma Sigma Roxas City Capiz Chapter",
  publisher: "Pi Gamma Phi Gamma Sigma Roxas City Capiz Chapter",
  category: "organization",
  verification: {
    google: "-4thu5lCQlbw_z6BLhdiSl3hGMIOYZx8E7bDsn4wbkU",
  },
  icons: "/favicon.ico",
  openGraph: {
    type: "website",
    locale: "en_PH",
    siteName: "PGPGS Roxas City",
    title: "Pi Gamma Phi Gamma Sigma | Roxas City Capiz Chapter",
    description:
      "Official website of Pi Gamma Phi Gamma Sigma, Roxas City Capiz Chapter. A brotherhood and sisterhood founded on unity, service, leadership, and moral excellence. Discover our history, community service, officials, and alumni.",
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description:
      "A brotherhood and sisterhood founded on unity, service, leadership, and moral excellence. Discover our history, community service, and membership.",
    images: [OG_IMAGE_PATH],
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
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${cormorant.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">
        <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
        {children}
      </body>
    </html>
  );
}
