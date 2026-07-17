/**
 * Implants & Instruments canonical knowledge neighborhood.
 *
 * Reusable fixation, construct, and instrumentation backbone for trauma,
 * sports, hand/wrist, adult reconstruction, foot/ankle, pediatrics, spine,
 * CasePrep, BroBot, curriculum, and OITE.
 *
 * Reuses existing fixation/implant identities. Prefers generic construct
 * concepts over vendor systems. Claims and decision points remain drafts.
 */

import type {
  PilotClaimDraft,
  PilotDecisionPointDraft,
  PilotEntitySpec,
  PilotRelationshipSpec,
} from "./kg-ankle-pilot-spec.ts";
import { RECON_SHARED_ANATOMY_ENTITIES } from "./kg-adult-reconstruction-shared-anatomy.ts";

export const IMPLANTS_INSTRUMENTS_PILOT_KEY = "implants-instruments-neighborhood" as const;

export const IMPLANTS_INSTRUMENTS_SOURCE_IDS = {
  curriculumNodeSlug: "implants-instruments",
  prepareTopicId: "implants-instruments",
  casePrepSlug: "implants-instruments",
} as const;

export const IMPLANTS_INSTRUMENTS_ASSET_COUNTS = {
  ankiCardMappings: 0,
  orthobulletsQuestionMappings: 0,
} as const;

const PILOT = IMPLANTS_INSTRUMENTS_PILOT_KEY;
const NEIGHBORHOOD = "implants-instruments";

const entity = (
  slug: string,
  entityType: PilotEntitySpec["entityType"],
  preferredLabel: string,
  description: string,
  metadata: Record<string, unknown> = {}
): PilotEntitySpec => ({
  slug,
  entityType,
  preferredLabel,
  description,
  metadata: {
    pilot: PILOT,
    neighborhood: NEIGHBORHOOD,
    reusable: true,
    vendor_specific: false,
    ...metadata,
  },
});

const principle = (slug: string, label: string, description: string, metadata: Record<string, unknown> = {}) =>
  entity(slug, "treatment_principle", label, description, { clinical_kind: "fixation_principle_hub", ...metadata });

const biomechanics = (slug: string, label: string, description: string, metadata: Record<string, unknown> = {}) =>
  entity(slug, "biomechanics_concept", label, description, { clinical_kind: "fixation_biomechanics", ...metadata });

const fixation = (slug: string, label: string, description: string, metadata: Record<string, unknown> = {}) =>
  entity(slug, "fixation_method", label, description, { clinical_kind: "fixation_construct", ...metadata });

const implant = (slug: string, label: string, description: string, metadata: Record<string, unknown> = {}) =>
  entity(slug, "implant", label, description, { clinical_kind: "implant", ...metadata });

const instrument = (slug: string, label: string, description: string, metadata: Record<string, unknown> = {}) =>
  entity(slug, "implant", label, description, {
    clinical_kind: "instrument",
    instrument: true,
    temporary_use: true,
    ...metadata,
  });

const failure = (slug: string, label: string, description: string, metadata: Record<string, unknown> = {}) =>
  entity(slug, "complication", label, description, {
    clinical_kind: "implant_failure_mode",
    ...metadata,
  });

