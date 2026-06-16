'use client';

import type { ReactNode } from 'react';

type Block =
  | { type: 'heading'; level: 2 | 3; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] };

function stripFence(raw: string) {
  return raw
    .trim()
    .replace(/^```(?:markdown|md)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function looksLikeJson(raw: string) {
  const trimmed = raw.trim();
  return (
    /^[{[]/.test(trimmed) ||
    /"answer"\s*:/.test(trimmed) ||
    /"priorityPoints"\s*:/.test(trimmed)
  );
}

function parseBlocks(markdown: string): Block[] {
  const cleaned = stripFence(markdown);
  if (!cleaned || looksLikeJson(cleaned)) {
    return [
      {
        type: 'paragraph',
        text: 'BroBot generated a response, but it could not be rendered cleanly. Please try again or rephrase your question.',
      },
    ];
  }

  const blocks: Block[] = [];
  const lines = cleaned.split(/\r?\n/);
  let paragraph: string[] = [];
  let list: { type: 'ul' | 'ol'; items: string[] } | null = null;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push({ type: 'paragraph', text: paragraph.join(' ').trim() });
    paragraph = [];
  };

  const flushList = () => {
    if (!list) return;
    blocks.push(list);
    list = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = /^(#{2,3})\s+(.+)$/.exec(line);
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push({
        type: 'heading',
        level: heading[1].length as 2 | 3,
        text: heading[2].trim(),
      });
      continue;
    }

    const unordered = /^[-*]\s+(.+)$/.exec(line);
    if (unordered) {
      flushParagraph();
      if (!list || list.type !== 'ul') {
        flushList();
        list = { type: 'ul', items: [] };
      }
      list.items.push(unordered[1].trim());
      continue;
    }

    const ordered = /^\d+[.)]\s+(.+)$/.exec(line);
    if (ordered) {
      flushParagraph();
      if (!list || list.type !== 'ol') {
        flushList();
        list = { type: 'ol', items: [] };
      }
      list.items.push(ordered[1].trim());
      continue;
    }

    flushList();
    paragraph.push(line);
  }

  flushParagraph();
  flushList();

  return blocks;
}

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^)\s]+\))/g;
  let index = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > index) {
      nodes.push(text.slice(index, match.index));
    }

    const token = match[0];
    if (token.startsWith('**')) {
      nodes.push(
        <strong key={`${match.index}-strong`} className="font-semibold text-slate-900">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('`')) {
      nodes.push(
        <code
          key={`${match.index}-code`}
          className="rounded bg-slate-100 px-1.5 py-0.5 text-[0.85em] text-slate-800"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else {
      const link = /^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/.exec(token);
      if (link) {
        nodes.push(
          <a
            key={`${match.index}-link`}
            href={link[2]}
            target="_blank"
            rel="noreferrer noopener"
            className="font-medium text-teal-700 underline decoration-teal-200 underline-offset-2 hover:text-teal-900"
          >
            {link[1]}
          </a>
        );
      }
    }

    index = match.index + token.length;
  }

  if (index < text.length) {
    nodes.push(text.slice(index));
  }

  return nodes;
}

export default function BroBotMarkdown({ children }: { children: string }) {
  const blocks = parseBlocks(children);

  return (
    <div className="space-y-2 text-sm leading-6 text-slate-700">
      {blocks.map((block, index) => {
        if (block.type === 'heading') {
          return (
            <h4
              key={`${block.type}-${index}`}
              className="pt-0.5 text-xs font-bold uppercase tracking-wide text-slate-500"
            >
              {renderInline(block.text)}
            </h4>
          );
        }

        if (block.type === 'ul') {
          return (
            <ul key={`${block.type}-${index}`} className="list-disc space-y-1 pl-5">
              {block.items.map((item) => (
                <li key={item} className="pl-0.5">
                  {renderInline(item)}
                </li>
              ))}
            </ul>
          );
        }

        if (block.type === 'ol') {
          return (
            <ol key={`${block.type}-${index}`} className="list-decimal space-y-1 pl-5">
              {block.items.map((item) => (
                <li key={item} className="pl-0.5">
                  {renderInline(item)}
                </li>
              ))}
            </ol>
          );
        }

        return (
          <p key={`${block.type}-${index}`} className="max-w-none">
            {renderInline(block.text)}
          </p>
        );
      })}
    </div>
  );
}
