export interface SaveablePost {
  title: string | null;
  url: string | null;
  content: string;
  channelName: string;
  tags?: string[];
}

export interface ExternalIntegration {
  readonly name: string;
  savePost(post: SaveablePost, userId: string): Promise<void>;
}
