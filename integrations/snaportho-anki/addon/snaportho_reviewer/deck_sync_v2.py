"""Pure note-centric SnapOrtho sync v2 merge and resumable apply engine."""
import hashlib,json,re
CONTRACT="snaportho-anki-note-sync.v2"
OPERATIONS={"upsert_note","retire_note","update_tags","move_note","update_note_type","media_add","media_remove"}
PERSONAL=re.compile(r"^(personal|user|local)(_|::)",re.I)
def _stable(value):
    if isinstance(value,list):return"["+",".join(_stable(v)for v in value)+"]"
    if isinstance(value,dict):return"{"+",".join(json.dumps(k,separators=(",",":"))+":"+_stable(value[k])for k in sorted(value))+"}"
    if value is True:return"true"
    if value is False:return"false"
    if value is None:return"null"
    return json.dumps(value,separators=(",",":"),ensure_ascii=False)
def checksum(value):return hashlib.sha256(_stable(value).encode()).hexdigest()
def merge_fields(base,local,remote,protected=()):
    protected={str(v).lower()for v in protected};result=dict(local);preserved=[];overwritten=[]
    for name in sorted(set(base)|set(remote)):
        old=base.get(name,"");current=local.get(name,"");incoming=remote.get(name,"")
        if PERSONAL.match(name)or name.lower()in protected:result[name]=current;preserved.append(name);continue
        if current!=old and current!=incoming:overwritten.append(name)
        result[name]=incoming
    return{"fields":result,"remoteBaseline":dict(remote),"preserved":preserved,"overwrittenLocal":overwritten}
def merge_governed_tags(local,remote,prefixes):
    def governed(tag):return any(tag==p or tag.startswith(p+"::")for p in prefixes)
    return sorted(set([t for t in local if not governed(t)]+list(remote)))
def validate_page(page,after_cursor):
    errors=[];previous=after_cursor;ops=page.get("operations")or[]
    if page.get("contractVersion")!=CONTRACT:errors.append("contract_mismatch")
    for op in ops:
        cursor=int(op.get("cursor")or 0)
        if cursor<=previous:errors.append("cursor_not_strictly_increasing")
        if op.get("operation")not in OPERATIONS:errors.append("unknown_operation")
        if checksum(op.get("payload")or{})!=op.get("payloadChecksum"):errors.append("payload_checksum_mismatch")
        previous=cursor
    if int(page.get("nextCursor")or 0)!=previous:errors.append("next_cursor_mismatch")
    if checksum(ops)!=page.get("pageChecksum"):errors.append("page_checksum_mismatch")
    return sorted(set(errors))
class NoteSyncV2Importer:
    """Gateway contract is note-based: snapshot, upsert_note, retire_note, move_note and media methods."""
    def __init__(self,store,gateway,deck_key="snaportho-master"):self.store=store;self.gateway=gateway;self.deck_key=deck_key
    def apply_page(self,page):
        subscription=self.store.deck_subscription(self.deck_key)or{"cursor":0};after=int(subscription.get("cursor")or 0)
        errors=validate_page(page,after)
        if errors:raise ValueError("invalid_delta_page:"+",".join(errors))
        summary={"notes":0,"retired":0,"tags":0,"moved":0,"media":0,"overwrittenLocal":[]}
        for op in page["operations"]:
            payload=op["payload"];kind=op["operation"];note_id=op.get("noteId")
            before=self.gateway.snapshot(note_id)if note_id else{}
            self.store.journal_start(self.deck_key,op["cursor"],note_id,kind,before)
            if kind=="upsert_note":
                baseline=self.store.note_baseline(note_id,self.deck_key)or{}
                merged=merge_fields(baseline.get("fields")or{},before.get("fields")or{},payload.get("fields")or{},payload.get("protectedFields")or[])
                tags=merge_governed_tags(before.get("tags")or[],payload.get("governedTags")or[],payload.get("governedPrefixes")or[])
                result=self.gateway.upsert_note(note_id,payload,merged["fields"],tags)
                self.store.save_note_baseline(note_id,result["ankiNoteId"],result["noteGuid"],op.get("noteVersionId"),payload.get("fields")or{},payload.get("governedTags")or[],payload.get("contentChecksum"),payload.get("tagsChecksum"),self.deck_key)
                summary["notes"]+=1;summary["overwrittenLocal"]+=merged["overwrittenLocal"]
            elif kind=="retire_note":self.gateway.retire_note(note_id,payload);summary["retired"]+=1
            elif kind=="update_tags":
                tags=merge_governed_tags(before.get("tags")or[],payload.get("governedTags")or[],payload.get("governedPrefixes")or[])
                self.gateway.update_tags(note_id,tags);summary["tags"]+=1
            elif kind=="move_note":self.gateway.move_note(note_id,payload["deckPath"]);summary["moved"]+=1
            elif kind=="media_add":self.gateway.media_add(payload);summary["media"]+=1
            elif kind=="media_remove":self.gateway.media_remove(payload);summary["media"]+=1
            elif kind=="update_note_type":self.gateway.update_note_type(payload)
            self.store.journal_finish(self.deck_key,op["cursor"])
            self.store.save_deck_subscription(page["release"],self.deck_key,op["cursor"],"updating")
        self.store.save_deck_subscription(page["release"],self.deck_key,page["nextCursor"],"current"if page.get("remaining")==0 else"updating")
        summary["overwrittenLocal"]=sorted(set(summary["overwrittenLocal"]))
        return summary
