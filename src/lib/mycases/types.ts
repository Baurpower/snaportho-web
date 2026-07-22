export const MYCASES_CASE_STATUSES = ["draft", "upcoming", "completed", "archived"] as const;
export type MyCasesCaseStatus = (typeof MYCASES_CASE_STATUSES)[number];

export const MYCASES_LEARNING_KINDS = [
  "note", "pearl", "reflection", "preparation", "question", "preference", "checklist", "postop_learning",
] as const;
export type MyCasesLearningKind = (typeof MYCASES_LEARNING_KINDS)[number];

export type MyCasesCase = {
  id: string; user_id: string; title: string; procedure_name: string;
  diagnosis: string | null; status: MyCasesCaseStatus; rotation_context: string | null;
  attending_context: string | null; difficulty: number | null; autonomy: number | null;
  preparation: string | null; debrief: string | null; source: "web" | "ios" | "import";
  client_source_id: string | null; version: number; is_archived: boolean;
  created_at: string; updated_at: string; deleted_at: string | null;
  tags?: MyCasesTag[];
};

export type MyCasesLearningItem = {
  id: string; user_id: string; case_id: string | null; kind: MyCasesLearningKind;
  title: string | null; content: string; procedure_name: string | null;
  diagnosis: string | null; rotation_context: string | null; attending_context: string | null;
  topic: string | null; source: "web" | "ios" | "import"; client_source_id: string | null;
  version: number; is_pinned: boolean; is_favorite: boolean; is_archived: boolean;
  created_at: string; updated_at: string; deleted_at: string | null;
  tags?: MyCasesTag[];
};

export type MyCasesTag = { id: string; user_id: string; name: string; color: string | null; created_at: string };
export type MyCasesCollection = { id: string; user_id: string; name: string; description: string | null; created_at: string; updated_at: string };

export type MyCasesCaseInput = Pick<MyCasesCase, "title" | "procedure_name"> & Partial<Pick<MyCasesCase,
  "diagnosis" | "status" | "rotation_context" | "attending_context" | "difficulty" | "autonomy" | "preparation" | "debrief" | "is_archived"
>> & { tags?: string[] };

export type MyCasesLearningItemInput = Pick<MyCasesLearningItem, "kind" | "content"> & Partial<Pick<MyCasesLearningItem,
  "case_id" | "title" | "procedure_name" | "diagnosis" | "rotation_context" | "attending_context" | "topic" | "is_pinned" | "is_favorite" | "is_archived"
>> & { tags?: string[] };

/** Future-only metadata contract. Ciphertext and keys never pass through this foundation. */
export type EncryptedVaultAssetContract = {
  assetId: string; ownerId: string; linkedCaseId: string | null;
  encryptedObjectReference: string; encryptedThumbnailReference: string | null;
  encryptionVersion: number; clientSourceId: string; mediaType: string;
  syncState: "local" | "queued" | "synced" | "failed" | "tombstoned";
  createdAt: string; updatedAt: string; deletedAt: string | null;
};
