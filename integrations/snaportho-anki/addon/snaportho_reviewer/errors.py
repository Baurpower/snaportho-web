"""Human-facing error copy for the reviewer surfaces.

Every background call funnels its failures through here so the UI never labels an
auth or network problem as a content conflict. `headline` is a two-to-three word
status; `describe` is the actionable one-liner.
"""

_AUTH = {"unlinked", "authorization_failed"}
_TOO_LARGE = {"request_too_large", "response_too_large"}


def _code(error):
    return getattr(error, "code", None) or type(error).__name__


def headline(error):
    if getattr(error, "conflict_type", None):
        return "Needs comparison"
    code = _code(error)
    if code in _AUTH:
        return "Sign-in needed"
    if code == "network_error":
        return "Offline"
    if code == "daily_limit_reached":
        return "Daily BroBot limit reached"
    if code == "cancelled":
        return "Cancelled"
    if code == "CredentialUnavailable":
        return "Credential store locked"
    if code == "no_release":
        return "No deck published"
    if code == "no_bootstrap_artifact":
        return "Starter pack missing"
    if code == "upgrade_required":
        return "Add-on update needed"
    if code == "database_upgrade_required":
        return "Server update needed"
    if code == "server_error":
        return "Server issue"
    if code == "not_found":
        return "Not found"
    if code == "request_too_large":
        return "Request too large"
    if code == "response_too_large":
        return "Response too large"
    return "Unavailable"


def describe(error):
    conflict = getattr(error, "conflict_type", None)
    if conflict:
        return (
            f"The master card changed ({conflict.replace('_', ' ')}). "
            "Reopen the card to compare against the current version before proposing again."
        )
    code = _code(error)
    if code == "unlinked":
        return "This device isn't linked yet. Use Get Started / Master Deck… or Link or Manage Device."
    if code == "authorization_failed":
        return "Sign in again from Tools → SnapOrtho → Sign In or Manage Account."
    if code == "no_release":
        return (
            "No published SnapOrtho Master Deck is available yet. "
            "Your connection is fine — check back when a release is published, or contact the SnapOrtho team."
        )
    if code == "no_bootstrap_artifact":
        return (
            "A release exists, but the starter .apkg package has not been published for it yet. "
            "Contact the SnapOrtho team, or use Check for updates once your collection already has Master markers."
        )
    if code == "upgrade_required":
        body = getattr(error, "body", None) or {}
        url = body.get("downloadUrl") or body.get("download_url")
        base = "This release needs a newer SnapOrtho add-on."
        return f"{base} Download: {url}" if url else f"{base} Update the add-on, then try again."
    if code == "database_upgrade_required":
        body = getattr(error, "body", None) or {}
        migration = body.get("migration")
        suffix = f" ({migration})" if migration else ""
        return (
            "The server is missing a required additive database migration"
            f"{suffix}. Apply it, restart the backend, and try again."
        )
    if code == "server_error":
        return "SnapOrtho is having trouble right now. Try again in a moment, or open Diagnostics if it persists."
    if code == "not_found":
        return "The requested resource was not found on the server."
    if code == "network_error":
        return "Can't reach SnapOrtho right now. Check your connection — any local draft is safe."
    if code == "daily_limit_reached":
        return "You've used today's free BroBot questions. Your card and conversation remain available."
    if code == "cancelled":
        return "The request was cancelled."
    if code == "request_too_large":
        extra = getattr(error, "server_message", None)
        base = (
            "The Master Deck inventory is too large for a single request. "
            "Update the add-on if you are not on the latest, or try again after chunked sync lands."
        )
        return f"{base} ({extra})" if extra else base
    if code == "response_too_large":
        return "The server response was too large to load. Try again or contact the SnapOrtho team."
    if code == "CredentialUnavailable":
        return (
            "Secure credential storage is unavailable. On macOS, unlock your Keychain; "
            "other platforms aren't supported yet."
        )
    server = getattr(error, "server_message", None)
    if server:
        return f"Something went wrong ({code}): {server}."
    return f"Something went wrong ({code})."
