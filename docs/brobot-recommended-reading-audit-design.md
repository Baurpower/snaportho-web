# BroBot Recommended Reading Audit & Design

## Executive Recommendation

Build the feature, but keep it narrow: **Read Next** should be an on-demand learning extension that recommends 3 to 5 high-yield external resources for the current conversation. It should answer:

> If I had 20 minutes to learn more about this topic, what should I read next?

This should not become PubMed search, a citation dump, or a literature review generator. The product value is educational trust: BroBot gives the quick chief-resident answer, then points the learner toward the best next source outside BroBot.

Recommended MVP: add a **Read Next** affordance beside the existing follow-up branch chips. Clicking opens a compact panel or modal and calls a dedicated recommendation endpoint. Do not generate reading recommendations with every answer.

## Current-State Audit

### Architecture Observed

- Chat request validation and output contracts live in `src/lib/brobot/chat/types.ts`.
- Answer prompting and the structured JSON contract live in `src/lib/brobot/chat/prompt-builder.ts`.
- Response parsing and fallback branch normalization live in `src/lib/brobot/chat/response-parser.ts`.
- Main answer generation, conversation persistence, branch ranking, branch outcomes, analytics, and fingerprint updates live in `src/app/api/brobot/chat/route.ts`.
- Branch impressions are recorded through `src/app/api/brobot/branch-events/route.ts`.
- The chat UI renders answer sections and follow-up chips in `src/components/brobot/BroBotChatPage.tsx`.
- Persistent branch tables and success analytics are defined in `supabase/migrations/20260618_090000_brobot_learning_branches.sql` and `supabase/migrations/20260618_120000_brobot_branch_success_engine.sql`.

### Strengths

- BroBot already has mode, depth, and training-level context.
- The answer pipeline already extracts intent, topic, procedure category, subintent, and branch options.
- The UI already has a natural post-answer area for learning continuation.
- Branch analytics already distinguish impressions, clicks, rank position, mode, training level, and outcomes.
- The current model prompt explicitly avoids fabricated citations in Research mode, which is a good safety precedent.

### Weaknesses

- The current JSON answer contract has no place for external resources.
- The existing branch engine optimizes follow-up questions, not source quality.
- There is no resource registry, editorial approval state, URL health tracking, or resource-type taxonomy.
- LLM-only citation generation would be risky because it may hallucinate titles, links, or publication details.
- Analytics capture branch engagement, but not external learning behavior such as reading clicks, saves, or returns.

## Product Fit

### Highest-Value Users

- **PGY-1 to PGY-3 residents:** highest value. They need fast triage between what to memorize, what to understand, and what to read before OR, clinic, call, or OITE study.
- **Medical students:** useful when recommendations include readable primers, society pages, and visual resources rather than landmark papers only.
- **Senior residents and fellows:** useful if the feature surfaces technique papers, classic controversies, guidelines, and high-signal evidence.

### Lower-Value Users

- **Attendings:** may use it occasionally for teaching resources, journal club prompts, or quick guideline links, but are less likely to click routine resources.
- **Users asking one-off factual questions:** may ignore it unless the panel feels lightweight and clearly curated.

### Problem Solved

BroBot currently answers and suggests the next question. Read Next solves a different problem: after the immediate answer, the learner often needs one trusted outside resource without doing a broad search or guessing what is worth reading.

## Naming Recommendation

Use **Read Next** as the user-facing label.

Rationale:

- Clearer and more action-oriented than "Recommended Reading."
- Less generic than "Learn More."
- Less intimidating than "Deep Dive," "Evidence Review," or "Landmark Papers."
- Fits beside follow-up branches without implying a full literature review.
- Works for non-paper resources such as AAOS pages, technique guides, educational videos, and guidelines.

Secondary UI copy can say **Recommended reading** inside the panel title if needed. Avoid **Literature Links** and **Evidence Review** because they overpromise research coverage.

## Educational Strategy

### What To Recommend

Use a mode-aware mix, not one fixed resource type.

Highest-yield resource categories:

