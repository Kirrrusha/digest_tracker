"use client";

import { Key, Webhook } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ApiSettings() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API ключи
          </CardTitle>
          <CardDescription>
            Используйте API ключи для интеграции с внешними сервисами и автоматизации
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api-key">API ключ</Label>
            <Input
              id="api-key"
              type="password"
              placeholder="Сгенерируйте ключ для доступа к API"
              disabled
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              API ключи будут доступны в следующих версиях
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Вебхуки
          </CardTitle>
          <CardDescription>Настройте уведомления о новых саммари через вебхуки</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="webhook-url">URL вебхука</Label>
            <Input
              id="webhook-url"
              type="url"
              placeholder="https://your-server.com/webhook"
              disabled
            />
            <p className="text-xs text-muted-foreground">
              Вебхуки будут доступны в следующих версиях
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
