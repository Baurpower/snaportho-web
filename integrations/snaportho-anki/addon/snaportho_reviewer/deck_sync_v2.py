"""Pure note-centric SnapOrtho sync v2 merge and resumable apply engine."""
import hashlib,json,re,time
CONTRACT="snaportho-anki-note-sync.v2"
OPERATIONS={"upsert_note","retire_note","update_tags","move_note","update_note_type","media_add","media_remove"}
PERSONAL=re.compile(r"^(personal|user|local)(_|::)",re.I)
GOVERNED_PREFIXES=("SnapOrtho::Anatomy","SnapOrtho::Diagnosis","SnapOrtho::Treatment","SnapOrtho::Specialty","SnapOrtho::Workflow")
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
        if incoming==old or current==incoming:
            result[name]=current;continue
        if current==old:
            result[name]=incoming;continue
        overwritten.append(name)
        result[name]=current
    return{"fields":result,"remoteBaseline":dict(remote),"preserved":preserved,"overwrittenLocal":overwritten}
def central_fields_differ(local,remote):
    for name,incoming in (remote or{}).items():
        if PERSONAL.match(name):continue
        if(local.get(name)or"")!=(incoming or""):return True
    return False
def page_has_more(page,limit):
    ops=page.get("operations")or[]
    remaining=page.get("remaining")
    if remaining is None:return len(ops)>=int(limit)
    try:return int(remaining)>0
    except(TypeError,ValueError):return len(ops)>=int(limit)
