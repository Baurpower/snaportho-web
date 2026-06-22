// ── Core domain types ────────────────────────────────────────

export type ApProcedure = {
  id: string;
  programId: string;
  name: string;
  abbreviation: string | null;
  subspecialty: string | null;
  approach: string | null;
  defaultSite: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
};

export type ApCard = {
  id: string;
  programId: string;
  attendingId: string;
  procedureId: string;
  site: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
};

export type ApSection = {
  id: string;
  cardId: string;
  title: string;
  sortOrder: number;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
};

export type ApItem = {
  id: string;
  sectionId: string;
  content: string;
  isHighYield: boolean;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
};

export type ApItemHistory = {
  id: string;
  itemId: string;
  previousContent: string | null;
  newContent: string | null;
  previousIsHighYield: boolean | null;
  newIsHighYield: boolean | null;
  changedBy: string | null;
  changedAt: string;
};

export type ApCardTag = {
  id: string;
  cardId: string;
  tagType: string;
  tagValue: string;
  createdBy: string | null;
  createdAt: string;
};

// ── Enriched/summary types ───────────────────────────────────

/** Lightweight card summary for list views. */
export type ApCardSummary = {
  id: string;
  programId: string;
  attendingId: string;
  attendingFullName: string;
  attendingDisplayName: string | null;
  procedureId: string;
  procedureName: string;
  procedureApproach: string | null;
  procedureSubspecialty: string | null;
  site: string | null;
  isActive: boolean;
  itemCount: number;
  highYieldCount: number;
  updatedAt: string;
  updatedBy: string | null;
  updatedByName: string | null;
};

/** Full card with nested sections and items. */
export type ApFullCard = ApCard & {
  attendingFullName: string;
  attendingDisplayName: string | null;
  procedureName: string;
  procedureApproach: string | null;
  procedureSubspecialty: string | null;
  procedureAbbreviation: string | null;
  updatedByName: string | null;
  sections: ApSectionWithItems[];
  tags: ApCardTag[];
};

export type ApSectionWithItems = ApSection & {
  items: ApItem[];
};

// ── Request payload types ────────────────────────────────────

export type CreateApProcedurePayload = {
  name: string;
  abbreviation?: string | null;
  subspecialty?: string | null;
  approach?: string | null;
  defaultSite?: string | null;
};

export type UpdateApProcedurePayload = Partial<CreateApProcedurePayload> & {
  isActive?: boolean;
};

export type CreateApCardPayload = {
  attendingId: string;
  procedureId: string;
  site?: string | null;
};

export type UpdateApCardPayload = {
  site?: string | null;
};

export type CreateApSectionPayload = {
  cardId: string;
  title: string;
  sortOrder?: number;
};

export type UpdateApSectionPayload = {
  title?: string;
  sortOrder?: number;
  isActive?: boolean;
};

export type CreateApItemPayload = {
  sectionId: string;
  content: string;
  isHighYield?: boolean;
  sortOrder?: number;
};

export type UpdateApItemPayload = {
  content?: string;
  isHighYield?: boolean;
  sortOrder?: number;
  isActive?: boolean;
};

// ── Search result types ──────────────────────────────────────

export type ApSearchAttendingMatch = {
  kind: "attending";
  attendingId: string;
  attendingFullName: string;
  attendingDisplayName: string | null;
  cardCount: number;
};

export type ApSearchCardMatch = {
  kind: "card";
  cardId: string;
  attendingId: string;
  attendingFullName: string;
  attendingDisplayName: string | null;
  procedureId: string;
  procedureName: string;
  procedureApproach: string | null;
  procedureSubspecialty: string | null;
  site: string | null;
  matchedField: "procedure_name" | "approach" | "site";
};

export type ApSearchItemMatch = {
  kind: "item";
  itemId: string;
  sectionId: string;
  sectionTitle: string;
  cardId: string;
  attendingId: string;
  attendingFullName: string;
  procedureId: string;
  procedureName: string;
  site: string | null;
  content: string;
  isHighYield: boolean;
};

export type ApSearchResults = {
  query: string;
  attendings: ApSearchAttendingMatch[];
  cards: ApSearchCardMatch[];
  items: ApSearchItemMatch[];
};

// ── DB row types (internal — not exported to client) ─────────

export type ApProcedureRow = {
  id: string;
  program_id: string;
  name: string;
  abbreviation: string | null;
  subspecialty: string | null;
  approach: string | null;
  default_site: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
};

export type ApCardRow = {
  id: string;
  program_id: string;
  attending_id: string;
  procedure_id: string;
  site: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
};

export type ApSectionRow = {
  id: string;
  card_id: string;
  title: string;
  sort_order: number;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
};

export type ApItemRow = {
  id: string;
  section_id: string;
  content: string;
  is_high_yield: boolean;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
};

export type ApCardTagRow = {
  id: string;
  card_id: string;
  tag_type: string;
  tag_value: string;
  created_by: string | null;
  created_at: string;
};

// ── Mappers ──────────────────────────────────────────────────

export function mapApProcedure(row: ApProcedureRow): ApProcedure {
  return {
    id: row.id,
    programId: row.program_id,
    name: row.name,
    abbreviation: row.abbreviation,
    subspecialty: row.subspecialty,
    approach: row.approach,
    defaultSite: row.default_site,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
  };
}

export function mapApCard(row: ApCardRow): ApCard {
  return {
    id: row.id,
    programId: row.program_id,
    attendingId: row.attending_id,
    procedureId: row.procedure_id,
    site: row.site,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
  };
}

export function mapApSection(row: ApSectionRow): ApSection {
  return {
    id: row.id,
    cardId: row.card_id,
    title: row.title,
    sortOrder: row.sort_order,
    isDefault: row.is_default,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
  };
}

export function mapApItem(row: ApItemRow): ApItem {
  return {
    id: row.id,
    sectionId: row.section_id,
    content: row.content,
    isHighYield: row.is_high_yield,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
  };
}

export function mapApCardTag(row: ApCardTagRow): ApCardTag {
  return {
    id: row.id,
    cardId: row.card_id,
    tagType: row.tag_type,
    tagValue: row.tag_value,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}
