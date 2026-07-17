# Human Exception Review — CTS Dry-Run Manufacture

Only items classified as `ESCALATE_TO_HUMAN` are listed here.

## 1. Open versus endoscopic approach-choice decision

- Proposal: When a reviewed surgical indication is present, choose open versus endoscopic release through shared decision-making informed by anatomy, prior surgery, risks, resources, patient preference, and surgeon expertise.
- Why unresolved: The evidence packet supports named open and endoscopic options but does not establish one default curriculum pathway.
- Supporting evidence: AAOS/current evidence synthesis notes no universal long-term superiority; technique choice depends on context, training, and patient factors.
- Competing options:
  - Teach open and endoscopic release as equivalent named options selected by shared decision-making.
  - Teach one approach as the default pathway and the other as an alternative.
- Exact question: Should the curriculum frame open versus endoscopic release as equivalent named options selected by shared decision-making, or should one be the default teaching pathway?
- Recommended option: Equivalent named options selected by shared decision-making.
- Decision choices: `equivalent_named_options`, `open_default`, `endoscopic_default`, `defer`

## 2. Endoscopic bailout decision

- Proposal: For inadequate visualization, anomalous anatomy, bleeding, or another safety concern during endoscopic release, stop or convert according to an attending-approved bailout protocol.
- Why unresolved: The proposal is clinically plausible but the exact action is operative-protocol dependent.
- Supporting evidence: Evidence packet routes operative steps and bailout logic to attending review; supplied evidence does not define a canonical bailout protocol.
- Competing options:
  - Encode broad safety language: stop or convert according to local protocol.
  - Encode conversion to open release as the canonical bailout.
  - Do not encode bailout action until operative-step packet exists.
- Exact question: For endoscopic CTR teaching, should the bailout action be encoded as `convert to open release` or the broader `stop or convert based on attending-approved safety protocol`?
- Recommended option: Use broader local-protocol language.
- Decision choices: `broad_stop_or_convert`, `convert_to_open`, `defer_until_operative_protocol`

## 3. Operative indication and urgency decision

- Proposal: Persistent function-limiting symptoms after appropriate care, severe disease, or objective motor/denervation findings should trigger discussion of carpal tunnel release, with urgency currently set to `urgent`.
- Why unresolved: Indication thresholds and urgency for motor deficit or denervation are high-stakes and not fully specified by the supplied evidence.
- Supporting evidence: Evidence packet states that no universal numeric threshold is justified and routes surgical indications to attending review.
- Competing options:
  - Encode objective thenar weakness/denervation as urgent operative evaluation.
  - Encode objective thenar weakness/denervation as expedited non-emergent evaluation.
  - Keep all operative indications routine pending source-specific severity definitions.
- Exact question: Should objective thenar weakness or denervation be represented as urgent operative evaluation, expedited non-emergent evaluation, or routine surgical discussion in this curriculum?
- Recommended option: Expedited non-emergent evaluation unless acute compression is separately modeled.
- Decision choices: `urgent`, `expedited_non_emergent`, `routine`, `defer`

## 4. Persistent CTS definition after release

- Proposal: Symptoms that do not adequately improve after carpal tunnel release should trigger reassessment of diagnosis, localization, severity, and release completeness before considering revision.
- Why unresolved: The concept is correct, but the exact definition of persistent CTS after release remains open.
- Supporting evidence: Failed-release evidence supports incomplete release as an explanation for persistent symptoms, but the evidence packet warns against automatically diagnosing incomplete release.
- Competing options:
  - Define persistent CTS as inadequate postoperative improvement without a fixed interval.
  - Require a specific postoperative time interval.
  - Require evidence suggesting incomplete release before using the persistent CTS entity.
- Exact question: Should persistent CTS after release be defined simply as inadequate postoperative improvement, or should it require a specific time interval and/or evidence of incomplete release?
- Recommended option: Inadequate postoperative improvement without fixed interval, with incomplete release modeled separately when supported.
- Decision choices: `no_fixed_interval`, `fixed_interval_required`, `requires_incomplete_release_evidence`, `defer`

## 5. Recurrent CTS definition after release

- Proposal: CTS symptoms that return after a period of improvement following release should trigger evaluation for recurrent compression and alternative causes before considering revision.
- Why unresolved: The evidence supports separating recurrence from persistence, but the symptom-free interval is not settled in the supplied packet.
- Supporting evidence: Failed-release evidence supports the distinction; evidence packet explicitly warns against encoding a fixed global recurrence interval without approval.
- Competing options:
  - Define recurrence as return of CTS symptoms after documented postoperative improvement, without fixed interval.
  - Require a specific symptom-free interval.
  - Defer recurrence entity use until a source-specific definition is selected.
- Exact question: What symptom-free interval, if any, should define recurrent CTS after release for this curriculum?
- Recommended option: No fixed interval; require documented postoperative improvement before symptom return.
- Decision choices: `improvement_no_fixed_interval`, `fixed_interval_required`, `defer`

## 6. Persistent CTS treated-by revision release

- Proposal: `persistent-carpal-tunnel-syndrome-after-release -[treated_by]-> revision-carpal-tunnel-release`
- Why unresolved: Revision can be appropriate for selected persistent symptoms, but persistent symptoms alone do not automatically indicate revision.
- Supporting evidence: Failed-release evidence supports revision evaluation; evidence packet warns that incomplete release is not automatic.
- Competing options:
  - Keep a qualified `treated_by` edge.
  - Remove the direct edge and represent revision only through an attending-gated decision point.
  - Keep the edge only when incomplete release or another surgically correctable cause is present.
- Exact question: Should persistent CTS after release have a direct `treated_by` edge to revision carpal tunnel release, or should revision be linked only through an attending-gated evaluation/indication decision point?
- Recommended option: Decision-point-only unless a surgically correctable cause is represented.
- Decision choices: `qualified_direct_edge`, `decision_point_only`, `only_with_correctable_cause`, `defer`

## 7. Recurrent CTS treated-by revision release

- Proposal: `recurrent-carpal-tunnel-syndrome -[treated_by]-> revision-carpal-tunnel-release`
- Why unresolved: Revision release can treat selected recurrent CTS, but recurrence requires diagnostic confirmation and exclusion of mimics.
- Supporting evidence: Failed-release evidence supports recurrence as separate from persistence but does not define the final treatment threshold.
- Competing options:
  - Keep a qualified direct `treated_by` edge.
  - Remove the direct edge and represent revision only through an attending-gated decision point.
  - Require diagnostic confirmation before the edge is active.
- Exact question: Should recurrent CTS have a direct `treated_by` edge to revision carpal tunnel release, or should revision be represented only after diagnostic confirmation and attending-gated indication review?
- Recommended option: Decision-point-only until diagnostic confirmation/indication criteria are encoded.
- Decision choices: `qualified_direct_edge`, `decision_point_only`, `requires_diagnostic_confirmation`, `defer`
