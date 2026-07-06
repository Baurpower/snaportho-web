import { listRegisteredTopics } from "../kg-compiler/topic-registry.ts";
import { listAllHandWristClusterTopicKeys } from "../kg-hand-wrist-pilot-spec.ts";
import type { BatchDefinition } from "./types.ts";

export const BATCH_REGISTRY: BatchDefinition[] = [
  {
    batchKey: "trauma",
    displayName: "Trauma Batch",
    topicKeys: [
      "ankle-fracture",
      "femoral-neck-fracture",
      "intertrochanteric-fracture",
      "subtrochanteric-fracture",
      "distal-radius-fracture",
      "tibial-shaft-fracture",
      "compartment-syndrome",
      "clavicle-fracture",
      "proximal-humerus-fracture",
      "humeral-shaft-fracture",
      "distal-humerus-fracture",
      "supracondylar-humerus-fracture",
      "pelvic-ring-injury",
      "acetabular-fracture",
      "femoral-shaft-fracture",
      "distal-femur-fracture",
      "patella-fracture",
      "tibial-plateau-fracture",
      "pilon-fracture",
      "calcaneus-fracture",
      "talus-fracture",
      "lisfranc-injury",
      ...listAllHandWristClusterTopicKeys().filter((k) => k !== "distal-radius-fracture"),
    ],
  },
  {
    batchKey: "hip-fracture",
    displayName: "Hip Fracture Cluster",
    topicKeys: [
      "femoral-neck-fracture",
      "intertrochanteric-fracture",
      "subtrochanteric-fracture",
    ],
  },
  {
    batchKey: "upper-extremity-trauma",
    displayName: "Upper Extremity Trauma Cluster",
    topicKeys: [
      "clavicle-fracture",
      "proximal-humerus-fracture",
      "humeral-shaft-fracture",
      "distal-humerus-fracture",
      "supracondylar-humerus-fracture",
    ],
  },
  {
    batchKey: "lower-extremity-trauma",
    displayName: "Lower Extremity Trauma Cluster",
    topicKeys: [
      "pelvic-ring-injury",
      "acetabular-fracture",
      "femoral-shaft-fracture",
      "distal-femur-fracture",
      "patella-fracture",
      "tibial-plateau-fracture",
      "pilon-fracture",
      "calcaneus-fracture",
      "talus-fracture",
      "lisfranc-injury",
    ],
  },
  {
    batchKey: "sports-medicine",
    displayName: "Sports Medicine Prepare Cluster",
    topicKeys: [
      "acl-tear",
      "pcl-injury",
      "meniscus-tear",
      "patellar-instability",
      "multiligament-knee-injury",
      "osteochondral-defect-knee",
      "anterior-shoulder-instability",
      "rotator-cuff-tear",
      "ac-joint-separation",
      "slap-tear",
      "proximal-biceps-tendon-pathology",
      "ucl-injury",
      "distal-biceps-tendon-rupture",
      "achilles-tendon-rupture",
      "chronic-lateral-ankle-instability",
      "syndesmotic-sprain",
      "osteochondral-lesion-talus",
    ],
  },
  {
    batchKey: "hand-wrist",
    displayName: "Hand & Wrist Prepare Curriculum Cluster",
    topicKeys: listAllHandWristClusterTopicKeys(),
  },
  {
    batchKey: "adult-reconstruction",
    displayName: "Adult Reconstruction Cluster",
    topicKeys: [
      "hip-osteoarthritis",
      "femoral-neck-fracture-adult-recon",
      "periprosthetic-femur-fracture",
      "hip-prosthetic-joint-infection",
      "aseptic-loosening-tha",
      "hip-instability-after-tha",
      "polyethylene-wear-osteolysis",
      "adverse-local-tissue-reaction",
      "knee-osteoarthritis",
      "periprosthetic-knee-fracture",
      "knee-prosthetic-joint-infection",
      "aseptic-loosening-tka",
      "knee-instability-after-tka",
      "extensor-mechanism-failure",
      "patellofemoral-arthroplasty",
      "unicompartmental-knee-arthritis",
      "periprosthetic-joint-infection",
      "bone-loss-revision-arthroplasty",
      "implant-fixation-principles",
      "bearing-surface-selection",
    ],
  },
];

export function resolveBatch(batchKey: string): BatchDefinition | undefined {
  const key = batchKey.trim().toLowerCase().replace(/_/g, "-");
  return BATCH_REGISTRY.find((b) => b.batchKey === key);
}

export function listAllAuditTopics(): string[] {
  return listRegisteredTopics().map((t) => t.topicKey);
}

export function listBatchKeys(): string[] {
  return BATCH_REGISTRY.map((b) => b.batchKey);
}