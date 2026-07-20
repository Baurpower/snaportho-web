export const BROBOT_RESPONSE_VERSION_HEADER = 'x-brobot-response-version';
export const BROBOT_CLIENT_HEADER = 'x-snaportho-client';

export type BroBotResponseContract = 'legacy' | 'web_v2';
export type BroBotStreamEventName = 'start' | 'delta' | 'metadata' | 'done' | 'error';

export type BroBotChatInternalResult = {
  conversationId: string;
  messageId: string;
  goal?: string;
  selectedFocus?: string;
  answer: string;
  priorityPoints: string[];
  knowledgeGaps: string[];
  whatMostResidentsMiss?: string[];
  suggestedQuestions: string[];
  nextLearningBranches?: Array<{
    id: string;
    label: string;
    description?: string;
    category?: string;
    topicId?: string;
    branchQuestionId?: string;
    rankScore?: number;
  }>;
  tags: string[];
  detectedMode: string;
  remainingFreeUses?: number | null;
  confidence?: number;
  needsClarification?: boolean;
  clarifyingQuestions?: string[];
  assumedContext?: string;
  consultConfidence?: 'low' | 'moderate' | 'high';
  missingInformation?: string[];
  researchSubmode?: string;
  tier?: 1 | 2 | 3;
  status?: 'answer' | 'clarify';
  directAnswer?: string;
  keyPoints?: string[];
  pearl?: string;
  pitfall?: string;
  clarifyingQuestion?: string;
  specialty?: string;
  resolvedTopic?: string;
  entityResolutionState?: string;
};

export type BroBotLegacyResponse = BroBotChatInternalResult;
export type BroBotWebV2Response = BroBotChatInternalResult & { responseVersion: 2 };

export type ContractSelection =
  | { ok: true; contract: BroBotResponseContract; clientPlatform: 'ios' | 'web' | 'unknown' }
  | { ok: false; requestedVersion: string };

export function selectBroBotResponseContract(headers: Headers): ContractSelection {
  const rawRequestedVersion = headers.get(BROBOT_RESPONSE_VERSION_HEADER);
  const requestedVersion = rawRequestedVersion?.trim();
  const client = headers.get(BROBOT_CLIENT_HEADER)?.trim().toLowerCase();

  if (rawRequestedVersion !== null && requestedVersion !== '1' && requestedVersion !== '2') {
    return { ok: false, requestedVersion: requestedVersion || '(empty)' };
  }

  if (requestedVersion === '2') {
    return { ok: true, contract: 'web_v2', clientPlatform: client === 'ios' ? 'ios' : 'web' };
  }

  // Unversioned requests intentionally retain the released native client's JSON contract.
  return {
    ok: true,
    contract: 'legacy',
    clientPlatform: client === 'ios' ? 'ios' : client === 'web' ? 'web' : 'unknown',
  };
}

export function shouldUseCasePrepV2Migration(
  contract: BroBotResponseContract,
  prompt: string
): boolean {
  return (
    contract === 'web_v2' &&
    /\b(carpal tunnel (release|surgery)|ctr)\b/i.test(prompt)
  );
}

export function encodeBroBotStreamEvent(
  event: BroBotStreamEventName,
  data: Record<string, unknown>
): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export function serializeLegacyResponse(result: BroBotChatInternalResult): BroBotLegacyResponse {
  return { ...result };
}

export function serializeWebResponseV2(result: BroBotChatInternalResult): BroBotWebV2Response {
  return { ...result, responseVersion: 2 };
}

export function serializeBroBotResponse(
  contract: BroBotResponseContract,
  result: BroBotChatInternalResult
): BroBotLegacyResponse | BroBotWebV2Response {
  return contract === 'web_v2'
    ? serializeWebResponseV2(result)
    : serializeLegacyResponse(result);
}

export function shouldStreamBroBotResponse(params: {
  contract: BroBotResponseContract;
  requested: boolean;
  serverEnabled: boolean;
}): boolean {
  return params.contract === 'web_v2' && (params.requested || params.serverEnabled);
}