- **Core educational review:** best first read for students and junior residents.
- **Landmark or classification paper:** when the topic hinges on a named system or classic management pivot.
- **Guideline or consensus statement:** when management algorithms, workup, or indications matter.
- **Technique or approach article:** when OR Prep is the mode.
- **Visual/anatomy resource:** when anatomy, imaging, or surgical exposure is the learning bottleneck.
- **Systematic review or major trial:** mainly in Research mode or senior-level controversy questions.
- **Textbook-style source:** useful only if surfaced as "standard reference," not as a vague recommendation.

### What Not To Recommend By Default

- Long unordered PubMed lists.
- Papers chosen only by citation count.
- Unverified titles or links generated solely by the model.
- Niche papers that are interesting but not useful for the next 20 minutes.
- Paywalled-only articles when an accessible alternative has similar educational value.

## Mode-Specific Behavior

### OITE

Prioritize board-oriented reviews, classification papers, treatment algorithms, classic associations, and resources that clarify common distractors. Recency matters less than tested durability.

### OR Prep

Prioritize technique papers, surgical approach/anatomy resources, complication avoidance articles, and official technique guides when available. Ranking should favor tomorrow-morning usability over journal prestige.

### Consult

Prioritize diagnostic workup references, consensus statements, management algorithms, and emergency/urgency frameworks. Avoid pushing long evidence debates when the learner needs safe next steps.

### Clinic

Prioritize clinical practice guidelines, treatment algorithms, patient evaluation frameworks, and rehab/nonoperative resources.

### Research

Prioritize systematic reviews, meta-analyses, major RCTs, landmark studies, and methods/limitations resources. This is the only mode where a heavier evidence stack makes sense.

### General

Infer the educational task from intent. If uncertain, mix one overview, one high-yield clinical resource, and one active-learning or visual resource.

## UX Recommendation

Use a hybrid on-demand model.

### Option A: Generate With Every Answer

- Higher visibility.
- Worse latency and cost.
- Risk of cluttering the answer.
- Higher hallucination risk if done quickly.

### Option B: Generate Only After Click

- Best cost and latency profile for normal chat.
- Keeps the answer surface clean.
- Allows a stricter resource prompt and validation path.
- Slightly lower click-through because users do not see previewed items.

### Option C: Hybrid

Recommended. Render a lightweight **Read Next** chip with the existing branch chips after every completed answer, but generate resources only after the user clicks. The server can optionally use cached recommendations for the same topic/mode/level.

### Placement

In `BroBotNextLearningBranches`, add one visually distinct action after the branch chips:

- Label: **Read Next**
- Icon: book/open-book icon
- Trigger: opens modal or expandable panel
- Loading state: "Finding the best next reads..."

The panel should not appear inside the answer card. It belongs with "What to learn next" actions.

## Reading Card Design

Each card should show only what helps the learner decide whether to open it.

Required fields:

- Title
- Resource type
- Source or journal
- Year, when applicable
- Why this is worth reading
- Best for: mode/level signal
- Link

Optional fields:

- Landmark badge
- Board-relevant badge
- Technique badge
- Free full text badge
- Estimated reading time

Avoid displaying citation count in the UI. If used internally, it should be a weak tie-breaker only.

Example card shape:

```text
Landmark classification paper
Neer classification of proximal humerus fractures
Journal of Bone and Joint Surgery, 1970
Why it matters: establishes the language used in board stems and treatment discussions.
Best for: OITE, PGY-2+
[Open]
```

## Resource Selection Architecture

### Resource Worthiness Criteria

A resource is worth recommending if it has at least one of these properties:

- Foundational study or classification paper.
- Major guideline or consensus statement.
- Classic review that teaches the durable framework.
- Essential technique or approach paper.
- Visual/anatomy resource that improves OR or imaging understanding.
- High-quality systematic review or major trial for a real controversy.
- Commonly used educational reference for residents.

### Recommended Data Sources

MVP should start with a curated registry, not live search.

Seed examples by source class:

