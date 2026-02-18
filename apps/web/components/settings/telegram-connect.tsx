"use client";

import { useState, useTransition } from "react";
import { AlertCircle, CheckCircle2, Loader2, LogOut, Phone, Shield } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Step = "phone" | "code" | "password" | "connected";

interface TelegramConnectProps {
  hasActiveSession: boolean;
}

export function TelegramConnect({ hasActiveSession }: TelegramConnectProps) {
  const [step, setStep] = useState<Step>(hasActiveSession ? "connected" : "phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [sessionString, setSessionString] = useState("");
  const [phoneCodeHash, setPhoneCodeHash] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const clearError = () => setError(null);

  const handleSendCode = () => {
    if (!phone.trim()) return;
    clearError();
    startTransition(async () => {
      const res = await fetch("/api/mtproto/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: phone.trim() }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || "Не удалось отправить код");
        return;
      }
      setSessionString(data.sessionString);
      setPhoneCodeHash(data.phoneCodeHash);
      setStep("code");
    });
  };

  const handleVerify = () => {
    if (!code.trim()) return;
    clearError();
    startTransition(async () => {
      const res = await fetch("/api/mtproto/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: phone,
          phoneCode: code.trim(),
          phoneCodeHash,
          sessionString,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.needs2FA) {
          setStep("password");
          return;
        }
        setError(data.error || "Неверный код");
        return;
      }
      setStep("connected");
    });
  };

  const handleVerifyWithPassword = () => {
    if (!password.trim()) return;
    clearError();
    startTransition(async () => {
      const res = await fetch("/api/mtproto/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: phone,
          phoneCode: code,
          phoneCodeHash,
          sessionString,
          password: password.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Неверный пароль");
        return;
      }
      setStep("connected");
    });
  };

  const handleDisconnect = () => {
    clearError();
    startTransition(async () => {
      const res = await fetch("/api/mtproto/auth/disconnect", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Не удалось отключить Telegram");
        return;
      }
      setPhone("");
      setCode("");
      setPassword("");
      setStep("phone");
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="h-5 w-5" />
          Подключение Telegram
          {step === "connected" && (
            <Badge variant="secondary" className="bg-green-500/10 text-green-600 ml-1">
              Подключён
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Подключите личный аккаунт Telegram для отслеживания приватных каналов
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {step === "connected" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50">
              <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
              <div>
                <p className="text-sm font-medium">Telegram подключён</p>
                <p className="text-xs text-muted-foreground">
                  Вы можете добавлять приватные каналы через «Мои Telegram каналы»
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={handleDisconnect}
              disabled={isPending}
              className="text-destructive hover:text-destructive"
            >
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="mr-2 h-4 w-4" />
              )}
              Отключить Telegram
            </Button>
          </div>
        )}

        {step === "phone" && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="tg-phone">Номер телефона</Label>
              <Input
                id="tg-phone"
                type="tel"
                placeholder="+7XXXXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendCode()}
                disabled={isPending}
              />
              <p className="text-xs text-muted-foreground">Введите номер в международном формате</p>
            </div>
            <Button onClick={handleSendCode} disabled={!phone.trim() || isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Отправка...
                </>
              ) : (
                "Получить код"
              )}
            </Button>
          </div>
        )}

        {step === "code" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Код отправлен на номер <span className="font-medium text-foreground">{phone}</span>
            </p>
            <div className="space-y-2">
              <Label htmlFor="tg-code">Код из Telegram</Label>
              <Input
                id="tg-code"
                placeholder="12345"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                disabled={isPending}
                maxLength={8}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleVerify} disabled={!code.trim() || isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Проверка...
                  </>
                ) : (
                  "Подтвердить"
                )}
              </Button>
              <Button variant="ghost" onClick={() => setStep("phone")} disabled={isPending}>
                Назад
              </Button>
            </div>
          </div>
        )}

        {step === "password" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/50">
              <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
              <p className="text-sm text-muted-foreground">
                На вашем аккаунте включена двухфакторная аутентификация
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tg-password">Пароль 2FA</Label>
              <Input
                id="tg-password"
                type="password"
                placeholder="Пароль двухфакторной аутентификации"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleVerifyWithPassword()}
                disabled={isPending}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleVerifyWithPassword} disabled={!password.trim() || isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Вход...
                  </>
                ) : (
                  "Войти"
                )}
              </Button>
              <Button variant="ghost" onClick={() => setStep("code")} disabled={isPending}>
                Назад
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
