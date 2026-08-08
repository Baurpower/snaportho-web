import type { SupabaseClient } from "@supabase/supabase-js";

import { open, seal } from "@/lib/workspace/signout/crypto";
import type {
  CreateCardInput,
  CreateServiceInput,
  PatientIdentifiers,
  ReorderItem,
  SignoutCard,
  SignoutService,
  UpdateCardInput,
  UpdateCardResult,
} from "@/lib/workspace/signout/types";

/**
 * Data access for the sign-out tracker. Runs on the service-role admin client;
 * callers MUST assert program membership first (see access.ts). Card bodies are
 * sealed/opened here so plaintext never leaves this boundary toward the database.
 */

type Db = SupabaseClient;

type ServiceRow = {
  id: string;
  program_id: string;
  name: string;
  phi_enabled: boolean;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
};

type CardRow = {
  id: string;
  service_id: string;
  handle: string;
  attending: string | null;
  location: string | null;
  surgery: string | null;
  surgery_date: string | null;
  next_surgery: string | null;
  next_surgery_date: string | null;
  management_mode: "surgery" | "nonop" | null;
  severity: "stable" | "watcher" | "unstable";
  status: "active" | "discharged";
  sort_order: number;
  pinned: boolean;
  body_ct: string | null;
  body_nonce: string | null;
  key_id: string;
  version: number;
  discharged_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_by: string | null;
  updated_at: string;
  signout_patient_ids?: { id: string }[] | null;
};

const CARD_COLUMNS =
  "id, service_id, handle, attending, location, surgery, surgery_date, next_surgery, next_surgery_date, management_mode, severity, status, sort_order, pinned, body_ct, body_nonce, key_id, version, discharged_at, created_by, created_at, updated_by, updated_at";

// Same columns plus a presence probe for quarantined identifiers (id only, no PHI).
const CARD_SELECT = `${CARD_COLUMNS}, signout_patient_ids(id)`;