- AAOS, OTA, POSNA, AOFAS, ASSH, ASES, NASS, AANA, AAHS, and other society resources.
- OrthoBullets topic pages where they are useful as board review, labeled as educational summaries.
- Orthopaedic Trauma Association materials and fracture classification references.
- Curated PubMed records for landmark papers, but stored as verified metadata.
- Institution-neutral technique articles and open educational resources.

## Ranking Framework

Initial scoring should optimize resident educational yield:

```text
score =
  0.25 * educational_yield
  0.20 * context_relevance
  0.15 * mode_fit
  0.15 * level_fit
  0.10 * landmark_or_guideline_value
  0.05 * accessibility
  0.05 * recency_when_relevant
  0.05 * historical_engagement
```

Tie-breakers:

- Prefer free/open resources when educational value is similar.
- Prefer society/guideline sources for Consult and Clinic.
- Prefer classic durable resources for OITE.
- Prefer technique/anatomy resources for OR Prep.
- Prefer evidence hierarchy for Research.

Do not optimize solely for citation count. Citation count can support landmark status, but should not override teaching value.

## Technical Architecture

### Cleanest Implementation Path

Do not add recommendations to the main chat output contract at MVP. Add a separate on-demand endpoint:

`POST /api/brobot/reading-recommendations`

Input:

- `conversationId`
- `sourceMessageId`
- `mode`
- `trainingLevel`
- `responseDepth`
- `topic`
- `procedureCategory`
- `subintent`
- `tags`
- optional `selectedBranchId`

Output:

- `recommendationSetId`
- `topic`
- `mode`
- `resources`
- `generatedAt`

The endpoint should:

1. Authenticate the user.
2. Verify conversation/message ownership.
3. Load assistant `structured_json` and recent conversation context.
4. Query curated resources by tags/topic/mode/level.
5. Rank deterministically.
6. If fewer than 3 good matches exist, call the LLM to classify the learning need, not to invent citations.
7. Return 3 to 5 resources.
8. Log impression events.

### New Types

```ts
type BroBotReadingResourceType =
  | 'landmark_paper'
  | 'review_article'
  | 'guideline'
  | 'society_resource'
  | 'technique_article'
  | 'visual_resource'
  | 'textbook_reference'
  | 'systematic_review'
  | 'trial'
  | 'educational_website';

type BroBotReadingRecommendation = {
  id: string;
  title: string;
  resourceType: BroBotReadingResourceType;
  sourceName: string;
  year?: number;
  url: string;
  whyItMatters: string;
  bestForModes: BroBotChatMode[];
  trainingLevelMin?: BroBotTrainingLevel;
  trainingLevelMax?: BroBotTrainingLevel;
  tags: string[];
  isLandmark?: boolean;
  isBoardRelevant?: boolean;
  isTechniqueRelevant?: boolean;
  access: 'free' | 'abstract_only' | 'paywalled' | 'unknown';
  rankScore: number;
  rankPosition: number;
};
```

### Database Changes

Add a curated resource registry:

```sql
create table public.brobot_reading_resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  resource_type text not null,
  source_name text not null,
  journal text null,
  year integer null,
  url text not null,
  doi text null,
  pubmed_id text null,
  abstract_summary text null,
  why_it_matters text not null,
  tags text[] not null default '{}',
  modes text[] not null default '{}',
  procedure_categories text[] not null default '{}',
  training_level_min text null,
  training_level_max text null,
  educational_yield numeric not null default 50,
  landmark_score numeric not null default 0,
  board_relevance numeric not null default 0,
  clinical_relevance numeric not null default 0,
  technique_relevance numeric not null default 0,
  evidence_level text null,
  access text not null default 'unknown',
  editorial_status text not null default 'draft',
  last_verified_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Add recommendation events:

```sql
create table public.brobot_reading_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid null references public.brobot_conversations(id) on delete set null,
  source_message_id uuid null references public.brobot_messages(id) on delete set null,
  resource_id uuid null references public.brobot_reading_resources(id) on delete set null,
  event_type text not null,
  rank_position integer null,
  rank_score numeric null,
  mode text null,
  training_level text null,
  topic text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
