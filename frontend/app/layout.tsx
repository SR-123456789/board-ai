import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { MigrationManager } from "@/components/MigrationManager";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://board-ai.app";
const siteName = "Board AI";
const siteDescription = "AIがホワイトボードにノートを書きながら教える、ビジュアル学習プラットフォーム。チャットだけじゃない、新しい学習体験。";

export const metadata: Metadata = {
  title: {
    default: `${siteName} - AIが板書する新しい学習体験`,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  keywords: [
    "AI学習",
    "ホワイトボード",
    "AI家庭教師",
    "ビジュアル学習",
    "AIチャット",
    "学習ツール",
    "フレームワーク思考",
    "マインドマップ",
    "AIノート",
  ],
  authors: [{ name: siteName }],
  creator: siteName,
  publisher: siteName,
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: siteUrl,
    siteName: siteName,
    title: `${siteName} - AIが板書する新しい学習体験`,
    description: siteDescription,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: siteName,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteName} - AIが板書する新しい学習体験`,
    description: siteDescription,
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

// JSON-LD 構造化データ
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: siteName,
  description: siteDescription,
  url: siteUrl,
  applicationCategory: "EducationalApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "JPY",
  },
  featureList: [
    "AIがホワイトボードにノートを作成",
    "フレームワーク思考による学習",
    "ビジュアル表現（図表・マインドマップ）",
    "インタラクティブな深掘り学習",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <MigrationManager />
        {children}
      </body>
    </html>
  );
}
