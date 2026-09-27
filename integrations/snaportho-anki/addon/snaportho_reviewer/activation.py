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
        _, reviewer = api.me()
        return reviewer
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
