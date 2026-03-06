import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, Loader2, Sparkles } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { channelsApi } from "../api/channels";
import { summariesApi } from "../api/summaries";

function channelInitial(name: string): string {
  const letter = name.match(/[A-Za-zА-Яа-яЁё]/);
  if (letter) return letter[0].toUpperCase();
  const digit = name.match(/[0-9]/);
  return digit ? digit[0] : "#";
}

export function ChannelDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [jobId, setJobId] = useState<string | null>(null);

  const { data: channel, isLoading: channelLoading } = useQuery({
    queryKey: ["channel", id],
    queryFn: () => channelsApi.get(id!),
    enabled: !!id,
  });

  const { data: jobData } = useQuery({
    queryKey: ["summary-job", jobId],
    queryFn: () => summariesApi.getJobStatus(jobId!),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const s = query.state.data?.status;
      return s === "completed" || s === "failed" ? false : 2000;
    },
  });

  useEffect(() => {
    if (!jobData) return;
    if (jobData.status === "completed" && jobData.summaryId) {
      setJobId(null);
      toast.success("Саммари создано");
      navigate(`/summaries/${jobData.summaryId}`);
    } else if (jobData.status === "failed") {
      setJobId(null);
      toast.error(jobData.error || "Ошибка генерации саммари");
    }
  }, [jobData]);

  const generateMutation = useMutation({
    mutationFn: () => summariesApi.generateForChannel(id!),
    onSuccess: ({ jobId }) => {
      setJobId(jobId);
      toast.info("Генерация саммари запущена...");
    },
    onError: () => toast.error("Ошибка запуска генерации"),
  });

  if (channelLoading) {
    return (
      <div className="animate-pulse space-y-4 max-w-3xl">
        <div className="h-6 bg-[var(--surface)] rounded w-32" />
        <div className="h-24 bg-[var(--surface)] rounded-xl" />
      </div>
    );
  }

  if (!channel) return <p className="text-slate-400">Канал не найден</p>;

  const isTelegram =
    channel.sourceType === "telegram" ||
    channel.sourceType === "telegram_bot" ||
    channel.sourceType === "telegram_mtproto";

  return (
    <div className="max-w-3xl">
      <Link
        to="/channels"
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-6"
      >
        <ArrowLeft size={16} />
        Назад к каналам
      </Link>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xl shrink-0">
            {channelInitial(channel.name)}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-white">{channel.name}</h1>
            <a
              href={channel.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-slate-400 hover:text-blue-400 transition-colors inline-flex items-center gap-1 mt-0.5"
            >
              {channel.sourceUrl}
              <ExternalLink size={11} />
            </a>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-4 flex-wrap">
          <span className="text-xs bg-[var(--border)] text-slate-300 px-2.5 py-1 rounded-full">
            {isTelegram ? (channel.isGroup ? "Telegram группа" : "Telegram") : "RSS"}
          </span>
          <button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending || !!jobId}
            className="ml-auto flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {jobId ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {jobId ? "Генерируется..." : "Сгенерировать саммари"}
          </button>
        </div>
      </div>
    </div>
  );
}
