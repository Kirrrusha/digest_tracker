import { api } from "./client";

export interface MTProtoChannelInfo {
  id: string;
  title: string;
  username: string | null;
  participantsCount: number | null;
  accessHash: string;
  isAlreadyTracked: boolean;
}

export interface BulkAddResult {
  added: number;
  errors: string[];
}

export const mtprotoApi = {
  getStatus: () => api.get<{ hasActiveSession: boolean }>("/mtproto/status").then((r) => r.data),

  sendCode: (phoneNumber: string) =>
    api
      .post<{ phoneCodeHash: string; sessionString: string }>("/mtproto/auth/send-code", {
        phoneNumber,
      })
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
};
