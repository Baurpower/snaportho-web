import type { KnowledgeEvidencePacket, EvidencePacketManifest } from "./evidence-packet.ts";

export function buildEvidenceManifest(packet: KnowledgeEvidencePacket): EvidencePacketManifest {
  const collectorsRun = [
    ...new Set(packet.auditTrail.filter((e) => e.stage === "collect").map((e) => e.collectorId ?? "")),
  ].filter(Boolean);

  return {
    packetId: packet.packetId,
    topicId: packet.topicId,
    createdAt: packet.createdAt,
    packetVersion: packet.packetVersion,
    sourceCount: packet.sourceManifest.length,
    evidenceItemCount: packet.sourceEvidence.length,
    signalCount: packet.extractedSignals.length,
    proposalCount: packet.existingProposals.length,
    gapCount: packet.gaps.length,
    warningCount: packet.warnings.length,
    collectorsRun,
    databaseModified: false,
  };
}

export function buildEvidenceSummaryMarkdown(packet: KnowledgeEvidencePacket): string {
  const bySource = packet.sourceEvidence.reduce<Record<string, number>>((acc, e) => {
    acc[e.sourceType] = (acc[e.sourceType] ?? 0) + 1;
    return acc;
  }, {});

  const lines = [
    `# Evidence Packet Summary`,
    "",
    `Topic: **${packet.topicContext.displayName}** (\`${packet.topicId}\`)`,
    `Packet ID: \`${packet.packetId}\``,
    `Generated: ${packet.createdAt}`,
    `Version: ${packet.packetVersion} | Ontology: ${packet.ontologyVersion}`,
    "",
    "## Snapshot",
    "",
    `| Field | Value |`,
    `|-------|------:|`,
    `| Canonical source | ${packet.canonicalSnapshot.source} |`,
    `| Entities | ${packet.canonicalSnapshot.entityCount} |`,
    `| Relationships | ${packet.canonicalSnapshot.relationshipCount} |`,
    `| Claims (draft) | ${packet.canonicalSnapshot.claimCount} |`,
    `| Decision points | ${packet.canonicalSnapshot.decisionPointCount} |`,
    `| Proposals | ${packet.existingProposals.length} |`,
    `| Gaps | ${packet.gaps.length} |`,
    `| Warnings | ${packet.warnings.length} |`,
    "",
    "## Evidence items by source",
    "",
    `| Source type | Count |`,
    `|-------------|------:|`,
    ...Object.entries(bySource)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `| ${k} | ${v} |`),
    "",
    "## Asset signals",
    "",
    ...(packet.assetSignals.length
      ? packet.assetSignals.map(
          (a) =>
            `- **${a.assetType}**: ${a.mappingCount} mapping(s)${a.mappedEntitySlug ? ` → ${a.mappedEntitySlug}` : ""} (metadataOnly=${a.metadataOnly})`
        )
      : ["- None"]),
    "",
    "## Safety signals",
    "",
    ...(packet.safetySignals.length
      ? packet.safetySignals.map((s) => `- ${s}`)
      : ["- None"]),
    "",
    "## Top warnings",
    "",
    ...(packet.warnings.length
      ? packet.warnings.slice(0, 8).map((w) => `- [${w.severity}] ${w.code}: ${w.message}`)
      : ["- None"]),
    "",
    "## Copyright policy",
    "",
    "- Static Prepare content: **internal_draft_only** — not verified clinical truth",
    "- Orthobullets: **metadata_only** — no stems, answers, or explanations stored",
    "- Anki: **metadata_only** — mapping counts and deck hints only",
    "",
    "## Constraints",
    "",
    "- Database modified: **no**",
    "- Verified medical claims: **no**",
    "",
  ];

  return lines.join("\n");
}

export function countEvidenceBySource(packet: KnowledgeEvidencePacket): Record<string, number> {
  return packet.sourceEvidence.reduce<Record<string, number>>((acc, e) => {
    acc[e.sourceType] = (acc[e.sourceType] ?? 0) + 1;
    return acc;
  }, {});
}