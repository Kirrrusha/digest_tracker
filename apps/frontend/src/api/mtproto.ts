import { api } from "./client";

export interface MTProtoChannelInfo {
  id: string;
  title: string;
  username: string | null;
  participantsCount: number | null;
  accessHash: string;
  isAlreadyTracked: boolean;
}

export interface MTProtoGroupInfo {
  id: string;
  title: string;
  username: string | null;
  participantsCount: number | null;
  accessHash: string | null;
  groupType: "group" | "supergroup" | "forum";
  isAlreadyTracked: boolean;
}

export interface MTProtoFolderInfo {
  id: number;
  title: string;
  channels: MTProtoChannelInfo[];
}

export interface BulkAddResult {
  added: number;
  errors: string[];
}

export const mtprotoApi = {
  getStatus: () => api.get<{ hasActiveSession: boolean }>("/mtproto/status").then((r) => r.data),

  sendCode: (phoneNumber: string) =>
    api
      .post<{
        phoneCodeHash: string;
        sessionString: string;
        codeVia: "app" | "sms" | "other";
      }>("/mtproto/auth/send-code", { phoneNumber })
      .then((r) => r.data),

  resendCode: (data: { phoneNumber: string; phoneCodeHash: string; sessionString: string }) =>
    api
      .post<{
        phoneCodeHash: string;
        sessionString: string;
        codeVia: "app" | "sms" | "other";
      }>("/mtproto/auth/resend-code", data)
      .then((r) => r.data),

  verify: (data: {
    phoneNumber: string;
    phoneCode: string;
    phoneCodeHash: string;
    sessionString: string;
    password?: string;
  }) =>
    api
      .post<{ success?: boolean; needs2FA?: boolean }>("/mtproto/auth/verify", data)
      .then((r) => r.data),

  qrStart: () =>
    api
      .post<{ token: string; expires: number; sessionString: string }>("/mtproto/auth/qr-start")
      .then((r) => r.data),

  qrPoll: (sessionString: string) =>
    api
      .post<
        | { status: "pending"; token: string; expires: number; sessionString: string }
        | { status: "success" }
        | { status: "needs2FA"; sessionString: string }
        | { status: "expired" }
      >("/mtproto/auth/qr-poll", { sessionString })
      .then((r) => r.data),

  qrVerify2fa: (data: { sessionString: string; password: string }) =>
    api.post<{ success: boolean }>("/mtproto/auth/qr-verify-2fa", data).then((r) => r.data),

  disconnect: () => api.post("/mtproto/auth/disconnect"),

  listChannels: () => api.get<MTProtoChannelInfo[]>("/mtproto/channels").then((r) => r.data),

  bulkAdd: (
    channels: Array<{
      telegramId: string;
      title: string;
      username?: string | null;
      accessHash: string;
    }>
  ) => api.post<BulkAddResult>("/mtproto/channels/bulk", { channels }).then((r) => r.data),

  listGroups: () => api.get<MTProtoGroupInfo[]>("/mtproto/groups").then((r) => r.data),

  listFolders: () => api.get<MTProtoFolderInfo[]>("/mtproto/folders").then((r) => r.data),

  bulkAddGroups: (
    groups: Array<{
      telegramId: string;
      title: string;
      username?: string | null;
      accessHash?: string | null;
      groupType: "group" | "supergroup" | "forum";
    }>
  ) => api.post<BulkAddResult>("/mtproto/groups/bulk", { groups }).then((r) => r.data),
};
