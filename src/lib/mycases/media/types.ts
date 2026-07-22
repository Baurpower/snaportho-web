export const MYCASES_MEDIA_BUCKET = "mycases-educational-media";
export const MYCASES_MEDIA_MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MYCASES_MEDIA_MAX_DIMENSION = 8000;
export const MYCASES_MEDIA_MAX_PIXELS = 40_000_000;
export const MYCASES_MEDIA_CAPTION_MAX = 500;
export const MYCASES_MEDIA_SIGNED_URL_SECONDS = 60;

export type MyCasesEducationalAssetRow = {
  id: string; user_id: string; case_id: string; caption: string | null;
  storage_object_key: string; thumbnail_object_key: string; media_type: "image/webp";
  byte_size: number; width: number; height: number; checksum_sha256: string;
  processing_status: "processing" | "ready" | "failed" | "deleting" | "deleted";
  version: number; created_at: string; updated_at: string; deleted_at: string | null;
};
export type MyCasesEducationalAsset = Omit<MyCasesEducationalAssetRow, "user_id" | "storage_object_key" | "thumbnail_object_key" | "checksum_sha256">;
export type MyCasesAssetView = { imageUrl: string; thumbnailUrl: string; expiresAt: string };
export type MyCasesAssetThumbnailView = { thumbnailUrl: string; expiresAt: string };

export class MyCasesMediaError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(code: string, message: string, status = 400) { super(message); this.code = code; this.status = status; }
}

export function publicAsset(row: MyCasesEducationalAssetRow): MyCasesEducationalAsset {
  return {
    id:row.id, case_id:row.case_id, caption:row.caption, media_type:row.media_type,
    byte_size:row.byte_size, width:row.width, height:row.height,
    processing_status:row.processing_status, version:row.version,
    created_at:row.created_at, updated_at:row.updated_at, deleted_at:row.deleted_at,
  };
}
