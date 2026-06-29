type QueryError = {
  message?: string;
};

type QueryResponse = {
  data: unknown[] | null;
  error: QueryError | null;
};

type QueryBuilder = PromiseLike<QueryResponse> & {
  select(columns: string): QueryBuilder;
  eq(column: string, value: boolean | number | string): QueryBuilder;
  order(column: string, options?: { ascending?: boolean }): QueryBuilder;
};

type DatabaseClient = {
  from(relation: string): QueryBuilder;
};

export type CoverageCurriculumNode = {
  id: string;
  parent_id: string | null;
  specialty_id: string | null;
  slug: string;
  title: string;
  node_type: string;
  is_active: boolean;
};

export type CoverageSpecialty = {
  id: string;
  slug: string;
  name: string;
};

export type CoverageConcept = {
  id: string;
  curriculum_node_id: string;
  slug: string;
  canonical_name: string;
  concept_type: string;
  is_active: boolean;
};

export type CoverageCanonicalEntity = {
  id: string;
  preferred_label: string;
  slug: string | null;
  entity_type: string;
  status: string;
  review_status: string;
  is_active: boolean;
};

export type CoverageCurriculumBridge = {
  id: string;
  curriculum_node_id: string;
  canonical_entity_id: string | null;
  concept_id: string | null;
  relation_type: string;
  confidence: number;
  review_status: string;
  provenance_status: string;
  is_active: boolean;
};

export type CoverageConceptBridge = {
  id: string;
  concept_id: string;
  canonical_entity_id: string;
  bridge_type: string;
  confidence: number;
  review_status: string;
  provenance_status: string;
  created_by: string | null;
  is_active: boolean;
};

export type CoverageCardLink = {
  canonical_card_id: string;
  curriculum_node_id: string | null;
  concept_id: string | null;
  mapping_confidence: number;
  review_status: string;
  is_primary: boolean;
  is_active: boolean;
};

export type CoverageQuestionLink = {
  external_question_id: string;
  curriculum_node_id: string | null;
  concept_id: string | null;
  mapping_confidence: number;
  needs_review: boolean;
  is_primary: boolean;
  is_active: boolean;
};

export type CoverageCard = {
  id: string;
  title: string | null;
  canonical_status: string;
  is_active: boolean;
};

export type CoverageQuestion = {
  id: string;
  external_question_id: string;
  topic_raw: string | null;
  topic_slug: string | null;
  is_active: boolean;
};

export type CanonicalCoverageSnapshot = {
  curriculumNodes: CoverageCurriculumNode[];
  specialties: CoverageSpecialty[];
  concepts: CoverageConcept[];
  canonicalEntities: CoverageCanonicalEntity[];
  curriculumNodeEntityLinks: CoverageCurriculumBridge[];
  conceptCanonicalEntityLinks: CoverageConceptBridge[];
  cardKnowledgeLinks: CoverageCardLink[];
  questionCurriculumMappings: CoverageQuestionLink[];
  canonicalCards: CoverageCard[];
  externalQuestions: CoverageQuestion[];
};

export type InferredCanonicalCoveragePath = {
  path_type: "curriculum_node" | "concept";
  canonical_entity_id: string;
  canonical_entity_label: string;
  canonical_entity_slug: string | null;
  canonical_entity_type: string;
  curriculum_node_id: string | null;
  curriculum_node_title: string | null;
  concept_id: string | null;
  concept_name: string | null;
  relation_type: string;
  bridge_review_status: string;
  bridge_provenance_status: string;
  bridge_confidence: number;
  mapping_confidence: number;
};

export type CardCanonicalCoverageRecord = {
  canonical_card_id: string;
  card_title: string | null;
  mapping_count: number;
  inferred_paths: InferredCanonicalCoveragePath[];
};

export type QuestionCanonicalCoverageRecord = {
  external_question_id: string;
  source_question_key: string | null;
  mapping_count: number;
  inferred_paths: InferredCanonicalCoveragePath[];
};

