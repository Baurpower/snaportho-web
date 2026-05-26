import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CreateWorkspaceNotificationInput,
  WorkspaceNotification,
} from "./types";

const NOTIFICATION_SELECT = `
  id,
  program_id,
  recipient_user_id,
  recipient_roster_id,
  actor_user_id,
  actor_roster_id,
  type,
  category,
  title,
  message,
  action_url,
  metadata,
  read_at,
  emailed_at,
  email_error,
  created_at,
  updated_at
`;

export async function createWorkspaceNotification(
  supabase: SupabaseClient,
  input: CreateWorkspaceNotificationInput
) {
  const { data, error } = await supabase
    .from("workspace_notifications")
    .insert({
      program_id: input.programId ?? null,
      recipient_user_id: input.recipientUserId,
      recipient_roster_id: input.recipientRosterId ?? null,
      actor_user_id: input.actorUserId ?? null,
      actor_roster_id: input.actorRosterId ?? null,
      type: input.type,
      category: input.category ?? null,
      title: input.title,
      message: input.message,
      action_url: input.actionUrl ?? null,
      metadata: input.metadata ?? null,
      updated_at: new Date().toISOString(),
    })
    .select(NOTIFICATION_SELECT)
    .single();

  if (error) {
    throw new Error(`Failed to create workspace notification: ${error.message}`);
  }

  return data as WorkspaceNotification;
}

export async function getNotificationsForCurrentUser(
  supabase: SupabaseClient,
  params: {
    userId: string;
    unreadOnly?: boolean;
    limit?: number;
  }
) {
  let query = supabase
    .from("workspace_notifications")
    .select(NOTIFICATION_SELECT)
    .eq("recipient_user_id", params.userId)
    .order("created_at", { ascending: false });

  if (params.unreadOnly) {
    query = query.is("read_at", null);
  }

  if (typeof params.limit === "number" && params.limit > 0) {
    query = query.limit(params.limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to load notifications: ${error.message}`);
  }

  return (data ?? []) as WorkspaceNotification[];
}

export async function getUnreadNotificationCount(
  supabase: SupabaseClient,
  userId: string
) {
  const { count, error } = await supabase
    .from("workspace_notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_user_id", userId)
    .is("read_at", null);

  if (error) {
    throw new Error(`Failed to load unread notification count: ${error.message}`);
  }

  return count ?? 0;
}

export async function markNotificationRead(
  supabase: SupabaseClient,
  params: {
    notificationId: string;
    userId: string;
  }
) {
  const { data, error } = await supabase
    .from("workspace_notifications")
    .update({
      read_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.notificationId)
    .eq("recipient_user_id", params.userId)
    .select(NOTIFICATION_SELECT)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to mark notification read: ${error.message}`);
  }

  return (data as WorkspaceNotification | null) ?? null;
}

export async function markAllNotificationsRead(
  supabase: SupabaseClient,
  userId: string
) {
  const readAt = new Date().toISOString();
  const { error } = await supabase
    .from("workspace_notifications")
    .update({
      read_at: readAt,
      updated_at: readAt,
    })
    .eq("recipient_user_id", userId)
    .is("read_at", null);

  if (error) {
    throw new Error(`Failed to mark all notifications read: ${error.message}`);
  }

  return {
    readAt,
  };
}

export async function updateNotificationEmailStatus(
  supabase: SupabaseClient,
  params: {
    notificationId: string;
    emailedAt?: string | null;
    emailError?: string | null;
  }
) {
  const { data, error } = await supabase
    .from("workspace_notifications")
    .update({
      emailed_at: params.emailedAt ?? null,
      email_error: params.emailError ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.notificationId)
    .select(NOTIFICATION_SELECT)
    .single();

  if (error) {
    throw new Error(
      `Failed to update notification email status: ${error.message}`
    );
  }

  return data as WorkspaceNotification;
}
