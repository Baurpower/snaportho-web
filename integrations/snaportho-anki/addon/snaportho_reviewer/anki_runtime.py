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
