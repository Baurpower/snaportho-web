import crypto from "node:crypto";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logGoogleAudit } from "@/lib/google/audit";

export async function requireGoogleApiUser(endpoint: string) {
  const sessionClient = await createClient();
  const {
    data: { user },
    error,
  } = await sessionClient.auth.getUser();

  logGoogleAudit("endpoint.auth", {
    endpoint,
    userId: user?.id ?? null,
    userEmail: user?.email ?? null,
    authenticated: Boolean(user && !error),
  });

  return {
    user: error ? null : user,
    admin: createAdminClient(),
  };
}

export function hashGoogleOAuthNonce(nonce: string) {
  return crypto.createHash("sha256").update(nonce).digest("hex");
}
