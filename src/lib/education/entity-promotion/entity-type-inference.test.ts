/** Tests for improved entity-type inference. */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { inferEntityType } from "./entity-type-inference";

describe("inferEntityType lexical rules", () => {
  it("types anatomy head nouns", () => {
    assert.equal(inferEntityType("Femoral nerve").type, "anatomy_structure");
    assert.equal(inferEntityType("Anterior cruciate ligament").type, "anatomy_structure");
    assert.equal(inferEntityType("Humerus").type, "anatomy_structure");
  });

  it("types procedures", () => {
    assert.equal(inferEntityType("Total hip arthroplasty").type, "procedure");
    assert.equal(inferEntityType("High tibial osteotomy").type, "procedure");
  });

  it("types fixation techniques as fixation_method, not procedure", () => {
    assert.equal(inferEntityType("ORIF").type, "fixation_method");
    assert.equal(inferEntityType("CRPP").type, "fixation_method");
    assert.equal(inferEntityType("IM nailing").type, "fixation_method");
  });

  it("types surgical approaches", () => {
    assert.equal(inferEntityType("Kocher approach").type, "surgical_approach");
    assert.equal(inferEntityType("Henry interval").type, "surgical_approach");
  });

  it("types classification grades separately from systems", () => {
    assert.equal(inferEntityType("Garden type II").type, "classification_grade");
    assert.equal(inferEntityType("Garden classification").type, "classification_system");
  });

  it("types diagnostic modalities as diagnostic_test, not imaging_finding", () => {
    const mri = inferEntityType("MRI");
    assert.equal(mri.type, "diagnostic_test");
    assert.equal(inferEntityType("CT scan").type, "diagnostic_test");
  });

  it("types exam maneuvers", () => {
    assert.equal(inferEntityType("Lachman test").type, "exam_maneuver");
    assert.equal(inferEntityType("McMurray").type, "exam_maneuver");
  });

  it("types classifications", () => {
    assert.equal(inferEntityType("Garden classification").type, "classification_system");
    assert.equal(inferEntityType("AO/OTA classification").type, "classification_system");
  });

  it("types complications", () => {
    assert.equal(inferEntityType("Nonunion").type, "complication");
    assert.equal(inferEntityType("Compartment syndrome").type, "complication");
  });

  it("types alignment and motion as biomechanics concepts", () => {
    assert.equal(inferEntityType("Varus").type, "biomechanics_concept");
    assert.equal(inferEntityType("Adduction").type, "biomechanics_concept");
    assert.equal(inferEntityType("External rotation").type, "biomechanics_concept");
  });

  it("types conditions", () => {
    assert.equal(inferEntityType("Metatarsus adductus").type, "condition");
    assert.equal(inferEntityType("Sprain").type, "condition");
    assert.equal(inferEntityType("C1-C2 instability").type, "condition");
    assert.equal(inferEntityType("LCL injury").type, "condition");
  });

  it("matches -sis words without plural-fold mangling", () => {
    const scoliosis = inferEntityType("Scoliosis");
    assert.equal(scoliosis.type, "condition");
    assert.ok(!scoliosis.flags.includes("prior_fallback"));
    assert.ok(scoliosis.confidence >= 0.8);
    assert.equal(inferEntityType("Arthrodesis").type, "procedure");
  });

  it("tolerates plurals and case", () => {
    assert.equal(inferEntityType("Recurrent dislocations").type, "condition");
    assert.equal(inferEntityType("Collateral Ligaments").type, "anatomy_structure");
  });

  it("types bony landmarks and articulations", () => {
    assert.equal(inferEntityType("Anterior inferior iliac spine").type, "anatomy_structure");
    assert.equal(inferEntityType("Ulnohumeral articulation").type, "anatomy_structure");
  });

  it("types scoring systems as classifications", () => {
    assert.equal(inferEntityType("Mirels Scoring System").type, "classification_system");
  });

  it("prefers condition for injury entities that name anatomy", () => {
    assert.equal(inferEntityType("Ulnar collateral ligament tear").type, "condition");
    assert.equal(inferEntityType("Developmental Dysplasia of the Hip").type, "condition");
    assert.equal(inferEntityType("Anterior cruciate ligament").type, "anatomy_structure");
  });

  it("types joint singles and muscle names", () => {
    assert.equal(inferEntityType("Knee").type, "anatomy_structure");
    assert.equal(inferEntityType("Semimembranosus").type, "anatomy_structure");
    assert.equal(inferEntityType("Gracilis").type, "anatomy_structure");
    assert.equal(inferEntityType("Rotator cuff").type, "anatomy_structure");
  });

  it("types sequestrum as a condition", () => {
    assert.equal(inferEntityType("Sequestrum").type, "condition");
  });

  it("types sarcomas as conditions and head compounds as anatomy", () => {
    assert.equal(inferEntityType("Chondrosarcoma").type, "condition");
    assert.equal(inferEntityType("Clear cell chondrosarcoma").type, "condition");
    assert.equal(inferEntityType("radial head").type, "anatomy_structure");
    assert.equal(inferEntityType("Femoral head").type, "anatomy_structure");
  });

  it("types neuropathic and mechanical-symptom labels as conditions", () => {
    assert.equal(inferEntityType("Ulnar nerve neuropathy").type, "condition");
    assert.equal(inferEntityType("AIN palsy").type, "condition");
    assert.equal(inferEntityType("Snapping ECU").type, "condition");
    assert.equal(inferEntityType("Patella Baja").type, "condition");
    // Hardware stays implant: "locking" excluded from symptom patterns.
    assert.equal(inferEntityType("Locking plate").type, "implant");
  });

  it("does not type symptom phrases as anatomy", () => {
    const result = inferEntityType("hip pain");
    assert.notEqual(result.type, "anatomy_structure");
  });

  it("disambiguates short anatomy from origin context", () => {
    const result = inferEntityType("3rd MC", undefined, {
      texts: ["The Adductor Pollicis originates from 3rd MC."],
    });
    assert.equal(result.type, "anatomy_structure");
    assert.ok(result.reasons.includes("musculoskeletal_context_disambiguation"));
  });

  it("types implants", () => {
    assert.equal(inferEntityType("Cephalomedullary nail").type, "implant");
  });
});

