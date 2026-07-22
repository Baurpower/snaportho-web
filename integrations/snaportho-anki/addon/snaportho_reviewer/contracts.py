from dataclasses import dataclass, field
from typing import Optional
CONTRACT_VERSION="snaportho-anki-reviewer.v1"
NO_MAPPING={"correctly_unmapped","missing_alias","missing_canonical_entity","extraction_failure","threshold_too_conservative","nonclinical_or_low_value","multiconcept_or_ambiguous","deck_improvement_required"}
@dataclass(frozen=True)
class CardIdentity:
    canonical_card_id:str; canonical_card_version_id:str; note_guid:str; card_ordinal:int; content_hash:str; native_card_id_hint:Optional[int]=None
@dataclass
class MappingDraft:
    decision:str=""; confidence:Optional[float]=None; entity_id:Optional[str]=None; mapping_role:Optional[str]=None; no_mapping_classification:Optional[str]=None; ambiguity_resolution:str=""; reason_codes:list[str]=field(default_factory=list); notes:str=""
    def validate(self):
        if self.decision not in {"approved","rejected","needs_changes","defer"}: raise ValueError("explicit decision required")
        if self.confidence is None or not 0<=self.confidence<=1: raise ValueError("confidence out of range")
        if self.entity_id and not self.mapping_role: raise ValueError("mapping role required")
        if not self.entity_id and self.no_mapping_classification not in NO_MAPPING: raise ValueError("no-mapping classification required")
        if not self.ambiguity_resolution: raise ValueError("ambiguity resolution required")
