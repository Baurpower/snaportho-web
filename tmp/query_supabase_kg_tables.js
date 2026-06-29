const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");

function loadEnv() {
  return Object.fromEntries(
    fs
      .readFileSync(".env.local", "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const separatorIndex = line.indexOf("=");
        return [
          line.slice(0, separatorIndex).trim(),
          line
            .slice(separatorIndex + 1)
            .trim()
            .replace(/^['"]|['"]$/g, ""),
        ];
      })
  );
}

async function checkTable(client, table) {
  const { error } = await client.from(table).select("id").limit(1);
  return {
    table,
    exists: !error,
    error: error ? error.message : null,
  };
}

async function main() {
  const env = loadEnv();
  const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const tables = [
    "canonical_entities",
    "curriculum_node_entities",
    "concept_canonical_entities",
    "kg_automation_proposals",
  ];

  const results = [];
  for (const table of tables) {
    results.push(await checkTable(client, table));
  }

  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
