-- ─────────────────────────────────────────────────────────────────────────────
-- 0011 — AI "next test" plan.
--
-- When the AI proposes the next test (reasoning about the last grid's grades +
-- your rationale, and possibly sweeping DIFFERENT parameters), store the short
-- explanation of what it changed and why, so it shows on the test it created.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.calibration_tests add column if not exists ai_plan text not null default '';
