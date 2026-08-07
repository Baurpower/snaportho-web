/** Sign-out tracker domain types (Phase 1: encrypted card core). */

export type SignoutSeverity = "stable" | "watcher" | "unstable";
export type SignoutStatus = "active" | "discharged";

export const SIGNOUT_SEVERITIES: readonly SignoutSeverity[] = [
  "stable",
  "watcher",
  "unstable",
];
export const SIGNOUT_STATUSES: readonly SignoutStatus[] = ["active", "discharged"];

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
  /** ISO date (YYYY-MM-DD) of surgery; drives computed POD. "" when none. */
  surgeryDate: string;
  severity: SignoutSeverity;
  status: SignoutStatus;
  sortOrder: number;
  pinned: boolean;
  /** Decrypted freeform body. Empty string when the card has no body yet. */
  body: string;
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
};

/** Fields an update may change. Body is re-encrypted; facets are written plaintext. */
export type UpdateCardPatch = {
  handle?: string;
  attending?: string;
  location?: string;
  surgery?: string;
  surgeryDate?: string;
  severity?: SignoutSeverity;
  status?: SignoutStatus;
  pinned?: boolean;
  body?: string;
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
