"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { motion } from "framer-motion";
import "katex/dist/katex.min.css";

/**
 * The AI is instructed to use `$...$` / `$$...$$` for math (the only syntax
 * remark-math understands), but the model sometimes ignores that and writes
 * LaTeX's `\(...\)` / `\[...\]` instead. Left alone, CommonMark's own
 * backslash-escaping strips those backslashes before rendering, leaving bare
 * "(a)" text instead of math. Normalize both styles to `$`/`$$` up front so
 * formulas render correctly regardless of which delimiter the model used.
 */
function normalizeMathDelimiters(text: string): string {
  return text
    .replace(/\\\[([\s\S]+?)\\\]/g, (_match, inner: string) => `$$${inner}$$`)
    .replace(/\\\(([\s\S]+?)\\\)/g, (_match, inner: string) => `$${inner}$`);
}

/** Markdown + KaTeX renderer for AI messages (uses existing deps). */
export function AiMarkdown({ text }: { text: string }) {
  return (
    <div className="prose-zertte space-y-2 text-[15px] leading-relaxed [&_a]:text-primary [&_code]:rounded [&_code]:bg-surface-2 [&_code]:px-1 [&_h1]:text-lg [&_h1]:font-bold [&_h2]:text-base [&_h2]:font-bold [&_h3]:font-bold [&_li]:ml-4 [&_ol]:list-decimal [&_p]:my-1 [&_strong]:font-bold [&_ul]:list-disc">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
        {normalizeMathDelimiters(text)}
      </ReactMarkdown>
    </div>
  );
}

export function StreamingDots() {
  return (
    <span className="inline-flex items-center gap-1" aria-label="ИИ печатает">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="size-1.5 rounded-full bg-text-3"
          animate={{ y: [0, -3, 0], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.15 }}
        />
      ))}
    </span>
  );
}
