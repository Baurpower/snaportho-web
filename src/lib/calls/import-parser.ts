import * as XLSX from "xlsx";
import * as pdfParse from "pdf-parse";

export type NormalizedCallType = "Primary" | "Backup";

export type ParsedCallUploadRow = {
  tempId: string;
  sourceRow: number;
  residentName: string;
  callDate: string | null;
  callType: NormalizedCallType;
  site: string | null;
  isHomeCall: boolean;
  notes: string | null;
  errors: string[];
};

type HeaderMap = {
  date?: number;
  weekday?: number;
  resident?: number;
  primary?: number;
  backup?: number;
  callType?: number;
  site?: number;
  notes?: number;
  home?: number;
};

type DateContext = {
  year?: number;
  month?: number;
};

type AssignmentCandidate = {
  residentName: string;
  callType: NormalizedCallType;
};

const MONTH_INDEX: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

const WEEKDAY_WORDS = new Set([
  "sun",
  "sunday",
  "mon",
  "monday",
  "tue",
  "tues",
  "tuesday",
  "wed",
  "wednesday",
  "thu",
  "thur",
  "thurs",
  "thursday",
  "fri",
  "friday",
  "sat",
  "saturday",
]);

const HEADER_ALIASES = {
  date: ["date", "call date", "shift date", "scheduled date"],
  weekday: ["day", "dow", "weekday"],
  resident: [
    "resident",
    "name",
    "person",
    "coverage",
    "assigned to",
    "assigned resident",
    "resident name",
  ],
  primary: ["primary", "primary call", "primary resident", "p", "1st call"],
  backup: ["backup", "back up", "backup call", "backup resident", "b", "2nd call"],
  callType: ["type", "call type", "role", "assignment type"],
  site: ["site", "location", "hospital", "facility"],
  notes: ["notes", "comments", "comment", "details", "remark", "remarks"],
  home: ["home", "home call", "at home"],
};

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizeName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/,/g, "")
    .replace(/\b(dr|md|do|mr|mrs|ms|miss)\b\.?/gi, "")
    .replace(/\b(jr|sr|ii|iii|iv)\b\.?/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanResidentName(value: string): string {
  return value
    .replace(/\b(primary|backup|back up|call|home call|site|location|notes?)\b/gi, "")
    .replace(/[(){}\[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[-:;,/]+/, "")
    .replace(/[-:;,/]+$/, "")
    .trim();
}

function looksLikeWeekdayOnly(value: string): boolean {
  const normalized = normalizeHeader(value);
  return WEEKDAY_WORDS.has(normalized);
}

function normalizeCallType(value: unknown): NormalizedCallType | null {
  const text = String(value ?? "").trim().toLowerCase();
  if (!text) return null;

  if (
    text.includes("backup") ||
    text.includes("back up") ||
    /\b2nd\b/.test(text)
  ) {
    return "Backup";
  }

  if (text.includes("primary") || /\b1st\b/.test(text)) {
    return "Primary";
  }

  return null;
}

function parseBooleanLike(value: unknown): boolean {
  const text = String(value ?? "").trim().toLowerCase();
  return ["true", "yes", "y", "1", "home", "home call"].includes(text);
}

function formatYmd(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function isValidYmd(year: number, month: number, day: number): boolean {
  if (!year || !month || !day) return false;
  const d = new Date(year, month - 1, day);
  return (
    d.getFullYear() === year &&
    d.getMonth() === month - 1 &&
    d.getDate() === day
  );
}

function fromDateObject(date: Date): string | null {
  if (Number.isNaN(date.getTime())) return null;
  return formatYmd(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

function fromExcelSerial(value: number): string | null {
  const parsed = XLSX.SSF.parse_date_code(value);
  if (!parsed || !parsed.y || !parsed.m || !parsed.d) return null;
  if (!isValidYmd(parsed.y, parsed.m, parsed.d)) return null;
  return formatYmd(parsed.y, parsed.m, parsed.d);
}

function normalizeYear(year: number): number {
  if (year < 100) return year >= 70 ? 1900 + year : 2000 + year;
  return year;
}

function parseMonthNameToken(token: string): number | null {
  const cleaned = token.trim().toLowerCase().replace(/\./g, "");
  return MONTH_INDEX[cleaned] ?? null;
}

function parseDateFromText(raw: string, context?: DateContext): string | null {
  const text = raw.trim();
  if (!text) return null;

  if (looksLikeWeekdayOnly(text)) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  if (/^\d{8}$/.test(text)) {
    const year = Number(text.slice(0, 4));
    const month = Number(text.slice(4, 6));
    const day = Number(text.slice(6, 8));
    return isValidYmd(year, month, day) ? formatYmd(year, month, day) : null;
  }

  if (/^\d{5}(\.\d+)?$/.test(text)) {
    return fromExcelSerial(Number(text));
  }

  const ymdSlash = text.match(/^(\d{4})[/. -](\d{1,2})[/. -](\d{1,2})$/);
  if (ymdSlash) {
    const year = Number(ymdSlash[1]);
    const month = Number(ymdSlash[2]);
    const day = Number(ymdSlash[3]);
    return isValidYmd(year, month, day) ? formatYmd(year, month, day) : null;
  }

    const mdy = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (mdy) {
    const a = Number(mdy[1]);
    const b = Number(mdy[2]);
    const year = normalizeYear(Number(mdy[3]));

    let month = a;
    let day = b;

    if (a > 12 && b <= 12) {
      month = b;
      day = a;
    }

    return isValidYmd(year, month, day) ? formatYmd(year, month, day) : null;
  }

  const md = text.match(/^(\d{1,2})[/-](\d{1,2})$/);
  if (md && context?.year) {
    const a = Number(md[1]);
    const b = Number(md[2]);

    let month = a;
    let day = b;

    if (context.month && a === context.month) {
      month = a;
      day = b;
    } else if (context.month && b === context.month) {
      month = b;
      day = a;
    } else if (a > 12 && b <= 12) {
      month = b;
      day = a;
    }

    return isValidYmd(context.year, month, day)
      ? formatYmd(context.year, month, day)
      : null;
  }

  const monthNameFirst = text.match(
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{2,4}))?\b/i
  );
  if (monthNameFirst) {
    const month = parseMonthNameToken(monthNameFirst[1]);
    const day = Number(monthNameFirst[2]);
    const year = monthNameFirst[3]
      ? normalizeYear(Number(monthNameFirst[3]))
      : context?.year;
    if (month && year && isValidYmd(year, month, day)) {
      return formatYmd(year, month, day);
    }
  }

  const dayMonthName = text.match(
    /\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?(?:,?\s+(\d{2,4}))?\b/i
  );
  if (dayMonthName) {
    const day = Number(dayMonthName[1]);
    const month = parseMonthNameToken(dayMonthName[2]);
    const year = dayMonthName[3]
      ? normalizeYear(Number(dayMonthName[3]))
      : context?.year;
    if (month && year && isValidYmd(year, month, day)) {
      return formatYmd(year, month, day);
    }
  }

  const dayOnly = text.match(/^(\d{1,2})$/);
  if (dayOnly && context?.year && context?.month) {
    const day = Number(dayOnly[1]);
    if (isValidYmd(context.year, context.month, day)) {
      return formatYmd(context.year, context.month, day);
    }
  }

  const parsed = new Date(text);
  const native = fromDateObject(parsed);
  if (native) return native;

  return null;
}

function normalizeDate(value: unknown, context?: DateContext): string | null {
  if (value == null || value === "") return null;

  if (value instanceof Date) {
    return fromDateObject(value);
  }

  if (typeof value === "number") {
    return fromExcelSerial(value);
  }

  if (typeof value === "string") {
    return parseDateFromText(value, context);
  }

  if (typeof value === "object") {
    const tag = Object.prototype.toString.call(value);

    if (tag === "[object Date]") {
      return fromDateObject(value as Date);
    }

    const asString = String(value).trim();
    if (asString && asString !== "[object Object]") {
      return parseDateFromText(asString, context);
    }
  }

  return null;
}

function extractDateFromString(value: string, context?: DateContext): string | null {
  const candidates = [
    /\b\d{4}-\d{2}-\d{2}\b/,
    /\b\d{8}\b/,
    /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/,
    /\b\d{1,2}[/-]\d{1,2}\b/,
    /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{2,4})?\b/i,
    /\b\d{1,2}(?:st|nd|rd|th)?\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?(?:,?\s+\d{2,4})?\b/i,
  ];

  for (const pattern of candidates) {
    const match = value.match(pattern);
    if (match) {
      const parsed = normalizeDate(match[0], context);
      if (parsed) return parsed;
    }
  }

  return null;
}

function buildHeaderMap(row: unknown[]): HeaderMap {
  const map: HeaderMap = {};

  row.forEach((cell, index) => {
    const normalized = normalizeHeader(cell);

    for (const [key, aliases] of Object.entries(HEADER_ALIASES)) {
      if (aliases.includes(normalized) && map[key as keyof HeaderMap] === undefined) {
        map[key as keyof HeaderMap] = index;
      }
    }
  });

  return map;
}

function scoreHeaderMap(map: HeaderMap): number {
  let score = 0;
  if (map.date !== undefined) score += 4;
  if (map.weekday !== undefined) score += 1;
  if (map.resident !== undefined) score += 3;
  if (map.primary !== undefined) score += 3;
  if (map.backup !== undefined) score += 3;
  if (map.callType !== undefined) score += 2;
  if (map.site !== undefined) score += 1;
  if (map.notes !== undefined) score += 1;
  if (map.home !== undefined) score += 1;
  return score;
}

function findHeaderRow(
  matrix: unknown[][]
): { headerIndex: number; map: HeaderMap } | null {
  let best: { headerIndex: number; map: HeaderMap; score: number } | null = null;

  for (let i = 0; i < Math.min(matrix.length, 12); i += 1) {
    const row = matrix[i] ?? [];
    const map = buildHeaderMap(row);
    const score = scoreHeaderMap(map);

    if (!best || score > best.score) {
      best = { headerIndex: i, map, score };
    }
  }

  if (!best || best.score < 3) return null;
  return { headerIndex: best.headerIndex, map: best.map };
}

function inferDateContext(matrix: unknown[][]): DateContext {
  const monthCounts = new Map<number, number>();
  const yearCounts = new Map<number, number>();

  const bump = (map: Map<number, number>, key: number) => {
    map.set(key, (map.get(key) ?? 0) + 1);
  };

  for (let r = 0; r < Math.min(matrix.length, 20); r += 1) {
    const row = matrix[r] ?? [];
    for (let c = 0; c < Math.min(row.length, 12); c += 1) {
      const cell = String(row[c] ?? "").trim();
      if (!cell) continue;

      const monthYear = cell.match(
        /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?[\s,-]+(\d{2,4})\b/i
      );
      if (monthYear) {
        const month = parseMonthNameToken(monthYear[1]);
        const year = normalizeYear(Number(monthYear[2]));
        if (month) bump(monthCounts, month);
        if (year) bump(yearCounts, year);
      }

      const parsed = normalizeDate(cell);
      if (parsed) {
        const [y, m] = parsed.split("-").map(Number);
        bump(yearCounts, y);
        bump(monthCounts, m);
      }
    }
  }

  const bestMonth = [...monthCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const bestYear = [...yearCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

  return {
    month: bestMonth,
    year: bestYear,
  };
}

function pushRow(
  rows: ParsedCallUploadRow[],
  partial: Omit<ParsedCallUploadRow, "tempId" | "errors"> & { errors?: string[] }
) {
  rows.push({
    tempId: crypto.randomUUID(),
    errors: partial.errors ?? [],
    ...partial,
  });
}

function isLikelyName(value: string): boolean {
  const cleaned = cleanResidentName(value);
  if (!cleaned) return false;
  if (cleaned.length < 2) return false;
  if (looksLikeWeekdayOnly(cleaned)) return false;
  if (normalizeDate(cleaned)) return false;

  const lowered = cleaned.toLowerCase();

  if (
    /\b(primary|backup|site|location|hospital|note|notes|home call|summary|rules?)\b/.test(
      lowered
    )
  ) {
    return false;
  }

  if (/^[—–-]+$/.test(cleaned)) return false;

  return /[a-z]/i.test(cleaned);
}

function parseAssignmentsFromText(
  text: string,
  defaultType: NormalizedCallType | null = null
): AssignmentCandidate[] {
  const normalized = text.trim();
  if (!normalized) return [];

  const out: AssignmentCandidate[] = [];

  const explicitPatterns = [
    {
      regex:
        /\bprimary\b\s*[:\-]?\s*([a-z][a-z .,'-]+?)(?=(?:\s+\bbackup\b|\s+\bsite\b|\s+\bnotes?\b|$))/gi,
      type: "Primary" as NormalizedCallType,
    },
    {
      regex:
        /\bbackup\b\s*[:\-]?\s*([a-z][a-z .,'-]+?)(?=(?:\s+\bprimary\b|\s+\bsite\b|\s+\bnotes?\b|$))/gi,
      type: "Backup" as NormalizedCallType,
    },
    {
      regex:
        /\bback up\b\s*[:\-]?\s*([a-z][a-z .,'-]+?)(?=(?:\s+\bprimary\b|\s+\bsite\b|\s+\bnotes?\b|$))/gi,
      type: "Backup" as NormalizedCallType,
    },
  ];

  for (const { regex, type } of explicitPatterns) {
    let match: RegExpExecArray | null = null;
    while ((match = regex.exec(normalized)) !== null) {
      const residentName = cleanResidentName(match[1]);
      if (isLikelyName(residentName)) {
        out.push({ residentName, callType: type });
      }
    }
  }

  if (out.length > 0) return out;

  const parentheticalType = normalized.match(/^(.+?)\s+\((p|b|primary|backup)\)$/i);
  if (parentheticalType) {
    const residentName = cleanResidentName(parentheticalType[1]);
    const callType = /b|backup/i.test(parentheticalType[2]) ? "Backup" : "Primary";
    if (isLikelyName(residentName)) {
      return [{ residentName, callType }];
    }
  }

  const dashType = normalized.match(/^(.+?)\s*[-–]\s*(primary|backup|back up)$/i);
  if (dashType) {
    const residentName = cleanResidentName(dashType[1]);
    const callType = /backup|back up/i.test(dashType[2]) ? "Backup" : "Primary";
    if (isLikelyName(residentName)) {
      return [{ residentName, callType }];
    }
  }

  const cleaned = cleanResidentName(normalized);
  if (defaultType && isLikelyName(cleaned)) {
    return [{ residentName: cleaned, callType: defaultType }];
  }

  return [];
}

function extractRowDate(
  row: unknown[],
  map: HeaderMap,
  context: DateContext
): string | null {
  const get = (idx?: number) => (idx === undefined ? null : row[idx]);

  const directDate = normalizeDate(get(map.date), context);
  if (directDate) return directDate;

  const dateCell = String(get(map.date) ?? "").trim();
  const weekdayCell = String(get(map.weekday) ?? "").trim();

  if (dateCell) {
    const embedded = extractDateFromString(dateCell, context);
    if (embedded) return embedded;
  }

  if (weekdayCell && looksLikeWeekdayOnly(weekdayCell) && dateCell) {
    const fromDateText = normalizeDate(dateCell, context);
    if (fromDateText) return fromDateText;
  }

  for (const cell of row) {
    const asString = String(cell ?? "").trim();
    if (!asString) continue;

    const parsed = extractDateFromString(asString, context) ?? normalizeDate(asString, context);
    if (parsed) return parsed;
  }

  return null;
}

function rowLooksLikeInstruction(row: unknown[]): boolean {
  const text = row
    .map((cell) => String(cell ?? "").trim())
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (!text) return false;

  return (
    text.includes("backup only") ||
    text.includes("cover both weekend days") ||
    text.includes("only backup") ||
    text.includes("not assigned") ||
    text.includes("blocks early in the month") ||
    text.includes("rules") ||
    text.includes("summary")
  );
}

function parseStructuredMatrix(matrix: unknown[][]): ParsedCallUploadRow[] {
  const rows: ParsedCallUploadRow[] = [];
  const context = inferDateContext(matrix);
  const header = findHeaderRow(matrix);

  const startIndex = header ? header.headerIndex + 1 : 0;
  const map = header?.map ?? {};

  let consecutiveNonDataRows = 0;

  for (let i = startIndex; i < matrix.length; i += 1) {
    const row = matrix[i] ?? [];
    const get = (idx?: number) => (idx === undefined ? null : row[idx]);

    if (rowLooksLikeInstruction(row)) {
      consecutiveNonDataRows += 1;
      if (rows.length > 0 && consecutiveNonDataRows >= 3) break;
      continue;
    }

    const callDate = extractRowDate(row, map, context);

    const site = String(get(map.site) ?? "").trim() || null;
    const notes = String(get(map.notes) ?? "").trim() || null;
    const homeFromColumn = parseBooleanLike(get(map.home));
    const typeFromColumn = normalizeCallType(get(map.callType));

    const primaryCell = String(get(map.primary) ?? "").trim();
    const backupCell = String(get(map.backup) ?? "").trim();
    const residentCell = String(get(map.resident) ?? "").trim();

    const hasAnyPrimaryLike = row.some((cell) =>
      /primary|backup|back up/i.test(String(cell ?? ""))
    );
    const hasAnyLikelyName = row.some((cell) => isLikelyName(String(cell ?? "")));
    const hasAnyDate = !!callDate;

    if (!hasAnyDate && !hasAnyPrimaryLike && !hasAnyLikelyName) {
      consecutiveNonDataRows += 1;

      if (rows.length > 0 && consecutiveNonDataRows >= 4) {
        break;
      }

      continue;
    } else {
      consecutiveNonDataRows = 0;
    }

    const candidates: AssignmentCandidate[] = [];

    if (primaryCell) {
      candidates.push(...parseAssignmentsFromText(primaryCell, "Primary"));
    }

    if (backupCell) {
      candidates.push(...parseAssignmentsFromText(backupCell, "Backup"));
    }

    if (residentCell) {
      candidates.push(
        ...parseAssignmentsFromText(residentCell, typeFromColumn ?? "Primary")
      );
    }

    if (candidates.length === 0) {
      for (let c = 0; c < row.length; c += 1) {
        if (
          c === map.date ||
          c === map.weekday ||
          c === map.site ||
          c === map.notes ||
          c === map.home ||
          c === map.callType
        ) {
          continue;
        }

        const text = String(row[c] ?? "").trim();
        if (!text) continue;

        const fallbackType =
          c === map.primary
            ? "Primary"
            : c === map.backup
            ? "Backup"
            : null;

        candidates.push(...parseAssignmentsFromText(text, fallbackType));
      }
    }

    const uniqueCandidates = candidates.filter((candidate, index, arr) => {
      const key = `${normalizeName(candidate.residentName)}|${candidate.callType}`;
      return (
        arr.findIndex(
          (item) =>
            `${normalizeName(item.residentName)}|${item.callType}` === key
        ) === index
      );
    });

    if (uniqueCandidates.length === 0) {
      if (!callDate) continue;

      pushRow(rows, {
        sourceRow: i + 1,
        residentName: "",
        callDate,
        callType: "Primary",
        site,
        isHomeCall: homeFromColumn,
        notes,
        errors: ["Missing resident name"],
      });
      continue;
    }

    for (const candidate of uniqueCandidates) {
      const isHomeCall =
        homeFromColumn ||
        /home call/i.test(String(get(map.callType) ?? "")) ||
        /home call/i.test(primaryCell) ||
        /home call/i.test(backupCell) ||
        /home call/i.test(residentCell);

      pushRow(rows, {
        sourceRow: i + 1,
        residentName: candidate.residentName,
        callDate,
        callType: candidate.callType,
        site,
        isHomeCall,
        notes,
        errors: [
          ...(candidate.residentName ? [] : ["Missing resident name"]),
          ...(callDate ? [] : ["Missing or invalid date"]),
        ],
      });
    }
  }

  return rows.filter((row) => row.residentName || row.callDate);
}

function extractDateFromLine(line: string, context?: DateContext): string | null {
  return extractDateFromString(line, context) ?? normalizeDate(line, context);
}

function removeDateText(line: string): string {
  return line
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, "")
    .replace(/\b\d{8}\b/g, "")
    .replace(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g, "")
    .replace(/\b\d{1,2}[/-]\d{1,2}\b/g, "")
    .replace(
      /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{2,4})?\b/gi,
      ""
    )
    .replace(
      /\b\d{1,2}(?:st|nd|rd|th)?\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?(?:,?\s+\d{2,4})?\b/gi,
      ""
    )
    .replace(/\s+/g, " ")
    .trim();
}

function parsePdfText(text: string): ParsedCallUploadRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const matrix = lines.map((line) => line.split(/\s{2,}|\t+/));
  const structured = parseStructuredMatrix(matrix);
  if (structured.length > 0) return structured;

  const context = inferDateContext(matrix);
  const rows: ParsedCallUploadRow[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const current = lines[i];
    const next = lines[i + 1] ?? "";
    const joined = `${current} ${next}`.trim();

    const callDate =
      extractDateFromLine(current, context) || extractDateFromLine(joined, context);

    if (!callDate) continue;

    const remainder = removeDateText(joined);

    const siteMatch = remainder.match(
      /\b(?:site|location|hospital)\b\s*[:\-]?\s*([a-z0-9 .,'()/-]+)/i
    );
    const isHomeCall = /home call/i.test(remainder);

    const explicitAssignments = parseAssignmentsFromText(remainder, null);

    if (explicitAssignments.length > 0) {
      for (const candidate of explicitAssignments) {
        pushRow(rows, {
          sourceRow: i + 1,
          residentName: candidate.residentName,
          callDate,
          callType: candidate.callType,
          site: siteMatch?.[1]?.trim() || null,
          isHomeCall,
          notes: null,
          errors: [],
        });
      }
      continue;
    }

    const pairPattern = remainder.match(
      /^([a-z .,'-]+?)\s{1,5}(?:\/|\||,|;)\s*([a-z .,'-]+)$/i
    );
    if (pairPattern) {
      const first = cleanResidentName(pairPattern[1]);
      const second = cleanResidentName(pairPattern[2]);

      if (isLikelyName(first)) {
        pushRow(rows, {
          sourceRow: i + 1,
          residentName: first,
          callDate,
          callType: "Primary",
          site: siteMatch?.[1]?.trim() || null,
          isHomeCall,
          notes: null,
          errors: [],
        });
      }

      if (isLikelyName(second)) {
        pushRow(rows, {
          sourceRow: i + 1,
          residentName: second,
          callDate,
          callType: "Backup",
          site: siteMatch?.[1]?.trim() || null,
          isHomeCall,
          notes: null,
          errors: [],
        });
      }
    }
  }

  return rows;
}

function dedupeRows(rows: ParsedCallUploadRow[]): ParsedCallUploadRow[] {
  const map = new Map<string, ParsedCallUploadRow>();

  for (const row of rows) {
    const key = [
      normalizeName(row.residentName),
      row.callDate ?? "",
      row.callType,
      normalizeHeader(row.site ?? ""),
      row.isHomeCall ? "1" : "0",
    ].join("|");

    if (!map.has(key)) {
      map.set(key, row);
    }
  }

  return Array.from(map.values());
}

function shouldSkipSheet(sheetName: string): boolean {
  const name = sheetName.trim().toLowerCase();
  return (
    name.includes("summary") ||
    name.includes("rule") ||
    name.includes("resident") ||
    name.includes("roster")
  );
}

function scoreSheetForCallParsing(sheetName: string, matrix: unknown[][]): number {
  const name = sheetName.trim().toLowerCase();

  let score = 0;

  if (name.includes("call")) score += 8;
  if (name.includes("daily")) score += 4;
  if (name.includes("schedule")) score += 4;
  if (name.includes("april")) score += 1;

  if (name.includes("summary")) score -= 10;
  if (name.includes("rule")) score -= 10;
  if (name.includes("resident")) score -= 8;
  if (name.includes("roster")) score -= 8;

  const header = findHeaderRow(matrix);
  if (header) {
    if (header.map.date !== undefined) score += 10;
    if (header.map.primary !== undefined) score += 8;
    if (header.map.backup !== undefined) score += 8;
    if (header.map.resident !== undefined) score += 3;
    if (header.map.callType !== undefined) score += 2;
  }

  let dateLikeCount = 0;
  let weekdayCount = 0;
  let primaryWordCount = 0;
  let backupWordCount = 0;

  for (let r = 0; r < Math.min(matrix.length, 15); r += 1) {
    const row = matrix[r] ?? [];
    for (let c = 0; c < Math.min(row.length, 10); c += 1) {
      const text = String(row[c] ?? "").trim();
      if (!text) continue;

      if (normalizeDate(text)) dateLikeCount += 1;
      if (looksLikeWeekdayOnly(text)) weekdayCount += 1;
      if (/primary/i.test(text)) primaryWordCount += 1;
      if (/backup|back up/i.test(text)) backupWordCount += 1;
    }
  }

  score += Math.min(dateLikeCount, 8) * 2;
  score += Math.min(weekdayCount, 7);
  score += Math.min(primaryWordCount, 4) * 2;
  score += Math.min(backupWordCount, 4) * 2;

  return score;
}

export async function parseCallUploadFile(file: File): Promise<ParsedCallUploadRow[]> {
  const name = file.name.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  if (name.endsWith(".csv") || name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const workbook = XLSX.read(buffer, {
      type: "buffer",
      cellDates: true,
      raw: true,
    });

    const sheetCandidates = workbook.SheetNames.map((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
        header: 1,
        blankrows: false,
        defval: "",
        raw: true,
        dateNF: "yyyy-mm-dd",
      });

      const score = shouldSkipSheet(sheetName)
        ? -999
        : scoreSheetForCallParsing(sheetName, matrix);

      return {
        sheetName,
        matrix,
        score,
      };
    }).sort((a, b) => b.score - a.score);

    const best = sheetCandidates[0];

    if (!best || best.score < 12) {
      throw new Error("Could not find a worksheet that looks like a daily call schedule.");
    }

    const parsed = dedupeRows(parseStructuredMatrix(best.matrix));

    if (parsed.length === 0) {
      throw new Error(`Could not detect names and dates from sheet "${best.sheetName}".`);
    }

    if (process.env.NODE_ENV !== "production") {
      console.log("Selected call upload sheet", {
        selectedSheet: best.sheetName,
        selectedScore: best.score,
        candidates: sheetCandidates.map((item) => ({
          sheetName: item.sheetName,
          score: item.score,
        })),
      });
    }

    return parsed;
  }

  if (name.endsWith(".pdf")) {
    const parsed = await (pdfParse as unknown as (
      input: Buffer
    ) => Promise<{ text: string }>)(buffer);

    const rows = dedupeRows(parsePdfText(parsed.text));
    if (rows.length > 0) return rows;

    throw new Error("Could not detect names and dates from PDF.");
  }

  throw new Error("Unsupported file type. Use CSV, XLSX, XLS, or PDF.");
}