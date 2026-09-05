"use client";

import { useMemo } from "react";
import type { ReactNode } from "react";

type Block =
  | { type: "p"; text: string }
  | { type: "h"; level: 1 | 2 | 3 | 4; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "quote"; text: string }
  | { type: "code"; text: string }
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
          className="my-2 max-w-full rounded-lg"
          loading="lazy"
        />,
      );
    } else if (token.startsWith("**")) {
      parts.push(<strong key={tokenIndex}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("`")) {
      parts.push(
        <code key={tokenIndex} className="rounded bg-gray-100 px-1.5 py-0.5 text-[0.9em]">
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("~~")) {
      parts.push(<del key={tokenIndex}>{token.slice(2, -2)}</del>);
    } else if (token.startsWith("[")) {
      const link = token.match(/\[([^\]]+)\]\(([^)\s]+)\)/);
      parts.push(
        <a
          key={tokenIndex}
          href={link?.[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--green)] underline"
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
      blocks.push({ type: "code", text: codeLines.join("\n") });
      codeLines = null;
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

function renderBlock(block: Block, index: number): ReactNode {
  switch (block.type) {
    case "p":
      return <p key={index}>{renderInline(block.text)}</p>;
    case "h":
      if (block.level === 1) {
        return (
          <h1 key={index} className="mt-1 mb-1 text-base font-bold text-gray-900">
            {renderInline(block.text)}
          </h1>
        );
      }
      if (block.level === 2) {
        return (
          <h2 key={index} className="mt-1 mb-1 text-base font-bold text-gray-900">
            {renderInline(block.text)}
          </h2>
        );
      }
      if (block.level === 3) {
        return (
          <h3 key={index} className="mt-1 mb-0.5 text-sm font-bold text-gray-900">
            {renderInline(block.text)}
          </h3>
        );
      }
      return (
        <h4 key={index} className="mt-1 mb-0.5 text-sm font-bold text-gray-900">
          {renderInline(block.text)}
        </h4>
      );
    case "ul":
      return (
        <ul key={index} className="list-disc space-y-1 pl-5">
          {block.items.map((item, itemIndex) => (
            <li key={itemIndex}>{renderInline(item)}</li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol key={index} className="list-decimal space-y-1 pl-5">
          {block.items.map((item, itemIndex) => (
            <li key={itemIndex}>{renderInline(item)}</li>
          ))}
        </ol>
      );
    case "quote":
      return (
        <blockquote
          key={index}
          className="border-l-4 border-gray-300 pl-3 italic text-gray-600"
        >
          {renderInline(block.text)}
        </blockquote>
      );
    case "code":
      return (
        <pre
          key={index}
          className="my-1 flex-1 overflow-x-auto rounded-lg bg-gray-100 px-3 py-2 text-[13px] leading-relaxed"
        >
          <code>{block.text}</code>
        </pre>
      );
    case "img":
      return (
        // eslint-disable-next-line @next/next/no-img-element -- dynamic AI-generated image URLs
        <img
          key={index}
          src={block.src}
          alt={block.alt}
          className="my-2 max-w-full rounded-lg"
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