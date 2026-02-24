export interface UserPreferences {
  topics: string[];
  summaryInterval: "daily" | "weekly";
  language: string;
  notificationsEnabled: boolean;
  notificationTime?: string | null;
  telegramNotifications: boolean;
  notifyOnNewSummary: boolean;
  notifyOnNewPosts: boolean;
  markTelegramAsRead: boolean;
}
