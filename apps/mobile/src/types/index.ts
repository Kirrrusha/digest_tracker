export interface Channel {
  id: string;
  name: string;
  url: string;
  type: "TELEGRAM" | "RSS";
  description?: string | null;
  isActive: boolean;
  postsCount?: number;
  lastFetchedAt?: string;
  createdAt: string;
}

export interface Post {
  id: string;
  title?: string | null;
  contentPreview?: string | null;
  url?: string | null;
  author?: string | null;
  publishedAt: string;
  channelId: string;
  channelName: string;
  channelType: string;
}

export interface PostsListResponse {
  posts: Post[];
  total: number;
  hasMore: boolean;
}

export interface PostSource {
  id: string;
  title: string | null;
  contentPreview: string | null;
  url: string | null;
  publishedAt: string;
  channelName: string;
  channelType: string;
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
  sources?: PostSource[];
}

export interface UserPreferences {
  topics: string[];
  summaryInterval: "daily" | "weekly";
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
  email?: string;
  telegramId?: string;
  telegramUsername?: string;
  preferences?: UserPreferences;
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
  recentPosts: Post[];
}
