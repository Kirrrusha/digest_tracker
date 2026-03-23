export interface UserPreferences {
  topics: string[];
  language: string;
  notificationsEnabled: boolean;
  notificationTime?: string | null;
  telegramNotifications: boolean;
  notifyOnNewSummary: boolean;
  notifyOnNewPosts: boolean;
}
