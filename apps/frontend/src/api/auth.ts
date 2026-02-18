import type { AuthTokens, LoginDto, RegisterDto, UserProfile } from "@devdigest/shared";

import { api } from "./client";

export const authApi = {
  login: (dto: LoginDto) => api.post<AuthTokens>("/auth/login", dto).then((r) => r.data),
  register: (dto: RegisterDto) => api.post<AuthTokens>("/auth/register", dto).then((r) => r.data),
  getProfile: () => api.get<UserProfile>("/profile").then((r) => r.data),
};
