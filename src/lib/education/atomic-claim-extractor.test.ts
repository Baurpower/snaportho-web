import assert from "node:assert/strict";

import {
  ATOMIC_MAX_CLAIMS_PER_CARD,
  extractAtomicUnits,
  extractCardClaims,
  rewriteUnit,
  splitHtmlBlocks,
  validateAtomicity,
  type AtomicExtractionUnit,
} from "./atomic-claim-extractor";

const card = (text: string, extra = "") => ({
  canonicalCardId: "11111111-1111-4111-8111-111111111111",
  canonicalCardVersionId: "22222222-2222-4222-8222-222222222222",
  fields: [
    { name: "Text", rawValue: text },
    ...(extra ? [{ name: "Extra", rawValue: extra }] : []),
  ],
});

const unit = (filledBlock: string, contextHeader = "", answer = ""): AtomicExtractionUnit => ({
  unitId: "u-test",
  fieldName: "Text",
  blockIndex: 0,
  clozeNumbers: [1],
  clozeAnswers: [{ number: 1, answer }],
  occurrenceIndex: 0,
  answer,
  filledBlock,
  contextHeader,
  hasImage: false,
  evidenceLocator: "Text:b0:c1",
  questionWithoutAnswer: false,
});

// Block splitting and answer-only merge.
assert.deepEqual(splitHtmlBlocks("A<div><br></div><div>B</div>"), ["A", "B"]);
assert.deepEqual(splitHtmlBlocks("A<br>B<br>C"), ["A", "B", "C"]);

// Example A — single fact, inline cloze, already declarative.
{
  const { units } = extractAtomicUnits(
    card("Posterior hip dislocation is most commonly associated with injury to the {{c1::sciatic nerve}}."),
  );
  assert.equal(units.length, 1);
  assert.equal(units[0].answer, "sciatic nerve");
  const rewritten = rewriteUnit(units[0]);
  assert.equal(
    rewritten.assertion,
    "Posterior hip dislocation is most commonly associated with injury to the sciatic nerve.",
  );
  assert.equal(rewritten.method, "declarative_passthrough");
}

// Example B — anatomy table splits into 4 atomic units.
{
  const { units, contextHeader } = extractAtomicUnits(
    card(
      "Plantaris<div><br></div><div>Origin: {{c1::lateral supracondylar line}}</div><div>Insertion: {{c2::calcaneus}}</div><div>Nerve: {{c3::tibial nerve}}</div><div>Action: {{c4::plantar flexion}}</div>",
    ),
  );
  assert.equal(contextHeader, "Plantaris");
  assert.equal(units.length, 4);
  const assertions = units.map((u) => rewriteUnit(u).assertion);
  assert.equal(assertions[0], "The Plantaris originates from lateral supracondylar line.");
  assert.equal(assertions[1], "The Plantaris insertion is calcaneus.");
  assert.equal(assertions[2], "The Plantaris is innervated by tibial nerve.");
  assert.equal(assertions[3], "The Plantaris action is plantar flexion.");
  for (const u of units) assert.equal(validateAtomicity(rewriteUnit(u).assertion).atomic, true);
}

// Example C — staged classification keeps shared context.
{
  const { units } = extractAtomicUnits(
    card(
      "Lateral Third of Clavicle Fractures<div><br></div><div>Type I: {{c1::Fracture between ligaments}}</div><div>Type IIA: {{c2::Fracture medial to ligaments}}</div>",
    ),
  );
  assert.equal(units.length, 2);
  assert.equal(
    rewriteUnit(units[0]).assertion,
    "In Lateral Third of Clavicle Fractures, Type I is Fracture between ligaments.",
  );
  assert.equal(rewriteUnit(units[0]).method, "classification_stage");
}

