"use client";

import { User } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ProfileSettingsProps {
  user: {
    name: string | null;
    email: string | null;
  } | null;
}

export function ProfileSettings({ user }: ProfileSettingsProps) {
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : (user?.email?.[0]?.toUpperCase() ?? "?");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Профиль
        </CardTitle>
        <CardDescription>Информация о вашем аккаунте</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
            {initials}
          </div>
          <div className="text-sm text-muted-foreground">Фото профиля будет доступно позже</div>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Имя</Label>
            <Input value={user?.name || ""} disabled />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user?.email || ""} disabled />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
