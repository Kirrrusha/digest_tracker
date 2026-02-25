import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Loader2, LogOut, Phone, Shield } from "lucide-react";
import { toast } from "sonner";

import { mtprotoApi } from "../api/mtproto";

type Step = "phone" | "code" | "password" | "connected";

interface TelegramConnectProps {
  hasActiveSession: boolean;
}

export function TelegramConnect({ hasActiveSession }: TelegramConnectProps) {
  const qc = useQueryClient();
  const [step, setStep] = useState<Step>(hasActiveSession ? "connected" : "phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [sessionString, setSessionString] = useState("");
  const [phoneCodeHash, setPhoneCodeHash] = useState("");
  const [codeVia, setCodeVia] = useState<"app" | "sms" | "other">("app");
  const [error, setError] = useState<string | null>(null);

  const sendCodeMutation = useMutation({
    mutationFn: () => mtprotoApi.sendCode(phone.trim()),
    onSuccess: (data) => {
      setSessionString(data.sessionString);
      setPhoneCodeHash(data.phoneCodeHash);
      setCodeVia(data.codeVia);
      setError(null);
      setStep("code");
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setError(err.response?.data?.message ?? "Не удалось отправить код");
    },
  });

  const verifyMutation = useMutation({
    mutationFn: (pwd?: string) =>
      mtprotoApi.verify({
        phoneNumber: phone,
        phoneCode: code.trim(),
        phoneCodeHash,
        sessionString,
        password: pwd,
      }),
    onSuccess: (data) => {
      if (data.needs2FA) {
        setStep("password");
        return;
      }
      setError(null);
      setStep("connected");
      qc.invalidateQueries({ queryKey: ["mtproto-status"] });
      toast.success("Telegram подключён");
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setError(err.response?.data?.message ?? "Неверный код");
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: mtprotoApi.disconnect,
    onSuccess: () => {
      setStep("phone");
      setPhone("");
      setCode("");
      setPassword("");
      setError(null);
      qc.invalidateQueries({ queryKey: ["mtproto-status"] });
      toast.success("Telegram отключён");
    },
    onError: () => setError("Не удалось отключить Telegram"),
  });

  const isPending =
    sendCodeMutation.isPending || verifyMutation.isPending || disconnectMutation.isPending;

  return (
    <div className="bg-white border rounded-lg p-6">
      <div className="flex items-center gap-2 mb-1">
        <Phone size={18} className="text-gray-600" />
        <h2 className="text-base font-semibold text-gray-900">Подключение Telegram</h2>
        {step === "connected" && (
          <span className="ml-1 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
            Подключён
          </span>
        )}
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Подключите личный аккаунт для отслеживания приватных каналов
      </p>

      {error && (
        <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-red-50 text-red-600 text-sm">
          <AlertCircle size={16} className="shrink-0" />
          {error}
        </div>
      )}

      {step === "connected" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-lg border bg-gray-50">
            <CheckCircle2 size={18} className="text-green-500 shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-900">Telegram подключён</p>
              <p className="text-xs text-gray-500">
                Добавляйте приватные каналы через «Мои Telegram каналы»
              </p>
            </div>
          </div>
          <button
            onClick={() => disconnectMutation.mutate()}
            disabled={isPending}
            className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 border border-red-200 rounded hover:bg-red-50 disabled:opacity-50"
          >
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
            Отключить Telegram
          </button>
        </div>
      )}

      {step === "phone" && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Номер телефона</label>
            <input
              type="tel"
              placeholder="+7XXXXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendCodeMutation.mutate()}
              disabled={isPending}
              className="w-full border rounded px-3 py-2 text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">Введите номер в международном формате</p>
          </div>
          <button
            onClick={() => sendCodeMutation.mutate()}
            disabled={!phone.trim() || isPending}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded text-sm disabled:opacity-50 hover:bg-blue-700"
          >
            {isPending && <Loader2 size={14} className="animate-spin" />}
            {isPending ? "Отправка..." : "Получить код"}
          </button>
        </div>
      )}

      {step === "code" && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            {codeVia === "app" ? (
              <>
                Код отправлен в{" "}
                <span className="font-medium text-gray-800">приложение Telegram</span> на номер{" "}
                {phone} — проверьте чат с «Telegram»
              </>
            ) : (
              <>
                Код отправлен на <span className="font-medium text-gray-800">{phone}</span> по SMS
              </>
            )}
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Код из Telegram</label>
            <input
              placeholder="12345"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && verifyMutation.mutate(undefined)}
              disabled={isPending}
              maxLength={8}
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => verifyMutation.mutate(undefined)}
              disabled={!code.trim() || isPending}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded text-sm disabled:opacity-50 hover:bg-blue-700"
            >
              {isPending && <Loader2 size={14} className="animate-spin" />}
              {isPending ? "Проверка..." : "Подтвердить"}
            </button>
            <button
              onClick={() => setStep("phone")}
              disabled={isPending}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
            >
              Назад
            </button>
          </div>
        </div>
      )}

      {step === "password" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 p-3 rounded-lg border bg-gray-50">
            <Shield size={16} className="text-gray-400 shrink-0" />
            <p className="text-sm text-gray-500">
              На аккаунте включена двухфакторная аутентификация
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Пароль 2FA</label>
            <input
              type="password"
              placeholder="Пароль двухфакторной аутентификации"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && verifyMutation.mutate(password)}
              disabled={isPending}
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => verifyMutation.mutate(password)}
              disabled={!password.trim() || isPending}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded text-sm disabled:opacity-50 hover:bg-blue-700"
            >
              {isPending && <Loader2 size={14} className="animate-spin" />}
              {isPending ? "Вход..." : "Войти"}
            </button>
            <button
              onClick={() => setStep("code")}
              disabled={isPending}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
            >
              Назад
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
