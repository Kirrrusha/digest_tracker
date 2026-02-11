import { Suspense } from "react";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Header } from "@/components/dashboard/header";
import { ApiSettings } from "@/components/settings/api-settings";
import { NotificationSettings } from "@/components/settings/notification-settings";
import { PreferencesSettings } from "@/components/settings/preferences-settings";
import { ProfileSettings } from "@/components/settings/profile-settings";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
      <Skeleton className="h-9 w-full max-w-md" />
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
    <Tabs defaultValue="profile" className="w-full">
      <TabsList className="mb-6 flex h-auto flex-wrap gap-1">
        <TabsTrigger value="profile">Профиль</TabsTrigger>
        <TabsTrigger value="preferences">Предпочтения</TabsTrigger>
        <TabsTrigger value="notifications">Уведомления</TabsTrigger>
        <TabsTrigger value="api">API</TabsTrigger>
      </TabsList>
      <TabsContent value="profile">
        <ProfileSettings user={user} />
      </TabsContent>
      <TabsContent value="preferences">
        <PreferencesSettings preferences={preferences} />
      </TabsContent>
      <TabsContent value="notifications">
        <NotificationSettings settings={preferences} hasTelegramAccount={hasTelegramAccount} />
      </TabsContent>
      <TabsContent value="api">
        <ApiSettings />
      </TabsContent>
    </Tabs>
  );
}

export default async function SettingsPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  return (
    <div className="flex flex-col h-full">
      <Header title="Настройки" />
      <div className="flex-1 p-6 max-w-2xl">
        <p className="text-sm text-muted-foreground mb-6">Управляйте вашими предпочтениями</p>
        <Suspense fallback={<SettingsSkeleton />}>
          <SettingsContent userId={userId} />
        </Suspense>
      </div>
    </div>
  );
}
