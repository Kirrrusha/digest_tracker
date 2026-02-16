"use client";

import { startTransition, useCallback, useEffect, useState } from "react";

import type { TelegramWebApp, WebAppUser } from "./types";

interface UseTelegramWebAppReturn {
  webApp: TelegramWebApp | null;
  user: WebAppUser | null;
  isReady: boolean;
  colorScheme: "light" | "dark";
  initData: string;

  // MainButton helpers
  showMainButton: (text: string, onClick: () => void) => void;
  hideMainButton: () => void;
  setMainButtonLoading: (loading: boolean) => void;

  // BackButton helpers
  showBackButton: (onClick: () => void) => void;
  hideBackButton: () => void;

  // Haptic feedback
  hapticImpact: (style: "light" | "medium" | "heavy" | "rigid" | "soft") => void;
  hapticNotification: (type: "error" | "success" | "warning") => void;
  hapticSelection: () => void;

  // Utils
  close: () => void;
  expand: () => void;
  showAlert: (message: string) => void;
  showConfirm: (message: string) => Promise<boolean>;
  openLink: (url: string) => void;
  openTelegramLink: (url: string) => void;
}

/**
 * React hook для работы с Telegram WebApp API
 */
export function useTelegramWebApp(): UseTelegramWebAppReturn {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);
  const [user, setUser] = useState<WebAppUser | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [colorScheme, setColorScheme] = useState<"light" | "dark">("light");
  const [initData, setInitData] = useState("");

  useEffect(() => {
    const tg = window.Telegram?.WebApp;

    if (tg) {
      // Сигнализируем Telegram, что приложение готово
      tg.ready();

      // Расширяем на весь экран
      tg.expand();

      // Применяем тему Telegram
      applyTelegramTheme(tg);

      // Batch state updates to avoid cascading renders
      startTransition(() => {
        setWebApp(tg);
        setUser(tg.initDataUnsafe.user || null);
        setColorScheme(tg.colorScheme);
        setInitData(tg.initData);
        setIsReady(true);
      });

      // Слушаем изменение темы
      tg.onEvent("themeChanged", () => {
        setColorScheme(tg.colorScheme);
        applyTelegramTheme(tg);
      });
    }
  }, []);

  // MainButton helpers
  const showMainButton = useCallback(
    (text: string, onClick: () => void) => {
      if (!webApp) return;

      webApp.MainButton.setText(text);
      webApp.MainButton.onClick(onClick);
      webApp.MainButton.show();
    },
    [webApp]
  );

  const hideMainButton = useCallback(() => {
    webApp?.MainButton.hide();
  }, [webApp]);

  const setMainButtonLoading = useCallback(
    (loading: boolean) => {
      if (!webApp) return;

      if (loading) {
        webApp.MainButton.showProgress();
      } else {
        webApp.MainButton.hideProgress();
      }
    },
    [webApp]
  );

  // BackButton helpers
  const showBackButton = useCallback(
    (onClick: () => void) => {
      if (!webApp) return;

      webApp.BackButton.onClick(onClick);
      webApp.BackButton.show();
    },
    [webApp]
  );

  const hideBackButton = useCallback(() => {
    webApp?.BackButton.hide();
  }, [webApp]);

  // Haptic feedback
  const hapticImpact = useCallback(
    (style: "light" | "medium" | "heavy" | "rigid" | "soft") => {
      webApp?.HapticFeedback.impactOccurred(style);
    },
    [webApp]
  );

  const hapticNotification = useCallback(
    (type: "error" | "success" | "warning") => {
      webApp?.HapticFeedback.notificationOccurred(type);
    },
    [webApp]
  );

  const hapticSelection = useCallback(() => {
    webApp?.HapticFeedback.selectionChanged();
  }, [webApp]);

  // Utils
  const close = useCallback(() => {
    webApp?.close();
  }, [webApp]);

  const expand = useCallback(() => {
    webApp?.expand();
  }, [webApp]);

  const showAlert = useCallback(
    (message: string) => {
      webApp?.showAlert(message);
    },
    [webApp]
  );

  const showConfirm = useCallback(
    (message: string): Promise<boolean> => {
      return new Promise((resolve) => {
        if (!webApp) {
          resolve(false);
          return;
        }

        webApp.showConfirm(message, (confirmed) => {
          resolve(confirmed);
        });
      });
    },
    [webApp]
  );

  const openLink = useCallback(
    (url: string) => {
      webApp?.openLink(url);
    },
    [webApp]
  );

  const openTelegramLink = useCallback(
    (url: string) => {
      webApp?.openTelegramLink(url);
    },
    [webApp]
  );

  return {
    webApp,
    user,
    isReady,
    colorScheme,
    initData,
    showMainButton,
    hideMainButton,
    setMainButtonLoading,
    showBackButton,
    hideBackButton,
    hapticImpact,
    hapticNotification,
    hapticSelection,
    close,
    expand,
    showAlert,
    showConfirm,
    openLink,
    openTelegramLink,
  };
}

/**
 * Применение темы Telegram к CSS переменным
 */
function applyTelegramTheme(tg: TelegramWebApp): void {
  const root = document.documentElement;
  const theme = tg.themeParams;

  if (theme.bg_color) {
    root.style.setProperty("--tg-theme-bg-color", theme.bg_color);
  }
  if (theme.text_color) {
    root.style.setProperty("--tg-theme-text-color", theme.text_color);
  }
  if (theme.hint_color) {
    root.style.setProperty("--tg-theme-hint-color", theme.hint_color);
  }
  if (theme.link_color) {
    root.style.setProperty("--tg-theme-link-color", theme.link_color);
  }
  if (theme.button_color) {
    root.style.setProperty("--tg-theme-button-color", theme.button_color);
  }
  if (theme.button_text_color) {
    root.style.setProperty("--tg-theme-button-text-color", theme.button_text_color);
  }
  if (theme.secondary_bg_color) {
    root.style.setProperty("--tg-theme-secondary-bg-color", theme.secondary_bg_color);
  }
}
