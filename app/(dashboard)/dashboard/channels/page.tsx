import { Suspense } from "react";
import { Rss } from "lucide-react";

import { auth } from "@/lib/auth";
import { Header } from "@/components/dashboard/header";
import { AddChannelDialog } from "@/components/channels/add-channel-dialog";
import { ChannelCard } from "@/components/channels/channel-card";
import { EmptyState } from "@/components/empty/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getCachedUserChannels } from "@/lib/cache";

function ChannelSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-4 w-40" />
      </CardContent>
    </Card>
  );
}

async function ChannelsList({ userId }: { userId: string }) {
  const channels = await getCachedUserChannels(userId);

  if (channels.length === 0) {
    return (
      <EmptyState
        icon={Rss}
        title="Нет каналов"
        description="Добавьте Telegram каналы или RSS фиды для агрегации контента"
      >
        <AddChannelDialog />
      </EmptyState>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {channels.map((channel) => (
        <ChannelCard key={channel.id} channel={channel} />
      ))}
    </div>
  );
}

export default async function ChannelsPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  return (
    <div className="flex flex-col h-full">
      <Header title="Каналы" />
      <div className="flex-1 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold">Мои каналы</h2>
            <p className="text-sm text-muted-foreground">
              Управление источниками контента
            </p>
          </div>
          <AddChannelDialog />
        </div>

        <Suspense
          fallback={
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <ChannelSkeleton key={i} />
              ))}
            </div>
          }
        >
          <ChannelsList userId={userId} />
        </Suspense>
      </div>
    </div>
  );
}