export type CurriculumBridgeGap = {
  curriculum_node_id: string;
  specialty_name: string | null;
  node_title: string;
  node_slug: string;
  node_path: string;
  card_count: number;
  question_count: number;
};

export type ConceptBridgeOpportunity = {
  concept_id: string;
  concept_name: string;
  concept_slug: string;
  concept_type: string;
  curriculum_node_id: string;
  curriculum_node_title: string | null;
  node_path: string | null;
  card_count: number;
  question_count: number;
};

function isNonNull<T>(value: T | null): value is T {
  return value !== null;
}

function queryErrorMessage(error: QueryError | null) {
  return error?.message ?? "Unknown query error.";
}

async function fetchTable<T>(query: QueryBuilder): Promise<T[]> {
  const { data, error } = await query;
  if (error) {
    throw new Error(queryErrorMessage(error));
  }

  return (data ?? []) as T[];
}

async function fetchOptionalTable<T>(query: QueryBuilder, relationName: string): Promise<T[]> {
  const { data, error } = await query;
  if (error) {
    const message = queryErrorMessage(error);
    if (message.includes(relationName) && message.includes("does not exist")) {
      return [];
    }
    throw new Error(message);
  }

  return (data ?? []) as T[];
}

export async function loadCanonicalCoverageSnapshot(
  client: DatabaseClient
): Promise<CanonicalCoverageSnapshot> {
  const [
    curriculumNodes,
    specialties,
    concepts,
    canonicalEntities,
    curriculumNodeEntityLinks,
    conceptCanonicalEntityLinks,
    cardKnowledgeLinks,
    questionCurriculumMappings,
    canonicalCards,
    externalQuestions,
  ] = await Promise.all([
    fetchTable<CoverageCurriculumNode>(
      client
        .from("curriculum_nodes")
        .select("id,parent_id,specialty_id,slug,title,node_type,is_active")
        .order("title", { ascending: true })
    ),
    fetchTable<CoverageSpecialty>(
      client.from("specialties").select("id,slug,name").order("name", { ascending: true })
    ),
    fetchTable<CoverageConcept>(
      client
        .from("concepts")
        .select("id,curriculum_node_id,slug,canonical_name,concept_type,is_active")
        .order("canonical_name", { ascending: true })
    ),
    fetchTable<CoverageCanonicalEntity>(
      client
        .from("canonical_entities")
        .select("id,preferred_label,slug,entity_type,status,review_status,is_active")
        .order("preferred_label", { ascending: true })
    ),
    fetchTable<CoverageCurriculumBridge>(
      client
        .from("curriculum_node_entities")
        .select(
          "id,curriculum_node_id,canonical_entity_id,concept_id,relation_type,confidence,review_status,provenance_status,is_active"
        )
        .eq("is_active", true)
        .order("confidence", { ascending: false })
    ),
    fetchOptionalTable<CoverageConceptBridge>(
      client
        .from("concept_canonical_entities")
        .select(
          "id,concept_id,canonical_entity_id,bridge_type,confidence,review_status,provenance_status,created_by,is_active"
        )
        .eq("is_active", true)
        .order("confidence", { ascending: false }),
      "concept_canonical_entities"
    ),
    fetchTable<CoverageCardLink>(
      client
        .from("card_knowledge_links")
        .select(
          "canonical_card_id,curriculum_node_id,concept_id,mapping_confidence,review_status,is_primary,is_active"
        )
        .eq("is_active", true)
    ),
    fetchTable<CoverageQuestionLink>(
      client
        .from("external_question_curriculum_mappings")
        .select(
          "external_question_id,curriculum_node_id,concept_id,mapping_confidence,needs_review,is_primary,is_active"
        )
        .eq("is_active", true)
    ),
    fetchTable<CoverageCard>(
      client
        .from("canonical_cards")
        .select("id,title,canonical_status,is_active")
        .eq("is_active", true)
    ),
    fetchTable<CoverageQuestion>(
      client
        .from("external_questions")
        .select("id,external_question_id,topic_raw,topic_slug,is_active")
        .eq("is_active", true)
    ),
  ]);

  return {
    curriculumNodes,
    specialties,
    concepts,
    canonicalEntities,
    curriculumNodeEntityLinks,
    conceptCanonicalEntityLinks,
    cardKnowledgeLinks,
    questionCurriculumMappings,
    canonicalCards,
    externalQuestions,
  };
}

