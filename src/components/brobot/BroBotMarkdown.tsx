'use client';

import { memo, type ReactNode, useMemo } from 'react';

type Block =
  | { type: 'heading'; level: 2 | 3 | 4; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'blockquote'; text: string }
  | { type: 'code'; language: string; text: string }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'ul' | 'ol'; items: ListItem[] };

type ListItem = {
  text: string;
  children: ListItem[];
};

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

function splitTableRow(line: string) {
  return line
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function isTableDivider(line: string) {
  return /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(line);
}

function isTableStart(lines: string[], index: number) {
  return Boolean(lines[index]?.includes('|') && lines[index + 1] && isTableDivider(lines[index + 1]));
}

function appendListItem(items: ListItem[], text: string, depth: number) {
  if (depth <= 0 || items.length === 0) {
    items.push({ text, children: [] });
    return;
  }

  appendListItem(items[items.length - 1].children, text, depth - 1);
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
  let list: { type: 'ul' | 'ol'; items: ListItem[] } | null = null;

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

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    const codeFence = /^```(\w+)?\s*$/.exec(line);
    if (codeFence) {
      flushParagraph();
      flushList();
      const codeLines: string[] = [];
      index += 1;
      while (index < lines.length && !/^```\s*$/.test(lines[index].trim())) {
        codeLines.push(lines[index]);
        index += 1;
      }
      blocks.push({
        type: 'code',
        language: codeFence[1] ?? '',
        text: codeLines.join('\n'),
      });
      continue;
    }

    if (isTableStart(lines, index)) {
      flushParagraph();
      flushList();
      const headers = splitTableRow(lines[index]);
      index += 2;
      const rows: string[][] = [];
      while (index < lines.length && lines[index].trim().includes('|')) {
        rows.push(splitTableRow(lines[index]));
        index += 1;
      }
      index -= 1;
      blocks.push({ type: 'table', headers, rows });
      continue;
    }

    const heading = /^(#{2,4})\s+(.+)$/.exec(line);
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push({
        type: 'heading',
        level: heading[1].length as 2 | 3 | 4,
        text: heading[2].trim(),
      });
      continue;
    }

    if (line.startsWith('>')) {
      flushParagraph();
      flushList();
      blocks.push({
        type: 'blockquote',
        text: line.replace(/^>\s?/, '').trim(),
      });
      continue;
    }

    const unordered = /^(\s*)[-*]\s+(.+)$/.exec(rawLine);
    if (unordered) {
      flushParagraph();
      if (!list || list.type !== 'ul') {
        flushList();
        list = { type: 'ul', items: [] };
      }
      appendListItem(list.items, unordered[2].trim(), Math.floor(unordered[1].length / 2));
      continue;
    }

    const ordered = /^(\s*)\d+[.)]\s+(.+)$/.exec(rawLine);
    if (ordered) {
      flushParagraph();
      if (!list || list.type !== 'ol') {
        flushList();
        list = { type: 'ol', items: [] };
      }
      appendListItem(list.items, ordered[2].trim(), Math.floor(ordered[1].length / 2));
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
        <strong key={`${match.index}-strong`} className="font-semibold text-slate-950">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('`')) {
      nodes.push(
        <code
          key={`${match.index}-code`}
          className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[0.85em] font-medium text-slate-800"
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
            className="font-semibold text-teal-700 underline decoration-teal-200 underline-offset-2 hover:text-teal-900"
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

function RenderList({
  type,
  items,
  nested = false,
}: {
  type: 'ul' | 'ol';
  items: ListItem[];
  nested?: boolean;
}) {
  const ListTag = type;
  return (
    <ListTag
      className={`${type === 'ol' ? 'list-decimal' : 'list-disc'} ${nested ? 'mt-2 space-y-1.5 pl-5' : 'space-y-2 pl-5'}`}
    >
      {items.map((item, index) => (
        <li key={`${item.text}-${index}`} className="pl-1">
          <span>{renderInline(item.text)}</span>
          {item.children.length > 0 && (
            <RenderList type="ul" items={item.children} nested />
          )}
        </li>
      ))}
    </ListTag>
  );
}

function BroBotMarkdown({ children }: { children: string }) {
  const blocks = useMemo(() => parseBlocks(children), [children]);

  return (
    <div className="space-y-4 text-[15px] leading-7 text-slate-700">
      {blocks.map((block, index) => {
        if (block.type === 'heading') {
          const HeadingTag = block.level === 2 ? 'h2' : block.level === 3 ? 'h3' : 'h4';
          return (
            <HeadingTag
              key={`${block.type}-${index}`}
              className="pt-1 text-sm font-extrabold leading-6 text-slate-950"
            >
              {renderInline(block.text)}
            </HeadingTag>
          );
        }

        if (block.type === 'ul' || block.type === 'ol') {
          return <RenderList key={`${block.type}-${index}`} type={block.type} items={block.items} />;
        }

        if (block.type === 'blockquote') {
          return (
            <blockquote
              key={`${block.type}-${index}`}
              className="rounded-xl border border-amber-100 bg-amber-50/70 px-4 py-3 text-sm leading-6 text-amber-950"
            >
              {renderInline(block.text)}
            </blockquote>
          );
        }

        if (block.type === 'code') {
          return (
            <pre
              key={`${block.type}-${index}`}
              className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-950 p-4 text-xs leading-6 text-slate-100"
            >
              {block.language && (
                <span className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  {block.language}
                </span>
              )}
              <code>{block.text}</code>
            </pre>
          );
        }

        if (block.type === 'table') {
          return (
            <div
              key={`${block.type}-${index}`}
              className="overflow-x-auto rounded-xl border border-slate-200"
            >
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                  <tr>
                    {block.headers.map((header, headerIndex) => (
                      <th key={`${header}-${headerIndex}`} className="px-3 py-2">
                        {renderInline(header)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {block.rows.map((row, rowIndex) => (
                    <tr key={`row-${rowIndex}`}>
                      {block.headers.map((_, cellIndex) => (
                        <td key={`cell-${cellIndex}`} className="px-3 py-2 align-top">
                          {renderInline(row[cellIndex] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        if (block.type === 'paragraph') {
          return (
            <p key={`${block.type}-${index}`} className="max-w-none">
              {renderInline(block.text)}
            </p>
          );
        }

        return null;
      })}
    </div>
  );
}

export default memo(BroBotMarkdown);