/** New generic construct / instrument identities for this backbone. */
const IMPLANTS_SPECIFIC_ENTITIES: PilotEntitySpec[] = [
  // Root + modules
  principle(
    "implants-instruments",
    "Implants & Instruments",
    "Reusable fixation, construct, and instrumentation backbone spanning biomechanical principles, implant families, and operative instruments.",
    { clinical_kind: "foundational_backbone", maturity_target: 7 }
  ),
  principle("fixation-principles", "Fixation Principles", "Cross-cutting biomechanical and construct principles guiding implant selection."),
  principle("screw-constructs", "Screw Constructs", "Reusable screw implant and technique family for compression, position, and locking functions."),
  principle("plate-constructs", "Plate Constructs", "Reusable plate implant and construct family for absolute and relative stability strategies."),
  principle("intramedullary-fixation-module", "Intramedullary Fixation Module", "Reusable IM nail construct family including locking strategies and blocking screws."),
  principle("wire-constructs", "Wire Constructs", "Reusable wire and cable fixation family including K-wires and tension-band constructs."),
  principle("external-fixation-module", "External Fixation Module", "Reusable external fixation family for temporary, spanning, and definitive strategies."),
  principle("arthroplasty-components-module", "Arthroplasty Components Module", "Reusable hip and knee arthroplasty component and fixation-mode family."),
  principle("sports-medicine-implants-module", "Sports Medicine Implants Module", "Reusable soft-tissue fixation implant family for reconstruction and repair."),
  principle("spine-implants-module", "Spine Implants Module", "Reusable spinal instrumentation family for screws, rods, cages, and connectors."),
  principle("operative-instrumentation-module", "Operative Instrumentation Module", "Reusable reduction and implant-insertion instrument family independent of vendor systems."),
  principle("construct-selection", "Construct Selection", "Structured matching of fracture morphology, biology, and biomechanics to implant construct."),
  principle("implant-compatibility", "Implant Compatibility", "Rules governing mixing of screw/plate systems, materials, and locking interfaces."),
  principle("salvage-strategies-implants", "Implant Salvage Strategies", "Strategies when primary construct fails, loosens, or cannot be used safely."),
  principle("revision-considerations-implants", "Implant Revision Considerations", "Planning principles for revising failed fixation or arthroplasty constructs."),

  // Fixation principles (biomechanics separate from implant objects)
  biomechanics("compression-fixation-principle", "Compression Fixation", "Construct principle that produces interfragmentary compression for absolute stability."),
  biomechanics("neutralization-principle", "Neutralization Fixation", "Plate or construct principle that protects lag-screw compression from shear and torsion."),
  biomechanics("buttress-fixation-principle", "Buttress Fixation", "Plate principle resisting axial collapse of metaphyseal fragments under load."),
  biomechanics("bridge-fixation-principle", "Bridge Fixation", "Relative-stability plate principle spanning a zone of multifragmentary injury."),
  biomechanics("load-sharing", "Load Sharing", "Construct mechanics in which implant and bone share physiologic load during healing."),
  biomechanics("load-bearing", "Load Bearing", "Construct mechanics in which the implant carries most load until bone can share it."),
  biomechanics("working-length", "Working Length", "Unsupported implant span between points of fixation controlling stiffness and strain."),
  biomechanics("plate-span-ratio", "Plate Span Ratio", "Ratio of plate length to fracture length influencing construct stiffness in bridge plating."),
  biomechanics("strain-theory", "Strain Theory", "Interfragmentary strain framework linking gap motion to tissue differentiation and healing mode."),
  biomechanics("biological-fixation", "Biological Fixation", "Fixation strategy preserving periosteal and soft-tissue biology while achieving stability goals."),
  biomechanics("indirect-reduction-principle", "Indirect Reduction", "Reduction strategy restoring length, alignment, and rotation without open anatomic fragment assembly."),
  biomechanics("lag-technique-principle", "Lag Technique", "Screw technique generating interfragmentary compression via gliding and thread purchase design."),
  biomechanics("tension-band-principle", "Tension Band Principle", "Conversion of tensile forces into compression at an articular or avulsion fracture surface."),

  // Screw constructs
  implant("cortex-screw", "Cortex Screw", "Screw designed for dense cortical bone purchase with cortical thread profile."),
  implant("cancellous-screw", "Cancellous Screw", "Screw with coarser threads designed for metaphyseal cancellous bone purchase."),
  implant("partially-threaded-screw", "Partially Threaded Screw", "Screw with unthreaded shaft enabling lag compression when threads engage far cortex or fragment."),
  implant("fully-threaded-screw", "Fully Threaded Screw", "Screw threaded along the shaft used for position fixation or as a fully threaded lag after overdrilling."),
  implant("cannulated-screw", "Cannulated Screw", "Hollow screw inserted over a guide wire for percutaneous or guided fixation."),
  implant("headless-compression-screw", "Headless Compression Screw", "Headless variable-pitch or dual-thread screw producing compression without prominent head."),
  implant("locking-screw", "Locking Screw", "Screw that locks into a plate hole creating a fixed-angle plate-screw construct."),
  implant("non-locking-screw", "Non-Locking Screw", "Conventional screw relying on bone purchase and plate friction rather than screw-plate lock."),
  implant("positional-screw", "Positional Screw", "Screw used to hold fragment position without generating lag compression."),
  implant("lag-screw", "Lag Screw", "Screw applied to produce interfragmentary compression by lag technique or design."),
  implant("interfragmentary-screw", "Interfragmentary Screw", "Screw spanning fracture fragments to compress or stabilize the fracture plane."),
  implant("syndesmotic-screw", "Syndesmotic Screw", "Trans-syndesmotic screw temporarily or provisionally stabilizing the distal tibiofibular joint."),
  implant("herbert-screw", "Herbert Screw", "Headless differential-pitch screw concept used for osteochondral and scaphoid-type compression."),

  // Plate constructs
  implant("dynamic-compression-plate", "Dynamic Compression Plate", "Plate design enabling axial compression through oval hole geometry."),
  implant("limited-contact-dcp", "Limited-Contact DCP", "DCP variant reducing plate-bone contact to preserve periosteal perfusion."),
  implant("locking-compression-plate", "Locking Compression Plate", "Plate accepting locking and/or non-locking screws for fixed-angle constructs."),
  implant("reconstruction-plate", "Reconstruction Plate", "Malleable plate for complex contours such as pelvis or distal humerus."),
  implant("one-third-tubular-plate", "One-Third Tubular Plate", "Thin tubular plate commonly used for fibula and other low-load applications."),
  implant("t-plate", "T Plate", "T-shaped plate for metaphyseal support and periarticular fixation."),
  implant("buttress-plate", "Buttress Plate", "Plate applied to resist axial fragment collapse in metaphyseal fractures."),
  implant("bridge-plate", "Bridge Plate", "Long plate spanning multifragmentary zones under relative stability principles."),
  implant("neutralization-plate", "Neutralization Plate", "Plate protecting interfragmentary lag screws from shear and rotational forces."),
  implant("hook-plate", "Hook Plate", "Plate with hooks engaging a fragment for small tuberosity or avulsion fixation."),
  implant("periarticular-plate", "Periarticular Plate", "Anatomic contoured plate designed for a specific juxta-articular region."),

  // Intramedullary fixation
  implant("antegrade-nail", "Antegrade Nail", "Intramedullary nail inserted in an antegrade direction for diaphyseal fixation."),
  implant("retrograde-nail", "Retrograde Nail", "Intramedullary nail inserted retrograde, commonly for distal femoral patterns."),
  implant("reconstruction-nail", "Reconstruction Nail", "Nail design with proximal fixation options for complex proximal femur reconstruction patterns."),
  implant("elastic-stable-im-nail", "Elastic Stable Intramedullary Nailing", "Flexible IM nail construct used primarily in pediatric diaphyseal fractures."),
  implant("blocking-screw", "Blocking Screw", "Screw placed to narrow the effective canal and steer nail trajectory (Poller concept)."),
  implant("poller-screw", "Poller Screw", "Synonym concept for blocking screw used to correct alignment during nailing."),
  biomechanics("static-locking", "Static Locking", "IM nail locking mode that prevents axial dynamization at both ends."),
  biomechanics("dynamic-locking", "Dynamic Locking", "IM nail locking mode permitting controlled axial load-sharing/dynamization."),

  // Wire constructs
  implant("k-wire", "Kirschner Wire", "Smooth or threaded wire used for provisional or definitive small-fragment fixation."),
  implant("cerclage-wire", "Cerclage Wire", "Wire looped around bone to provide hoop or fragment retention forces."),
  implant("tension-band-wire", "Tension Band Wire", "Wire construct applying tension-band principle across an avulsion or patellar fracture."),
  implant("fiber-tension-band", "FiberWire Tension Band", "High-strength suture tension-band alternative to traditional wire in selected constructs."),
  implant("cable-fixation", "Cable Fixation", "Cable and crimp construct for cerclage or periprosthetic fragment control."),

  // External fixation
  fixation("monolateral-external-fixation", "Monolateral External Fixation", "Unilateral pin-and-bar external frame for temporary or definitive stabilization."),
  fixation("circular-external-fixation", "Circular External Fixation", "Ring-based external fixation allowing multiplanar control and gradual correction."),
  fixation("hybrid-external-fixation", "Hybrid External Fixation", "Combination of rings and monolateral elements for periarticular or complex patterns."),
  fixation("damage-control-fixation", "Damage Control Fixation", "Temporary external stabilization prioritized when physiology or soft tissues preclude definitive fixation."),
  fixation("temporary-spanning-fixation", "Temporary Spanning Fixation", "External frame spanning a joint or fracture zone for soft-tissue recovery."),

  // Arthroplasty components (generic; reuse existing where possible below)
  fixation("cementless-fixation", "Cementless Fixation", "Arthroplasty fixation relying on press-fit stability and biologic osseointegration."),
  implant("acetabular-shell", "Acetabular Shell", "Metal acetabular cup shell receiving a bearing liner in THA."),
  implant("femoral-head-arthroplasty", "Femoral Head (Arthroplasty)", "Modular or monoblock femoral head articulating with acetabular bearing."),
  biomechanics("arthroplasty-constraint-options", "Arthroplasty Constraint Options", "Spectrum of constraint from unconstrained to hinged constructs balancing stability and force transfer."),

  // Sports medicine implants
  implant("interference-screw", "Interference Screw", "Screw providing aperture fixation of a graft within a bone tunnel."),
  implant("suspensory-fixation", "Suspensory Fixation", "Cortical button or loop construct suspending a graft from the cortical surface."),
  implant("suture-anchor", "Suture Anchor", "Anchor securing soft tissue to bone with sutures."),
  implant("knotless-anchor", "Knotless Anchor", "Anchor system securing soft tissue without a tied knot."),
  implant("button-fixation", "Button Fixation", "Cortical button construct used for suspensory soft-tissue or fracture fixation."),
  implant("meniscus-repair-implant", "Meniscus Repair Implant", "Generic implant family for all-inside or hybrid meniscal repair."),

  // Spine implants
  implant("pedicle-screw", "Pedicle Screw", "Screw placed through the pedicle into the vertebral body for spinal fixation."),
  implant("spinal-rod-construct", "Spinal Rod Construct", "Longitudinal rod linking pedicle screws or hooks for spinal stabilization."),
  implant("interbody-cage", "Interbody Cage", "Spacer implant supporting interbody fusion and disc height restoration."),
  implant("spinal-crosslink", "Spinal Crosslink", "Connector linking bilateral rods to increase torsional construct stability."),
  implant("spinal-hook", "Spinal Hook", "Hook implant engaging lamina or other posterior elements in selected constructs."),
  implant("sublaminar-fixation", "Sublaminar Fixation", "Wire, band, or cable fixation passing beneath the lamina."),

  // Instrumentation
  instrument("reduction-clamp", "Reduction Clamp", "Generic clamp family used to hold reduced fracture fragments."),
  instrument("weber-clamp", "Weber Clamp", "Pointed reduction clamp commonly used for diaphyseal fragment control."),
  instrument("pointed-reduction-clamp", "Pointed Reduction Clamp", "Clamp with pointed tips for percutaneous or open fragment reduction."),
  instrument("jungbluth-clamp", "Jungbluth Clamp", "Specialized clamp for reduction through plate holes or fragment control in selected ORIF workflows."),
  instrument("ball-spike-pusher", "Ball Spike Pusher", "Instrument applying directed force to reduce fragments against a plate or far cortex."),
  instrument("bone-hook", "Bone Hook", "Hook instrument used to pull or control bone fragments during reduction."),
  instrument("reduction-forceps", "Reduction Forceps", "Forceps designed to grasp and hold reduced bone fragments."),
  instrument("k-wire-driver", "K-Wire Driver", "Power or manual driver for inserting Kirschner wires."),
  instrument("drill-guide", "Drill Guide", "Guide instrument controlling drill trajectory for screws or wires."),
  instrument("depth-gauge", "Depth Gauge", "Instrument measuring screw length after drilling."),
  instrument("bone-tap", "Tap", "Instrument cutting threads in bone before selected screw insertion."),
  instrument("countersink", "Countersink", "Instrument recessing bone for screw head seating."),
  instrument("reduction-joystick", "Reduction Joystick", "Schanz pin or similar joystick used to manipulate fragments."),
  instrument("femoral-distractor", "Femoral Distractor", "External distractor providing length and alignment control during femoral fixation."),
  instrument("lamina-spreader", "Lamina Spreader", "Spreader instrument used for interfragmentary or laminar distraction."),
  instrument("external-distractor", "External Distractor", "Temporary external distraction device for reduction assistance."),
  instrument("bone-tamp", "Bone Tamp", "Instrument used to impact bone graft or reduce articular fragments."),
  instrument("osteotome", "Osteotome", "Cutting instrument for controlled osteotomy or fragment mobilization."),
  instrument("curette", "Curette", "Instrument for debriding soft tissue, cartilage, or cancellous bone."),
  instrument("rongeur", "Rongeur", "Biting instrument for removing bone or soft tissue."),
  instrument("gigli-saw", "Gigli Saw", "Flexible wire saw used for controlled osteotomy."),
  instrument("power-instruments", "Power Instruments", "Powered drill, saw, and reamer family used for preparation and implant insertion."),

  // Implant-specific failure / pathway concepts (not condition/procedure replacements)
  failure("screw-backout", "Screw Backout", "Loss of screw purchase with progressive withdrawal from bone or plate."),
  failure("plate-fatigue-failure", "Plate Fatigue Failure", "Fatigue fracture of a plate under cyclic load before solid union."),
  failure("nail-breakage", "Nail Breakage", "Fatigue or overload fracture of an intramedullary nail."),
  failure("cut-out-failure", "Cut-Out Failure", "Implant migration through bone, classically femoral head cut-out of a lag or helical screw."),
  failure("anchor-pullout", "Anchor Pullout", "Suture anchor extraction from bone under load."),
  failure("cage-subsidence", "Cage Subsidence", "Settling of an interbody cage into adjacent endplates."),
  biomechanics("implant-indication-principles", "Implant Indication Principles", "Cross-cutting indication framework matching morphology and host factors to construct family."),
  biomechanics("implant-contraindication-principles", "Implant Contraindication Principles", "Cross-cutting contraindications including soft-tissue, infection, and host factors precluding a construct."),
];

