import type { Channel, CreateChannelDto } from "@devdigest/shared";

import { api } from "./client";

export const channelsApi = {
  list: () => api.get<Channel[]>("/channels").then((r) => r.data),
  get: (id: string) => api.get<Channel>(`/channels/${id}`).then((r) => r.data),
  create: (dto: CreateChannelDto) => api.post<Channel>("/channels", dto).then((r) => r.data),
  remove: (id: string) => api.delete(`/channels/${id}`),
  sync: (id: string) =>
    api.post<{ saved: number; skipped: number }>(`/channels/${id}/sync`).then((r) => r.data),
};
