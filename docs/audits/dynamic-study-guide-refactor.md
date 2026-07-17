# Dynamic Study Guide Refactor

## Current Architecture Audit

The Student Workspace case-readiness page previously mixed two learning products:

- a completion-tracked checklist of case-readiness objectives
- a separate survival/procedure section panel built from fixed legacy headings

The useful architecture was the progress loop around checklist cards: section IDs, completion percentage, selected minutes, persisted progress, expandable detail, and BroBot actions. The weak architecture was the former lower-panel generator, which forced every topic into generic service-prep categories.

## Components Deleted

- the former lower-panel case-readiness component
- the former procedure-module case-readiness component

## Data Models Replaced

- Removed the former lower-panel section contract.
- Removed the former procedure-module contract.
- Replaced fixed case-readiness objective categories with dynamic `StudyGuideSection` records.

## New Study Guide Schema

```ts
type StudyGuideSection = {
  id: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  learningObjective: string;
  content: StudyGuideContentBlock[];
  importance: "must-know" | "core" | "stretch";
  sectionKind: StudyGuideSectionKind;
  guideType: StudyGuideTopicType;
  completionLabel: string;
  brobotActions: CaseReadinessBrobotAction[];
  sourceFields: CaseReadinessSourceField[];
  mode: StudyMode;
};
```

`StudyGuideTopicType` supports `basic-science`, `anatomy`, `pathology`, `trauma`, `clinic`, `procedure`, `implant`, `approach`, and `rehabilitation`.

## Migration Strategy

Progress remains attached to stable section IDs through the existing `completedObjectiveIds` API payload. The UI still calculates completion percentage from completed IDs over total sections, but those IDs now represent dynamic study guide sections instead of fixed template categories.

The session object keeps `objectives` as an alias of `studyGuideSections` for compatibility while the product language moves toward study guides.

## Example Outputs

### Fracture Healing

Guide type: `basic-science`

- Distinguish primary from secondary bone healing
- Sequence the stages of secondary healing
- Explain why excessive strain prevents bone formation
- Recognize delayed union, nonunion, and malunion

### Distal Radius OR Prep

Guide type: `trauma`

- Connect mechanism, deformity, and median nerve exam
- Recognize radiographic signs of an unstable distal radius fracture
- State reduction and splinting goals
- Explain why fixation may be needed
- Remember complications that change follow-up

### Carpal Tunnel Syndrome

Guide type: `clinic`

- Recognize the median-nerve symptom pattern
- Perform a focused CTS exam
- Know when electrodiagnostics help
- Explain indications for carpal tunnel release
- Identify structures released during carpal tunnel surgery

## Component Tree

```text
CaseReadinessPage
  CaseReadinessHeader
  CasePrepStatusBanner
  studyGuideSections[]
    ReadinessObjectiveCard
      completion toggle
      title / description / estimated time / importance
      learning objective
      expandable structured teaching blocks
      CaseReadinessActions
  Sidebar
    ReadinessConfidenceWidget
    CaseReadinessProgress
    Session snapshot
    Related topics
    Next step
```

## Follow-Up Product QA

The case-readiness page now treats `studyGuideSections` as the complete Prepare learning object. There is no second lower curriculum panel and no generic topic-level BroBot panel in the sidebar. BroBot actions live on each section card and include the selected section title, learning objective, topic, guide type, study mode, and section block content.

### Rendered Audit Topics

| Topic | Guide type | Rendered sections | QA result |
| --- | --- | --- | --- |
| Fracture healing | `basic-science` | Distinguish primary from secondary bone healing; Sequence the stages of secondary healing; Explain why excessive strain prevents bone formation; Recognize delayed union, nonunion, and malunion | Relevant, specific, ordered from concept to failure states. No forced imaging or operative checklist. |
| Bone remodeling | `basic-science` | Explain osteoblast and osteoclast coupling; Apply Wolff law to loading and stress; Know when remodeling will not rescue alignment | Relevant, specific, no overlap beyond intentional cell-to-load-to-limits sequence. |
| Carpal tunnel syndrome | `clinic` | Recognize the median-nerve symptom pattern; Perform a focused CTS exam; Know when electrodiagnostics help; Explain indications for carpal tunnel release; Identify structures released during carpal tunnel surgery | Relevant clinical sequence from presentation to exam, diagnostics, treatment, and procedure anatomy. |
| Distal radius fracture | `trauma` | Connect mechanism, deformity, and median nerve exam; Recognize radiographic signs of an unstable distal radius fracture; State reduction and splinting goals; Explain why fixation may be needed; Remember complications that change follow-up | Relevant trauma sequence from recognition to imaging, immediate management, fixation decision, and follow-up. |
| Posterior hip approach | `approach` | Set up lateral positioning and posterior landmarks; Follow superficial and deep exposure; Identify short external rotators and capsule; Protect the sciatic nerve danger zone; Connect closure to posterior stability | Relevant approach sequence from setup to exposure, anatomy, danger zone, and closure. |
| Total hip implant fixation | `implant` | Compare cemented and cementless fixation; Explain stem geometry and load transfer; Understand acetabular cup fixation; Recognize radiographic fixation and loosening signs; Use patient and bone factors to explain implant choice | Relevant implant sequence from fixation concept to x-ray recognition and patient-specific choice. |
| Postoperative ACL rehabilitation | `rehabilitation` | Prioritize swelling control, extension, and quad activation; Assess the first post-op ACL visit; Explain staged progression to running and sport; Adjust rehab for meniscus repair and graft factors; Recognize warning signs during ACL rehab | Relevant rehab sequence from early priorities to clinic check, staged progression, modifiers, and complications. |

All seven topics use deterministic semantic IDs shaped as `{topicId}__{section-concept}`. Completion IDs are normalized against the current section list before save, so removed or stale IDs do not inflate progress.

### Accessibility Finding

The stray drag-and-drop instruction text came from the workspace call editor's `DndContext`, not the Student Workspace Prepare page. The call editor now provides explicit screen-reader instructions through dnd-kit's `accessibility.screenReaderInstructions` prop with a stable context ID. The instruction remains available to assistive technology through dnd-kit's hidden accessibility node and is not rendered as visible Prepare content.

### Screenshot Artifacts

The authenticated Student Workspace route hung while resolving local workspace state in browser automation, so screenshot artifacts were generated from the same study-guide builder output using a static visual verification page.

- Before-state temporary artifacts: `/private/tmp/prepare-before/screenshots/`
- After-state artifacts: `tmp/prepare-study-guide-visual/screenshots/`
