export interface Post {
  id: string;
  channelId: string;
  externalId: string;
  title?: string | null;
  contentPreview?: string | null;
  url?: string | null;
  author?: string | null;
  publishedAt: string;
  createdAt: string;
}
