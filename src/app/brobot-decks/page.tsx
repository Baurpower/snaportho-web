"use client";

import Image from "next/image";
import React, { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowPathIcon,
  Bars3Icon,
  PlusIcon,
  TagIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

import { useAuth } from "@/context/AuthContext";
import Nav from "@/components/Nav";
import AccountDropdown from "@/components/accountdropdown";
import { createClient } from "@/utils/supabase/client";
import {
  aggregateCaseField,
  aggregatePlanKeywords,
  aggregatePlanTags,
  aggregatePlanTopics,
  splitRawCaseLines,
  type BroBotDeckPlan,
  type GeneratedTopic,
  type ParsedCase,
} from "@/lib/brobot-anki/plan-generator";

export default function BroBotDecksPage() {
  const router = useRouter();
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  const [menuOpen, setMenuOpen] = useState(false);
  const [rawInput, setRawInput] = useState("");
  const [plan, setPlan] = useState<BroBotDeckPlan | null>(null);
  const [keywordDraft, setKeywordDraft] = useState("");
  const [topicDraft, setTopicDraft] = useState("");
  const [building, setBuilding] = useState(false);
  const [sending, setSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [authChecked, setAuthChecked] = useState(false);

  const parsedCases = useMemo(() => splitRawCaseLines(rawInput), [rawInput]);

  useEffect(() => {
    let isMounted = true;

    if (user) {
      setAuthChecked(true);
      return () => {
        isMounted = false;
      };
    }

    const checkAuth = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!isMounted) {
        return;
      }

      if (authUser) {
        setAuthChecked(true);
        return;
      }

      setAuthChecked(true);
      router.replace("/auth/sign-in?redirectTo=/brobot-decks");
    };

    void checkAuth();

    return () => {
      isMounted = false;
    };
  }, [router, supabase, user]);

  if (!authChecked || !user) {
    return null;
  }

  async function handleBuildPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = rawInput.trim();
    if (!trimmed) {
      setErrorMessage("Enter at least one case to build an Anki plan.");
      setSuccessMessage("");
      setPlan(null);
      return;
    }

    setBuilding(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/brobot-anki/generate-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rawCaseInput: trimmed }),
      });

      const json = (await response.json().catch(() => null)) as
        | (BroBotDeckPlan & { error?: never })
        | { error?: string }
        | null;

      if (!response.ok || !isBroBotDeckPlan(json)) {
        throw new Error(json?.error ?? "Failed to build Anki plan.");
      }

      setPlan(json);
      setKeywordDraft("");
      setTopicDraft("");
    } catch (error) {
      setPlan(null);
      setErrorMessage(
        error instanceof Error ? error.message : "Something went wrong while building the plan."
      );
    } finally {
      setBuilding(false);
    }
  }

  function updatePlan<K extends keyof BroBotDeckPlan>(key: K, value: BroBotDeckPlan[K]) {
    setPlan((current) => (current ? { ...current, [key]: value } : current));
  }

  function addKeyword() {
    const normalized = keywordDraft.trim();
    if (!normalized || !plan) {
      return;
    }

    const nextKeywords = dedupeStrings([...plan.generatedKeywords, normalized]);
    updatePlan("generatedKeywords", nextKeywords);
    setKeywordDraft("");
  }

  function removeKeyword(keyword: string) {
    if (!plan) {
      return;
    }

    updatePlan(
      "generatedKeywords",
      plan.generatedKeywords.filter((item) => item !== keyword)
    );
  }

  function addTopic() {
    const normalized = topicDraft.trim();
    if (!normalized || !plan) {
      return;
    }

    const nextTopic: GeneratedTopic = {
      category: "custom",
      topic: normalized,
      priority: 2,
    };

    updatePlan("generatedTopics", [...plan.generatedTopics, nextTopic]);
    setTopicDraft("");
  }

  function removeTopic(index: number) {
    if (!plan) {
      return;
    }

    updatePlan(
      "generatedTopics",
      plan.generatedTopics.filter((_, topicIndex) => topicIndex !== index)
    );
  }

  function updateParsedCase<K extends keyof ParsedCase>(
    caseId: string,
    key: K,
    value: ParsedCase[K]
  ) {
    setPlan((current) => {
      if (!current) {
        return current;
      }

      const nextParsedCases = current.parsedCases.map((parsedCase) =>
        parsedCase.id === caseId ? { ...parsedCase, [key]: value } : parsedCase
      );

      return {
        ...current,
        parsedCases: nextParsedCases,
        generatedKeywords: aggregatePlanKeywords(nextParsedCases, current.generatedKeywords),
        generatedTopics: aggregatePlanTopics(nextParsedCases, current.generatedTopics),
        suggestedTags: aggregatePlanTags(nextParsedCases),
      };
    });
  }

  async function handleSendToAnki() {
    if (!plan) {
      return;
    }

    setSending(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/brobot-anki/prep", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: plan.title,
          rawCaseInput: plan.rawCaseInput,
          diagnosis: aggregateCaseField(plan.parsedCases, "diagnosis"),
          procedure: aggregateCaseField(plan.parsedCases, "procedure"),
          bodyRegion: aggregateCaseField(plan.parsedCases, "bodyRegion"),
          subspecialty: aggregateCaseField(plan.parsedCases, "subspecialty"),
          generatedSummary: plan.generatedSummary,
          generatedKeywords: plan.generatedKeywords,
          generatedTopics: plan.generatedTopics,
          suggestedTags: plan.suggestedTags,
        }),
      });

      const json = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(json?.error ?? "Failed to send prep request.");
      }

      setSuccessMessage(
        "Sent to Anki. Open Anki Desktop with the SnapOrtho add-on installed to tag your cards."
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong while sending to Anki."
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#fefcf7] text-[#1A1C2C]">
      <Nav />

      <div className="mt-16 flex items-center justify-between bg-[#fefcf7] px-6 py-2 relative">
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          className="rounded bg-white p-2 shadow"
          aria-label="Toggle case preview"
        >
          <Bars3Icon className="h-6 w-6 text-gray-700" />
        </button>

        <AccountDropdown />

        {menuOpen && (
          <div className="absolute left-6 top-full z-50 w-72 rounded-xl bg-white p-4 shadow-lg border border-[#d6d2c7]">
            <p className="text-sm font-semibold text-[#1A1C2C]">Tonight&apos;s case preview</p>
            <div className="mt-3 space-y-2 text-sm text-gray-700">
              {parsedCases.length === 0 ? (
                <p>No cases entered yet.</p>
              ) : (
                parsedCases.map((item, index) => (
                  <div
                    key={`${item}-${index}`}
                    className="rounded-lg bg-[#f8f5ee] px-3 py-2"
                  >
                    {item}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <BroBotDecksHeader />

      <main className="mx-auto max-w-5xl px-6 pb-12 pt-6">
        {(building || sending) && (
          <LoadingOverlay label={building ? "Building your Anki plan" : "Sending to Anki"} />
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.9fr)]">
          <div className="space-y-6">
            <form onSubmit={handleBuildPlan} className="space-y-6">
              <Card title="Build Tonight&apos;s Study Plan">
                <label htmlFor="tomorrows-cases" className="block text-sm font-semibold text-[#1A1C2C]">
                  Enter Tomorrow&apos;s Cases
                </label>
                <textarea
                  id="tomorrows-cases"
                  rows={7}
                  value={rawInput}
                  onChange={(event) => setRawInput(event.target.value)}
                  placeholder={`Example:\n1. Tibial plateau ORIF\n2. Distal radius ORIF\n3. Hip hemiarthroplasty`}
                  className="mt-2 w-full rounded-md border border-gray-300 p-3 shadow-sm focus:ring-2 focus:ring-teal-600"
                />
                <button
                  type="submit"
                  disabled={building || sending || rawInput.trim().length === 0}
                  className="inline-flex items-center rounded-md bg-teal-600 px-5 py-2 text-white shadow hover:bg-teal-700 disabled:opacity-40"
                >
                  <ArrowPathIcon className="mr-2 h-5 w-5" />
                  Build Anki Plan
                </button>
              </Card>
            </form>

            {errorMessage ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </div>
            ) : null}

            {successMessage ? (
              <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">
                {successMessage}
              </div>
            ) : null}

            {plan ? (
              <Card title="Editable Anki Search Plan">
                <div className="space-y-5">
                  <div>
                    <label htmlFor="anki-plan-title" className="block text-sm font-semibold">
                      Plan Title
                    </label>
                    <input
                      id="anki-plan-title"
                      value={plan.title}
                      onChange={(event) => updatePlan("title", event.target.value)}
                      className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:ring-2 focus:ring-teal-600"
                    />
                  </div>

                  <div>
                    <p className="text-sm font-semibold">Parsed Cases</p>
                    <div className="mt-3 space-y-4">
                      {plan.parsedCases.map((parsedCase, index) => (
                        <ParsedCaseCard
                          key={parsedCase.id}
                          parsedCase={parsedCase}
                          index={index}
                          onChange={updateParsedCase}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="anki-summary" className="block text-sm font-semibold">
                      Summary
                    </label>
                    <textarea
                      id="anki-summary"
                      rows={5}
                      value={plan.generatedSummary}
                      onChange={(event) => updatePlan("generatedSummary", event.target.value)}
                      className="mt-2 w-full rounded-md border border-gray-300 p-3 shadow-sm focus:ring-2 focus:ring-teal-600"
                    />
                  </div>

                  <div>
                    <p className="text-sm font-semibold">Keywords</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {plan.generatedKeywords.map((keyword) => (
                        <Chip
                          key={keyword}
                          label={keyword}
                          onRemove={() => removeKeyword(keyword)}
                        />
                      ))}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <input
                        value={keywordDraft}
                        onChange={(event) => setKeywordDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            addKeyword();
                          }
                        }}
                        placeholder="Add keyword"
                        className="flex-1 rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:ring-2 focus:ring-teal-600"
                      />
                      <button
                        type="button"
                        onClick={addKeyword}
                        className="inline-flex items-center rounded-md border border-teal-200 bg-white px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50"
                      >
                        <PlusIcon className="mr-1 h-4 w-4" />
                        Add
                      </button>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-semibold">Topics</p>
                    <div className="mt-3 space-y-2">
                      {plan.generatedTopics.map((topic, index) => (
                        <div
                          key={`${topic.category}-${topic.topic}-${index}`}
                          className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm"
                        >
                          <div>
                            <p className="font-medium text-[#1A1C2C]">{topic.topic}</p>
                            <p className="text-xs uppercase tracking-wide text-gray-500">
                              {topic.category} · Priority {topic.priority}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeTopic(index)}
                            className="rounded-full p-2 text-gray-500 hover:bg-red-50 hover:text-red-600"
                            aria-label={`Remove topic ${topic.topic}`}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <input
                        value={topicDraft}
                        onChange={(event) => setTopicDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            addTopic();
                          }
                        }}
                        placeholder="Add topic"
                        className="flex-1 rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:ring-2 focus:ring-teal-600"
                      />
                      <button
                        type="button"
                        onClick={addTopic}
                        className="inline-flex items-center rounded-md border border-teal-200 bg-white px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50"
                      >
                        <PlusIcon className="mr-1 h-4 w-4" />
                        Add
                      </button>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-semibold">Suggested Tags</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {plan.suggestedTags.map((tag) => (
                        <Chip key={tag} label={tag} />
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSendToAnki}
                    disabled={sending}
                    className="inline-flex items-center rounded-md bg-teal-600 px-5 py-2 text-white shadow hover:bg-teal-700 disabled:opacity-40"
                  >
                    <TagIcon className="mr-2 h-5 w-5" />
                    Send to Anki Add-on
                  </button>
                </div>
              </Card>
            ) : null}
          </div>

          <div className="space-y-6">
            <Card title="How It Works">
              <ul className="space-y-3 text-sm text-gray-700">
                <li>BroBot builds search terms from tomorrow&apos;s cases.</li>
                <li>The Anki add-on pulls the plan.</li>
                <li>Old SnapOrtho::Tonight tags are cleared.</li>
                <li>New matching cards are tagged for a filtered study session.</li>
              </ul>
            </Card>

            <Card title="Plan Preview">
              <div className="space-y-4 text-sm text-gray-700">
                <p>
                  Cases detected: <span className="font-semibold text-[#1A1C2C]">{parsedCases.length}</span>
                </p>
                <div className="space-y-2">
                  {parsedCases.length === 0 ? (
                    <p>No cases parsed yet.</p>
                  ) : (
                    parsedCases.map((item, index) => (
                      <div key={`${item}-preview-${index}`} className="rounded-lg bg-[#f8f5ee] px-3 py-2">
                        {item}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

function BroBotDecksHeader() {
  return (
    <header className="px-6 pb-12 text-center">
      <div className="mx-auto flex flex-col items-center space-y-4">
        <div className="flex items-center space-x-4">
          <Image
            src="/brologo.png"
            alt="Bro Logo"
            width={80}
            height={80}
            className="h-16 w-16 rounded-full sm:h-20 sm:w-20"
          />
          <h1 className="text-4xl font-extrabold tracking-tight text-[#1A1C2C] sm:text-5xl">
            BroBot <span className="text-teal-600">Decks</span>
          </h1>
        </div>
        <p className="max-w-xl text-lg text-gray-800">
          Turn tomorrow&apos;s cases into a focused Anki study session.
        </p>
      </div>
    </header>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4 rounded-2xl border border-[#d6d2c7] bg-[#fefdfb] px-6 py-8 shadow-sm">
      <h2 className="text-xl font-semibold text-[#1A1C2C]">{title}</h2>
      {children}
    </div>
  );
}

function Chip({
  label,
  onRemove,
}: {
  label: string;
  onRemove?: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-teal-100 px-3 py-1 text-sm font-medium text-teal-900">
      {label}
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          className="rounded-full p-0.5 text-teal-800 hover:bg-teal-200"
          aria-label={`Remove ${label}`}
        >
          <TrashIcon className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </span>
  );
}

function EditableMetaField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold">{label}</label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:ring-2 focus:ring-teal-600"
      />
    </div>
  );
}

function ParsedCaseCard({
  parsedCase,
  index,
  onChange,
}: {
  parsedCase: ParsedCase;
  index: number;
  onChange: <K extends keyof ParsedCase>(
    caseId: string,
    key: K,
    value: ParsedCase[K]
  ) => void;
}) {
  return (
    <div className="rounded-2xl border border-[#d6d2c7] bg-[#f8f5ee] p-4 shadow-sm">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-[#1A1C2C]">Case {index + 1}</p>
        <p className="text-sm text-gray-600">{parsedCase.rawText}</p>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <EditableMetaField
          label="Diagnosis"
          value={parsedCase.diagnosis}
          onChange={(value) => onChange(parsedCase.id, "diagnosis", value)}
        />
        <EditableMetaField
          label="Procedure"
          value={parsedCase.procedure}
          onChange={(value) => onChange(parsedCase.id, "procedure", value)}
        />
        <EditableMetaField
          label="Body Region"
          value={parsedCase.bodyRegion}
          onChange={(value) => onChange(parsedCase.id, "bodyRegion", value)}
        />
        <EditableMetaField
          label="Subspecialty"
          value={parsedCase.subspecialty}
          onChange={(value) => onChange(parsedCase.id, "subspecialty", value)}
        />
      </div>

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Case Keywords
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {parsedCase.generatedKeywords.map((keyword) => (
            <Chip key={`${parsedCase.id}-${keyword}`} label={keyword} />
          ))}
        </div>
      </div>

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Case Tags
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {parsedCase.suggestedTags.map((tag) => (
            <Chip key={`${parsedCase.id}-${tag}`} label={tag} />
          ))}
        </div>
      </div>
    </div>
  );
}

function LoadingOverlay({ label }: { label: string }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
      <div className="mb-6 h-14 w-14 animate-spin rounded-full border-4 border-gray-200 border-t-teal-600" />
      <h3 className="text-2xl font-bold tracking-tight text-teal-700">{label}</h3>
      <p className="mt-2 text-sm text-[#444]">Powered by SnapOrtho</p>
    </div>
  );
}

function dedupeStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const trimmed = value.trim();
    const key = trimmed.toLowerCase();

    if (!trimmed || seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(trimmed);
  }

  return result;
}

function isBroBotDeckPlan(value: BroBotDeckPlan | { error?: string } | null): value is BroBotDeckPlan {
  return Boolean(
    value &&
      typeof value === "object" &&
      "title" in value &&
      "rawCaseInput" in value &&
      "generatedSummary" in value &&
      "parsedCases" in value &&
      "generatedKeywords" in value &&
      "generatedTopics" in value &&
      "suggestedTags" in value
  );
}
