import * as SecureStore from "expo-secure-store";
import { create } from "zustand";

const TOKEN_KEY = "auth_token";

export interface AuthUser {
  id: string;
  name: string;
  telegramId?: string;
  email?: string;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isLoading: boolean;

  setToken: (token: string) => Promise<void>;
  setAuth: (token: string, user: AuthUser) => Promise<void>;
  clearAuth: () => Promise<void>;
  loadFromStorage: () => Promise<void>;
}

/** Декодирует payload JWT без проверки подписи (доверяем серверу) */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const [, payload] = token.split(".");
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export function parseUserFromToken(token: string): AuthUser | null {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.sub !== "string") return null;
  return {
    id: payload.sub,
    name: (payload.name as string) || "User",
    telegramId: payload.telegramId as string | undefined,
  };
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isLoading: true,

  /** Сохраняет токен и декодирует user из его payload */
  setToken: async (token: string) => {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    const user = parseUserFromToken(token);
    set({ token, user });
  },

  setAuth: async (token: string, user: AuthUser) => {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    set({ token, user });
  },

  clearAuth: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    set({ token: null, user: null });
  },

  loadFromStorage: async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (token) {
        const user = parseUserFromToken(token);
        set({ token, user, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },
}));
