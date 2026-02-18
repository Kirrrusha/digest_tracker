import type { Post } from "@devdigest/shared";

import { api } from "./client";

export const postsApi = {
  byChannel: (channelId: string, params?: { page?: number; limit?: number }) =>
    api.get<Post[]>(`/channels/${channelId}/posts`, { params }).then((r) => r.data),
  get: (id: string) => api.get<Post>(`/posts/${id}`).then((r) => r.data),
};
