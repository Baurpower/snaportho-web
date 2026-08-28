"""Master-deck inventory helpers + legacy DeckSyncDialog alias.

Inventory and central-sync hash stay here so pure unit tests can import without Qt.
The user-facing surface is MasterDeckDialog in master_deck.py.
"""
import hashlib
import re

MASTER_ID_FIELDS = ("SnapOrtho_ID", "SnapOrtho ID")
VERSION_FIELDS = ("SnapOrtho_Version", "SnapOrtho Version")
HASH_FIELDS = ("SnapOrtho_Installed_Hash", "SnapOrtho Installed Hash")
NOTE_TYPE_NAME = "SnapOrtho Master"
# Must mirror the server `personal` regex in anki-deck-incorporation.ts exactly.
PERSONAL_FIELD_RE = re.compile(r"^(personal|user|local)(_|::)", re.IGNORECASE)
MARKER_FIELDS_LOWER = {"snaportho_id", "snaportho_version", "snaportho_installed_hash"}
GUID_PROBE_SAMPLE = 25


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


def _unique(values):
    seen = set()
    out = []
    for value in values:
        if value in seen:
            continue
        seen.add(value)
        out.append(value)
    return out


def find_master_note_ids(col):
    """Notes on the SnapOrtho Master notetype. Empty if the type was never imported."""
    finder = getattr(col, "find_notes", None)
    if not callable(finder):
        return []
    try:
        return list(finder(f'note:"{NOTE_TYPE_NAME}"') or [])
    except Exception:
        return []


def _candidate_note_ids(col):
    finder = getattr(col, "find_notes", None)
    if not callable(finder):
        return []
    ids = []
    for query in (f'note:"{NOTE_TYPE_NAME}"', "SnapOrtho_ID:*", '"SnapOrtho ID":*'):
        try:
            ids.extend(finder(query) or [])
        except Exception:
            continue
    return _unique(ids)


def _inventory_row(card, note):
    master_id = field_value(note, MASTER_ID_FIELDS)
    version = field_value(note, VERSION_FIELDS)
    installed_hash = field_value(note, HASH_FIELDS)
    if not master_id or not version or not installed_hash:
        return None
    return {
        "canonicalCardId": master_id,
        "canonicalCardVersionId": version,
        "installedContentHash": installed_hash,
        "localCentralContentHash": central_sync_hash(card),
        "noteGuid": note.guid,
        "cardOrdinal": card.ord,
        "mediaHashes": [],
    }


def _cards_for_note(col, note, nid):
    cards_fn = getattr(note, "cards", None)
    if callable(cards_fn):
        try:
            return list(cards_fn())
        except Exception:
            pass
    try:
        return [col.get_card(cid) for cid in col.find_cards(f"nid:{nid}")]
    except Exception:
        return []


def installed_card_inventory(col):
    """v1 marker rows. Prefer Master-notetype notes so huge personal collections stay fast."""
    rows = []
    note_ids = _candidate_note_ids(col)
    if note_ids:
        for nid in note_ids:
            try:
                note = col.get_note(nid)
            except Exception:
                continue
            for card in _cards_for_note(col, note, nid):
                row = _inventory_row(card, note)
                if row:
                    rows.append(row)
        return rows
    for cid in col.find_cards(""):
        card = col.get_card(cid)
        note = card.note()
        row = _inventory_row(card, note)
        if row:
            rows.append(row)
    return rows


def local_guid_hits(col, operations):
    """Count operations whose payload noteGuid maps to exactly one local note."""
    hits = 0
    seen = 0
    db = getattr(col, "db", None)
    listing = getattr(db, "list", None) if db is not None else None
    for operation in operations or []:
        guid = (operation.get("payload") or {}).get("noteGuid")
        if not guid:
            continue
        seen += 1
        ids = []
        if callable(listing):
            try:
                ids = listing("select id from notes where guid=?", guid) or []
            except Exception:
                ids = []
        if len(ids) == 1:
            hits += 1
    return hits, seen


def guid_probe_indicates_install(hits, seen):
    if seen <= 0 or hits <= 0:
        return False
    return hits >= max(1, (seen + 4) // 5)


def installed_deck_presence(col, store=None):
    """Whether this profile already has the Master deck and can take v2 updates.

    Markers are sufficient but not required. A SnapOrtho Master notetype, a saved
    v2 cursor, or GUID hits against the published delta all count as installed.
    """
    inventory = installed_card_inventory(col)
    master_notes = len(find_master_note_ids(col))
    if not master_notes and inventory:
        master_notes = len({row.get("noteGuid") for row in inventory if row.get("noteGuid")})
    subscription = None
    if store is not None:
        try:
            subscription = store.deck_subscription()
        except Exception:
            subscription = None
    cursor = int((subscription or {}).get("cursor") or 0)
    if inventory:
        reason = "markers"
    elif master_notes:
        reason = "note_type"
    elif cursor > 0:
        reason = "subscription"
    else:
        reason = "absent"
    return {
        "installed": reason != "absent",
        "reason": reason,
        "inventory": inventory,
        "markerCards": len(inventory),
        "masterNotes": master_notes,
        "subscription": subscription,
    }

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
