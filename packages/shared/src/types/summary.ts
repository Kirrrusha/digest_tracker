export interface Summary {
  id: string;
  title: string;
  content: string;
  period: string; // формат: "daily-2024-01-25"
  topics: string[];
  postsCount: number;
  createdAt: string;
}

export interface SummariesResponse {
  summaries: Summary[];
  total: number;
  page: number;
  hasMore: boolean;
}
