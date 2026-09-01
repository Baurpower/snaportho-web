import hashlib
from .resolver import Resolution
def current_profile_hash(mw):return hashlib.sha256(str(mw.pm.name).encode()).hexdigest()[:16]
class CollectionGateway:
    def __init__(self,col):self.col=col;self._canonical_cards=None
    def cards_by_guid_ordinal(self,guid,ordinal):
        note_ids=self.col.db.list("select id from notes where guid=?",guid)
        cards=[]
        for nid in note_ids:
            for cid in self.col.find_cards(f"nid:{nid}"):
                card=self.col.get_card(cid)
                if card.ord==ordinal:cards.append(card)
        return cards
    def cards_by_canonical_id(self,canonical_card_id):
        """Find Versioned SnapOrtho cards by their stable release marker."""
        if not canonical_card_id:return[]
        if self._canonical_cards is None:
            self._canonical_cards={}
            for cid in self.col.find_cards(""):
                card=self.col.get_card(cid)
                marker=self.installed_identity(card).get("canonicalCardId")
                if marker:self._canonical_cards.setdefault(marker,[]).append(card)
        return self._canonical_cards.get(canonical_card_id,[])
    def content_hash(self,card):
        from .editor import proposed_content_hash
        note=card.note();fields=[{"name":name,"value":note[name]}for name in note.keys()]
        return proposed_content_hash(fields,sorted(note.tags),card.ord)
    def installed_identity(self,card):
        """Read the immutable identity pinned by the Versioned SnapOrtho deck."""
        from .sync import field_value,MASTER_ID_FIELDS,VERSION_FIELDS,HASH_FIELDS
        note=card.note()
        return{
            "canonicalCardId":field_value(note,MASTER_ID_FIELDS),
            "canonicalCardVersionId":field_value(note,VERSION_FIELDS),
            "contentHash":field_value(note,HASH_FIELDS),
        }
    def rendered(self,card):return card.question(),card.answer()
    def editable(self,card):
        note=card.note();return[{"name":name,"value":note[name]}for name in note.keys()],sorted(note.tags),self.col.decks.name(card.did)
    def save_working_edit(self,card_id,fields,marker):
        card=self.col.get_card(card_id);note=card.note()
        for field in fields:
            if field["name"] in note:note[field["name"]]=field["value"]
        note.add_tag(marker);self.col.update_note(note)
    def _deck_id(self,deck_path):return self.col.decks.id(deck_path)  # creates the deck if absent
    def _write_fields(self,note,central_fields,markers):
        for field in central_fields:
            if field["name"] in note:note[field["name"]]=field["value"]
        for name,value in markers.items():
            if name in note:note[name]=value
    def write_central_update(self,note_guid,card_ordinal,central_fields,central_tags,deck_path,markers):
        """Patch central fields/tags/deck on an existing note in place. Never touches personal
        fields (not in central_fields) or scheduling (set_deck preserves due/interval/ease)."""
        matches=self.cards_by_guid_ordinal(note_guid,card_ordinal)
        if len(matches)!=1:return False
        card=matches[0];note=card.note();self._write_fields(note,central_fields,markers)
        # Replace SnapOrtho:: tags with the manifest's; keep personal + any other user tags.
        note.tags=sorted(set(t for t in note.tags if not t.startswith("SnapOrtho::"))|set(central_tags))
        self.col.update_note(note)
        if deck_path:self.col.set_deck([card.id],self._deck_id(deck_path))
        return True
    def create_central_card(self,note_guid,central_fields,central_tags,deck_path,markers):
        """Create a new note on the SnapOrtho Master note type, pinned to the release GUID so a
        later sync matches it. New cards enter Anki as new — no scheduling manipulation."""
        from .deck_update import NOTE_TYPE_NAME
        notetype=self.col.models.by_name(NOTE_TYPE_NAME)
        if not notetype:return False
        note=self.col.new_note(notetype);note.guid=note_guid;self._write_fields(note,central_fields,markers)
        note.tags=sorted(set(central_tags));self.col.add_note(note,self._deck_id(deck_path))
        return True
    def has_media(self,filename):
        import os
        return bool(filename)and os.path.exists(os.path.join(self.col.media.dir(),filename))
    def write_media(self,filename,data):self.col.media.write_data(filename,data)

