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
  title: string;
  content: string;
  period: string; // формат: "daily-2024-01-25"
  topics: string[];
  postsCount: number;
  createdAt: string;
  sources?: PostSource[];
}

export interface SummariesResponse {
  summaries: Summary[];
  total: number;
  page: number;
  hasMore: boolean;
}
