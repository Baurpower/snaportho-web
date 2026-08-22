"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutGrid,
  Table as TableIcon,
  Plus,
  Printer,
  Users,
  Loader2,
  X,
  ChevronDown,
  ChevronRight,
  RotateCcw,
} from "lucide-react";

import { createClient } from "@/utils/supabase/client";
import type {
  PatientIdentifiers,
  SignoutCard,
  SignoutService,
  SignoutSeverity,
  UpdateCardPatch,
} from "@/lib/workspace/signout/types";
import { extractTags } from "@/lib/workspace/signout/tokens";
import { computePod } from "@/lib/workspace/signout/pod";
import {
  apiCreateCard,
  apiCreateService,
  apiDeleteCard,
  apiListCards,
  apiReorder,
  apiRevealIdentity,
  apiSaveIdentity,
  apiUpdateCard,
  type SaveCardResult,
} from "@/components/workspace/signout/api";
import { PatientCard } from "@/components/workspace/signout/PatientCard";
import { SignoutTable } from "@/components/workspace/signout/SignoutTable";
import { HandoffSheet } from "@/components/workspace/signout/HandoffSheet";
import { SEVERITY_META } from "@/components/workspace/signout/severity";

type Props = {
  initialServices: SignoutService[];
  programId: string | null;
  currentUserId: string;
  currentUserName: string;
  preview?: boolean;
  previewCards?: SignoutCard[];
};

type View = "card" | "table";

