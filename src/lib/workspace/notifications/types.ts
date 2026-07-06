export type NotificationCategory =
  | "call_swap"
  | "schedule"
  | "academic"
  | "announcement"
  | "integration"
  | "system"
  | string;

export type NotificationDeliveryPreference =
  | "in_app_only"
  | "important_only"
  | "always_email";

export type WorkspaceNotification = {
  id: string;
  program_id: string;
  recipient_user_id: string;
  recipient_roster_id: string | null;
  actor_user_id: string | null;
  actor_roster_id: string | null;
  type: string;
  category: NotificationCategory | null;
  title: string;
  message: string;
  action_url: string | null;
  metadata: Record<string, unknown> | null;
  read_at: string | null;
  emailed_at: string | null;
  email_error: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateWorkspaceNotificationInput = {
  programId: string;
  recipientUserId: string;
  recipientRosterId?: string | null;
  actorUserId?: string | null;
  actorRosterId?: string | null;
  type: string;
  category?: NotificationCategory | null;
  title: string;
  message: string;
  actionUrl?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type EmailNotificationPayload = {
  to: string;
  subject: string;
  text: string;
  html?: string | null;
  replyTo?: string | null;
};
