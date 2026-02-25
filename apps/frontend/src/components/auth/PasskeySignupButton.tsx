import { useState } from "react";
import { startRegistration } from "@simplewebauthn/browser";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { passkeyApi } from "../../api/passkey";
import { useAuthStore } from "../../stores/auth.store";

export function PasskeySignupButton() {
  const navigate = useNavigate();
  const setTokens = useAuthStore((s) => s.setTokens);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");

  const handleSignup = async () => {
    setLoading(true);
    try {
      const { options, challengeId } = await passkeyApi.getSignupOptions(name.trim() || undefined);
      const response = await startRegistration({ optionsJSON: options });
      const tokens = await passkeyApi.verifySignup(challengeId, response);
      setTokens(tokens.accessToken, tokens.refreshToken);
      navigate("/dashboard");
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "NotAllowedError") return;
      toast.error("Не удалось создать аккаунт через passkey");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Имя (необязательно)</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Иван Иванов"
          disabled={loading}
          className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        />
      </div>
      <button
        type="button"
        onClick={handleSignup}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        <PasskeyIcon />
        {loading ? "Создаём аккаунт..." : "Зарегистрироваться через passkey"}
      </button>
    </div>
  );
}

function PasskeyIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="8" cy="8" r="4" />
      <path d="M14 8h8M18 4v8" />
      <path d="M3 20c0-2.2 1.8-4 4-4h2" />
    </svg>
  );
}
