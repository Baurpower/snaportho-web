# BroBot Conversation Quality Audit And Redesign

Date: 2026-07-07

## Executive Summary

This audit reviewed every saved production BroBot conversation currently available in Supabase, not a cherry-picked sample. The requested 200+ conversations do not exist in the current saved dataset: production contains 76 saved conversations, 354 total messages, and 176 assistant turns from 2026-06-16 through 2026-07-06. I audited the full available corpus.

Overall educational quality is **6.1 / 10**. BroBot is often directionally correct and reasonably specific, but it is not yet teaching like an exceptional chief resident or attending. The biggest gaps are depth, decision-making, attending pearls, and mode-specific educational texture.

The most important finding is Focus Mode: **146 / 176 assistant turns (83%) were persisted as needing clarification**, yet **0 of those turns stored actual visible clarifying questions**. This is not just over-triggering by the model. It is a pipeline issue: `parseBroBotChatResponse()` treats any non-empty `assumedContext` as `needsClarification=true`, so routine assumptions are being logged as clarification behavior. Branch/follow-up chips were shown heavily but clicked rarely: **544 impressions, 47 clicks, 8.6% CTR**.

Bottom line: BroBot should answer immediately far more often, clarify rarely, and spend its main reasoning budget on a better first answer rather than product metadata.

Evidence artifacts:

- Scored turns: `reports/brobot-conversation-quality-audit/scored-turns.json`
- Summary and top failures: `reports/brobot-conversation-quality-audit/summary.json`
- Audit script: `scripts/audit-brobot-conversations.js`

## Scope And Method

Data reviewed:

- `brobot_conversations`: 76 conversations
- `brobot_messages`: 178 user messages, 176 assistant messages
- `branch_events`: 544 impressions/click events
- `brobot_response_evaluations`: 0 stored evaluator rows

Scoring rubric:

- Educational quality
- Orthopaedic accuracy risk
- Specificity
- Depth
- Actionability
- Hallucination risk
- Conversation quality
- Focus Mode quality

Privacy note: an external LLM scoring pass was not used. The reviewer blocked exporting saved production conversation content to OpenAI for grading. The scoring pass is local heuristic scoring plus manual synthesis from the saved corpus.

## Corpus Composition

Assistant turns by mode:

| Mode | Turns |
|---|---:|
| OR Prep | 79 |
| General | 34 |
| OITE | 29 |
| Research | 12 |
| Clinic | 11 |
| Consult | 10 |
| Fracture Call | 1 |

Assistant turns by prompt category:

| Category | Turns |
|---|---:|
| General | 73 |
| Surgical / attending prep | 31 |
| Fracture | 28 |
| Beginner | 14 |
| OITE | 13 |
| Anatomy | 9 |
| Clinic | 7 |
| Research | 1 |

## Overall Scores

| Dimension | Score |
|---|---:|
| Educational quality | 6.1 / 10 |
| Specificity | 7.2 / 10 |
| Depth | 3.8 / 10 |
| Actionability | 5.9 / 10 |
| Conversation quality | 7.0 / 10 |

Interpretation: BroBot often names real orthopaedic terms, but it does not reliably explain why they matter. It is more specific than it is deep.

## Failure Taxonomy

| Failure mode | Count | What it means |
|---|---:|---|
| Weak decision-making | 145 | Says what, not why; misses pivots, thresholds, management-changing facts. |
| Missing attending pearls | 103 | Does not teach what a senior or attending actually cares about. |
| Too shallow | 71 | Correct but thin; often one-line or short-list answers. |
| Low specificity | 40 | Generic facts or broad descriptions without named anatomy, classifications, thresholds, or surgical details. |
| Over-clarification / false clarification state | 37 | Simple answerable prompts marked as clarification-needed because of assumptions/focus metadata. |
| Weak OITE explanation | 9 | Missing distractors, wrong-answer logic, classic stem clues, memory hooks. |
| Weak surgical teaching | 7 | Missing interval, exposure, anatomy at risk, sequence, checks, pitfalls, bailout. |
| Generic filler | 6 | Uses vague phrases without useful details. |
| Weak clinic algorithm | 5 | Missing history, exam, imaging sequence, red flags, decision tree. |
| Weak fracture framework | 2 | Missing classification, stability, operative indications, fixation choice. |

