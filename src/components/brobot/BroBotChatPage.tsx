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
import { useChatScrollController } from './useChatScrollController';

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
};

type BranchOption = {
  id: string;
  label: string;
  description?: string;
  category?: string;
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
      status?: 'pending' | 'streaming' | 'complete' | 'error';
      errorMessage?: string;
    };

type ChatError =
  | { type: 'auth' }
  | { type: 'quota'; dailyCap?: number | null }
  | { type: 'network' }
  | { type: 'validation'; message?: string }
  | { type: 'unexpected'; message?: string };

type UsageSnapshot = {
  unlimited: boolean;
  dailyCap: number | null;
  remainingToday: number | null;
};

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

const COMPOSER_MIN_HEIGHT_INACTIVE = 52;
const COMPOSER_MIN_HEIGHT_ACTIVE = 84;
const COMPOSER_MAX_HEIGHT_MOBILE = 160;
const COMPOSER_MAX_HEIGHT_DESKTOP = 220;
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ChatError | null>(null);
  const [usage, setUsage] = useState<UsageSnapshot | null>(null);
  const [pendingIntent, setPendingIntent] = useState<PendingIntent | null>(null);
  const [restoredPendingPrompt, setRestoredPendingPrompt] = useState(false);
  const messagesViewportRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const latestAssistant = useMemo(
    () => [...messages].reverse().find((message) => message.role === 'assistant'),
    [messages]
  );

  const scrollContentVersion = useMemo(
    () =>
      [
        messages.length,
        messages[messages.length - 1]?.id ?? 'empty',
        loading ? 'loading' : 'idle',
        error?.type ?? 'no-error',
        pendingIntent ? pendingIntent.userMessageId : 'no-intent',
        latestAssistant?.role === 'assistant'
          ? `${latestAssistant.id}:${latestAssistant.content.length}:${latestAssistant.status ?? 'complete'}:${latestAssistant.response.nextLearningBranches?.length ?? 0}:${latestAssistant.response.suggestedQuestions.length}`
          : 'no-assistant',
      ].join('|'),
    [messages, loading, error, pendingIntent, latestAssistant]
  );

  const {
    showNewMessagesButton,
    scrollToBottom,
  } = useChatScrollController({
    viewportRef: messagesViewportRef,
    contentVersion: scrollContentVersion,
  });

  useEffect(() => {
    let isMounted = true;

    async function loadUsage() {
      if (authStatus !== 'authenticated') {
        setUsage(null);
        return;
      }

      try {
        const res = await fetch('/api/me/entitlements');
        const body = await res.json();
        const data = body?.data;

        if (!isMounted || !data?.aiAccess) return;

        setUsage({
          unlimited: Boolean(data.aiAccess.unlimited),
          dailyCap: data.aiAccess.dailyCap ?? null,
          remainingToday: data.aiAccess.remainingToday ?? null,
        });
      } catch {
        // Non-critical. The chat response updates this after a successful call.
      }
    }

    void loadUsage();

    return () => {
      isMounted = false;
    };
  }, [authStatus]);

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
    savePendingBroBotRequest({
      prompt: message,
      mode,
      responseDepth,
      trainingLevel,
      sourceRoute:
        typeof window !== 'undefined'
          ? `${window.location.pathname}${window.location.search}`
          : '/brobot/chat',
    });
    setError({ type: 'auth' });
    router.push('/auth/sign-in?redirectTo=/brobot/chat&intent=brobot');
  }

  async function sendMessage(
    rawMessage?: string,
    source: BroBotChatSource = 'manual',
    sourceMessageId?: string,
    selectedBranch?: BranchOption,
    answerNow = false
  ) {
    const message = (rawMessage ?? input).trim();
    if (!message || loading) return;

    const shouldAppendUserMessage = source !== 'branch_selection' && source !== 'answer_now';
    const optimisticUserMessage: ChatMessage | null = shouldAppendUserMessage
      ? {
          id: crypto.randomUUID(),
          role: 'user',
          content: message,
        }
      : null;

    if (optimisticUserMessage) {
      setMessages((current) => [...current, optimisticUserMessage]);
    }
    setRestoredPendingPrompt(false);
    setInput('');
    setError(null);
    setLoading(true);
    let streamingAssistantId: string | null = null;

    try {
      if (source === 'manual' || source === 'example_prompt') {
        const intentRes = await fetch('/api/brobot/intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            message,
            mode,
            responseDepth,
            trainingLevel,
          }),
        });
        const intentBody = await intentRes.json().catch(() => null);

        if (!intentRes.ok) {
          setMessages((current) =>
            optimisticUserMessage
              ? current.filter((chatMessage) => chatMessage.id !== optimisticUserMessage.id)
              : current
          );

          if (intentRes.status === 401) {
            redirectToSignInWithPendingRequest(message);
            return;
          }

          if (intentRes.status === 429 || intentBody?.isLimitReached) {
            setUsage((current) =>
              current ? { ...current, remainingToday: 0 } : current
            );
            setError({ type: 'quota', dailyCap: intentBody?.dailyCap ?? null });
            return;
          }

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
            message,
            userMessageId: optimisticUserMessage?.id ?? crypto.randomUUID(),
            intent,
          });
          setMode(intent.mode);
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
      }

      const res = await fetch('/api/brobot/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          conversationId: conversationId ?? undefined,
          message,
          mode,
          responseDepth,
          trainingLevel,
          source,
          sourceMessageId,
          selectedBranchId: selectedBranch?.id,
          selectedBranchLabel: selectedBranch?.label,
          intentMode: pendingIntent?.intent.mode,
          intentSubintent: pendingIntent?.intent.subintent,
          intentProcedureOrTopic: pendingIntent?.intent.procedureOrTopic || message,
          intentProcedureCategory: pendingIntent?.intent.procedureCategory,
          intentAmbiguity: pendingIntent?.intent.ambiguity,
          intentReasonForBranching: pendingIntent?.intent.reasonForBranching,
          intentSource: pendingIntent?.intent.source,
          answerNow,
          stream: Boolean(streamingAssistantId),
        }),
      });

      if (streamingAssistantId && res.headers.get('content-type')?.includes('text/event-stream')) {
        if (!res.ok || !res.body) {
          throw new Error('BroBot streaming response was not available.');
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parsed = parseStreamEvents(buffer);
          buffer = parsed.rest;

          for (const streamEvent of parsed.events) {
            if (streamEvent.event === 'start') {
              if (streamEvent.data.conversationId) {
                setConversationId(streamEvent.data.conversationId);
              }
              setMessages((current) =>
                current.map((chatMessage) =>
                  chatMessage.id === streamingAssistantId && chatMessage.role === 'assistant'
                    ? {
                        ...chatMessage,
                        status: 'streaming',
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
              const normalizedMetadata = normalizeChatResponse(streamEvent.data);
              if (!normalizedMetadata) continue;

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

        setPendingIntent(null);
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

        if (res.status === 401) {
          redirectToSignInWithPendingRequest(message);
          return;
        }

        if (res.status === 429 || body?.isLimitReached) {
          setUsage((current) =>
            current ? { ...current, remainingToday: 0 } : current
          );
          setError({ type: 'quota', dailyCap: body?.dailyCap ?? null });
          return;
        }

        if (res.status === 400) {
          setError({ type: 'validation', message: body?.message ?? body?.error });
          return;
        }

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
        setError({ type: 'unexpected', message: 'BroBot returned an unexpected response.' });
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
    } catch {
      setMessages((current) =>
        current
          .map((chatMessage) =>
            streamingAssistantId &&
            chatMessage.id === streamingAssistantId &&
            chatMessage.role === 'assistant' &&
            chatMessage.content
              ? {
                  ...chatMessage,
                  status: 'error' as const,
                  errorMessage: 'Response interrupted. Please retry if you need the full answer.',
                }
              : chatMessage
          )
          .filter((chatMessage) => {
            if (optimisticUserMessage && chatMessage.id === optimisticUserMessage.id) {
              return Boolean(
                streamingAssistantId &&
                  current.some(
                    (candidate) =>
                      candidate.id === streamingAssistantId &&
                      candidate.role === 'assistant' &&
                      candidate.content
                  )
              );
            }

            if (streamingAssistantId && chatMessage.id === streamingAssistantId) {
              return chatMessage.role === 'assistant' && Boolean(chatMessage.content);
            }

            return true;
          })
      );
      setError({ type: 'network' });
    } finally {
      setLoading(false);
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
    if (!pendingIntent || loading) return;
    void sendMessage(
      pendingIntent.message,
      answerNow ? 'answer_now' : 'branch_selection',
      pendingIntent.userMessageId,
      branch,
      answerNow
    );
    setPendingIntent(null);
  }

  return (
    <div className="fixed inset-0 z-10 overflow-hidden bg-[#fefcf7] text-[#1A1C2C]">
      <main className="mx-auto flex h-full w-full max-w-[1120px] flex-col box-border px-4 pt-20 sm:px-6 sm:pt-24 lg:px-8">
        <header className="shrink-0 border-b border-slate-200/80 pb-4 sm:pb-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-3">
              <BroBotProductTabs />
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
                  BroBot
                </p>
                <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-midnight sm:text-4xl">
                  BroBot Chat
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                  Ask open-ended ortho questions, prep faster, and find what you may be missing.
                </p>
              </div>
            </div>

            <BroBotUsageBanner usage={usage} />
          </div>
        </header>

        <section className="relative flex min-h-0 flex-1 flex-col">
          <div
            ref={messagesViewportRef}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 py-5 [scrollbar-gutter:stable] sm:px-2 sm:py-6"
          >
            <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col">
              <div className="flex-1">
                {messages.length === 0 && !loading ? (
                  <BroBotEmptyState
                    disabled={loading}
                    onPickPrompt={(prompt) => void sendMessage(prompt, 'example_prompt')}
                    showSignInNotice={!authLoading && !user}
                  />
                ) : (
                  <BroBotMessageList
                    messages={messages}
                    onPickClarification={(question, sourceMessageId) =>
                      void sendMessage(question, 'clarification_question', sourceMessageId)
                    }
                  />
                )}

                {pendingIntent && !loading && (
                  <BroBotIntentCard
                    pendingIntent={pendingIntent}
                    onSelectBranch={(branch) => continueFromIntent(branch)}
                    onAnswerNow={() => continueFromIntent(undefined, true)}
                  />
                )}

                {loading && <LoadingMessage />}

                {error && (
                  <div className="mt-5">
                    <BroBotChatError error={error} onRetry={() => setError(null)} />
                  </div>
                )}

                {restoredPendingPrompt && !loading && !error && (
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

                {latestAssistant?.role === 'assistant' && !loading && (
                  <BroBotNextLearningBranches
                    branches={latestAssistant.response.nextLearningBranches ?? []}
                    fallbackQuestions={latestAssistant.response.suggestedQuestions}
                    mode={latestAssistant.response.detectedMode}
                    sourceMessageId={latestAssistant.response.messageId}
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
          loading={loading}
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
    <div className="mx-auto max-w-3xl py-8 sm:py-12">
      {showSignInNotice && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          BroBot Chat requires sign-in. You can explore prompts here, then sign in when you are ready to send.
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-teal-50 p-2 text-teal-700">
            <SparklesIcon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-midnight">Start with an ortho question</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Use Chat for reasoning, prioritization, OITE review, attending-style questions, and fast “what am I missing?” checks.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {promptExamples.map((prompt) => (
            <button
              key={prompt}
              type="button"
              disabled={disabled}
              onClick={() => onPickPrompt(prompt)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-medium leading-5 text-slate-700 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-900 disabled:cursor-not-allowed disabled:opacity-50"
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
  onPickClarification,
}: {
  messages: ChatMessage[];
  onPickClarification: (question: string, sourceMessageId: string) => void;
}) {
  return (
    <div className="space-y-6">
      {messages.map((message) =>
        message.role === 'user' ? (
          <UserMessage key={message.id} content={message.content} />
        ) : (
          <AssistantMessage
            key={message.id}
            response={message.response}
            status={message.status}
            errorMessage={message.errorMessage}
            onPickClarification={onPickClarification}
          />
        )
      )}
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
  onPickClarification,
}: {
  response: BroBotChatResponse;
  status?: 'pending' | 'streaming' | 'complete' | 'error';
  errorMessage?: string;
  onPickClarification: (question: string, sourceMessageId: string) => void;
}) {
  return (
    <div className="group flex justify-start">
      <div className="w-full max-w-3xl">
        <BroBotAssistantResponse
          response={response}
          status={status}
          errorMessage={errorMessage}
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
  onPickClarification,
}: {
  response: BroBotChatResponse;
  status?: 'pending' | 'streaming' | 'complete' | 'error';
  errorMessage?: string;
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
          {response.answer ? (
            <BroBotMarkdown>{response.answer}</BroBotMarkdown>
          ) : (
            <p className="text-sm leading-6 text-slate-500">
              BroBot is starting the answer...
            </p>
          )}
          {status === 'streaming' && (
            <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-teal-700">
              <span className="h-2 w-2 animate-pulse rounded-full bg-teal-500" />
              Streaming
            </div>
          )}
          {status === 'error' && (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
              {errorMessage ?? 'Response interrupted. Please retry if you need the full answer.'}
            </div>
          )}
        </StructuredSection>

        {((response.clarifyingQuestions?.length ?? 0) > 0 ||
          isUsefulAssumedContext(response.assumedContext)) && (
          <ClarificationBlock
            response={response}
            onPickClarification={onPickClarification}
          />
        )}

        {isConsult && (
          <ConsultSignals
            confidence={response.consultConfidence}
            missingInformation={response.missingInformation ?? []}
          />
        )}

        <StructuredList title={importantConceptsTitle} items={response.priorityPoints} />
        <StructuredList
          title="What Most Residents Miss"
          items={response.whatMostResidentsMiss ?? []}
        />
        <StructuredList title={knowledgeGapsTitle} items={response.knowledgeGaps} />

        {response.tags.length > 0 && (
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
  sourceMessageId,
  onPickBranch,
}: {
  branches: BranchOption[];
  fallbackQuestions: string[];
  mode: string;
  sourceMessageId: string;
  onPickBranch: (branch: BranchOption, sourceMessageId: string) => void;
}) {
  const branchChips =
    branches.length > 0
      ? branches.slice(0, 7)
      : buildSuggestedChips(fallbackQuestions, mode).map((question) => ({
          id: question.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
          label: question,
          category: inferChipCategory(question),
        }));
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
      </div>
    </div>
  );
}

function BroBotChatComposer({
  input,
  setInput,
  loading,
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
  loading: boolean;
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
      className="sticky bottom-0 z-20 -mx-4 border-t border-slate-200 bg-[#fefcf7]/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2.5 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
    >
      <div
        className={`w-full rounded-2xl border bg-white shadow-sm transition ${
          isComposerActive
            ? 'border-teal-200 p-3 shadow-lg ring-2 ring-teal-50'
            : 'border-slate-200 p-2.5'
        }`}
      >
        <div className="grid grid-cols-3 gap-1.5 border-b border-slate-100 pb-2 sm:gap-2">
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

        <div className="relative mt-2">
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
            className={`block max-h-[160px] w-full resize-none rounded-xl border bg-slate-50 py-3 pl-4 pr-16 text-sm leading-6 outline-none transition focus:bg-white sm:max-h-[220px] ${
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
            disabled={loading || !input.trim()}
            aria-label="Send message"
            className="absolute bottom-2.5 right-2.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? (
              <ArrowPathIcon className="h-5 w-5 animate-spin" />
            ) : (
              <PaperAirplaneIcon className="h-5 w-5" />
            )}
          </button>
        </div>

        <p className="mt-1.5 px-1 text-xs text-slate-400">
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
    <label className="flex min-w-0 items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px] font-semibold text-slate-500 sm:gap-2 sm:px-3">
      <span className="shrink-0">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-w-0 flex-1 truncate bg-transparent text-xs font-semibold text-slate-800 outline-none sm:text-sm"
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

function BroBotUsageBanner({ usage }: { usage: UsageSnapshot | null }) {
  if (!usage) return null;

  if (usage.unlimited) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
        Unlimited BroBot
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
      <span className="font-bold text-midnight">{usage.remainingToday ?? 0}</span>
      {usage.dailyCap ? ` / ${usage.dailyCap}` : ''} BroBot AI uses remaining today
      <p className="mt-0.5 text-xs text-slate-400">Shared across CasePrep and Chat</p>
    </div>
  );
}

function BroBotChatError({ error, onRetry }: { error: ChatError; onRetry: () => void }) {
  if (error.type === 'auth') {
    return (
      <div className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <ExclamationCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <div>
            <h2 className="font-bold text-midnight">Sign in to use BroBot Chat</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Chat saves conversation context, so it requires an account. CasePrep guest mode is still available.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/auth/sign-in?redirectTo=/brobot/chat&intent=brobot"
                className="rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
              >
                Sign in
              </Link>
              <Link
                href="/brobot/basic"
                className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Use guest CasePrep
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
            <Link
              href="/account/billing"
              className="mt-4 inline-flex rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
            >
              Upgrade to Unlimited BroBot
            </Link>
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