/** Reused identities from Trauma Fundamentals, recon, and fracture neighborhoods. */
const REUSED_IDENTITY_SPECS: PilotEntitySpec[] = [
  entity("absolute-stability", "biomechanics_concept", "Absolute Stability", "Interfragmentary compression strategy minimizing motion at a simple fracture.", {
    reused_from: "trauma-fundamentals-neighborhood",
    clinical_kind: "fixation_biomechanics",
  }),
  entity("relative-stability", "biomechanics_concept", "Relative Stability", "Construct strategy permitting controlled micromotion and callus formation.", {
    reused_from: "trauma-fundamentals-neighborhood",
    clinical_kind: "fixation_biomechanics",
  }),
  entity("interfragmentary-strain", "biomechanics_concept", "Interfragmentary Strain", "Relative deformation across a fracture gap under load.", {
    reused_from: "trauma-fundamentals-neighborhood",
    clinical_kind: "fixation_biomechanics",
  }),
  entity("primary-bone-healing", "biomechanics_concept", "Primary Bone Healing", "Direct bone healing under conditions of anatomic reduction and high stability.", {
    reused_from: "trauma-fundamentals-neighborhood",
    clinical_kind: "fixation_biomechanics",
  }),
  entity("secondary-bone-healing", "biomechanics_concept", "Secondary Bone Healing", "Indirect healing through callus under relative stability.", {
    reused_from: "trauma-fundamentals-neighborhood",
    clinical_kind: "fixation_biomechanics",
  }),
  entity("lag-screw-fixation", "fixation_method", "Lag Screw Fixation", "Interfragmentary compression achieved by screw technique or design.", {
    reused_from: "trauma-fundamentals-neighborhood",
  }),
  entity("plate-fixation", "fixation_method", "Plate Fixation", "Internal fixation using a plate-and-screw construct.", {
    reused_from: "trauma-fundamentals-neighborhood",
  }),
  entity("intramedullary-nail-fixation", "fixation_method", "Intramedullary Nail Fixation", "Load-sharing internal fixation placed within the medullary canal.", {
    reused_from: "trauma-fundamentals-neighborhood",
  }),
  entity("temporary-external-fixation", "fixation_method", "Temporary External Fixation", "Percutaneous pin-and-frame stabilization used as a temporary trauma construct.", {
    reused_from: "trauma-fundamentals-neighborhood",
  }),
  entity("damage-control-orthopaedics", "treatment_principle", "Damage Control Orthopaedics", "Temporary stabilization strategy used when physiology or soft tissues make definitive fixation unsafe.", {
    reused_from: "trauma-fundamentals-neighborhood",
  }),
  entity("fracture-stability", "biomechanics_concept", "Fracture Stability", "Mechanical environment governing displacement and tissue strain at a fracture site.", {
    reused_from: "trauma-fundamentals-neighborhood",
  }),
  entity("cannulated-screw-fixation", "fixation_method", "Cannulated Screw Fixation", "Parallel screw fixation for selected femoral neck fracture patterns.", {
    reused_from: "femoral-neck-fracture-neighborhood",
  }),
  entity("tension-band-fixation", "fixation_method", "Tension Band Fixation", "Cerclage wire tension band technique for patella fracture fixation.", {
    reused_from: "patella-fracture-neighborhood",
  }),
  entity("im-nail-fixation", "fixation_method", "IM Nail", "Intramedullary fixation method for tibial shaft fractures.", {
    reused_from: "tibial-shaft-fracture-neighborhood",
  }),
  entity("cephalomedullary-nail", "implant", "Cephalomedullary Nail", "Intramedullary implant for unstable intertrochanteric and subtrochanteric fracture patterns.", {
    reused_from: "intertrochanteric-fracture-neighborhood",
  }),
  entity("sliding-hip-screw", "implant", "Sliding Hip Screw", "Plate-and-screw construct for stable intertrochanteric fracture patterns.", {
    reused_from: "intertrochanteric-fracture-neighborhood",
  }),
  entity("implant-fixation-principles", "biomechanics_concept", "Implant Fixation Principles", "Cemented versus cementless fixation strategies in primary and revision arthroplasty.", {
    reused_from: "implant-fixation-principles-neighborhood",
  }),
  entity("primary-stability", "biomechanics_concept", "Primary Stability", "Initial implant stability required before biological fixation matures.", {
    reused_from: "implant-fixation-principles-neighborhood",
  }),
  entity("bone-ingrowth", "biomechanics_concept", "Bone Ingrowth", "Cementless porous coating osseointegration over time.", {
    reused_from: "implant-fixation-principles-neighborhood",
  }),
  entity("hardware-failure", "complication", "Hardware Failure", "Mechanical failure of an implant construct including breakage, bending, or disengagement.", {
    reused_from: "complications-neighborhood",
  }),
  entity("loss-of-fixation", "complication", "Loss of Fixation", "Failure of an implant-bone interface to maintain intended stability.", {
    reused_from: "complications-neighborhood",
  }),
  entity("implant-loosening", "complication", "Implant Loosening", "Loss of implant fixation with motion at the bone-implant or cement interface.", {
    reused_from: "complications-neighborhood",
  }),
  entity("implant-breakage", "complication", "Implant Breakage", "Fracture or fatigue failure of an implant component.", {
    reused_from: "complications-neighborhood",
  }),
  entity("revision-surgery", "complication", "Revision Surgery", "Reoperation to revise fixation, reconstruction, or arthroplasty after failure or complication.", {
    reused_from: "complications-neighborhood",
    management_changing: true,
  }),
  entity("fracture-nonunion", "complication", "Fracture Nonunion", "Failure of a fracture to progress to union without further intervention.", {
    reused_from: "trauma-fundamentals-neighborhood",
  }),
  entity("loss-of-reduction", "complication", "Loss of Reduction", "Failure to maintain achieved fracture or joint alignment.", {
    reused_from: "trauma-fundamentals-neighborhood",
  }),
];