## Top 50 Conversation Failures

| # | Audit ID | Mode | Score | Prompt | Failure labels |
|---:|---|---|---:|---|---|
| 1 | C063:T1 | research | 4 | My study is on TJA and using AI cameras to recognize surgical steps | low specificity, weak decision making, missing attending pearls, too shallow, weak surgical teaching |
| 2 | C033:T1 | oite | 4 | Give me the OITE question for femoral shaft fractures | low specificity, weak decision making, missing attending pearls, too shallow, weak oite explanation |
| 3 | C066:T3 | general | 4 | what are anatomy facts I need to know about FDP and FDS? | low specificity, weak decision making, missing attending pearls, over clarification |
| 4 | C030:T2 | clinic | 4 | Differential diagnosis of hand infections? | low specificity, weak decision making, missing attending pearls, too shallow, weak clinic algorithm |
| 5 | C030:T3 | oite | 4 | Give me the common pitfalls for hand infection questions | low specificity, weak decision making, missing attending pearls, too shallow |
| 6 | C065:T2 | general | 4 | Is an IM used for a primary bone construct or a secondary bone construct | low specificity, weak decision making, missing attending pearls, too shallow |
| 7 | C065:T5 | general | 4 | Types of Secondary Constructs? | low specificity, weak decision making, missing attending pearls, too shallow |
| 8 | C071:T1 | research | 4 | What percent of Holstein Lewis fractures have radial nerve neuropraxia | low specificity, weak decision making, missing attending pearls, too shallow |
| 9 | C071:T2 | general | 4 | Is the neuropraxia reversible | low specificity, weak decision making, missing attending pearls, too shallow |
| 10 | C050:T1 | clinic | 4 | what are the indications for achilles tendon rupture? | low specificity, missing attending pearls, too shallow, over clarification |
| 11 | C013:T2 | general | 4 | what is the constraint type for Zimmer Persona? | low specificity, weak decision making, missing attending pearls, generic filler |
| 12 | C013:T3 | general | 4 | what is the Stryker system for TKA? | low specificity, weak decision making, missing attending pearls, too shallow |
| 13 | C014:T2 | clinic | 4 | What are the differential diagnoses for wrist pain? | weak decision making, missing attending pearls, too shallow, weak clinic algorithm |
| 14 | C043:T3 | oite | 4 | how should I prepare for OITE | low specificity, weak decision making, missing attending pearls, too shallow, weak oite explanation |
| 15 | C043:T4 | oite | 4 | Access practice questions? | low specificity, weak decision making, missing attending pearls, too shallow |
| 16 | C027:T2 | or_prep | 4 | How do I confirm the release? | low specificity, weak decision making, missing attending pearls, too shallow, weak surgical teaching |
| 17 | C027:T3 | or_prep | 4 | What complications should I watch for? | low specificity, weak decision making, missing attending pearls, too shallow |
| 18 | C009:T2 | clinic | 4 | What are the indications for surgical intervention in trigger finger? | low specificity, missing attending pearls, too shallow, weak surgical teaching |
| 19 | C039:T3 | or_prep | 4 | What are the key surgical techniques for reverse TSA? | low specificity, weak decision making, missing attending pearls, too shallow, weak surgical teaching, over clarification |
| 20 | C045:T1 | general | 4 | What are common questions on cosmetic limb lengthening? | low specificity, weak decision making, missing attending pearls, generic filler, too shallow, over clarification |
| 21 | C047:T4 | oite | 4 | Complications Related to Gap Imbalance? | low specificity, weak decision making, missing attending pearls, too shallow |
| 22 | C047:T5 | oite | 4 | What cut impacts the flexion gap? | low specificity, weak decision making, missing attending pearls, too shallow |
| 23 | C044:T2 | consult | 4 | Indications for reconstructive nails? | low specificity, weak decision making, missing attending pearls, too shallow |
| 24 | C062:T2 | consult | 4 | What are the treatment options for PJI? | weak decision making, missing attending pearls, generic filler, too shallow, weak clinic algorithm, over clarification |
| 25 | C048:T2 | clinic | 4 | Indications for non-operative management? | low specificity, missing attending pearls, too shallow, weak surgical teaching |
| 26 | C048:T3 | or_prep | 4 | Periacetabular osteotomy in 21yo | low specificity, weak decision making, missing attending pearls, too shallow |
| 27 | C060:T3 | or_prep | 4 | How do I ensure proper alignment? | low specificity, weak decision making, missing attending pearls, too shallow |
| 28 | C020:T2 | consult | 4 | Indications for BEAR | low specificity, weak decision making, missing attending pearls, too shallow |
| 29 | C034:T1 | oite | 5 | What are the femoral neck fracture OITE questions | weak decision making, missing attending pearls, too shallow, weak oite explanation, over clarification |
| 30 | C065:T4 | or_prep | 5 | Indications for secondary construct | low specificity, weak decision making, missing attending pearls |
| 31 | C031:T1 | clinic | 5 | what are the treatment options for a femoral neck fx? | weak decision making, missing attending pearls, too shallow, weak clinic algorithm, over clarification |
| 32 | C028:T3 | or_prep | 5 | Indications for each fixation type? | low specificity, weak decision making, missing attending pearls |
| 33 | C056:T2 | oite | 5 | What is the Garden classification? | weak decision making, missing attending pearls, too shallow, over clarification |
| 34 | C013:T1 | general | 5 | what is the most common Zimmer TKA system? | weak decision making, missing attending pearls, too shallow |
| 35 | C027:T1 | or_prep | 5 | What are the critical steps of a trigger finger release? | low specificity, weak decision making, too shallow, over clarification |
| 36 | C027:T4 | or_prep | 5 | what is the location of the incision? | low specificity, weak decision making, too shallow, over clarification |
| 37 | C009:T1 | or_prep | 5 | What are the steps for a trigger finger release? | low specificity, weak decision making, too shallow |
| 38 | C046:T1 | clinic | 5 | what are the indications for ACL reconstruction? | low specificity, missing attending pearls, weak surgical teaching, over clarification |
| 39 | C029:T1 | or_prep | 5 | What is the start point for femoral intertroch nail? | weak decision making, missing attending pearls, too shallow, over clarification |
| 40 | C032:T1 | clinic | 5 | What are the treatment options for intertroch fracture? | weak decision making, missing attending pearls, too shallow, over clarification |
| 41 | C047:T3 | oite | 5 | What are common flexion extension gap questions? | weak decision making, missing attending pearls, too shallow, over clarification |
| 42 | C044:T1 | clinic | 5 | what are the indications for reconstructive, cephomedullary, or hip screw nail? | weak decision making, missing attending pearls, too shallow, over clarification |
| 43 | C063:T2 | research | 6 | Limitations of AI in TJA? | low specificity, missing attending pearls |
| 44 | C063:T3 | research | 6 | Can you name all the steps that would be good for this project. Start with TKA | weak decision making, missing attending pearls |
| 45 | C066:T2 | general | 6 | tell me about the palmar cutaneous branch | weak decision making, too shallow |
| 46 | C059:T1 | oite | 6 | Quiz me on THA must-see anatomy. Ask short med-student-level questions first. | weak decision making, too shallow, weak oite explanation |
| 47 | C049:T2 | oite | 6 | how do you treat it? | weak decision making, missing attending pearls, too shallow |
| 48 | C065:T1 | or_prep | 6 | Why would you use a intramedullary nail over a plate for distal femur fixation | weak decision making, missing attending pearls |
| 49 | C065:T3 | or_prep | 6 | Indications for Secondary Constructs? | weak decision making, missing attending pearls |
| 50 | C065:T6 | research | 6 | Research for secondary constructs | weak decision making, missing attending pearls |

