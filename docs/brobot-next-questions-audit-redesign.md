# BroBot Next Questions Audit & Redesign

## Guiding Principle

Optimize for: **"What would the best orthopaedic attending ask a resident next?"**

The current feature should evolve from generic AI follow-up prompts into an educational progression engine that detects what the learner probably does not know yet, chooses the next most useful branch, and adapts that branch to mode, level, topic, and conversation history.

## Existing Implementation Audit

### Current Flow

- UI renders `BroBotNextLearningBranches` in `src/components/brobot/BroBotChatPage.tsx`.
- The section still displays as **Common Next Questions** and falls back to legacy `suggestedQuestions`.
- The model returns both `nextLearningBranches` and `suggestedQuestions` from `src/lib/brobot/chat/prompt-builder.ts`.
- `src/app/api/brobot/chat/route.ts` merges database-backed branch questions with model-generated branches.
- `supabase/migrations/20260618_090000_brobot_learning_branches.sql` persists `branch_topics`, `branch_questions`, and `branch_events`.
- Analytics currently records branch impressions/clicks and updates simple `success_score`.

### Strengths

- There is already a durable branch-question schema.
- The prompt explicitly asks for resident-style branch labels instead of generic focus areas.
- Templates are mode-aware for OR Prep, Consult, OITE, Clinic, Research, and General.
- Branch clicks are recorded separately from suggested question clicks.
- The output contract has useful adjacent educational sections: `knowledgeGaps`, `whatMostResidentsMiss`, and `nextLearningBranches`.

### Product Weaknesses

- The feature is still framed as "Common Next Questions," which implies FAQ-like suggestions rather than a guided attending-style teaching path.
- The section does not communicate priority. A resident cannot tell which option BroBot thinks is the best next move.
- It does not visibly connect to knowledge gaps surfaced in the answer.
- It does not make BroBot feel uniquely orthopaedic enough when branch labels remain broad.

### Educational Weaknesses

- Branch categories are broad and reusable, but not consistently topic-specific.
- Distal femur should produce branches about retrograde nail versus locked plating, Hoffa fragments, sagittal plane alignment, varus collapse, periprosthetic constraints, and nonunion risk. Current templates can stop at "fixation options" or "complications."
- Progression is implicit rather than designed. There is no enforced path from foundation -> decision -> biomechanics -> complication -> board trap -> evidence.
- Level adaptation is mostly prompt-based. There is no deterministic level-aware ranking.
- OITE and OR Prep can overlap because both may produce "complications" and "attending questions" without changing the question shape.

### UX Weaknesses

- Pills make every branch feel equal.
- Categories are small inline labels, not directional choices.
- The UI does not separate "best next question" from supporting branches.
- There is no learning-path state, completion state, or "already covered" indicator.
- The fallback chip builder can still produce generic chips and mode-specific hardcoded fallbacks.

### Architecture Weaknesses

- The database score is mostly historical CTR and recency, not educational quality.
- Branch question rows do not store mode, level, educational dimension, topic entities, or semantic fingerprints.
- Memory-aware deduplication is shallow. It previously removed exact or near-exact labels but not conceptually similar repeats.
- Context specificity depends heavily on the LLM response instead of a deterministic candidate/ranking layer.
- Analytics does not yet measure downstream conversation quality, topic completion, or educational engagement.

## Desired Architecture

### Next Question Engine

Pipeline:

1. Extract context:
   - mode
   - training level
   - procedure/topic
   - fracture/procedure/anatomy/implant/complication entities
   - conversation concepts already covered
   - clicked and ignored branches

2. Generate candidates from multiple sources:
   - curated topic-specific templates
   - mode templates
   - LLM-generated topic candidates
   - database winners for matching topic/entity/mode
   - user-history gaps

3. Classify each candidate:
   - Understanding
   - Decision Making
   - Operative Pearls
   - Complications
   - Anatomy
   - OITE
   - Evidence
   - Controversies
   - Clinical Scenario
   - Advanced Concepts

4. Score and rank:
   - educational value
   - conversation continuation probability
   - novelty
   - non-redundancy
   - context relevance
   - level appropriateness
   - mode alignment
   - category diversity
   - historical performance

5. Return:
   - one `recommendedBranch`
   - three to five supporting `nextLearningBranches`
   - category metadata and score metadata for analytics

### Ranking Formula

Recommended initial scoring:

```text
score =
  0.20 * educational_value +
  0.15 * continuation_probability +
  0.15 * context_relevance +
  0.15 * novelty +
  0.10 * non_redundancy +
  0.10 * level_fit +
  0.10 * mode_fit +
  0.05 * historical_success
```

Hard filters:

- Drop if semantically similar to the user's current question.
- Drop if semantically similar to a recent assistant answer or clicked branch.
- Drop if category is overrepresented.
- Drop if mode-incompatible unless it is the single best educational bridge.
- Drop if level-inappropriate and not safely explainable.

### Data Model Changes

