import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  channelsApi,
  dashboardApi,
  mtprotoApi,
  postsApi,
  profileApi,
  summariesApi,
} from "../api/endpoints";

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

export const useSyncChannel = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => channelsApi.sync(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["channels", id, "posts"] });
      qc.invalidateQueries({ queryKey: ["posts"] });
      qc.invalidateQueries({ queryKey: ["dashboard", "stats"] });
    },
  });
};

// Posts
export const usePosts = (page = 1, channelId?: string) =>
  useQuery({
    queryKey: ["posts", page, channelId],
    queryFn: () => postsApi.list({ page, channelId }),
  });

export const usePost = (id: string) =>
  useQuery({
    queryKey: ["posts", id],
    queryFn: () => postsApi.get(id),
    enabled: !!id,
  });

// Summaries
export const useSummaries = (period?: string, topic?: string) =>
  useQuery({
    queryKey: ["summaries", period, topic],
    queryFn: () => summariesApi.list({ period, topic }),
  });

export const useSummaryTopics = () =>
  useQuery({
    queryKey: ["summaries", "topics"],
    queryFn: summariesApi.topics,
  });

export const useSummary = (id: string) =>
  useQuery({
    queryKey: ["summaries", id],
    queryFn: () => summariesApi.get(id),
    enabled: !!id,
  });

async function pollJobStatus(jobId: string, qc: ReturnType<typeof useQueryClient>) {
  const poll = async () => {
    try {
      const { status } = await summariesApi.getJobStatus(jobId);
      if (status === "completed") {
        qc.invalidateQueries({ queryKey: ["summaries"] });
        return;
      }
      if (status !== "failed") {
        setTimeout(poll, 2000);
      }
    } catch {
      // silently stop polling on network error
    }
  };
  poll();
}

export const useGenerateSummary = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ type, force }: { type: "daily" | "weekly"; force?: boolean }) =>
      summariesApi.generate(type, force),
    onSuccess: ({ jobId }) => pollJobStatus(jobId, qc),
  });
};

export const useDeleteSummary = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => summariesApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["summaries"] }),
  });
};

export const useRegenerateSummary = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => summariesApi.regenerate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["summaries", id] });
      qc.invalidateQueries({ queryKey: ["summaries"] });
    },
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

// MTProto
export const useMTProtoStatus = () =>
  useQuery({ queryKey: ["mtproto-status"], queryFn: mtprotoApi.getStatus });

export const useSendMTProtoCode = () =>
  useMutation({ mutationFn: (phone: string) => mtprotoApi.sendCode(phone) });

export const useVerifyMTProtoCode = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: mtprotoApi.verify,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mtproto-status"] }),
  });
};

export const useDisconnectMTProto = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: mtprotoApi.disconnect,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mtproto-status"] }),
  });
};

export const useMTProtoChannels = (enabled: boolean) =>
  useQuery({
    queryKey: ["mtproto-channels"],
    queryFn: mtprotoApi.listChannels,
    enabled,
  });

export const useBulkAddMTProtoChannels = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: mtprotoApi.bulkAdd,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["channels"] });
      qc.invalidateQueries({ queryKey: ["mtproto-channels"] });
    },
  });
};
