export interface Channel {
  id: string;
  name: string;
  url: string;
  type: "TELEGRAM" | "RSS";
  description?: string | null;
  isActive: boolean;
  telegramId?: string | null;
  postsCount?: number;
  lastFetchedAt?: string;
  createdAt: string;
}

export interface SummarySource {
  id: string;
  channelName: string;
  publishedAt: string;
  title?: string | null;
  contentPreview?: string | null;
  url?: string | null;
}

export interface Summary {
  id: string;
  content: string;
  period: "DAILY" | "WEEKLY";
  topics: string[];
  postsCount: number;
  createdAt: string;
  dateFrom: string;
  dateTo: string;
  sources?: SummarySource[];
}

export interface UserPreferences {
  topics: string[];
  language: string;
  notificationsEnabled: boolean;
  notificationTime?: string | null;
  telegramNotifications: boolean;
  notifyOnNewSummary: boolean;
  notifyOnNewPosts: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  login?: string | null;
  email?: string;
  telegramId?: string;
  telegramUsername?: string;
  preferences?: UserPreferences;
  hasPassword?: boolean;
}

export interface TopTopic {
  topic: string;
  count: number;
}

export interface DashboardStats {
  channelsCount: number;
  postsToday: number;
  summariesToday: number;
  topTopics: TopTopic[];
}
