-- Explicitly reviewed source/quality defects only; no clinical approval or historical final receipt.
-- Idempotent and guarded by the exact current version and original candidate provenance.
begin;
with selected(claim_id,version_id,qid,candidate_id,source_hash,reason) as(values
('34d23dc2-3545-44f7-91e3-c84cbf4a9aef','0b32c38d-6bc8-4b4a-88af-0dfd615217b5','3698','7a0fe029-2a69-4f85-8b67-61e6a65fc76d','254141dd46ac84eff17137185784fcaa1b5552ab4b209e011c4102cb34090e91','missing_failed_conservative_treatment'),
('6c1b9604-63f8-46c9-819c-ba9cc3385305','7ba98214-ceb4-47ad-995f-65eb6a13d8b3','3698','8205b8e2-2fa3-47ab-870e-9af05d7a01f3','254141dd46ac84eff17137185784fcaa1b5552ab4b209e011c4102cb34090e91','missing_failed_conservative_treatment'),
('0240840d-2fcd-4a2c-a243-dbc5e250ae54','b58cf584-e31a-49a6-adb5-a174ff6465df','3786','e41b49b3-0e40-4b43-889d-5e1a876cc8eb','1e984b38e58069e311daa3caceb7e4e391c837435d74ee16cc79107b66d46e7d','threshold_equality_omitted'),
('bac41279-6380-43d5-9846-21aaa1e954fb','d46e9f07-1270-4a5d-a6af-7711f7b7857e','5851','f05c43c3-b13c-41f2-88be-b03080eb37b3','d7613d56927e5c16ed20fd31217e966b3bcc6331aaadc44201eddbd5fe8d0f3b','missing_source_population'),
('4c08fcd2-6886-4895-b748-6841b5aed858','ab299a6a-edd0-4128-a752-24fc6152c141','6342','3ad54dd2-3db2-4bf7-83f5-ac12e6f4d2b2','ffc2292081346d0acaa1a7a5cc408fe868628ab8c4b918be0e16191d3a356dff','incidental_vignette_laterality'),
('968f3be9-77b1-468a-8cbe-d1d46268bb58','0ec1a30a-ed1d-4438-a39e-2b4bae66d317','7436','56219e6c-30f4-4409-86a7-51db2fd8c4d3','bd186f7f354407bcfd35ce4e1855dbb7606727221b83162fe9582125776b68d5','incidental_vignette_laterality')
), guarded as (
 select s.* from selected s join public.educational_claims c on c.id=s.claim_id::uuid and c.current_version_id=s.version_id::uuid and c.is_active
 where exists(select 1 from public.question_claim_links q where q.claim_id=c.id and q.is_active and q.provider='orthobullets' and q.native_question_id=s.qid and q.algorithm_version='orthobullets-claims-prod.v1' and q.metadata->>'candidate_id'=s.candidate_id)
)
select public.append_claim_version_attestation(claim_id::uuid,version_id::uuid,'quality','rewrite','ob-repaired-source-quality.v1','codex_source_audit',array[source_hash],array['https://www.orthobullets.com/testview?qid='||qid],array[reason],jsonb_build_object('candidateId',candidate_id,'auditDate','2026-10-09','reviewKind','source_quality_only','clinicalValidation',false),'ob-repaired-source-quality.v1:'||version_id) attestation_id from guarded;
commit;
select claim_version_id,verdict,reason_codes from public.claim_version_attestations where policy_version='ob-repaired-source-quality.v1' order by claim_version_id;
