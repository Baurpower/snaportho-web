import hashlib,json
def field_diff(base:list[dict],edited:list[dict])->list[dict]:
    old={x["name"]:x["value"] for x in base};new={x["name"]:x["value"] for x in edited}
    return [{"name":k,"before":old.get(k,""),"after":new.get(k,"")} for k in sorted(set(old)|set(new)) if old.get(k)!=new.get(k)]
def proposed_content_hash(fields:list[dict],tags:list[str],ordinal:int)->str:
    # Preimage MUST match the server's buildCanonicalContentHash (upsert-anki-import.ts):
    # createStableHash === sha256 over canonical JSON with sorted keys and RAW Unicode.
    # ensure_ascii=False is required — the default escapes non-ASCII (≥, µ, –) and would
    # diverge from JSON.stringify on any card with special characters. Tags arrive pre-sorted.
    value={"noteFields":[{"name":x["name"],"rawValue":x["value"]} for x in fields],"tags":tags,"cardOrd":ordinal}
    return hashlib.sha256(json.dumps(value,sort_keys=True,separators=(",",":"),ensure_ascii=False).encode()).hexdigest()
def save_local_working_edit(gateway,card_id:int,fields:list[dict],explicit:bool=False):
    if not explicit:raise PermissionError("local overwrite requires explicit reviewer action")
    gateway.save_working_edit(card_id,fields,marker="snaportho_reviewer_working_edit")
