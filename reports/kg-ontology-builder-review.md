# KG Ontology Builder Review

- Generated: 2026-06-29T14:46:41.030Z
- Model: gpt-4.1-mini
- Nodes analyzed: 100
- Allowlist size: 9
- Expected migration gain if allowlist is applied: 37 cards, 216 questions

## Decision Counts

- create_entity: 69
- map_to_existing: 1
- create_alias: 0
- split_node: 6
- hold_generic: 8
- hold_unclear: 16

## Allowlist

- Metastatic Disease Extremity (condition, confidence 0.95, threshold 0.60)
- Osteomyelitis - Pediatric (condition, confidence 0.95, threshold 0.60)
- Medial Ulnar Collateral Ligament Injury (condition, confidence 0.95, threshold 0.60)
- Liposarcoma (condition, confidence 0.95, threshold 0.60)
- Charcot - Marie - Tooth Disease (condition, confidence 0.95, threshold 0.60)
- Subtalar Dislocations (condition, confidence 0.95, threshold 0.60)
- Complex Regional Pain Syndrome (CRPS) (condition, confidence 1.00, threshold 0.60)
- Capitellum Fractures (condition, confidence 0.95, threshold 0.60)
- Elbow Dislocation (condition, confidence 1.00, threshold 0.60)

## Top Disagreements

- Proximal Humerus Fractures: LLM proposed create_entity while old heuristic bucket was likely alias/merge candidates.
- Distal Biceps Avulsion: LLM proposed create_entity while old heuristic bucket was likely entity-create candidates needing review.
- Slipped Capital Femoral Epiphysis (SCFE): LLM proposed create_entity while old heuristic bucket was likely entity-create candidates needing review.
- THA Revision: LLM proposed create_entity while old heuristic bucket was likely entity-create candidates needing review.
- Pediatric Abuse: LLM held the node as generic despite the old deterministic classifier not flagging generic-risk.
- Bone Grafting: LLM proposed create_entity while old heuristic bucket was likely entity-create candidates needing review.
- TKA Revision: LLM proposed create_entity while old heuristic bucket was likely entity-create candidates needing review.
- Radius and Ulnar Shaft Fractures: LLM held the node as generic despite the old deterministic classifier not flagging generic-risk.
- Neurofibromatosis: LLM held the node as generic despite the old deterministic classifier not flagging generic-risk.
- Spinal Cord Injuries: LLM held the node as generic despite the old deterministic classifier not flagging generic-risk.
- Adhesive Capsulitis (Frozen Shoulder): LLM proposed create_entity while old heuristic bucket was likely entity-create candidates needing review.
- Articular Cartilage: LLM proposed create_entity while old heuristic bucket was likely entity-create candidates needing review.
- Articular Cartilage Defects Knee: LLM proposed create_entity while old heuristic bucket was likely entity-create candidates needing review.
- Discoid Meniscus: LLM proposed create_entity while old heuristic bucket was likely entity-create candidates needing review.
- Achondroplasia: LLM proposed create_entity while old heuristic bucket was generic/non-entity nodes.

## Candidate Details

### Legal Considerations in Orthopaedic Practice

- Curriculum path: Basic Science > Legal Considerations in Orthopaedic Practice
- Decision: hold_unclear
- Preferred label: Legal Considerations in Orthopaedic Practice
- Entity type: condition
- Confidence: 0.20
- Validator passed: false
- Safe for auto apply: false
- Proposal preview: hold-only
- Rationale: Model proposed unrecognized entity_type "hold_generic"; held for human review. Original rationale: The node title is broad and educational, covering a wide range of legal topics relevant to orthopaedic practice rather than a single specific clinical entity. It lacks specificity and could encompass multiple subtopics, making it unsuitable for direct entity creation without further granularity.
- Validator reasons: Generic nodes must stay hold_generic.

### Proximal Humerus Fractures

