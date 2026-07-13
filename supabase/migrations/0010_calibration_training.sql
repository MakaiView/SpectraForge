-- ─────────────────────────────────────────────────────────────────────────────
-- 0010 — Calibration training capture.
--
-- Two things for the training loop (BUILD_SPEC §5c):
--  1. Runs get a free-text `context` — what the material is and what the user is
--     trying to achieve — so the model weighs intent when grading + suggesting.
--  2. Tests separate the HUMAN grade (grid/best_square) from the AI grade
--     (ai_grid/ai_best/analysis) so we can grade blind, then compare — and the
--     pair (your grade + your rationale vs the AI's) becomes labeled training data.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.calibration_runs add column if not exists context text not null default '';

alter table public.calibration_tests add column if not exists ai_grid jsonb;
alter table public.calibration_tests add column if not exists ai_best jsonb;
alter table public.calibration_tests add column if not exists rationale text not null default '';
