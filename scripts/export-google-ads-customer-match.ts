import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

type ProfileRow = {
  user_id: string;
  full_name: string | null;
  country: string | null;
};

type SubscriptionRow = {
  user_id: string;
};

type AudienceName =
  | "all-registered-users"
  | "active-subscribers"
  | "free-users-non-subscribers";

type ExportRow = {
  email: string;
  first_name: string;
  last_name: string;
  country: string;
  zip: string;
};

type AdminSupabaseClient = SupabaseClient<any, "public", any>;

const DEFAULT_OUT_DIR = path.join(
  process.cwd(),
  "tmp",
  "google-ads-customer-match"
);

const ACTIVE_SUBSCRIPTION_STATUSES = ["active", "trialing", "past_due"];

function loadEnvFile(filePath: string) {
  if (!existsSync(filePath)) {
    return;
  }

  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, "");

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  const hashed = args.includes("--hashed");
  const outArg = args.find((arg) => arg.startsWith("--out="));
  const outDir = outArg ? path.resolve(outArg.slice("--out=".length)) : DEFAULT_OUT_DIR;

  return { hashed, outDir };
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function splitName(fullName: string | null | undefined) {
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return { firstName: "", lastName: "" };
  }

  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

function csvEscape(value: string) {
  if (!/[",\n\r]/.test(value)) {
    return value;
  }

  return `"${value.replaceAll('"', '""')}"`;
}

function toCsv(rows: ExportRow[], hashed: boolean) {
  const header = hashed
    ? ["normalized_email_hash", "first_name", "last_name", "country", "zip"]
    : ["email", "first_name", "last_name", "country", "zip"];

  const lines = rows.map((row) => {
    const identifier = hashed ? sha256(normalizeEmail(row.email)) : row.email;
    return [
      identifier,
      row.first_name,
      row.last_name,
      row.country,
      row.zip,
    ]
      .map(csvEscape)
      .join(",");
  });

  return [header.join(","), ...lines].join("\n") + "\n";
}

async function listAuthUsers(supabase: AdminSupabaseClient) {
  const users: User[] = [];
  const perPage = 1000;

  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw error;
    }

    users.push(...data.users);

    if (data.users.length < perPage) {
      break;
    }
  }

  return users;
}

async function fetchProfiles(supabase: AdminSupabaseClient) {
  const profiles = new Map<string, ProfileRow>();
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from("user_profiles")
      .select("user_id, full_name, country")
      .range(from, to);

    if (error) {
      throw error;
    }

    for (const row of (data ?? []) as ProfileRow[]) {
      profiles.set(row.user_id, row);
    }

    if (!data || data.length < pageSize) {
      break;
    }
  }

  return profiles;
}

async function fetchActiveSubscriberIds(supabase: AdminSupabaseClient) {
  const subscriberIds = new Set<string>();
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from("subscriptions")
      .select("user_id")
      .in("status", ACTIVE_SUBSCRIPTION_STATUSES)
      .or(`current_period_end.is.null,current_period_end.gte.${new Date().toISOString()}`)
      .range(from, to);

    if (error) {
      throw error;
    }

    for (const row of (data ?? []) as SubscriptionRow[]) {
      subscriberIds.add(row.user_id);
    }

    if (!data || data.length < pageSize) {
      break;
    }
  }

  return subscriberIds;
}

function buildExportRows(users: User[], profiles: Map<string, ProfileRow>) {
  const seenEmails = new Set<string>();
  const rows: Array<ExportRow & { user_id: string }> = [];

  for (const user of users) {
    if (!user.email) {
      continue;
    }

    const normalizedEmail = normalizeEmail(user.email);

    if (!normalizedEmail || seenEmails.has(normalizedEmail)) {
      continue;
    }

    seenEmails.add(normalizedEmail);

    const profile = profiles.get(user.id);
    const { firstName, lastName } = splitName(profile?.full_name);

    rows.push({
      user_id: user.id,
      email: normalizedEmail,
      first_name: firstName,
      last_name: lastName,
      country: profile?.country?.trim() ?? "",
      zip: "",
    });
  }

  return rows;
}

function writeAudienceCsv(
  outDir: string,
  audience: AudienceName,
  rows: ExportRow[],
  hashed: boolean
) {
  const filename = hashed ? `${audience}.hashed.csv` : `${audience}.csv`;
  const filepath = path.join(outDir, filename);
  writeFileSync(filepath, toCsv(rows, hashed), "utf8");
  return filepath;
}

async function main() {
  loadEnvFile(path.join(process.cwd(), ".env.local"));
  loadEnvFile(path.join(process.cwd(), ".env"));

  const { hashed, outDir } = parseArgs();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Run this only from a trusted server/admin shell."
    );
  }

  mkdirSync(outDir, { recursive: true });

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const [users, profiles, activeSubscriberIds] = await Promise.all([
    listAuthUsers(supabase),
    fetchProfiles(supabase),
    fetchActiveSubscriberIds(supabase),
  ]);

  const allRows = buildExportRows(users, profiles);
  const activeSubscriberRows = allRows.filter((row) =>
    activeSubscriberIds.has(row.user_id)
  );
  const freeUserRows = allRows.filter((row) => !activeSubscriberIds.has(row.user_id));

  const outputs = [
    writeAudienceCsv(outDir, "all-registered-users", allRows, hashed),
    writeAudienceCsv(outDir, "active-subscribers", activeSubscriberRows, hashed),
    writeAudienceCsv(outDir, "free-users-non-subscribers", freeUserRows, hashed),
  ];

  console.info(
    JSON.stringify(
      {
        googleAdsAccountId: "130-435-2227",
        domain: "snap-ortho.com",
        mode: hashed ? "hashed" : "plain",
        outputDirectory: outDir,
        counts: {
          allRegisteredUsers: allRows.length,
          activeSubscribers: activeSubscriberRows.length,
          freeUsersNonSubscribers: freeUserRows.length,
        },
        files: outputs,
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
