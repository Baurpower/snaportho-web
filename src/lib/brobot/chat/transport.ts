type BroBotStreamingPreference = {
  contract: 'legacy' | 'web_v2';
  requestedStream: boolean | undefined;
  serverStreamingEnabled: boolean;
};

/**
 * An explicit request preference always wins. When the caller omits `stream`,
 * retain the response-contract rollout behavior: only web_v2 is eligible for
 * server-directed streaming.
 *
 * An explicit `stream: false` is part of the shipped iOS JSON contract and
 * must not be overridden by a server-side rollout flag.
 */
export function shouldStreamBroBotResponse({
  contract,
  requestedStream,
  serverStreamingEnabled,
}: BroBotStreamingPreference): boolean {
  // The shipped iOS app uses the legacy JSON contract. Never allow a request
  // body or a server rollout flag to replace that contract with SSE.
  if (contract !== 'web_v2') return false;

  if (requestedStream !== undefined) return requestedStream;

  return serverStreamingEnabled;
}
