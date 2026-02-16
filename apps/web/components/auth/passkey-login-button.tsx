"use client";

import { useState } from "react";
import { startAuthentication } from "@simplewebauthn/browser";
import { Fingerprint } from "lucide-react";
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";

interface PasskeyLoginButtonProps {
  email?: string;
  className?: string;
}

export function PasskeyLoginButton({ email, className }: PasskeyLoginButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePasskeyLogin() {
    setIsLoading(true);
    setError(null);

    try {
      const optionsRes = await fetch("/api/passkey/login/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!optionsRes.ok) {
        throw new Error("Не удалось получить опции аутентификации");
      }

      const options = await optionsRes.json();

      const credential = await startAuthentication(options);

      const verifyRes = await fetch("/api/passkey/login/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credential,
          challengeKey: options.challengeKey,
        }),
      });

      if (!verifyRes.ok) {
        const data = await verifyRes.json();
        throw new Error(data.error || "Ошибка аутентификации");
      }

      const { user } = await verifyRes.json();

      await signIn("passkey", {
        userId: user.id,
        email: user.email,
        name: user.name || "",
        redirectTo: "/",
      });
    } catch (err) {
      console.error("Passkey login error:", err);
      if (err instanceof Error && err.name === "NotAllowedError") {
        setError("Операция отменена");
      } else {
        setError(err instanceof Error ? err.message : "Ошибка входа через Passkey");
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className={className}>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handlePasskeyLogin}
        disabled={isLoading}
      >
        <Fingerprint className="mr-2 h-4 w-4" />
        {isLoading ? "Вход..." : "Войти через Passkey"}
      </Button>
      {error && <p className="mt-2 text-center text-sm text-destructive">{error}</p>}
    </div>
  );
}
