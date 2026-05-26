import tls from "node:tls";
import { Buffer } from "node:buffer";
import type { EmailNotificationPayload } from "./types";

type SmtpConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
};

function getSmtpConfig(): SmtpConfig {
  const host =
    process.env.SMTP_HOST ??
    process.env.RESEND_SMTP_HOST ??
    process.env.RESEND_SMTP_SERVER ??
    "";
  const port = Number(
    process.env.SMTP_PORT ??
      process.env.RESEND_SMTP_PORT ??
      process.env.RESEND_SMTP_SERVER_PORT ??
      "465"
  );
  const user =
    process.env.SMTP_USER ??
    process.env.RESEND_SMTP_USER ??
    process.env.RESEND_SMTP_USERNAME ??
    "";
  const pass =
    process.env.SMTP_PASS ??
    process.env.SMTP_PASSWORD ??
    process.env.RESEND_SMTP_PASS ??
    process.env.RESEND_SMTP_PASSWORD ??
    "";
  const from =
    process.env.SMTP_FROM ??
    process.env.RESEND_SMTP_FROM ??
    process.env.NOTIFICATION_FROM_EMAIL ??
    "SnapOrtho Workspace <support@snap-ortho.com>";

  if (!host || !user || !pass || !from || Number.isNaN(port)) {
    throw new Error(
      "Missing SMTP configuration. Expected SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/SMTP_FROM or matching Resend SMTP env vars."
    );
  }

  return {
    host,
    port,
    user,
    pass,
    from,
  };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function buildBasicNotificationEmailHtml(params: {
  title: string;
  message: string;
  actionUrl?: string | null;
}) {
  const title = escapeHtml(params.title);
  const message = escapeHtml(params.message).replaceAll("\n", "<br />");
  const actionUrl = params.actionUrl ? escapeHtml(params.actionUrl) : null;

  return `
    <div style="font-family: Arial, sans-serif; background: #f8fafc; padding: 24px; color: #0f172a;">
      <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; padding: 32px;">
        <p style="margin: 0 0 8px; font-size: 12px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: #0369a1;">
          SnapOrtho Workspace
        </p>
        <h1 style="margin: 0 0 16px; font-size: 24px; line-height: 1.2; color: #0f172a;">
          ${title}
        </h1>
        <p style="margin: 0; font-size: 15px; line-height: 1.7; color: #334155;">
          ${message}
        </p>
        ${
          actionUrl
            ? `
          <div style="margin-top: 24px;">
            <a
              href="${actionUrl}"
              style="display: inline-block; border-radius: 9999px; background: #0f172a; color: #ffffff; text-decoration: none; font-weight: 700; padding: 12px 18px;"
            >
              View in Workspace
            </a>
          </div>
        `
            : ""
        }
        <p style="margin: 24px 0 0; font-size: 12px; line-height: 1.6; color: #64748b;">
          This email relates to workspace scheduling and program activity in SnapOrtho Workspace.
        </p>
      </div>
    </div>
  `;
}

function formatEmailAddress(value: string) {
  return value.trim();
}

function extractEmailAddress(value: string) {
  const trimmed = formatEmailAddress(value);
  return trimmed.match(/<([^>]+)>/)?.[1]?.trim() ?? trimmed;
}

function toSmtpCrlf(value: string) {
  return value.replace(/\r?\n/g, "\r\n");
}

function dotStuff(value: string) {
  return value
    .split("\r\n")
    .map((line) => (line.startsWith(".") ? `.${line}` : line))
    .join("\r\n");
}

function buildMessageId(config: SmtpConfig) {
  const domain =
    extractEmailAddress(config.from).split("@")[1] ??
    config.host.replace(/[^a-zA-Z0-9.-]/g, "") ??
    "localhost";

  return `<${Date.now().toString(36)}.${Math.random()
    .toString(36)
    .slice(2)}@${domain}>`;
}

function buildMimeMessage(config: SmtpConfig, payload: EmailNotificationPayload) {
  const subject = payload.subject.replace(/\r?\n/g, " ").trim();
  const to = formatEmailAddress(payload.to);
  const from = formatEmailAddress(config.from);
  const replyTo = payload.replyTo ? formatEmailAddress(payload.replyTo) : null;
  const html = payload.html?.trim() || null;
  const text = payload.text.trim();
  const dateHeader = new Date().toUTCString();
  const messageId = buildMessageId(config);

  if (!text) {
    throw new Error("Notification email must include a text body.");
  }

  if (!html) {
    return toSmtpCrlf(
      [
        `From: ${from}`,
        `To: ${to}`,
        `Subject: ${subject}`,
        replyTo ? `Reply-To: ${replyTo}` : null,
        `Date: ${dateHeader}`,
        `Message-ID: ${messageId}`,
        "MIME-Version: 1.0",
        'Content-Type: text/plain; charset=UTF-8',
        "Content-Transfer-Encoding: 7bit",
        "",
        text,
        "",
      ]
        .filter((line): line is string => line !== null)
        .join("\n")
    );
  }

  const boundary = `snaportho-${Date.now().toString(36)}`;

  return toSmtpCrlf(
    [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      replyTo ? `Reply-To: ${replyTo}` : null,
      `Date: ${dateHeader}`,
      `Message-ID: ${messageId}`,
      "MIME-Version: 1.0",
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      "",
      `--${boundary}`,
      'Content-Type: text/plain; charset=UTF-8',
      "Content-Transfer-Encoding: 7bit",
      "",
      text,
      "",
      `--${boundary}`,
      'Content-Type: text/html; charset=UTF-8',
      "Content-Transfer-Encoding: 7bit",
      "",
      html,
      "",
      `--${boundary}--`,
      "",
    ]
      .filter((line): line is string => line !== null)
      .join("\n")
  );
}

function waitForCode(
  socket: tls.TLSSocket,
  expectedPrefix: string | RegExp
): Promise<string> {
  return new Promise((resolve, reject) => {
    let buffer = "";

    const handleData = (chunk: Buffer | string) => {
      buffer += chunk.toString();
      const lines = buffer.split("\r\n").filter(Boolean);
      const lastLine = lines[lines.length - 1] ?? "";

      if (!/^\d{3}[ -]/.test(lastLine)) {
        return;
      }

      const finished = /^\d{3} /.test(lastLine);
      if (!finished) {
        return;
      }

      socket.off("data", handleData);

      const ok =
        typeof expectedPrefix === "string"
          ? lines.some((line) => line.startsWith(expectedPrefix))
          : lines.some((line) => expectedPrefix.test(line));

      if (ok) {
        resolve(buffer);
      } else {
        reject(new Error(`Unexpected SMTP response: ${buffer.trim()}`));
      }
    };

    socket.on("data", handleData);
  });
}

async function sendCommand(
  socket: tls.TLSSocket,
  command: string,
  expectedPrefix: string | RegExp
) {
  socket.write(`${command}\r\n`);
  return waitForCode(socket, expectedPrefix);
}

async function sendMessageData(socket: tls.TLSSocket, message: string) {
  socket.write(dotStuff(toSmtpCrlf(message)));
  socket.write("\r\n.\r\n");
  return waitForCode(socket, "250");
}

export async function sendWorkspaceNotificationEmail(
  payload: EmailNotificationPayload
) {
  const config = getSmtpConfig();
  const mimeMessage = buildMimeMessage(config, payload);

  const socket = tls.connect({
    host: config.host,
    port: config.port,
    rejectUnauthorized: false,
  });

  await new Promise<void>((resolve, reject) => {
    socket.once("secureConnect", () => resolve());
    socket.once("error", reject);
  });

  try {
    await waitForCode(socket, "220");
    await sendCommand(socket, `EHLO ${config.host}`, "250");
    await sendCommand(socket, "AUTH LOGIN", "334");
    await sendCommand(
      socket,
      Buffer.from(config.user).toString("base64"),
      "334"
    );
    await sendCommand(
      socket,
      Buffer.from(config.pass).toString("base64"),
      /^235/
    );
    await sendCommand(
      socket,
      `MAIL FROM:<${extractEmailAddress(config.from)}>`,
      "250"
    );
    await sendCommand(socket, `RCPT TO:<${extractEmailAddress(payload.to)}>`, /^25[01]/);
    await sendCommand(socket, "DATA", "354");
    await sendMessageData(socket, mimeMessage);
    await sendCommand(socket, "QUIT", "221");

    return {
      ok: true,
    };
  } finally {
    socket.end();
  }
}