class NoteCollectionGatewayV2:
    """Note-level collection adapter. Existing cards retain scheduling because notes are updated in place."""
    def __init__(self,col,store,deck_key="snaportho-master",media_payloads=None):
        self.col=col;self.store=store;self.deck_key=deck_key;self.media_payloads=media_payloads or{}
    def _note(self,canonical_note_id,payload=None):
        baseline=self.store.note_baseline(canonical_note_id,self.deck_key)
        if baseline:
            try:return self.col.get_note(baseline["ankiNoteId"])
            except Exception:pass
        guid=(payload or{}).get("noteGuid") or (baseline or{}).get("noteGuid")
        if guid:
            ids=self.col.db.list("select id from notes where guid=?",guid) or []
            if len(ids)>1:raise RuntimeError("note_guid_ambiguous")
            if len(ids)==1:return self.col.get_note(ids[0])
        return None
    def snapshot(self,canonical_note_id,payload=None):
        note=self._note(canonical_note_id,payload)
        if not note:return{"fields":{},"tags":[],"ankiNoteId":None,"noteGuid":None}
        return{"fields":{name:note[name]for name in note.keys()},"tags":sorted(note.tags),"ankiNoteId":note.id,"noteGuid":note.guid}
    def upsert_note(self,canonical_note_id,payload,fields,tags):
        note=self._note(canonical_note_id,payload);created=note is None
        if created:
            notetype=self.col.models.by_name(payload["noteTypeName"])
            if not notetype:raise RuntimeError("note_type_missing")
            note=self.col.new_note(notetype);note.guid=payload["noteGuid"]
        for name,value in fields.items():
            if name in note:note[name]=value
        note.tags=sorted(set(tags))
        if created:
            self.col.add_note(note,self.col.decks.id(payload["deckPath"]))
        else:
            self.col.update_note(note)
            # Content/tag upserts must not yank cards the learner moved.
            # Official relocation is a dedicated move_note operation.
        return{"ankiNoteId":note.id,"noteGuid":note.guid}
    def update_tags(self,canonical_note_id,tags,payload=None):
        note=self._note(canonical_note_id,payload)
        if not note:raise RuntimeError("note_not_found")
        note.tags=sorted(set(tags));self.col.update_note(note)
    @staticmethod
    def tags_match(actual,expected,prefixes):
        def governed(tag):return any(tag==prefix or tag.startswith(prefix+"::")for prefix in prefixes)
        return set(t for t in actual if governed(t))==set(expected)
    def verify_tags(self,canonical_note_id,expected,prefixes,payload=None):
        actual=self.snapshot(canonical_note_id,payload).get("tags")or[]
        if not self.tags_match(actual,expected,prefixes):raise RuntimeError("tag_persistence_verification_failed")
    def move_note(self,canonical_note_id,deck_path,payload=None):
        note=self._note(canonical_note_id,payload)
        if not note:raise RuntimeError("note_not_found")
        card_ids=[card.id for card in note.cards()]
        if card_ids:self.col.set_deck(card_ids,self.col.decks.id(deck_path))
    def retire_note(self,canonical_note_id,payload=None):
        note=self._note(canonical_note_id,payload)
        if not note:return
        add_tag=getattr(note,"add_tag",None)
        if callable(add_tag):add_tag("SnapOrtho::Workflow::Retired")
        elif "SnapOrtho::Workflow::Retired" not in note.tags:note.tags.append("SnapOrtho::Workflow::Retired")
        self.col.update_note(note)
        for card in note.cards():card.queue=-1;self.col.update_card(card)
    def media_add(self,payload):
        import os
        filename=payload["filename"]
        if os.path.isfile(os.path.join(self.col.media.dir(),filename)):return
        data=self.media_payloads.get(payload["sha256"])
        if data is None:raise RuntimeError("verified_media_payload_missing")
        self.col.media.write_data(filename,data)
    def media_remove(self,payload):
        # Do not delete shared Anki media automatically. The baseline records retirement.
        return None
    def update_note_type(self,payload):
        # Note-type migrations are release-gated and require a dedicated full-sync preflight.
        if payload.get("requiresFullSync"):raise RuntimeError("note_type_full_sync_required")
