import { addonVersionAtLeast } from "../education/deck-addon-version";

export const SNAPORTHO_ADDON_LATEST_VERSION = "1.0.8";
export const SNAPORTHO_ADDON_MINIMUM_VERSION = "1.0.8";
export const SNAPORTHO_ADDON_DOWNLOAD_PATH = "/anki/download";
export const SNAPORTHO_ADDON_UPDATE_MESSAGE =
  "Update to install the SnapOrtho-owned deck identity and prevent legacy parent-deck merges.";

export function addonReleaseStatus(clientVersion: string | null, origin: string) {
  return {
    latestVersion: SNAPORTHO_ADDON_LATEST_VERSION,
    minimumSupportedVersion: SNAPORTHO_ADDON_MINIMUM_VERSION,
    upgradeRequired: !addonVersionAtLeast(clientVersion, SNAPORTHO_ADDON_MINIMUM_VERSION),
    downloadUrl: new URL(SNAPORTHO_ADDON_DOWNLOAD_PATH, origin).toString(),
    message: SNAPORTHO_ADDON_UPDATE_MESSAGE,
  };
}
