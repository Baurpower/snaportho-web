import { readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

type RestAdmin = {
  url: string;
  apiKey: string;
};

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

async function restWrite(
  restAdmin: RestAdmin,
  table: string,
  payload: Record<string, unknown>,
  onConflict?: string
) {
  const params = new URLSearchParams();
  if (onConflict) {
    params.set("on_conflict", onConflict);
  }

  const response = await fetch(
    `${restAdmin.url}/rest/v1/${table}${params.size > 0 ? `?${params}` : ""}`,
    {
      method: "POST",
      headers: {
        apikey: restAdmin.apiKey,
        Authorization: `Bearer ${restAdmin.apiKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(payload),
    }
  );

  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    body: await response.text(),
  };
}

async function restDelete(restAdmin: RestAdmin, table: string, filters: Record<string, string>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    params.set(key, `eq.${value}`);
  }

  const response = await fetch(`${restAdmin.url}/rest/v1/${table}?${params}`, {
    method: "DELETE",
    headers: {
      apikey: restAdmin.apiKey,
      Authorization: `Bearer ${restAdmin.apiKey}`,
      Prefer: "return=minimal",
    },
  });

  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    body: await response.text(),
  };
}

async function main() {
  const env = loadEnvFile(path.join(process.cwd(), ".env.local"));
  const restAdmin: RestAdmin = {
    url: env.NEXT_PUBLIC_SUPABASE_URL,
    apiKey: env.SUPABASE_SERVICE_ROLE_KEY,
  };
  const supabase = createClient(restAdmin.url, restAdmin.apiKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const suffix = `diag-${Date.now()}`;

  const sourceSlug = `orthobullets-${suffix}`;
  const specialtySlug = `diagnostic-specialty-${suffix}`;
  const nodeSlug = `diagnostic-topic-${suffix}`;
  const tagSlug = `diagnostic_tag_${suffix}`.replace(/-/g, "_");
  const externalQuestionId = `TMP-${suffix.toUpperCase()}`;

  const results: Array<Record<string, string | number | boolean>> = [];
  const cleanupActions: Array<() => Promise<void>> = [];

  const requiredTables = [
    "external_questions",
    "external_question_curriculum_mappings",
    "source_aliases",
    "curriculum_nodes",
    "external_sources",
    "specialties",
    "tags",
    "tag_assignments",
  ];

  for (const table of requiredTables) {
    const optionsResponse = await fetch(`${restAdmin.url}/rest/v1/${table}`, {
      method: "OPTIONS",
      headers: {
        apikey: restAdmin.apiKey,
        Authorization: `Bearer ${restAdmin.apiKey}`,
      },
    });
    results.push({
      table,
      phase: "exists",
      ok: optionsResponse.ok,
      status: optionsResponse.status,
      details: optionsResponse.headers.get("allow") ?? "",
    });
  }

  try {
    const sourceWrite = await restWrite(
      restAdmin,
      "external_sources",
      {
        slug: sourceSlug,
        name: `Orthobullets Diagnostic ${suffix}`,
        source_type: "qbank",
        description: "Temporary diagnostic source row.",
        comments: "Temporary diagnostic source row.",
        is_active: true,
      },
      "slug"
    );
    results.push({ table: "external_sources", phase: "write", ok: sourceWrite.ok, status: sourceWrite.status, details: sourceWrite.body || sourceWrite.statusText });
    const { data: sourceRow } = await supabase.from("external_sources").select("id").eq("slug", sourceSlug).single();
    cleanupActions.unshift(async () => {
      await restDelete(restAdmin, "external_sources", { slug: sourceSlug });
    });

    const specialtyWrite = await restWrite(
      restAdmin,
      "specialties",
      {
        slug: specialtySlug,
        name: `Diagnostic Specialty ${suffix}`,
        description: "Temporary diagnostic specialty row.",
        comments: "Temporary diagnostic specialty row.",
        is_active: true,
      },
      "slug"
    );
    results.push({ table: "specialties", phase: "write", ok: specialtyWrite.ok, status: specialtyWrite.status, details: specialtyWrite.body || specialtyWrite.statusText });
    const { data: specialtyRow } = await supabase.from("specialties").select("id").eq("slug", specialtySlug).single();
    cleanupActions.unshift(async () => {
      await restDelete(restAdmin, "specialties", { slug: specialtySlug });
    });

    const nodeWrite = await restWrite(
      restAdmin,
      "curriculum_nodes",
      {
        slug: nodeSlug,
        specialty_id: specialtyRow?.id,
        parent_id: null,
        node_type: "topic",
        title: `Diagnostic Topic ${suffix}`,
        short_label: `Diagnostic Topic ${suffix}`,
        description: "Temporary diagnostic curriculum node.",
        comments: "Temporary diagnostic curriculum node.",
        sort_order: 9999,
        is_active: true,
      },
      "slug"
    );
    results.push({ table: "curriculum_nodes", phase: "write", ok: nodeWrite.ok, status: nodeWrite.status, details: nodeWrite.body || nodeWrite.statusText });
    const { data: nodeRow } = await supabase.from("curriculum_nodes").select("id").eq("slug", nodeSlug).single();
    cleanupActions.unshift(async () => {
      await restDelete(restAdmin, "curriculum_nodes", { slug: nodeSlug });
    });

    const tagWrite = await restWrite(
      restAdmin,
      "tags",
      {
        namespace: "Diagnostic",
        slug: tagSlug,
        label: `Diagnostic::${suffix}`,
        description: "Temporary diagnostic tag.",
        comments: "Temporary diagnostic tag.",
        is_active: true,
      },
      "namespace,slug"
    );
    results.push({ table: "tags", phase: "write", ok: tagWrite.ok, status: tagWrite.status, details: tagWrite.body || tagWrite.statusText });
    const { data: tagRow } = await supabase
      .from("tags")
      .select("id")
      .eq("namespace", "Diagnostic")
      .eq("slug", tagSlug)
      .single();
    cleanupActions.unshift(async () => {
      await restDelete(restAdmin, "tags", { namespace: "Diagnostic", slug: tagSlug });
    });

    const externalQuestionWrite = await restWrite(
      restAdmin,
      "external_questions",
      {
        source_id: sourceRow?.id,
        external_question_id: externalQuestionId,
        specialty_raw: "Diagnostic Specialty",
        specialty_normalized: specialtySlug,
        topic_raw: `Diagnostic Topic ${suffix}`,
        topic_normalized: `Diagnostic Topic ${suffix}`,
        topic_slug: nodeSlug,
        metadata: { diagnostic: true },
        first_seen_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
        comments: "Temporary diagnostic external question row.",
        is_active: true,
      },
      "source_id,external_question_id"
    );
    results.push({ table: "external_questions", phase: "write", ok: externalQuestionWrite.ok, status: externalQuestionWrite.status, details: externalQuestionWrite.body || externalQuestionWrite.statusText });
    const { data: questionRow } = await supabase
      .from("external_questions")
      .select("id")
      .eq("source_id", sourceRow?.id)
      .eq("external_question_id", externalQuestionId)
      .single();
    cleanupActions.unshift(async () => {
      await restDelete(restAdmin, "external_questions", { source_id: sourceRow?.id ?? "", external_question_id: externalQuestionId });
    });

    const mappingWrite = await restWrite(
      restAdmin,
      "external_question_curriculum_mappings",
      {
        external_question_id: questionRow?.id,
        specialty_id: specialtyRow?.id,
        curriculum_node_id: nodeRow?.id,
        learning_objective_id: null,
        concept_id: null,
        mapping_confidence: 1,
        needs_review: false,
        review_reason: null,
        suggested_action: null,
        mapping_method: "import_rule",
        is_primary: true,
        metadata: { diagnostic: true },
        comments: "Temporary diagnostic mapping row.",
        is_active: true,
      }
    );
    results.push({ table: "external_question_curriculum_mappings", phase: "write", ok: mappingWrite.ok, status: mappingWrite.status, details: mappingWrite.body || mappingWrite.statusText });
    cleanupActions.unshift(async () => {
      await restDelete(restAdmin, "external_question_curriculum_mappings", { external_question_id: questionRow?.id ?? "" });
    });

    const sourceAliasWrite = await restWrite(
      restAdmin,
      "source_aliases",
      {
        source_id: sourceRow?.id,
        entity_type: "curriculum_node",
        entity_id: nodeRow?.id,
        alias_kind: "source_topic_label",
        alias_value: `Diagnostic Topic ${suffix}`,
        external_id: null,
        metadata: { diagnostic: true },
        comments: "Temporary diagnostic source alias row.",
        is_active: true,
      },
      "source_id,entity_type,entity_id,alias_kind,alias_value"
    );
    results.push({ table: "source_aliases", phase: "write", ok: sourceAliasWrite.ok, status: sourceAliasWrite.status, details: sourceAliasWrite.body || sourceAliasWrite.statusText });
    cleanupActions.unshift(async () => {
      await restDelete(restAdmin, "source_aliases", {
        source_id: sourceRow?.id ?? "",
        entity_type: "curriculum_node",
        entity_id: nodeRow?.id ?? "",
        alias_kind: "source_topic_label",
        alias_value: `Diagnostic Topic ${suffix}`,
      });
    });

    const tagAssignmentWrite = await restWrite(
      restAdmin,
      "tag_assignments",
      {
        tag_id: tagRow?.id,
        entity_type: "external_question",
        entity_id: questionRow?.id,
        assigned_by_source: "import",
        comments: "Temporary diagnostic tag assignment row.",
        is_active: true,
      },
      "tag_id,entity_type,entity_id"
    );
    results.push({ table: "tag_assignments", phase: "write", ok: tagAssignmentWrite.ok, status: tagAssignmentWrite.status, details: tagAssignmentWrite.body || tagAssignmentWrite.statusText });
    cleanupActions.unshift(async () => {
      await restDelete(restAdmin, "tag_assignments", {
        tag_id: tagRow?.id ?? "",
        entity_type: "external_question",
        entity_id: questionRow?.id ?? "",
      });
    });
  } finally {
    for (const cleanup of cleanupActions) {
      try {
        await cleanup();
      } catch {
        // Best-effort cleanup for temporary diagnostic rows.
      }
    }
  }

  console.log(JSON.stringify({ projectRef: new URL(restAdmin.url).host.split(".")[0], results }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
