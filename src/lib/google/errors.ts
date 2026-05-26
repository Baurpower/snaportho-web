type GoogleApiErrorLike = {
  code?: number;
  response?: {
    status?: number;
    data?: {
      error?: string;
      error_description?: string;
    };
  };
  errors?: Array<{
    reason?: string;
    message?: string;
  }>;
  message?: string;
};

export type GoogleCalendarErrorClass =
  | "auth"
  | "calendar"
  | "event_missing"
  | "retryable"
  | "unknown";

export function getGoogleErrorStatus(error: unknown) {
  const typed = error as GoogleApiErrorLike;
  return typed?.code ?? typed?.response?.status ?? null;
}

export function classifyGoogleCalendarError(error: unknown): GoogleCalendarErrorClass {
  const typed = error as GoogleApiErrorLike;
  const status = getGoogleErrorStatus(error);
  const message = typed?.message?.toLowerCase() ?? "";
  const reason = typed?.errors?.[0]?.reason?.toLowerCase() ?? "";
  const responseError = typed?.response?.data?.error?.toLowerCase() ?? "";
  const responseDescription =
    typed?.response?.data?.error_description?.toLowerCase() ?? "";

  if (
    status === 401 ||
    message.includes("invalid_grant") ||
    responseError.includes("invalid_grant") ||
    responseDescription.includes("invalid_grant") ||
    message.includes("refresh token") ||
    reason.includes("auth")
  ) {
    return "auth";
  }

  if (status === 404 || status === 410) {
    return "event_missing";
  }

  if (
    status === 403 &&
    (reason.includes("forbidden") ||
      reason.includes("notfound") ||
      message.includes("not writable") ||
      message.includes("calendar"))
  ) {
    return "calendar";
  }

  if (status === 429 || status === 500 || status === 502 || status === 503 || status === 504) {
    return "retryable";
  }

  return "unknown";
}
