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

function normalizeMarkdown(content: string): string {
  // Normalize Windows line endings
  let s = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  // Fix AI pattern: "### **## Heading**" → "## Heading"
  s = s.replace(/^#{1,6}\s+\*+(#{1,6}\s+)(.*?)\*+\s*$/gm, "$1$2");
  // Fix AI pattern: "## **Heading**" → "## Heading" (bold wrapper around heading text)
  s = s.replace(/^(#{1,6})\s+\*+(.*?)\*+\s*$/gm, "$1 $2");
  // Ensure ATX headings are preceded by a blank line so remark parses them
  s = s.replace(/([^\n])\n(#{1,6} )/g, "$1\n\n$2");
  return s;
}

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  return (
    <div className={cn("prose prose-sm max-w-none", className)}>
      <ReactMarkdown components={markdownComponents}>{normalizeMarkdown(content)}</ReactMarkdown>
    </div>
  );
}
