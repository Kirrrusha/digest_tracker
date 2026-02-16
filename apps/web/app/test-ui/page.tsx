"use client";

import { Inbox } from "lucide-react";

import { EmptyState } from "@/components/empty/empty-state";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { CardSkeleton } from "@/components/skeletons/card-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function TestUIPage() {
  return (
    <div className="container-padding py-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="heading-1">Тестовая страница UI</h1>
        <ThemeToggle />
      </div>

      <Separator />

      <section>
        <h2 className="heading-2 mb-4">Кнопки</h2>
        <div className="flex gap-2 flex-wrap">
          <Button>Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
        </div>
      </section>

      <Separator />

      <section>
        <h2 className="heading-2 mb-4">Формы</h2>
        <div className="max-w-md space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="email@example.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Пароль</Label>
            <Input id="password" type="password" placeholder="••••••••" />
          </div>
          <Button>Войти</Button>
        </div>
      </section>

      <Separator />

      <section>
        <h2 className="heading-2 mb-4">Карточки</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Карточка с контентом</CardTitle>
              <CardDescription>Описание карточки</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="body">
                Контент карточки с текстом на русском языке. Шрифт Inter поддерживает кириллицу.
              </p>
              <div className="flex gap-2 mt-4">
                <Badge>React</Badge>
                <Badge variant="secondary">TypeScript</Badge>
                <Badge variant="outline">Next.js</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Вторая карточка</CardTitle>
              <CardDescription>Ещё один пример</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="body-small caption">Маленький текст с серым цветом</p>
              <div className="flex gap-2 mt-4">
                <Badge variant="destructive">Важно</Badge>
                <Badge className="bg-success text-white">Успех</Badge>
              </div>
            </CardContent>
          </Card>

          <CardSkeleton />
        </div>
      </section>

      <Separator />

      <section>
        <h2 className="heading-2 mb-4">Типографика</h2>
        <div className="space-y-4">
          <h1 className="heading-1">Heading 1</h1>
          <h2 className="heading-2">Heading 2</h2>
          <h3 className="heading-3">Heading 3</h3>
          <h4 className="heading-4">Heading 4</h4>
          <p className="body-large">Body Large - Большой текст для чтения</p>
          <p className="body">Body - Обычный текст для интерфейса</p>
          <p className="body-small">Body Small - Маленький текст</p>
          <p className="caption">Caption - Подпись или вторичный текст</p>
          <p className="overline">Overline - Надпись заголовка</p>
        </div>
      </section>

      <Separator />

      <section>
        <h2 className="heading-2 mb-4">Empty State</h2>
        <EmptyState
          icon={Inbox}
          title="Нет каналов"
          description="Добавьте первый канал из Telegram или RSS, чтобы начать получать автоматические саммари по интересующим вас темам"
          action={{
            label: "Добавить канал",
            onClick: () => alert("Клик на кнопку!"),
          }}
          secondaryAction={{
            label: "Узнать больше",
            onClick: () => alert("Вторичное действие"),
          }}
        />
      </section>

      <Separator />

      <section>
        <h2 className="heading-2 mb-4">Цвета темы</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <div className="h-20 rounded-lg bg-background border flex items-center justify-center">
              Background
            </div>
            <div className="h-20 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
              Primary
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-20 rounded-lg bg-secondary text-secondary-foreground flex items-center justify-center">
              Secondary
            </div>
            <div className="h-20 rounded-lg bg-muted text-muted-foreground flex items-center justify-center">
              Muted
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-20 rounded-lg bg-accent text-accent-foreground flex items-center justify-center">
              Accent
            </div>
            <div className="h-20 rounded-lg bg-destructive text-destructive-foreground flex items-center justify-center">
              Destructive
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-20 rounded-lg border flex items-center justify-center">Border</div>
            <div className="h-20 rounded-lg bg-card text-card-foreground border flex items-center justify-center">
              Card
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
