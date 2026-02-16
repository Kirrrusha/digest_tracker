"use client";

import { useState } from "react";
import { startRegistration } from "@simplewebauthn/browser";
import { KeyRound, Plus } from "lucide-react";

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

interface PasskeyRegisterButtonProps {
  onSuccess?: () => void;
  variant?: "default" | "outline" | "secondary";
}

export function PasskeyRegisterButton({
  onSuccess,
  variant = "outline",
}: PasskeyRegisterButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [passkeyName, setPasskeyName] = useState("");

  async function handleRegister() {
    setIsLoading(true);
    setError(null);

    try {
      const optionsRes = await fetch("/api/passkey/register/options", {
        method: "POST",
      });

      if (!optionsRes.ok) {
        throw new Error("Не удалось получить опции регистрации");
      }

      const options = await optionsRes.json();

      const credential = await startRegistration(options);

      const verifyRes = await fetch("/api/passkey/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credential,
          name: passkeyName || "Passkey",
        }),
      });

      if (!verifyRes.ok) {
        const data = await verifyRes.json();
        throw new Error(data.error || "Ошибка регистрации");
      }

      setIsOpen(false);
      setPasskeyName("");
      onSuccess?.();
    } catch (err) {
      console.error("Passkey registration error:", err);
      if (err instanceof Error && err.name === "NotAllowedError") {
        setError("Операция отменена");
      } else {
        setError(err instanceof Error ? err.message : "Ошибка регистрации Passkey");
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant={variant}>
          <Plus className="mr-2 h-4 w-4" />
          Добавить Passkey
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Добавить Passkey
          </DialogTitle>
          <DialogDescription>
            Passkey позволяет входить без пароля, используя биометрию или PIN устройства. Работает с
            Bitwarden, 1Password, iCloud Keychain и другими менеджерами паролей.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="passkey-name">Название (опционально)</Label>
            <Input
              id="passkey-name"
              placeholder="Например: MacBook Pro"
              value={passkeyName}
              onChange={(e) => setPasskeyName(e.target.value)}
              disabled={isLoading}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isLoading}>
            Отмена
          </Button>
          <Button onClick={handleRegister} disabled={isLoading}>
            {isLoading ? "Регистрация..." : "Зарегистрировать"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