// Example D — threshold bundle splits per item with context.
{
  const { units } = extractAtomicUnits(
    card(
      "Acute PJI<div><br></div><div>{{c1::CRP}} &gt;10</div><div>{{c2::ESR}} &gt;30</div>",
    ),
  );
  assert.equal(units.length, 2);
  assert.equal(rewriteUnit(units[0]).assertion, "For Acute PJI, CRP > 10.");
  assert.equal(rewriteUnit(units[1]).assertion, "For Acute PJI, ESR > 30.");
}

// QA inversion: What/Which + be.
assert.equal(
  rewriteUnit(unit("What view is a true AP of the glenohumeral joint? Grashey")).assertion,
  "The true AP of the glenohumeral joint is Grashey.",
);
// QA inversion: modal + leading context + answer-only merge.
{
  const { units } = extractAtomicUnits(
    card(
      "For a patient with a shoulder dislocation if an axillary view is not tolerated, what alternating view may be obtained?<div><br></div><div>{{c1::Velpeau}}</div>",
    ),
  );
  assert.equal(units.length, 1);
  assert.equal(
    rewriteUnit(units[0]).assertion,
    "For a patient with a shoulder dislocation if an axillary view is not tolerated, the alternating view that may be obtained is Velpeau.",
  );
}
// QA where/anatomy (no preposition guessing).
assert.equal(
  rewriteUnit(unit("Where does the long head of the biceps originate? Glenoid tubercle")).assertion,
  "The origin of the long head of the biceps is Glenoid tubercle.",
);
// QA how/passive.
assert.equal(
  rewriteUnit(unit("How is the mortise view of the ankle obtained? Internal rotation of leg 15°")).assertion,
  "The mortise view of the ankle is obtained by Internal rotation of leg 15°.",
);
// QA imperative (no question mark).
assert.equal(
  rewriteUnit(unit("Name the special test: Lift off.")).assertion,
  "The special test is Lift off.",
);
// QA negation.
assert.equal(
  rewriteUnit(unit("Does an anterior fat pad sign suggest an occult fracture of the elbow? Not necessarily")).assertion,
  "An anterior fat pad sign does not necessarily suggest an occult fracture of the elbow.",
);
// QA comparison.
assert.equal(
  rewriteUnit(unit("Are flexion or extension type supracondylar fractures more common? Extension (98%)")).assertion,
  "Extension type supracondylar fractures are more common than flexion (98%).",
);
// Unknown interrogative falls back flagged, never hallucinated.
{
  const out = rewriteUnit(unit("True or false, the moon is made of cheese? False", "", "False"));
  assert.equal(out.method, "interrogative_fallback");
  assert.ok(out.flags.includes("question_shaped"));
  assert.ok(out.confidence <= 0.55);
}

// Nerve-level pairs use spinal-nerve context.
{
  const { units } = extractAtomicUnits(
    card("Lower limb movements - Spinal nerves<div><br></div><div>Hip flexion - {{c1::L2, L3}}</div>"),
  );
  assert.equal(units.length, 1);
  assert.equal(rewriteUnit(units[0]).assertion, "Hip flexion is supplied by spinal nerves L2, L3.");
}

// Atomicity validator.
assert.equal(validateAtomicity("Smoking increases nonunion risk.").atomic, true);
assert.ok(validateAtomicity("Smoking increases nonunion and infection worsens outcomes.").flags.includes("compound_conjunction"));
assert.ok(validateAtomicity("CRP >10 and ESR >30 suggest infection.").flags.includes("multi_threshold"));
assert.ok(validateAtomicity("What view shows this? Grashey.").flags.includes("question_shaped"));
assert.ok(
  validateAtomicity("The finding in the radiographs shown below is SONK.").flags.includes("image_deictic"),
);

// Image-dependent cards produce zero claims.
{
  const out = extractCardClaims(
    card('The finding in the radiographs shown below is {{c1::SONK}}.<img src="x.png">'),
  );
  assert.equal(out.extractionStatus, "image_dependent");
}