function dedupePaths(paths: InferredCanonicalCoveragePath[]) {
  const seen = new Set<string>();
  const deduped: InferredCanonicalCoveragePath[] = [];

  for (const path of paths) {
    const key = [
      path.path_type,
      path.canonical_entity_id,
      path.curriculum_node_id ?? "",
      path.concept_id ?? "",
      path.relation_type,
    ].join(":");

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(path);
  }

  return deduped.sort((left, right) => right.bridge_confidence - left.bridge_confidence);
}

function buildIndexes(snapshot: CanonicalCoverageSnapshot) {
  const curriculumNodeById = new Map(snapshot.curriculumNodes.map((row) => [row.id, row]));
  const specialtyById = new Map(snapshot.specialties.map((row) => [row.id, row]));
  const conceptById = new Map(snapshot.concepts.map((row) => [row.id, row]));
  const canonicalEntityById = new Map(snapshot.canonicalEntities.map((row) => [row.id, row]));
  const canonicalCardById = new Map(snapshot.canonicalCards.map((row) => [row.id, row]));
  const questionById = new Map(snapshot.externalQuestions.map((row) => [row.id, row]));

  const curriculumBridgeByNodeId = new Map<string, CoverageCurriculumBridge[]>();
  for (const row of snapshot.curriculumNodeEntityLinks) {
    const bucket = curriculumBridgeByNodeId.get(row.curriculum_node_id) ?? [];
    bucket.push(row);
    curriculumBridgeByNodeId.set(row.curriculum_node_id, bucket);
  }

  const conceptBridgeByConceptId = new Map<string, CoverageConceptBridge[]>();
  for (const row of snapshot.conceptCanonicalEntityLinks) {
    const bucket = conceptBridgeByConceptId.get(row.concept_id) ?? [];
    bucket.push(row);
    conceptBridgeByConceptId.set(row.concept_id, bucket);
  }

  return {
    curriculumNodeById,
    specialtyById,
    conceptById,
    canonicalEntityById,
    canonicalCardById,
    questionById,
    curriculumBridgeByNodeId,
    conceptBridgeByConceptId,
  };
}

function inferFromCurriculumNode(
  nodeId: string,
  mappingConfidence: number,
  indexes: ReturnType<typeof buildIndexes>
) {
  const node = indexes.curriculumNodeById.get(nodeId);
  const nodeLinks = indexes.curriculumBridgeByNodeId.get(nodeId) ?? [];

  return nodeLinks
    .filter((row) => row.canonical_entity_id)
    .map((row) => {
      const entity = indexes.canonicalEntityById.get(row.canonical_entity_id ?? "");
      if (!entity) {
        return null;
      }

      return {
        path_type: "curriculum_node" as const,
        canonical_entity_id: entity.id,
        canonical_entity_label: entity.preferred_label,
        canonical_entity_slug: entity.slug,
        canonical_entity_type: entity.entity_type,
        curriculum_node_id: nodeId,
        curriculum_node_title: node?.title ?? null,
        concept_id: null,
        concept_name: null,
        relation_type: row.relation_type,
        bridge_review_status: row.review_status,
        bridge_provenance_status: row.provenance_status,
        bridge_confidence: row.confidence,
        mapping_confidence: mappingConfidence,
      };
    })
    .filter(isNonNull);
}

