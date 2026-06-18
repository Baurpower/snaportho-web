-- BroBot Branch Success Engine analytics/debug queries.
-- Run in Supabase SQL editor or with psql against the project database.

-- Top shown branches by mode.
select
  mode,
  branch_question_id,
  max(branch_label) as branch_label,
  count(*) as impressions
from public.branch_events
where event_type = 'impression'
group by mode, branch_question_id
order by impressions desc
limit 50;

-- Top clicked branches by mode.
select
  mode,
  branch_question_id,
  max(branch_label) as branch_label,
  count(*) as clicks
from public.branch_events
where event_type = 'click'
group by mode, branch_question_id
order by clicks desc
limit 50;

-- CTR by rank position.
select
  rank_position,
  count(*) filter (where event_type = 'impression') as impressions,
  count(*) filter (where event_type = 'click') as clicks,
  round(
    count(*) filter (where event_type = 'click')::numeric
    / nullif(count(*) filter (where event_type = 'impression'), 0),
    4
  ) as ctr
from public.branch_events
where rank_position is not null
group by rank_position
order by rank_position;

-- Continuation and abandonment rate by branch.
select
  outcomes.branch_question_id,
  questions.question_text,
  count(*) as outcomes,
  round(avg(case when outcomes.continued_after_click then 1 else 0 end), 4) as continuation_rate,
  round(avg(case when outcomes.abandoned then 1 else 0 end), 4) as abandonment_rate,
  round(avg(outcomes.educational_success_score), 2) as avg_educational_success_score
from public.branch_outcomes outcomes
left join public.branch_questions questions on questions.id = outcomes.branch_question_id
group by outcomes.branch_question_id, questions.question_text
order by avg_educational_success_score desc nulls last
limit 50;

-- Educational success score by mode/training level.
select
  mode,
  training_level,
  count(*) as outcomes,
  round(avg(educational_success_score), 2) as avg_educational_success_score,
  round(avg(followup_count), 2) as avg_followups,
  round(avg(conversation_depth_delta), 2) as avg_depth_delta
from public.branch_outcomes
group by mode, training_level
order by avg_educational_success_score desc nulls last;

-- Cold-start branch performance.
select
  questions.id,
  questions.question_text,
  questions.category,
  questions.success_score,
  questions.usage_count,
  questions.click_count,
  count(outcomes.id) as outcome_count,
  round(avg(outcomes.educational_success_score), 2) as avg_educational_success_score
from public.branch_questions questions
left join public.branch_outcomes outcomes on outcomes.branch_question_id = questions.id
where questions.usage_count < 10
group by questions.id, questions.question_text, questions.category, questions.success_score, questions.usage_count, questions.click_count
order by questions.updated_at desc
limit 50;
