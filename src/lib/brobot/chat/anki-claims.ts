export type Block =
  | { type: 'heading'; level: 2 | 3 | 4; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'blockquote'; text: string }
  | { type: 'code'; language: string; text: string }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'ul' | 'ol'; items: ListItem[] };

export type ListItem = {
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

export function parseAnkiBlocks(markdown: string): Block[] {
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


export type AnkiClaim = { id: string; text: string; start: number; end: number };

export function claimsForText(text: string, path: string): AnkiClaim[] {
  const claims: AnkiClaim[] = [];
  const boundary = /[.!?]\s+(?=(?:\*\*)?[A-Z])/g;
  let start = 0;
  let match: RegExpExecArray | null;
  const add = (end: number) => {
    const raw = text.slice(start, end);
    const leading = raw.length - raw.trimStart().length;
    const trailing = raw.length - raw.trimEnd().length;
    const claimStart = start + leading;
    const claimEnd = end - trailing;
    const value = text.slice(claimStart, claimEnd);
    if (value.replace(/\*\*|`|\[|\]/g, '').length >= 25 && value.length <= 600) {
      claims.push({ id: `${path}:${claims.length}`, text: value, start: claimStart, end: claimEnd });
    }
  };
  while ((match = boundary.exec(text)) !== null) {
    add(match.index + 1);
    start = match.index + match[0].length;
  }
  add(text.length);
  return claims;
}

export function answerClaims(answer: string): AnkiClaim[] {
  const blocks = parseAnkiBlocks(answer);
  const claims: AnkiClaim[] = [];
  const visit = (items: ListItem[], path: string) => {
    items.forEach((item, index) => {
      claims.push(...claimsForText(item.text, `${path}:${index}`));
      visit(item.children, `${path}:${index}:child`);
    });
  };
  blocks.forEach((block, index) => {
    const path = String(index);
    if (block.type === 'paragraph' || block.type === 'blockquote') claims.push(...claimsForText(block.text, path));
    else if (block.type === 'ul' || block.type === 'ol') visit(block.items, path);
    else if (block.type === 'table') block.rows.forEach((row, rowIndex) =>
      row.forEach((cell, cellIndex) => claims.push(...claimsForText(cell, `${path}:row:${rowIndex}:cell:${cellIndex}`))));
  });
  return claims;
}
