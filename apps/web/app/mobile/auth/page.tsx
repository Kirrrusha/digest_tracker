import Script from "next/script";

/**
 * /mobile/auth
 *
 * Страница с Telegram Login Widget для мобильного приложения.
 * Открывается через expo-web-browser в LoginScreen.
 *
 * Флоу:
 * 1. Mobile открывает эту страницу в WebBrowser
 * 2. Пользователь нажимает "Войти через Telegram"
 * 3. Telegram редиректит на /api/auth/mobile/telegram/callback с данными пользователя
 * 4. Callback валидирует данные, создаёт JWT и редиректит на devdigest://auth/callback?token=...
 * 5. WebBrowser ловит deep link и возвращает управление приложению
 */
export default function MobileAuthPage() {
  const botUsername = process.env.TELEGRAM_BOT_USERNAME;
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const callbackUrl = `${baseUrl}/api/auth/mobile/telegram/callback`;

  return (
    <html lang="ru">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Войти через Telegram — DevDigest</title>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #0a0a0a;
            color: #fafafa;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .container {
            text-align: center;
            padding: 32px 24px;
            max-width: 320px;
            width: 100%;
          }
          .logo {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 8px;
          }
          .subtitle {
            font-size: 14px;
            color: #a3a3a3;
            margin-bottom: 32px;
            line-height: 1.5;
          }
          .widget-wrap {
            display: flex;
            justify-content: center;
            min-height: 56px;
            align-items: center;
          }
          .error {
            margin-top: 16px;
            font-size: 13px;
            color: #ef4444;
            background: rgba(239,68,68,0.1);
            padding: 8px 12px;
            border-radius: 8px;
          }
        `}</style>
      </head>
      <body>
        <div className="container">
          <div className="logo">DevDigest</div>
          <p className="subtitle">Войдите через Telegram, чтобы продолжить</p>

          <div className="widget-wrap">
            {botUsername ? (
              <Script
                src="https://telegram.org/js/telegram-widget.js?22"
                data-telegram-login={botUsername}
                data-size="large"
                data-radius="8"
                data-redirect-url={callbackUrl}
                data-request-access="write"
                strategy="afterInteractive"
              />
            ) : (
              <p className="error">TELEGRAM_BOT_USERNAME не настроен</p>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}
