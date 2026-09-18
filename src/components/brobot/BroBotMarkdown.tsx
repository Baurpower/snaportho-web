'use client';

import { memo, type ReactNode, useMemo } from 'react';
import type { AnkiReference } from '@/lib/brobot/chat/anki-references';
import { parseAnkiBlocks, claimsForText, type ListItem } from '@/lib/brobot/chat/anki-claims';

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
  path,
  references = [],
  onOpenAnkiReference,
}: {
  type: 'ul' | 'ol';
  items: ListItem[];
  nested?: boolean;
  path: string;
  references?: AnkiReference[];
  onOpenAnkiReference?: (id: string) => void;
}) {
  const ListTag = type;
  return (
    <ListTag
      className={`${type === 'ol' ? 'list-decimal' : 'list-disc'} ${nested ? 'mt-2 space-y-1.5 pl-5' : 'space-y-1.5 pl-5'}`}
    >
      {items.map((item, index) => (
        <li key={`${item.text}-${index}`} className="pl-1">
          <span>{renderInlineWithReference(item.text, `${path}:${index}`, references, onOpenAnkiReference)}</span>
          {item.children.length > 0 && (
            <RenderList type="ul" items={item.children} path={`${path}:${index}:child`} nested references={references} onOpenAnkiReference={onOpenAnkiReference} />
          )}
        </li>
      ))}
    </ListTag>
  );
}

function referenceMarker(reference: AnkiReference, onOpen?: (id: string) => void) {
  if (!onOpen) return null;
  return <button type="button" onClick={() => onOpen(reference.id)}
    className="ml-1 inline rounded-md bg-sky-50 px-1.5 py-0.5 align-baseline text-xs font-bold text-sky-800 hover:bg-sky-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
    aria-label={`Open Anki card ${reference.number} for this fact`}>
    Anki {reference.number}
  </button>;
}

function renderInlineWithReference(text: string, path: string, references: AnkiReference[], onOpen?: (id: string) => void): ReactNode {
  const placements = claimsForText(text, path)
    .map((claim) => ({ claim, reference: references.find((item) => item.claimId === claim.id) }))
    .filter((item): item is { claim: ReturnType<typeof claimsForText>[number]; reference: AnkiReference } => Boolean(item.reference));
  if (!placements.length) return renderInline(text);
  const output: ReactNode[] = [];
  let cursor = 0;
  for (const { reference, claim } of placements) {
    output.push(<span key={`text-${cursor}`}>{renderInline(text.slice(cursor, claim.end))}</span>);
    output.push(<span key={`ref-${reference.id}`}>{referenceMarker(reference, onOpen)}</span>);
    cursor = claim.end;
  }
  output.push(<span key="tail">{renderInline(text.slice(cursor))}</span>);
  return output;
}

function BroBotMarkdown({ children, references = [], onOpenAnkiReference }: {
  children: string;
  references?: AnkiReference[];
  onOpenAnkiReference?: (id: string) => void;
}) {
  const blocks = useMemo(() => parseAnkiBlocks(children), [children]);

  return (
    <div className="space-y-3 text-[15px] leading-6 text-slate-700 sm:space-y-4 sm:leading-7">
      {blocks.map((block, index) => {
        if (block.type === 'heading') {
          const HeadingTag = block.level === 2 ? 'h2' : block.level === 3 ? 'h3' : 'h4';
          return (
            <HeadingTag
              key={`${block.type}-${index}`}
              className="pt-0.5 text-sm font-extrabold leading-6 text-slate-950"
            >
              {renderInline(block.text)}
            </HeadingTag>
          );
        }

        if (block.type === 'ul' || block.type === 'ol') {
          return <RenderList key={`${block.type}-${index}`} type={block.type} items={block.items} path={String(index)} references={references} onOpenAnkiReference={onOpenAnkiReference} />;
        }

        if (block.type === 'blockquote') {
          return (
            <blockquote
              key={`${block.type}-${index}`}
              className="rounded-xl border border-amber-100 bg-amber-50/70 px-3 py-2.5 text-sm leading-6 text-amber-950"
            >
              {renderInlineWithReference(block.text, String(index), references, onOpenAnkiReference)}
            </blockquote>
          );
        }

        if (block.type === 'code') {
          return (
            <pre
              key={`${block.type}-${index}`}
              className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-950 p-3 text-xs leading-6 text-slate-100"
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
                      <th key={`${header}-${headerIndex}`} className="px-2.5 py-2">
                        {renderInline(header)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {block.rows.map((row, rowIndex) => (
                    <tr key={`row-${rowIndex}`}>
                      {block.headers.map((_, cellIndex) => (
                        <td key={`cell-${cellIndex}`} className="max-w-full px-2.5 py-2 align-top">
                          {renderInlineWithReference(row[cellIndex] ?? '', `${index}:row:${rowIndex}:cell:${cellIndex}`, references, onOpenAnkiReference)}
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
              {renderInlineWithReference(block.text, String(index), references, onOpenAnkiReference)}
            </p>
          );
        }

        return null;
      })}
    </div>
  );
}

export default memo(BroBotMarkdown);
