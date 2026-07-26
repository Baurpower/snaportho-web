from dataclasses import dataclass
from typing import Optional
CONTRACT_VERSION="snaportho-anki-reviewer.v1"
@dataclass(frozen=True)
class CardIdentity:
    canonical_card_id:str; canonical_card_version_id:str; note_guid:str; card_ordinal:int; content_hash:str; native_card_id_hint:Optional[int]=None
