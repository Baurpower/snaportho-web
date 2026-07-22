import { createAdminClient } from "../src/lib/supabase/admin";
import {
  buildMediaReconciliationPlan,
  reconciliationApplyRequested,
  type ActiveMediaStorageMapping,
} from "../src/lib/mycases/media/reconciliation";
import { MYCASES_MEDIA_BUCKET } from "../src/lib/mycases/media/types";

const PAGE_SIZE = 1_000;
const DELETE_BATCH_SIZE = 100;

async function listBucketObjects(prefix = "", depth = 0): Promise<string[]> {
  if (depth > 3) throw new Error("Unexpected educational media object depth");
  const admin = createAdminClient();
  const keys: string[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await admin.storage.from(MYCASES_MEDIA_BUCKET).list(prefix, {
      limit: PAGE_SIZE,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw new Error("Educational media bucket listing failed");
    for (const entry of data ?? []) {
      const key = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id) keys.push(key);
      else keys.push(...await listBucketObjects(key, depth + 1));
    }
    if (!data || data.length < PAGE_SIZE) break;
  }
  return keys;
}

async function listActiveMappings(): Promise<ActiveMediaStorageMapping[]> {
  const admin = createAdminClient();
  const rows: ActiveMediaStorageMapping[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await admin
      .from("mycases_educational_assets")
      .select("id,storage_object_key,thumbnail_object_key")
      .is("deleted_at", null)
      .neq("processing_status", "deleted")
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw new Error("Educational media metadata listing failed");
    for (const row of data ?? []) {
      rows.push({
        id: row.id,
        imageKey: row.storage_object_key,
        thumbnailKey: row.thumbnail_object_key,
      });
    }
    if (!data || data.length < PAGE_SIZE) break;
  }
  return rows;
}

async function main() {
  const apply = reconciliationApplyRequested(process.argv.slice(2));
  const [storageKeys, activeAssets] = await Promise.all([
    listBucketObjects(),
    listActiveMappings(),
  ]);
  const plan = buildMediaReconciliationPlan(storageKeys, activeAssets);

  console.log("[mycases-media-reconciliation]", {
    bucket: MYCASES_MEDIA_BUCKET,
    mode: apply ? "apply" : "dry-run",
    storageObjectCount: plan.storageObjectCount,
    activeAssetCount: plan.activeAssetCount,
    orphanObjectCount: plan.orphanObjectKeys.length,
    missingImageCount: plan.missingImageAssetIds.length,
    missingThumbnailCount: plan.missingThumbnailAssetIds.length,
  });

  if (!apply || !plan.orphanObjectKeys.length) return;
  const admin = createAdminClient();
  for (let offset = 0; offset < plan.orphanObjectKeys.length; offset += DELETE_BATCH_SIZE) {
    const batch = plan.orphanObjectKeys.slice(offset, offset + DELETE_BATCH_SIZE);
    const { error } = await admin.storage.from(MYCASES_MEDIA_BUCKET).remove(batch);
    if (error) throw new Error("Educational media orphan deletion failed");
  }
  console.log("[mycases-media-reconciliation]", {
    bucket: MYCASES_MEDIA_BUCKET,
    mode: "apply-complete",
    deletedObjectCount: plan.orphanObjectKeys.length,
  });
}

main().catch(() => {
  console.error("[mycases-media-reconciliation]", { code: "reconciliation_failed" });
  process.exitCode = 1;
});
