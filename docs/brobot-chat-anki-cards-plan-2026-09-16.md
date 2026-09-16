# BroBot web chat: Anki references on answers

## Product idea

Attach Anki cards to **specific facts in a BroBot answer**. A small reference marker beside a fact opens a pop-up showing the actual card, with its front, revealable answer, extra teaching fields, and approved images. The learner can inspect a memorization card and return to the same place in chat.

Example:

> The sciatic nerve is the structure most at risk in a posterior hip dislocation. **[Anki 1]**
>
> Tap **[Anki 1]** → card pop-up opens on the front → **Show answer** reveals the cloze and extra content.

The marker means “there is a matching study card for this fact.” Research citations, when present, remain separately labelled.

## Learner experience

1. Let the answer stream normally. After completion, attach up to three numbered **Anki** markers at the ends of supported sentences or paragraphs. Add a compact **Anki cards · 2** reference row under the answer for discovery.
2. A marker opens a centered dialog on desktop and a full-height sheet on mobile. Show the pinned card’s topic and deck, front side, **Show answer**, back side, and approved extra fields. Allow previous/next navigation when the answer has multiple references.
3. Make the pop-up feel like the SnapOrtho Master card. Reuse typography, cloze emphasis, spacing, and resource-section visual language from `src/lib/education/anki-master-card-style.ts`. Build a safe web renderer from approved fields instead of injecting raw Anki templates into chat.
4. For cloze notes, hide only the cloze targeted by the referenced card ordinal; render other clozes correctly. Reveal restores the target text and hint. For basic cards, show distinct front and back. Support tables and approved images; use an unavailable state for unsupported media.
5. Trap focus in the dialog; close with Escape or a labelled button; restore focus to the marker and preserve chat scroll position. Label the front/back states for screen readers. Revealing a card does not update Anki scheduling.
6. Offer **Open in Anki** later if exact-card launch works reliably for the linked user. The web pop-up is useful on its own.

## Current foundation

- `src/components/brobot/BroBotChatPage.tsx` renders assistant answers through the custom `BroBotMarkdown.tsx` block renderer. These are the places for markers and the dialog.
- `/api/brobot/chat` returns stable assistant message IDs and structured output. The web response is versioned; keep the legacy/native contract unchanged.
- Canonical cards have immutable versions, published-release membership, and card-to-entity mappings. The deck has a SnapOrtho Master cloze template and style definition.
- The existing `orthobullets-anki.v1` recommendation contract is a narrow missed-question pilot. Chat needs its own claim-to-card association.
- Live inspection on September 16 found published releases and imported cards, but zero production-eligible card/entity mappings and zero cards with a reviewed/approved canonical status. The first implementation therefore uses current published-release membership plus a strict exact cloze-answer/context match. Direct human-reviewed mappings can replace this fallback as they become available.

## Match a fact, not only a topic

1. Once an answer is final, identify a few memorizable claims from structured key points or final text. Each candidate gets a stable anchor: assistant message ID, answer hash, block ID, and sentence or paragraph position. Avoid fuzzy text replacement in Markdown.
2. Search cards in the current published deck. Require the tested cloze answer to appear in the answer claim along with at least two context terms from the card. Keep the pinned card version and recheck current-release membership when the pop-up opens. Use direct human-reviewed entity links as an additional gate once that dataset exists.
3. Confirm that the card actually tests or explains the claim. Sharing a broad entity is not enough. Use reviewed claim-to-card fixtures for the pilot; any model-assisted candidate selection needs a server-side check before display. Do not attach contradictory cards.
4. Rank by factual match, review quality, and educational importance. Deduplicate cloze siblings and repeated facts. Cap at three markers per answer and one marker per supported claim. With no confident match, leave the answer unmarked.
5. On answer retry or regeneration, recompute references for the new answer hash. Never place an old marker on new text.

## API and persistence

- Build a server-only `chat-anki-references` service. Persist message ID, answer hash, anchor, canonical entity ID, canonical card ID, pinned version ID, rank, and match reason. Keep card content in canonical version records.
- Add an owner-checked `GET /api/brobot/messages/[messageId]/anki-references` returning marker anchors, short labels, IDs, order, and status. Load it after the stream finishes or via enrichment polling; card matching must not hold up the answer.
- Lazy-load one card through an owner-checked `GET /api/brobot/messages/[messageId]/anki-references/[referenceId]`. Return a bounded presentation DTO: card type, target cloze/ordinal, sanitized front/back/extra fields, deck/topic, pinned version, and approved media URLs. Do not expose raw table rows or privileged keys.
- Recheck publication, withdrawal, content hash, and media rights when an older reference opens. Show an unavailable state if the card can no longer be displayed.
- Record marker impressions, pop-up opens, answer reveals, unavailable cards, and relevance feedback by IDs and reason codes. Keep patient details, raw answer text, and card bodies out of analytics.

## Delivery plan

1. **Design the marker and pop-up.** Prototype a cloze card, image card, and unavailable card. Check desktop, mobile, keyboard, and screen-reader behavior. Place markers after a matched sentence when the renderer has that exact text.
2. **Choose a reviewed launch set.** Audit published deck versions, direct mappings, card content, and web-display rights. Pair several common BroBot answers with exact cards and cloze ordinals. Include near-topic cards that must be rejected.
3. **Build matching and retrieval.** Implement anchoring, eligibility, factual matching, version-pinned persistence, and both owner-checked endpoints behind a feature flag. Test ambiguous claims, contradictory cards, duplicate siblings, stale answers, withdrawn versions, missing media, and unauthorized IDs.
4. **Integrate web chat.** Render markers through structured Markdown blocks after answer completion, add the reference row, and build the dialog/sheet. Test streaming, reopened chats, retries, pop-up navigation, focus restoration, and scroll position.
5. **Pilot and tune.** Release to a small signed-in cohort on reviewed topics. Review every pilot attachment for claim-level accuracy. Track eligible answers with references, opens, reveals, irrelevant reports, unavailable cards, and lookup latency.

## Acceptance criteria

- A supported fact gets a marker at the correct place. The marker opens the matching version-pinned card in a polished pop-up with correct front, cloze reveal, extra fields, and approved media.
- Closing the pop-up returns the learner to the same place. Mouse, touch, keyboard, and screen-reader use work.
- Reopening a chat restores its references. Regenerating an answer cannot leave old markers attached.
- Broad-topic, ambiguous, unreviewed, withdrawn, or mismatched cards do not appear. Card lookup failure never blocks the answer.
- Only the message owner can open the card. Card display does not change Anki review state or leak card content into analytics.

## First-build decision

Start with **claim-level Anki reference markers plus a card pop-up** for cards in the published deck. The quality bar is whether the opened card tests the exact fact beside its marker and looks like a real study card.

## Implementation status — September 16, 2026

The web code now renders answer markers, a reference row, and a responsive card dialog with cloze reveal, safe rich field rendering, approved images, feedback, and ownership-checked lookup. The lookup uses current published-release membership plus exact cloze-answer and context matching because the live database has no production-eligible card/entity mappings yet. A migration adds version-pinned reference persistence; until it is applied, lookup still works but recomputes references. The production build passes. Production migration and site deployment remain separate release actions.
