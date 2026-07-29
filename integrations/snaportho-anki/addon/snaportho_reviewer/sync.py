"""Master-deck inventory helpers + legacy DeckSyncDialog alias.

Inventory and central-sync hash stay here so pure unit tests can import without Qt.
The user-facing surface is MasterDeckDialog in master_deck.py.
"""
import hashlib
import re

MASTER_ID_FIELDS = ("SnapOrtho_ID", "SnapOrtho ID")
VERSION_FIELDS = ("SnapOrtho_Version", "SnapOrtho Version")
HASH_FIELDS = ("SnapOrtho_Installed_Hash", "SnapOrtho Installed Hash")
# Must mirror the server `personal` regex in anki-deck-incorporation.ts exactly.
PERSONAL_FIELD_RE = re.compile(r"^(personal|user|local)(_|::)", re.IGNORECASE)
MARKER_FIELDS_LOWER = {"snaportho_id", "snaportho_version", "snaportho_installed_hash"}


def field_value(note, names):
    for name in names:
        if name in note:
            return note[name]
    return None


def central_sync_hash(card):
    note = card.note()
    parts = []
    for name in sorted(note.keys()):
        if PERSONAL_FIELD_RE.match(name) or name.lower() in MARKER_FIELDS_LOWER:
            continue
        parts.append(f"{name}\0{note[name]}")
    parts.extend(
        f"tag\0{tag}"
        for tag in sorted(t for t in note.tags if t.startswith("SnapOrtho::"))
    )
    parts.append(f"ord\0{card.ord}")
    return hashlib.sha256("\n".join(parts).encode()).hexdigest()


def installed_card_inventory(col):
    rows = []
    for cid in col.find_cards(""):
        card = col.get_card(cid)
        note = card.note()
        master_id = field_value(note, MASTER_ID_FIELDS)
        version = field_value(note, VERSION_FIELDS)
        installed_hash = field_value(note, HASH_FIELDS)
        if not master_id or not version or not installed_hash:
            continue
        rows.append(
            {
                "canonicalCardId": master_id,
                "canonicalCardVersionId": version,
                "installedContentHash": installed_hash,
                "localCentralContentHash": central_sync_hash(card),
                "noteGuid": note.guid,
                "cardOrdinal": card.ord,
                "mediaHashes": [],
            }
        )
    return rows

def recovery_diagnostic(col):
    """Content-free inventory for v1 recovery triage. Safe to copy into support reports."""
    rows=installed_card_inventory(col);by_id={};by_note={}
    for row in rows:
        by_id.setdefault(row["canonicalCardId"],[]).append(row)
        by_note.setdefault(row["noteGuid"],[]).append(row)
    duplicate_ids=sum(1 for values in by_id.values()if len(values)>1)
    sibling_marker_collisions=sum(1 for values in by_note.values()if len({v["cardOrdinal"]for v in values})>1 and len({v["canonicalCardId"]for v in values})==1)
    return{
        "inventoryCards":len(rows),"uniqueCanonicalCardIds":len(by_id),"uniqueNoteGuids":len(by_note),
        "duplicateCanonicalCardIds":duplicate_ids,"clozeSiblingMarkerCollisions":sibling_marker_collisions,
        "aggregateHashMismatches":sum(1 for row in rows if row["installedContentHash"]!=row["localCentralContentHash"]),
    }


INVENTORY_CHUNK_SIZE = 250
ACTION_PRIORITY = {
    "conflict": 0,
    "update": 1,
    "media_download": 2,
    "move_or_retag": 3,
    "add": 4,
    "unchanged": 5,
}


def chunk_list(items, size=INVENTORY_CHUNK_SIZE):
    items = list(items)
    if not items:
        return [[]]
    return [items[i : i + size] for i in range(0, len(items), size)]


def merge_sync_plan_actions(action_lists):
    """Merge chunked plan actions by canonicalCardId (lower priority number wins)."""
    best = {}
    for actions in action_lists:
        for action in actions or []:
            cid = action.get("canonicalCardId")
            if not cid:
                continue
            prev = best.get(cid)
            if prev is None:
                best[cid] = action
                continue
            p_new = ACTION_PRIORITY.get(action.get("action"), 99)
            p_old = ACTION_PRIORITY.get(prev.get("action"), 99)
            if p_new < p_old:
                best[cid] = action
    return sorted(best.values(), key=lambda a: a.get("canonicalCardId") or "")


def DeckSyncDialog(parent, runtime):
    """Backward-compatible entry point — opens the Master Deck hub."""
    from .master_deck import MasterDeckDialog

    return MasterDeckDialog(parent, runtime)
