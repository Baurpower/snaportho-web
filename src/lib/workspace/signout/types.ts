/** Sign-out tracker domain types (Phase 1: encrypted card core). */

export type SignoutSeverity = "stable" | "watcher" | "unstable";
export type SignoutStatus = "active" | "discharged";
/** Operative vs non-operative pathway; null/empty means unset (infer in UI). */
export type SignoutManagementMode = "surgery" | "nonop";
export type DiagnosticItemType = "lab" | "imaging" | "pt" | "other";

export type DiagnosticLabValue = {
  id: string;
  value: string;
  date: string;
};

export type DiagnosticItem = {
  id: string;
  type: DiagnosticItemType;
  label: string;
  date: string;
  status: string;
  details: string;
  pinned: boolean;
  labValues: DiagnosticLabValue[];
  ptDistance: string;
  ptRecommendation: string;
};

export type SignoutDiagnostics = {
  version: 1;
  items: DiagnosticItem[];
};

export const SIGNOUT_SEVERITIES: readonly SignoutSeverity[] = [
  "stable",
  "watcher",
  "unstable",
];
export const SIGNOUT_STATUSES: readonly SignoutStatus[] = ["active", "discharged"];
export const SIGNOUT_MANAGEMENT_MODES: readonly SignoutManagementMode[] = [
  "surgery",
  "nonop",
];

export type SignoutService = {
  id: string;
  programId: string;
  name: string;
  phiEnabled: boolean;
  isActive: boolean;
  createdBy: string | null;
  createdAt: string;
};

/** A card with its body already decrypted for the caller. */
export type SignoutCard = {
  id: string;
  serviceId: string;
  handle: string;
  attending: string;
  location: string;
  surgery: string;
  /**
   * ISO date (YYYY-MM-DD). Surgery mode → surgery date (POD). Non-op mode →
   * treatment start date (Day n since start). "" when none.
   */
  surgeryDate: string;
  /**
   * Planned / next OR procedure text (staged return to OR). Surgery mode only.
   * "" when none.
   */
  nextSurgery: string;
  /**
   * ISO date of planned next OR. Drives Next OR countdown chip alongside POD
   * from surgeryDate. "" when none.
   */
  nextSurgeryDate: string;
  /**
   * Surgery vs non-op. When "nonop", `surgery` holds treatment (tx) text and
   * `surgeryDate` is the day treatment started. "" when never set (UI infers).
   */
  managementMode: SignoutManagementMode | "";
  severity: SignoutSeverity;
  status: SignoutStatus;
  sortOrder: number;
  pinned: boolean;
  /** Decrypted freeform body. Empty string when the card has no body yet. */
  body: string;
  diagnostics: SignoutDiagnostics;
  /** Whether a quarantined identifier record exists (never the values themselves). */
  hasIdentifiers: boolean;
  version: number;
  dischargedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string;
};

export type CreateServiceInput = {
  programId: string;
  name: string;
  createdBy: string;
};

export type CreateCardInput = {
  serviceId: string;
  handle: string;
  createdBy: string;
  severity?: SignoutSeverity;
  body?: string;
  diagnostics?: SignoutDiagnostics;
};

/** Fields an update may change. Body is re-encrypted; facets are written plaintext. */
export type UpdateCardPatch = {
  handle?: string;
  attending?: string;
  location?: string;
  surgery?: string;
  surgeryDate?: string;
  nextSurgery?: string;
  nextSurgeryDate?: string;
  managementMode?: SignoutManagementMode | "";
  severity?: SignoutSeverity;
  status?: SignoutStatus;
  pinned?: boolean;
  body?: string;
  diagnostics?: SignoutDiagnostics;
};

export type UpdateCardInput = {
  cardId: string;
  expectedVersion: number;
  patch: UpdateCardPatch;
  editedBy: string;
};

/** Result of an optimistic update: the fresh card, or a stale-version conflict. */
export type UpdateCardResult =
  | { ok: true; card: SignoutCard }
  | { ok: false; reason: "stale"; currentVersion: number };

export type ReorderItem = {
  id: string;
  sortOrder: number;
  pinned?: boolean;
};

/** Quarantined direct identifiers. Only ever leaves the server via the audited reveal path. */
export type PatientIdentifiers = {
  name: string;
  dob: string;
  mrn: string;
};
