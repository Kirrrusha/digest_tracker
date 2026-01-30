import { Suspense } from "react";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Header } from "@/components/dashboard/header";
import { SettingsForm } from "@/components/settings/settings-form";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

async function getPreferences(userId: string) {
  const [preferences, user] = await Promise.all([
    db.userPreferences.findUnique({
      where: { userId },
    }),
    db.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    }),
  ]);

  return {
    user,
    preferences: {
      topics: preferences?.topics || [],
      summaryInterval: preferences?.summaryInterval || "daily",
      language: preferences?.language || "ru",
      notificationsEnabled: preferences?.notificationsEnabled || false,
      notificationTime: preferences?.notificationTime || null,
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
  const { user, preferences } = await getPreferences(userId);

  return (
    <SettingsForm
      user={user}
      preferences={preferences}
    />
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
