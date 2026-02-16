/**
 * TypeScript типы для Telegram Bot и Mini App
 */

// ============================================
// Telegram WebApp Types (для Mini App)
// ============================================

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: WebAppInitData;
  version: string;
  platform: string;
  colorScheme: "light" | "dark";
  themeParams: ThemeParams;
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  headerColor: string;
  backgroundColor: string;

  // Методы
  ready(): void;
  expand(): void;
  close(): void;

  // Main Button
  MainButton: MainButton;

  // Back Button
  BackButton: BackButton;

  // Haptic Feedback
  HapticFeedback: HapticFeedback;

  // События
  onEvent(eventType: string, callback: () => void): void;
  offEvent(eventType: string, callback: () => void): void;

  // Утилиты
  sendData(data: string): void;
  openLink(url: string): void;
  openTelegramLink(url: string): void;
  showPopup(params: PopupParams): void;
  showAlert(message: string): void;
  showConfirm(message: string, callback: (confirmed: boolean) => void): void;
}

export interface WebAppInitData {
  query_id?: string;
  user?: WebAppUser;
  receiver?: WebAppUser;
  chat?: WebAppChat;
  start_param?: string;
  auth_date: number;
  hash: string;
}

export interface WebAppUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
}

export interface WebAppChat {
  id: number;
  type: "group" | "supergroup" | "channel";
  title: string;
  username?: string;
  photo_url?: string;
}

export interface ThemeParams {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
}

export interface MainButton {
  text: string;
  color: string;
  textColor: string;
  isVisible: boolean;
  isActive: boolean;
  isProgressVisible: boolean;

  setText(text: string): MainButton;
  onClick(callback: () => void): MainButton;
  offClick(callback: () => void): MainButton;
  show(): MainButton;
  hide(): MainButton;
  enable(): MainButton;
  disable(): MainButton;
  showProgress(leaveActive?: boolean): MainButton;
  hideProgress(): MainButton;
  setParams(params: MainButtonParams): MainButton;
}

export interface MainButtonParams {
  text?: string;
  color?: string;
  text_color?: string;
  is_active?: boolean;
  is_visible?: boolean;
}

export interface BackButton {
  isVisible: boolean;
  onClick(callback: () => void): BackButton;
  offClick(callback: () => void): BackButton;
  show(): BackButton;
  hide(): BackButton;
}

export interface HapticFeedback {
  impactOccurred(style: "light" | "medium" | "heavy" | "rigid" | "soft"): HapticFeedback;
  notificationOccurred(type: "error" | "success" | "warning"): HapticFeedback;
  selectionChanged(): HapticFeedback;
}

export interface PopupParams {
  title?: string;
  message: string;
  buttons?: PopupButton[];
}

export interface PopupButton {
  id?: string;
  type?: "default" | "ok" | "close" | "cancel" | "destructive";
  text?: string;
}

// ============================================
// Bot Types
// ============================================

export interface BotCommand {
  command: string;
  description: string;
}

export interface TelegramUser {
  telegramId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  languageCode?: string;
}

export interface ChannelInfo {
  id: string;
  name: string;
  type: "telegram" | "rss";
  sourceUrl: string;
  isActive: boolean;
}

export interface SummaryInfo {
  id: string;
  title: string;
  content: string;
  topics: string[];
  period: string;
  createdAt: Date;
}
