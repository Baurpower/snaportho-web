from dataclasses import dataclass
from .contracts import CardIdentity
@dataclass(frozen=True)
class Resolution: status:str; card_id:int|None=None; local_hash:str|None=None
def resolve_card(gateway,identity:CardIdentity)->Resolution:
    matches=gateway.cards_by_guid_ordinal(identity.note_guid,identity.card_ordinal)
    if not matches:return Resolution("not_found")
    if len(matches)>1:return Resolution("ambiguous")
    card=matches[0];local_hash=gateway.content_hash(card)
    if local_hash!=identity.content_hash:return Resolution("hash_mismatch",card.id,local_hash)
    return Resolution("resolved",card.id,local_hash)
