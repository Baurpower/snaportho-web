import type {
  PatientIdentifiers,
  ReorderItem,
  SignoutCard,
  SignoutService,
  UpdateCardPatch,
} from "@/lib/workspace/signout/types";

/** Thin client for the Phase 1 sign-out routes. Throws on failure; PUT surfaces 409. */

async function jsonOrThrow<T>(res: Response, fallback: string): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string })?.error || fallback);
  }
  return data as T;
}

export async function apiListServices(): Promise<SignoutService[]> {
  const res = await fetch("/api/workspace/signout/services");
  const { services } = await jsonOrThrow<{ services: SignoutService[] }>(
    res,
    "Failed to load services"
  );
  return services;
}

export async function apiCreateService(name: string): Promise<SignoutService> {
  const res = await fetch("/api/workspace/signout/services", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  const { service } = await jsonOrThrow<{ service: SignoutService }>(
    res,
    "Failed to create service"
  );
  return service;
}

export async function apiListCards(serviceId: string): Promise<SignoutCard[]> {
  const res = await fetch(
    `/api/workspace/signout/cards?serviceId=${encodeURIComponent(serviceId)}`
  );
  const { cards } = await jsonOrThrow<{ cards: SignoutCard[] }>(
    res,
    "Failed to load cards"
  );
  return cards;
}

export async function apiCreateCard(
  serviceId: string,
  input: { handle: string; severity?: string; body?: string }
): Promise<SignoutCard> {
  const res = await fetch(
    `/api/workspace/signout/cards?serviceId=${encodeURIComponent(serviceId)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }
  );
  const { card } = await jsonOrThrow<{ card: SignoutCard }>(res, "Failed to add patient");
  return card;
}

export type SaveCardResult =
  | { ok: true; card: SignoutCard }
  | { ok: false; stale: true; currentVersion: number };

export async function apiUpdateCard(
  cardId: string,
  expectedVersion: number,
  patch: UpdateCardPatch
): Promise<SaveCardResult> {
  const res = await fetch(`/api/workspace/signout/cards/${cardId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ expectedVersion, ...patch }),
  });
  if (res.status === 409) {
    const data = (await res.json().catch(() => ({}))) as { currentVersion?: number };
    return { ok: false, stale: true, currentVersion: data.currentVersion ?? expectedVersion };
  }
  const { card } = await jsonOrThrow<{ card: SignoutCard }>(res, "Failed to save card");
  return { ok: true, card };
}

export async function apiDeleteCard(cardId: string): Promise<void> {
  const res = await fetch(`/api/workspace/signout/cards/${cardId}`, {
    method: "DELETE",
  });
  await jsonOrThrow<{ ok: true }>(res, "Failed to remove patient");
}

export async function apiReorder(
  serviceId: string,
  items: ReorderItem[]
): Promise<void> {
  const res = await fetch("/api/workspace/signout/cards/reorder", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ serviceId, items }),
  });
  await jsonOrThrow<{ ok: true }>(res, "Failed to reorder");
}

export async function apiSaveIdentity(
  cardId: string,
  ids: PatientIdentifiers
): Promise<void> {
  const res = await fetch(`/api/workspace/signout/cards/${cardId}/identifiers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ids),
  });
  await jsonOrThrow<{ ok: true }>(res, "Failed to save identifiers");
}

export async function apiRevealIdentity(cardId: string): Promise<PatientIdentifiers> {
  const res = await fetch(
    `/api/workspace/signout/cards/${cardId}/identifiers/reveal`,
    { method: "POST" }
  );
  const { identifiers } = await jsonOrThrow<{ identifiers: PatientIdentifiers }>(
    res,
    "Failed to reveal identifiers"
  );
  return identifiers;
}
