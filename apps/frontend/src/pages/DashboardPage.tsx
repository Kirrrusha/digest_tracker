import { useQuery } from "@tanstack/react-query";

import { api } from "../api/client";

interface DashboardStats {
  channelsCount: number;
  postsCount: number;
  summariesCount: number;
}

export function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => api.get<DashboardStats>("/dashboard/stats").then((r) => r.data),
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
      {isLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg border p-6 animate-pulse h-24" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Каналов" value={data?.channelsCount ?? 0} />
          <StatCard label="Постов" value={data?.postsCount ?? 0} />
          <StatCard label="Саммари" value={data?.summariesCount ?? 0} />
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-lg border p-6">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}