function mapService(row: ServiceRow): SignoutService {
  return {
    id: row.id,
    programId: row.program_id,
    name: row.name,
    phiEnabled: row.phi_enabled,
    isActive: row.is_active,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

function decryptBody(row: CardRow): string {
  if (!row.body_ct || !row.body_nonce) return "";
  return open(
    Buffer.from(row.body_ct, "base64"),
    Buffer.from(row.body_nonce, "base64"),
    row.key_id,
    "card"
  );
}

function mapCard(row: CardRow): SignoutCard {
  return {
    id: row.id,
    serviceId: row.service_id,
    handle: row.handle,
    attending: row.attending ?? "",
    location: row.location ?? "",
    surgery: row.surgery ?? "",
    surgeryDate: row.surgery_date ?? "",
    nextSurgery: row.next_surgery ?? "",
    nextSurgeryDate: row.next_surgery_date ?? "",
    managementMode: row.management_mode ?? "",
    severity: row.severity,
    status: row.status,
    sortOrder: row.sort_order,
    pinned: row.pinned,
    body: decryptBody(row),
    hasIdentifiers: (row.signout_patient_ids?.length ?? 0) > 0,
    version: row.version,
    dischargedAt: row.discharged_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedBy: row.updated_by,
    updatedAt: row.updated_at,
  };
}

function sealedBody(body: string) {
  const s = seal(body, "card");
  return {
    body_ct: s.ct.toString("base64"),
    body_nonce: s.nonce.toString("base64"),
    key_id: s.keyId,
  };
}

// --- services -----------------------------------------------------------------

export async function listServices(
  db: Db,
  programId: string
): Promise<SignoutService[]> {
  const { data, error } = await db
    .from("signout_services")
    .select("id, program_id, name, phi_enabled, is_active, created_by, created_at")
    .eq("program_id", programId)
    .eq("is_active", true)
    .order("name", { ascending: true });
  if (error) throw new Error(`Failed to list sign-out services: ${error.message}`);
  return (data as ServiceRow[]).map(mapService);
}

export async function createService(
  db: Db,
  input: CreateServiceInput
): Promise<SignoutService> {
  const { data, error } = await db
    .from("signout_services")
    .insert({
      program_id: input.programId,
      name: input.name.trim(),
      created_by: input.createdBy,
    })
    .select("id, program_id, name, phi_enabled, is_active, created_by, created_at")
    .single();
  if (error) throw new Error(`Failed to create sign-out service: ${error.message}`);
  return mapService(data as ServiceRow);
}

/** Minimal lookup for access checks: the service's program, or null if missing. */
export async function getServiceProgramId(
  db: Db,
  serviceId: string
): Promise<string | null> {
  const { data, error } = await db
    .from("signout_services")
    .select("program_id")
    .eq("id", serviceId)
    .maybeSingle();
  if (error) throw new Error(`Failed to load sign-out service: ${error.message}`);
  return (data as { program_id: string } | null)?.program_id ?? null;
}

/** The card's service + program + PHI flag, for access and PHI-gating checks. */
export async function getCardContext(
  db: Db,
  cardId: string
): Promise<{ serviceId: string; programId: string; phiEnabled: boolean } | null> {
  const { data, error } = await db
    .from("signout_cards")
    .select("service_id, signout_services!inner(program_id, phi_enabled)")
    .eq("id", cardId)
    .maybeSingle();
  if (error) throw new Error(`Failed to load sign-out card: ${error.message}`);
  if (!data) return null;
  const row = data as {
    service_id: string;
    signout_services:
      | { program_id: string; phi_enabled: boolean }
      | { program_id: string; phi_enabled: boolean }[];
  };
  const service = Array.isArray(row.signout_services)
    ? row.signout_services[0]
    : row.signout_services;
  return {
    serviceId: row.service_id,
    programId: service.program_id,
    phiEnabled: service.phi_enabled,
  };
}

// --- identifiers (quarantined, separate key, audited reveal) -------------------

/**
 * Store name/DOB/MRN as ONE combined AES-256-GCM blob under the identifier key.
 * Combining avoids nonce reuse (one encryption, one nonce) given the row's single
 * nonce column, and keeps the three values inseparable at rest.
 */
export async function upsertIdentifiers(
  db: Db,
  cardId: string,
  ids: PatientIdentifiers,
  userId: string
): Promise<void> {
  const sealed = seal(JSON.stringify(ids), "identifier");
  const { error } = await db.from("signout_patient_ids").upsert(
    {
      card_id: cardId,
      name_ct: sealed.ct.toString("base64"), // combined {name,dob,mrn} ciphertext
      dob_ct: null,
      mrn_ct: null,
      nonce: sealed.nonce.toString("base64"),
      id_key_id: sealed.keyId,
      created_by: userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "card_id" }
  );
  if (error) throw new Error(`Failed to save identifiers: ${error.message}`);
}

/**
 * Decrypt a card's identifiers and append a reveal-audit row. Returns null when no
 * identifier record exists. The ONLY path that returns plaintext identifiers.
 */
export async function revealIdentifiers(
  db: Db,
  cardId: string,
  userId: string
): Promise<PatientIdentifiers | null> {
  const { data, error } = await db
    .from("signout_patient_ids")
    .select("id, name_ct, nonce, id_key_id")
    .eq("card_id", cardId)
    .maybeSingle();
  if (error) throw new Error(`Failed to load identifiers: ${error.message}`);
  if (!data) return null;
  const row = data as {
    id: string;
    name_ct: string | null;
    nonce: string | null;
    id_key_id: string;
  };
  if (!row.name_ct || !row.nonce) return null;

  const plaintext = open(
    Buffer.from(row.name_ct, "base64"),
    Buffer.from(row.nonce, "base64"),
    row.id_key_id,
    "identifier"
  );

  const { error: auditError } = await db
    .from("signout_id_access")
    .insert({ patient_id: row.id, revealed_by: userId });
  if (auditError) throw new Error(`Failed to record identifier reveal: ${auditError.message}`);

  const parsed = JSON.parse(plaintext) as Partial<PatientIdentifiers>;
  return { name: parsed.name ?? "", dob: parsed.dob ?? "", mrn: parsed.mrn ?? "" };
}

// --- cards --------------------------------------------------------------------

export async function listCards(db: Db, serviceId: string): Promise<SignoutCard[]> {
  const { data, error } = await db
    .from("signout_cards")
    .select(CARD_SELECT)
    .eq("service_id", serviceId)
    .order("pinned", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Failed to list sign-out cards: ${error.message}`);
  return (data as CardRow[]).map(mapCard);
}

/** Load a single card with its decrypted body. Null if not found. */
export async function getCard(db: Db, cardId: string): Promise<SignoutCard | null> {
  const { data, error } = await db
    .from("signout_cards")
    .select(CARD_SELECT)
    .eq("id", cardId)
    .maybeSingle();
  if (error) throw new Error(`Failed to load sign-out card: ${error.message}`);
  return data ? mapCard(data as CardRow) : null;
}

async function writeHistory(
  db: Db,
  cardId: string,
  sealedFields: { body_ct: string; body_nonce: string; key_id: string },
  version: number,
  editedBy: string
): Promise<void> {
  const { error } = await db.from("signout_card_history").insert({
    card_id: cardId,
    body_ct: sealedFields.body_ct,
    body_nonce: sealedFields.body_nonce,
    key_id: sealedFields.key_id,
    version,
    edited_by: editedBy,
  });
  // History is best-effort audit; a failure must not mask a successful write,
  // but we surface it so it is not silently lost.
  if (error) throw new Error(`Failed to record sign-out history: ${error.message}`);
}

export async function createCard(
  db: Db,
  input: CreateCardInput
): Promise<SignoutCard> {
  const sealed = sealedBody(input.body ?? "");
  const { data, error } = await db
    .from("signout_cards")
    .insert({
      service_id: input.serviceId,
      handle: input.handle.trim(),
      severity: input.severity ?? "stable",
      created_by: input.createdBy,
      updated_by: input.createdBy,
      ...sealed,
    })
    .select(CARD_SELECT)
    .single();
  if (error) throw new Error(`Failed to create sign-out card: ${error.message}`);
  const row = data as CardRow;
  await writeHistory(db, row.id, sealed, row.version, input.createdBy);
  return mapCard(row);
}

async function currentVersion(db: Db, cardId: string): Promise<number | null> {
  const { data } = await db
    .from("signout_cards")
    .select("version")
    .eq("id", cardId)
    .maybeSingle();
  return (data as { version: number } | null)?.version ?? null;
}

export async function updateCard(
  db: Db,
  input: UpdateCardInput
): Promise<UpdateCardResult> {
  const { cardId, expectedVersion, patch, editedBy } = input;

  // Load current row so an update that changes only facets keeps the existing
  // sealed body, and so we can report the live version on a conflict.
  const { data: currentData, error: loadError } = await db
    .from("signout_cards")
    .select(CARD_SELECT)
    .eq("id", cardId)
    .maybeSingle();
  if (loadError) throw new Error(`Failed to load sign-out card: ${loadError.message}`);
  if (!currentData) throw new Error("Sign-out card not found");
  const current = currentData as CardRow;

  if (current.version !== expectedVersion) {
    return { ok: false, reason: "stale", currentVersion: current.version };
  }

  const sealed =
    patch.body !== undefined
      ? sealedBody(patch.body)
      : {
          body_ct: current.body_ct ?? sealedBody("").body_ct,
          body_nonce: current.body_nonce ?? sealedBody("").body_nonce,
          key_id: current.key_id,
        };

  const nextVersion = expectedVersion + 1;
  const update: Record<string, unknown> = {
    ...sealed,
    version: nextVersion,
    updated_by: editedBy,
    updated_at: new Date().toISOString(),
  };
  if (patch.handle !== undefined) update.handle = patch.handle.trim();
  if (patch.attending !== undefined) {
    update.attending = patch.attending.trim() || null;
  }
  if (patch.location !== undefined) update.location = patch.location.trim() || null;
  if (patch.surgery !== undefined) update.surgery = patch.surgery.trim() || null;
  if (patch.surgeryDate !== undefined) {
    update.surgery_date = patch.surgeryDate.trim() || null;
  }
  if (patch.nextSurgery !== undefined) {
    update.next_surgery = patch.nextSurgery.trim() || null;
  }
  if (patch.nextSurgeryDate !== undefined) {
    update.next_surgery_date = patch.nextSurgeryDate.trim() || null;
  }
  if (patch.managementMode !== undefined) {
    update.management_mode = patch.managementMode || null;
  }
  if (patch.severity !== undefined) update.severity = patch.severity;
  if (patch.pinned !== undefined) update.pinned = patch.pinned;
  if (patch.status !== undefined) {
    update.status = patch.status;
    update.discharged_at =
      patch.status === "discharged" ? new Date().toISOString() : null;
  }

  // Guarded write: only commits if the row is still at expectedVersion.
  const { data: updated, error: updateError } = await db
    .from("signout_cards")
    .update(update)
    .eq("id", cardId)
    .eq("version", expectedVersion)
    .select(CARD_SELECT)
    .maybeSingle();
  if (updateError)
    throw new Error(`Failed to update sign-out card: ${updateError.message}`);
  if (!updated) {
    // Lost the race between load and guarded update.
    const live = await currentVersion(db, cardId);
    return { ok: false, reason: "stale", currentVersion: live ?? nextVersion };
  }

  await writeHistory(db, cardId, sealed, nextVersion, editedBy);
  return { ok: true, card: mapCard(updated as CardRow) };
}

export async function deleteCard(db: Db, cardId: string): Promise<void> {
  const { error } = await db.from("signout_cards").delete().eq("id", cardId);
  if (error) throw new Error(`Failed to delete sign-out card: ${error.message}`);
}

export async function reorderCards(
  db: Db,
  serviceId: string,
  items: ReorderItem[]
): Promise<void> {
  // Scoped per-item updates so a caller cannot move a card between services.
  for (const item of items) {
    const patch: Record<string, unknown> = { sort_order: item.sortOrder };
    if (item.pinned !== undefined) patch.pinned = item.pinned;
    const { error } = await db
      .from("signout_cards")
      .update(patch)
      .eq("id", item.id)
      .eq("service_id", serviceId);
    if (error) throw new Error(`Failed to reorder sign-out cards: ${error.message}`);
  }
}