def fetch_update_pages(api, after, progress=lambda *args: None, cancelled=lambda: False,
                       max_seconds=180, max_pages=1000, clock=time.monotonic):
    """Bound the read-only check; never advance the durable installed cursor here."""
    started=clock();pages=[];cursor=after;count=0;limit=100
    while True:
        if cancelled():raise RuntimeError("update_check_cancelled")
        if clock()-started>=max_seconds:raise RuntimeError("update_check_timeout: retry the check; no updates applied")
        _,page=api.deck_v2_updates(cursor,limit)
        if clock()-started>=max_seconds:raise RuntimeError("update_check_timeout: retry the check; no updates applied")
        errors=validate_page(page,cursor)
        if errors:raise ValueError("invalid_delta_page:"+",".join(errors))
        next_cursor=int(page["nextCursor"]);ops=page.get("operations")or[]
        more=page_has_more(page,limit)
        if more and (not ops or next_cursor<=cursor):raise ValueError("update_cursor_stalled")
        pages.append(page);cursor=next_cursor;count+=len(ops)
        progress(len(pages),count,cursor)
        if not more:return pages
        if len(pages)>=max_pages:raise RuntimeError("update_check_page_limit: no updates applied")
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
    def reconcile_tags(self):
        """Repair cursor/collection drift from the durable expected baselines."""
        checked=repaired=missing=0
        for baseline in self.store.note_baselines(self.deck_key):
            checked+=1;note_id=baseline["canonicalNoteId"]
            before=self.gateway.snapshot(note_id,{"noteGuid":baseline.get("noteGuid")})
            if not before.get("ankiNoteId"):
                missing+=1;continue
            expected=baseline.get("tags")or[]
            tags=merge_governed_tags(before.get("tags")or[],expected,GOVERNED_PREFIXES)
            if not self.gateway.tags_match(before.get("tags")or[],expected,GOVERNED_PREFIXES):
                self.gateway.update_tags(note_id,tags,{"noteGuid":baseline.get("noteGuid")})
                self.gateway.verify_tags(note_id,expected,GOVERNED_PREFIXES,{"noteGuid":baseline.get("noteGuid")})
                repaired+=1
        return{"checked":checked,"repaired":repaired,"missing":missing}
    def apply_page(self,page):
        subscription=self.store.deck_subscription(self.deck_key)or{"cursor":0};after=int(subscription.get("cursor")or 0)
        errors=validate_page(page,after)
        if errors:raise ValueError("invalid_delta_page:"+",".join(errors))
        summary={"notes":0,"retired":0,"tags":0,"moved":0,"media":0,"overwrittenLocal":[]}
        for op in page["operations"]:
            payload=op["payload"];kind=op["operation"];note_id=op.get("noteId")
            # A baseline does not exist on the first v2 sync of an already
            # installed deck. Pass the operation payload so the collection
            # gateway can resolve that note by its stable Anki GUID before the
            # three-way merge. Otherwise local fields and tags appear empty and
            # can be lost during the initial reconciliation.
            before=self.gateway.snapshot(note_id,payload)if note_id else{}
            self.store.journal_start(self.deck_key,op["cursor"],note_id,kind,before)
            if kind=="upsert_note":
                baseline=self.store.note_baseline(note_id,self.deck_key)or{}
                local_fields=before.get("fields")or{}
                remote_fields=payload.get("fields")or{}
                tags=merge_governed_tags(before.get("tags")or[],payload.get("governedTags")or[],payload.get("governedPrefixes")or[])
                exists=bool(before.get("ankiNoteId"))
                if exists and not baseline:
                    # First v2 sync of an already-installed note: apply governed
                    # tags only. Replaying the published field snapshot would
                    # clobber local edits because there is no prior baseline.
                    self.gateway.update_tags(note_id,tags,payload)
                    self.gateway.verify_tags(note_id,payload.get("governedTags")or[],payload.get("governedPrefixes")or[],payload)
                    result={"ankiNoteId":before["ankiNoteId"],"noteGuid":before.get("noteGuid") or payload.get("noteGuid")}
                    summary["tags"]+=1
                    merged={"overwrittenLocal":[]}
                else:
                    base_fields=baseline.get("fields")or(local_fields if exists else{})
                    merged=merge_fields(base_fields,local_fields,remote_fields,payload.get("protectedFields")or[])
                    if exists and not central_fields_differ(local_fields,merged["fields"]):
                        self.gateway.update_tags(note_id,tags,payload)
                        self.gateway.verify_tags(note_id,payload.get("governedTags")or[],payload.get("governedPrefixes")or[],payload)
                        result={"ankiNoteId":before["ankiNoteId"],"noteGuid":before.get("noteGuid") or payload.get("noteGuid")}
                        summary["tags"]+=1
                    else:
                        result=self.gateway.upsert_note(note_id,payload,merged["fields"],tags)
                        self.gateway.verify_tags(note_id,payload.get("governedTags")or[],payload.get("governedPrefixes")or[],payload)
                        summary["notes"]+=1
                    summary["overwrittenLocal"]+=merged["overwrittenLocal"]
                self.store.save_note_baseline(note_id,result["ankiNoteId"],result["noteGuid"],op.get("noteVersionId"),payload.get("fields")or{},payload.get("governedTags")or[],payload.get("contentChecksum"),payload.get("tagsChecksum"),self.deck_key)
            elif kind=="retire_note":self.gateway.retire_note(note_id,payload);summary["retired"]+=1
            elif kind=="update_tags":
                tags=merge_governed_tags(before.get("tags")or[],payload.get("governedTags")or[],payload.get("governedPrefixes")or[])
                self.gateway.update_tags(note_id,tags,payload);summary["tags"]+=1
                self.gateway.verify_tags(note_id,payload.get("governedTags")or[],payload.get("governedPrefixes")or[],payload)
            elif kind=="move_note":self.gateway.move_note(note_id,payload["deckPath"],payload);summary["moved"]+=1
            elif kind=="media_add":self.gateway.media_add(payload);summary["media"]+=1
            elif kind=="media_remove":self.gateway.media_remove(payload);summary["media"]+=1
            elif kind=="update_note_type":self.gateway.update_note_type(payload)
            self.store.journal_finish(self.deck_key,op["cursor"])
            self.store.save_deck_subscription(page["release"],self.deck_key,op["cursor"],"updating")
        remaining=page.get("remaining")
        done=remaining is not None and int(remaining)==0
        self.store.save_deck_subscription(page["release"],self.deck_key,page["nextCursor"],"current"if done else"updating")
        summary["overwrittenLocal"]=sorted(set(summary["overwrittenLocal"]))
        return summary
