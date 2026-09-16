'use client';

import { createElement, useEffect, useMemo, useState, type ReactNode } from 'react';
import { renderCloze, type AnkiReference } from '@/lib/brobot/chat/anki-references';

const BLOCKED = new Set(['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'svg', 'math']);
const ALLOWED = new Set(['p', 'div', 'span', 'b', 'strong', 'i', 'em', 'u', 'br', 'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'hr', 'a', 'img']);

const CLASS: Record<string, string> = {
  p: 'my-2',
  div: 'my-1',
  b: 'font-bold',
  strong: 'font-bold',
  i: 'italic',
  em: 'italic',
  u: 'underline underline-offset-2',
  ul: 'my-2 list-disc pl-5',
  ol: 'my-2 list-decimal pl-5',
  li: 'my-1',
  table: 'my-3 w-full border-collapse text-sm',
  th: 'border border-slate-200 bg-slate-50 p-2 text-left',
  td: 'border border-slate-200 p-2 align-top',
  blockquote: 'my-3 border-l-4 border-sky-200 pl-3 text-slate-700',
  h1: 'my-3 text-xl font-bold',
  h2: 'my-3 text-lg font-bold',
  h3: 'my-2 font-bold',
  h4: 'my-2 font-semibold',
};

export default function RichAnkiField({
  html,
  fallback,
  targetCloze,
  revealed,
  images,
}: {
  html: string;
  fallback: string;
  targetCloze: number | null;
  revealed: boolean;
  images: AnkiReference['images'];
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const rendered = useMemo(() => {
    if (!mounted || !html || typeof DOMParser === 'undefined') return null;
    if (targetCloze !== null && /\{\{c\d+::(?:(?!\}\})[\s\S])*</i.test(html)) return null;
    const document = new DOMParser().parseFromString(html, 'text/html');
    const imageByName = new Map(images.map((image) => [image.filename, image]));
    function convert(node: Node, key: string): ReactNode {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent ?? '';
        return targetCloze === null ? text : renderCloze(text, targetCloze, revealed);
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return null;
      const element = node as Element;
      const tag = element.tagName.toLowerCase();
      if (BLOCKED.has(tag)) return null;
      if (tag === 'img') {
        const filename = (element.getAttribute('src') ?? '').split(/[?#]/)[0].split(/[/\\]/).pop() ?? '';
        const image = imageByName.get(filename);
        if (!image) return <span key={key} className="text-xs text-slate-500">Image unavailable</span>;
        // eslint-disable-next-line @next/next/no-img-element
        return <img key={key} src={image.url} alt={element.getAttribute('alt') || image.alt}
          className="my-3 max-h-80 max-w-full rounded-lg border border-slate-200 object-contain" />;
      }
      const children = [...element.childNodes].map((child, index) => convert(child, `${key}-${index}`));
      if (!ALLOWED.has(tag)) return <span key={key}>{children}</span>;
      if (tag === 'a') {
        const href = element.getAttribute('href') ?? '';
        if (!/^https:\/\//i.test(href)) return <span key={key}>{children}</span>;
        return <a key={key} href={href} target="_blank" rel="noopener noreferrer"
          className="font-semibold text-sky-700 underline underline-offset-2">{children}</a>;
      }
      return createElement(tag, { key, className: CLASS[tag] }, ...children);
    }
    return [...document.body.childNodes].map((node, index) => convert(node, String(index)));
  }, [mounted, html, targetCloze, revealed, images]);
  return <div className="break-words leading-relaxed">{rendered ?? (
    <span className="whitespace-pre-wrap">{targetCloze === null ? fallback : renderCloze(fallback, targetCloze, revealed)}</span>
  )}</div>;
}
