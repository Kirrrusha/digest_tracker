import type { AppFolder } from "@devdigest/shared";

import { api } from "./client";

export const appFoldersApi = {
  list: () => api.get<AppFolder[]>("/app-folders").then((r) => r.data),

  create: (name: string, channelIds?: string[]) =>
    api.post<AppFolder>("/app-folders", { name, channelIds }).then((r) => r.data),

  update: (id: string, data: { name?: string; channelIds?: string[] }) =>
    api.patch<AppFolder>(`/app-folders/${id}`, data).then((r) => r.data),

  remove: (id: string) => api.delete(`/app-folders/${id}`),
};