function inferFromConcept(
  conceptId: string,
  mappingConfidence: number,
  indexes: ReturnType<typeof buildIndexes>
) {
  const concept = indexes.conceptById.get(conceptId);
  const bridgeRows = indexes.conceptBridgeByConceptId.get(conceptId) ?? [];
  const node = concept ? indexes.curriculumNodeById.get(concept.curriculum_node_id) : null;

  return bridgeRows
    .map((row) => {
      const entity = indexes.canonicalEntityById.get(row.canonical_entity_id);
      if (!entity) {
        return null;
      }

      return {
        path_type: "concept" as const,
        canonical_entity_id: entity.id,
        canonical_entity_label: entity.preferred_label,
        canonical_entity_slug: entity.slug,
        canonical_entity_type: entity.entity_type,
        curriculum_node_id: concept?.curriculum_node_id ?? null,
        curriculum_node_title: node?.title ?? null,
        concept_id: conceptId,
        concept_name: concept?.canonical_name ?? null,
        relation_type: row.bridge_type,
        bridge_review_status: row.review_status,
        bridge_provenance_status: row.provenance_status,
        bridge_confidence: row.confidence,
        mapping_confidence: mappingConfidence,
      };
    })
    .filter(isNonNull);
}

export function inferCardCanonicalCoverage(
  snapshot: CanonicalCoverageSnapshot
): CardCanonicalCoverageRecord[] {
  const indexes = buildIndexes(snapshot);
  const linksByCardId = new Map<string, CoverageCardLink[]>();

  for (const link of snapshot.cardKnowledgeLinks) {
    const bucket = linksByCardId.get(link.canonical_card_id) ?? [];
    bucket.push(link);
    linksByCardId.set(link.canonical_card_id, bucket);
  }

  return [...linksByCardId.entries()]
    .map(([canonicalCardId, links]) => {
      const inferredPaths = links.flatMap((link) => {
        const paths: InferredCanonicalCoveragePath[] = [];
        if (link.curriculum_node_id) {
          paths.push(...inferFromCurriculumNode(link.curriculum_node_id, link.mapping_confidence, indexes));
        }
        if (link.concept_id) {
          paths.push(...inferFromConcept(link.concept_id, link.mapping_confidence, indexes));
        }
        return paths;
      });

      return {
        canonical_card_id: canonicalCardId,
        card_title: indexes.canonicalCardById.get(canonicalCardId)?.title ?? null,
        mapping_count: links.length,
        inferred_paths: dedupePaths(inferredPaths),
      };
    })
    .sort((left, right) => right.inferred_paths.length - left.inferred_paths.length);
}

export function inferQuestionCanonicalCoverage(
  snapshot: CanonicalCoverageSnapshot
): QuestionCanonicalCoverageRecord[] {
  const indexes = buildIndexes(snapshot);
  const linksByQuestionId = new Map<string, CoverageQuestionLink[]>();

  for (const link of snapshot.questionCurriculumMappings) {
    const bucket = linksByQuestionId.get(link.external_question_id) ?? [];
    bucket.push(link);
    linksByQuestionId.set(link.external_question_id, bucket);
  }

  return [...linksByQuestionId.entries()]
    .map(([externalQuestionId, links]) => {
      const inferredPaths = links.flatMap((link) => {
        const paths: InferredCanonicalCoveragePath[] = [];
        if (link.curriculum_node_id) {
          paths.push(...inferFromCurriculumNode(link.curriculum_node_id, link.mapping_confidence, indexes));
        }
        if (link.concept_id) {
          paths.push(...inferFromConcept(link.concept_id, link.mapping_confidence, indexes));
        }
        return paths;
      });

      return {
        external_question_id: externalQuestionId,
        source_question_key: indexes.questionById.get(externalQuestionId)?.external_question_id ?? null,
        mapping_count: links.length,
        inferred_paths: dedupePaths(inferredPaths),
      };
    })
    .sort((left, right) => right.inferred_paths.length - left.inferred_paths.length);
}

export function buildCurriculumNodePath(
  nodeId: string,
  curriculumNodeById: Map<string, CoverageCurriculumNode>
) {
  const titles: string[] = [];
  const visited = new Set<string>();
  let current = curriculumNodeById.get(nodeId) ?? null;

  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    titles.push(current.title);
    current = current.parent_id ? curriculumNodeById.get(current.parent_id) ?? null : null;
  }

  return titles.reverse().join(" > ");
}

