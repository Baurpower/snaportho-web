begin transaction read only;

select id, user_id, test_key, status, expected_count, completed_count,
       accepted_count, unresolved_count, algorithm_version, started_at,
       completed_at, updated_at
from public.orthobullets_claim_runs
order by started_at desc
limit 20;

select run_id, native_question_id, status, source_fingerprint_hash,
       claim_id, claim_version_id, linked_card_count, last_error_code,
       reason_codes, algorithm_version, completed_at
from public.orthobullets_claim_run_items
order by updated_at desc
limit 100;

select r.id,
       r.expected_count,
       count(i.*) as actual_items,
       count(*) filter (where i.status in ('accepted', 'accepted_no_card')) as accepted_items,
       count(*) filter (where i.status = 'unresolved_automatic') as unresolved_items
from public.orthobullets_claim_runs r
left join public.orthobullets_claim_run_items i on i.run_id = r.id
group by r.id
order by max(r.started_at) desc
limit 20;

rollback;
