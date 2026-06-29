const fs = require("fs");
const { Client } = require("pg");

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

async function main() {
  const env = loadEnv();
  const client = new Client({
    host: env.POSTGRES_HOST,
    user: env.POSTGRES_USER,
    password: env.POSTGRES_PASSWORD,
    database: env.POSTGRES_DB,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  const result = await client.query(`
    select
      to_regclass('public.canonical_entities') as canonical_entities,
      to_regclass('public.concept_canonical_entities') as concept_canonical_entities,
      to_regclass('public.kg_automation_proposals') as kg_automation_proposals
  `);

  console.log(JSON.stringify(result.rows[0], null, 2));
  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
