import type { Metadata, Viewport } from "next";
import Script from "next/script";

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
      <body className="mini-app-body">
        <style jsx global>{`
          :root {
            --tg-theme-bg-color: #ffffff;
            --tg-theme-text-color: #000000;
            --tg-theme-hint-color: #999999;
            --tg-theme-link-color: #2481cc;
            --tg-theme-button-color: #2481cc;
            --tg-theme-button-text-color: #ffffff;
            --tg-theme-secondary-bg-color: #f0f0f0;
          }

          .mini-app-body {
            margin: 0;
            padding: 0;
            min-height: 100vh;
            background-color: var(--tg-theme-bg-color);
            color: var(--tg-theme-text-color);
            font-family:
              -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell,
              "Open Sans", "Helvetica Neue", sans-serif;
          }

          * {
            box-sizing: border-box;
          }

          /* Telegram Mini App specific styles */
          .tg-card {
            background: var(--tg-theme-secondary-bg-color);
            border-radius: 12px;
            padding: 16px;
          }

          .tg-button {
            background: var(--tg-theme-button-color);
            color: var(--tg-theme-button-text-color);
            border: none;
            border-radius: 8px;
            padding: 12px 24px;
            font-size: 16px;
            font-weight: 500;
            cursor: pointer;
            width: 100%;
            transition: opacity 0.2s;
          }

          .tg-button:active {
            opacity: 0.7;
          }

          .tg-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .tg-link {
            color: var(--tg-theme-link-color);
            text-decoration: none;
          }

          .tg-hint {
            color: var(--tg-theme-hint-color);
            font-size: 14px;
          }

          /* Safe area for iOS */
          .safe-area-top {
            padding-top: env(safe-area-inset-top, 0);
          }

          .safe-area-bottom {
            padding-bottom: env(safe-area-inset-bottom, 0);
          }
        `}</style>
        {children}
      </body>
    </html>
  );
}
