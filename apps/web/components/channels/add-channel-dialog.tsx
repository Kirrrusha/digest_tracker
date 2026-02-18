"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { AlertCircle, Check, Loader2, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { addChannel, validateChannelUrl } from "@/app/actions/channels";

import { TelegramChannelBrowser } from "./telegram-channel-browser";

interface ChannelPreview {
  type: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
}

interface AddChannelDialogProps {
  hasActiveSession?: boolean;
}

export function AddChannelDialog({ hasActiveSession = false }: AddChannelDialogProps) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState<ChannelPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isValidating, startValidation] = useTransition();
  const [isAdding, startAdd] = useTransition();
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [error]);

  const resetState = () => {
    setUrl("");
    setPreview(null);
    setError(null);
  };

  const handleValidate = () => {
    setError(null);
    setPreview(null);

    startValidation(async () => {
      const result = await validateChannelUrl(url);
      if (result.success) {
        setPreview(result.data);
      } else {
        setError(result.error);
      }
    });
  };

  const handleAdd = () => {
    startAdd(async () => {
      const result = await addChannel(url);
      if (result.success) {
        setOpen(false);
        resetState();
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) resetState();
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Добавить канал
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Добавить канал</DialogTitle>
          <DialogDescription>
            Добавьте Telegram канал или RSS фид для отслеживания
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="url" className="w-full flex-1 overflow-hidden flex flex-col">
          <TabsList className="w-full">
            <TabsTrigger value="url" className="flex-1">
              По URL
            </TabsTrigger>
            <TabsTrigger value="telegram" className="flex-1">
              Мои Telegram каналы
            </TabsTrigger>
          </TabsList>

          <TabsContent value="url" className="mt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="url">URL источника</Label>
                <div className="flex gap-2">
                  <Input
                    id="url"
                    placeholder="https://t.me/channel или RSS URL"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleValidate()}
                  />
                  <Button
                    variant="outline"
                    onClick={handleValidate}
                    disabled={!url.trim() || isValidating}
                    className="min-w-28"
                  >
                    {isValidating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin shrink-0" />
                        Проверка...
                      </>
                    ) : (
                      "Проверить"
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Поддерживаются: Telegram (@channel, t.me/channel) и RSS фиды
                </p>
              </div>

              {error && (
                <div
                  ref={errorRef}
                  role="alert"
                  className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              {preview && (
                <div className="p-4 rounded-lg border bg-muted/50 space-y-3">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="font-medium">Канал найден</span>
                  </div>
                  <div className="flex items-start gap-3">
                    {preview.imageUrl && (
                      <Image
                        src={preview.imageUrl}
                        alt={preview.name}
                        width={48}
                        height={48}
                        className="w-12 h-12 rounded-lg object-cover"
                        unoptimized
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{preview.name}</p>
                        <Badge variant="secondary" className="text-xs">
                          {preview.type === "telegram" ? "Telegram" : "RSS"}
                        </Badge>
                      </div>
                      {preview.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {preview.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Отмена
              </Button>
              <Button onClick={handleAdd} disabled={!preview || isAdding} className="min-w-28">
                {isAdding ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin shrink-0" />
                    Добавление...
                  </>
                ) : (
                  "Добавить"
                )}
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent
            value="telegram"
            className="mt-4 w-full flex-1 overflow-hidden flex flex-col"
          >
            {hasActiveSession ? (
              <TelegramChannelBrowser onAdded={() => setOpen(false)} />
            ) : (
              <div className="py-8 text-center space-y-3">
                <p className="text-sm text-muted-foreground">
                  Чтобы добавлять приватные Telegram каналы, сначала подключите свой аккаунт
                </p>
                <Button variant="outline" asChild size="sm">
                  <Link href="/dashboard/settings?tab=telegram">Подключить Telegram</Link>
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
