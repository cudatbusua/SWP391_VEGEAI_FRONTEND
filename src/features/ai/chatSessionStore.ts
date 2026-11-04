/**
 * Storage boundaries for the AI Chef chat.
 *
 * Every account owns its own conversation key and guests use a dedicated key that is
 * wiped as soon as they leave the page. That is what keeps a shared computer from
 * showing a signed-in member's chat frame to the next guest (and the other way round).
 */

export const GUEST_CHAT_STORAGE_KEY = 'vegeai:ai-chef:sessions:guest:v2';
const HANDOFF_STORAGE_KEY = 'vegeai:ai-chef:handoff:v1';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface ChatHandoff<T> {
  session: T;
  draft: string;
}

export function chatSessionsKey(userId?: string | null): string {
  const id = typeof userId === 'string' ? userId.trim() : '';
  return id ? `vegeai:ai-chef:sessions:${id}` : GUEST_CHAT_STORAGE_KEY;
}

export function readChatSessions<T>(storage: StorageLike | null | undefined, key: string): T[] | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed as T[];
  } catch {
    return null;
  }
}

export function writeChatSessions<T>(storage: StorageLike | null | undefined, key: string, sessions: T[]): void {
  if (!storage) return;
  try {
    storage.setItem(key, JSON.stringify(sessions));
  } catch {
    // Storage quotas and private-mode browsers must never break the chat.
  }
}

export function clearChatSessions(storage: StorageLike | null | undefined, key: string): void {
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch {
    // ignore
  }
}

/** Remembers the conversation and the unanswered draft across the login round-trip. */
export function stashChatHandoff<T>(storage: StorageLike | null | undefined, handoff: ChatHandoff<T>): void {
  if (!storage) return;
  try {
    storage.setItem(HANDOFF_STORAGE_KEY, JSON.stringify(handoff));
  } catch {
    // ignore
  }
}

/** Reads the pending handoff once and removes it, so it can never leak into another session. */
export function takeChatHandoff<T>(storage: StorageLike | null | undefined): ChatHandoff<T> | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(HANDOFF_STORAGE_KEY);
    if (!raw) return null;
    storage.removeItem(HANDOFF_STORAGE_KEY);
    const parsed = JSON.parse(raw) as Partial<ChatHandoff<T>> | null;
    if (!parsed || typeof parsed !== 'object' || !parsed.session) return null;
    return { session: parsed.session as T, draft: typeof parsed.draft === 'string' ? parsed.draft : '' };
  } catch {
    return null;
  }
}

export function clearChatHandoff(storage: StorageLike | null | undefined): void {
  clearChatSessions(storage, HANDOFF_STORAGE_KEY);
}
