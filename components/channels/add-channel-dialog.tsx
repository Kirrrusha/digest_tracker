"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus, Check, AlertCircle } from "lucide-react";

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
import { Badge } from "@/components/ui/badge";
import { addChannel, validateChannelUrl } from "@/app/actions/channels";

interface ChannelPreview {
  type: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
}

export function AddChannelDialog() {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState<ChannelPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isValidating, startValidation] = useTransition();
  const [isAdding, startAdd] = useTransition();

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
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetState(); }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Добавить канал
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Добавить канал</DialogTitle>
          <DialogDescription>
            Введите URL Telegram канала или RSS фида
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
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
              >
                {isValidating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
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
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
              <AlertCircle className="h-4 w-4" />
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
                  <img
                    src={preview.imageUrl}
                    alt={preview.name}
                    className="w-12 h-12 rounded-lg object-cover"
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

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Отмена
          </Button>
          <Button onClick={handleAdd} disabled={!preview || isAdding}>
            {isAdding ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Добавление...
              </>
            ) : (
              "Добавить"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
