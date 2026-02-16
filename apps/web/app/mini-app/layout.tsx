import type { Metadata, Viewport } from "next";
import Script from "next/script";

import "./mini-app.css";

export const metadata: Metadata = {
  title: "DevDigest - Mini App",
  description: "Telegram Mini App for DevDigest Tracker",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function MiniAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      </head>
      <body className="mini-app-body">{children}</body>
    </html>
  );
}