- Curriculum path: Trauma > Proximal Humerus Fractures
- Decision: create_entity
- Preferred label: Proximal Humerus Fractures
- Entity type: condition
- Confidence: 0.95
- Validator passed: true
- Safe for auto apply: false
- Proposal preview: create_canonical_entity → link_curriculum_node_to_entity → retarget_card_to_entity → retarget_question_to_entity
- Rationale: The node represents a specific clinical condition clearly defined by anatomical location and pathology (fractures of the proximal humerus). It is distinct from the closest existing entity (Distal Humerus Fractures) with only 0.50 similarity, indicating a separate entity. The label specificity is high and there is no indication of ambiguity or need for splitting.

### Amputations

- Curriculum path: Trauma > Amputations
- Decision: hold_unclear
- Preferred label: Amputations
- Entity type: condition
- Confidence: 0.20
- Validator passed: true
- Safe for auto apply: false
- Proposal preview: hold-only
- Rationale: Model proposed unrecognized entity_type "hold_generic"; held for human review. Original rationale: The node 'Amputations' is a broad, generic topic encompassing multiple types and aspects of amputations rather than a single specific clinical entity. It is educational and not specific enough for safe automatic entity creation. It risks being split into multiple more specific entities such as types of amputations, complications, or procedures.

### Osteopenia & Osteoporosis

- Curriculum path: Basic Science > Osteopenia & Osteoporosis
- Decision: split_node
- Preferred label: Osteopenia
- Entity type: condition
- Confidence: 0.95
- Validator passed: true
- Safe for auto apply: false
- Proposal preview: flag_possible_split
- Rationale: The node combines two related but distinct clinical conditions, osteopenia and osteoporosis, which have different diagnostic criteria, clinical implications, and management strategies. The presence of an active split-risk proposal and low label specificity supports splitting into separate entities for clarity and precision in the knowledge graph.

### Material Properties

- Curriculum path: Basic Science > Material Properties
- Decision: hold_unclear
- Preferred label: Material Properties
- Entity type: condition
- Confidence: 0.20
- Validator passed: true
- Safe for auto apply: false
- Proposal preview: hold-only
- Rationale: Model proposed unrecognized entity_type "hold_generic"; held for human review. Original rationale: The node 'Material Properties' is a broad, foundational concept in basic science related to orthopedics rather than a single specific clinical entity. It encompasses multiple subtopics and principles rather than a discrete condition, procedure, or anatomy structure. Therefore, it is best held as a generic concept until further specificity or subdivision is warranted.

### Evaluation, Resuscitation & DCO

- Curriculum path: Trauma > Evaluation, Resuscitation & DCO
- Decision: hold_unclear
- Preferred label: Evaluation, Resuscitation & DCO
- Entity type: condition
- Confidence: 0.20
- Validator passed: false
- Safe for auto apply: false
- Proposal preview: hold-only
- Rationale: Model proposed unrecognized entity_type "hold_generic"; held for human review. Original rationale: The node covers a broad and composite topic including evaluation, resuscitation, and damage control orthopedics (DCO), which are distinct but related concepts. The label is non-specific and flagged as split-risk, indicating it should be split into more granular entities before creating a specific entity. It is currently too generic and educational in nature to be a single clinical entity.
- Validator reasons: Split-risk nodes must stay split_node.; Generic nodes must stay hold_generic.

### Statistic Definitions

- Curriculum path: Basic Science > Statistic Definitions
- Decision: hold_unclear
- Preferred label: Statistic Definitions
- Entity type: condition
- Confidence: 0.20
- Validator passed: false
- Safe for auto apply: false
- Proposal preview: hold-only
- Rationale: Model proposed unrecognized entity_type "hold_generic"; held for human review. Original rationale: The node 'Statistic Definitions' is a broad educational topic covering multiple statistical concepts rather than a single specific clinical entity. It is generic and not specific enough for automatic entity creation. It serves as a foundational knowledge area rather than a discrete condition, procedure, or other ontology entity type.
- Validator reasons: Generic nodes must stay hold_generic.

### Total Shoulder Arthroplasty

