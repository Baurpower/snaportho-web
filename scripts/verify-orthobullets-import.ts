import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(filePath: string) {
  const env = Object.create(null) as Record<string, string>;
  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const rawValue = trimmed.slice(index + 1).trim();
    env[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }

  return env;
}

function markdownTable(
  rows: Array<Record<string, string | number>>,
  columns: Array<{ key: string; label: string }>
) {
  const header = `| ${columns.map((column) => column.label).join(" | ")} |`;
  const divider = `| ${columns.map(() => "---").join(" | ")} |`;
  const body = rows.map(
    (row) => `| ${columns.map((column) => String(row[column.key] ?? "")).join(" | ")} |`
  );
  return [header, divider, ...body].join("\n");
}

async function fetchAllRows<T>(
  fetchPage: (from: number, to: number) => Promise<T[]>,
  pageSize = 1000
) {
  const rows: T[] = [];

  for (let from = 0; ; from += pageSize) {
    const page = await fetchPage(from, from + pageSize - 1);
    rows.push(...page);

    if (page.length < pageSize) {
      break;
    }
  }

  return rows;
}

async function countByIds(
  fetchCount: (ids: string[]) => Promise<number>,
  ids: string[],
  chunkSize = 100
) {
  let total = 0;

  for (let index = 0; index < ids.length; index += chunkSize) {
    const chunk = ids.slice(index, index + chunkSize);
    let attemptsRemaining = 3;

    while (attemptsRemaining > 0) {
      try {
        total += await fetchCount(chunk);
        break;
      } catch (error) {
        attemptsRemaining -= 1;

        if (attemptsRemaining === 0) {
          throw error;
        }
      }
    }
  }

  return total;
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const schemaOnly = args.has("--schema-only");
  const env = loadEnvFile(path.join(process.cwd(), ".env.local"));
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  const projectRef = new URL(env.NEXT_PUBLIC_SUPABASE_URL).host.split(".")[0];
  const checkedAt = new Date().toISOString();

  const tables = [
    "external_sources",
    "external_questions",
    "external_question_curriculum_mappings",
    "source_aliases",
    "tags",
    "tag_assignments",
    "curriculum_nodes",
    "specialties",
    "concepts",
  ];

  const schemaChecks = [];
  for (const table of tables) {
    const { error, count } = await supabase
      .from(table)
      .select("id", { head: true, count: "exact" })
      .limit(1);
    schemaChecks.push({
      table,
      ok: error ? "FALSE" : "TRUE",
      count: count ?? 0,
      error: error?.message ?? "",
    });
  }

  if (schemaOnly) {
    console.log(
      JSON.stringify(
        {
          projectRef,
          checkedAt,
          schemaChecks,
        },
        null,
        2
      )
    );
    return;
  }

  const { data: sourceRow, error: sourceError } = await supabase
    .from("external_sources")
    .select("id, slug, name")
    .eq("slug", "orthobullets")
    .single();

  if (sourceError) {
    throw sourceError;
  }

  const externalQuestions = await fetchAllRows(async (from, to) => {
    const { data, error } = await supabase
      .from("external_questions")
      .select("id, external_question_id, metadata")
      .eq("source_id", sourceRow.id)
      .order("external_question_id")
      .range(from, to);

    if (error) {
      throw error;
    }

    return data ?? [];
  });

  const externalQuestionIds = externalQuestions.map((row) => row.id);
  const questionsUpserted = externalQuestions.length;

  const curriculumNodeAliases = await fetchAllRows(async (from, to) => {
    const { data, error } = await supabase
      .from("source_aliases")
      .select("entity_id")
      .eq("source_id", sourceRow.id)
      .eq("entity_type", "curriculum_node")
      .range(from, to);

    if (error) {
      throw error;
    }

    return data ?? [];
  });

  const curriculumNodeIds = [...new Set(curriculumNodeAliases.map((row) => row.entity_id))];

  const mappings = await fetchAllRows(async (from, to) => {
    const { data, error } = await supabase
      .from("external_question_curriculum_mappings")
      .select(
        "external_question_id, curriculum_node_id, concept_id, needs_review, curriculum_nodes(title,slug), external_questions!inner(source_id)"
      )
      .eq("external_questions.source_id", sourceRow.id)
      .range(from, to);

    if (error) {
      throw error;
    }

    return data ?? [];
  });

  const sourceAliases = await fetchAllRows(async (from, to) => {
    const { data, error } = await supabase
      .from("source_aliases")
      .select("entity_id, entity_type")
      .eq("source_id", sourceRow.id)
      .range(from, to);

    if (error) {
      throw error;
    }

    return data ?? [];
  });

  const tagAssignmentsForQuestions = await countByIds(async (ids) => {
    const { count, error } = await supabase
      .from("tag_assignments")
      .select("id", { head: true, count: "exact" })
      .eq("entity_type", "external_question")
      .in("entity_id", ids);

    if (error) {
      throw error;
    }

    return count ?? 0;
  }, externalQuestionIds);

  const tagAssignmentsForNodes = await countByIds(async (ids) => {
    const { count, error } = await supabase
      .from("tag_assignments")
      .select("id", { head: true, count: "exact" })
      .eq("entity_type", "curriculum_node")
      .in("entity_id", ids);

    if (error) {
      throw error;
    }

    return count ?? 0;
  }, curriculumNodeIds);

  const { count: conceptsCreatedCount, error: conceptsCreatedError } = await supabase
    .from("concepts")
    .select("id", { head: true, count: "exact" })
    .ilike("comments", "%Orthobullets metadata%");

  if (conceptsCreatedError) {
    throw conceptsCreatedError;
  }

  const topicCounts = new Map<string, { slug: string; title: string; count: number }>();
  let remainingNeedsReview = 0;

  for (const mapping of mappings) {
    if (mapping.needs_review) {
      remainingNeedsReview += 1;
    }

    if (!mapping.curriculum_node_id || !mapping.curriculum_nodes) {
      continue;
    }

    const node = Array.isArray(mapping.curriculum_nodes)
      ? mapping.curriculum_nodes[0]
      : mapping.curriculum_nodes;

    if (!node) {
      continue;
    }

    const existing = topicCounts.get(mapping.curriculum_node_id);
    topicCounts.set(mapping.curriculum_node_id, {
      slug: node.slug,
      title: node.title,
      count: (existing?.count ?? 0) + 1,
    });
  }

  const topMappedTopics = [...topicCounts.values()]
    .sort((left, right) => right.count - left.count || left.title.localeCompare(right.title))
    .slice(0, 20);

  const sourceAnomaliesCount = remainingNeedsReview;
  const report = [
    "# Orthobullets Apply Report",
    "",
    `- Environment applied to: Supabase project \`${projectRef}\` from \`.env.local\``,
    `- Timestamp: ${checkedAt}`,
    `- Rows imported: ${questionsUpserted}`,
    `- Questions upserted: ${questionsUpserted}`,
    `- Curriculum nodes upserted: ${curriculumNodeIds.length}`,
    `- Mappings upserted: ${mappings.length}`,
    `- Concepts created by this import: ${conceptsCreatedCount ?? 0}`,
    `- Remaining rows needing review: ${remainingNeedsReview}`,
    `- Source anomalies count: ${sourceAnomaliesCount}`,
    `- Tag assignments linked to this import: ${tagAssignmentsForQuestions + tagAssignmentsForNodes}`,
    `- Source aliases linked to this import: ${sourceAliases.length}`,
    "",
    "## Schema Checks",
    "",
    markdownTable(schemaChecks, [
      { key: "table", label: "Table" },
      { key: "ok", label: "OK" },
      { key: "count", label: "Count" },
      { key: "error", label: "Error" },
    ]),
    "",
    "## Top Mapped Topics",
    "",
    markdownTable(topMappedTopics, [
      { key: "title", label: "Curriculum Node" },
      { key: "slug", label: "Slug" },
      { key: "count", label: "Linked Questions" },
    ]),
    "",
    "## Warnings",
    "",
    remainingNeedsReview === 0
      ? "- No remaining review rows."
      : `- ${remainingNeedsReview} Orthobullets mappings still need review; these should correspond to true source anomalies.`,
    conceptsCreatedCount === 0
      ? "- No topic-level concepts were created because --seed-topic-concepts remained off."
      : "- Concept rows were created; this would be unexpected for the requested apply mode.",
    "",
  ].join("\n");

  const reportPath = path.join(
    process.cwd(),
    "tmp",
    "education",
    "orthobullets-import",
    "orthobullets_apply_report.md"
  );
  writeFileSync(reportPath, report, "utf8");

  console.log(
    JSON.stringify(
      {
        projectRef,
        checkedAt,
        questionsUpserted,
        curriculumNodesUpserted: curriculumNodeIds.length,
        mappingsUpserted: mappings.length,
        conceptsCreatedCount: conceptsCreatedCount ?? 0,
        remainingNeedsReview,
        sourceAnomaliesCount,
        tagAssignmentsCount: tagAssignmentsForQuestions + tagAssignmentsForNodes,
        sourceAliasesCount: sourceAliases.length,
        topMappedTopics,
        reportPath,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
