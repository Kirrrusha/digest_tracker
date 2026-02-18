import type { UserPreferences } from "@devdigest/shared";

import { api } from "./client";

export const preferencesApi = {
  get: () => api.get<UserPreferences>("/preferences").then((r) => r.data),
  update: (dto: Partial<UserPreferences>) =>
    api.put<UserPreferences>("/preferences", dto).then((r) => r.data),
};
