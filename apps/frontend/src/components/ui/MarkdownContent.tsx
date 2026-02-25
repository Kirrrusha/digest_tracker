import ReactMarkdown, { type Components } from "react-markdown";

import { cn } from "@/lib/utils";

interface MarkdownContentProps {
  content: string;
  className?: string;
}

// Citation links look like [[1]](url) in markdown — link text is "[1]"
const CITATION_RE = /^\[(\d+)\]$/;

const markdownComponents: Components = {
  a({ href, children }) {
    const text = String(children);
    const match = text.match(CITATION_RE);
    if (match) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center align-super mx-px no-underline"
        >
          <span className="inline-flex items-center justify-center bg-blue-500/20 hover:bg-blue-500/35 text-blue-400 border border-blue-500/30 rounded px-1 py-px text-[10px] font-semibold leading-none min-w-[16px] transition-colors cursor-pointer">
            {match[1]}
          </span>
        </a>
      );
    }
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  },
};

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  return (
    <div className={cn("prose prose-sm max-w-none", className)}>
      <ReactMarkdown components={markdownComponents}>{content}</ReactMarkdown>
    </div>
  );
}
