import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { channelsApi, dashboardApi, profileApi, summariesApi } from "../api/endpoints";

// Dashboard
export const useDashboardStats = () =>
  useQuery({ queryKey: ["dashboard", "stats"], queryFn: dashboardApi.stats });

// Channels
export const useChannels = () => useQuery({ queryKey: ["channels"], queryFn: channelsApi.list });

export const useChannel = (id: string) =>
  useQuery({
    queryKey: ["channels", id],
    queryFn: () => channelsApi.get(id),
    enabled: !!id,
  });

export const useChannelPosts = (id: string, page = 1) =>
  useQuery({
    queryKey: ["channels", id, "posts", page],
    queryFn: () => channelsApi.posts(id, page),
    enabled: !!id,
  });

export const useAddChannel = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (url: string) => channelsApi.add(url),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["channels"] }),
  });
};

export const useDeleteChannel = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => channelsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["channels"] }),
  });
};

export const useToggleChannel = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      channelsApi.toggle(id, isActive),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["channels"] }),
  });
};

// Summaries
export const useSummaries = (period?: string) =>
  useQuery({
    queryKey: ["summaries", period],
    queryFn: () => summariesApi.list({ period }),
  });

export const useSummary = (id: string) =>
  useQuery({
    queryKey: ["summaries", id],
    queryFn: () => summariesApi.get(id),
    enabled: !!id,
  });

export const useGenerateSummary = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (period: "daily" | "weekly") => summariesApi.generate(period),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["summaries"] }),
  });
};

export const useDeleteSummary = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => summariesApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["summaries"] }),
  });
};

// Profile
export const useProfile = () => useQuery({ queryKey: ["profile"], queryFn: profileApi.get });

export const usePreferences = () =>
  useQuery({
    queryKey: ["preferences"],
    queryFn: profileApi.getPreferences,
  });

export const useUpdatePreferences = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: profileApi.updatePreferences,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["preferences"] }),
  });
};