const REUSED_RECON_SLUGS = new Set([
  "femoral-stem",
  "acetabular-component",
  "polyethylene-liner",
  "tibial-baseplate",
  "tibial-insert",
  "patellar-component",
  "femoral-component",
  "cemented-fixation",
  "press-fit-fixation",
  "cement-mantle",
  "implant-concepts-hub",
]);

const REUSED_RECON_ENTITIES: PilotEntitySpec[] = RECON_SHARED_ANATOMY_ENTITIES.filter((item) =>
  REUSED_RECON_SLUGS.has(item.slug)
).map((item) => ({
  ...item,
  metadata: {
    ...item.metadata,
    pilot: PILOT,
    neighborhood: NEIGHBORHOOD,
    reusable: true,
    reused_from: "adult-reconstruction-cluster-shared",
    vendor_specific: false,
  },
}));

const bySlug = new Map<string, PilotEntitySpec>();
for (const item of [...IMPLANTS_SPECIFIC_ENTITIES, ...REUSED_IDENTITY_SPECS, ...REUSED_RECON_ENTITIES]) {
  if (!bySlug.has(item.slug)) bySlug.set(item.slug, item);
}
export const IMPLANTS_INSTRUMENTS_ENTITIES = [...bySlug.values()];

const rel = (
  subjectSlug: string,
  predicate: string,
  objectSlug: string,
  metadata: Record<string, unknown> = {}
): PilotRelationshipSpec => ({
  subjectSlug,
  predicate,
  objectSlug,
  metadata: {
    relevance_reason: "implants_instruments",
    context_relevance: ["or", "clinic", "oite", "caseprep", "brobot", "trauma", "sports", "recon", "spine"],
    reusable: true,
    vendor_specific: false,
    ...metadata,
  },
});

