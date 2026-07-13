-- ─────────────────────────────────────────────────────────────────────────────
-- 0009 — Unify the result scale to Great / Possible / Bad / Fail.
--
-- Calibration grid cells (stored as jsonb strings) move to the new scale in code.
-- Per-attempt outcomes were a Postgres enum (clean/marginal/fail); enums are
-- painful to evolve, so switch attempts.outcome to text + a CHECK constraint and
-- remap the existing rows: clean→great, marginal→possible, fail→fail. "Bad" is
-- new, so it only ever appears on gradings made from here on.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.attempts alter column outcome drop default;
alter table public.attempts alter column outcome type text using outcome::text;

update public.attempts set outcome = case outcome
  when 'clean' then 'great'
  when 'marginal' then 'possible'
  when 'fail' then 'fail'
  else 'possible'
end;

alter table public.attempts alter column outcome set default 'great';
alter table public.attempts
  add constraint attempts_outcome_check check (outcome in ('great', 'possible', 'bad', 'fail'));

-- The enum only ever backed attempts.outcome; it's now unused.
drop type if exists public.attempt_outcome;
