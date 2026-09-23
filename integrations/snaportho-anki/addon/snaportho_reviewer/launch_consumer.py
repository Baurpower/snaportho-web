"""Poll, claim, and acknowledge exact Anki launches.

A command is opened by note GUID and card ordinal. Deck names are rejected
before the collection is queried.
"""
from __future__ import annotations

from datetime import datetime, timezone

SAFE_STATUS = ("opened", "not_found", "ambiguous", "unsupported", "failed")
CONTRACT = "claim-overlap.v1"


def _now():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")


def _rejected(command, status, reason):
    return {
        "contractVersion": CONTRACT,
        "launchCommandId": command.get("launchCommandId"),
        "status": status,
        "acknowledgedAt": _now(),
        "reasonCode": reason,
        "resolvedNativeCardId": None,
        "observedContentHash": None,
    }


def open_launch_command(gateway, opener, command):
    if not isinstance(command, dict):
        return _rejected({}, "failed", "invalid_command")
    if any(key in command for key in ("deck", "deckName", "deckPath")):
        return _rejected(command, "unsupported", "deck_name_not_allowed")
    note_guid = command.get("noteGuid")
    ordinal = command.get("cardOrdinal")
    if not isinstance(note_guid, str) or not note_guid or not isinstance(ordinal, int) or ordinal < 0:
        return _rejected(command, "failed", "invalid_identity")
    matches = list(gateway.cards_by_guid_ordinal(note_guid, ordinal) or [])
    if not matches:
        return _rejected(command, "not_found", "guid_ordinal_not_found")
    if len(matches) > 1:
        return _rejected(command, "ambiguous", "guid_ordinal_ambiguous")
    card = matches[0]
    opener.open_card(card)
    native_id = getattr(card, "id", None)
    return {
        "contractVersion": CONTRACT,
        "launchCommandId": command.get("launchCommandId"),
        "status": "opened",
        "acknowledgedAt": _now(),
        "reasonCode": None,
        "resolvedNativeCardId": None if native_id is None else str(native_id),
        "observedContentHash": None,
    }


def consume_pending_launches(client, gateway, opener, limit=3):
    """Claim each pending command, open it, and acknowledge the result."""
    pending = list(client.poll_pending() or [])[: max(0, int(limit))]
    acks = []
    for command in pending:
        if not isinstance(command, dict) or not client.claim(command.get("launchCommandId")):
            continue
        ack = open_launch_command(gateway, opener, command)
        if ack["status"] not in SAFE_STATUS:
            ack = _rejected(command, "failed", "invalid_ack")
        client.acknowledge(ack)
        acks.append(ack)
    return acks
