"use client";

import { FileText, Inbox, Rss, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const emptyStateIcons = {
  rss: Rss,
  "file-text": FileText,
  inbox: Inbox,
} as const;

export type EmptyStateIconName = keyof typeof emptyStateIcons;

interface EmptyStateProps {
  /** Icon component (client components only). Do not pass from Server Components. */
  icon?: LucideIcon;
  /** Icon by name (use from Server Components instead of passing icon component). */
  iconName?: EmptyStateIconName;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  children?: React.ReactNode;
}

export function EmptyState({
  icon,
  iconName,
  title,
  description,
  action,
  secondaryAction,
  className,
  children,
}: EmptyStateProps) {
  const Icon = iconName ? emptyStateIcons[iconName] : icon;
  if (!Icon) {
    throw new Error("EmptyState requires either icon or iconName");
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center h-[500px] text-center px-4",
        className
      )}
    >
      <div className="rounded-full bg-neutral-100 dark:bg-neutral-800 p-8 mb-6">
        <Icon className="w-16 h-16 text-neutral-400 dark:text-neutral-600" />
      </div>

      <h3 className="text-2xl font-semibold mb-2">{title}</h3>
      <p className="text-neutral-600 dark:text-neutral-400 mb-6 max-w-md">{description}</p>

      {children ? (
        children
      ) : (
        <div className="flex gap-3">
          {action && (
            <Button size="lg" onClick={action.onClick}>
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="outline" size="lg" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
