import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "./globals.css";

import { Providers } from "@/components/providers";

const inter = Inter({
  subsets: ["latin", "cyrillic"], // Кириллица для русского UI
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "DevDigest Tracker",
  description: "AI-powered content aggregation and summarization",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
