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

  sync: (id: string) =>
    apiClient.post<{ saved: number; skipped: number }>(`/channels/${id}/sync`).then((r) => r.data),

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

  topics: () => apiClient.get<string[]>("/summaries/topics").then((r) => r.data),

  get: (id: string) => apiClient.get<Summary>(`/summaries/${id}`).then((r) => r.data),

  generate: (type: "daily" | "weekly", force?: boolean) =>
    apiClient.post<Summary>("/summaries/generate", { type, force }).then((r) => r.data),

  delete: (id: string) => apiClient.delete(`/summaries/${id}`),

  regenerate: (id: string) =>
    apiClient.post<Summary>(`/summaries/${id}/regenerate`).then((r) => r.data),
};

// Dashboard
export const dashboardApi = {
  stats: () => apiClient.get<DashboardStats>("/dashboard/stats").then((r) => r.data),
};

// MTProto
export interface MTProtoChannelInfo {
  id: string;
  title: string;
  username: string | null;
  participantsCount: number | null;
  accessHash: string;
  isAlreadyTracked: boolean;
}

export const mtprotoApi = {
  getStatus: () =>
    apiClient.get<{ hasActiveSession: boolean }>("/mtproto/status").then((r) => r.data),

  sendCode: (phoneNumber: string) =>
    apiClient
      .post<{
        phoneCodeHash: string;
        sessionString: string;
        codeVia: "app" | "sms" | "other";
      }>("/mtproto/auth/send-code", { phoneNumber })
      .then((r) => r.data),

  verify: (data: {
    phoneNumber: string;
    phoneCode: string;
    phoneCodeHash: string;
    sessionString: string;
    password?: string;
  }) =>
    apiClient
      .post<{ success?: boolean; needs2FA?: boolean }>("/mtproto/auth/verify", data)
      .then((r) => r.data),

  disconnect: () => apiClient.post("/mtproto/auth/disconnect"),

  listChannels: () => apiClient.get<MTProtoChannelInfo[]>("/mtproto/channels").then((r) => r.data),

  bulkAdd: (
    channels: Array<{
      telegramId: string;
      title: string;
      username?: string | null;
      accessHash: string;
    }>
  ) =>
    apiClient
      .post<{ added: number; errors: string[] }>("/mtproto/channels/bulk", { channels })
      .then((r) => r.data),
};

// Profile & Preferences
export const profileApi = {
  get: () => apiClient.get<UserProfile>("/profile").then((r) => r.data),

  getPreferences: () => apiClient.get<UserPreferences>("/preferences").then((r) => r.data),

  updatePreferences: (data: Partial<UserPreferences>) =>
    apiClient.put<UserPreferences>("/preferences", data).then((r) => r.data),
};
