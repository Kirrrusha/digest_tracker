import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { preferencesApi } from "../api/preferences";

export function SettingsPage() {
  const qc = useQueryClient();
  const { data: prefs, isLoading } = useQuery({
    queryKey: ["preferences"],
    queryFn: preferencesApi.get,
  });

  const mutation = useMutation({
    mutationFn: preferencesApi.update,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["preferences"] });
      toast.success("Настройки сохранены");
    },
    onError: () => toast.error("Ошибка сохранения"),
  });

  if (isLoading)
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 bg-gray-100 rounded" />
        ))}
      </div>
    );

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Настройки</h1>
      <div className="bg-white border rounded-lg p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Интервал саммари</label>
          <select
            className="w-full border rounded px-3 py-2 text-sm"
            value={prefs?.summaryInterval ?? "daily"}
            onChange={(e) =>
              mutation.mutate({ summaryInterval: e.target.value as "daily" | "weekly" })
            }
          >
            <option value="daily">Ежедневно</option>
            <option value="weekly">Еженедельно</option>
          </select>
        </div>
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">Telegram-уведомления</label>
          <input
            type="checkbox"
            checked={prefs?.telegramNotifications ?? false}
            onChange={(e) => mutation.mutate({ telegramNotifications: e.target.checked })}
            className="h-4 w-4"
          />
        </div>
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">Уведомлять о новых саммари</label>
          <input
            type="checkbox"
            checked={prefs?.notifyOnNewSummary ?? false}
            onChange={(e) => mutation.mutate({ notifyOnNewSummary: e.target.checked })}
            className="h-4 w-4"
          />
        </div>
      </div>
    </div>
  );
}
