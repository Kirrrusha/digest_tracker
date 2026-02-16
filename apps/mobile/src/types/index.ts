export interface Channel {
  id: string;
  name: string;
  url: string;
  type: "TELEGRAM" | "RSS";
  isActive: boolean;
  postsCount?: number;
  lastFetchedAt?: string;
  createdAt: string;
}

export interface Post {
  id: string;
  title?: string;
  content: string;
  url?: string;
  publishedAt: string;
  channelId: string;
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
}

export interface UserPreferences {
  topics: string[];
  summaryInterval: "DAILY" | "WEEKLY" | "BOTH";
  language: string;
  notificationsEnabled: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  telegramId?: string;
  telegramUsername?: string;
  preferences?: UserPreferences;
}

export interface DashboardStats {
  channelsCount: number;
  postsToday: number;
  summariesToday: number;
  latestSummary?: Summary;
}