// Safety ceiling.
assert.equal(ATOMIC_MAX_CLAIMS_PER_CARD, 12);
{
  const blocks = Array.from({ length: 15 }, (_, i) => `<div>Fact ${i} is {{c${i + 1}::true}}</div>`).join("");
  const out = extractCardClaims(card(`Header${blocks}`));
  assert.equal(out.extractionStatus, "needs_review");
  assert.ok(out.reasonCodes.includes("claim_ceiling_exceeded"));
  assert.equal(out.candidates.length, 15);
}

// Empty and imageless degenerate cards.
{
  const out = extractCardClaims(card('<img src="x.png">'));
  assert.equal(out.extractionStatus, "image_dependent");
}

// Mid-sentence what/which substitution.
assert.equal(
  rewriteUnit(unit("The AC joint is best visualized on what view? Zanca")).assertion,
  "The AC joint is best visualized on Zanca.",
);
assert.equal(
  rewriteUnit(unit("A LRINEC score of what indicates a 92% PPV of necrotizing fasciitis? 6 or greater")).assertion,
  "A LRINEC score of 6 or greater indicates a 92% PPV of necrotizing fasciitis.",
);
// What-makes criteria.
assert.equal(
  rewriteUnit(unit("What makes a perfect inlet pelvic radiograph? S1 overlying S2")).assertion,
  "The perfect inlet pelvic radiograph includes S1 overlying S2.",
);
// Answer-as-subject and is-used-to forms.
assert.equal(
  rewriteUnit(unit("What radiographic finding suggests an occult fracture of the elbow? Posterior fat pad sign")).assertion,
  "Posterior fat pad sign, radiographic finding, suggests an occult fracture of the elbow.",
);
assert.equal(
  rewriteUnit(unit("What view of the wrist evaluates dorsal screw lengths? Skyline")).assertion,
  "Skyline, view of the wrist, is used to evaluate dorsal screw lengths.",
);
// How-many fronting with agreement repair.
assert.equal(
  rewriteUnit(unit("How many WBCs from a native knee aspirate suggests septic arthritis? Over 50,000")).assertion,
  "Over 50,000 WBCs from a native knee aspirate suggest septic arthritis.",
);
// Do-support with negation and preserved leading context.
assert.equal(
  rewriteUnit(unit("Between endochondral and intramembranous ossification, which does NOT require a cartilage template? Intramembranous")).assertion,
  "Between endochondral and intramembranous ossification, intramembranous does not require a cartilage template.",
);
// Member-of form for make/comprise questions.
assert.equal(
  rewriteUnit(unit("What 3 elements make a perfect AP pelvis radiograph? Symmetric obturator foramina")).assertion,
  "Symmetric obturator foramina is one of the 3 elements that make a perfect AP pelvis radiograph.",
);
// Pending question attaches to answer blocks; agreement recomputed.
{
  const { units } = extractAtomicUnits(
    card("Which muscles are common causes of back pain?<div><br></div><div>Upper: {{c1::Rhomboid muscles}}</div>"),
  );
  assert.equal(units.length, 1);
  assert.equal(
    rewriteUnit(units[0]).assertion,
    "The common causes of back pain are Rhomboid muscles (Upper).",
  );
}
// Topic-comment with scope extraction (never a clause as subject).
{
  const { units } = extractAtomicUnits(
    card("Within the metaphysis, there is spongiosa.<div><br></div><div>Primary spongiosa - osteoblasts make {{c1::woven}} bone.</div>"),
  );
  assert.equal(units.length, 1);
  assert.equal(
    rewriteUnit(units[0]).assertion,
    "Primary spongiosa (Within the metaphysis): osteoblasts make woven bone.",
  );
}
// Answer-side "X is Y" strip when X names the question.
assert.equal(
  rewriteUnit(unit("What is the difference between a T-score and a Z-score? T-score is young-control referenced")).assertion,
  "The difference between a T-score and a Z-score is young-control referenced.",
);
// Count parentheticals are not lists.
assert.equal(validateAtomicity("The compartments (2) of the upper arm are anterior and posterior.").atomic, true);

