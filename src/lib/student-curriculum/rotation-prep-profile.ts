import type { CurriculumTrackFilterId } from "@/components/student-workspace/prepare/rotation-track-mapping";
import {
  getSuggestedStartTopic,
  getTopicsByTrack,
  getTrackById,
} from "@/lib/student-curriculum/curriculum-recommendations";
import type { CurriculumTopic } from "@/lib/student-curriculum/curriculum-types";

export type RotationPrepProfile = {
  trackId: string;
  trackTitle: string;
  brobotAssistantLabel: string;
  rotationFocus: string;
  recommendedCases: string[];
  commonProcedures: string[];
  highYieldTopics: CurriculumTopic[];
  anatomyHighlights: string[];
  attendingQuestions: string[];
  complicationReview: string[];
  implantReview: string[];
  classificationReview: string[];
  suggestedStartTopic: CurriculumTopic | null;
};

const TRACK_PROCEDURE_HINTS: Partial<Record<CurriculumTrackFilterId, string[]>> = {
  trauma: ["ORIF", "Closed reduction and splinting", "External fixation", "Compartment release"],
  spine: ["Lumbar decompression", "ACDF", "TLIF", "Cervical traction"],
  hand: ["Carpal tunnel release", "Tendon repair", "Closed reduction", "K-wire fixation"],
  "adult-reconstruction": ["Total hip arthroplasty", "Total knee arthroplasty", "Irrigation and debridement"],
  sports: ["ACL reconstruction", "Meniscus repair", "Rotator cuff repair", "Bankart repair"],
  pediatrics: ["Closed reduction", "Percutaneous pinning", "Spica casting", "Traction"],
  "foot-ankle": ["Ankle ORIF", "Achilles repair", "Cheilectomy", "Lisfranc fixation"],
  "shoulder-elbow": ["ORIF", "Rotator cuff repair", "Shoulder arthroplasty", "Elbow reduction"],
  tumor: ["Biopsy planning", "Curettage", "Reconstruction planning", "Pathologic fracture stabilization"],
  "basic-science": ["Fracture biology review", "Biomechanics drills", "OITE question blocks"],
};

const TRACK_IMPLANT_HINTS: Partial<Record<CurriculumTrackFilterId, string[]>> = {
  trauma: ["Plates and screws", "Intramedullary nails", "External fixator constructs"],
  spine: ["Pedicle screws", "Interbody cages", "Anterior cervical plates"],
  "adult-reconstruction": ["Femoral stems", "Acetabular components", "Polyethylene inserts"],
  sports: ["Graft options", "Suture anchors", "Interference screws"],
  hand: ["K-wires", "Mini plates", "Tendon core sutures"],
  "foot-ankle": ["Syndesmotic screws", "Ankle plating systems", "Hindfoot screws"],
  "shoulder-elbow": ["Locking plates", "Stemmed implants", "Suture anchors"],
  tumor: ["Cemented fixation", "Endoprosthetic reconstruction", "Oncologic implants"],
};

const TRACK_CLASSIFICATION_HINTS: Partial<Record<CurriculumTrackFilterId, string[]>> = {
  trauma: ["AO/OTA fracture classification", "Garden (hip)", "Schatzker (tibial plateau)"],
  spine: ["Myelopathy grading", "Fracture-dislocation patterns", "Stenosis severity language"],
  "adult-reconstruction": ["KL osteoarthritis grade", "PJI workup framework", "Instability classification"],
  sports: ["Partial versus complete tears", "Instability direction", "Chondral defect grading"],
  pediatrics: ["Salter-Harris physeal patterns", "SCFE severity", "DDH Graf classification"],
  tumor: ["Enneking staging language", "Mirels score", "Benign versus malignant workup"],
};

function uniqueStrings(values: string[], limit = 8): string[] {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean))
  ).slice(0, limit);
}

export function buildRotationPrepProfile(
  trackId: CurriculumTrackFilterId
): RotationPrepProfile | null {
  const track = getTrackById(trackId);
  if (!track) return null;

  const topics = getTopicsByTrack(trackId);
  const suggestedStartTopic = getSuggestedStartTopic(trackId) ?? topics[0] ?? null;

  const recommendedCases = uniqueStrings(
    topics.flatMap((topic) => topic.commonCases.map((curriculumCase) => curriculumCase.name)),
    6
  );

  const anatomyHighlights = uniqueStrings(
    topics.flatMap((topic) => topic.fastStudyTemplate.anatomyFocus),
    8
  );

  const attendingQuestions = uniqueStrings(
    topics.flatMap((topic) => topic.fastStudyTemplate.pimpQuestions),
    8
  );

  const complicationReview = uniqueStrings(
    topics.flatMap((topic) => topic.deepStudyTemplate.complications),
    8
  );

  return {
    trackId: track.id,
    trackTitle: track.title,
    brobotAssistantLabel: `BroBot ${track.title} Assistant`,
    rotationFocus: track.rotationRelevance,
    recommendedCases,
    commonProcedures: TRACK_PROCEDURE_HINTS[trackId] ?? [
      "Focused exam",
      "Imaging review",
      "Treatment discussion",
    ],
    highYieldTopics: topics.slice(0, 6),
    anatomyHighlights,
    attendingQuestions,
    complicationReview,
    implantReview: TRACK_IMPLANT_HINTS[trackId] ?? [],
    classificationReview: TRACK_CLASSIFICATION_HINTS[trackId] ?? [],
    suggestedStartTopic,
  };
}