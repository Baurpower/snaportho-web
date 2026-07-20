'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FormEvent,
  KeyboardEvent,
  memo,
  useCallback,
  type ReactNode,
  type RefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ArrowPathIcon,
  PaperAirplaneIcon,
  SparklesIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  ClipboardDocumentIcon,
  BookOpenIcon,
} from '@heroicons/react/24/outline';

import { useAuth } from '@/context/AuthContext';
import {
  clearPendingBroBotRequest,
  readPendingBroBotRequest,
  savePendingBroBotRequest,
} from '@/lib/brobot/pending-request';
import type {
  BroBotChatMode,
  BroBotChatSource,
  BroBotResponseDepth,
  BroBotTrainingLevel,
} from '@/lib/brobot/chat';
import BroBotMarkdown from './BroBotMarkdown';
import BroBotProductTabs from './BroBotProductTabs';
import ReadingRecommendationsPanel from './ReadingRecommendationsPanel';
import { useChatScrollController } from './useChatScrollController';
import { safeRedirectPath } from '@/lib/auth/redirects';
import { fetchMeEntitlementsView, toWebUsageSnapshot } from '@/lib/brobot/billing-entitlement-state';
import { useBroBotEntitlement } from '@/hooks/useBroBotEntitlement';

type BroBotChatResponse = {
  conversationId: string;
  messageId: string;
  goal?: string;
  selectedFocus?: string;
  answer: string;
  priorityPoints: string[];
  knowledgeGaps: string[];
  whatMostResidentsMiss?: string[];
  suggestedQuestions: string[];
  nextLearningBranches?: BranchOption[];
  tags: string[];
  detectedMode: string;
  remainingFreeUses?: number | null;
  confidence?: number;
  needsClarification?: boolean;
  clarifyingQuestions?: string[];
  assumedContext?: string;
  consultConfidence?: 'low' | 'moderate' | 'high';
  missingInformation?: string[];
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

type BranchOption = {
  id: string;
  label: string;
  description?: string;
  category?: string;
  topicId?: string;
  branchQuestionId?: string;
  rankScore?: number;
  rankPosition?: number;
};

type IntentExpansion = {
  mode: BroBotChatMode;
  subintent: string;
  procedureCategory?: string;
  procedureOrTopic?: string;
  source?: 'local' | 'llm' | 'fallback';
  goal: string;
  ambiguity: 'low' | 'moderate' | 'high';
  confidence: number;
  missingContext: string[];
  branchOptions: BranchOption[];
  answerImmediately: boolean;
  requiresBranchSelection?: boolean;
  reasonForBranching?: string;
};

type ChatMessage =
  | {
      id: string;
      role: 'user';
      content: string;
    }
  | {
      id: string;
      role: 'assistant';
      content: string;
      response: BroBotChatResponse;
      status?: MessageStatus;
      errorMessage?: string;
    };

type ChatRequestState =
  | 'idle'
  | 'classifying_intent'
  | 'awaiting_first_token'
  | 'streaming'
  | 'finalizing'
  | 'complete'
  | 'error';

type MessageStatus = 'pending' | 'streaming' | 'complete' | 'error';

type ChatError =
  | { type: 'auth' }
  | { type: 'quota'; dailyCap?: number | null }
  | { type: 'disabled'; message?: string }
  | { type: 'network' }
  | { type: 'validation'; message?: string }
  | { type: 'unexpected'; message?: string };

type UsageSnapshot = {
  unlimited: boolean;
  dailyCap: number | null;
  remainingToday: number | null;
};

function isSameUsageSnapshot(left: UsageSnapshot | null, right: UsageSnapshot | null) {
  return (
    left?.unlimited === right?.unlimited &&
    left?.dailyCap === right?.dailyCap &&
    left?.remainingToday === right?.remainingToday
  );
}

type PendingIntent = {
  message: string;
  userMessageId: string;
  intent: IntentExpansion;
};

const promptExamples = [
  'I have tibial plateau ORIF tomorrow. Prep me in 3 minutes.',
  'Give me OITE points for SCFE.',
  'What will my attending ask about reverse TSA?',
  'How should I think through a periprosthetic distal femur fracture?',
  'Make this explanation med-student level.',
  'Give me the top 5 things I may be missing.',
];

const modeOptions: { value: BroBotChatMode; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'or_prep', label: 'OR prep' },
  { value: 'oite', label: 'OITE' },
  { value: 'clinic', label: 'Clinic' },
  { value: 'consult', label: 'Consult' },
  { value: 'research', label: 'Research' },
  { value: 'general', label: 'General' },
];

const depthOptions: { value: BroBotResponseDepth; label: string }[] = [
  { value: 'quick', label: 'Quick' },
  { value: 'standard', label: 'Standard' },
  { value: 'deep', label: 'Deep' },
];

const trainingOptions: { value: BroBotTrainingLevel; label: string }[] = [
  { value: 'med_student', label: 'Med student' },
  { value: 'pgy1', label: 'PGY-1' },
  { value: 'pgy2', label: 'PGY-2' },
  { value: 'pgy3', label: 'PGY-3' },
  { value: 'pgy4', label: 'PGY-4' },
  { value: 'pgy5', label: 'PGY-5' },
  { value: 'attending', label: 'Attending' },
];

const COMPOSER_MIN_HEIGHT_INACTIVE = 48;
const COMPOSER_MIN_HEIGHT_ACTIVE = 64;
const COMPOSER_MAX_HEIGHT_MOBILE = 132;
const COMPOSER_MAX_HEIGHT_DESKTOP = 168;
const BROBOT_STREAMING_ENABLED =
  process.env.NEXT_PUBLIC_BROBOT_STREAMING_ENABLED === 'true';

type StreamEvent =
  | { event: 'start'; data: { assistantMessageId?: string; conversationId?: string } }
  | { event: 'delta'; data: { content?: string } }
  | { event: 'metadata'; data: unknown }
  | { event: 'done'; data: { assistantMessageId?: string; conversationId?: string } }
  | { event: 'error'; data: { message?: string } };

function isBroBotChatResponse(value: unknown): value is BroBotChatResponse {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<BroBotChatResponse>;

  return (
    typeof candidate.conversationId === 'string' &&
    typeof candidate.messageId === 'string' &&
    typeof candidate.answer === 'string' &&
    typeof candidate.detectedMode === 'string'
  );
}

