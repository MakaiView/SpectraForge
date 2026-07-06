-- ─────────────────────────────────────────────────────────────────────────────
-- 0008 — AI advice on attempts.
--
-- Caches the assistant's read of a logged attempt so it isn't re-generated (and
-- re-billed) on every view. Structured JSON: a summary, likely cause, concrete
-- parameter suggestions, a confidence, and when/what produced it. Owner RLS on
-- attempts already governs access; this is just another column on the row.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.attempts
  add column if not exists ai_advice jsonb;
