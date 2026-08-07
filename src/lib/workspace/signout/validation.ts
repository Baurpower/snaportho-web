import {
  SIGNOUT_MANAGEMENT_MODES,
  SIGNOUT_SEVERITIES,
  SIGNOUT_STATUSES,
  type PatientIdentifiers,
  type ReorderItem,
  type SignoutManagementMode,
  type SignoutSeverity,
  type SignoutStatus,
  type UpdateCardPatch,
} from "@/lib/workspace/signout/types";

/**
 * Request-body validation for sign-out routes. Throws SignoutValidationError on
 * bad input; routes translate that to a 400. Kept dependency-free and testable.
 */

export class SignoutValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SignoutValidationError";
  }
}

const MAX_BODY = 20000;
const MAX_REORDER = 500;

function asRecord(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new SignoutValidationError("Request body must be an object");
  }
  return raw as Record<string, unknown>;
}

function requireString(value: unknown, field: string, min: number, max: number): string {
  if (typeof value !== "string") {
    throw new SignoutValidationError(`${field} must be a string`);
  }
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) {
    throw new SignoutValidationError(`${field} must be ${min}-${max} characters`);
  }
  return trimmed;
}

function parseSeverity(value: unknown): SignoutSeverity {
  if (!SIGNOUT_SEVERITIES.includes(value as SignoutSeverity)) {
    throw new SignoutValidationError(
      `severity must be one of: ${SIGNOUT_SEVERITIES.join(", ")}`
    );
  }
  return value as SignoutSeverity;
}

function parseStatus(value: unknown): SignoutStatus {
  if (!SIGNOUT_STATUSES.includes(value as SignoutStatus)) {
    throw new SignoutValidationError(
      `status must be one of: ${SIGNOUT_STATUSES.join(", ")}`
    );
  }
  return value as SignoutStatus;
}

function parseBody(value: unknown): string {
  if (typeof value !== "string") {
    throw new SignoutValidationError("body must be a string");
  }
  if (value.length > MAX_BODY) {
    throw new SignoutValidationError(`body must be at most ${MAX_BODY} characters`);
  }
  return value;
}

export function parseCreateServiceBody(raw: unknown): { name: string } {
  const obj = asRecord(raw);
  return { name: requireString(obj.name, "name", 1, 80) };
}

export function parseCreateCardBody(raw: unknown): {
  handle: string;
  severity?: SignoutSeverity;
  body?: string;
} {
  const obj = asRecord(raw);
  const result: {
    handle: string;
    severity?: SignoutSeverity;
    body?: string;
  } = { handle: requireString(obj.handle, "handle", 1, 40) };
  if (obj.severity !== undefined) result.severity = parseSeverity(obj.severity);
  if (obj.body !== undefined) result.body = parseBody(obj.body);
  return result;
}

export function parseUpdateCardBody(raw: unknown): {
  expectedVersion: number;
  patch: UpdateCardPatch;
} {
  const obj = asRecord(raw);
  if (
    typeof obj.expectedVersion !== "number" ||
    !Number.isInteger(obj.expectedVersion) ||
    obj.expectedVersion < 1
  ) {
    throw new SignoutValidationError("expectedVersion must be a positive integer");
  }
  const patch: UpdateCardPatch = {};
  if (obj.handle !== undefined) patch.handle = requireString(obj.handle, "handle", 1, 40);
  if (obj.attending !== undefined) patch.attending = optionalString(obj.attending, "attending", 80);
  if (obj.location !== undefined) patch.location = optionalString(obj.location, "location", 60);
  if (obj.surgery !== undefined) patch.surgery = optionalString(obj.surgery, "surgery", 120);
  if (obj.surgeryDate !== undefined) {
    patch.surgeryDate = parseIsoDate(obj.surgeryDate, "surgeryDate");
  }
  if (obj.nextSurgery !== undefined) {
    patch.nextSurgery = optionalString(obj.nextSurgery, "nextSurgery", 120);
  }
  if (obj.nextSurgeryDate !== undefined) {
    patch.nextSurgeryDate = parseIsoDate(obj.nextSurgeryDate, "nextSurgeryDate");
  }
  if (obj.managementMode !== undefined) {
    patch.managementMode = parseManagementMode(obj.managementMode);
  }
  if (obj.severity !== undefined) patch.severity = parseSeverity(obj.severity);
  if (obj.status !== undefined) patch.status = parseStatus(obj.status);
  if (obj.pinned !== undefined) {
    if (typeof obj.pinned !== "boolean") {
      throw new SignoutValidationError("pinned must be a boolean");
    }
    patch.pinned = obj.pinned;
  }
  if (obj.body !== undefined) patch.body = parseBody(obj.body);
  if (Object.keys(patch).length === 0) {
    throw new SignoutValidationError("No fields to update");
  }
  return { expectedVersion: obj.expectedVersion, patch };
}

function parseIsoDate(value: unknown, field = "surgeryDate"): string {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    throw new SignoutValidationError(`${field} must be an ISO date (YYYY-MM-DD)`);
  }
  const trimmed = value.trim();
  if (Number.isNaN(new Date(`${trimmed}T00:00:00`).getTime())) {
    throw new SignoutValidationError(`${field} is not a valid date`);
  }
  return trimmed;
}

/** Empty string clears the mode; otherwise must be surgery | nonop. */
function parseManagementMode(value: unknown): SignoutManagementMode | "" {
  if (value === undefined || value === null || value === "") return "";
  if (!SIGNOUT_MANAGEMENT_MODES.includes(value as SignoutManagementMode)) {
    throw new SignoutValidationError(
      `managementMode must be one of: ${SIGNOUT_MANAGEMENT_MODES.join(", ")} (or empty)`
    );
  }
  return value as SignoutManagementMode;
}

function optionalString(value: unknown, field: string, max: number): string {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") {
    throw new SignoutValidationError(`${field} must be a string`);
  }
  const trimmed = value.trim();
  if (trimmed.length > max) {
    throw new SignoutValidationError(`${field} must be at most ${max} characters`);
  }
  return trimmed;
}

export function parseIdentifiersBody(raw: unknown): PatientIdentifiers {
  const obj = asRecord(raw);
  return {
    name: requireString(obj.name, "name", 1, 120),
    dob: optionalString(obj.dob, "dob", 40),
    mrn: optionalString(obj.mrn, "mrn", 40),
  };
}

export function parseReorderBody(raw: unknown): {
  serviceId: string;
  items: ReorderItem[];
} {
  const obj = asRecord(raw);
  const serviceId = requireString(obj.serviceId, "serviceId", 1, 100);
  if (!Array.isArray(obj.items) || obj.items.length === 0) {
    throw new SignoutValidationError("items must be a non-empty array");
  }
  if (obj.items.length > MAX_REORDER) {
    throw new SignoutValidationError(`items must be at most ${MAX_REORDER} entries`);
  }
  const items: ReorderItem[] = obj.items.map((entry, index) => {
    const item = asRecord(entry);
    const id = requireString(item.id, `items[${index}].id`, 1, 100);
    if (
      typeof item.sortOrder !== "number" ||
      !Number.isInteger(item.sortOrder) ||
      item.sortOrder < 0
    ) {
      throw new SignoutValidationError(
        `items[${index}].sortOrder must be a non-negative integer`
      );
    }
    const parsed: ReorderItem = { id, sortOrder: item.sortOrder };
    if (item.pinned !== undefined) {
      if (typeof item.pinned !== "boolean") {
        throw new SignoutValidationError(`items[${index}].pinned must be a boolean`);
      }
      parsed.pinned = item.pinned;
    }
    return parsed;
  });
  return { serviceId, items };
}