export const IMPLANTS_INSTRUMENTS_RELATIONSHIPS: PilotRelationshipSpec[] = [
  // Module graph
  rel("fixation-principles", "prerequisite_for", "implants-instruments"),
  rel("screw-constructs", "prerequisite_for", "implants-instruments"),
  rel("plate-constructs", "prerequisite_for", "implants-instruments"),
  rel("intramedullary-fixation-module", "prerequisite_for", "implants-instruments"),
  rel("wire-constructs", "prerequisite_for", "implants-instruments"),
  rel("external-fixation-module", "prerequisite_for", "implants-instruments"),
  rel("arthroplasty-components-module", "prerequisite_for", "implants-instruments"),
  rel("sports-medicine-implants-module", "prerequisite_for", "implants-instruments"),
  rel("spine-implants-module", "prerequisite_for", "implants-instruments"),
  rel("operative-instrumentation-module", "prerequisite_for", "implants-instruments"),
  rel("construct-selection", "prerequisite_for", "implants-instruments"),
  rel("implant-compatibility", "prerequisite_for", "construct-selection"),
  rel("salvage-strategies-implants", "prerequisite_for", "revision-considerations-implants"),
  rel("revision-considerations-implants", "prerequisite_for", "implants-instruments"),

  // Fixation principles
  rel("absolute-stability", "prerequisite_for", "fixation-principles"),
  rel("relative-stability", "prerequisite_for", "fixation-principles"),
  rel("compression-fixation-principle", "prerequisite_for", "fixation-principles"),
  rel("neutralization-principle", "prerequisite_for", "fixation-principles"),
  rel("buttress-fixation-principle", "prerequisite_for", "fixation-principles"),
  rel("bridge-fixation-principle", "prerequisite_for", "fixation-principles"),
  rel("load-sharing", "prerequisite_for", "fixation-principles"),
  rel("load-bearing", "prerequisite_for", "fixation-principles"),
  rel("working-length", "prerequisite_for", "fixation-principles"),
  rel("plate-span-ratio", "prerequisite_for", "fixation-principles"),
  rel("strain-theory", "prerequisite_for", "fixation-principles"),
  rel("biological-fixation", "prerequisite_for", "fixation-principles"),
  rel("indirect-reduction-principle", "prerequisite_for", "fixation-principles"),
  rel("lag-technique-principle", "prerequisite_for", "fixation-principles"),
  rel("tension-band-principle", "prerequisite_for", "fixation-principles"),
  rel("fracture-stability", "prerequisite_for", "absolute-stability"),
  rel("fracture-stability", "prerequisite_for", "relative-stability"),
  rel("interfragmentary-strain", "prerequisite_for", "strain-theory"),
  rel("absolute-stability", "prerequisite_for", "primary-bone-healing"),
  rel("relative-stability", "prerequisite_for", "secondary-bone-healing"),
  rel("compression-fixation-principle", "prerequisite_for", "absolute-stability"),
  rel("bridge-fixation-principle", "prerequisite_for", "relative-stability"),
  rel("load-sharing", "commonly_confused_with", "load-bearing"),
  rel("load-bearing", "commonly_confused_with", "load-sharing"),
  rel("absolute-stability", "commonly_confused_with", "relative-stability"),
  rel("relative-stability", "commonly_confused_with", "absolute-stability"),
  rel("lag-technique-principle", "prerequisite_for", "lag-screw-fixation"),

  // Screws
  rel("cortex-screw", "prerequisite_for", "screw-constructs"),
  rel("cancellous-screw", "prerequisite_for", "screw-constructs"),
  rel("partially-threaded-screw", "prerequisite_for", "screw-constructs"),
  rel("fully-threaded-screw", "prerequisite_for", "screw-constructs"),
  rel("cannulated-screw", "prerequisite_for", "screw-constructs"),
  rel("headless-compression-screw", "prerequisite_for", "screw-constructs"),
  rel("locking-screw", "prerequisite_for", "screw-constructs"),
  rel("non-locking-screw", "prerequisite_for", "screw-constructs"),
  rel("positional-screw", "prerequisite_for", "screw-constructs"),
  rel("lag-screw", "prerequisite_for", "screw-constructs"),
  rel("interfragmentary-screw", "prerequisite_for", "screw-constructs"),
  rel("syndesmotic-screw", "prerequisite_for", "screw-constructs"),
  rel("herbert-screw", "prerequisite_for", "screw-constructs"),
  rel("lag-screw", "prerequisite_for", "lag-screw-fixation"),
  rel("cannulated-screw", "prerequisite_for", "cannulated-screw-fixation"),
  rel("locking-screw", "commonly_confused_with", "non-locking-screw"),
  rel("non-locking-screw", "commonly_confused_with", "locking-screw"),
  rel("lag-screw", "commonly_confused_with", "positional-screw"),
  rel("positional-screw", "commonly_confused_with", "lag-screw"),
  rel("herbert-screw", "commonly_confused_with", "headless-compression-screw"),
  rel("headless-compression-screw", "commonly_confused_with", "herbert-screw"),
  rel("lag-screw", "has_complication", "screw-backout"),
  rel("locking-screw", "has_complication", "screw-backout"),
  rel("syndesmotic-screw", "has_complication", "screw-backout"),

  // Plates
  rel("dynamic-compression-plate", "prerequisite_for", "plate-constructs"),
  rel("limited-contact-dcp", "prerequisite_for", "plate-constructs"),
  rel("locking-compression-plate", "prerequisite_for", "plate-constructs"),
  rel("reconstruction-plate", "prerequisite_for", "plate-constructs"),
  rel("one-third-tubular-plate", "prerequisite_for", "plate-constructs"),
  rel("t-plate", "prerequisite_for", "plate-constructs"),
  rel("buttress-plate", "prerequisite_for", "plate-constructs"),
  rel("bridge-plate", "prerequisite_for", "plate-constructs"),
  rel("neutralization-plate", "prerequisite_for", "plate-constructs"),
  rel("hook-plate", "prerequisite_for", "plate-constructs"),
  rel("periarticular-plate", "prerequisite_for", "plate-constructs"),
  rel("plate-fixation", "prerequisite_for", "plate-constructs"),
  rel("locking-screw", "prerequisite_for", "locking-compression-plate"),
  rel("non-locking-screw", "prerequisite_for", "dynamic-compression-plate"),
  rel("buttress-plate", "prerequisite_for", "buttress-fixation-principle"),
  rel("bridge-plate", "prerequisite_for", "bridge-fixation-principle"),
  rel("neutralization-plate", "prerequisite_for", "neutralization-principle"),
  rel("bridge-plate", "prerequisite_for", "working-length"),
  rel("bridge-plate", "prerequisite_for", "plate-span-ratio"),
  rel("bridge-plate", "has_complication", "plate-fatigue-failure"),
  rel("locking-compression-plate", "has_complication", "hardware-failure"),
  rel("dynamic-compression-plate", "has_complication", "plate-fatigue-failure"),
  rel("periarticular-plate", "has_complication", "loss-of-fixation"),

  // IM nails
  rel("antegrade-nail", "prerequisite_for", "intramedullary-fixation-module"),
  rel("retrograde-nail", "prerequisite_for", "intramedullary-fixation-module"),
  rel("reconstruction-nail", "prerequisite_for", "intramedullary-fixation-module"),
  rel("cephalomedullary-nail", "prerequisite_for", "intramedullary-fixation-module"),
  rel("elastic-stable-im-nail", "prerequisite_for", "intramedullary-fixation-module"),
  rel("blocking-screw", "prerequisite_for", "intramedullary-fixation-module"),
  rel("poller-screw", "prerequisite_for", "intramedullary-fixation-module"),
  rel("static-locking", "prerequisite_for", "intramedullary-fixation-module"),
  rel("dynamic-locking", "prerequisite_for", "intramedullary-fixation-module"),
  rel("intramedullary-nail-fixation", "prerequisite_for", "intramedullary-fixation-module"),
  rel("im-nail-fixation", "prerequisite_for", "intramedullary-fixation-module"),
  rel("blocking-screw", "commonly_confused_with", "poller-screw"),
  rel("poller-screw", "commonly_confused_with", "blocking-screw"),
  rel("static-locking", "commonly_confused_with", "dynamic-locking"),
  rel("dynamic-locking", "commonly_confused_with", "static-locking"),
  rel("intramedullary-nail-fixation", "prerequisite_for", "load-sharing"),
  rel("antegrade-nail", "has_complication", "nail-breakage"),
  rel("retrograde-nail", "has_complication", "nail-breakage"),
  rel("cephalomedullary-nail", "has_complication", "cut-out-failure"),
  rel("sliding-hip-screw", "has_complication", "cut-out-failure"),
  rel("reconstruction-nail", "has_complication", "implant-breakage"),

  // Wires
  rel("k-wire", "prerequisite_for", "wire-constructs"),
  rel("cerclage-wire", "prerequisite_for", "wire-constructs"),
  rel("tension-band-wire", "prerequisite_for", "wire-constructs"),
  rel("fiber-tension-band", "prerequisite_for", "wire-constructs"),
  rel("cable-fixation", "prerequisite_for", "wire-constructs"),
  rel("tension-band-wire", "prerequisite_for", "tension-band-fixation"),
  rel("tension-band-principle", "prerequisite_for", "tension-band-fixation"),
  rel("fiber-tension-band", "commonly_confused_with", "tension-band-wire"),
  rel("cable-fixation", "commonly_confused_with", "cerclage-wire"),
  rel("k-wire", "has_complication", "loss-of-fixation"),
  rel("tension-band-wire", "has_complication", "hardware-failure"),
  rel("cable-fixation", "has_complication", "hardware-failure"),

  // External fixation
  rel("monolateral-external-fixation", "prerequisite_for", "external-fixation-module"),
  rel("circular-external-fixation", "prerequisite_for", "external-fixation-module"),
  rel("hybrid-external-fixation", "prerequisite_for", "external-fixation-module"),
  rel("damage-control-fixation", "prerequisite_for", "external-fixation-module"),
  rel("temporary-spanning-fixation", "prerequisite_for", "external-fixation-module"),
  rel("temporary-external-fixation", "prerequisite_for", "external-fixation-module"),
  rel("damage-control-orthopaedics", "prerequisite_for", "damage-control-fixation"),
  rel("temporary-external-fixation", "prerequisite_for", "damage-control-fixation"),
  rel("temporary-spanning-fixation", "commonly_confused_with", "temporary-external-fixation"),

  // Arthroplasty
  rel("cemented-fixation", "prerequisite_for", "arthroplasty-components-module"),
  rel("cementless-fixation", "prerequisite_for", "arthroplasty-components-module"),
  rel("press-fit-fixation", "prerequisite_for", "arthroplasty-components-module"),
  rel("femoral-stem", "prerequisite_for", "arthroplasty-components-module"),
  rel("acetabular-component", "prerequisite_for", "arthroplasty-components-module"),
  rel("acetabular-shell", "prerequisite_for", "arthroplasty-components-module"),
  rel("polyethylene-liner", "prerequisite_for", "arthroplasty-components-module"),
  rel("femoral-head-arthroplasty", "prerequisite_for", "arthroplasty-components-module"),
  rel("tibial-baseplate", "prerequisite_for", "arthroplasty-components-module"),
  rel("tibial-insert", "prerequisite_for", "arthroplasty-components-module"),
  rel("patellar-component", "prerequisite_for", "arthroplasty-components-module"),
  rel("femoral-component", "prerequisite_for", "arthroplasty-components-module"),
  rel("arthroplasty-constraint-options", "prerequisite_for", "arthroplasty-components-module"),
  rel("implant-fixation-principles", "prerequisite_for", "arthroplasty-components-module"),
  rel("primary-stability", "prerequisite_for", "press-fit-fixation"),
  rel("bone-ingrowth", "prerequisite_for", "cementless-fixation"),
  rel("press-fit-fixation", "prerequisite_for", "cementless-fixation"),
  rel("cement-mantle", "prerequisite_for", "cemented-fixation"),
  rel("acetabular-shell", "commonly_confused_with", "acetabular-component"),
  rel("femoral-stem", "has_complication", "implant-loosening"),
  rel("acetabular-component", "has_complication", "implant-loosening"),
  rel("tibial-baseplate", "has_complication", "implant-loosening"),
  rel("femoral-component", "has_complication", "implant-loosening"),
  rel("patellar-component", "has_complication", "implant-loosening"),

  // Sports
  rel("interference-screw", "prerequisite_for", "sports-medicine-implants-module"),
  rel("suspensory-fixation", "prerequisite_for", "sports-medicine-implants-module"),
  rel("suture-anchor", "prerequisite_for", "sports-medicine-implants-module"),
  rel("knotless-anchor", "prerequisite_for", "sports-medicine-implants-module"),
  rel("button-fixation", "prerequisite_for", "sports-medicine-implants-module"),
  rel("meniscus-repair-implant", "prerequisite_for", "sports-medicine-implants-module"),
  rel("suture-anchor", "commonly_confused_with", "knotless-anchor"),
  rel("knotless-anchor", "commonly_confused_with", "suture-anchor"),
  rel("interference-screw", "commonly_confused_with", "suspensory-fixation"),
  rel("suspensory-fixation", "commonly_confused_with", "button-fixation"),
  rel("suture-anchor", "has_complication", "anchor-pullout"),
  rel("knotless-anchor", "has_complication", "anchor-pullout"),
  rel("interference-screw", "has_complication", "loss-of-fixation"),

  // Spine
  rel("pedicle-screw", "prerequisite_for", "spine-implants-module"),
  rel("spinal-rod-construct", "prerequisite_for", "spine-implants-module"),
  rel("interbody-cage", "prerequisite_for", "spine-implants-module"),
  rel("spinal-crosslink", "prerequisite_for", "spine-implants-module"),
  rel("spinal-hook", "prerequisite_for", "spine-implants-module"),
  rel("sublaminar-fixation", "prerequisite_for", "spine-implants-module"),
  rel("pedicle-screw", "has_complication", "screw-backout"),
  rel("pedicle-screw", "has_complication", "hardware-failure"),
  rel("interbody-cage", "has_complication", "cage-subsidence"),
  rel("spinal-rod-construct", "has_complication", "implant-breakage"),

  // Instrumentation
  rel("reduction-clamp", "prerequisite_for", "operative-instrumentation-module"),
  rel("weber-clamp", "prerequisite_for", "operative-instrumentation-module"),
  rel("pointed-reduction-clamp", "prerequisite_for", "operative-instrumentation-module"),
  rel("jungbluth-clamp", "prerequisite_for", "operative-instrumentation-module"),
  rel("ball-spike-pusher", "prerequisite_for", "operative-instrumentation-module"),
  rel("bone-hook", "prerequisite_for", "operative-instrumentation-module"),
  rel("reduction-forceps", "prerequisite_for", "operative-instrumentation-module"),
  rel("k-wire-driver", "prerequisite_for", "operative-instrumentation-module"),
  rel("drill-guide", "prerequisite_for", "operative-instrumentation-module"),
  rel("depth-gauge", "prerequisite_for", "operative-instrumentation-module"),
  rel("bone-tap", "prerequisite_for", "operative-instrumentation-module"),
  rel("countersink", "prerequisite_for", "operative-instrumentation-module"),
  rel("reduction-joystick", "prerequisite_for", "operative-instrumentation-module"),
  rel("femoral-distractor", "prerequisite_for", "operative-instrumentation-module"),
  rel("lamina-spreader", "prerequisite_for", "operative-instrumentation-module"),
  rel("external-distractor", "prerequisite_for", "operative-instrumentation-module"),
  rel("bone-tamp", "prerequisite_for", "operative-instrumentation-module"),
  rel("osteotome", "prerequisite_for", "operative-instrumentation-module"),
  rel("curette", "prerequisite_for", "operative-instrumentation-module"),
  rel("rongeur", "prerequisite_for", "operative-instrumentation-module"),
  rel("gigli-saw", "prerequisite_for", "operative-instrumentation-module"),
  rel("power-instruments", "prerequisite_for", "operative-instrumentation-module"),
  rel("indirect-reduction-principle", "prerequisite_for", "femoral-distractor"),
  rel("k-wire-driver", "prerequisite_for", "k-wire"),
  rel("drill-guide", "prerequisite_for", "locking-screw"),
  rel("depth-gauge", "prerequisite_for", "cortex-screw"),
  rel("weber-clamp", "commonly_confused_with", "pointed-reduction-clamp"),
  rel("pointed-reduction-clamp", "commonly_confused_with", "weber-clamp"),

  // Cross-cutting selection / failure pathways
  rel("implant-indication-principles", "prerequisite_for", "construct-selection"),
  rel("implant-contraindication-principles", "prerequisite_for", "construct-selection"),
  rel("absolute-stability", "prerequisite_for", "construct-selection"),
  rel("relative-stability", "prerequisite_for", "construct-selection"),
  rel("hardware-failure", "prerequisite_for", "salvage-strategies-implants"),
  rel("loss-of-fixation", "prerequisite_for", "salvage-strategies-implants"),
  rel("implant-loosening", "prerequisite_for", "revision-considerations-implants"),
  rel("implant-breakage", "prerequisite_for", "revision-considerations-implants"),
  rel("fracture-nonunion", "prerequisite_for", "revision-considerations-implants"),
  rel("revision-surgery", "prerequisite_for", "revision-considerations-implants"),
  rel("screw-backout", "commonly_confused_with", "loss-of-fixation"),
  rel("plate-fatigue-failure", "commonly_confused_with", "implant-breakage"),
  rel("nail-breakage", "commonly_confused_with", "implant-breakage"),
  rel("cut-out-failure", "commonly_confused_with", "loss-of-fixation"),
  rel("implant-concepts-hub", "prerequisite_for", "arthroplasty-components-module"),
];

