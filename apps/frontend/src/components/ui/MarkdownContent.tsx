import ReactMarkdown from "react-markdown";

import { cn } from "@/lib/utils";

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  return (
    <div
      className={cn(
        "prose prose-sm dark:prose-invert max-w-none prose-headings:text-white prose-p:text-slate-300 prose-li:text-slate-300 prose-strong:text-white",
        className
      )}
    >
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
