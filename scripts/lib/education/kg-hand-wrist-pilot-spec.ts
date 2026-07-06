/**
 * Hand & Wrist cluster — pilot spec cache and accessors.
 */

import {
  HAND_WRIST_NEIGHBORHOODS,
  getHandWristNeighborhood,
  listHandWristTopicKeys,
} from "./kg-hand-wrist-cluster-definitions.ts";
import {
  activeHandWristRelationships,
  buildHandWristPilotSpec,
  type HandWristPilotSpec,
} from "./kg-hand-wrist-pilot-spec-factory.ts";

export type { HandWristPilotSpec };

const FACTORY_TOPICS = HAND_WRIST_NEIGHBORHOODS.filter((n) => n.topicKey !== "distal-radius-fracture");

export const HAND_WRIST_PILOT_SPECS: Record<string, HandWristPilotSpec> = Object.fromEntries(
  FACTORY_TOPICS.map((def) => [def.topicKey, buildHandWristPilotSpec(def)])
);

export function getHandWristPilotSpec(topicKey: string): HandWristPilotSpec | undefined {
  return HAND_WRIST_PILOT_SPECS[topicKey];
}

export function activeHandWristRelationshipsForTopic(topicKey: string): ReturnType<typeof activeHandWristRelationships> {
  const spec = getHandWristPilotSpec(topicKey);
  if (!spec) return [];
  return activeHandWristRelationships(spec);
}

export function listHandWristFactoryTopicKeys(): string[] {
  return FACTORY_TOPICS.map((n) => n.topicKey);
}

export function listAllHandWristClusterTopicKeys(): string[] {
  return listHandWristTopicKeys();
}

export function getHandWristNeighborhoodDef(topicKey: string) {
  return getHandWristNeighborhood(topicKey);
}