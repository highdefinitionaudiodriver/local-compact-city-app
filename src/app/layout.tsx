import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ローカルコンパクトシティ｜住民提案・デジタル署名",
  description:
    "マイナンバーカード認証で住民であることを証明し、行政に届ける提案・署名プラットフォーム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <footer className="border-t py-6 text-center text-xs text-muted-foreground">
          ローカルコンパクトシティ プロトタイプ — JPKI 認証はモックです
        </footer>
      </body>
    </html>
  );
}