function normalizeTextArray(value: unknown, max = 6): string[] {
  const raw = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(/\n|;/)
      : [];
  const seen = new Set<string>();

  return raw
    .map((item) =>
      String(item ?? '')
        .replace(/^[-*]\s*/, '')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/__([^_]+)__/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .trim()
    )
    .filter((item) => {
      const key = item.toLowerCase().replace(/\s+/g, ' ');
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, max);
}

function normalizeChatResponse(value: unknown): BroBotChatResponse | null {
  if (!isBroBotChatResponse(value)) return null;
  const candidate = value as Record<string, unknown>;
  const detectedMode = value.detectedMode === 'fracture_call' ? 'consult' : value.detectedMode;
  const priorityPoints = normalizeTextArray(candidate.priorityPoints, 6);
  const knowledgeGaps = normalizeTextArray(
    candidate.knowledgeGaps,
    detectedMode === 'consult' ? 8 : detectedMode === 'or_prep' ? 5 : 4
  );
  const answer =
    isStructuredFallbackAnswer(value.answer) && priorityPoints.length > 0
      ? synthesizeDisplayAnswer(priorityPoints)
      : value.answer;

  return {
    conversationId: value.conversationId,
    messageId: value.messageId,
    goal: typeof candidate.goal === 'string' ? candidate.goal.trim() : '',
    selectedFocus:
      typeof candidate.selectedFocus === 'string' ? candidate.selectedFocus.trim() : '',
    answer,
    priorityPoints,
    knowledgeGaps,
    whatMostResidentsMiss: normalizeTextArray(candidate.whatMostResidentsMiss, 5),
    suggestedQuestions: normalizeTextArray(candidate.suggestedQuestions, 7),
    nextLearningBranches: normalizeBranchOptions(candidate.nextLearningBranches),
    tags: normalizeTextArray(candidate.tags, 8),
    detectedMode,
    remainingFreeUses: value.remainingFreeUses,
    confidence: typeof value.confidence === 'number' ? value.confidence : undefined,
    needsClarification: Boolean(candidate.needsClarification),
    clarifyingQuestions: normalizeTextArray(candidate.clarifyingQuestions, 3),
    assumedContext:
      typeof candidate.assumedContext === 'string' ? candidate.assumedContext.trim() : '',
    consultConfidence:
      candidate.consultConfidence === 'low' ||
      candidate.consultConfidence === 'moderate' ||
      candidate.consultConfidence === 'high'
        ? candidate.consultConfidence
        : undefined,
    missingInformation: normalizeTextArray(candidate.missingInformation, 8),
    tier: candidate.tier === 1 || candidate.tier === 2 || candidate.tier === 3 ? candidate.tier : undefined,
    status: candidate.status === 'answer' || candidate.status === 'clarify' ? candidate.status : undefined,
    directAnswer: typeof candidate.directAnswer === 'string' ? candidate.directAnswer : undefined,
    keyPoints: normalizeTextArray(candidate.keyPoints, 5),
    pearl: typeof candidate.pearl === 'string' ? candidate.pearl : undefined,
    pitfall: typeof candidate.pitfall === 'string' ? candidate.pitfall : undefined,
    clarifyingQuestion:
      typeof candidate.clarifyingQuestion === 'string' ? candidate.clarifyingQuestion : undefined,
    specialty: typeof candidate.specialty === 'string' ? candidate.specialty : undefined,
    resolvedTopic: typeof candidate.resolvedTopic === 'string' ? candidate.resolvedTopic : undefined,
    entityResolutionState:
      typeof candidate.entityResolutionState === 'string' ? candidate.entityResolutionState : undefined,
  };
}

function createStreamingPlaceholder(id: string, conversationId: string | null): BroBotChatResponse {
  return {
    conversationId: conversationId ?? '',
    messageId: id,
    goal: '',
    selectedFocus: '',
    answer: '',
    priorityPoints: [],
    knowledgeGaps: [],
    whatMostResidentsMiss: [],
    suggestedQuestions: [],
    nextLearningBranches: [],
    tags: [],
    detectedMode: 'general',
    confidence: undefined,
    needsClarification: false,
    clarifyingQuestions: [],
    assumedContext: '',
    missingInformation: [],
  };
}

function parseStreamEvents(buffer: string): { events: StreamEvent[]; rest: string } {
  const events: StreamEvent[] = [];
  const parts = buffer.split('\n\n');
  const rest = parts.pop() ?? '';

  for (const part of parts) {
    const lines = part.split('\n');
    const eventLine = lines.find((line) => line.startsWith('event:'));
    const dataLine = lines.find((line) => line.startsWith('data:'));
    const event = eventLine?.replace(/^event:\s*/, '').trim();
    const rawData = dataLine?.replace(/^data:\s*/, '') ?? '{}';

    if (
      event !== 'start' &&
      event !== 'delta' &&
      event !== 'metadata' &&
      event !== 'done' &&
      event !== 'error'
    ) {
      continue;
    }

    try {
      events.push({
        event,
        data: JSON.parse(rawData),
      } as StreamEvent);
    } catch {
      events.push({
        event: 'error',
        data: { message: 'BroBot returned a malformed stream event.' },
      });
    }
  }

  return { events, rest };
}

function normalizeBranchOptions(value: unknown): BranchOption[] {
  const raw = Array.isArray(value) ? value : [];
  const seen = new Set<string>();

  return raw
    .map((item) => {
      const record = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
      const label = typeof record.label === 'string' ? record.label.trim() : '';
      const id =
        typeof record.id === 'string' && record.id.trim()
          ? record.id.trim()
          : label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

      return {
        id,
        label,
        description:
          typeof record.description === 'string' && record.description.trim()
            ? record.description.trim()
            : undefined,
        category:
          typeof record.category === 'string' && record.category.trim()
            ? record.category.trim()
            : undefined,
        topicId:
          typeof record.topicId === 'string' && record.topicId.trim()
            ? record.topicId.trim()
            : undefined,
        branchQuestionId:
          typeof record.branchQuestionId === 'string' && record.branchQuestionId.trim()
            ? record.branchQuestionId.trim()
            : undefined,
        rankScore:
          typeof record.rankScore === 'number' && Number.isFinite(record.rankScore)
            ? record.rankScore
            : undefined,
      };
    })
    .filter((option) => {
      if (!option.id || !option.label || seen.has(option.id)) return false;
      seen.add(option.id);
      return true;
    })
    .slice(0, 7);
}

function normalizeIntentExpansion(value: unknown): IntentExpansion | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Record<string, unknown>;
  const mode = candidate.mode === 'fracture_call' ? 'consult' : candidate.mode;
  const ambiguity = candidate.ambiguity;

  if (
    !(
      mode === 'or_prep' ||
      mode === 'oite' ||
      mode === 'clinic' ||
      mode === 'consult' ||
      mode === 'research' ||
      mode === 'general'
    ) ||
    !(ambiguity === 'low' || ambiguity === 'moderate' || ambiguity === 'high')
  ) {
    return null;
  }

  return {
    mode,
    subintent: typeof candidate.subintent === 'string' ? candidate.subintent : 'other',
    procedureCategory:
      typeof candidate.procedureCategory === 'string'
        ? candidate.procedureCategory.trim()
        : undefined,
    procedureOrTopic:
      typeof candidate.procedureOrTopic === 'string'
        ? candidate.procedureOrTopic.trim()
        : undefined,
    source:
      candidate.source === 'local' || candidate.source === 'llm' || candidate.source === 'fallback'
        ? candidate.source
        : undefined,
    goal: typeof candidate.goal === 'string' ? candidate.goal.trim() : '',
    ambiguity,
    confidence:
      typeof candidate.confidence === 'number'
        ? Math.min(1, Math.max(0, candidate.confidence))
        : 0.5,
    missingContext: normalizeTextArray(candidate.missingContext, 6),
    branchOptions: normalizeBranchOptions(candidate.branchOptions),
    answerImmediately: Boolean(candidate.answerImmediately),
    requiresBranchSelection: Boolean(candidate.requiresBranchSelection),
    reasonForBranching:
      typeof candidate.reasonForBranching === 'string'
        ? candidate.reasonForBranching.trim()
        : '',
  };
}

function isStructuredFallbackAnswer(answer: string) {
  return /could not format a structured response|could not be structured cleanly/i.test(answer);
}