export function SignoutBoard({
  initialServices,
  programId,
  currentUserId,
  currentUserName,
  preview = false,
  previewCards = [],
}: Props) {
  const [services, setServices] = useState<SignoutService[]>(initialServices);
  const [activeServiceId, setActiveServiceId] = useState<string | null>(
    initialServices[0]?.id ?? null
  );
  const [cards, setCards] = useState<SignoutCard[]>(preview ? previewCards : []);
  const [view, setView] = useState<View>("table");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("signout:view");
      if (saved === "card" || saved === "table") setView(saved);
    } catch {
      /* ignore */
    }
  }, []);
  const [loadingCards, setLoadingCards] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewers, setViewers] = useState(1);
  const cardsRef = useRef(cards);
  const saveTailsRef = useRef(new Map<string, Promise<void>>());
  const loadRequestRef = useRef(0);

  useEffect(() => {
    cardsRef.current = cards;
  }, [cards]);

  const [newService, setNewService] = useState("");
  const [addingService, setAddingService] = useState(false);
  const [newHandle, setNewHandle] = useState("");
  const [addingCard, setAddingCard] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);
  const newHandleRef = useRef<HTMLInputElement | null>(null);

  const [severityFilter, setSeverityFilter] = useState<SignoutSeverity | null>(null);
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set());
  const [postOpOnly, setPostOpOnly] = useState(false);
  const [showSignedOff, setShowSignedOff] = useState(false);

  const activeCards = useMemo(
    () => cards.filter((card) => card.status === "active"),
    [cards]
  );
  const signedOffCards = useMemo(
    () => cards.filter((card) => card.status === "discharged"),
    [cards]
  );

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const c of activeCards) for (const t of extractTags(c.body)) set.add(t);
    return [...set].sort();
  }, [activeCards]);

  const filteredCards = useMemo(
    () =>
      activeCards.filter((c) => {
        if (severityFilter && c.severity !== severityFilter) return false;
        if (postOpOnly) {
          // Only surgical patients with a past/current surgery date.
          if (c.managementMode === "nonop") return false;
          const p = computePod(c.surgeryDate);
          if (!p || p.preOp) return false;
        }
        if (activeTags.size) {
          const tags = new Set(extractTags(c.body));
          for (const t of activeTags) if (!tags.has(t)) return false;
        }
        return true;
      }),
    [activeCards, severityFilter, postOpOnly, activeTags]
  );

  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const loadCards = useCallback(async (serviceId: string) => {
    const requestId = ++loadRequestRef.current;
    setLoadingCards(true);
    setError(null);
    try {
      const loaded = await apiListCards(serviceId);
      if (requestId !== loadRequestRef.current) return;
      cardsRef.current = loaded;
      setCards(loaded);
    } catch (e) {
      if (requestId !== loadRequestRef.current) return;
      setError(e instanceof Error ? e.message : "Failed to load cards");
    } finally {
      if (requestId === loadRequestRef.current) setLoadingCards(false);
    }
  }, []);

  useEffect(() => {
    if (preview) return;
    if (activeServiceId) void loadCards(activeServiceId);
    else {
      loadRequestRef.current += 1;
      cardsRef.current = [];
      setCards([]);
      setLoadingCards(false);
    }
  }, [activeServiceId, loadCards, preview]);

  // Presence: how many teammates are viewing this service right now.
  useEffect(() => {
    if (preview || !activeServiceId) return;
    const supabase = createClient();
    const channel = supabase.channel(`signout:service:${activeServiceId}`, {
      config: { presence: { key: currentUserId } },
    });
    channel
      .on("presence", { event: "sync" }, () => {
        setViewers(Object.keys(channel.presenceState()).length || 1);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") void channel.track({ name: currentUserName });
      });
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [activeServiceId, currentUserId, currentUserName, preview]);

  const saveCard = useCallback(
    async (cardId: string, patch: UpdateCardPatch): Promise<SaveCardResult> => {
      // Optimistic concurrency requires each request to use the version returned
      // by the preceding request. Queue saves per card while allowing different
      // patients to save independently.
      const previous = saveTailsRef.current.get(cardId) ?? Promise.resolve();
      let result!: SaveCardResult;
      let failure: unknown;
      const operation = previous.catch(() => undefined).then(async () => {
        try {
          const target = cardsRef.current.find((c) => c.id === cardId);
          if (!target) {
            result = { ok: false, stale: true, currentVersion: 1 };
            return;
          }
          if (preview) {
            const updated: SignoutCard = {
              ...target,
              ...patch,
              version: target.version + 1,
              updatedAt: new Date().toISOString(),
            };
            cardsRef.current = cardsRef.current.map((c) =>
              c.id === cardId ? updated : c
            );
            setCards(cardsRef.current);
            result = { ok: true, card: updated };
            return;
          }
          result = await apiUpdateCard(cardId, target.version, patch);
          if (result.ok) {
            const savedCard = result.card;
            cardsRef.current = cardsRef.current.map((c) =>
              c.id === cardId ? savedCard : c
            );
            setCards(cardsRef.current);
          } else if (activeServiceId) {
            await loadCards(activeServiceId);
          }
        } catch (error) {
          failure = error;
        }
      });
      const tail = operation.then(() => undefined);
      saveTailsRef.current.set(cardId, tail);
      await operation;
      if (saveTailsRef.current.get(cardId) === tail) saveTailsRef.current.delete(cardId);
      if (failure) throw failure;
      return result;
    },
    [activeServiceId, loadCards, preview]
  );

  async function handleCreateService() {
    const name = newService.trim();
    if (!name) return;
    if (preview) {
      const service: SignoutService = {
        id: `svc-${Date.now()}`,
        programId: programId ?? "prog-demo",
        name,
        phiEnabled: false,
        isActive: true,
        createdBy: null,
        createdAt: new Date().toISOString(),
      };
      setServices((prev) => [...prev, service]);
      setActiveServiceId(service.id);
      setNewService("");
      return;
    }
    setAddingService(true);
    setError(null);
    try {
      const service = await apiCreateService(name);
      setServices((prev) => [...prev, service].sort((a, b) => a.name.localeCompare(b.name)));
      setActiveServiceId(service.id);
      setNewService("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create service");
    } finally {
      setAddingService(false);
    }
  }

  async function handleAddCard() {
    const handle = newHandle.trim();
    if (!handle || !activeServiceId) return;
    if (preview) {
      const card: SignoutCard = {
        id: `c-${Date.now()}`,
        serviceId: activeServiceId,
        handle,
        severity: "stable",
        location: "",
        surgery: "",
        surgeryDate: "",
        nextSurgery: "",
        nextSurgeryDate: "",
        managementMode: "",
        status: "active",
        sortOrder: cards.length,
        pinned: false,
        body: "",
        diagnostics: { version: 1, items: [] },
        attending: "",
        hasIdentifiers: false,
        version: 1,
        dischargedAt: null,
        createdBy: null,
        createdAt: new Date().toISOString(),
        updatedBy: null,
        updatedAt: new Date().toISOString(),
      };
      cardsRef.current = [card, ...cardsRef.current].map((item, sortOrder) => ({
        ...item,
        sortOrder,
      }));
      setCards(cardsRef.current);
      setNewHandle("");
      setShowAddCard(false);
      setViewPersist("card");
      requestAnimationFrame(() => {
        cardRefs.current[card.id]?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      return;
    }
    setAddingCard(true);
    setError(null);
    try {
      const card = await apiCreateCard(activeServiceId, { handle });
      const reordered = [card, ...cardsRef.current].map((item, sortOrder) => ({
        ...item,
        sortOrder,
      }));
      await apiReorder(
        activeServiceId,
        reordered.map((item) => ({ id: item.id, sortOrder: item.sortOrder }))
      );
      cardsRef.current = reordered;
      setCards(cardsRef.current);
      setNewHandle("");
      setShowAddCard(false);
      setViewPersist("card");
      requestAnimationFrame(() => {
        cardRefs.current[card.id]?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add patient");
    } finally {
      setAddingCard(false);
    }
  }

  async function handleDelete(cardId: string) {
    if (!window.confirm("Remove this patient from the sign-out?")) return;
    const snapshot = cards;
    setCards((prev) => prev.filter((c) => c.id !== cardId));
    if (preview) return;
    try {
      await apiDeleteCard(cardId);
    } catch (e) {
      setCards(snapshot); // roll back
      setError(e instanceof Error ? e.message : "Failed to remove patient");
    }
  }

  async function handleMove(cardId: string, dir: "up" | "down") {
    const index = cards.findIndex((c) => c.id === cardId);
    const swap = dir === "up" ? index - 1 : index + 1;
    if (index < 0 || swap < 0 || swap >= cards.length || !activeServiceId) return;
    const next = [...cards];
    [next[index], next[swap]] = [next[swap], next[index]];
    const reordered = next.map((c, i) => ({ ...c, sortOrder: i }));
    setCards(reordered);
    if (preview) return;
    try {
      await apiReorder(
        activeServiceId,
        reordered.map((c) => ({ id: c.id, sortOrder: c.sortOrder }))
      );
    } catch (e) {
      if (activeServiceId) await loadCards(activeServiceId);
      setError(e instanceof Error ? e.message : "Failed to reorder");
    }
  }

  async function saveIdentity(cardId: string, ids: PatientIdentifiers) {
    if (!preview) await apiSaveIdentity(cardId, ids);
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, hasIdentifiers: true } : c))
    );
  }

  async function revealIdentity(cardId: string): Promise<PatientIdentifiers> {
    if (preview) {
      return { name: "Jane Q. Sample", dob: "1954-03-02", mrn: "MRN-000123" };
    }
    return apiRevealIdentity(cardId);
  }

  function setViewPersist(next: View) {
    setView(next);
    try {
      window.localStorage.setItem("signout:view", next);
    } catch {
      /* ignore */
    }
  }

  function openCard(cardId: string) {
    setViewPersist("card");
    requestAnimationFrame(() => {
      cardRefs.current[cardId]?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  function toggleTag(tag: string) {
    setActiveTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }

  function clearFilters() {
    setSeverityFilter(null);
    setActiveTags(new Set());
    setPostOpOnly(false);
  }

  const filtersActive = severityFilter !== null || activeTags.size > 0 || postOpOnly;

  if (!programId) {
    return (
      <div className="min-h-[calc(100vh-52px)] bg-slate-50">
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Sign-out</h1>
          <p className="mt-2 text-sm text-slate-500">
            Join a program to use the shared sign-out list.
          </p>
        </div>
      </div>
    );
  }

  const activeService = services.find((s) => s.id === activeServiceId) ?? null;
  const severityCounts = {
    unstable: cards.filter((c) => c.severity === "unstable" && c.status === "active").length,
    watcher: cards.filter((c) => c.severity === "watcher" && c.status === "active").length,
    stable: cards.filter((c) => c.severity === "stable" && c.status === "active").length,
  };

  return (
    <div className="min-h-[calc(100vh-52px)] bg-slate-50 print:min-h-0 print:bg-white">
      <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 print:hidden">
      {/* Title + service tabs */}
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">Sign-out</h1>
        {activeServiceId && (
          <span className="flex items-center gap-1 text-xs font-semibold text-slate-500">
            <Users className="h-3.5 w-3.5" />
            {viewers} viewing
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {services.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setActiveServiceId(s.id)}
            className={`rounded-full px-3 py-1 text-sm font-semibold ${
              s.id === activeServiceId
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {s.name}
          </button>
        ))}
        <div className="flex items-center gap-1">
          <input
            value={newService}
            onChange={(e) => setNewService(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateService()}
            placeholder="New service"
            className="h-8 w-28 rounded-full border border-slate-200 px-3 text-sm outline-none focus:border-slate-400"
          />
          <button
            type="button"
            aria-label="Create service"
            onClick={handleCreateService}
            disabled={addingService || !newService.trim()}
            className="rounded-full bg-slate-100 p-1.5 text-slate-600 hover:bg-slate-200 disabled:opacity-40"
          >
            {addingService ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
          {error}
        </p>
      )}

      {activeService ? (
        <>
          {/* Controls row: view toggle + severity legend + print */}
          <div className="mt-4 flex items-center justify-between gap-2">
            <div className="inline-flex overflow-hidden rounded-full border border-slate-200 text-sm">
              <button
                type="button"
                onClick={() => setViewPersist("card")}
                className={`flex items-center gap-1 px-3 py-1 ${
                  view === "card" ? "bg-blue-50 text-blue-800" : "text-slate-500"
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" /> Card
              </button>
              <button
                type="button"
                onClick={() => setViewPersist("table")}
                className={`flex items-center gap-1 px-3 py-1 ${
                  view === "table" ? "bg-blue-50 text-blue-800" : "text-slate-500"
                }`}
              >
                <TableIcon className="h-3.5 w-3.5" /> Table
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden items-center gap-1.5 text-[11px] font-semibold sm:flex">
                {(["unstable", "watcher", "stable"] as SignoutSeverity[]).map((sev) => (
                  <button
                    key={sev}
                    type="button"
                    aria-pressed={severityFilter === sev}
                    onClick={() =>
                      setSeverityFilter((prev) => (prev === sev ? null : sev))
                    }
                    className={`rounded-full px-2 py-0.5 ${SEVERITY_META[sev].chip} ${
                      severityFilter === sev ? "ring-2 ring-slate-400" : ""
                    } ${severityFilter && severityFilter !== sev ? "opacity-40" : ""}`}
                    title={`${SEVERITY_META[sev].label} — filter`}
                  >
                    {severityCounts[sev]}
                  </button>
                ))}
              </span>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-600 hover:border-slate-400"
              >
                <Printer className="h-3.5 w-3.5" /> Handoff
              </button>
            </div>
          </div>

          {/* Filter row: post-op toggle + #tags + clear */}
          {(allTags.length > 0 || filtersActive) && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
              <button
                type="button"
                aria-pressed={postOpOnly}
                onClick={() => setPostOpOnly((v) => !v)}
                className={`rounded-full px-2 py-0.5 ${
                  postOpOnly ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-600"
                }`}
              >
                Post-op
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  aria-pressed={activeTags.has(tag)}
                  onClick={() => toggleTag(tag)}
                  className={`rounded-full px-2 py-0.5 ${
                    activeTags.has(tag)
                      ? "bg-slate-800 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  #{tag}
                </button>
              ))}
              {filtersActive && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="px-2 py-0.5 text-slate-500 underline"
                >
                  Clear
                </button>
              )}
            </div>
          )}

          {/* Explicit add flow */}
          <div className="mt-3">
            {!showAddCard ? (
              <button
                type="button"
                onClick={() => {
                  setShowAddCard(true);
                  requestAnimationFrame(() => newHandleRef.current?.focus());
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 hover:border-blue-400 hover:bg-blue-50/40"
              >
                <Plus className="h-4 w-4" /> Add patient
              </button>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleAddCard();
                }}
                className="rounded-xl border border-blue-200 bg-white p-3 shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-900">Add patient</p>
                    <p className="text-xs text-slate-500">Use a concise roster label, name, or bed.</p>
                  </div>
                  <button
                    type="button"
                    aria-label="Cancel adding patient"
                    onClick={() => {
                      setShowAddCard(false);
                      setNewHandle("");
                    }}
                    className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <label className="mt-3 block text-xs font-bold text-slate-700" htmlFor="new-patient-handle">
                  Patient label
                </label>
                <div className="mt-1 flex flex-col gap-2 sm:flex-row">
                  <input
                    ref={newHandleRef}
                    id="new-patient-handle"
                    value={newHandle}
                    onChange={(e) => setNewHandle(e.target.value)}
                    maxLength={40}
                    placeholder="e.g. Smith, J. or 7W-12"
                    className="h-10 flex-1 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                  <button
                    type="submit"
                    disabled={addingCard || !newHandle.trim()}
                    className="flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {addingCard ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Add patient
                  </button>
                </div>
                <p className="mt-1.5 text-xs text-slate-400">The patient will appear at the top of the list.</p>
              </form>
            )}
          </div>

          {/* Body */}
          {loadingCards ? (
            <p className="mt-8 text-center text-sm text-slate-400">Loading…</p>
          ) : cards.length === 0 ? (
            <p className="mt-8 text-center text-sm text-slate-400">
              No patients yet. Add your first above.
            </p>
          ) : activeCards.length === 0 && !filtersActive ? (
            <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center">
              <p className="text-sm font-bold text-slate-700">Active list is clear</p>
              <p className="mt-1 text-xs text-slate-500">
                Signed-off patients are safely tucked below and can be restored anytime.
              </p>
            </div>
          ) : filteredCards.length === 0 ? (
            <p className="mt-8 text-center text-sm text-slate-400">
              No patients match the filters.
            </p>
          ) : view === "card" ? (
            <div className="mt-3 flex flex-col gap-3">
              {filteredCards.map((card, i) => (
                <div
                  key={card.id}
                  ref={(el) => {
                    cardRefs.current[card.id] = el;
                  }}
                >
                  <PatientCard
                    card={card}
                    phiEnabled={activeService?.phiEnabled ?? false}
                    onSave={(patch) => saveCard(card.id, patch)}
                    onDelete={() => handleDelete(card.id)}
                    onMove={(dir) => handleMove(card.id, dir)}
                    onSaveIdentity={(ids) => saveIdentity(card.id, ids)}
                    onRevealIdentity={() => revealIdentity(card.id)}
                    canMoveUp={i > 0}
                    canMoveDown={i < filteredCards.length - 1}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-3">
              <SignoutTable
                cards={filteredCards}
                onSaveCard={saveCard}
                onOpenCard={openCard}
                onSignOff={(cardId) => saveCard(cardId, { status: "discharged" })}
              />
            </div>
          )}

          {signedOffCards.length > 0 && (
            <section className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white">
              <button
                type="button"
                aria-expanded={showSignedOff}
                onClick={() => setShowSignedOff((value) => !value)}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-slate-50"
              >
                {showSignedOff ? (
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                )}
                <span className="text-sm font-bold text-slate-700">Signed off</span>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">
                  {signedOffCards.length}
                </span>
                <span className="ml-auto hidden text-xs text-slate-400 sm:inline">
                  Hidden from the active list and handoff
                </span>
              </button>
              {showSignedOff && (
                <div className="divide-y divide-slate-100 border-t border-slate-200">
                  {signedOffCards.map((card) => (
                    <div key={card.id} className="flex items-center gap-3 px-4 py-2.5">
                      <div className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-slate-700 hover:underline">
                          {card.handle}
                        </span>
                        <span className="block truncate text-xs text-slate-400">
                          {[card.location, card.attending].filter(Boolean).join(" · ") || "No location entered"}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => void saveCard(card.id, { status: "active" })}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Restore
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      ) : (
        <p className="mt-8 text-center text-sm text-slate-400">
          Create a service above to start a sign-out list.
        </p>
      )}
      </div>

      {/* Printable multi-column handoff (location-ordered; screen-hidden). */}
      <HandoffSheet serviceName={activeService?.name ?? ""} cards={activeCards} />
    </div>
  );
}