## Focus Mode Audit

Focus Mode is the highest-priority problem.

Observed:

- `needsClarification=true`: 146 / 176 turns
- Visible stored `clarifyingQuestions`: 0 / 176 turns
- `brobot_chat_clarification_suggested` events: 146
- Branch events: 544
- Branch clicks: 47
- Branch CTR: 8.6%
- Conversations with branch events: 49 / 76

Root cause:

- In `src/lib/brobot/chat/response-parser.ts`, `needsClarification` becomes true when `parsed.needsClarification` is true, when `clarifyingQuestions.length > 0`, or when `assumedContext` is non-empty.
- Many normal answerable prompts include an assumption, so they are marked as needing clarification even when BroBot should simply answer.
- The chat route records `brobot_chat_clarification_suggested` when `brobotOutput.needsClarification` is true, so analytics inflate clarification behavior.

Examples where clarification state was bad:

- "What is the Garden classification?" Answer directly.
- "What are anatomy facts I need to know about FDP and FDS?" Answer directly.
- "What is a neutralization plate?" Answer directly.
- "What is the start point for femoral intertroch nail?" Answer directly.
- "Distal radius ORIF pearls" Answer with assumption, but do not mark as clarification-needed.

Where clarification is useful:

- "What should I study tonight?"
- "What do I need to know before clinic tomorrow?"
- "What should I know about hip fractures?"
- "What are the surgical steps?" with no topic and no recoverable conversation context.
- Real consults missing age, mechanism, open/closed status, neurovascular exam, imaging, reduction status, wound status, or labs.