Add to `branch_questions`:

- `mode text`
- `training_level_min text`
- `training_level_max text`
- `educational_dimension text`
- `entity_tags text[]`
- `semantic_fingerprint text`
- `prompt_hash text`
- `created_from_message_id uuid`
- `last_shown_at timestamptz`
- `last_clicked_at timestamptz`

Add to `branch_events`:

- `event_type text` with `shown`, `clicked`, `ignored`, `answered`, `completed`
- `rank_position integer`
- `ranking_score numeric`
- `mode text`
- `training_level text`
- `educational_dimension text`
- `conversation_turn integer`
- `result_message_id uuid`

Add aggregate views:

- `branch_question_ctr_by_mode_level`
- `topic_completion_by_user`
- `branch_success_by_dimension`

## Analytics Plan

Track:

- question shown
- question clicked
- question ignored
- question category/dimension
- mode
- level
- topic/procedure/entity tags
- rank position
- whether the next answer was completed
- whether user asked another follow-up afterward
- whether user copied/saved/shared answer if available

Metrics:

- Question CTR
- Learning Path CTR
- Branch Success Rate
- Topic Completion Rate
- Educational Engagement Score
- Repetition Rate
- Context-Specificity Rate

Educational Engagement Score:

```text
0.35 * clicked_ranked_branch
+ 0.25 * continued_conversation
+ 0.20 * completed_distinct_dimension
+ 0.10 * avoided_duplicate_branch
+ 0.10 * returned_to_topic_later
```

## UI Redesign Proposal

Use **Prioritized Cards + Choose Your Direction**.

Primary element:

- Header: **Best next attending question**
- Show one recommended question as a compact card.
- Include category, why it matters, and mode/level signal.

Supporting choices:

- **Build the foundation**
- **Make the decision**
- **Avoid the complication**
- **Prepare for the OR**
- **Study the board trap**
- **Check the evidence**

Do not present this as a marketing or help section. It should feel like part of the answer.

## Implementation Roadmap

### Quick Wins

1. Rename the UI section from "Common Next Questions" to "Best Next Questions" or "Ask Like an Attending."
2. Prioritize one recommended question visually.
3. Enforce category diversity in the server merge.
4. Deduplicate against the current question and recent conversation.
5. Add deterministic mode and level fit scoring.
6. Add analytics metadata for branch category, mode, level, and rank.

### Medium-Term

1. Add `educational_dimension` and entity tags to branch rows.
2. Build topic-specific template packs for high-volume ortho topics.
3. Add learning path state per conversation.
4. Add "already covered" suppression.
5. Add a branch outcome event when the selected branch receives an answer.
6. Add dashboard queries for CTR and branch success.

### Long-Term

1. Add semantic embeddings for deduplication and topic matching.
2. Learn per-user preferences and gaps.
3. Build attending-style curricula by topic.
4. Allow programs/attendings to seed preferred questions.
5. Build adaptive review loops that resurface missed concepts later.

## Examples

### OR Prep

Prompt: "Retrograde nail vs plate for distal femur fracture"

- Decision Making: Why would you choose a retrograde nail over a lateral locking plate in osteoporotic bone?
- Operative Pearl: What technical errors lead to malalignment with retrograde nailing?
- Complications: What fixation construct risks varus collapse and why?
- Anatomy: What structures are at risk during distal femur fixation?
- Evidence: What do comparative studies suggest about union and reoperation rates?

### OITE

- Board Trap: A distal femur fracture collapses into valgus after fixation. What technical mistake is most likely?
- Classification: Which distal femur fracture patterns change fixation strategy?
- Algorithm: When does periprosthetic distal femur fracture treatment shift from fixation to revision arthroplasty?
- Quiz: Give me three OITE-style distal femur fixation questions.

### Consult

- Workup: What imaging views or CT findings would change management?
- Urgency: What findings make this an immediate operative problem?
- Presentation: How should I present this distal femur consult to the chief?
- Algorithm: What patient and fracture factors decide nail, plate, or arthroplasty?

### Research

- Evidence: What outcomes matter when comparing retrograde nailing and locked plating?
- Controversy: In which subgroups is the evidence least settled?
- Study Design: What biases limit retrospective fixation comparisons?
- Journal Club: What question would expose whether this paper changes practice?

### General

- Understanding: Why is distal femur fixation mechanically hard?
- Decision Making: How do bone quality and fracture pattern change implant choice?
- Complication: Why does varus collapse happen after lateral locked plating?
- Advanced Concept: How does working length affect construct stiffness?

## Code Change Made in This Pass

The server-side branch merge in `src/app/api/brobot/chat/route.ts` now scores branch options using:

- historical score
- educational category value
- mode alignment
- training-level fit
- context relevance
- novelty against current and recent conversation
- semantic-ish token overlap deduplication
- category diversity limits

This is not the final engine, but it moves the current implementation from simple CTR sorting toward the proposed Next Question Engine.
