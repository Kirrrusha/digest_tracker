import type { SummariesResponse, Summary } from "@devdigest/shared";

import { api } from "./client";

export type JobStatus = "waiting" | "active" | "completed" | "failed" | "delayed" | "unknown";

export interface JobStatusResponse {
  status: JobStatus;
  summaryId?: string;
  error?: string;
}

export const summariesApi = {
  list: (params?: { page?: number; limit?: number; topic?: string; channelId?: string }) =>
    api.get<SummariesResponse>("/summaries", { params }).then((r) => r.data),
  topics: () => api.get<string[]>("/summaries/topics").then((r) => r.data),
  get: (id: string) => api.get<Summary>(`/summaries/${id}`).then((r) => r.data),
  generate: (force?: boolean) =>
    api.post<{ jobId: string }>("/summaries/generate", { force }).then((r) => r.data),
  generateForChannel: (channelId: string) =>
    api.post<{ jobId: string }>(`/summaries/generate/channel/${channelId}`).then((r) => r.data),
  generateForFolder: (folderId: number, folderTitle: string, telegramIds: string[]) =>
    api
      .post<{
        jobId: string;
      }>("/summaries/generate/folder", { folderId, folderTitle, telegramIds })
      .then((r) => r.data),
  getJobStatus: (jobId: string) =>
    api.get<JobStatusResponse>(`/summaries/jobs/${jobId}`).then((r) => r.data),
  delete: (id: string) => api.delete(`/summaries/${id}`),
  regenerate: (id: string) =>
    api
      .post<{ success: boolean; summary: Summary }>(`/summaries/${id}/regenerate`)
      .then((r) => r.data),
};