## Follow-Up Question Audit

The follow-up system is active but not yet educationally sharp.

Problems:

- Many follow-ups are generic: "What complications should I anticipate?", "What anatomy is most at risk?", "What implants should I know?"
- Categories are duplicated with inconsistent casing: "complications", "Complications", "surgical technique", "OR Technique".
- Some branches are too broad to feel resident-specific.
- Branch CTR of 8.6% suggests users often ignore the suggestions.
- Unknown branch rows had 24 impressions and 24 clicks, which means clicked generated branches are not always traceable to durable branch-question records.

Better pattern:

- Topic: ACL reconstruction
- Bad: "What complications should I know?"
- Better:
  - "How do I avoid vertical femoral tunnel placement?"
  - "When would BTB beat quad or hamstring autograft?"
  - "What does a pivot shift actually tell me?"
  - "What rehab milestones protect the graft?"
  - "What ACL graft-choice traps show up on OITE?"

## Prompt Audit

Strengths:

- Mode-specific instructions exist.
- OR Prep, OITE, consult, clinic, research modes have different teaching priorities.
- The model is explicitly told to avoid textbook dumps and generic filler.
- Quality gate warnings exist for OR Prep, OITE, consult, entity specificity, and level fit.
- Strong model routing exists for OR Prep, consult, OITE, and research in `getAnswerModelForRoute()`.

Problems:

- The main prompt asks one answer model to answer, structure, clarify, produce branch chips, tag, set confidence, infer mode, and satisfy UI sections.
- Output is JSON-only, which pressures the model to serialize instead of teach naturally.
- Clarification, branch generation, and answer generation are blended in one contract.
- `assumedContext` has dual meaning: a harmless answer assumption and a clarification signal.
- The prompt says "Do not over-ask," but the parser and analytics turn ordinary assumptions into clarification behavior.
- `BROBOT_SEPARATE_METADATA_PASS` defaults false, so product metadata still competes with answer quality.
- The quality gate can trigger revision, but the persisted corpus still shows shallow answers, suggesting warning thresholds and revision criteria are not strict enough or were not active for many saved turns.

## Adaptive Response Framework

Every response should not use the same structure. Use an adaptive answer type:

| Prompt type | Best structure |
|---|---|
| Anatomy | Course, branches/attachments, danger zones, surgical relevance, injury pattern, memory hook. |
| Fracture | Classification, stability, imaging, operative indications, fixation choices, complications, attending questions. |
| Procedure / OR Prep | Objective, setup, exposure/interval, anatomy at risk, key steps/checks, pitfalls, bailout, attending asks. |
| Clinic | History, exam, imaging, first-line treatment, escalation, red flags, patient counseling. |
| Consult | Urgency, missing data, immediate actions, imaging/labs, temporizing care, presentation script, senior call triggers. |
| OITE | Direct answer, tested concept, stem clues, treatment threshold, distractors, memory hook, active recall. |
| Research | PICO/study question, design, bias, endpoints, statistical issue, clinical takeaway, next evidence need. |

## Redesigned Focus Routing

Replace "ask if ambiguous" with a confidence-based router:

1. Immediate answer
   - Factual, anatomy, classification, definition, common OITE fact, narrow procedure question.
   - Use assumptions silently or briefly.

2. Targeted answer with assumption
   - Broad but answerable.
   - Example: "Teach me ankle fractures."
   - Answer with a stated frame: adult trauma, OITE/clinical overview, or OR prep.
   - Offer specific branches after the answer.

3. Focused clarification
   - Only when the answer would materially differ.
   - Ask 1 question or 2-4 branch choices.
   - Do not generate a full answer first.

4. Conversation branch
   - Use when the user explicitly asks to choose a learning path or after a strong answer.

Routing thresholds:

- Clarify only if `ambiguity === high` and no safe/default answer would be useful.
- For `ambiguity === moderate`, answer with assumption and set `needsClarification=false`.
- `assumedContext` must not imply `needsClarification`.
- The parser should treat `clarifyingQuestions.length > 0` as the only automatic clarification signal.

## Conversation Architecture Redesign

Recommended pipeline:

1. Intent and risk router
   - Classify mode, subintent, complexity, risk, retrieval need, and whether clarification is truly required.

2. Clarification gate
   - Deterministic.
   - Output one of: `answer_now`, `answer_with_assumption`, `ask_clarification`, `offer_branches`.

3. Context broker
   - Assemble certified CasePrep snippets, knowledge graph facts, conversation summary, and source context when needed.

4. Hidden answer plan
   - Identify must-cover facts, management pivots, attending pearls, board traps, anatomy at risk, and unsupported-claim risk.

5. Answer generation
   - Generate the visible teaching answer only.
   - No tags, branches, confidence, or UI metadata in this pass.

6. Critique and revise
   - Check against mode-specific rubric.
   - Revise once when weak.

7. Metadata generation
   - Generate follow-up chips, branches, tags, and UI fields from the final answer.

8. Analytics
   - Track actual visible clarification, assumption-only answers, branch impressions, branch clicks, continued conversation, and answer quality.

## Gold Standard Rewrites

### "Teach me ankle fractures."

Ideal answer shape:

- Start with the decision frame: stable vs unstable ankle mortise.
- Teach the x-ray read: AP/lateral/mortise, medial clear space, talar shift, syndesmosis.
- Explain Weber and Lauge-Hansen as different tools, not memorization trivia.
- Include operative indications: bimalleolar, unstable SER, talar shift, syndesmotic instability, posterior malleolus decision-making.
- Add attending pearl: reduction quality and syndesmosis assessment matter more than naming the fracture.

### "How do I approach distal radius fractures?"

Ideal answer shape:

- First decide: extra-articular vs intra-articular, volar vs dorsal comminution, DRUJ/ulnar styloid, patient demands.
- Imaging: PA/lateral/oblique, consider CT for articular pattern.
- OR Prep: volar FCR approach, protect radial artery, FPL/flexor tendons, pronator quadratus, watershed line.
- Fixation: restore height, inclination, volar tilt, articular congruity; avoid dorsal screw penetration.
- Attending asks: why volar plate, how to check screw length, what makes it unstable.

### "Explain ACL reconstruction."

Ideal answer shape:

