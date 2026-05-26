import { createAdminClient } from "@/lib/supabase/admin";
import {
  createWorkspaceNotification,
  updateNotificationEmailStatus,
} from "./queries";
import {
  buildBasicNotificationEmailHtml,
  sendWorkspaceNotificationEmail,
} from "./email";
import type {
  CreateWorkspaceNotificationInput,
  NotificationDeliveryPreference,
  WorkspaceNotification,
} from "./types";

type NotificationEmailRecipient = {
  userId: string;
  email: string | null;
  receiveEmails: boolean;
};

function isDev() {
  return process.env.NODE_ENV !== "production";
}

function logDebug(label: string | undefined, details?: Record<string, unknown>) {
  if (!isDev() || !label) return;
  const payload = details ? ` ${JSON.stringify(details)}` : "";
  console.info(`${label}${payload}`);
}

async function getNotificationEmailRecipient(userId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("user_profiles")
    .select("email, receive_emails")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load notification email recipient: ${error.message}`);
  }

  return {
    userId,
    email: data?.email ?? null,
    receiveEmails: data?.receive_emails === true,
  } satisfies NotificationEmailRecipient;
}

function shouldSendEmail(params: {
  preference?: NotificationDeliveryPreference | null;
  important?: boolean;
  recipient: NotificationEmailRecipient;
}) {
  if (!params.recipient.email) return false;
  if (!params.recipient.receiveEmails) return false;

  const preference = params.preference ?? "important_only";

  if (preference === "always_email") return true;
  if (preference === "in_app_only") return false;

  return Boolean(params.important);
}

export async function createNotification(
  input: CreateWorkspaceNotificationInput
): Promise<WorkspaceNotification> {
  return createWorkspaceNotification(createAdminClient(), input);
}

export async function createNotificationAndMaybeEmail(params: {
  notification: CreateWorkspaceNotificationInput;
  important?: boolean;
  email?: {
    subject?: string;
    replyTo?: string | null;
    preference?: NotificationDeliveryPreference | null;
  } | null;
  debugLabel?: string;
}) {
  const startedAt = Date.now();
  logDebug(params.debugLabel, {
    step: "notification.create_and_maybe_email.start",
    recipientUserId: params.notification.recipientUserId,
    type: params.notification.type,
  });
  const supabase = createAdminClient();
  const notification = await createWorkspaceNotification(
    supabase,
    params.notification
  );

  try {
    const recipientLookupStartedAt = Date.now();
    const recipient = await getNotificationEmailRecipient(
      params.notification.recipientUserId
    );
    logDebug(params.debugLabel, {
      step: "notification.recipient_lookup.finish",
      durationMs: Date.now() - recipientLookupStartedAt,
      recipientUserId: recipient.userId,
      shouldConsiderEmail: Boolean(recipient.email && recipient.receiveEmails),
    });

    if (
      shouldSendEmail({
        preference: params.email?.preference,
        important: params.important,
        recipient,
      })
    ) {
      const emailStartedAt = Date.now();
      await sendWorkspaceNotificationEmail({
        to: recipient.email!,
        subject: params.email?.subject ?? params.notification.title,
        text: params.notification.message,
        html: buildBasicNotificationEmailHtml({
          title: params.notification.title,
          message: params.notification.message,
          actionUrl: params.notification.actionUrl ?? null,
        }),
        replyTo: params.email?.replyTo ?? null,
      });
      logDebug(params.debugLabel, {
        step: "notification.email_sent.finish",
        durationMs: Date.now() - emailStartedAt,
        recipientUserId: recipient.userId,
      });

      await updateNotificationEmailStatus(supabase, {
        notificationId: notification.id,
        emailedAt: new Date().toISOString(),
        emailError: null,
      });
    }
  } catch (error) {
    logDebug(params.debugLabel, {
      step: "notification.error",
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : "Unknown notification email error",
    });
    await updateNotificationEmailStatus(supabase, {
      notificationId: notification.id,
      emailedAt: null,
      emailError:
        error instanceof Error
          ? error.message.slice(0, 1000)
          : "Unknown notification email error",
    });
  }

  logDebug(params.debugLabel, {
    step: "notification.create_and_maybe_email.finish",
    durationMs: Date.now() - startedAt,
    notificationId: notification.id,
  });

  return notification;
}

export async function notifyMany(
  inputs: CreateWorkspaceNotificationInput[]
): Promise<WorkspaceNotification[]> {
  const notifications: WorkspaceNotification[] = [];

  for (const input of inputs) {
    notifications.push(await createNotification(input));
  }

  return notifications;
}

export async function notifyManyAndMaybeEmail(params: {
  notifications: CreateWorkspaceNotificationInput[];
  important?: boolean;
  email?: {
    subject?: string;
    replyTo?: string | null;
    preference?: NotificationDeliveryPreference | null;
  } | null;
  debugLabel?: string;
}) {
  const startedAt = Date.now();
  logDebug(params.debugLabel, {
    step: "notification.batch.start",
    count: params.notifications.length,
  });
  const notifications: WorkspaceNotification[] = [];

  for (const notification of params.notifications) {
    notifications.push(
      await createNotificationAndMaybeEmail({
        notification,
        important: params.important,
        email: params.email ?? null,
        debugLabel: params.debugLabel,
      })
    );
  }

  logDebug(params.debugLabel, {
    step: "notification.batch.finish",
    durationMs: Date.now() - startedAt,
    count: notifications.length,
  });

  return notifications;
}
