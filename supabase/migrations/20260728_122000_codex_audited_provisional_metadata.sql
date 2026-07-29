begin;

alter table public.card_metadata_assertions
  drop constraint card_metadata_assertions_review_check;

alter table public.card_metadata_assertions
  add constraint card_metadata_assertions_review_check check (
    (decision = 'proposed' and decision_method = 'pending'
      and decision_policy_version is null and reviewer_user_id is null and reviewed_at is null)
    or (decision in ('accepted','rejected') and decision_method = 'human_review'
      and decision_policy_version is null and reviewer_user_id is not null and reviewed_at is not null)
    or (decision = 'accepted' and decision_method = 'automated_policy'
      and decision_policy_version is not null and reviewer_user_id is null and reviewed_at is not null
      and (
        confidence >= 0.9800
        or decision_policy_version = 'codex_audit_provisional_v1'
      ))
    or (decision = 'superseded' and decision_method = 'supersession')
  );

comment on constraint card_metadata_assertions_review_check on public.card_metadata_assertions is
  'Allows ordinary >=0.98 automated acceptance or explicitly provisional Codex-audited acceptance. Provisional output must remain reviewable and reversible in Anki.';

commit;
