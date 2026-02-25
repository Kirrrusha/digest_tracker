import { useState } from "react";
import { startRegistration } from "@simplewebauthn/browser";
import { toast } from "sonner";

import { passkeyApi } from "../../api/passkey";

interface Props {
  onSuccess?: () => void;
  className?: string;
  label?: string;
}

export function PasskeyRegisterButton({ onSuccess, className, label = "Добавить passkey" }: Props) {
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setLoading(true);
    try {
      const options = await passkeyApi.getRegistrationOptions();
      const response = await startRegistration({ optionsJSON: options });

      let name: string | undefined;
      const ua = navigator.userAgent;
      if (/iPhone|iPad/.test(ua)) name = "iPhone / iPad";
      else if (/Mac/.test(ua)) name = "Mac";
      else if (/Android/.test(ua)) name = "Android";
      else if (/Windows/.test(ua)) name = "Windows";

      const result = await passkeyApi.verifyRegistration(response, name);
      if (result.verified) {
        toast.success("Passkey добавлен");
        onSuccess?.();
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "NotAllowedError") return;
      toast.error("Не удалось добавить passkey");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleRegister}
      disabled={loading}
      className={
        className ??
        "flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
      }
    >
      {loading ? "Создаём..." : label}
    </button>
  );
}
