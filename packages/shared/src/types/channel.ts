export type ChannelSourceType = "telegram" | "rss" | "telegram_bot" | "telegram_mtproto";
export type GroupType = "group" | "supergroup" | "forum";

export interface Channel {
  id: string;
  name: string;
  sourceUrl: string;
  sourceType: ChannelSourceType;
  description?: string | null;
  imageUrl?: string | null;
  isActive: boolean;
  isGroup: boolean;
  groupType?: GroupType | null;
  telegramId?: string | null;
  postsCount: number;
  lastPostAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateChannelDto {
  url: string;
}
