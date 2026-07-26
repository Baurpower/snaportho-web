import hashlib
from .resolver import Resolution
def current_profile_hash(mw):return hashlib.sha256(str(mw.pm.name).encode()).hexdigest()[:16]
class CollectionGateway:
    def __init__(self,col):self.col=col
    def cards_by_guid_ordinal(self,guid,ordinal):
        note_ids=self.col.db.list("select id from notes where guid=?",guid)
        cards=[]
        for nid in note_ids:
            for cid in self.col.find_cards(f"nid:{nid}"):
                card=self.col.get_card(cid)
                if card.ord==ordinal:cards.append(card)
        return cards
    def content_hash(self,card):
        from .editor import proposed_content_hash
        note=card.note();fields=[{"name":name,"value":note[name]}for name in note.keys()]
        return proposed_content_hash(fields,sorted(note.tags),card.ord)
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
