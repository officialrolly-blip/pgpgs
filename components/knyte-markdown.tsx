"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";

type Block =
  | { type: "p"; text: string }
  | { type: "h"; level: 1 | 2 | 3 | 4; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "quote"; text: string }
  | { type: "code"; text: string; language?: string }
  | { type: "img"; src: string; alt: string }
  | { type: "spacer" };

function renderInline(text: string): ReactNode {
  const parts: ReactNode[] = [];
  const pattern =
    /!\[[^\]]*\]\([^)]+\)|\*\*[^*]+\*\*|`[^`]+`|~~[^~]+~~|\[[^\]]+\]\([^)]+\)/g;
  let lastIndex = 0;
  let key = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    const tokenIndex = key++;

    if (token.startsWith("![")) {
      const image = token.match(/!\[([^\]]*)\]\(([^)]+)\)/);
      parts.push(
        // eslint-disable-next-line @next/next/no-img-element -- dynamic AI-generated image URLs
        <img
          key={tokenIndex}
          src={image?.[2] ?? ""}
          alt={image?.[1] ?? "image"}
          className="my-3 max-w-full rounded-xl border border-white/10 shadow-md"
          loading="lazy"
        />,
      );
    } else if (token.startsWith("**")) {
      parts.push(
        <strong key={tokenIndex} className="font-semibold text-inherit">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("`")) {
      parts.push(
        <code
          key={tokenIndex}
          className="rounded-md border border-[var(--gold)]/20 bg-[var(--gold)]/10 px-1.5 py-0.5 font-mono text-[0.88em] font-medium text-[var(--gold-light)]"
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("~~")) {
      parts.push(
        <del key={tokenIndex} className="opacity-60">
          {token.slice(2, -2)}
        </del>,
      );
    } else if (token.startsWith("[")) {
      const link = token.match(/\[([^\]]+)\]\(([^)\s]+)\)/);
      parts.push(
        <a
          key={tokenIndex}
          href={link?.[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-[var(--gold-light)] underline decoration-[var(--gold)]/50 underline-offset-2 transition-colors hover:text-white hover:decoration-[var(--gold)]"
        >
          {link?.[1] ?? token}
        </a>,
      );
    } else {
      parts.push(token);
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

function parseBlocks(content: string): Block[] {
  const lines = content.split(/\r?\n/);
  const blocks: Block[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let codeLines: string[] | null = null;
  let codeLang: string | undefined = undefined;

  const flushList = () => {
    if (list) {
      blocks.push(
        list.ordered ? { type: "ol", items: list.items } : { type: "ul", items: list.items },
      );
      list = null;
    }
  };

  const flushCode = () => {
    if (codeLines) {
      blocks.push({ type: "code", text: codeLines.join("\n"), language: codeLang });
      codeLines = null;
      codeLang = undefined;
    }
  };

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    if (codeLines !== null) {
      if (/^```/.test(trimmed)) {
        flushCode();
      } else {
        codeLines.push(rawLine);
      }
      continue;
    }

    if (/^```/.test(trimmed)) {
      flushList();
      codeLines = [];
      const match = trimmed.match(/^```(\w+)?/);
      codeLang = match?.[1] || undefined;
      continue;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flushList();
      const level = Math.min(heading[1].length, 4) as 1 | 2 | 3 | 4;
      blocks.push({ type: "h", level, text: heading[2] });
      continue;
    }

    const imageLine = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imageLine) {
      flushList();
      blocks.push({ type: "img", src: imageLine[2], alt: imageLine[1] || "image" });
      continue;
    }

    if (trimmed.startsWith(">")) {
      flushList();
      blocks.push({ type: "quote", text: trimmed.replace(/^>\s?/, "") });
      continue;
    }

    const unordered = trimmed.match(/^[-*]\s+(.*)$/);
    if (unordered) {
      if (!list || list.ordered) {
        flushList();
        list = { ordered: false, items: [] };
      }
      list.items.push(unordered[1]);
      continue;
    }

    const ordered = trimmed.match(/^\d+[.)]\s+(.*)$/);
    if (ordered) {
      if (!list || !list.ordered) {
        flushList();
        list = { ordered: true, items: [] };
      }
      list.items.push(ordered[1]);
      continue;
    }

    flushList();

    if (trimmed.length === 0) {
      blocks.push({ type: "spacer" });
    } else {
      blocks.push({ type: "p", text: rawLine });
    }
  }

  flushList();
  flushCode();

  return blocks;
}

function CodeBlockView({ text, language }: { text: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback if clipboard fails
    }
  };

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-emerald-500/20 bg-[#06120b] shadow-lg">
      <div className="flex items-center justify-between border-b border-emerald-950/60 bg-[#08170f] px-3.5 py-1.5 text-xs text-emerald-300/70">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
          {language && (
            <span className="ml-2 font-mono uppercase tracking-wider text-emerald-400/80 text-[10px]">
              {language}
            </span>
          )}
        </div>
        <button
          onClick={handleCopy}
          type="button"
          className="flex items-center gap-1.5 rounded px-2 py-1 text-[11px] font-medium text-emerald-200/80 transition hover:bg-emerald-900/40 hover:text-white"
        >
          {copied ? (
            <>
              <svg className="h-3.5 w-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-emerald-300">Copied!</span>
            </>
          ) : (
            <>
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
              </svg>
              <span>Copy code</span>
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed text-emerald-100/90">
        <code>{text}</code>
      </pre>
    </div>
  );
}

function renderBlock(block: Block, index: number): ReactNode {
  switch (block.type) {
    case "p":
      return (
        <p key={index} className="my-1.5 leading-relaxed text-inherit">
          {renderInline(block.text)}
        </p>
      );
    case "h":
      if (block.level === 1) {
        return (
          <h1
            key={index}
            className="mt-3 mb-2 flex items-center gap-2 text-lg font-bold tracking-tight text-[var(--gold)]"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--gold)]" />
            {renderInline(block.text)}
          </h1>
        );
      }
      if (block.level === 2) {
        return (
          <h2
            key={index}
            className="mt-2.5 mb-1.5 flex items-center gap-2 text-base font-bold tracking-tight text-[var(--gold)]"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--gold)]/80" />
            {renderInline(block.text)}
          </h2>
        );
      }
      if (block.level === 3) {
        return (
          <h3
            key={index}
            className="mt-2 mb-1 text-sm font-semibold text-emerald-200"
          >
            {renderInline(block.text)}
          </h3>
        );
      }
      return (
        <h4
          key={index}
          className="mt-1.5 mb-1 text-sm font-medium text-emerald-200/90"
        >
          {renderInline(block.text)}
        </h4>
      );
    case "ul":
      return (
        <ul key={index} className="my-2 list-disc space-y-1 pl-5 marker:text-[var(--gold)]">
          {block.items.map((item, itemIndex) => (
            <li key={itemIndex} className="leading-relaxed">
              {renderInline(item)}
            </li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol key={index} className="my-2 list-decimal space-y-1 pl-5 marker:font-semibold marker:text-[var(--gold)]">
          {block.items.map((item, itemIndex) => (
            <li key={itemIndex} className="leading-relaxed">
              {renderInline(item)}
            </li>
          ))}
        </ol>
      );
    case "quote":
      return (
        <blockquote
          key={index}
          className="my-2.5 rounded-r-xl border-l-[3px] border-[var(--gold)] bg-[var(--gold)]/5 py-2 pl-4 pr-3 text-sm italic text-amber-100/90 shadow-sm"
        >
          {renderInline(block.text)}
        </blockquote>
      );
    case "code":
      return <CodeBlockView key={index} text={block.text} language={block.language} />;
    case "img":
      return (
        // eslint-disable-next-line @next/next/no-img-element -- dynamic AI-generated image URLs
        <img
          key={index}
          src={block.src}
          alt={block.alt}
          className="my-3 max-w-full rounded-xl border border-white/10 shadow-lg"
          loading="lazy"
        />
      );
    case "spacer":
      return <div key={index} className="h-2" />;
  }
}

export default function KnyteMarkdown({ content }: { content: string }) {
  const blocks = useMemo(() => parseBlocks(content), [content]);
  return <div className="w-full text-left">{blocks.map(renderBlock)}</div>;
}