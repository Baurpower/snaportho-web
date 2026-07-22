export type ActiveMediaStorageMapping = {
  id: string;
  imageKey: string;
  thumbnailKey: string;
};

export type MediaReconciliationPlan = {
  orphanObjectKeys: string[];
  missingImageAssetIds: string[];
  missingThumbnailAssetIds: string[];
  storageObjectCount: number;
  activeAssetCount: number;
};

export function buildMediaReconciliationPlan(
  storageObjectKeys: readonly string[],
  activeAssets: readonly ActiveMediaStorageMapping[],
): MediaReconciliationPlan {
  const stored = new Set(storageObjectKeys);
  const expected = new Set<string>();
  const missingImageAssetIds: string[] = [];
  const missingThumbnailAssetIds: string[] = [];

  for (const asset of activeAssets) {
    expected.add(asset.imageKey);
    expected.add(asset.thumbnailKey);
    if (!stored.has(asset.imageKey)) missingImageAssetIds.push(asset.id);
    if (!stored.has(asset.thumbnailKey)) missingThumbnailAssetIds.push(asset.id);
  }

  return {
    orphanObjectKeys: [...stored].filter((key) => !expected.has(key)).sort(),
    missingImageAssetIds: missingImageAssetIds.sort(),
    missingThumbnailAssetIds: missingThumbnailAssetIds.sort(),
    storageObjectCount: stored.size,
    activeAssetCount: activeAssets.length,
  };
}

export function reconciliationApplyRequested(args: readonly string[]) {
  const unknown = args.filter((arg) => arg !== "--apply");
  if (unknown.length) throw new Error("Unsupported reconciliation argument");
  return args.includes("--apply");
}
