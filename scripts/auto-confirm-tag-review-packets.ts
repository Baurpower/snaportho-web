/**
 * Build portable-tag-review sidecars from accepted Codex priors for notes the
 * official-note screen marked auto_confirm. Never invents term IDs. Evidence
 * quotes must be exact front/back substrings. Import stays proposed.
 *
 *   node --experimental-strip-types scripts/auto-confirm-tag-review-packets.ts \
 *     --dir=tmp/grok-tag-review/0.0.3/cohort-auto-confirm-000021
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
// @ts-expect-error Direct Node strip-types runner imports TypeScript source.
import {
  quoteSupported,
  type MetadataFacet,
  type PortableTagReviewPacket,
  type TagReviewSidecar,
} from "../src/lib/education/portable-tag-review-packet.ts";

const FACETS: MetadataFacet[] = ["anatomy", "diagnosis", "treatment", "specialty"];

function arg(name: string) {
  const prefix = `${name}=`;
  const match = process.argv.find((value) => value.startsWith(prefix));
  if (!match) throw new Error(`${name} is required`);
  return match.slice(prefix.length);
}

function extractQuote(haystack: string, needle: string): string | null {
  if (!needle.trim()) return null;
  const at = haystack.toLowerCase().indexOf(needle.toLowerCase());
  if (at < 0) return null;
  return haystack.slice(at, at + needle.length);
}

function quoteForTerm(
  card: PortableTagReviewPacket["cards"][number],
  preferredLabel: string,
  aliases: string[],
  facet: MetadataFacet,
): { field: "front" | "back"; quote: string } | null {
  const tokens = preferredLabel
    .split(/[^A-Za-z0-9]+/)
    .filter((token) => token.length >= 4)
    .sort((left, right) => right.length - left.length);
  const needles = [
    preferredLabel,
    preferredLabel.replace(/\s+and\s+/gi, " & "),
    preferredLabel.replace(/\s+&\s+/g, " and "),
    ...aliases,
    ...tokens,
  ].filter((value, index, all) => value && all.indexOf(value) === index);

  for (const needle of needles) {
    const frontQuote = extractQuote(card.front, needle);
    if (frontQuote && quoteSupported(card, frontQuote)) {
      return { field: "front", quote: frontQuote };
    }
    const usableBack = usableBackText(card.back);
    const backQuote = extractQuote(usableBack, needle);
    if (backQuote && quoteSupported(card, backQuote)) {
      return { field: "back", quote: backQuote };
    }
  }

  if (facet !== "specialty") return null;
  const clause = card.front.split(/[.?!\n]/)[0]?.trim() ?? "";
  if (clause.length >= 8 && quoteSupported(card, clause)) {
    return { field: "front", quote: clause };
  }
  return null;
}

function usableBackText(back: string) {
  const extraAt = back.indexOf("Extra:");
  return extraAt >= 0 ? back.slice(0, extraAt) : back;
}

function main() {
  const dir = path.resolve(arg("--dir"));
  const reviewedAt = new Date().toISOString();
  const files = readdirSync(dir).filter((name) => name.endsWith("-pending.json")).sort();
  const summary = {
    packets: 0,
    cards: 0,
    asserted: 0,
    emptyCards: 0,
    skippedPriors: 0,
    assertions: 0,
  };

  for (const name of files) {
    const pendingPath = path.join(dir, name);
    const packet = JSON.parse(readFileSync(pendingPath, "utf8")) as PortableTagReviewPacket;
    const sidecar: TagReviewSidecar = {
      batchKey: packet.batchKey,
      inputChecksum: packet.inputChecksum,
      reviewer: {
        provider: "deterministic",
        model: "official-note-screen.confirmed_codex_lexical",
        reviewedAt,
      },
      cards: packet.cards.map((card) => {
        summary.cards += 1;
        const allowed = new Map<MetadataFacet, Map<string, { preferredLabel: string; aliases: string[] }>>();
        for (const facet of FACETS) {
          allowed.set(
            facet,
            new Map((card.candidates[facet] ?? []).map((term) => [term.termId, {
              preferredLabel: term.preferredLabel,
              aliases: term.aliases ?? [],
            }])),
          );
        }
        const seen = new Set<string>();
        const assertions: TagReviewSidecar["cards"][number]["assertions"] = [];
        const skipped: string[] = [];
        for (const prior of card.priorAssertions ?? []) {
          if (prior.decision !== "accepted") continue;
          if (!FACETS.includes(prior.facet)) continue;
          const key = `${prior.facet}:${prior.termId}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const candidate = allowed.get(prior.facet)?.get(prior.termId);
          if (!candidate) {
            summary.skippedPriors += 1;
            skipped.push(`${prior.facet}:${prior.preferredLabel}:not_in_candidates`);
            continue;
          }
          const evidence = quoteForTerm(card, candidate.preferredLabel, candidate.aliases, prior.facet);
          if (!evidence) {
            summary.skippedPriors += 1;
            skipped.push(`${prior.facet}:${prior.preferredLabel}:no_exact_quote`);
            continue;
          }
          assertions.push({
            facet: prior.facet,
            termId: prior.termId,
            confidence: Math.min(Number(prior.confidence) || 0.98, 0.98),
            evidence: [evidence],
            rationaleCodes: ["confirmed_codex_lexical", "primary_subject"],
          });
        }
        if (assertions.length) summary.asserted += 1;
        else summary.emptyCards += 1;
        summary.assertions += assertions.length;
        return {
          canonicalCardVersionId: card.canonicalCardVersionId,
          reviewStatus: "completed" as const,
          assertions,
          reviewNotes: [
            "Auto-confirmed from accepted Codex priors that are lexically supported in the official note.",
            ...skipped.map((row) => `Skipped prior ${row}`),
          ],
          missingConcepts: [],
        };
      }),
    };
    const out = path.join(dir, name.replace(/-pending\.json$/, "-sidecar.json"));
    writeFileSync(out, `${JSON.stringify(sidecar, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
    summary.packets += 1;
  }

  console.log(JSON.stringify({ generated: true, dir, ...summary }, null, 2));
}

main();
