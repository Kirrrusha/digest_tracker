import ReactMarkdown from "react-markdown";

import { cn } from "@/lib/utils";

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  return (
    <div className={cn("prose prose-sm max-w-none", className)}>
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