```

Event types:

- `panel_open`
- `impression`
- `click`
- `save`
- `share`
- `feedback_helpful`
- `feedback_not_helpful`

### UI Changes

In `BroBotChatPage.tsx`:

- Add a `Read Next` chip/action to `BroBotNextLearningBranches`.
- Add `ReadingRecommendationsPanel` or modal.
- Fetch recommendations lazily on open.
- Display loading, empty, error, and retry states.
- Log clicks and optional saves through the new endpoint.

Suggested section behavior:

- If resources exist: show 3 primary cards and an optional "Show 2 more."
- If no strong resources exist: say "BroBot does not have a trusted reading set for this yet" and offer normal branch questions.
- If the topic is patient-specific or ambiguous: use the assistant message tags and mode, not raw patient details, for matching.

### Analytics

Track:

- Panel opens.
- Recommendation impressions.
- Resource clicks.
- Saves.
- Shares.
- Helpful/not helpful feedback.
- Repeat panel usage.
- Return to BroBot after opening a resource.
- Downstream conversation continuation after resource click.

Feedback loop:

- Resource CTR by mode and level.
- Helpfulness by topic.
- Saves weighted more heavily than clicks.
- Suppress resources with low helpfulness and high bounce.
- Promote resources that lead to return conversations or later branch engagement.
- Maintain editorial review for top-performing LLM-suggested candidates before promotion to registry.

## MVP Scope

### Must Have

- `Read Next` chip beside branch chips.
- On-demand endpoint.
- Curated database table for verified resources.
- Deterministic ranker using mode, level, tags, topic, and procedure category.
- Reading cards with title, type, source, year, why it matters, badges, and link.
- Impression and click analytics.
- Empty state that avoids hallucinated citations.

### Nice To Have

- Save resource.
- Helpful/not helpful feedback.
- Free-full-text badge.
- Estimated reading time.
- Admin/editorial seed script for resource curation.
- Cache recommendation sets per message.

### Future Features

- User-specific reading memory.
- Program- or attending-curated reading lists.
- Journal club mode.
- Spaced review from saved readings.
- Semantic matching with embeddings.
- URL health checks and stale-resource review.
- Deep links to institution-accessible PDFs when users configure access.

## Implementation Priority Matrix

| Recommendation | Complexity | Educational impact | Priority |
| --- | --- | --- | --- |
| Add `Read Next` chip and lazy panel | Low | High | P0 |
| Create curated resource registry | Medium | High | P0 |
| Add reading endpoint and deterministic ranker | Medium | High | P0 |
| Track impressions and clicks | Low | Medium | P0 |
| Add save/helpful feedback | Medium | Medium | P1 |
| Add editorial admin workflow | Medium | High | P1 |
| Add semantic matching | High | Medium | P2 |
| Add live PubMed/source lookup | High | Mixed/risky | P3 |

## Testing Requirements

Unit tests:

- Resource type schema validation.
- Ranking formula.
- Mode-specific ranking behavior.
- Level-fit filtering.
- Deduplication by URL/DOI/title.
- Empty-state behavior when no curated resources match.

API tests:

- Auth required.
- User can only request recommendations for their own conversation/message.
- Endpoint returns no fabricated resources.
- Events are recorded for panel open, impressions, and clicks.

UI tests:

- `Read Next` appears only after completed assistant messages.
- Panel opens, loads, displays cards, and handles error/empty states.
- Resource click logs event and opens link.
- Mobile layout does not overlap chat composer or branch chips.

Seed-data review:

- Each seeded resource has verified title, URL, type, source, tags, and "why it matters."
- Landmark and board-relevance badges are editorial, not model-inferred at display time.

## Final Product Recommendation

Ship **Read Next** as a lightweight, curated, on-demand learning bridge. It should sit beside BroBot's next-question branches, not inside the core answer and not inside Research mode only. The feature is strongest when it feels like a senior resident saying, "This is the one thing I would read before tomorrow," rather than a search engine saying, "Here are twenty papers."

