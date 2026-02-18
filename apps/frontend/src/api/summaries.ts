import type { SummariesResponse, Summary } from "@devdigest/shared";

import { api } from "./client";

export const summariesApi = {
  list: (params?: { page?: number; limit?: number; type?: string }) =>
    api.get<SummariesResponse>("/summaries", { params }).then((r) => r.data),
  get: (id: string) => api.get<Summary>(`/summaries/${id}`).then((r) => r.data),
};
