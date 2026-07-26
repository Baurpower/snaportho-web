"""Delta-apply engine for pulling a local deck up to the latest published release.

Pure decision logic lives here (unit-tested with a fake gateway). The aqt/Anki writes are
isolated in CollectionGateway.write_central_update / create_central_card. Hard invariants,
enforced here and in the gateway:
  * personal (Personal_/User_/Local_) fields are never written or read for upload;
  * scheduling is never touched — deck moves preserve due/interval/ease, new cards enter as new;
  * `conflict` cards (locally edited central fields) are never auto-overwritten — surfaced instead.
"""
import re
NOTE_TYPE_NAME="SnapOrtho Master"
MARKER_ID="SnapOrtho_ID";MARKER_VERSION="SnapOrtho_Version";MARKER_HASH="SnapOrtho_Installed_Hash"
MARKER_FIELDS=(MARKER_ID,MARKER_VERSION,MARKER_HASH)
PERSONAL_FIELD_RE=re.compile(r"^(personal|user|local)(_|::)",re.IGNORECASE)
APPLY_ACTIONS=("update","add")
def central_snapshot_fields(fields):
    """Manifest field snapshot minus any personal or marker fields (defense in depth — the
    server already excludes them, but the local write must never depend on that)."""
    return[f for f in fields if not PERSONAL_FIELD_RE.match(f.get("name",""))and f.get("name")not in MARKER_FIELDS]
def marker_values(card):
    # Installed hash == the manifest's central-sync hash: after writing the central content
    # verbatim, the local central_sync_hash equals it, so the next plan reads the card as current.
    return{MARKER_ID:card["canonicalCardId"],MARKER_VERSION:card["canonicalCardVersionId"],MARKER_HASH:card["contentHash"]}
def build_operations(plan_actions,manifest_cards):
    """Split a sync plan into applyable operations against the manifest content.
    Returns updates/adds (manifest cards), conflicts (card+reason), the set of media sha256 to
    ensure, and any plan card ids absent from the manifest (never fabricated)."""
    by_id={c["canonicalCardId"]:c for c in manifest_cards}
    ops={"update":[],"add":[],"conflict":[],"media":set(),"missing_manifest":[]}
    for action in plan_actions:
        cid=action.get("canonicalCardId");kind=action.get("action");card=by_id.get(cid)
        if kind=="unchanged":continue
        if kind=="conflict":
            if card:ops["conflict"].append({"card":card,"reason":action.get("reason")})
            continue
        if kind in APPLY_ACTIONS:
            if not card:ops["missing_manifest"].append(cid);continue
            ops[kind].append(card)
            for h in card.get("mediaHashes",[]):ops["media"].add(h)
        elif kind=="media_download" and card:
            for h in card.get("mediaHashes",[]):ops["media"].add(h)
    return ops
def apply_operations(gateway,ops):
    """Execute update/add writes through the gateway. conflicts are never written here.
    Returns a summary the dialog surfaces and the sync-ack ledger records."""
    summary={"updated":0,"added":0,"conflicts":len(ops["conflict"]),"skipped_missing":len(ops["missing_manifest"]),"errors":[]}
    for card in ops["update"]:
        try:
            if gateway.write_central_update(card["noteGuid"],card["cardOrdinal"],central_snapshot_fields(card["fieldSnapshot"]),card.get("centralTags",[]),card.get("deckPath"),marker_values(card)):summary["updated"]+=1
            else:summary["errors"].append(f"not_found:{card['canonicalCardId']}")
        except Exception as error:summary["errors"].append(f"update_failed:{card['canonicalCardId']}:{type(error).__name__}")
    for card in ops["add"]:
        try:
            if gateway.create_central_card(card["noteGuid"],central_snapshot_fields(card["fieldSnapshot"]),card.get("centralTags",[]),card.get("deckPath"),marker_values(card)):summary["added"]+=1
            else:summary["errors"].append(f"notetype_missing:{card['canonicalCardId']}")
        except Exception as error:summary["errors"].append(f"add_failed:{card['canonicalCardId']}:{type(error).__name__}")
    return summary
def ack_status(summary):
    """planned→applied/partial/failed for the sync acknowledgement ledger."""
    if summary["errors"]:return"partial" if(summary["updated"]or summary["added"])else"failed"
    return"applied"
