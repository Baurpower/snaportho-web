import { readFileSync } from "node:fs";
import path from "node:path";

import type { KnowledgeEvidencePacket } from "./evidence-packet.ts";
import { resolveTopic } from "../kg-compiler/topic-registry.ts";

export function loadEvidencePacketFromFile(filePath: string): KnowledgeEvidencePacket {
  const raw = readFileSync(filePath, "utf8");
  const packet = JSON.parse(raw) as KnowledgeEvidencePacket;
  if (!packet.packetId || !packet.topicId) {
    throw new Error(`Invalid evidence packet at ${filePath}: missing packetId or topicId`);
  }
  return packet;
}

export function resolveDefaultEvidencePacketPath(topicKey: string, baseDir = "reports/kg-evidence"): string {
  return path.join(process.cwd(), baseDir, topicKey, "evidence-packet.json");
}

export function tryLoadEvidencePacket(options: {
  topic: string;
  evidencePath?: string;
  useEvidence?: boolean;
  evidenceBaseDir?: string;
}): KnowledgeEvidencePacket | undefined {
  if (options.evidencePath) {
    return loadEvidencePacketFromFile(path.resolve(options.evidencePath));
  }
  if (options.useEvidence) {
    const topic = resolveTopic(options.topic);
    if (!topic) return undefined;
    const defaultPath = resolveDefaultEvidencePacketPath(
      topic.topicKey,
      options.evidenceBaseDir
    );
    return loadEvidencePacketFromFile(defaultPath);
  }
  return undefined;
}