export function findCurriculumBridgeGaps(
  snapshot: CanonicalCoverageSnapshot
): CurriculumBridgeGap[] {
  const indexes = buildIndexes(snapshot);
  const bridgedNodeIds = new Set(snapshot.curriculumNodeEntityLinks.map((row) => row.curriculum_node_id));
  const usageByNodeId = new Map<string, { card_count: number; question_count: number }>();

  for (const link of snapshot.cardKnowledgeLinks) {
    if (!link.curriculum_node_id) {
      continue;
    }
    const usage = usageByNodeId.get(link.curriculum_node_id) ?? { card_count: 0, question_count: 0 };
    usage.card_count += 1;
    usageByNodeId.set(link.curriculum_node_id, usage);
  }

  for (const link of snapshot.questionCurriculumMappings) {
    if (!link.curriculum_node_id) {
      continue;
    }
    const usage = usageByNodeId.get(link.curriculum_node_id) ?? { card_count: 0, question_count: 0 };
    usage.question_count += 1;
    usageByNodeId.set(link.curriculum_node_id, usage);
  }

  return [...usageByNodeId.entries()]
    .filter(([nodeId]) => !bridgedNodeIds.has(nodeId))
    .map(([nodeId, usage]) => {
      const node = indexes.curriculumNodeById.get(nodeId);
      if (!node) {
        return null;
      }

      const specialty = node.specialty_id ? indexes.specialtyById.get(node.specialty_id) ?? null : null;
      return {
        curriculum_node_id: nodeId,
        specialty_name: specialty?.name ?? null,
        node_title: node.title,
        node_slug: node.slug,
        node_path: buildCurriculumNodePath(nodeId, indexes.curriculumNodeById),
        card_count: usage.card_count,
        question_count: usage.question_count,
      };
    })
    .filter(isNonNull)
    .sort(
      (left, right) =>
        right.card_count + right.question_count - (left.card_count + left.question_count)
    );
}

export function findConceptBridgeOpportunities(
  snapshot: CanonicalCoverageSnapshot
): ConceptBridgeOpportunity[] {
  const indexes = buildIndexes(snapshot);
  const bridgedConceptIds = new Set(snapshot.conceptCanonicalEntityLinks.map((row) => row.concept_id));
  const usageByConceptId = new Map<string, { card_count: number; question_count: number }>();

  for (const link of snapshot.cardKnowledgeLinks) {
    if (!link.concept_id) {
      continue;
    }
    const usage = usageByConceptId.get(link.concept_id) ?? { card_count: 0, question_count: 0 };
    usage.card_count += 1;
    usageByConceptId.set(link.concept_id, usage);
  }

  for (const link of snapshot.questionCurriculumMappings) {
    if (!link.concept_id) {
      continue;
    }
    const usage = usageByConceptId.get(link.concept_id) ?? { card_count: 0, question_count: 0 };
    usage.question_count += 1;
    usageByConceptId.set(link.concept_id, usage);
  }

  return [...usageByConceptId.entries()]
    .filter(([conceptId]) => !bridgedConceptIds.has(conceptId))
    .map(([conceptId, usage]) => {
      const concept = indexes.conceptById.get(conceptId);
      if (!concept) {
        return null;
      }

      const node = indexes.curriculumNodeById.get(concept.curriculum_node_id) ?? null;
      return {
        concept_id: conceptId,
        concept_name: concept.canonical_name,
        concept_slug: concept.slug,
        concept_type: concept.concept_type,
        curriculum_node_id: concept.curriculum_node_id,
        curriculum_node_title: node?.title ?? null,
        node_path: node ? buildCurriculumNodePath(node.id, indexes.curriculumNodeById) : null,
        card_count: usage.card_count,
        question_count: usage.question_count,
      };
    })
    .filter(isNonNull)
    .sort(
      (left, right) =>
        right.card_count + right.question_count - (left.card_count + left.question_count)
    );
}
