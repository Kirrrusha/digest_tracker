import { useState } from "react";
import { startAuthentication } from "@simplewebauthn/browser";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { passkeyApi } from "../../api/passkey";
import { useAuthStore } from "../../stores/auth.store";

export function PasskeyLoginButton() {
  const navigate = useNavigate();
  const setTokens = useAuthStore((s) => s.setTokens);
  const [loading, setLoading] = useState(false);

  const handlePasskeyLogin = async () => {
    setLoading(true);
    try {
      const { options, challengeId } = await passkeyApi.getAuthOptions();
      const response = await startAuthentication({ optionsJSON: options });
      const tokens = await passkeyApi.verifyAuthentication(challengeId, response);
      setTokens(tokens.accessToken, tokens.refreshToken);
      navigate("/dashboard");
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "NotAllowedError") return;
      toast.error("Не удалось войти через passkey");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handlePasskeyLogin}
      disabled={loading}
      className="w-full flex items-center justify-center gap-2 border border-gray-300 rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
    >
      <PasskeyIcon />
      {loading ? "Проверяем..." : "Войти с помощью passkey"}
    </button>
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
