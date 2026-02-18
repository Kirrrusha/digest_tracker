import axios from "axios";

import { useAuthStore } from "../stores/auth.store";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:4000",
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(null, async (error) => {
  const original = error.config;
  if (error.response?.status === 401 && !original._retry) {
    original._retry = true;
    try {
      const refreshToken = useAuthStore.getState().refreshToken;
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL ?? "http://localhost:4000"}/auth/refresh`,
        { refreshToken }
      );
      useAuthStore.getState().setTokens(data.accessToken, data.refreshToken);
      original.headers.Authorization = `Bearer ${data.accessToken}`;
      return api(original);
    } catch {
      useAuthStore.getState().logout();
    }
  }
  return Promise.reject(error);
});
