import type { SummariesResponse, Summary } from "@devdigest/shared";

import { api } from "./client";

export const summariesApi = {
  list: (params?: { page?: number; limit?: number; type?: string; topic?: string }) =>
    api.get<SummariesResponse>("/summaries", { params }).then((r) => r.data),
  topics: () => api.get<string[]>("/summaries/topics").then((r) => r.data),
  get: (id: string) => api.get<Summary>(`/summaries/${id}`).then((r) => r.data),
  generate: (type: "daily" | "weekly", force?: boolean) =>
    api
      .post<{ success: boolean; summary: Summary }>("/summaries/generate", { type, force })
      .then((r) => r.data),
  delete: (id: string) => api.delete(`/summaries/${id}`),
  regenerate: (id: string) =>
    api
      .post<{ success: boolean; summary: Summary }>(`/summaries/${id}/regenerate`)
      .then((r) => r.data),
};
