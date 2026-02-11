import { Cloud, Code, FileCode, Server, TrendingDown, TrendingUp } from "lucide-react";

import { cn } from "@/lib/utils";

interface TopicStatsCardProps {
  topic: string;
  count: number;
  trend?: number;
  color: "blue" | "green" | "purple" | "orange";
}

const colorClasses = {
  blue: "bg-blue-500",
  green: "bg-green-500",
  purple: "bg-purple-500",
  orange: "bg-orange-500",
};

const iconMap: Record<string, React.ElementType> = {
  React: Code,
  "Node.js": Server,
  TypeScript: FileCode,
  DevOps: Cloud,
};

export function TopicStatsCard({ topic, count, trend, color }: TopicStatsCardProps) {
  const Icon = iconMap[topic] || Code;

  return (
    <div
      className={cn(
        "rounded-xl p-5 text-white transition-transform hover:scale-[1.02]",
        colorClasses[color]
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
          <Icon size={20} />
        </div>
        {trend !== undefined && (
          <div className="flex items-center gap-1 text-sm bg-white/20 rounded-full px-2 py-0.5">
            {trend > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span>
              {trend > 0 ? "+" : ""}
              {trend}
            </span>
          </div>
        )}
      </div>
      <p className="text-sm opacity-90 mb-1">{topic}</p>
      <p className="text-3xl font-bold">{count}</p>
      <p className="text-xs opacity-75 mt-1">постов сегодня</p>
    </div>
  );
}

interface TopicStatsGridProps {
  topics: {
    name: string;
    count: number;
    trend?: number;
    color: "blue" | "green" | "purple" | "orange";
  }[];
}

export function TopicStatsGrid({ topics }: TopicStatsGridProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Статистика по темам</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {topics.map((topic) => (
          <TopicStatsCard
            key={topic.name}
            topic={topic.name}
            count={topic.count}
            trend={topic.trend}
            color={topic.color}
          />
        ))}
      </div>
    </div>
  );
}