// Split cloze markup rejoins across divs with item separators preserved.
{
  const { units } = extractAtomicUnits(
    card("Which ligaments provide stability to the clavicle?<div><br></div><div>{{c1::<div>Conoid</div><div>Trapezoid</div>}}<br></div>"),
  );
  assert.equal(units.length, 2);
  assert.equal(
    rewriteUnit(units[0]).assertion,
    "Conoid, ligament, provides stability to the clavicle.",
  );
}
// Has/have inversion.
assert.equal(
  rewriteUnit(unit("Which joint has the highest incidence of osteoarthritis? Knee")).assertion,
  "Knee has the highest incidence of osteoarthritis.",
);
// How-far substitution.
assert.equal(
  rewriteUnit(unit("How far is the top of the greater tuberosity from the pectoralis major tendon? 5-6 cm")).assertion,
  "The top of the greater tuberosity is 5-6 cm from the pectoralis major tendon.",
);
// When inversion.
assert.equal(
  rewriteUnit(unit("When is the Gustilo classification determined? Intraoperatively")).assertion,
  "The Gustilo classification is determined Intraoperatively.",
);
// Where-be inversion.
assert.equal(
  rewriteUnit(unit("Where on the humeral head are Hill Sachs lesions found? Posterosuperior")).assertion,
  "Hill Sachs lesions are found Posterosuperior on the humeral head.",
);
// Or-in comparison.
assert.equal(
  rewriteUnit(unit("Is the MCL tighter in pronation or supination? Pronation")).assertion,
  "The MCL is tighter in pronation than in supination.",
);
// Yes/no inversion.
assert.equal(
  rewriteUnit(unit("Is a radial nerve palsy a contraindication to functional bracing? No")).assertion,
  "A radial nerve palsy is not a contraindication to functional bracing.",
);
// Passive pair inversion for dash-pair answers.
assert.equal(
  rewriteUnit(unit("Which nerve controls the following actions? Thigh adduction - obturator")).assertion,
  "Thigh adduction is controlled by the obturator nerve.",
);
// Answerless interrogatives are unusable, not claims.
{
  const out = extractCardClaims(card("What do the following {{c1::letters}} stand for?"));
  assert.equal(out.extractionStatus, "insufficient_context");
  assert.ok(out.reasonCodes.includes("answers_not_clozed"));
}
// P1 with a prepositional complement keeps the questioned NP in the subject.
assert.equal(
  rewriteUnit(unit("What types of patients are at a higher risk for SCFE? Obese adolescent boys")).assertion,
  "The types of patients at a higher risk for SCFE are Obese adolescent boys.",
);
// P6b restores the passive "be" after modal auxiliaries.
assert.equal(
  rewriteUnit(unit("How should the forearm be positioned to minimize risk? Pronated")).assertion,
  "The forearm should be positioned to minimize risk: Pronated.",
);
// P15 object reading: definite subjects stay put.
assert.equal(
  rewriteUnit(unit("What does the Q-angle represent? Directional pull of the quadriceps")).assertion,
  "The Q-angle represents Directional pull of the quadriceps.",
);
// P1 participle complement keeps the questioned NP.
assert.equal(
  rewriteUnit(unit("What muscles are innervated by the AIN? Pronator quadratus")).assertion,
  "The muscles innervated by the AIN are Pronator quadratus.",
);
// P2 modal inversion agrees in number.
assert.equal(
  rewriteUnit(unit("Which maneuvers should be performed to assess compartments? Passive motion")).assertion,
  "The maneuvers that should be performed to assess compartments are Passive motion.",
);
// Possessive subjects stay singular.
assert.equal(
  rewriteUnit(unit("What is Hilgrenreiner's line? Horizontal line through cartilage")).assertion,
  "The Hilgrenreiner's line is Horizontal line through cartilage.",
);
// Fragment inversion agrees; prepositional tails never drive number.
assert.equal(
  rewriteUnit(unit("Three differences between Becker's and Duchenne's dystrophy? Absence of dystrophin")).assertion,
  "The Three differences between Becker's and Duchenne's dystrophy are Absence of dystrophin.",
);
assert.equal(
  rewriteUnit(unit("Line between ligaments? Joint line")).assertion,
  "The Line between ligaments is Joint line.",
);
// "ct" inside "fracture" is not a CT scan.
{
  const out = extractCardClaims(card("A fracture will reveal deformity of the {{c1::femur}}."));
  assert.equal(out.extractionStatus, "claims_extracted");
  assert.ok(!out.candidates[0].qualityFlags.includes("image_deictic"));
}
// Generic visibility is flagged, not suppressed.
{
  const out = extractCardClaims(card("Lateral spine x-ray will show {{c1::scottie dog}} sign."));
  assert.equal(out.extractionStatus, "claims_extracted");
  assert.ok(out.candidates[0].qualityFlags.includes("image_deictic"));
  assert.ok(!out.candidates[0].qualityFlags.includes("explicit_deictic"));
}
// Explicit deixis still suppresses.
{
  const out = extractCardClaims(card("What angle is drawn on the radiograph below?<br>{{c1::Sacral slope}}"));
  assert.equal(out.extractionStatus, "image_dependent");
  assert.ok(out.reasonCodes.includes("image_deictic_claims_only"));
}
// Evidential "shown to" is not deixis.
{
  const out = extractCardClaims(card("Displacement seen on CT has been shown to correlate with {{c1::pain}}."));
  assert.equal(out.extractionStatus, "claims_extracted");
}
// Intra-word hyphens never trigger topic-comment split.
assert.equal(
  rewriteUnit(unit("The x-ray shows a fracture.")).assertion,
  "The x-ray shows a fracture.",
);
// Multi-section cards switch the active header at section breaks.
{
  const { units } = extractAtomicUnits(
    card("<u>Plantar interossei</u><div>Nerve: {{c1::Lateral plantar}}</div><div><u>Dorsal interossei</u></div><div>Nerve: {{c2::Lateral plantar}}</div>"),
  );
  assert.equal(units.length, 2);
  assert.equal(units[0].contextHeader, "Plantar interossei");
  assert.equal(units[1].contextHeader, "Dorsal interossei");
}
// Sibling item labels never hijack the header.
{
  const { units } = extractAtomicUnits(
    card("Rockwood grades:<div>Grade I: {{c1::sprain}}</div><div>Grade II: {{c2::tear}}</div>"),
  );
  assert.equal(units.length, 2);
  assert.equal(units[1].contextHeader, "Rockwood grades:");
}
// Ordinal series never split on the final "and".
{
  const { units } = extractAtomicUnits(
    card("Origin: {{c1::Medial 3rd, 4th, and 5th MTs}}"),
  );
  assert.equal(units.length, 1);
}
// Bare coordinations are flagged, relative clauses are not.
{
  const flagged = validateAtomicity("The position is extension, adduction, and internal rotation.");
  assert.ok(!flagged.atomic);
  assert.ok(flagged.flags.includes("list_like"));
  const clean = validateAtomicity("Sclerostin, which is created by SOST, decreases bone mass.");
  assert.ok(!clean.flags.includes("list_like"));
}
// "Answer: description, description" blocks never item-split.
{
  const { units } = extractAtomicUnits(
    card("Which compartment is assessed here?<div>{{c1::Interosseous}}: second, third, and fourth webspaces</div>"),
  );
  assert.equal(units.length, 1);
  assert.equal(units[0].answer, "Interosseous");
}
console.log("atomic-claim-extractor.test.ts: all assertions passed");
