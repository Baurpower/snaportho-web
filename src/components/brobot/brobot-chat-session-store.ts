export type BroBotChatSessionData<T> = {
  id: string;
  title: string;
  updatedAt: number;
  data: T;
};

const MAX_RECENTS = 8;

let activeSession: BroBotChatSessionData<unknown> | null = null;
let recentSessions: BroBotChatSessionData<unknown>[] = [];

export function resetBroBotChatSessions() {
  activeSession = null;
  recentSessions = [];
}

export function rememberBroBotChatSession<T>(session: BroBotChatSessionData<T> | null) {
  activeSession = session;
}

export function loadBroBotChatSession<T>(): BroBotChatSessionData<T> | null {
  return (activeSession as BroBotChatSessionData<T> | null) ?? null;
}

export function archiveBroBotChatSession<T>(session: BroBotChatSessionData<T>) {
  recentSessions = [
    session,
    ...recentSessions.filter((item) => item.id !== session.id),
  ].slice(0, MAX_RECENTS);
}

export function listBroBotChatRecents<T>(): BroBotChatSessionData<T>[] {
  return recentSessions as BroBotChatSessionData<T>[];
}

export function takeBroBotChatRecent<T>(id: string): BroBotChatSessionData<T> | null {
  const index = recentSessions.findIndex((item) => item.id === id);
  if (index < 0) return null;
  const [session] = recentSessions.splice(index, 1);
  return (session as BroBotChatSessionData<T>) ?? null;
}

export function threadTitleFromMessages(messages: Array<{ role: string; content: string }>) {
  const firstUser = messages.find((message) => message.role === 'user' && message.content.trim());
  const title = firstUser?.content.trim() ?? 'New chat';
  return title.length > 72 ? `${title.slice(0, 69)}…` : title;
}