- Core problem: restore rotational and anterior stability after functionally unstable ACL tear.
- Indications: symptomatic instability, pivoting athlete, associated repairable meniscus injury, failed rehab.
- Graft choice: BTB, quad, hamstring, allograft tradeoffs by age/activity and morbidity.
- Key technical decisions: femoral tunnel anatomic position, tibial tunnel avoiding impingement, fixation/tensioning.
- Pitfalls: vertical femoral tunnel, tunnel convergence, graft mismatch, missed LET/meniscus/root pathology.

### "Help me prepare for tomorrow's trauma cases."

Ideal answer shape:

- Clarify only if no case list exists; otherwise answer with a trauma-prep framework.
- Ask for cases at the end, not before giving value.
- Provide universal trauma prep: mechanism, soft tissues, neurovascular exam, imaging, reduction plan, implants, antibiotics/tetanus/open fracture, compartment risk.
- Branches: "ankle fracture", "distal radius", "tibial plateau", "hip fracture", "open fracture".

### "What do attendings pimp on femoral neck fractures?"

Ideal answer shape:

- Blood supply: medial femoral circumflex, retinacular vessels, AVN risk.
- Classification: Garden displacement and Pauwels verticality.
- Treatment pivots: young vs elderly, displaced vs nondisplaced, physiologic age, arthroplasty vs fixation.
- Complications: AVN, nonunion, fixation failure, dislocation if arthroplasty.
- Classic questions: why urgent reduction in young patient, why arthroplasty in displaced elderly, what imaging if occult.

### "What are common mistakes during THA?"

Ideal answer shape:

- Preop: poor templating, missed deformity/bone loss, wrong offset/leg-length plan.
- Exposure: inadequate femoral exposure, fracture risk, abductor injury depending approach.
- Acetabulum: malposition, insufficient host bone, wrong version/inclination, missed instability risk.
- Femur: varus stem, fracture, subsidence risk, version mismatch.
- Trialing: ignoring combined anteversion, offset, leg length, impingement, stability.
- Attending pearl: most mistakes are not "steps"; they are failure to re-check the plan after each irreversible move.

## Benchmark Against Expert References

BroBot should be benchmarked against Orthobullets, AO Surgery Reference, Miller's Review, Rockwood & Green, Campbell, and AAOS guidance for educational quality, not copied text.

Current BroBot generally falls short of expert references in:

- fracture classification completeness
- operative indications
- surgical approach anatomy
- fixation decision-making
- board distractor explanation
- evidence confidence and citation discipline

It sometimes matches expert references for:

- quick definitions
- basic classification lists
- simple anatomy facts
- high-level complication names

The product goal should not be "more facts than Orthobullets." It should be "faster judgment than a static reference."

## Prioritized Roadmap

P0:

- Fix `needsClarification` semantics so `assumedContext` does not imply clarification.
- Make clarification rare: high ambiguity only, no safe useful default.
- Default simple factual prompts to immediate answer.
- Turn on separate metadata pass by default so branch/tag generation does not compete with answer quality.
- Strengthen revision gate for shallow answers, missing decision-making, missing attending pearls, and OR/OITE template misses.
- Add answer-type templates for anatomy, fracture, OR Prep, clinic, consult, OITE, research.

P1:

- Build certified answer-time retrieval from CasePrep and the knowledge graph.
- Add hidden answer planning.
- Add topic-specific follow-up candidate generation with educational dimensions.
- Normalize branch categories and store generated branch rows so clicked generated branches are traceable.
- Create a permanent benchmark suite for the six gold-standard prompts plus common real prompt clusters.

P2:

- Add user learning memory and topic mastery state.
- Add expert-reviewed exemplar library by subspecialty.
- Add analytics for continued conversation after follow-up click, not just CTR.
- Build an admin dashboard that samples low-scoring real turns weekly.

## Final Assessment

BroBot's current product scaffolding is stronger than its teaching engine. The app knows modes, stores analytics, generates branches, and has quality gates, but the visible answer often remains too shallow. The next quality jump will come from treating BroBot as an orthopaedic reasoning engine first and a chat UI second.

The single highest-impact change is not more follow-up questions. It is fewer interruptions, better first answers, and a stricter answer-quality loop that forces every response to include judgment, not just information.