describe("inferEntityType symptom rule (Step 4)", () => {
  it("types patient-reported phenomena as symptom", () => {
    for (const label of ["Pain", "Thigh pain", "Numbness", "Muscle weakness", "Swelling", "Paresthesia", "Tingling", "Night ache"]) {
      assert.equal(inferEntityType(label).type, "symptom", label);
    }
  });

  it("prefers symptom over anatomy for symptomatic anatomy phrases", () => {
    assert.equal(inferEntityType("Periscapular muscle weakness").type, "symptom");
    assert.equal(inferEntityType("Pain on extension").type, "symptom");
  });

  it("keeps pain syndromes and stiff complications out of symptom", () => {
    assert.equal(inferEntityType("Complex regional pain syndrome").type, "condition");
    assert.equal(inferEntityType("Elbow stiffness").type, "complication");
  });
});

describe("inferEntityType flags and fallback", () => {
  it("flags elided adjectives as ambiguous", () => {
    const result = inferEntityType("Femoral");
    assert.ok(result.flags.includes("ambiguous_elision"));
    assert.ok(result.flags.includes("prior_fallback"));
  });

  it("disambiguates elided nerves from innervation context", () => {
    const result = inferEntityType("Femoral", undefined, {
      texts: ["The Vastus medialis is innervated by Femoral."],
    });
    assert.equal(result.type, "anatomy_structure");
    assert.ok(result.reasons.includes("innervation_context_disambiguation"));
  });

  it("flags verb fragments", () => {
    const result = inferEntityType("Extend");
    assert.ok(result.flags.includes("likely_verb_fragment"));
  });

  it("flags measurement-like labels", () => {
    const result = inferEntityType("ADI >10 mm");
    assert.ok(result.flags.includes("measurement_like"));
  });

  it("reports the condition prior explicitly instead of silently", () => {
    const result = inferEntityType("SLAC wrist");
    assert.equal(result.type, "condition");
    assert.ok(result.flags.includes("prior_fallback"));
    assert.ok(result.reasons.includes("condition_prior_fallback"));
    assert.ok(result.confidence < 0.5);
  });
});
