import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
// @ts-expect-error Direct Node strip-types runner imports TypeScript source.
import {
  applyTagReviewSidecar,
  trimLowRiskAssertions,
  type PortableTagReviewPacket,
  type TagReviewSidecar,
} from "../src/lib/education/portable-tag-review-packet.ts";

function arg(name: string) {
  const prefix = `${name}=`;
  const match = process.argv.find((value) => value.startsWith(prefix));
  if (!match) throw new Error(`${name} is required`);
  return match.slice(prefix.length);
}

const pendingPath = path.resolve(arg("--pending"));
const sidecarPath = path.resolve(arg("--sidecar"));
const outPath = path.resolve(arg("--out"));
const packet = JSON.parse(readFileSync(pendingPath, "utf8")) as PortableTagReviewPacket;
const sidecar = JSON.parse(readFileSync(sidecarPath, "utf8")) as TagReviewSidecar;
const merged = applyTagReviewSidecar(packet, sidecar);
if (process.argv.includes("--trim-low-risk")) {
  merged.cards = merged.cards.map((card) => ({
    ...card,
    assertions: trimLowRiskAssertions(card),
  }));
}
writeFileSync(outPath, `${JSON.stringify(merged, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
console.log(JSON.stringify({
  merged: true,
  out: outPath,
  cards: merged.cards.length,
  assertions: merged.cards.reduce((sum, card) => sum + card.assertions.length, 0),
  missingConcepts: merged.cards.reduce((sum, card) => sum + (card.missingConcepts?.length ?? 0), 0),
}, null, 2));
