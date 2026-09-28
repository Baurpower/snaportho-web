"""Pure device-activation transaction, kept independent of Qt for testing."""

import hmac

from .credential_store import CredentialWriteError


def persist_activate_and_verify(credentials, api, token):
    if not token:
        raise ValueError("empty device token")
    try:
        credentials.set(token)
        saved = credentials.get()
        if not saved or not hmac.compare_digest(saved, token):
            raise CredentialWriteError(credentials.backend_name())
        api.activate_device(token)
    except Exception:
        try:
            api.revoke_token(token, "credential_persistence_failed")
        except Exception:
            pass
        try:
            credentials.delete()
        except Exception:
            pass
        raise
    # Reviewer-profile lookup is informational only. /me is reviewer-gated and
    # returns 403 for linked non-reviewers, while the activated device token
    # remains valid for BroBot and deck APIs. A failure here must never revoke
    # the token or delete the stored credential.
    try:
        _, reviewer = api.me()
        return reviewer
    except Exception:
        return None