- Curriculum path: Shoulder & Elbow > Total Shoulder Arthroplasty
- Decision: create_entity
- Preferred label: Total Shoulder Arthroplasty
- Entity type: procedure
- Confidence: 0.95
- Validator passed: true
- Safe for auto apply: false
- Proposal preview: create_canonical_entity → link_curriculum_node_to_entity → retarget_card_to_entity → retarget_question_to_entity
- Rationale: The node represents a specific, well-defined surgical procedure with high label specificity and no strong existing canonical match. It is a distinct clinical entity within the Shoulder & Elbow specialty and is supported by multiple curriculum references and representative questions.

### Metastatic Disease Extremity

- Curriculum path: Pathology > Metastatic Disease Extremity
- Decision: create_entity
- Preferred label: Metastatic Disease Extremity
- Entity type: condition
- Confidence: 0.95
- Validator passed: true
- Safe for auto apply: true
- Proposal preview: create_canonical_entity → link_curriculum_node_to_entity → retarget_card_to_entity → retarget_question_to_entity
- Rationale: The node represents a specific clinical condition involving metastatic disease localized to the extremities. It has a high label specificity, no strong existing canonical near-match, and is clearly distinct from other pathology topics. It is appropriate to create a new entity for this condition to support precise ontology representation.

### Reverse Shoulder Arthroplasty

- Curriculum path: Shoulder & Elbow > Reverse Shoulder Arthroplasty
- Decision: create_entity
- Preferred label: Reverse Shoulder Arthroplasty
- Entity type: procedure
- Confidence: 0.95
- Validator passed: true
- Safe for auto apply: false
- Proposal preview: create_canonical_entity → link_curriculum_node_to_entity → retarget_card_to_entity → retarget_question_to_entity
- Rationale: The node represents a specific surgical procedure with a clear and specific clinical label, no strong existing canonical near-match, and is well supported by multiple curriculum references and representative questions. It is distinct from other shoulder conditions and topics, and the risk of splitting or generic ambiguity is low.

### THA Periprosthetic Fracture

- Curriculum path: Recon > THA Periprosthetic Fracture
- Decision: create_entity
- Preferred label: THA Periprosthetic Fracture
- Entity type: condition
- Confidence: 0.95
- Validator passed: true
- Safe for auto apply: false
- Proposal preview: create_canonical_entity → link_curriculum_node_to_entity → retarget_card_to_entity → retarget_question_to_entity
- Rationale: The node represents a specific clinical condition related to fractures occurring around a total hip arthroplasty (THA). It has a high label specificity, no strong existing canonical near-match, and is clearly a distinct clinical entity within the Recon specialty. The evidence supports creating a new entity for precise curriculum mapping and knowledge graph representation.

### Ankle Sprain

- Curriculum path: Foot & Ankle > Ankle Sprain
- Decision: create_entity
- Preferred label: Ankle Sprain
- Entity type: condition
- Confidence: 0.95
- Validator passed: true
- Safe for auto apply: false
- Proposal preview: create_canonical_entity → link_curriculum_node_to_entity → retarget_card_to_entity → retarget_question_to_entity
- Rationale: The node 'Ankle Sprain' is a specific clinical condition with a high label specificity and no strong existing canonical near-match. It is a well-defined orthopedic condition distinct from related entities such as 'Ankle Fractures'. The evidence supports creating a new entity for this condition.

### Osteomyelitis - Pediatric

- Curriculum path: Pediatrics > Osteomyelitis - Pediatric
- Decision: create_entity
- Preferred label: Osteomyelitis - Pediatric
- Entity type: condition
- Confidence: 0.95
- Validator passed: true
- Safe for auto apply: true
- Proposal preview: create_canonical_entity → link_curriculum_node_to_entity → retarget_card_to_entity → retarget_question_to_entity
- Rationale: The node represents a specific clinical condition (osteomyelitis) in a defined patient population (pediatric), with high label specificity and no strong existing canonical match. It is a well-recognized clinical entity relevant to the specialty of Pediatrics and Orthopedics.

### Medial Ulnar Collateral Ligament Injury

