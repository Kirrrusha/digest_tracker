import { Suspense } from "react";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Header } from "@/components/dashboard/header";
import { SettingsForm } from "@/components/settings/settings-form";
import { TopicsManagement } from "@/components/settings/topics-management";
import { NotificationSettings } from "@/components/settings/notification-settings";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

async function getPreferences(userId: string) {
  const [preferences, user, telegramAccount] = await Promise.all([
    db.userPreferences.findUnique({
      where: { userId },
    }),
    db.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    }),
    db.telegramAccount.findUnique({
      where: { userId },
      select: { id: true },
    }),
  ]);

  return {
    user,
    hasTelegramAccount: !!telegramAccount,
    preferences: {
      topics: preferences?.topics || [],
      summaryInterval: preferences?.summaryInterval || "daily",
      language: preferences?.language || "ru",
      notificationsEnabled: preferences?.notificationsEnabled || false,
      notificationTime: preferences?.notificationTime || null,
      telegramNotifications: preferences?.telegramNotifications ?? true,
      notifyOnNewSummary: preferences?.notifyOnNewSummary ?? true,
      notifyOnNewPosts: preferences?.notifyOnNewPosts ?? false,
    },
  };
}

function SettingsSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

async function SettingsContent({ userId }: { userId: string }) {
  const { user, preferences, hasTelegramAccount } = await getPreferences(userId);

  return (
    <div className="space-y-6">
      <SettingsForm user={user} preferences={preferences} />
      <TopicsManagement topics={preferences.topics} />
      <NotificationSettings
        settings={preferences}
        hasTelegramAccount={hasTelegramAccount}
      />
    </div>
  );
}

export default async function SettingsPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  return (
    <div className="flex flex-col h-full">
      <Header title="Настройки" />
      <div className="flex-1 p-6 max-w-2xl">
        <Suspense fallback={<SettingsSkeleton />}>
          <SettingsContent userId={userId} />
        </Suspense>
      </div>
    </div>
  );
}
