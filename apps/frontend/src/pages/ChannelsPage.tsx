import { useState } from "react";
import type { Channel } from "@devdigest/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Radio, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { channelsApi } from "../api/channels";

export function ChannelsPage() {
  const qc = useQueryClient();
  const [url, setUrl] = useState("");
  const [showForm, setShowForm] = useState(false);

  const { data: channels = [], isLoading } = useQuery({
    queryKey: ["channels"],
    queryFn: channelsApi.list,
  });

  const addMutation = useMutation({
    mutationFn: () => channelsApi.create({ url }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["channels"] });
      setUrl("");
      setShowForm(false);
      toast.success("Канал добавлен");
    },
    onError: () => toast.error("Ошибка добавления канала"),
  });

  const removeMutation = useMutation({
    mutationFn: channelsApi.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["channels"] });
      toast.success("Канал удалён");
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Каналы</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
        >
          <Plus size={16} />
          Добавить
        </button>
      </div>

      {showForm && (
        <div className="bg-white border rounded-lg p-4 mb-4 flex gap-2">
          <input
            type="url"
            placeholder="https://t.me/example или RSS URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1 border rounded px-3 py-2 text-sm"
          />
          <button
            onClick={() => addMutation.mutate()}
            disabled={!url || addMutation.isPending}
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
          >
            Добавить
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border rounded-lg p-4 animate-pulse h-16" />
          ))}
        </div>
      ) : channels.length === 0 ? (
        <div className="text-center text-gray-500 py-12">Каналов нет. Добавьте первый!</div>
      ) : (
        <div className="space-y-3">
          {channels.map((ch: Channel) => (
            <div key={ch.id} className="bg-white border rounded-lg p-4 flex items-center gap-3">
              <Radio size={20} className="text-gray-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{ch.name}</p>
                <p className="text-sm text-gray-500 truncate">{ch.sourceUrl}</p>
              </div>
              <div className="text-sm text-gray-500 shrink-0">{ch.postsCount} постов</div>
              <button
                onClick={() => removeMutation.mutate(ch.id)}
                className="text-gray-400 hover:text-red-500 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
