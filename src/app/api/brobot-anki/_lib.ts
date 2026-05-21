import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/utils/supabase/server";

type BrowserSupabaseClient = Awaited<ReturnType<typeof createClient>>;
type AdminSupabaseClient = ReturnType<typeof createAdminClient>;

type AuthenticatedContext = {
  supabase: BrowserSupabaseClient;
  user: User;
};

type BroBotAuthMethod = "browser_session" | "bearer_token" | "device_token";

type DeviceTokenRecord = {
  id: string;
  user_id: string;
  device_link_id: string;
  revoked_at: string | null;
};

type DeviceLinkRecord = {
  id: string;
  device_name: string;
  user_id: string | null;
  status: string;
  approved_at: string | null;
  exchanged_at: string | null;
  revoked_at: string | null;
  expires_at: string;
};

export type AuthenticatedBroBotAnkiRequest = {
  supabase: BrowserSupabaseClient | AdminSupabaseClient;
  userId: string;
  authMethod: BroBotAuthMethod;
  deviceLinkId: string | null;
  deviceTokenId: string | null;
};

function getBearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");

  if (!authorization) {
    return null;
  }

  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return null;
  }

  const token = match[1]?.trim();
  return token ? token : null;
}

function getDeviceToken(request: Request): string | null {
  const token = request.headers.get("x-snaportho-anki-token")?.trim();
  return token ? token : null;
}

export function hashDeviceToken(rawToken: string): string {
  return createHash("sha256").update(rawToken, "utf8").digest("hex");
}

export function generateLinkCode(): string {
  return randomBytes(5).toString("hex").toUpperCase();
}

export function generateDeviceToken(): string {
  return `snaportho_anki_${randomBytes(24).toString("hex")}`;
}

export function isoNow(): string {
  return new Date().toISOString();
}

export function plusMinutesIso(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

export function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() <= Date.now();
}

export async function requireAuthenticatedUser(
  request: Request
): Promise<
  AuthenticatedContext | { response: NextResponse }
> {
  const supabase = await createClient();
  const bearerToken = getBearerToken(request);

  const {
    data: { user },
    error: authError,
  } = bearerToken
    ? await supabase.auth.getUser(bearerToken)
    : await supabase.auth.getUser();

  if (authError) {
    return {
      response: NextResponse.json(
        { error: `Authentication failed: ${authError.message}` },
        { status: 401 }
      ),
    };
  }

  if (!user) {
    return {
      response: NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      ),
    };
  }

  return { supabase, user };
}

async function authenticateWithSupabaseUser(
  request: Request
): Promise<
  | {
      success: true;
      context: AuthenticatedBroBotAnkiRequest;
    }
  | {
      success: false;
      response: NextResponse;
    }
  | {
      success: false;
      response: null;
    }
> {
  const supabase = await createClient();
  const bearerToken = getBearerToken(request);

  const {
    data: { user },
    error: authError,
  } = bearerToken
    ? await supabase.auth.getUser(bearerToken)
    : await supabase.auth.getUser();

  if (authError) {
    if (bearerToken) {
      return {
        success: false,
        response: NextResponse.json(
          { error: `Authentication failed: ${authError.message}` },
          { status: 401 }
        ),
      };
    }

    return {
      success: false,
      response: null,
    };
  }

  if (!user) {
    return {
      success: false,
      response: null,
    };
  }

  return {
    success: true,
    context: {
      supabase,
      userId: user.id,
      authMethod: bearerToken ? "bearer_token" : "browser_session",
      deviceLinkId: null,
      deviceTokenId: null,
    },
  };
}

async function authenticateWithDeviceToken(
  request: Request
): Promise<
  | { success: true; context: AuthenticatedBroBotAnkiRequest }
  | { success: false; response: NextResponse }
  | { success: false; response: null }
> {
  const rawDeviceToken = getDeviceToken(request);

  if (!rawDeviceToken) {
    return { success: false, response: null };
  }

  const tokenHash = hashDeviceToken(rawDeviceToken);
  const supabase = createAdminClient();

  const { data: tokenRecord, error: tokenError } = await supabase
    .from("brobot_anki_device_tokens")
    .select("id, user_id, device_link_id, revoked_at")
    .eq("token_hash", tokenHash)
    .maybeSingle<DeviceTokenRecord>();

  if (tokenError) {
    return {
      success: false,
      response: NextResponse.json({ error: tokenError.message }, { status: 500 }),
    };
  }

  if (!tokenRecord || tokenRecord.revoked_at) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Invalid or revoked device token." },
        { status: 401 }
      ),
    };
  }

  const { error: touchError } = await supabase
    .from("brobot_anki_device_tokens")
    .update({ last_used_at: isoNow() })
    .eq("id", tokenRecord.id);

  if (touchError) {
    return {
      success: false,
      response: NextResponse.json({ error: touchError.message }, { status: 500 }),
    };
  }

  return {
    success: true,
    context: {
      supabase,
      userId: tokenRecord.user_id,
      authMethod: "device_token",
      deviceLinkId: tokenRecord.device_link_id,
      deviceTokenId: tokenRecord.id,
    },
  };
}

export async function authenticateBroBotAnkiRequest(
  request: Request
): Promise<
  AuthenticatedBroBotAnkiRequest | { response: NextResponse }
> {
  const userAuth = await authenticateWithSupabaseUser(request);

  if (userAuth.success) {
    return userAuth.context;
  }

  if (userAuth.response) {
    return { response: userAuth.response };
  }

  const deviceAuth = await authenticateWithDeviceToken(request);

  if (deviceAuth.success) {
    return deviceAuth.context;
  }

  if (deviceAuth.response) {
    return { response: deviceAuth.response };
  }

  return {
    response: NextResponse.json(
      { error: "Not authenticated" },
      { status: 401 }
    ),
  };
}

export async function getDeviceLinkByCode(
  linkCode: string
): Promise<
  | { success: true; supabase: AdminSupabaseClient; link: DeviceLinkRecord | null }
  | { success: false; response: NextResponse }
> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("brobot_anki_device_links")
    .select(
      "id, device_name, user_id, status, approved_at, exchanged_at, revoked_at, expires_at"
    )
    .eq("link_code", linkCode)
    .maybeSingle<DeviceLinkRecord>();

  if (error) {
    return {
      success: false,
      response: NextResponse.json({ error: error.message }, { status: 500 }),
    };
  }

  return {
    success: true,
    supabase,
    link: data,
  };
}

export async function parseJsonBody<TSchema extends z.ZodTypeAny>(
  request: Request,
  schema: TSchema
): Promise<
  | { success: true; data: z.infer<TSchema> }
  | { success: false; response: NextResponse }
> {
  let rawBody: unknown;

  try {
    rawBody = await request.json();
  } catch {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Request body must be valid JSON." },
        { status: 400 }
      ),
    };
  }

  const parsed = schema.safeParse(rawBody);

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    const path = firstIssue.path.length > 0 ? firstIssue.path.join(".") : "body";

    return {
      success: false,
      response: NextResponse.json(
        { error: `${path}: ${firstIssue.message}` },
        { status: 400 }
      ),
    };
  }

  return {
    success: true,
    data: parsed.data,
  };
}

export function normalizeOptionalString(
  value: string | undefined
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export const optionalTrimmedStringSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  },
  z.string().optional()
);

export const optionalStringArraySchema = z.preprocess(
  (value) => {
    if (!Array.isArray(value)) {
      return value;
    }

    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  },
  z.array(z.string()).optional()
);
