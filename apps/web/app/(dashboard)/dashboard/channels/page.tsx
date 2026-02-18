import { Suspense } from "react";

import { auth } from "@/lib/auth";
import { getCachedUserChannels } from "@/lib/cache";
import { db } from "@/lib/db";
import { AddChannelDialog } from "@/components/channels/add-channel-dialog";
import { ChannelCard } from "@/components/channels/channel-card";
import { ChannelFilters } from "@/components/channels/channel-filters";
import { Header } from "@/components/dashboard/header";
import { EmptyState } from "@/components/empty/empty-state";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type ChannelFilterType = "all" | "telegram" | "rss";

function ChannelSkeleton() {
  return (
    <Card className="gap-3">
      <div className="px-6 flex items-start gap-3">
        <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <div className="px-6">
        <Skeleton className="h-4 w-40" />
      </div>
    </Card>
  );
}

function filterChannels(
  channels: Awaited<ReturnType<typeof getCachedUserChannels>>,
  source: ChannelFilterType | undefined,
  search: string | undefined
) {
  let filtered = channels;

  if (source && source !== "all") {
    filtered = filtered.filter((c) =>
      source === "telegram"
        ? c.sourceType === "telegram" || c.sourceType === "telegram_mtproto"
        : c.sourceType === source
    );
  }

  if (search?.trim()) {
    const query = search.trim().toLowerCase();
    filtered = filtered.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        (c.description?.toLowerCase().includes(query) ?? false) ||
        c.sourceUrl.toLowerCase().includes(query)
    );
  }

  return filtered;
}

function ChannelsList({
  channels,
  source,
  search,
  hasActiveSession,
}: {
  channels: Awaited<ReturnType<typeof getCachedUserChannels>>;
  source?: ChannelFilterType;
  search?: string;
  hasActiveSession?: boolean;
}) {
  const filtered = filterChannels(channels, source, search);

  if (filtered.length === 0) {
    return (
      <EmptyState
        iconName="rss"
        title={channels.length === 0 ? "Нет каналов" : "Ничего не найдено"}
        description={
          channels.length === 0
            ? "Добавьте Telegram каналы или RSS фиды для агрегации контента"
            : "Попробуйте изменить фильтры или поисковый запрос"
        }
      >
        {channels.length === 0 && <AddChannelDialog hasActiveSession={hasActiveSession} />}
      </EmptyState>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {filtered.map((channel) => (
        <ChannelCard key={channel.id} channel={channel} />
      ))}
    </div>
  );
}

interface PageProps {
  searchParams: Promise<{
    source?: string;
    search?: string;
  }>;
}

export default async function ChannelsPage({ searchParams }: PageProps) {
  const session = await auth();
  const userId = session!.user!.id!;

  const params = await searchParams;
  const source = (
    params.source === "telegram" || params.source === "rss" ? params.source : "all"
  ) as ChannelFilterType;
  const search = params.search;

  const [channels, mtprotoSession] = await Promise.all([
    getCachedUserChannels(userId),
    db.mTProtoSession.findUnique({ where: { userId }, select: { isActive: true } }),
  ]);
  const hasActiveSession = !!mtprotoSession?.isActive;

  return (
    <div className="flex flex-col h-full">
      <Header title="Каналы" />
      <div className="flex-1 p-6">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Мои каналы</h2>
              <p className="text-sm text-muted-foreground">
                {channels.length} {channels.length === 1 ? "канал" : "каналов"}
              </p>
            </div>
            <AddChannelDialog hasActiveSession={hasActiveSession} />
          </div>

          <Suspense fallback={<Skeleton className="h-10 w-full max-w-xs" />}>
            <ChannelFilters activeFilter={source} searchQuery={search ?? ""} />
          </Suspense>
        </div>

        <ChannelsList
          channels={channels}
          source={source}
          search={search}
          hasActiveSession={hasActiveSession}
        />
      </div>
    </div>
  );
}
