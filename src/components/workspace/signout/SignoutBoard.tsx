"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutGrid,
  Table as TableIcon,
  Plus,
  Printer,
  Users,
  Loader2,
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
import { splitFields } from "@/lib/workspace/signout/fields";
import {
  apiCreateCard,
  apiCreateService,
  apiDeleteCard,
  apiListCards,
  apiReorder,
  apiDraftCard,
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
  const [view, setView] = useState<View>(() => {
    if (typeof window === "undefined") return "table";
    try {
      const saved = window.localStorage.getItem("signout:view");
      if (saved === "card" || saved === "table") return saved;
    } catch {
      /* ignore */
    }
    return "table";
  });
  const [loadingCards, setLoadingCards] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewers, setViewers] = useState(1);

  const [newService, setNewService] = useState("");
  const [addingService, setAddingService] = useState(false);
  const [newHandle, setNewHandle] = useState("");
  const [addingCard, setAddingCard] = useState(false);

  const [severityFilter, setSeverityFilter] = useState<SignoutSeverity | null>(null);
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set());
  const [postOpOnly, setPostOpOnly] = useState(false);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const c of cards) for (const t of extractTags(c.body)) set.add(t);
    return [...set].sort();
  }, [cards]);

  const filteredCards = useMemo(
    () =>
      cards.filter((c) => {
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
    [cards, severityFilter, postOpOnly, activeTags]
  );

  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const loadCards = useCallback(async (serviceId: string) => {
    setLoadingCards(true);
    setError(null);
    try {
      setCards(await apiListCards(serviceId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load cards");
    } finally {
      setLoadingCards(false);
    }
  }, []);

  useEffect(() => {
    if (preview) return;
    if (activeServiceId) void loadCards(activeServiceId);
    else setCards([]);
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
  }, [activeServiceId, currentUserId, currentUserName]);

  const saveCard = useCallback(
    async (cardId: string, patch: UpdateCardPatch): Promise<SaveCardResult> => {
      const target = cards.find((c) => c.id === cardId);
      if (!target) return { ok: false, stale: true, currentVersion: 1 };
      if (preview) {
        const updated: SignoutCard = {
          ...target,
          ...patch,
          version: target.version + 1,
          updatedAt: new Date().toISOString(),
        };
        setCards((prev) => prev.map((c) => (c.id === cardId ? updated : c)));
        return { ok: true, card: updated };
      }
      const result = await apiUpdateCard(cardId, target.version, patch);
      if (result.ok) {
        setCards((prev) => prev.map((c) => (c.id === cardId ? result.card : c)));
      } else if (activeServiceId) {
        await loadCards(activeServiceId); // pull the latest after a conflict
      }
      return result;
    },
    [cards, activeServiceId, loadCards, preview]
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
        attending: "",
        hasIdentifiers: false,
        version: 1,
        dischargedAt: null,
        createdBy: null,
        createdAt: new Date().toISOString(),
        updatedBy: null,
        updatedAt: new Date().toISOString(),
      };
      setCards((prev) => [...prev, card]);
      setNewHandle("");
      return;
    }
    setAddingCard(true);
    setError(null);
    try {
      const card = await apiCreateCard(activeServiceId, { handle });
      setCards((prev) => [...prev, card]);
      setNewHandle("");
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

  async function generateDraft(cardId: string): Promise<string> {
    if (!preview) return apiDraftCard(cardId);
    // Local mock so the design is verifiable without OpenAI.
    const card = cards.find((c) => c.id === cardId);
    if (!card) return "";
    const f = splitFields(card.body);
    const pod = computePod(card.surgeryDate);
    const surgeryLine = [pod?.label, card.surgery ? `s/p ${card.surgery}` : ""]
      .filter(Boolean)
      .join(" ");
    return [
      `{{name}}, ${f.lead || "patient"}.`,
      surgeryLine,
      f.values["HPI/Exam"],
      f.values["Labs/Imaging/PT"],
      f.values["Plan"],
    ]
      .filter((p) => p && p.trim())
      .join("\n\n");
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

          {/* Quick add */}
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-dashed border-slate-300 px-3 py-2">
            <Plus className="h-4 w-4 text-slate-400" />
            <input
              value={newHandle}
              onChange={(e) => setNewHandle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddCard()}
              placeholder="Add a patient — type a bed like 7W-12 and press enter"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
            />
            {addingCard && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
          </div>

          {/* Body */}
          {loadingCards ? (
            <p className="mt-8 text-center text-sm text-slate-400">Loading…</p>
          ) : cards.length === 0 ? (
            <p className="mt-8 text-center text-sm text-slate-400">
              No patients yet. Add your first above.
            </p>
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
                    onGenerateDraft={() => generateDraft(card.id)}
                    canMoveUp={i > 0}
                    canMoveDown={i < filteredCards.length - 1}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-3">
              <SignoutTable cards={filteredCards} onSaveCard={saveCard} onOpenCard={openCard} />
            </div>
          )}
        </>
      ) : (
        <p className="mt-8 text-center text-sm text-slate-400">
          Create a service above to start a sign-out list.
        </p>
      )}
      </div>

      {/* Printable multi-column handoff (location-ordered; screen-hidden). */}
      <HandoffSheet serviceName={activeService?.name ?? ""} cards={cards} />
    </div>
  );
}