- Curriculum path: Shoulder & Elbow > Medial Ulnar Collateral Ligament Injury
- Decision: create_entity
- Preferred label: Medial Ulnar Collateral Ligament Injury
- Entity type: condition
- Confidence: 0.95
- Validator passed: true
- Safe for auto apply: true
- Proposal preview: create_canonical_entity → link_curriculum_node_to_entity → retarget_card_to_entity → retarget_question_to_entity
- Rationale: The node represents a specific clinical condition with high label specificity, no strong existing canonical near-match, and clear clinical relevance supported by multiple representative questions and curriculum paths. It is a well-defined orthopedic injury entity within the Shoulder & Elbow specialty.

### Developmental Dysplasia the Hip (DDH)

- Curriculum path: Pediatrics > Developmental Dysplasia the Hip (DDH)
- Decision: create_entity
- Preferred label: Developmental Dysplasia of the Hip
- Entity type: condition
- Confidence: 0.95
- Validator passed: false
- Safe for auto apply: false
- Proposal preview: create_canonical_entity → link_curriculum_node_to_entity → retarget_card_to_entity → retarget_question_to_entity
- Rationale: The node represents a well-defined pediatric orthopedic condition with high label specificity, no strong existing canonical match, and clear clinical relevance. It is a distinct clinical entity commonly recognized in medical education and practice.
- Validator reasons: create_entity is not supported when the preferred label differs from the node label.

### Distal Biceps Avulsion

- Curriculum path: Shoulder & Elbow > Distal Biceps Avulsion
- Decision: create_entity
- Preferred label: Distal Biceps Avulsion
- Entity type: condition
- Confidence: 0.95
- Validator passed: true
- Safe for auto apply: false
- Proposal preview: create_canonical_entity → link_curriculum_node_to_entity → retarget_card_to_entity → retarget_question_to_entity
- Rationale: The node represents a specific clinical condition involving avulsion of the distal biceps tendon, supported by multiple curriculum references and representative cards detailing complications and surgical considerations. It is distinct from other distal fracture entities and has sufficient specificity to warrant creation as a canonical entity.

### Slipped Capital Femoral Epiphysis (SCFE)

- Curriculum path: Pediatrics > Slipped Capital Femoral Epiphysis (SCFE)
- Decision: create_entity
- Preferred label: Slipped Capital Femoral Epiphysis (SCFE)
- Entity type: condition
- Confidence: 0.95
- Validator passed: true
- Safe for auto apply: false
- Proposal preview: create_canonical_entity → link_curriculum_node_to_entity → retarget_card_to_entity → retarget_question_to_entity
- Rationale: Slipped Capital Femoral Epiphysis (SCFE) is a well-defined pediatric orthopedic condition with specific clinical, diagnostic, and treatment characteristics. The evidence packet shows it is a canonical entity distinct from other femoral fractures and is supported by multiple curriculum questions and a source alias from Orthobullets. There is no indication of ambiguity or need for splitting, and it is specific enough to warrant its own entity.

### Orthopaedic Implants

- Curriculum path: Basic Science > Orthopaedic Implants
- Decision: hold_unclear
- Preferred label: Orthopaedic Implants
- Entity type: condition
- Confidence: 0.20
- Validator passed: false
- Safe for auto apply: false
- Proposal preview: hold-only
- Rationale: Model proposed unrecognized entity_type "hold_generic"; held for human review. Original rationale: The node title 'Orthopaedic Implants' is a broad, generic category rather than a single specific clinical entity. It encompasses multiple types of implants and concepts, making it unsuitable for direct entity creation without further specification or splitting. The label specificity is low and the node is educational in nature, indicating a need to hold for further refinement or splitting into more specific entities.
- Validator reasons: Generic nodes must stay hold_generic.

### THA Revision

- Curriculum path: Recon > THA Revision
- Decision: create_entity
- Preferred label: Total Hip Arthroplasty Revision
- Entity type: procedure
- Confidence: 0.95
- Validator passed: false
- Safe for auto apply: false
- Proposal preview: create_canonical_entity → link_curriculum_node_to_entity → retarget_card_to_entity → retarget_question_to_entity
- Rationale: The node 'THA Revision' clearly refers to the specific surgical procedure of revising a total hip arthroplasty. It is a distinct clinical entity within the Recon specialty with multiple related questions and a canonical name. There is no indication that it should be split or merged, and it is not generic or ambiguous.
- Validator reasons: create_entity is not supported when the preferred label differs from the node label.