function isUsefulAssumedContext(value: string | undefined): boolean {
  const normalized = String(value ?? '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) return false;

  const genericAssumptions = [
    'the learner is preparing for a surgical procedure',
    'the user is asking about orthopaedics',
    'the learner wants information',
    'the user is asking for an overview',
    'i can sharpen this if you pick a learning branch',
    'the learner is preparing for surgery',
  ];

  return !genericAssumptions.some((phrase) => normalized.includes(phrase));
}

function synthesizeDisplayAnswer(priorityPoints: string[]) {
  return priorityPoints.slice(0, 3).map((point) => `- ${point}`).join('\n');
}

export default function BroBotChatPage() {
  const router = useRouter();
  const { user, loading: authLoading, status: authStatus } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<BroBotChatMode>('auto');
  const [responseDepth, setResponseDepth] = useState<BroBotResponseDepth>('standard');
  const [trainingLevel, setTrainingLevel] = useState<BroBotTrainingLevel>('pgy2');
  const [requestState, setRequestState] = useState<ChatRequestState>('idle');
  const [error, setError] = useState<ChatError | null>(null);
  const [usage, setUsage] = useState<UsageSnapshot | null>(null);
  const {
    usage: memberUsage,
    isUnlimited,
    refresh: refreshEntitlements,
    loading: entitlementLoading,
  } = useBroBotEntitlement('brobot_chat');
  const [pendingIntent, setPendingIntent] = useState<PendingIntent | null>(null);
  const [lastFailedPrompt, setLastFailedPrompt] = useState<string | null>(null);
  const [restoredPendingPrompt, setRestoredPendingPrompt] = useState(false);
  const messagesViewportRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const activeRequestControllerRef = useRef<AbortController | null>(null);
  const isRequestActive =
    requestState === 'classifying_intent' ||
    requestState === 'awaiting_first_token' ||
    requestState === 'streaming' ||
    requestState === 'finalizing';

  const latestAssistant = useMemo(
    () => [...messages].reverse().find((message) => message.role === 'assistant'),
    [messages]
  );
  const hasActiveAssistantMessage =
    latestAssistant?.role === 'assistant' &&
    (latestAssistant.status === 'pending' || latestAssistant.status === 'streaming');
  const showGlobalLoading =
    (requestState === 'classifying_intent' || requestState === 'awaiting_first_token') &&
    !hasActiveAssistantMessage;
  const showConversationError = Boolean(error) && !hasActiveAssistantMessage;
  const showLatestFollowUps =
    latestAssistant?.role === 'assistant' &&
    latestAssistant.status === 'complete' &&
    !isRequestActive;
  const hasConversation = messages.length > 0;

  const scrollContentVersion = useMemo(
    () =>
      [
        messages.length,
        messages[messages.length - 1]?.id ?? 'empty',
        requestState,
        error?.type ?? 'no-error',
        pendingIntent ? pendingIntent.userMessageId : 'no-intent',
        latestAssistant?.role === 'assistant'
          ? `${latestAssistant.id}:${latestAssistant.content.length}:${latestAssistant.status ?? 'complete'}:${latestAssistant.response.nextLearningBranches?.length ?? 0}:${latestAssistant.response.suggestedQuestions.length}`
          : 'no-assistant',
      ].join('|'),
    [messages, requestState, error, pendingIntent, latestAssistant]
  );

  const {
    showNewMessagesButton,
    scrollToBottom,
    resetScrollState,
  } = useChatScrollController({
    viewportRef: messagesViewportRef,
    contentVersion: scrollContentVersion,
    activeAssistantId: latestAssistant?.role === 'assistant' ? latestAssistant.id : null,
  });

  useEffect(() => {
    const previousScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    messagesViewportRef.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' });

    return () => {
      window.history.scrollRestoration = previousScrollRestoration;
    };
  }, []);

  useEffect(
    () => () => {
      activeRequestControllerRef.current?.abort();
    },
    []
  );

  useEffect(() => {
    if (authStatus === 'loading') {
      setUsage(null);
      return;
    }

    if (authStatus === 'authenticated') {
      setUsage((current) => (isSameUsageSnapshot(current, memberUsage) ? current : memberUsage));
      return;
    }

    let isMounted = true;

    async function loadGuestUsage() {
      try {
        const view = await fetchMeEntitlementsView({ source: 'brobot_chat_guest' });
        if (!isMounted || !view) return;
        setUsage(toWebUsageSnapshot(view));
      } catch {
        // Non-critical. The chat response updates this after a successful call.
      }
    }

    void loadGuestUsage();

    return () => {
      isMounted = false;
    };
  }, [authStatus, memberUsage]);

  useEffect(() => {
    if (authStatus !== 'authenticated') return;

    const pending = readPendingBroBotRequest();
    if (!pending) return;

    setInput(pending.prompt);
    setMode(pending.mode);
    setResponseDepth(pending.responseDepth);
    setTrainingLevel(pending.trainingLevel);
    setRestoredPendingPrompt(true);
    setError(null);
    clearPendingBroBotRequest();

    requestAnimationFrame(() => textareaRef.current?.focus());
  }, [authStatus]);

  function redirectToSignInWithPendingRequest(message: string) {
    const sourceRoute = safeRedirectPath(
      typeof window !== 'undefined'
        ? `${window.location.pathname}${window.location.search}`
        : '/brobot/chat',
      '/brobot/chat'
    );
    savePendingBroBotRequest({
      prompt: message,
      mode,
      responseDepth,
      trainingLevel,
      sourceRoute,
    });
    setError({ type: 'auth' });
    const params = new URLSearchParams({ redirectTo: sourceRoute, intent: 'brobot' });
    router.push(`/auth/sign-in?${params.toString()}`);
  }

  async function pollForEnrichment(messageId: string) {
    for (const delayMs of [5_000, 15_000, 30_000, 60_000, 90_000]) {
      await new Promise((resolve) => window.setTimeout(resolve, delayMs));
      const response = await fetch(`/api/brobot/messages/${messageId}/enrichment`, {
        credentials: 'include',
      }).catch(() => null);
      if (!response?.ok) return;
      const enrichment = await response.json().catch(() => null);
      if (!enrichment || enrichment.status !== 'completed') continue;
      setMessages((current) =>
        current.map((message) =>
          message.role === 'assistant' && message.response.messageId === messageId
            ? {
                ...message,
                response: {
                  ...message.response,
                  suggestedQuestions: normalizeTextArray(enrichment.suggestedQuestions, 3),
                  nextLearningBranches: normalizeBranchOptions(enrichment.nextLearningBranches),
                  tags: normalizeTextArray(enrichment.tags, 6),
                },
              }
            : message
        )
      );
      return;
    }
  }

  async function sendMessage(
    rawMessage?: string,
    source: BroBotChatSource = 'manual',
    sourceMessageId?: string,
    selectedBranch?: BranchOption,
    answerNow = false
  ) {
    const submittedPrompt = (rawMessage ?? input).trim();
    if (!submittedPrompt || isRequestActive) return;
    const requestController = new AbortController();
    activeRequestControllerRef.current?.abort();
    activeRequestControllerRef.current = requestController;

    const shouldAppendUserMessage = source !== 'branch_selection' && source !== 'answer_now';
    const optimisticUserMessage: ChatMessage | null = shouldAppendUserMessage
      ? {
          id: crypto.randomUUID(),
          role: 'user',
          content: submittedPrompt,
        }
      : null;

    if (optimisticUserMessage) {
      setMessages((current) => [...current, optimisticUserMessage]);
    }
    setRestoredPendingPrompt(false);
    setInput('');
    setLastFailedPrompt(null);
    setError(null);
    setRequestState(
      source === 'manual' || source === 'example_prompt'
        ? 'classifying_intent'
        : 'awaiting_first_token'
    );
    let streamingAssistantId: string | null = null;
    let didReceiveStreamingContent = false;

    try {
      if (source === 'manual' || source === 'example_prompt') {
        const intentRes = await fetch('/api/brobot/intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          signal: requestController.signal,
          body: JSON.stringify({
            prompt: submittedPrompt,
            message: submittedPrompt,
            mode,
            responseDepth,
            trainingLevel,
            conversationId: conversationId ?? undefined,
          }),
        });
        const intentBody = await intentRes.json().catch(() => null);

        if (!intentRes.ok) {
          setMessages((current) =>
            optimisticUserMessage
              ? current.filter((chatMessage) => chatMessage.id !== optimisticUserMessage.id)
              : current
          );
          setRequestState('error');

          if (intentRes.status === 401) {
            setLastFailedPrompt(submittedPrompt);
            redirectToSignInWithPendingRequest(submittedPrompt);
            return;
          }

          if (intentRes.status === 429 || intentBody?.isLimitReached) {
            if (!isUnlimited) {
              setUsage((current) =>
                current ? { ...current, remainingToday: 0 } : current
              );
              setLastFailedPrompt(submittedPrompt);
              setError({ type: 'quota', dailyCap: intentBody?.dailyCap ?? null });
            } else {
              void refreshEntitlements();
              setLastFailedPrompt(submittedPrompt);
              setError({ type: 'unexpected', message: 'BroBot access is still activating. Please try again.' });
            }
            return;
          }

          if (intentRes.status === 403) {
            setLastFailedPrompt(submittedPrompt);
            setError({ type: 'disabled', message: intentBody?.message ?? intentBody?.error });
            return;
          }

          setLastFailedPrompt(submittedPrompt);
          setError({ type: 'unexpected', message: intentBody?.message ?? intentBody?.error });
          return;
        }

        const intent = normalizeIntentExpansion(intentBody);
        if (
          intent &&
          (!intent.answerImmediately || intent.requiresBranchSelection) &&
          intent.branchOptions.length > 0
        ) {
          setPendingIntent({
            message: submittedPrompt,
            userMessageId: optimisticUserMessage?.id ?? crypto.randomUUID(),
            intent,
          });
          setMode(intent.mode);
          setRequestState('complete');
          return;
        }
      }

      streamingAssistantId = BROBOT_STREAMING_ENABLED ? crypto.randomUUID() : null;
      if (streamingAssistantId) {
        const assistantId = streamingAssistantId;
        setMessages((current) => [
          ...current,
          {
            id: assistantId,
            role: 'assistant',
            content: '',
            response: createStreamingPlaceholder(assistantId, conversationId),
            status: 'pending',
          },
        ]);
        setRequestState('awaiting_first_token');
      } else {
        setRequestState('awaiting_first_token');
      }

      const chatRequestBody = {
        conversationId: conversationId ?? undefined,
        prompt: submittedPrompt,
        message: submittedPrompt,
        mode,
        responseDepth,
        trainingLevel,
        source,
        sourceMessageId,
        selectedBranchId: selectedBranch?.id,
        selectedBranchLabel: selectedBranch?.label,
        selectedBranchRankPosition: selectedBranch?.rankPosition,
        intentMode: pendingIntent?.intent.mode,
        intentSubintent: pendingIntent?.intent.subintent,
        intentProcedureOrTopic: pendingIntent?.intent.procedureOrTopic || submittedPrompt,
        intentProcedureCategory: pendingIntent?.intent.procedureCategory,
        intentAmbiguity: pendingIntent?.intent.ambiguity,
        intentReasonForBranching: pendingIntent?.intent.reasonForBranching,
        intentSource: pendingIntent?.intent.source,
        answerNow,
        stream: Boolean(streamingAssistantId),
      };

      if (process.env.NODE_ENV !== 'production') {
        console.log('[BROBOT_CHAT_SUBMIT_BODY]', {
          keys: Object.keys(chatRequestBody),
          promptLength: chatRequestBody.prompt?.length,
          messageLength: chatRequestBody.message?.length,
          mode: chatRequestBody.mode,
          depth: chatRequestBody.responseDepth,
          level: chatRequestBody.trainingLevel,
        });
      }

      const res = await fetch('/api/brobot/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-SnapOrtho-Client': 'web',
          'X-BroBot-Response-Version': '2',
        },
        credentials: 'include',
        signal: requestController.signal,
        body: JSON.stringify(chatRequestBody),
      });

      if (streamingAssistantId && res.headers.get('content-type')?.includes('text/event-stream')) {
        if (!res.ok || !res.body) {
          throw new Error('BroBot streaming response was not available.');
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let didReceiveMetadata = false;
        let enrichmentMessageId: string | null = null;

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parsed = parseStreamEvents(buffer);
          buffer = parsed.rest;

          for (const streamEvent of parsed.events) {
            if (streamEvent.event === 'start') {
              setRequestState('awaiting_first_token');
              if (streamEvent.data.conversationId) {
                setConversationId(streamEvent.data.conversationId);
              }
              setMessages((current) =>
                current.map((chatMessage) =>
                  chatMessage.id === streamingAssistantId && chatMessage.role === 'assistant'
                    ? {
                        ...chatMessage,
                        status: 'pending',
                        response: {
                          ...chatMessage.response,
                          conversationId:
                            streamEvent.data.conversationId ?? chatMessage.response.conversationId,
                          messageId:
                            streamEvent.data.assistantMessageId ?? chatMessage.response.messageId,
                        },
                      }
                    : chatMessage
                )
              );
              continue;
            }

            if (streamEvent.event === 'delta') {
              const delta = streamEvent.data.content ?? '';
              if (!delta) continue;
              didReceiveStreamingContent = true;
              setRequestState('streaming');

              setMessages((current) =>
                current.map((chatMessage) =>
                  chatMessage.id === streamingAssistantId && chatMessage.role === 'assistant'
                    ? {
                        ...chatMessage,
                        content: `${chatMessage.content}${delta}`,
                        status: 'streaming',
                        response: {
                          ...chatMessage.response,
                          answer: `${chatMessage.response.answer}${delta}`,
                        },
                      }
                    : chatMessage
                )
              );
              continue;
            }

            if (streamEvent.event === 'metadata') {
              setRequestState('finalizing');
              const normalizedMetadata = normalizeChatResponse(streamEvent.data);
              if (!normalizedMetadata) continue;
              didReceiveMetadata = true;
              enrichmentMessageId = normalizedMetadata.messageId;

              setConversationId(normalizedMetadata.conversationId);
              const remainingFreeUses = normalizedMetadata.remainingFreeUses;
              if (typeof remainingFreeUses === 'number' || remainingFreeUses === null) {
                setUsage((current) =>
                  current
                    ? { ...current, remainingToday: remainingFreeUses ?? current.remainingToday }
                    : {
                        unlimited: remainingFreeUses === null,
                        dailyCap: null,
                        remainingToday: remainingFreeUses,
                      }
                );
              }

              setMessages((current) =>
                current.map((chatMessage) =>
                  chatMessage.id === streamingAssistantId && chatMessage.role === 'assistant'
                    ? {
                        ...chatMessage,
                        content: normalizedMetadata.answer,
                        response: normalizedMetadata,
                        status: 'complete',
                      }
                    : chatMessage
                )
              );
              continue;
            }

            if (streamEvent.event === 'done') {
              setRequestState('complete');
              setMessages((current) =>
                current.map((chatMessage) =>
                  chatMessage.id === streamingAssistantId && chatMessage.role === 'assistant'
                    ? { ...chatMessage, status: 'complete' }
                    : chatMessage
                )
              );
              continue;
            }

            if (streamEvent.event === 'error') {
              setRequestState('error');
              setLastFailedPrompt(submittedPrompt);
              setMessages((current) =>
                current.map((chatMessage) =>
                  chatMessage.id === streamingAssistantId && chatMessage.role === 'assistant'
                    ? {
                        ...chatMessage,
                        status: 'error',
                        errorMessage:
                          streamEvent.data.message ??
                          'Response interrupted. Please retry if you need the full answer.',
                      }
                    : chatMessage
                )
              );
            }
          }
        }

        if (!didReceiveMetadata) {
          throw new Error('BroBot stream ended before the response was finalized.');
        }
        if (process.env.NODE_ENV !== 'production') {
          console.log('[BROBOT_STREAM_CLIENT]', {
            transport: didReceiveStreamingContent ? 'streaming' : 'buffered_fallback',
            finalized: true,
          });
        }
        setPendingIntent(null);
        setRequestState((current) => (current === 'error' ? current : 'complete'));
        if (enrichmentMessageId) void pollForEnrichment(enrichmentMessageId);
        return;
      }

      const body = await res.json().catch(() => null);

      if (!res.ok) {
        setMessages((current) =>
          optimisticUserMessage
            ? current.filter(
                (chatMessage) =>
                  chatMessage.id !== optimisticUserMessage.id &&
                  chatMessage.id !== streamingAssistantId
              )
            : current.filter((chatMessage) => chatMessage.id !== streamingAssistantId)
        );
        setRequestState('error');

        if (res.status === 401) {
          setLastFailedPrompt(submittedPrompt);
          redirectToSignInWithPendingRequest(submittedPrompt);
          return;
        }

        if (res.status === 429 || body?.isLimitReached) {
          if (!isUnlimited) {
            setUsage((current) =>
              current ? { ...current, remainingToday: 0 } : current
            );
            setLastFailedPrompt(submittedPrompt);
            setError({ type: 'quota', dailyCap: body?.dailyCap ?? null });
          } else {
            void refreshEntitlements();
            setLastFailedPrompt(submittedPrompt);
            setError({ type: 'unexpected', message: 'BroBot access is still activating. Please try again.' });
          }
          return;
        }

        if (res.status === 403) {
          setLastFailedPrompt(submittedPrompt);
          setError({ type: 'disabled', message: body?.message ?? body?.error });
          return;
        }

        if (res.status === 400) {
          setLastFailedPrompt(submittedPrompt);
          setError({ type: 'validation', message: body?.message ?? body?.error });
          return;
        }

        setLastFailedPrompt(submittedPrompt);
        setError({ type: 'unexpected', message: body?.message ?? body?.error });
        return;
      }

      const normalizedBody = normalizeChatResponse(body);
      if (!normalizedBody) {
        setMessages((current) =>
          optimisticUserMessage
            ? current.filter(
                (chatMessage) =>
                  chatMessage.id !== optimisticUserMessage.id &&
                  chatMessage.id !== streamingAssistantId
              )
            : current.filter((chatMessage) => chatMessage.id !== streamingAssistantId)
        );
        setLastFailedPrompt(submittedPrompt);
        setError({ type: 'unexpected', message: 'BroBot returned an unexpected response.' });
        setRequestState('error');
        return;
      }

      setConversationId(normalizedBody.conversationId);

      const remainingFreeUses = normalizedBody.remainingFreeUses;
      if (typeof remainingFreeUses === 'number' || remainingFreeUses === null) {
        setUsage((current) =>
          current
            ? { ...current, remainingToday: remainingFreeUses ?? current.remainingToday }
            : {
                unlimited: remainingFreeUses === null,
                dailyCap: null,
                remainingToday: remainingFreeUses,
              }
        );
      }

      setMessages((current) => {
        if (streamingAssistantId) {
          return current.map((chatMessage) =>
            chatMessage.id === streamingAssistantId && chatMessage.role === 'assistant'
              ? {
                  ...chatMessage,
                  content: normalizedBody.answer,
                  response: normalizedBody,
                  status: 'complete',
                }
              : chatMessage
          );
        }

        return [
          ...current,
          {
            id: normalizedBody.messageId,
            role: 'assistant',
            content: normalizedBody.answer,
            response: normalizedBody,
            status: 'complete',
          },
        ];
      });
      setPendingIntent(null);
      setRequestState('complete');
      void pollForEnrichment(normalizedBody.messageId);
    } catch (caughtError) {
      if (caughtError instanceof DOMException && caughtError.name === 'AbortError') {
        return;
      }
      setRequestState('error');
      if (streamingAssistantId && didReceiveStreamingContent) {
        setMessages((current) =>
          current.map((chatMessage) =>
            chatMessage.id === streamingAssistantId && chatMessage.role === 'assistant'
              ? {
                  ...chatMessage,
                  status: 'error' as const,
                  errorMessage: 'Response interrupted. Please retry if you need the full answer.',
                }
              : chatMessage
          )
        );
        setLastFailedPrompt(submittedPrompt);
      } else {
        setMessages((current) =>
          current.filter((chatMessage) => {
            if (optimisticUserMessage && chatMessage.id === optimisticUserMessage.id) {
              return false;
            }

            if (streamingAssistantId && chatMessage.id === streamingAssistantId) {
              return false;
            }

            return true;
          })
        );
        setLastFailedPrompt(submittedPrompt);
        setError({ type: 'network' });
      }
    } finally {
      if (activeRequestControllerRef.current === requestController) {
        activeRequestControllerRef.current = null;
      }
      setRequestState((current) =>
        current === 'classifying_intent' ||
        current === 'awaiting_first_token' ||
        current === 'streaming' ||
        current === 'finalizing'
          ? 'complete'
          : current
      );
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || event.shiftKey) return;
    event.preventDefault();
    void sendMessage();
  }

  function continueFromIntent(branch?: BranchOption, answerNow = false) {
    if (!pendingIntent || isRequestActive) return;
    void sendMessage(
      pendingIntent.message,
      answerNow ? 'answer_now' : 'branch_selection',
      pendingIntent.userMessageId,
      branch,
      answerNow
    );
    setPendingIntent(null);
  }

  function retryAssistantMessage(messageId: string) {
    if (isRequestActive) return;

    if (lastFailedPrompt?.trim()) {
      void sendMessage(lastFailedPrompt, 'manual');
      return;
    }

    const assistantIndex = messages.findIndex((message) => message.id === messageId);
    if (assistantIndex < 1) return;

    const previousUserMessage = [...messages]
      .slice(0, assistantIndex)
      .reverse()
      .find((message) => message.role === 'user');

    if (!previousUserMessage) return;
    void sendMessage(previousUserMessage.content, 'manual');
  }

  function startNewChat() {
    if (isRequestActive) return;

    setMessages([]);
    setConversationId(null);
    setInput('');
    setError(null);
    setPendingIntent(null);
    setLastFailedPrompt(null);
    setRestoredPendingPrompt(false);
    setRequestState('idle');
    resetScrollState();
  }

  return (
    <div className="fixed inset-0 z-10 overflow-hidden bg-[#fefcf7] text-[#1A1C2C]">
      <main className="mx-auto flex h-[100dvh] w-full max-w-[1180px] flex-col box-border px-3 pt-16 sm:px-5 sm:pt-[4.75rem] lg:px-6">
        <header
          className={`shrink-0 border-b border-slate-200/80 ${
            hasConversation ? 'pb-2' : 'pb-2.5 sm:pb-3'
          }`}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <h1 className="text-xl font-extrabold tracking-tight text-midnight sm:text-2xl">
                  BroBot Chat
                </h1>
                <BroBotProductTabs compact />
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {hasConversation && (
                <button
                  type="button"
                  onClick={startNewChat}
                  disabled={isRequestActive}
                  className="shrink-0 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  New Chat
                </button>
              )}
              <BroBotUsageBanner usage={usage} loading={authStatus === 'authenticated' && entitlementLoading} />
            </div>
          </div>
        </header>

        <section className="relative flex min-h-0 flex-1 flex-col">
          <div
            ref={messagesViewportRef}
            tabIndex={0}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 py-3 outline-none [scrollbar-gutter:stable] sm:px-2 sm:py-4"
          >
            <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col">
              <div className="flex-1">
                {messages.length === 0 && !isRequestActive ? (
                  <BroBotEmptyState
                    disabled={isRequestActive}
                    onPickPrompt={(prompt) => void sendMessage(prompt, 'example_prompt')}
                    showSignInNotice={!authLoading && !user}
                  />
                ) : (
                  <BroBotMessageList
                    messages={messages}
                    onRetryAssistant={(messageId) => retryAssistantMessage(messageId)}
                    onPickClarification={(question, sourceMessageId) =>
                      void sendMessage(question, 'clarification_question', sourceMessageId)
                    }
                  />
                )}

                {pendingIntent && !isRequestActive && (
                  <BroBotIntentCard
                    pendingIntent={pendingIntent}
                    onSelectBranch={(branch) => continueFromIntent(branch)}
                    onAnswerNow={() => continueFromIntent(undefined, true)}
                  />
                )}

                {showGlobalLoading && <LoadingMessage />}

                {showConversationError && error && (
                  <div className="mt-5">
                    <BroBotChatError
                      error={error}
                      isAuthenticated={Boolean(user)}
                      onRetry={() => {
                        if (lastFailedPrompt?.trim()) {
                          void sendMessage(lastFailedPrompt, 'manual');
                          return;
                        }

                        setError(null);
                      }}
                    />
                  </div>
                )}

                {restoredPendingPrompt && !isRequestActive && !error && (
                  <div className="mt-5 rounded-xl border border-teal-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h2 className="text-sm font-bold text-midnight">Ready to continue BroBot</h2>
                        <p className="mt-1 text-sm leading-5 text-slate-600">
                          Your pending prompt is back in the composer.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setRestoredPendingPrompt(false);
                          textareaRef.current?.focus();
                        }}
                        className="rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
                      >
                        Continue BroBot
                      </button>
                    </div>
                  </div>
                )}

                {showLatestFollowUps && latestAssistant?.role === 'assistant' && (
                  <BroBotNextLearningBranches
                    branches={latestAssistant.response.nextLearningBranches ?? []}
                    fallbackQuestions={latestAssistant.response.suggestedQuestions}
                    mode={latestAssistant.response.detectedMode}
                    conversationId={latestAssistant.response.conversationId}
                    sourceMessageId={latestAssistant.response.messageId}
                    trainingLevel={trainingLevel}
                    canShowReadingPanel={Boolean(user)}
                    onPickBranch={(branch, sourceMessageId) =>
                      void sendMessage(
                        branch.label,
                        'branch_selection',
                        sourceMessageId,
                        branch
                      )
                    }
                  />
                )}
              </div>
            </div>
          </div>

          {showNewMessagesButton && (
            <button
              type="button"
              onClick={() => scrollToBottom('smooth')}
              className="absolute bottom-4 left-1/2 z-30 -translate-x-1/2 rounded-full border border-teal-200 bg-white px-4 py-2 text-sm font-bold text-teal-700 shadow-lg shadow-slate-900/10 transition hover:bg-teal-50"
            >
              New messages ↓
            </button>
          )}
        </section>

        <BroBotChatComposer
          input={input}
          setInput={setInput}
          isRequestActive={isRequestActive}
          mode={mode}
          setMode={setMode}
          responseDepth={responseDepth}
          setResponseDepth={setResponseDepth}
          trainingLevel={trainingLevel}
          setTrainingLevel={setTrainingLevel}
          textareaRef={textareaRef}
          onSubmit={handleSubmit}
          onKeyDown={handleKeyDown}
        />
      </main>
    </div>
  );
}

