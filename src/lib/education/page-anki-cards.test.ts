import assert from "node:assert/strict";
import { canonicalLearningPageUrl, pageReviewCard } from "./page-anki-cards.ts";

assert.equal(canonicalLearningPageUrl("https://orthobullets.com/trauma/1022/olecranon-fractures/?utm_source=x#top", "orthobullets"), "https://www.orthobullets.com/trauma/1022/olecranon-fractures");
assert.equal(canonicalLearningPageUrl("https://rock.aaos.org/coursecontent.aspx?foo=x&id=6003020#part", "rock"), "https://rock.aaos.org/coursecontent.aspx?id=6003020");
assert.equal(canonicalLearningPageUrl("https://example.com/trauma/1022", "orthobullets"), null);
assert.deepEqual(pageReviewCard({
  note_guid: "g", card_ordinal: 0,
  field_snapshot: [{ name: "Text", rawValue: "The {{c1::ulnar nerve}} is at risk." }, { name: "Extra", rawValue: "<b>Pearl</b>" }],
}), { noteGuid: "g", cardOrdinal: 0, prompt: "The […] is at risk.", answer: "The ulnar nerve is at risk.", extra: "Pearl" });

console.log("page Anki cards tests passed");

