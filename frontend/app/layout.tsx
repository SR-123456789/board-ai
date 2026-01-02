import type { Metadata, Viewport } from "next";
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
const siteName = "板書AI";
const siteDescription = "板書AI - AIとの会話を、自動でホワイトボードに整理。ビジュアル学習AIプラットフォーム。";

export const metadata: Metadata = {
  title: {
    default: `${siteName} - AIとの会話を自動でホワイトボードに整理`,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  keywords: [
    "板書AI",
    "ボードAI",
    "Board AI",
    "AI板書",
    "ホワイトボードAI学習",
    "ホワイトボードAI",
    "AI学習",
    "AI家庭教師",
    "ビジュアル学習",
    "AIチャット",
    "学習ツール",
    "フレームワーク思考",
    "マインドマップ",
    "AIノート",
    "AI教育",
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
    title: `${siteName} - AIとの会話を自動でホワイトボードに整理`,
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
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: siteName,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
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
    "AIが板書してホワイトボードにノートを作成",
    "ビジュアル学習AIによる効率的な学習体験",
    "フレームワーク思考による深い理解",
    "ビジュアル表現（図表・マインドマップ）",
    "インタラクティブな深掘り学習",
    "ホワイトボードAI学習",
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
        <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#0a0a0a" media="(prefers-color-scheme: dark)" />
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
