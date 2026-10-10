-- Cover foreign keys introduced by the remediation, as identified by live advisors.
create index if not exists claim_enrichment_jobs_claim_idx on public.claim_enrichment_jobs(claim_id);
create index if not exists claim_version_attestations_claim_idx on public.claim_version_attestations(claim_id);
create index if not exists ob_claim_final_reviews_event_idx on public.ob_claim_final_reviews(extraction_event_id);
