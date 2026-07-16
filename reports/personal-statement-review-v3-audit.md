# BroBot Personal Statement Review v3 audit

## Failure modes found

- The v2 prompt explicitly centered `formulaicLanguage`, `genericEmotionalLanguage`, and `overExplainedQualities`, encouraging false positives on ordinary residency prose.
- Common phrases such as “showing up” were required findings even when supported by credible actions. Frequency was mistaken for reader noticeability.
- A single `low/moderate/high AI-like writing risk` badge implied false precision and blurred style with authorship.
- Feature extraction was entirely delegated to the model. Countable evidence such as em dashes and sentence-length variation was neither measured nor reproducible.
- “Be more specific” safeguards existed, but the taxonomy still rewarded polished abstraction and did not require the missing action, decision, consequence, uncertainty, or detail to be named.
- Authenticity appeared as a list of strengths, not an independent counterweight to polish concerns.

## Applicant-writing calibration examples

Harmless/common: “These experiences taught me the importance of teamwork.” This is familiar but should not be flagged alone. Ask whether nearby actions demonstrate teamwork.

Noticeable narrative arc: “I failed to match. This forced me to reflect. I discovered resilience. Therefore, I will enter residency with an unwavering commitment to lift others.” The stacked setback-reflection-growth-mission sequence matters more than any individual phrase.

Unsupported polish: “This transformative journey fostered collaboration and created meaningful change.” The issue is marketing/consultant abstraction without a named action or result.

Authentic specificity: “I spent twenty minutes trying to fit the traction bow through the drapes before the scrub tech bailed me out.” Preserve the bounded, slightly embarrassing detail; do not polish away its voice.

Familiar but earned: “I want to help patients return to what they love.” Keep or lightly revise when followed by a particular patient, activity, decision, and applicant action; de-emphasize when it is the entire rationale.

## v3 design

- Ten reviewer-facing signals replace the low-value category set.
- Deterministic extraction supplies em-dash counts, sentence-length variation, short-sentence cadence, cue phrases, virtue counts, and phrase matches to the model.
- The model must judge context: virtue mentions require unsupported abstraction; common orthopaedic phrases require repetition or low-specificity execution.
- Authenticity signals are evaluated separately and revision guidance must state what to preserve.
- UI language describes reader noticeability: Minor concern, Worth reviewing, and Likely noticeable to reviewers.
- Product framing is explicit: style patterns, not authorship.

## Evaluation guidance

Use the fixture set as regression cases, then have at least two orthopaedic faculty independently label blinded excerpts for (1) noticeable software polish, (2) authentic specificity, and (3) usefulness of the recommendation. Track false-positive rate on conventional but concrete essays separately from recall on patterned, abstract prose. Do not optimize against declared AI provenance; provenance is not the product target.