### TKA Prosthesis Design

- Curriculum path: Recon > TKA Prosthesis Design
- Decision: hold_unclear
- Preferred label: TKA Prosthesis Design
- Entity type: condition
- Confidence: 0.20
- Validator passed: true
- Safe for auto apply: false
- Proposal preview: hold-only
- Rationale: Model proposed unrecognized entity_type "hold_generic"; held for human review. Original rationale: The node 'TKA Prosthesis Design' refers broadly to the design aspects of total knee arthroplasty prostheses, which is a broad educational topic rather than a single specific clinical entity. It lacks specificity to be a single entity and may encompass multiple subtopics such as implant types, biomechanics, and design principles. Therefore, it is best held as a generic node pending further refinement or splitting.

### Lumbar Spinal Stenosis

- Curriculum path: Spine > Lumbar Spinal Stenosis
- Decision: create_entity
- Preferred label: Lumbar Spinal Stenosis
- Entity type: condition
- Confidence: 0.95
- Validator passed: true
- Safe for auto apply: false
- Proposal preview: create_canonical_entity → link_curriculum_node_to_entity → retarget_card_to_entity → retarget_question_to_entity
- Rationale: The node represents a specific clinical condition with a high specificity label, no strong existing canonical match, and is clearly distinct from related conditions such as Lumbar Disc Herniation. It is a well-defined orthopedic condition relevant to the spine specialty.

### Pediatric Abuse

- Curriculum path: Pediatrics > Pediatric Abuse
- Decision: hold_generic
- Preferred label: Pediatric Abuse
- Entity type: condition
- Confidence: 0.90
- Validator passed: true
- Safe for auto apply: false
- Proposal preview: hold-only
- Rationale: The node 'Pediatric Abuse' is a broad and complex topic encompassing various types of abuse and related clinical findings rather than a single specific clinical entity. It is better held as a generic node until further specification or splitting into more precise entities is possible.

### Open Fractures Management

- Curriculum path: Trauma > Open Fractures Management
- Decision: hold_unclear
- Preferred label: Open Fractures Management
- Entity type: condition
- Confidence: 0.20
- Validator passed: false
- Safe for auto apply: false
- Proposal preview: hold-only
- Rationale: Model proposed unrecognized entity_type "hold_generic"; held for human review. Original rationale: The node title 'Open Fractures Management' is broad and educational, covering a range of treatments and principles rather than a single specific clinical entity. It lacks specificity and is better treated as a generic topic rather than a discrete entity. The risk of splitting or aliasing is low, but the label specificity is insufficient for automatic entity creation.
- Validator reasons: Generic nodes must stay hold_generic.

### Hallux Rigidus (MTP joint arthritis)

- Curriculum path: Foot & Ankle > Hallux Rigidus (MTP joint arthritis)
- Decision: create_entity
- Preferred label: Hallux Rigidus (MTP joint arthritis)
- Entity type: condition
- Confidence: 0.95
- Validator passed: true
- Safe for auto apply: false
- Proposal preview: create_canonical_entity → link_curriculum_node_to_entity → retarget_card_to_entity → retarget_question_to_entity
- Rationale: The node represents a specific clinical condition characterized by arthritis of the metatarsophalangeal joint of the hallux. It has a high label specificity, no strong existing canonical near-match, and is clearly distinct from related conditions such as Hallux Valgus or Rheumatoid Arthritis. The evidence supports creating a new entity for this well-defined orthopedic condition.

### Lisfranc Injury

- Curriculum path: Foot & Ankle > Lisfranc Injury
- Decision: create_entity
- Preferred label: Lisfranc Injury
- Entity type: condition
- Confidence: 0.95
- Validator passed: true
- Safe for auto apply: false
- Proposal preview: create_canonical_entity → link_curriculum_node_to_entity → retarget_card_to_entity → retarget_question_to_entity
- Rationale: Lisfranc Injury is a specific clinical condition related to foot and ankle trauma with high label specificity, no strong existing canonical near-match, and clear entity type as a condition. It is distinct from other foot and ankle injuries and is well-recognized in orthopedic education and practice.

