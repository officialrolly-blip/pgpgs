import type { Metadata } from "next";
import { Cormorant_Garamond, Geist, Geist_Mono } from "next/font/google";
import Footer from "@/components/footer";
import Header from "@/components/header";
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
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "Pi Gamma Phi Gamma Sigma | Roxas City Capiz Chapter",
    template: "%s | PGPGS Roxas City",
  },
  description:
    "Official website of Pi Gamma Phi Gamma Sigma, Roxas City Capiz Chapter: a brotherhood and sisterhood founded on unity, service, leadership, and moral excellence.",
  keywords: [
    "Pi Gamma Phi",
    "Gamma Sigma",
    "PGPGS Roxas City",
    "Roxas City Capiz Chapter",
    "Pi Gamma Phi history",
    "fraternity and sorority Philippines",
    "community service Roxas City",
  ],
  applicationName: "PGPGS Roxas City",
  authors: [{ name: "Pi Gamma Phi Gamma Sigma Roxas City Capiz Chapter" }],
  creator: "Pi Gamma Phi Gamma Sigma Roxas City Capiz Chapter",
  publisher: "Pi Gamma Phi Gamma Sigma Roxas City Capiz Chapter",
  category: "organization",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_PH",
    siteName: "PGPGS Roxas City",
    title: "Pi Gamma Phi Gamma Sigma | Roxas City Capiz Chapter",
    description:
      "Discover the history, brotherhood, community service, officials, and alumni of Pi Gamma Phi Gamma Sigma in Roxas City, Capiz.",
    images: [
      {
        url: "/PI GAMMA PHI.png",
        width: 650,
        height: 650,
        alt: "Official Pi Gamma Phi 1975 Gamma Sigma logo",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Pi Gamma Phi Gamma Sigma | Roxas City Capiz Chapter",
    description:
      "A brotherhood and sisterhood founded on unity, service, leadership, and moral excellence.",
    images: ["/PI GAMMA PHI.png"],
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${cormorant.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