function BroBotIntentCard({
  pendingIntent,
  onSelectBranch,
  onAnswerNow,
}: {
  pendingIntent: PendingIntent;
  onSelectBranch: (branch: BranchOption) => void;
  onAnswerNow: () => void;
}) {
  const { intent } = pendingIntent;

  return (
    <section className="mt-5 max-w-3xl rounded-2xl border border-teal-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700">
          Detected Mode: {formatMode(intent.mode)}
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-600">
          {intent.ambiguity} ambiguity
        </span>
        <span className="text-xs text-slate-400">
          {Math.round(intent.confidence * 100)}% intent confidence
        </span>
      </div>

      <div className="mt-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Likely Goal</h2>
        <p className="mt-1 text-base font-semibold leading-6 text-midnight">
          {intent.goal || 'Choose the learning branch you want BroBot to prioritize.'}
        </p>
        <p className="mt-2 text-sm leading-5 text-slate-600">
          Choose your focus for a sharper answer.
        </p>
      </div>

      {intent.reasonForBranching && (
        <div className="mt-4 rounded-xl border border-sky-100 bg-sky-50/70 px-3 py-3">
          <h3 className="text-xs font-bold uppercase tracking-wide text-sky-700">
            Why this matters
          </h3>
          <p className="mt-1.5 text-sm leading-5 text-slate-700">
            This topic changes depending on {intent.reasonForBranching}.
          </p>
        </div>
      )}

      {intent.missingContext.length > 0 && (
        <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50/70 px-3 py-3">
          <h3 className="text-xs font-bold uppercase tracking-wide text-amber-700">
            Missing Context
          </h3>
          <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {intent.missingContext.map((item) => (
              <li key={item} className="text-sm leading-5 text-amber-950">
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">
          Choose your focus
        </h3>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {intent.branchOptions.map((branch) => (
            <button
              key={branch.id}
              type="button"
              onClick={() => onSelectBranch(branch)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-teal-300 hover:bg-teal-50"
            >
              <div className="text-sm font-bold text-midnight">{branch.label}</div>
              {branch.description && (
                <div className="mt-1 text-xs leading-5 text-slate-500">
                  {branch.description}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onAnswerNow}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Answer Now
        </button>
      </div>
    </section>
  );
}

function BroBotEmptyState({
  disabled,
  onPickPrompt,
  showSignInNotice,
}: {
  disabled: boolean;
  onPickPrompt: (prompt: string) => void;
  showSignInNotice: boolean;
}) {
  return (
    <div className="mx-auto max-w-3xl py-4 sm:py-6">
      {showSignInNotice && (
        <div className="mb-3 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-900">
          You can try BroBot Chat as a guest. Sign in to save conversations or unlock more usage.
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="flex items-start gap-2.5">
          <div className="rounded-full bg-teal-50 p-1.5 text-teal-700">
            <SparklesIcon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-midnight">Start with an ortho question</h2>
            <p className="mt-0.5 text-sm leading-5 text-slate-600">
              Use Chat for reasoning, prioritization, OITE review, attending-style questions, and fast “what am I missing?” checks.
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {promptExamples.map((prompt) => (
            <button
              key={prompt}
              type="button"
              disabled={disabled}
              onClick={() => onPickPrompt(prompt)}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold leading-4 text-slate-700 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-900 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const BroBotMessageList = memo(function BroBotMessageList({
  messages,
  onRetryAssistant,
  onPickClarification,
}: {
  messages: ChatMessage[];
  onRetryAssistant: (messageId: string) => void;
  onPickClarification: (question: string, sourceMessageId: string) => void;
}) {
  return (
    <div className="space-y-6">
      {messages.map((message) => (
        <div
          key={message.id}
          data-chat-scroll-anchor="true"
          data-chat-scroll-id={message.id}
        >
          {message.role === 'user' ? (
            <UserMessage content={message.content} />
          ) : (
            <AssistantMessage
              response={message.response}
              status={message.status}
              errorMessage={message.errorMessage}
              onRetry={() => onRetryAssistant(message.id)}
              onPickClarification={onPickClarification}
            />
          )}
        </div>
      ))}
    </div>
  );
});

const UserMessage = memo(function UserMessage({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[88%] rounded-2xl rounded-br-md bg-teal-600 px-4 py-3 text-sm leading-6 text-white shadow-sm sm:max-w-[72%]">
        {content}
      </div>
    </div>
  );
});

const AssistantMessage = memo(function AssistantMessage({
  response,
  status,
  errorMessage,
  onRetry,
  onPickClarification,
}: {
  response: BroBotChatResponse;
  status?: MessageStatus;
  errorMessage?: string;
  onRetry: () => void;
  onPickClarification: (question: string, sourceMessageId: string) => void;
}) {
  return (
    <div className="group flex justify-start">
      <div className="w-full max-w-3xl">
        <BroBotAssistantResponse
          response={response}
          status={status}
          errorMessage={errorMessage}
          onRetry={onRetry}
          onPickClarification={onPickClarification}
        />
        <MessageActions text={response.answer} />
      </div>
    </div>
  );
});

function BroBotAssistantResponse({
  response,
  status,
  errorMessage,
  onRetry,
  onPickClarification,
}: {
  response: BroBotChatResponse;
  status?: MessageStatus;
  errorMessage?: string;
  onRetry: () => void;
  onPickClarification: (question: string, sourceMessageId: string) => void;
}) {
  const isOrPrep = response.detectedMode === 'or_prep';
  const isConsult = response.detectedMode === 'consult';
  const importantConceptsTitle = isConsult
    ? 'Immediate Priorities'
    : isOrPrep
      ? 'Important OR Concepts'
      : 'Important Concepts';
  const knowledgeGapsTitle = isConsult
    ? 'What Information Is Missing?'
    : isOrPrep
      ? 'What to Clarify Before Scrub'
      : 'What to Learn Next?';

  return (
    <article className="w-full rounded-2xl rounded-bl-md border border-slate-200/80 bg-white/95 p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3">
        <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700">
          {formatMode(response.detectedMode)}
        </span>
        {response.selectedFocus && (
          <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">
            Focus: {response.selectedFocus}
          </span>
        )}
        {typeof response.confidence === 'number' && (
          <span className="text-xs text-slate-400">
            {Math.round(response.confidence * 100)}% confidence
          </span>
        )}
      </div>

      <div className="mt-4 space-y-6">
        {response.goal && (
          <StructuredSection title="Your Goal">
            <p className="text-sm font-semibold leading-6 text-midnight">{response.goal}</p>
          </StructuredSection>
        )}

        <StructuredSection title="Direct Answer">
          {response.answer && status === 'streaming' ? (
            <StreamingAnswer text={response.answer} />
          ) : response.answer ? (
            <BroBotMarkdown>{response.answer}</BroBotMarkdown>
          ) : (
            <p className="text-sm leading-6 text-slate-500">
              BroBot is thinking...
            </p>
          )}
          {status === 'streaming' && (
            <span className="ml-0.5 inline-block h-4 w-1 animate-pulse rounded-full bg-teal-500 align-text-bottom" />
          )}
          {status === 'error' && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
              <span>{errorMessage ?? 'Response interrupted. Please retry if you need the full answer.'}</span>
              <button
                type="button"
                onClick={onRetry}
                className="rounded-md border border-amber-300 bg-white px-2 py-1 text-amber-800 hover:bg-amber-100"
              >
                Retry
              </button>
            </div>
          )}
        </StructuredSection>

        {status !== 'pending' && status !== 'streaming' && ((response.clarifyingQuestions?.length ?? 0) > 0 ||
          isUsefulAssumedContext(response.assumedContext)) && (
          <ClarificationBlock
            response={response}
            onPickClarification={onPickClarification}
          />
        )}

        {status !== 'pending' && status !== 'streaming' && isConsult && (
          <ConsultSignals
            confidence={response.consultConfidence}
            missingInformation={response.missingInformation ?? []}
          />
        )}

        {status !== 'pending' && status !== 'streaming' && (
          <>
            <StructuredList title={importantConceptsTitle} items={response.priorityPoints} />
            <StructuredList
              title="What Most Residents Miss"
              items={response.whatMostResidentsMiss ?? []}
            />
            <StructuredList title={knowledgeGapsTitle} items={response.knowledgeGaps} />
          </>
        )}

        {status !== 'pending' && status !== 'streaming' && response.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {response.tags.slice(0, 8).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

const MessageActions = memo(function MessageActions({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="mt-2 flex min-h-8 items-center gap-2 pl-1 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
      <button
        type="button"
        onClick={copyMessage}
        className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
      >
        <ClipboardDocumentIcon className="h-4 w-4" />
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
});

function StreamingAnswer({ text }: { text: string }) {
  const lines = text.split(/\r?\n/);
  const blocks: ReactNode[] = [];
  let paragraph: string[] = [];
  let bullets: string[] = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push(
      <p key={`p-${blocks.length}`} className="max-w-none">
        {paragraph.join(' ')}
      </p>
    );
    paragraph = [];
  };

  const flushBullets = () => {
    if (!bullets.length) return;
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="space-y-1.5 pl-5">
        {bullets.map((item, index) => (
          <li key={`${item}-${index}`} className="list-disc pl-1">
            {item}
          </li>
        ))}
      </ul>
    );
    bullets = [];
  };

  lines.forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      flushBullets();
      return;
    }

    const bullet = /^[-*]\s+(.+)$/.exec(line);
    if (bullet) {
      flushParagraph();
      bullets.push(bullet[1]);
      return;
    }

    flushBullets();
    paragraph.push(line.replace(/^#{1,4}\s+/, ''));
  });

  flushParagraph();
  flushBullets();

  return (
    <div className="space-y-4 whitespace-pre-wrap text-[15px] leading-7 text-slate-700">
      {blocks}
    </div>
  );
}

function StructuredSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</h3>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function ClarificationBlock({
  response,
  onPickClarification,
}: {
  response: BroBotChatResponse;
  onPickClarification: (question: string, sourceMessageId: string) => void;
}) {
  const questions = response.clarifyingQuestions ?? [];
  const usefulAssumption = isUsefulAssumedContext(response.assumedContext)
    ? response.assumedContext
    : '';
  if (!usefulAssumption && questions.length === 0) return null;

  return (
    <section className="rounded-xl border border-amber-100 bg-amber-50/60 px-3 py-3">
      <h3 className="text-xs font-bold uppercase tracking-wide text-amber-700">
        Assumption
      </h3>
      {usefulAssumption && (
        <p className="mt-1.5 text-sm leading-5 text-amber-950">
          <span className="font-semibold">Assuming:</span> {usefulAssumption}
        </p>
      )}
      {questions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {questions.map((question) => (
            <button
              key={question}
              type="button"
              onClick={() => onPickClarification(question, response.messageId)}
              className="rounded-full border border-amber-200 bg-white px-3 py-2 text-left text-xs font-semibold leading-4 text-amber-800 shadow-sm transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {question}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function StructuredList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;

  return (
    <StructuredSection title={title}>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-sm leading-5 text-slate-700">
            <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </StructuredSection>
  );
}

function ConsultSignals({
  confidence,
  missingInformation,
}: {
  confidence?: 'low' | 'moderate' | 'high';
  missingInformation: string[];
}) {
  if (!confidence && missingInformation.length === 0) return null;

  return (
    <section className="rounded-xl border border-sky-100 bg-sky-50/70 px-3 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wide text-sky-700">
          Consult Signal
        </h3>
        {confidence && (
          <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold capitalize text-sky-700 shadow-sm">
            {confidence} context
          </span>
        )}
      </div>
      {missingInformation.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {missingInformation.map((item) => (
            <li key={item} className="flex gap-2 text-sm leading-5 text-slate-700">
              <ExclamationCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function BroBotNextLearningBranches({
  branches,
  fallbackQuestions,
  mode,
  conversationId,
  sourceMessageId,
  trainingLevel,
  canShowReadingPanel,
  onPickBranch,
}: {
  branches: BranchOption[];
  fallbackQuestions: string[];
  mode: string;
  conversationId: string;
  sourceMessageId: string;
  trainingLevel: string;
  canShowReadingPanel: boolean;
  onPickBranch: (branch: BranchOption, sourceMessageId: string) => void;
}) {
  const loggedExposureKeyRef = useRef<string | null>(null);
  const [showReadingPanel, setShowReadingPanel] = useState(false);
  const branchChips: BranchOption[] = useMemo(
    () =>
      branches.length > 0
        ? branches.slice(0, 7).map((branch, index) => ({
            ...branch,
            rankPosition: branch.rankPosition ?? index + 1,
          }))
        : buildSuggestedChips(fallbackQuestions, mode)
            .map((question) => ({
              id: question.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
              label: question,
              category: inferChipCategory(question),
            }))
            .map((branch, index) => ({
              ...branch,
              rankPosition: index + 1,
            })),
    [branches, fallbackQuestions, mode]
  );

  useEffect(() => {
    if (!conversationId || !sourceMessageId || branchChips.length === 0) return;

    const exposureKey = `${conversationId}:${sourceMessageId}:${branchChips
      .map((branch) => `${branch.id}:${branch.rankPosition}`)
      .join('|')}`;
    if (loggedExposureKeyRef.current === exposureKey) return;
    loggedExposureKeyRef.current = exposureKey;

    void fetch('/api/brobot/branch-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        conversationId,
        sourceMessageId,
        topicId: branchChips.find((branch) => branch.topicId)?.topicId,
        branches: branchChips.map((branch) => ({
          id: branch.branchQuestionId ?? branch.id,
          label: branch.label,
          rankPosition: branch.rankPosition ?? 1,
          mode,
          trainingLevel,
        })),
      }),
    }).catch(() => {
      loggedExposureKeyRef.current = null;
    });
  }, [branchChips, conversationId, mode, sourceMessageId, trainingLevel]);

  if (branchChips.length === 0) return null;

  return (
    <div className="mt-5 rounded-2xl border border-teal-100 bg-teal-50/40 p-3">
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-teal-700">
        Common Next Questions
      </h3>
      <div className="flex flex-wrap gap-2">
        {branchChips.map((branch) => (
          <button
            key={branch.id}
            type="button"
            onClick={() => onPickBranch(branch, sourceMessageId)}
            className="min-h-9 rounded-full border border-teal-200 bg-white px-3 py-2 text-left text-xs font-semibold leading-5 text-teal-700 shadow-sm transition hover:bg-teal-50 sm:text-sm"
          >
            <span className="mr-1.5 text-[10px] font-bold uppercase tracking-wide text-teal-500">
              {branch.category ?? inferChipCategory(branch.label)}
            </span>
            {branch.label}
          </button>
        ))}
        {canShowReadingPanel && (
          <button
            type="button"
            onClick={() => setShowReadingPanel((current) => !current)}
            className="min-h-9 rounded-full border border-sky-200 bg-white px-3 py-2 text-left text-xs font-bold leading-5 text-sky-700 shadow-sm transition hover:bg-sky-50 sm:text-sm"
          >
            <span className="mr-1.5 inline-flex align-[-2px] text-sky-500">
              <BookOpenIcon className="h-4 w-4" />
            </span>
            Read Next
          </button>
        )}
      </div>
      {canShowReadingPanel && showReadingPanel && (
        <ReadingRecommendationsPanel
          conversationId={conversationId}
          sourceMessageId={sourceMessageId}
          mode={mode}
          trainingLevel={trainingLevel}
          onClose={() => setShowReadingPanel(false)}
        />
      )}
    </div>
  );
}

function BroBotChatComposer({
  input,
  setInput,
  isRequestActive,
  mode,
  setMode,
  responseDepth,
  setResponseDepth,
  trainingLevel,
  setTrainingLevel,
  textareaRef,
  onSubmit,
  onKeyDown,
}: {
  input: string;
  setInput: (input: string) => void;
  isRequestActive: boolean;
  mode: BroBotChatMode;
  setMode: (mode: BroBotChatMode) => void;
  responseDepth: BroBotResponseDepth;
  setResponseDepth: (depth: BroBotResponseDepth) => void;
  trainingLevel: BroBotTrainingLevel;
  setTrainingLevel: (level: BroBotTrainingLevel) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
}) {
  const [focused, setFocused] = useState(false);
  const isComposerActive = focused || input.trim().length > 0;

  const resizeTextarea = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const minHeight = isComposerActive
      ? COMPOSER_MIN_HEIGHT_ACTIVE
      : COMPOSER_MIN_HEIGHT_INACTIVE;
    const maxHeight =
      window.innerWidth < 640
        ? COMPOSER_MAX_HEIGHT_MOBILE
        : COMPOSER_MAX_HEIGHT_DESKTOP;

    textarea.style.height = 'auto';
    const nextHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, [isComposerActive, textareaRef]);

  useEffect(() => {
    resizeTextarea();
  }, [resizeTextarea]);

  return (
    <form
      onSubmit={onSubmit}
      className="sticky bottom-0 z-20 -mx-3 border-t border-slate-200 bg-[#fefcf7]/95 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur sm:-mx-5 sm:px-5 lg:-mx-6 lg:px-6"
    >
      <div
        className={`w-full rounded-xl border bg-white shadow-sm transition ${
          isComposerActive
            ? 'border-teal-200 p-2.5 shadow-md ring-2 ring-teal-50'
            : 'border-slate-200 p-2'
        }`}
      >
        <div className="grid grid-cols-3 gap-1.5 border-b border-slate-100 pb-1.5">
          <CompactSelect
            label="Mode"
            value={mode}
            options={modeOptions}
            onChange={(value) => setMode(value as BroBotChatMode)}
          />
          <CompactSelect
            label="Depth"
            value={responseDepth}
            options={depthOptions}
            onChange={(value) => setResponseDepth(value as BroBotResponseDepth)}
          />
          <CompactSelect
            label="Level"
            value={trainingLevel}
            options={trainingOptions}
            onChange={(value) => setTrainingLevel(value as BroBotTrainingLevel)}
          />
        </div>

        <div className="relative mt-1.5">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              requestAnimationFrame(resizeTextarea);
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={onKeyDown}
            placeholder="Ask BroBot anything ortho..."
            className={`block max-h-[132px] w-full resize-none rounded-lg border bg-slate-50 py-2.5 pl-3.5 pr-14 text-sm leading-6 outline-none transition focus:bg-white sm:max-h-[168px] ${
              isComposerActive
                ? 'border-teal-200 focus:border-teal-400'
                : 'border-slate-200 focus:border-teal-300'
            }`}
            style={{
              minHeight: isComposerActive
                ? COMPOSER_MIN_HEIGHT_ACTIVE
                : COMPOSER_MIN_HEIGHT_INACTIVE,
            }}
          />
          <button
            type="submit"
            disabled={isRequestActive || !input.trim()}
            aria-label="Send message"
            className="absolute bottom-2 right-2 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-600 text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-40 sm:h-10 sm:w-10"
          >
            {isRequestActive ? (
              <ArrowPathIcon className="h-5 w-5 animate-spin" />
            ) : (
              <PaperAirplaneIcon className="h-5 w-5" />
            )}
          </button>
        </div>

        <p className="mt-1 hidden px-1 text-[11px] text-slate-400 sm:block">
          Enter sends. Shift+Enter adds a new line.
        </p>
      </div>
    </form>
  );
}

function CompactSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex min-w-0 items-center gap-1 rounded-md bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-500 sm:gap-1.5 sm:px-2.5">
      <span className="shrink-0">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-w-0 flex-1 truncate bg-transparent text-[11px] font-semibold text-slate-800 outline-none sm:text-xs"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function BroBotUsageBanner({
  usage,
  loading = false,
}: {
  usage: UsageSnapshot | null;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="self-start rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 shadow-sm sm:self-auto">
        Checking BroBot access...
      </div>
    );
  }

  if (!usage) return null;

  if (usage.unlimited) {
    return (
      <div className="self-start rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 sm:self-auto">
        Unlimited BroBot
      </div>
    );
  }

  return (
    <div className="self-start rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 shadow-sm sm:self-auto">
      <span className="font-bold text-midnight">{usage.remainingToday ?? 0}</span>
      {usage.dailyCap ? ` / ${usage.dailyCap}` : ''} BroBot AI uses remaining today
      <p className="mt-0.5 hidden text-[11px] text-slate-400 sm:block">Shared across CasePrep and Chat</p>
    </div>
  );
}

function BroBotChatError({
  error,
  isAuthenticated,
  onRetry,
}: {
  error: ChatError;
  isAuthenticated: boolean;
  onRetry: () => void;
}) {
  if (error.type === 'auth') {
    return (
      <div className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <ExclamationCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <div>
            <h2 className="font-bold text-midnight">Sign in to continue BroBot Chat</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              BroBot could not start a guest chat session. Sign in and your prompt will be restored.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/auth/sign-in?redirectTo=/brobot/chat&intent=brobot"
                className="rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
              >
                Sign in
              </Link>
              <Link
                href="/brobot/chat"
                className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Try again
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error.type === 'quota') {
    return (
      <div className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <ExclamationCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <div>
            <h2 className="font-bold text-midnight">Daily BroBot limit reached</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              You have used your BroBot AI uses for today. This limit is shared across CasePrep and Chat.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/account/billing?returnTo=/brobot/chat&intent=brobot"
                className="inline-flex rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
              >
                Start 1-month free trial
              </Link>
              {!isAuthenticated && (
                <Link
                  href="/auth/sign-in?redirectTo=/brobot/chat&intent=brobot"
                  className="inline-flex rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Sign in
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error.type === 'disabled') {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <ExclamationCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
          <div>
            <h2 className="font-bold text-midnight">BroBot is unavailable</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {error.message || 'BroBot access is currently disabled for this account or temporarily unavailable.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const message =
    error.type === 'network'
      ? "BroBot couldn't reach the server. Check your connection and try again."
      : error.message || 'BroBot had trouble responding. Please try again.';

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <ExclamationCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
        <div>
          <h2 className="font-bold text-midnight">Something got tangled</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">{message}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 inline-flex items-center gap-2 rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <ArrowPathIcon className="h-4 w-4" />
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}

function LoadingMessage() {
  const loadingCopy = 'Prioritizing what matters for your level...';

  return (
    <div className="mt-5 flex justify-start">
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
        <ArrowPathIcon className="h-4 w-4 animate-spin text-teal-600" />
        {loadingCopy}
      </div>
    </div>
  );
}

function formatMode(mode: string) {
  if (mode === 'consult' || mode === 'fracture_call') return 'Consult';
  return mode
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildSuggestedChips(questions: string[], mode: string) {
  const seen = new Set<string>();
  const deduped = questions.filter((question) => {
    const key = question
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (mode === 'or_prep') {
    return buildOrPrepSuggestedChips(deduped);
  }

  if (mode === 'consult' || mode === 'fracture_call') {
    return buildConsultSuggestedChips(deduped);
  }

  const shouldAddQuiz =
    ['oite', 'or_prep', 'general'].includes(mode) &&
    !deduped.some((question) => /quiz me|quiz|5 questions/i.test(question));

  return [...deduped.slice(0, 6), ...(shouldAddQuiz ? ['Quiz me on this'] : [])].slice(0, 7);
}

function buildConsultSuggestedChips(questions: string[]) {
  const categories = [
    {
      pattern: /present|presentation|sign.?out|attending/i,
      fallback: 'Help me present this consult.',
    },
    {
      pattern: /operative indication|indications?|surgery|nonoperative/i,
      fallback: 'What are the operative indications?',
    },
    {
      pattern: /classification|classify|pattern/i,
      fallback: 'What classification should I know?',
    },
    {
      pattern: /change management|red flag|urgent|emergent|compartment|open/i,
      fallback: 'What findings would change management?',
    },
    {
      pattern: /imaging|xray|x-ray|radiograph|ct|mri|view/i,
      fallback: 'What imaging do I still need?',
    },
    {
      pattern: /attending|ask|question/i,
      fallback: 'What will my attending ask?',
    },
    {
      pattern: /quiz/i,
      fallback: 'Quiz me on this injury.',
    },
  ];

  const chips = categories.map(({ pattern, fallback }) => {
    return questions.find((question) => pattern.test(question)) ?? fallback;
  });

  const seen = new Set<string>();
  return chips
    .filter((question) => {
      const key = question
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 7);
}

function buildOrPrepSuggestedChips(questions: string[]) {
  const categories = [
    {
      pattern: /landmark|approach|incision|interval/i,
      fallback: 'Walk me through the incision and interval.',
    },
    {
      pattern: /anatomy|nerve|vessel|structure.*risk|at risk/i,
      fallback: 'What structures are at risk?',
    },
    {
      pattern: /step|flow|sequence/i,
      fallback: 'What are the key operative steps?',
    },
    {
      pattern: /complication|pitfall|mistake|avoid/i,
      fallback: 'What are the common intraoperative mistakes?',
    },
    {
      pattern: /attending|implant|rep|system|plate|nail|screw/i,
      fallback: 'What should I ask about implants or the attending plan?',
    },
    {
      pattern: /quiz/i,
      fallback: 'Quiz me on the anatomy for this case.',
    },
  ];

  const chips = categories.map(({ pattern, fallback }) => {
    return questions.find((question) => pattern.test(question)) ?? fallback;
  });

  const seen = new Set<string>();
  return chips
    .filter((question) => {
      const key = question
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 6);
}

function inferChipCategory(question: string) {
  const lower = question.toLowerCase();
  if (lower.includes('quiz') || lower.includes('question')) return 'Quiz';
  if (lower.includes('oite') || lower.includes('test')) return 'OITE';
  if (lower.includes('present') || lower.includes('presentation')) return 'Present';
  if (lower.includes('classification') || lower.includes('classify')) return 'Class';
  if (lower.includes('imaging') || lower.includes('xray') || lower.includes('x-ray') || lower.includes('ct') || lower.includes('mri')) return 'Image';
  if (lower.includes('red flag') || lower.includes('urgent') || lower.includes('emergent') || lower.includes('change management')) return 'Urgent';
  if (lower.includes('approach') || lower.includes('landmark') || lower.includes('incision') || lower.includes('interval')) return 'Landmark';
  if (lower.includes('implant') || lower.includes('rep') || lower.includes('plate') || lower.includes('nail') || lower.includes('system')) return 'Implant';
  if (lower.includes('step') || lower.includes('flow') || lower.includes('sequence')) return 'Steps';
  if (lower.includes('attending') || lower.includes('before incision')) return 'Attend';
  if (lower.includes('approach') || lower.includes('or ') || lower.includes('operative')) return 'OR';
  if (lower.includes('anatomy') || lower.includes('nerve') || lower.includes('vessel')) return 'Anatomy';
  if (lower.includes('complication') || lower.includes('avoid') || lower.includes('risk')) return 'Comp';
  if (lower.includes('algorithm') || lower.includes('decide') || lower.includes('choose')) return 'Decision';
  return 'Next';
}