// pin-site-related-complication may not exist - remove that relationship
// Fix: remove circular external has_complication pin-site if not defined

export function activeImplantsInstrumentsRelationships(): PilotRelationshipSpec[] {
  const entitySlugs = new Set(IMPLANTS_INSTRUMENTS_ENTITIES.map((e) => e.slug));
  return IMPLANTS_INSTRUMENTS_RELATIONSHIPS.filter(
    (relationship) =>
      !relationship.metadata?.disabled &&
      entitySlugs.has(relationship.subjectSlug) &&
      entitySlugs.has(relationship.objectSlug)
  );
}

const claim = (
  draftId: string,
  claimType: PilotClaimDraft["claimType"],
  claimText: string,
  primaryEntitySlug: string,
  importanceLevel: PilotClaimDraft["importanceLevel"],
  contextRelevance: string[]
): PilotClaimDraft => ({
  draftId,
  claimType,
  claimText,
  primaryEntitySlug,
  importanceLevel,
  contentSource: "generated_draft",
  reviewStatus: "needs_review",
  sourceNote: "Implants & Instruments manufacture; implant-selection decisions require human review; management-changing routes require attending review",
  contextRelevance,
});

export const IMPLANTS_INSTRUMENTS_CLAIM_DRAFTS: PilotClaimDraft[] = [
  claim("claim-ii-absolute", "fact", "Absolute stability pairs anatomic reduction and interfragmentary compression with primary bone healing goals.", "absolute-stability", "L1", ["or", "oite", "trauma"]),
  claim("claim-ii-relative", "fact", "Relative stability permits controlled micromotion and typically produces secondary bone healing with callus.", "relative-stability", "L1", ["or", "oite", "trauma"]),
  claim("claim-ii-strain", "fact", "Interfragmentary strain links fracture-gap motion to the tissue that can form during healing.", "strain-theory", "L1", ["or", "oite"]),
  claim("claim-ii-lag", "fact", "Lag technique requires a gliding hole in the near fragment and thread purchase in the far fragment to generate compression.", "lag-technique-principle", "L1", ["or", "oite", "caseprep"]),
  claim("claim-ii-locking", "fact", "Locking screws create a fixed-angle relationship with the plate and do not rely on plate-bone friction for angular stability.", "locking-screw", "L1", ["or", "oite"]),
  claim("claim-ii-bridge", "fact", "Bridge plating spans a multifragmentary zone under relative stability without anatomic lag fixation of every fragment.", "bridge-plate", "L1", ["or", "trauma", "oite"]),
  claim("claim-ii-working-length", "fact", "Working length and plate span influence construct stiffness and interfragmentary motion in bridge plating.", "working-length", "L2", ["or", "oite"]),
  claim("claim-ii-im", "fact", "Intramedullary nails are load-sharing implants whose locking mode can be static or dynamic based on healing goals.", "intramedullary-nail-fixation", "L1", ["or", "trauma", "oite"]),
  claim("claim-ii-poller", "board_trap", "Blocking (Poller) screws are used to narrow the effective canal and correct nail trajectory, not as primary interfragmentary compression screws.", "poller-screw", "L1", ["or", "oite"]),
  claim("claim-ii-tension", "fact", "Tension-band constructs convert tensile forces into compression at the fracture surface opposite the tension device.", "tension-band-principle", "L1", ["or", "oite", "caseprep"]),
  claim("claim-ii-dco", "fact", "Damage-control external fixation prioritizes rapid stability and soft-tissue protection when definitive fixation is unsafe.", "damage-control-fixation", "L1", ["call", "or", "trauma"]),
  claim("claim-ii-cement", "fact", "Cemented fixation provides immediate stability through a cement mantle, while cementless fixation depends on primary press-fit stability and later bone ingrowth.", "implant-fixation-principles", "L1", ["recon", "oite"]),
  claim("claim-ii-sports", "fact", "Soft-tissue reconstruction fixation may use interference screws, suspensory buttons, or suture anchors depending on graft and tunnel strategy.", "sports-medicine-implants-module", "L1", ["sports", "oite"]),
  claim("claim-ii-spine", "fact", "Pedicle screw-rod constructs provide multiplanar spinal fixation; interbody cages support anterior column load-sharing in fusion constructs.", "pedicle-screw", "L1", ["spine", "oite"]),
  claim("claim-ii-compat", "cognitive_trap", "Mixing locking and non-locking interfaces or incompatible vendor systems can compromise angular stability and should not be assumed safe without confirmed compatibility.", "implant-compatibility", "L1", ["or", "oite"]),
  claim("claim-ii-select", "clinical_script", "Select the construct by fracture morphology, soft-tissue status, bone quality, and desired healing mode before choosing a specific implant family.", "construct-selection", "L1", ["or", "caseprep", "brobot"]),
  claim("claim-ii-failure", "fact", "Hardware failure and loss of fixation require evaluation of reduction quality, construct mechanics, biology, infection, and host factors before salvage planning.", "hardware-failure", "L1", ["clinic", "or", "oite"]),
  claim("claim-ii-revision", "fact", "Revision of failed fixation or arthroplasty starts with defining the failure mode, remaining bone stock, and infection status.", "revision-considerations-implants", "L1", ["recon", "trauma", "oite"]),
  claim("claim-ii-cutout", "board_trap", "Femoral head cut-out is a failure of implant position and bone purchase, not simply an inevitable feature of cephalomedullary devices.", "cut-out-failure", "L1", ["trauma", "oite"]),
  claim("claim-ii-instrument", "fact", "Reduction instruments restore length, alignment, and rotation; implant insertion instruments then execute the chosen construct without substituting for a correct biomechanical plan.", "operative-instrumentation-module", "L2", ["or", "caseprep"]),
  claim("claim-ii-generic", "fact", "Generic construct concepts remain independent of vendor product names and should be taught by mechanical function.", "implants-instruments", "L1", ["oite", "brobot", "curriculum"]),
  claim("claim-ii-contra", "fact", "Soft-tissue compromise, active infection, and inadequate host bone can contraindicate definitive internal fixation even when a plate or nail could mechanically span the fracture.", "implant-contraindication-principles", "L1", ["call", "or", "oite"]),
];

