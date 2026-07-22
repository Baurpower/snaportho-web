export const EXTENSION_BUILD_ID = '2026-07-19-rock-curriculum-contract-v2';
export const ROUTING_CONTRACT_VERSION = 'curriculum-explain-v2';
export const BACKGROUND_HANDLER_VERSION = 'brobot-request-handler-v2';
export const SIDEPANEL_BUNDLE_VERSION = 'sidepanel-routing-v2';

export type ExtensionBuildInfo = {
  extensionBuildId: string;
  routingContractVersion: string;
  backgroundHandlerVersion: string;
};

export function isCompatibleExtensionBuild(actual: Pick<ExtensionBuildInfo, 'extensionBuildId' | 'routingContractVersion'>) {
  return actual.extensionBuildId === EXTENSION_BUILD_ID && actual.routingContractVersion === ROUTING_CONTRACT_VERSION;
}
