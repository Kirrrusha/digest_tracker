import type {
  Channel,
  DashboardStats,
  Post,
  PostsListResponse,
  Summary,
  UserPreferences,
  UserProfile,
} from "../types";
import { apiClient } from "./client";

// Auth
export const mobileAuth = {
  loginTelegram: (initData: string) =>
    apiClient
      .post<{
        token: string;
        user: UserProfile;
        expiresAt: string;
      }>("/auth/mobile/telegram", { initData })
      .then((r) => r.data),

  refresh: () =>
    apiClient
      .post<{ token: string; expiresAt: string }>("/auth/mobile/refresh")
      .then((r) => r.data),
};

// Channels
export const channelsApi = {
  list: () => apiClient.get<Channel[]>("/channels").then((r) => r.data),

  get: (id: string) => apiClient.get<Channel>(`/channels/${id}`).then((r) => r.data),

  add: (url: string) => apiClient.post<Channel>("/channels", { url }).then((r) => r.data),

  delete: (id: string) => apiClient.delete(`/channels/${id}`),

  toggle: (id: string, isActive: boolean) =>
    apiClient.patch<Channel>(`/channels/${id}`, { isActive }).then((r) => r.data),

  refresh: (id: string) => apiClient.post(`/channels/${id}/refresh`).then((r) => r.data),

  posts: (id: string, page = 1, limit = 20) =>
    apiClient
      .get<PostsListResponse>(`/channels/${id}/posts`, { params: { page, limit } })
      .then((r) => r.data),
};

// Posts
export const postsApi = {
  list: (params?: { page?: number; limit?: number; channelId?: string }) =>
    apiClient.get<PostsListResponse>("/posts", { params }).then((r) => r.data),

  get: (id: string) => apiClient.get<Post>(`/posts/${id}`).then((r) => r.data),
};

// Summaries
export const summariesApi = {
  list: (params?: { period?: string; topic?: string; page?: number; limit?: number }) =>
    apiClient
      .get<{ summaries: Summary[]; total: number; hasMore: boolean }>("/summaries", { params })
      .then((r) => r.data),

  get: (id: string) => apiClient.get<Summary>(`/summaries/${id}`).then((r) => r.data),

  generate: (period: "daily" | "weekly") =>
    apiClient.post<Summary>("/summaries/generate", { period }).then((r) => r.data),

  delete: (id: string) => apiClient.delete(`/summaries/${id}`),

  regenerate: (id: string) =>
    apiClient.post<Summary>(`/summaries/${id}/regenerate`).then((r) => r.data),
};

// Dashboard
export const dashboardApi = {
  stats: () => apiClient.get<DashboardStats>("/dashboard/stats").then((r) => r.data),
};

// Profile & Preferences
export const profileApi = {
  get: () => apiClient.get<UserProfile>("/profile").then((r) => r.data),

  getPreferences: () => apiClient.get<UserPreferences>("/preferences").then((r) => r.data),

  updatePreferences: (data: Partial<UserPreferences>) =>
    apiClient.put<UserPreferences>("/preferences", data).then((r) => r.data),
};
