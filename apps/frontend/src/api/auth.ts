import type { AuthTokens, LoginDto, RegisterDto, UserProfile } from "@devdigest/shared";
import type { AxiosResponse } from "axios";

import { api } from "./client";

export const authApi = {
  login: (dto: LoginDto) =>
    api.post<AuthTokens>("/auth/login", dto).then((r: AxiosResponse<AuthTokens>) => r.data),
  register: (dto: RegisterDto) =>
    api.post<AuthTokens>("/auth/register", dto).then((r: AxiosResponse<AuthTokens>) => r.data),
  getProfile: () =>
    api.get<UserProfile>("/profile").then((r: AxiosResponse<UserProfile>) => r.data),
  changePassword: (dto: { currentPassword: string; newPassword: string }) =>
    api.patch("/auth/change-password", dto),
  setPassword: (newPassword: string, login?: string) =>
    api.patch("/auth/set-password", { newPassword, ...(login ? { login } : {}) }),
};