const decisionPoint = (
  draftId: string,
  subjectEntitySlug: string,
  patternType: string,
  trigger: string,
  action: string,
  urgency: PilotDecisionPointDraft["urgency"],
  safetyCriticality: PilotDecisionPointDraft["safetyCriticality"]
): PilotDecisionPointDraft => ({
  draftId,
  subjectEntitySlug,
  patternType,
  trigger,
  action,
  urgency,
  safetyCriticality,
  contentSource: "generated_draft",
  reviewStatus: "needs_review",
  sourceNote: "Implants & Instruments manufacture; implant selection requires human review; management-changing recommendations require attending review",
  requiresAttendingReview: true,
});

export const IMPLANTS_INSTRUMENTS_DECISION_POINT_DRAFTS: PilotDecisionPointDraft[] = [
  decisionPoint(
    "dp-ii-absolute-vs-relative",
    "construct-selection",
    "construct_selection",
    "Simple reconstructible pattern versus multifragmentary or biologically vulnerable pattern",
    "Choose absolute-stability compression strategy or relative-stability bridge/IM strategy after human review of morphology and soft tissues",
    "routine",
    "high"
  ),
  decisionPoint(
    "dp-ii-lag-vs-position",
    "lag-screw",
    "implant_selection",
    "Fragment geometry allows interfragmentary compression without articular step-off risk",
    "Prefer lag technique for compression when safe; otherwise use positional fixation and protect with neutralization or fixed-angle support",
    "routine",
    "moderate"
  ),
  decisionPoint(
    "dp-ii-locking",
    "locking-compression-plate",
    "implant_selection",
    "Metaphyseal bone quality is poor or fixed-angle support is required",
    "Select locking or hybrid locking construct with confirmed plate-screw compatibility",
    "routine",
    "high"
  ),
  decisionPoint(
    "dp-ii-bridge",
    "bridge-plate",
    "construct_selection",
    "Multifragmentary diaphyseal or metaphyseal zone where anatomic lag of every fragment would destroy biology",
    "Apply bridge plating with appropriate working length and relative stability goals",
    "routine",
    "high"
  ),
  decisionPoint(
    "dp-ii-im-vs-plate",
    "intramedullary-nail-fixation",
    "construct_selection",
    "Diaphyseal pattern suitable for load-sharing IM fixation versus periarticular pattern better served by plate constructs",
    "Match nail versus plate family to fracture location, soft tissues, and alignment goals after attending-level review when management-changing",
    "routine",
    "high"
  ),
  decisionPoint(
    "dp-ii-static-dynamic",
    "static-locking",
    "locking_mode",
    "Healing mode requires maintained length versus planned dynamization",
    "Choose static or dynamic locking deliberately and document the intended load-sharing plan",
    "routine",
    "moderate"
  ),
  decisionPoint(
    "dp-ii-dco",
    "damage-control-fixation",
    "fixation_timing",
    "Physiology or soft tissues make definitive internal fixation unsafe",
    "Apply temporary external or spanning fixation and defer definitive construct until conditions permit",
    "urgent",
    "emergency"
  ),
  decisionPoint(
    "dp-ii-cement",
    "cemented-fixation",
    "implant_selection",
    "Arthroplasty host bone quality, age, and revision risk favor cemented versus cementless primary stability strategy",
    "Select cemented or cementless fixation mode based on primary stability needs and review thresholds with attending when management-changing",
    "routine",
    "high"
  ),
  decisionPoint(
    "dp-ii-sports-fixation",
    "suspensory-fixation",
    "implant_selection",
    "Soft-tissue graft requires aperture versus suspensory fixation strategy",
    "Choose interference, suspensory, or hybrid fixation matching tunnel and graft constraints under human review",
    "routine",
    "moderate"
  ),
  decisionPoint(
    "dp-ii-spine",
    "pedicle-screw",
    "implant_selection",
    "Spinal stabilization plan requires pedicle screw-rod fixation with or without interbody support",
    "Confirm levels, bone quality, and neural safety corridor before committing to screw-rod or cage construct; specialist review for thresholds",
    "routine",
    "high"
  ),
  decisionPoint(
    "dp-ii-failure",
    "hardware-failure",
    "salvage_pathway",
    "Broken, loosened, or cut-out implant with loss of alignment or function",
    "Define failure mode, rule out infection, protect the limb, and plan revision or salvage construct with attending review",
    "urgent",
    "high"
  ),
  decisionPoint(
    "dp-ii-revision",
    "revision-considerations-implants",
    "revision_planning",
    "Failed fixation or arthroplasty requires reoperation",
    "Inventory remaining bone stock, prior construct, infection status, and salvage options before implant selection",
    "urgent",
    "high"
  ),
  decisionPoint(
    "dp-ii-compatibility",
    "implant-compatibility",
    "implant_compatibility",
    "Operative plan would mix locking interfaces, materials, or systems from different platforms",
    "Confirm mechanical compatibility or convert to a single validated system before implantation",
    "urgent",
    "high"
  ),
  decisionPoint(
    "dp-ii-cutout",
    "cut-out-failure",
    "failure_escalation",
    "Cephalomedullary or sliding hip screw construct shows head cut-out or impending cut-out",
    "Protect weight bearing as indicated, obtain dedicated imaging, and escalate for revision arthroplasty or salvage pathway with attending review",
    "urgent",
    "high"
  ),
  decisionPoint(
    "dp-ii-instrument-reduction",
    "operative-instrumentation-module",
    "reduction_before_implant",
    "Reduction instruments cannot restore length, alignment, and rotation before implant insertion",
    "Do not implant a definitive construct until reduction goals are achieved or a staged external strategy is chosen",
    "urgent",
    "high"
  ),
];
